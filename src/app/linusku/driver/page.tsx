'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  ArrowLeft,
  Bus,
  Check,
  ClipboardCheck,
  MapPin,
  Play,
  Save,
  ShieldCheck,
  Smartphone,
  Square,
  UserRound,
} from 'lucide-react';
import {
  DEFAULT_LINUSKU_SETTINGS,
  getNextDepartureTimes,
  OccupancyLevel,
  SourceType,
  interpolateAlongRoute,
  isInsideCampusWithSettings,
  haversineDistanceKm,
  type LinuskuSettings,
} from '@/data/usuRoutes';
import {
  DriverTrackingManager,
  formatRelativeTime,
  toDriverPositionPayload,
  type DriverDeliveryState,
  type DriverGpsSample,
} from '@/lib/driverTracking';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';

const MIN_PUBLISH_INTERVAL_MS = 3000;
const DRIVER_STORAGE_KEY = 'linusku-driver-auth';
const REMEMBER_PREFERENCE_KEY = 'linusku:driver-remember';
const SIMULATION_BUS_ID = 'LINUS-01';

type DriverView = 'tracking' | 'profile';
type DriverBus = { id: string; name: string };
type DriverRequestStatus = 'none' | 'pending' | 'approved' | 'rejected';

interface DriverAccessRequest {
  id: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  requested_bus_id: string | null;
  status: DriverRequestStatus;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
}

const INITIAL_DELIVERY_STATE: DriverDeliveryState = {
  status: 'idle',
  online: true,
  queue: [],
  pending: null,
  lastAcknowledgement: null,
  lastError: null,
  retryAt: null,
};

interface WakeLockSentinelLike {
  release: () => Promise<void>;
}

function getOccupancy(value: unknown): OccupancyLevel {
  return value === 'low' || value === 'full' ? value : 'medium';
}

function createDriverSessionToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export default function DriverPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [rememberPreferenceLoaded, setRememberPreferenceLoaded] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [assignedBus, setAssignedBus] = useState<DriverBus | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [activeView, setActiveView] = useState<DriverView>('tracking');
  const [occupancy, setOccupancy] = useState<OccupancyLevel>('medium');
  const [trackingIntervalMs, setTrackingIntervalMs] = useState(3000);
  const [isTracking, setIsTracking] = useState(false);
  const [useMockGps, setUseMockGps] = useState(!isSupabaseConfigured);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [lastCoords, setLastCoords] = useState<{
    lat: number;
    lng: number;
    speedKmh: number;
    accuracyMeters?: number;
  } | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    'Siap mengirim koordinat armada ke peta LINUSKU.'
  );
  const [settings, setSettings] = useState<LinuskuSettings>(DEFAULT_LINUSKU_SETTINGS);
  const [deliveryState, setDeliveryState] = useState<DriverDeliveryState>(INITIAL_DELIVERY_STATE);
  const [driverRequest, setDriverRequest] = useState<DriverAccessRequest | null>(null);
  const [driverRequestStatus, setDriverRequestStatus] = useState<DriverRequestStatus>('none');
  const [driverRequestForm, setDriverRequestForm] = useState({
    fullName: '',
    phone: '',
    notes: '',
    requestedBusId: '',
  });
  const [driverRequestSaving, setDriverRequestSaving] = useState(false);
  const [driverRequestError, setDriverRequestError] = useState('');
  const [preflightError, setPreflightError] = useState('');

  const watchIdRef = useRef<number | null>(null);
  const mockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const lastPublishRef = useRef<{
    lat: number;
    lng: number;
    at: number;
  } | null>(null);
  const occupancyRef = useRef(occupancy);
  const trackingManagerRef = useRef<DriverTrackingManager | null>(null);
  const driverSessionTokenRef = useRef<string | null>(null);
  const lastSessionPingRef = useRef(0);
  const previousSessionUserIdRef = useRef<string | null>(null);
  const nextDeparture = useMemo(
    () => getNextDepartureTimes(settings.schedule, new Date(), 1)[0] ?? null,
    [settings.schedule]
  );

  useEffect(() => {
    occupancyRef.current = occupancy;
  }, [occupancy]);

  useEffect(() => {
    let active = true;
    fetch('/linusku/api/settings')
      .then(async (response) => {
        if (!response.ok) return null;
        return response.json() as Promise<{ settings?: LinuskuSettings }>;
      })
      .then((payload) => {
        if (active && payload?.settings) setSettings(payload.settings);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const manager = new DriverTrackingManager();
    trackingManagerRef.current = manager;
    const unsubscribe = manager.subscribe(setDeliveryState);
    return () => {
      unsubscribe();
      manager.dispose();
      if (trackingManagerRef.current === manager) trackingManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const manager = trackingManagerRef.current;
    if (!manager) return;
    manager.setSender(async (sample) => {
      const supabase = getSupabaseClient({
        rememberSession: rememberMe,
        storageKey: DRIVER_STORAGE_KEY,
      });
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { error } = await supabase
        .from('bus_positions')
        .upsert(toDriverPositionPayload(sample));
      if (error) throw new Error(error.message);
      return { serverTimestamp: new Date().toISOString() };
    });
  }, [assignedBus?.id, rememberMe]);

  useEffect(() => {
    if (!isSupabaseConfigured || !sessionUserId) return;
    let active = true;
    const refreshAssignment = async () => {
      const supabase = getSupabaseClient({
        rememberSession: rememberMe,
        storageKey: DRIVER_STORAGE_KEY,
      });
      if (!supabase) return;
      const { data, error } = await supabase
        .from('buses')
        .select('id, name')
        .eq('driver_id', sessionUserId)
        .eq('is_active', true)
        .maybeSingle();
      if (!active || error) return;
      if (data?.id) {
        setAssignedBus({ id: data.id, name: data.name });
        setIsDriver(true);
      } else {
        setAssignedBus(null);
      }
    };
    void refreshAssignment();
    const timer = window.setInterval(() => void refreshAssignment(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [rememberMe, sessionUserId]);

  useEffect(() => {
    if (!isSupabaseConfigured || !sessionUserId) return;
    let active = true;
    const refreshRequest = async () => {
      const supabase = getSupabaseClient({
        rememberSession: rememberMe,
        storageKey: DRIVER_STORAGE_KEY,
      });
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) return;
      try {
        const response = await fetch('/linusku/api/driver/request', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          request?: DriverAccessRequest | null;
        };
        if (!active) return;
        setDriverRequest(payload.request ?? null);
        setDriverRequestStatus(payload.request?.status ?? 'none');
        if (payload.request?.status === 'approved') {
          await supabase.auth.refreshSession();
        }
      } catch {
        setDriverRequestError('Status permintaan driver belum dapat diperiksa.');
      }
    };
    void refreshRequest();
    const timer = window.setInterval(() => void refreshRequest(), 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [rememberMe, sessionUserId]);

  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    try {
      const navWithWakeLock = navigator as Navigator & {
        wakeLock?: {
          request: (type: 'screen') => Promise<WakeLockSentinelLike>;
        };
      };
      if (navWithWakeLock.wakeLock) {
        wakeLockRef.current = await navWithWakeLock.wakeLock.request('screen');
        setWakeLockActive(true);
      }
    } catch {
      setWakeLockActive(false);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // Ignore release error
      }
      wakeLockRef.current = null;
    }
    setWakeLockActive(false);
  }, []);

  useEffect(() => {
    setRememberMe(
      window.localStorage.getItem(REMEMBER_PREFERENCE_KEY) !== 'false'
    );
    setRememberPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!rememberPreferenceLoaded) return;

    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    let active = true;
    const loadDriverBus = async (
      userId: string | undefined,
      hasDriverRole: boolean
    ) => {
      if (!userId) {
        setAssignedBus(null);
        return;
      }
      const { data, error } = await supabase
        .from('buses')
        .select('id, name')
        .eq('driver_id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (!active) return;
      if (error) {
        setAssignedBus(null);
        setStatusMessage(`Penugasan bus tidak dapat dimuat: ${error.message}`);
        return;
      }
      if (data?.id) {
        setAssignedBus({ id: data.id, name: data.name });
        setIsDriver(true);
      } else {
        setAssignedBus(null);
        setIsDriver(hasDriverRole);
        setStatusMessage(
          hasDriverRole
            ? 'Akun driver belum ditugaskan ke armada aktif. Hubungi admin LINUSKU.'
            : 'Profil pengguna dimuat. Hanya admin yang dapat mengubah akun menjadi driver.'
        );
      }
    };

    const applySession = (user: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
    } | null    ) => {
      const nextUserId = user?.id ?? null;
      if (
        previousSessionUserIdRef.current &&
        previousSessionUserIdRef.current !== nextUserId
      ) {
        void trackingManagerRef.current?.clear();
      }
      previousSessionUserIdRef.current = nextUserId;
      setSessionUserId(nextUserId);
      setSessionEmail(user?.email ?? null);
      const hasDriverRole = user?.app_metadata?.linusku_account_type === 'driver';
      setIsDriver(hasDriverRole);
      const nextProfileName =
        typeof user?.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : '';
      setProfileName(nextProfileName);
      setDriverRequestForm((current) => ({
        ...current,
        fullName: current.fullName || nextProfileName,
      }));
      setOccupancy(getOccupancy(user?.user_metadata?.linusku_occupancy));
      setAssignedBus(null);
      if (!user) setActiveView('tracking');
      void loadDriverBus(user?.id, hasDriverRole);
    };

    supabase.auth.getSession().then(async ({ data, error }) => {
      if (!active) return;
      if (error) setStatusMessage(`Sesi driver tidak dapat dimuat: ${error.message}`);
      const cachedUser = data.session?.user ?? null;
      if (cachedUser) {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (!active) return;
        if (userError) {
          setStatusMessage(`Profil driver tidak dapat dimuat: ${userError.message}`);
        }
        applySession(userData.user ?? cachedUser);
      } else {
        applySession(null);
      }
      setAuthLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [rememberMe, rememberPreferenceLoaded]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isTracking) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTracking, requestWakeLock]);

  const signIn = async () => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) {
      setStatusMessage('Konfigurasi Supabase diperlukan untuk mode login.');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setAuthLoading(false);
    if (error) {
      setStatusMessage(`Login gagal: ${error.message}`);
    } else {
      setStatusMessage('Login berhasil. Siap menyiarkan lokasi armada.');
    }
  };

  const register = async () => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) {
      setStatusMessage('Konfigurasi Supabase diperlukan untuk pendaftaran driver.');
      return;
    }
    if (fullName.trim().length < 2) {
      setStatusMessage('Masukkan nama lengkap untuk membuat akun pengguna.');
      return;
    }
    setAuthLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setAuthLoading(false);
    if (error) {
      setStatusMessage(`Pendaftaran gagal: ${error.message}`);
    } else if (data.session) {
      setStatusMessage('Akun pengguna dibuat. Hubungi admin jika akun ini perlu dijadikan driver.');
    } else {
      setStatusMessage('Akun dibuat. Verifikasi email; admin mengatur jenis akun dan penugasan driver.');
    }
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) {
      setStatusMessage('Konfigurasi Supabase diperlukan untuk login Google.');
      return;
    }
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: new URL(window.location.pathname, window.location.origin).toString(),
      },
    });
    if (error) {
      setStatusMessage(`Login Google gagal: ${error.message}`);
      setAuthLoading(false);
    }
  };

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (authMode === 'signup') void register();
    else void signIn();
  };

  const submitDriverRequest = async () => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) {
      setDriverRequestError('Konfigurasi Supabase diperlukan untuk mengirim permintaan.');
      return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setDriverRequestError('Sesi pengguna sudah berakhir. Masuk kembali.');
      return;
    }
    if (driverRequestForm.fullName.trim().length < 2) {
      setDriverRequestError('Nama lengkap minimal 2 karakter.');
      return;
    }

    setDriverRequestSaving(true);
    setDriverRequestError('');
    try {
      const response = await fetch('/linusku/api/driver/request', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(driverRequestForm),
      });
      const payload = (await response.json().catch(() => null)) as {
        request?: DriverAccessRequest;
        error?: string;
      } | null;
      if (!response.ok || !payload?.request) {
        setDriverRequestError(
          payload?.error ?? 'Permintaan driver belum dapat dikirim.'
        );
        return;
      }
      setDriverRequest(payload.request);
      setDriverRequestStatus(payload.request.status);
      setStatusMessage('Permintaan akses driver sudah dikirim ke admin.');
    } catch {
      setDriverRequestError('Permintaan driver belum dapat dikirim.');
    } finally {
      setDriverRequestSaving(false);
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    const cleanName = profileName.trim();
    if (!supabase || cleanName.length < 2) {
      setStatusMessage('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (profilePassword && profilePassword.length < 8) {
      setStatusMessage('Password baru harus memiliki minimal 8 karakter.');
      return;
    }

    setProfileSaving(true);
    const { data, error } = await supabase.auth.updateUser({
      data: {
        full_name: cleanName,
        ...(isDriver ? { linusku_occupancy: occupancy } : {}),
      },
      ...(profilePassword ? { password: profilePassword } : {}),
    });
    setProfileSaving(false);
    if (error) {
      setStatusMessage(`Profil belum dapat disimpan: ${error.message}`);
      return;
    }

    setProfileName(cleanName);
    setProfilePassword('');
    setStatusMessage(
      'Profil tersimpan. Perubahan kepadatan dipakai pada pembaruan GPS berikutnya.'
    );
    if (data.user.email) setSessionEmail(data.user.email);
  };

  const setRememberPreference = (checked: boolean) => {
    setRememberMe(checked);
    window.localStorage.setItem(REMEMBER_PREFERENCE_KEY, String(checked));
  };

  const refreshProfile = async () => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) return;
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      setStatusMessage(`Profil driver tidak dapat dimuat: ${error.message}`);
      return;
    }
    const hasDriverRole =
      data.user.app_metadata.linusku_account_type === 'driver';
    setIsDriver(hasDriverRole);
    setProfileName(
      typeof data.user.user_metadata?.full_name === 'string'
        ? data.user.user_metadata.full_name
        : ''
    );
    setOccupancy(getOccupancy(data.user.user_metadata?.linusku_occupancy));
    const { data: bus, error: busError } = await supabase
      .from('buses')
      .select('id, name')
      .eq('driver_id', data.user.id)
      .eq('is_active', true)
      .maybeSingle();
    if (busError) {
      setStatusMessage(`Penugasan bus tidak dapat dimuat: ${busError.message}`);
      return;
    }
    setAssignedBus(bus ? { id: bus.id, name: bus.name } : null);
    if (bus) setIsDriver(true);
  };

  const endDriverSession = useCallback(async () => {
    if (!driverSessionTokenRef.current) return;
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    try {
      await fetch('/linusku/api/driver/session', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'end' }),
      });
    } finally {
      driverSessionTokenRef.current = null;
      lastSessionPingRef.current = 0;
    }
  }, [rememberMe]);

  const startDriverSession = useCallback(async (busId: string) => {
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Sesi driver tidak tersedia.');
    const sessionToken = createDriverSessionToken();
    const response = await fetch('/linusku/api/driver/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'start',
        busId,
        sessionToken,
        deviceInfo: {
          userAgent: navigator.userAgent,
          online: navigator.onLine,
        },
      }),
    });
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    if (!response.ok) {
      throw new Error(payload?.error ?? 'Sesi driver belum dapat dimulai.');
    }
    driverSessionTokenRef.current = sessionToken;
    lastSessionPingRef.current = Date.now();
  }, [rememberMe]);

  const pingDriverSession = useCallback(async () => {
    if (!driverSessionTokenRef.current || Date.now() - lastSessionPingRef.current < 15000) {
      return;
    }
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) return;
    lastSessionPingRef.current = Date.now();
    await fetch('/linusku/api/driver/session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'ping' }),
    });
  }, [rememberMe]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (mockTimerRef.current) {
      clearInterval(mockTimerRef.current);
      mockTimerRef.current = null;
    }
    releaseWakeLock();
    setIsTracking(false);
    void endDriverSession();
    setStatusMessage('Pengiriman GPS dihentikan. Data yang belum terkirim tetap tersimpan.');
  }, [endDriverSession, releaseWakeLock]);

  const signOut = async () => {
    stopTracking();
    await trackingManagerRef.current?.clear();
    const supabase = getSupabaseClient({
      rememberSession: rememberMe,
      storageKey: DRIVER_STORAGE_KEY,
    });
    const { error } = (await supabase?.auth.signOut()) ?? { error: null };
    if (error) setStatusMessage(`Keluar gagal: ${error.message}`);
  };

  const publishPosition = async (
    lat: number,
    lng: number,
    speedKmh: number,
    heading: number,
    sourceType: SourceType,
    accuracyMeters?: number
  ) => {
    if (isSupabaseConfigured && !assignedBus) {
      setStatusMessage('Akun belum ditugaskan ke armada aktif. Hubungi admin LINUSKU.');
      return;
    }
    if (!isInsideCampusWithSettings(lat, lng, settings)) {
      setStatusMessage('Lokasi di luar batas Kampus USU dan tidak dikirim.');
      return;
    }

    const now = Date.now();
    if (lastPublishRef.current) {
      const elapsedMs = now - lastPublishRef.current.at;
      if (sourceType === 'driver' && elapsedMs < MIN_PUBLISH_INTERVAL_MS) {
        return;
      }

      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      const distanceKm = haversineDistanceKm(
        lastPublishRef.current.lat,
        lastPublishRef.current.lng,
        lat,
        lng
      );
      const impliedSpeed = elapsedHours > 0 ? distanceKm / elapsedHours : 0;
      if (impliedSpeed > settings.eta.maxSpeedKmh) {
        setStatusMessage(
          `Perubahan lokasi tidak wajar (>${settings.eta.maxSpeedKmh} km/j) dan ditolak untuk anti-spoofing.`
        );
        return;
      }
    }

    lastPublishRef.current = { lat, lng, at: now };
    if (!isSupabaseConfigured) {
      setLastCoords({ lat, lng, speedKmh, accuracyMeters });
      setStatusMessage(
        'Mode Uji Lokal, koordinat diperbarui (hubungkan Supabase untuk siaran publik).'
      );
      return;
    }

    const busId = assignedBus?.id ?? SIMULATION_BUS_ID;
    const sample: DriverGpsSample = {
      busId,
      lat,
      lng,
      speedKmh: Math.min(Math.max(speedKmh, 0), settings.eta.maxSpeedKmh),
      heading,
      occupancy: occupancyRef.current,
      sourceType,
      capturedAt: now,
    };
    const manager = trackingManagerRef.current;
    if (!manager) {
      setStatusMessage('Penyimpanan GPS belum siap. Coba muat ulang halaman.');
      return;
    }
    const enqueueResult = await manager.enqueue(sample);
    if (!enqueueResult.accepted) {
      setStatusMessage(
        enqueueResult.error ?? 'Koordinat tidak dapat dimasukkan ke antrean pengiriman.'
      );
      return;
    }
    setLastCoords({ lat, lng, speedKmh, accuracyMeters });
    void pingDriverSession();
    if (!manager.getSnapshot().online) {
      setStatusMessage('Tidak ada koneksi. Koordinat tersimpan dan akan dikirim otomatis.');
      return;
    }
    const flushResult = await manager.flush();
    if (flushResult.sent > 0) {
      setStatusMessage(
        `Tersiar ke server (${new Date(now).toLocaleTimeString('id-ID')}).`
      );
    } else if (flushResult.failed > 0) {
      setStatusMessage('Pengiriman gagal. Koordinat tersimpan dan akan dicoba kembali.');
    } else {
      setStatusMessage('Koordinat tersimpan untuk pengiriman.');
    }
  };

  const startTracking = async () => {
    setPreflightError('');
    if (useMockGps && isSupabaseConfigured) {
      setPreflightError(
        'Simulasi GPS tidak dapat disiarkan ke peta publik. Matikan simulasi untuk memakai GPS perangkat.'
      );
      return;
    }
    if (!sessionUserId && isSupabaseConfigured) {
      setPreflightError('Login driver diperlukan sebelum memulai pelacakan.');
      return;
    }
    if (isSupabaseConfigured && !isDriver) {
      setPreflightError(
        'Akun pengguna tidak dapat mengirim GPS. Kirim permintaan akses driver melalui menu profil.'
      );
      return;
    }
    if (isSupabaseConfigured && !assignedBus) {
      setPreflightError(
        'Akun belum ditugaskan ke armada aktif. Tunggu persetujuan admin atau penugasan armada.'
      );
      return;
    }
    if (!navigator.onLine) {
      setPreflightError('Perangkat sedang offline. Hubungkan jaringan lalu coba lagi.');
      return;
    }
    const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (window.isSecureContext === false && !localHost) {
      setPreflightError(
        'GPS perangkat memerlukan HTTPS. Buka LINUSKU melalui alamat HTTPS yang aman.'
      );
      return;
    }
    if (!useMockGps && !navigator.geolocation) {
      setPreflightError('Browser tidak mendukung Geolocation.');
      return;
    }
    if (!useMockGps && navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'denied') {
          setPreflightError(
            'Izin lokasi ditolak. Izinkan akses lokasi untuk situs ini pada pengaturan browser.'
          );
          return;
        }
      } catch {
        setPreflightError(
          'Izin lokasi belum dapat diperiksa. Pastikan browser mengizinkan lokasi untuk situs ini.'
        );
        return;
      }
    }

    if (isSupabaseConfigured && assignedBus) {
      try {
        await startDriverSession(assignedBus.id);
      } catch (error) {
        setPreflightError(
          error instanceof Error ? error.message : 'Sesi driver belum dapat dimulai.'
        );
        return;
      }
    }

    setIsTracking(true);
    await requestWakeLock();

    if (useMockGps) {
      let progress = 0;
      setStatusMessage('Mode Simulasi GPS Kampus USU berjalan...');
      mockTimerRef.current = setInterval(() => {
        progress += 0.012;
        const pos = interpolateAlongRoute(progress);
        void publishPosition(pos.lat, pos.lng, 20, pos.heading, 'simulator');
      }, trackingIntervalMs);
      return;
    }

    setStatusMessage(
      settings.features.simulationMode
        ? 'Mode simulasi admin aktif. GPS tetap dikirim, tetapi peta publik memakai data simulasi.'
        : 'Mengambil lokasi GPS perangkat...'
    );
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, heading, accuracy } = position.coords;
        const speedKmh = speed ? Math.round(speed * 3.6) : 18;
        const accuracyMeters = accuracy ? Math.round(accuracy) : undefined;
        void publishPosition(
          latitude,
          longitude,
          speedKmh,
          heading ?? 0,
          'driver',
          accuracyMeters
        );
      },
      (err) => {
        setPreflightError(`Error GPS: ${err.message}`);
        stopTracking();
      },
      {
        enableHighAccuracy: trackingIntervalMs <= 5000,
        maximumAge: trackingIntervalMs,
        timeout: Math.max(10000, trackingIntervalMs * 2),
      }
    );
  };

  useEffect(() => {
    return () => stopTracking();
  }, [stopTracking]);

  return (
    <div className="driver-shell min-h-screen px-4 py-8">
      <div className="mx-auto max-w-md space-y-5">
        <Link
          href="/linusku"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Peta Penumpang
        </Link>

        <div className="driver-card">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <Bus className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">
                  {sessionEmail && !isDriver ? 'Akun LINUSKU' : 'Pelacak Bus Supir'}
                </h1>
                <p className="text-xs text-slate-500">
                  {isSupabaseConfigured
                    ? 'Hanya petugas yang ditugaskan dapat berbagi GPS'
                    : 'Mode uji lokal — posisi tidak dikirim ke server'}
                </p>
              </div>
            </div>

            {isTracking && (
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  wakeLockActive
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <Smartphone className="h-3 w-3" />
                {wakeLockActive ? 'Layar Terjaga' : 'GPS Aktif'}
              </span>
            )}
          </div>

          {isTracking && (
            <div className="driver-live-beacon">
              <span className="driver-live-dot" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold uppercase tracking-wide">
                  GPS Aktif — Menyiarkan Posisi
                </div>
                <div className="text-[11px] font-normal opacity-90 truncate">
                  {assignedBus ? `${assignedBus.name} (${assignedBus.id})` : 'LINUS-01'} · Terlihat langsung di peta penumpang
                </div>
              </div>
            </div>
          )}

          {isSupabaseConfigured && sessionEmail && (
            <>
              <div className="mt-5 flex items-center justify-between gap-3 border-y border-slate-200 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {profileName || sessionEmail}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {assignedBus
                      ? `${assignedBus.name} · ${assignedBus.id}`
                      : 'Belum ada armada aktif yang ditugaskan'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
                >
                  Keluar
                </button>
              </div>
              <div
                className="mt-3 grid grid-cols-2 gap-2"
                role="tablist"
                aria-label={isDriver ? 'Menu driver' : 'Menu profil'}
              >
                {(isDriver
                  ? [
                      { id: 'tracking' as const, label: 'Pelacakan', icon: Bus },
                      { id: 'profile' as const, label: 'Profil saya', icon: UserRound },
                    ]
                  : [{ id: 'profile' as const, label: 'Profil saya', icon: UserRound }]
                ).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      id={`driver-tab-${item.id}`}
                      type="button"
                      role="tab"
                      aria-selected={activeView === item.id}
                      aria-controls="driver-panel"
                      onClick={() => {
                        setActiveView(item.id);
                        if (item.id === 'profile') void refreshProfile();
                      }}
                      className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                        activeView === item.id
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          <div
            id="driver-panel"
            className="mt-5 space-y-4"
            role={sessionEmail && isSupabaseConfigured ? 'tabpanel' : undefined}
            aria-labelledby={
              sessionEmail && isSupabaseConfigured
                ? `driver-tab-${activeView}`
                : undefined
            }
          >
            {isSupabaseConfigured && authLoading && !sessionEmail ? (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600" role="status">
                Memeriksa sesi driver…
              </p>
            ) : isSupabaseConfigured && !sessionEmail ? (
              <form
                onSubmit={handleAuthSubmit}
                className="space-y-4"
              >
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                    {authMode === 'signup' ? 'Buat akun petugas' : 'Masuk sebagai petugas'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Setelah masuk: ajukan akses bila perlu, tunggu penugasan admin, lalu mulai berbagi GPS.
                  </p>
                </div>
                {authMode === 'signup' && (
                  <label className="block text-sm font-semibold text-slate-700">
                    Nama lengkap
                    <input
                      name="full-name"
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      autoComplete="name"
                      minLength={2}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    />
                  </label>
                )}
                <label className="block text-sm font-semibold text-slate-700">
                  Email
                  <input
                    name="driver-email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  Password
                  <input
                    name="driver-password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    minLength={authMode === 'signup' ? 8 : undefined}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberPreference(event.target.checked)}
                    className="h-4 w-4 accent-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                  />
                  Ingat saya di perangkat ini
                </label>
                <button
                  type="submit"
                  disabled={authLoading || !rememberPreferenceLoaded}
                  className="min-h-11 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {authLoading
                    ? 'Memverifikasi…'
                    : authMode === 'signup'
                      ? 'Buat akun'
                      : 'Masuk'}
                </button>
                {authMode === 'signin' && (
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={authLoading}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    Masuk dengan Google
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                  disabled={authLoading}
                  className="min-h-10 w-full rounded-lg px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                >
                  {authMode === 'signin' ? 'Buat akun pengguna' : 'Sudah punya akun? Masuk'}
                </button>
              </form>
            ) : !isSupabaseConfigured || activeView === 'profile' || !isDriver ? (
              isSupabaseConfigured ? (
                <form onSubmit={saveProfile} className="space-y-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Profil pribadi</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Perbarui data pribadi. Jenis akun dan penugasan armada hanya dapat diatur admin.
                    </p>
                  </div>
                  <label className="block text-sm font-semibold text-slate-700">
                    Nama lengkap
                    <input
                      name="profile-name"
                      type="text"
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                      autoComplete="name"
                      minLength={2}
                      required
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">
                    Email akun
                    <input
                      type="email"
                      value={sessionEmail ?? ''}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-base text-slate-600"
                    />
                  </label>
                  {isDriver ? (
                    <>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Armada ditugaskan</p>
                        <p className="mt-1 text-sm text-slate-700">
                          {assignedBus
                            ? `${assignedBus.name} (${assignedBus.id})`
                            : 'Belum ada armada aktif'}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Hubungi admin untuk mengubah penugasan.
                        </p>
                      </div>
                      <fieldset>
                        <legend className="text-sm font-semibold text-slate-700">
                          Status kepadatan penumpang
                        </legend>
                        <div className="mt-2 grid grid-cols-3 gap-2">
                          {([
                            { key: 'low', label: 'Lega' },
                            { key: 'medium', label: 'Sedang' },
                            { key: 'full', label: 'Penuh' },
                          ] as const).map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              aria-pressed={occupancy === item.key}
                              onClick={() => setOccupancy(item.key)}
                              className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                                occupancy === item.key
                                  ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                              }`}
                            >
                              {occupancy === item.key && <Check className="mr-1 inline h-4 w-4" />}
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-sm font-semibold text-slate-800">Jenis akun</p>
                        <p className="mt-1 text-sm text-slate-700">Pengguna</p>
                        <p className="mt-1 text-xs text-slate-500">
                          Ajukan akses driver dan pantau persetujuan admin di sini.
                        </p>
                      </div>
                      {driverRequestStatus === 'pending' && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="status">
                          Tahap 1: permintaan dikirim. Tunggu admin meninjau dan menyetujui akun ini.
                        </div>
                      )}
                      {driverRequestStatus === 'approved' && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900" role="status">
                          Tahap 2: akses disetujui. Admin sekarang harus menugaskan satu nama bus kepada akun ini.
                        </div>
                      )}
                      {driverRequestStatus === 'rejected' && (
                        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900" role="status">
                          Permintaan belum disetujui. Perbaiki data di bawah, lalu kirim ulang.
                        </div>
                      )}
                      {driverRequestError && (
                        <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                          {driverRequestError}
                        </p>
                      )}
                      <fieldset className="space-y-3 rounded-lg border border-slate-200 p-3">
                        <legend className="flex items-center gap-2 px-1 text-sm font-semibold text-slate-800">
                          <ClipboardCheck className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          Permintaan akses driver
                        </legend>
                        <label className="block text-sm font-semibold text-slate-700">
                          Nama lengkap
                          <input
                            name="request-full-name"
                            type="text"
                            value={driverRequestForm.fullName}
                            onChange={(event) => setDriverRequestForm((current) => ({ ...current, fullName: event.target.value }))}
                            autoComplete="name"
                            minLength={2}
                            required
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          Nomor telepon
                          <input
                            name="request-phone"
                            type="tel"
                            value={driverRequestForm.phone}
                            onChange={(event) => setDriverRequestForm((current) => ({ ...current, phone: event.target.value }))}
                            autoComplete="tel"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          ID armada yang diinginkan
                          <input
                            name="request-bus-id"
                            type="text"
                            value={driverRequestForm.requestedBusId}
                            onChange={(event) => setDriverRequestForm((current) => ({ ...current, requestedBusId: event.target.value.toUpperCase() }))}
                            placeholder="LINUS-01"
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                          />
                        </label>
                        <label className="block text-sm font-semibold text-slate-700">
                          Catatan untuk admin
                          <textarea
                            name="request-notes"
                            value={driverRequestForm.notes}
                            onChange={(event) => setDriverRequestForm((current) => ({ ...current, notes: event.target.value }))}
                            maxLength={500}
                            rows={3}
                            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => void submitDriverRequest()}
                          disabled={driverRequestSaving || driverRequestStatus === 'pending'}
                          className="min-h-11 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {driverRequestSaving
                            ? 'Mengirim…'
                            : driverRequestStatus === 'none'
                              ? 'Kirim permintaan'
                              : 'Perbarui permintaan'}
                        </button>
                      </fieldset>
                    </div>
                  )}
                  <label className="block text-sm font-semibold text-slate-700">
                    Password baru
                    <input
                      name="profile-password"
                      type="password"
                      value={profilePassword}
                      onChange={(event) => setProfilePassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={profilePassword ? 8 : undefined}
                      placeholder="Kosongkan jika tidak ingin mengganti"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={profileSaving || authLoading}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Save className="h-4 w-4" />
                    {profileSaving ? 'Menyimpan…' : 'Simpan profil'}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Mode uji lokal memakai armada simulasi LINUS-01. Lokasi tidak dikirim ke peta publik.
                  </p>
                  <button
                    type="button"
                    onClick={startTracking}
                    disabled={isTracking}
                    className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    Mulai simulasi lokal
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Pelacakan armada</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Bus mengikuti penugasan admin. Ubah kepadatan dari profil pribadi.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">Armada aktif</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {assignedBus
                      ? `${assignedBus.name} (${assignedBus.id})`
                      : 'Belum ditugaskan'}
                  </p>
                  {assignedBus && (
                    <p className="mt-1 text-sm text-slate-600">
                      Kepadatan: {occupancy === 'low' ? 'Lega' : occupancy === 'full' ? 'Penuh' : 'Sedang'}
                    </p>
                  )}
                  {nextDeparture && (
                    <p className="mt-1 text-xs text-slate-500">
                      Keberangkatan berikutnya{' '}
                      {new Intl.DateTimeFormat('id-ID', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: settings.schedule.timeZone,
                      }).format(new Date(nextDeparture))}
                    </p>
                  )}
                </div>
                <fieldset>
                  <legend className="text-sm font-semibold text-slate-700">
                    Kepadatan penumpang terbaru
                  </legend>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {([
                      { key: 'low', label: 'Lega' },
                      { key: 'medium', label: 'Sedang' },
                      { key: 'full', label: 'Penuh' },
                    ] as const).map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        aria-pressed={occupancy === item.key}
                        onClick={() => setOccupancy(item.key)}
                        className={`min-h-11 rounded-lg border px-2 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                          occupancy === item.key
                            ? 'border-emerald-700 bg-emerald-50 text-emerald-800'
                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {occupancy === item.key && <Check className="mr-1 inline h-4 w-4" />}
                        {item.label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm font-semibold text-slate-700">
                  Mode pengiriman GPS
                  <select
                    value={trackingIntervalMs}
                    onChange={(event) => setTrackingIntervalMs(Number(event.target.value))}
                    className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
                  >
                    <option value={3000}>Aktif — setiap 3 detik</option>
                    <option value={10000}>Hematan baterai — setiap 10 detik</option>
                  </select>
                </label>
                {!assignedBus && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    Tahap 3 belum siap: akun belum ditugaskan ke sebuah bus. Hubungi admin agar nama bus muncul di sini sebelum mulai GPS.
                  </p>
                )}
                <button
                  type="button"
                  onClick={isTracking ? stopTracking : startTracking}
                  disabled={!assignedBus || authLoading}
                  className={`flex min-h-14 w-full items-center justify-center gap-2.5 rounded-xl px-5 py-3.5 text-base font-bold text-white transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isTracking
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30'
                  }`}
                >
                  {isTracking ? <Square className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
                  {isTracking ? 'Hentikan Berbagi Lokasi' : 'Mulai Berbagi Lokasi'}
                </button>
                {preflightError && (
                  <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">
                    {preflightError}
                  </p>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" role="status" aria-live="polite">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-800">Status pengiriman</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                      deliveryState.status === 'sent'
                        ? 'bg-emerald-100 text-emerald-800'
                        : deliveryState.status === 'offline' || deliveryState.status === 'retry'
                          ? 'bg-amber-100 text-amber-900'
                          : deliveryState.status === 'error'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                    }`}>
                      {deliveryState.online ? 'Online' : 'Offline'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {deliveryState.status === 'idle'
                      ? 'Belum ada koordinat menunggu.'
                      : deliveryState.status === 'queued'
                        ? 'Koordinat tersimpan dan siap dikirim.'
                        : deliveryState.status === 'sending'
                          ? 'Mengirim koordinat…'
                          : deliveryState.status === 'sent'
                            ? 'Koordinat terkonfirmasi server.'
                            : deliveryState.status === 'retry'
                              ? 'Pengiriman ditunda untuk dicoba kembali.'
                              : deliveryState.status === 'offline'
                                ? 'Koordinat tersimpan sampai perangkat kembali online.'
                                : deliveryState.status === 'error'
                                  ? 'Pengiriman memerlukan perhatian.'
                                  : 'Menyiapkan pengiriman.'}
                  </p>
                  {deliveryState.queue.length > 0 && (
                    <p className="mt-1 text-xs text-slate-600">
                      {deliveryState.queue.length} lokasi tersimpan menunggu konfirmasi server.
                    </p>
                  )}
                  {deliveryState.retryAt && (
                    <p className="mt-1 text-xs text-slate-600">
                      Percobaan berikutnya {formatRelativeTime(deliveryState.retryAt)}.
                    </p>
                  )}
                  {deliveryState.lastError && (
                    <p className="mt-1 text-xs text-rose-700">{deliveryState.lastError}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {(!isSupabaseConfigured || sessionEmail) && (
            <div className="mt-5 rounded-lg bg-slate-50 p-3 text-sm text-slate-700" role="status" aria-live="polite">
              <p className="font-semibold text-slate-800">{statusMessage}</p>
              {lastCoords && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <MapPin className="h-4 w-4 text-emerald-700 shrink-0" />
                  {lastCoords.lat.toFixed(5)}, {lastCoords.lng.toFixed(5)} ·{' '}
                  {lastCoords.speedKmh} km/j
                  {lastCoords.accuracyMeters != null && ` · Akurasi ±${lastCoords.accuracyMeters}m`}
                </p>
              )}
              {isTracking && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Smartphone className="h-4 w-4 text-emerald-700 shrink-0" />
                  {wakeLockActive ? 'Layar tetap aktif saat GPS berjalan' : 'GPS aktif'}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
