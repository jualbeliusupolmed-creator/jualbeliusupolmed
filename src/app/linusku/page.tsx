'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import PrimaryNavigation from '@/components/PrimaryNavigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  Bus,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  MapPin,
  Moon,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  Share2,
  ShoppingBag,
  Star,
  Sun,
  Users,
  WifiOff,
  X,
} from 'lucide-react';
import {
  BusPosition,
  BusStop,
  DEFAULT_ETA_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_OPERATING_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  ETASettings,
  LinusOperatingSettings,
  LinuskuSettings,
  ScheduleSettings,
  USU_STOPS,
  estimateEtaDetails,
  estimateEtaMinutes,
  findNearestStop,
  getLinusOperatingStatus,
  getNextDepartureTimes,
  getStopsSequenceToDest,
  getUpcomingStop,
  haversineDistanceKm,
} from '@/data/usuRoutes';
import {
  askNotificationPermission,
  copyEtaUrl,
  generateNextDepartureNotifications,
  getFavoriteStopIds,
  getNotificationPermissionState,
  isPassengerNotificationsOptedIn,
  setPassengerNotificationsOptedIn,
  setFavoriteStopIds as persistFavoriteStopIds,
  shareEtaUrl,
  toggleFavoriteStop as updateFavoriteStop,
  type NotificationPermissionState,
  type NextDeparture,
} from '@/lib/passengerNotifications';
import { getSupabaseClient } from '@/lib/linuskuSupabase';

const LinusMap = dynamic(() => import('@/components/LinusMap'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500">
      Memuat peta Kampus USU…
    </div>
  ),
});

const STORAGE_SELECTED_STOP_KEY = 'linusku:selectedStopId';
const POLL_INTERVAL_MS = 4000;
const NOTIFICATION_THRESHOLD_MINUTES = 10;

const occupancyBadge: Record<
  BusPosition['occupancy'],
  { label: string; classes: string }
> = {
  low: {
    label: 'Lega',
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  medium: {
    label: 'Sedang',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  full: {
    label: 'Penuh',
    classes: 'bg-rose-50 text-rose-700 border-rose-200',
  },
};

export default function HomePage() {
  const [buses, setBuses] = useState<BusPosition[]>([]);
  const [stops, setStops] = useState<BusStop[]>(USU_STOPS);
  const [fleet, setFleet] = useState<Array<{ id: string; name: string }>>([
    { id: 'LINUS-01', name: 'LINUS-01' },
    { id: 'LINUS-02', name: 'LINUS-02' },
    { id: 'LINUS-03', name: 'LINUS-03' },
  ]);

  const [selectedStopId, setSelectedStopId] = useState<string>(USU_STOPS[0].id);
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [routeSource, setRouteSource] = useState<
    'osrm' | 'osm-cache' | 'fallback' | null
  >(null);
  const [favoriteStopIds, setFavoriteStopIds] = useState<string[]>([]);
  const [stopQuery, setStopQuery] = useState('');
  const [feedMode, setFeedMode] = useState<'live' | 'community' | 'simulation' | 'offline'>('offline');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);
  const [nearestInfo, setNearestInfo] = useState<{
    stopName: string;
    distanceMeters: number;
  } | null>(null);
  const [locationStatus, setLocationStatus] = useState('');
  const [currentLocation, setCurrentLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [crowdBusId, setCrowdBusId] = useState('LINUS-01');
  const [crowdOccupancy, setCrowdOccupancy] =
    useState<BusPosition['occupancy']>('medium');
  const [crowdStatus, setCrowdStatus] = useState('');
  const [stopsError, setStopsError] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [fleetError, setFleetError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [sortByNearest, setSortByNearest] = useState<boolean>(false);
  const [nearestStopSuggestion, setNearestStopSuggestion] = useState<{
    stopId: string;
    stopName: string;
    distanceMeters: number;
  } | null>(null);
  const [showInfoCard, setShowInfoCard] = useState<boolean>(false);
  const [isClosedOverlayDismissed, setIsClosedOverlayDismissed] = useState<boolean>(false);
  const [serviceSettings, setServiceSettings] =
    useState<LinusOperatingSettings>(DEFAULT_OPERATING_SETTINGS);
  const [etaSettings, setEtaSettings] =
    useState<ETASettings>(DEFAULT_ETA_SETTINGS);
  const [mapSettings, setMapSettings] = useState(DEFAULT_MAP_SETTINGS);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(
    DEFAULT_SCHEDULE_SETTINGS
  );
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(
    DEFAULT_FEATURE_FLAGS.pushNotificationsEnabled ?? false
  );
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('default');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState('');
  const [shareStatus, setShareStatus] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(
    DEFAULT_FEATURE_FLAGS.maintenanceMode
  );
  const [crowdReportingEnabled, setCrowdReportingEnabled] = useState(
    DEFAULT_FEATURE_FLAGS.crowdReportingEnabled
  );
  const [operatingStatus, setOperatingStatus] = useState(
    getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS)
  );
  const [crowdCooldownUntil, setCrowdCooldownUntil] = useState(0);

  // PWA beforeinstallprompt capture & state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    let isDismissed = false;
    try {
      isDismissed = localStorage.getItem('linusku:pwa-dismissed') === '1';
    } catch {}

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    const handleAppInstalled = () => {
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      setToastMessage('🎉 Aplikasi LINUSKU berhasil dipasang!');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    }
    setDeferredPrompt(null);
  };

  const dismissInstallBanner = () => {
    setShowInstallBanner(false);
    try {
      localStorage.setItem('linusku:pwa-dismissed', '1');
    } catch {}
  };

  // Auto-dismiss floating toast notification
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 2800);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Pantau konektivitas jaringan pengguna (online/offline)
  useEffect(() => {
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Periksa apakah panduan cepat pertama kali perlu ditampilkan
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('linusku:hideQuickGuide');
      if (!dismissed) setShowGuide(true);
    } catch {}
  }, []);

  const dismissGuide = () => {
    setShowGuide(false);
    try {
      localStorage.setItem('linusku:hideQuickGuide', '1');
    } catch {}
  };

  // Muat pengaturan yang diubah admin beserta geometri rute terbaru.
  useEffect(() => {
    let active = true;

    const loadStops = async () => {
      try {
        const response = await fetch('/linusku/api/stops');
        const payload = (await response.json()) as {
          stops?: BusStop[];
          error?: string;
        };
        if (!response.ok || !payload.stops?.length) {
          throw new Error(payload.error ?? 'Daftar halte kosong.');
        }
        if (!active) return;
        setStops(payload.stops);
        setSelectedStopId((current) =>
          payload.stops?.some((stop) => stop.id === current)
            ? current
            : payload.stops?.[0].id ?? USU_STOPS[0].id
        );
        setStopsError('');
      } catch {
        if (active) {
          setStopsError('Daftar halte online tidak dapat dimuat. Coba segarkan halaman.');
        }
      }
    };

    const loadFleet = async () => {
      try {
        const response = await fetch('/linusku/api/fleet');
        const payload = (await response.json()) as {
          buses?: Array<{ id: string; name: string }>;
          error?: string;
        };
        if (!response.ok || !Array.isArray(payload.buses)) {
          throw new Error(payload.error ?? 'Daftar armada tidak tersedia.');
        }
        if (active) {
          setFleet(payload.buses);
          setCrowdBusId((current) =>
            payload.buses?.some((bus) => bus.id === current)
              ? current
              : payload.buses?.[0].id ?? ''
          );
          setFleetError('');
        }
      } catch (error) {
        if (active) {
          setFleet([]);
          setCrowdBusId('');
          setFleetError(
            error instanceof Error
              ? error.message
              : 'Daftar armada belum dapat dimuat.'
          );
        }
      }
    };

    const loadSettings = async () => {
      try {
        const response = await fetch('/linusku/api/settings');
        const payload = (await response.json()) as {
          settings?: LinuskuSettings;
          error?: string;
        };
        if (!response.ok || !payload.settings) {
          throw new Error(payload.error ?? 'Jadwal belum tersedia.');
        }
        if (active) {
          setServiceSettings(payload.settings.service);
          setEtaSettings(payload.settings.eta);
          setMapSettings(payload.settings.map);
          setScheduleSettings(payload.settings.schedule);
          setPushNotificationsEnabled(
            payload.settings.features.pushNotificationsEnabled ?? false
          );
          setMaintenanceMode(payload.settings.features.maintenanceMode);
          setCrowdReportingEnabled(
            payload.settings.features.crowdReportingEnabled
          );
          setSettingsError('');
        }
      } catch {
        if (active) {
          setSettingsError('Jadwal online tidak dapat dimuat. Jadwal bawaan ditampilkan.');
        }
      }
    };

    const loadRoute = async () => {
      try {
        const response = await fetch('/linusku/api/route');
        const payload = (await response.json()) as {
          points?: [number, number][];
          source?: 'osrm' | 'osm-cache' | 'fallback';
          error?: string;
        };
        if (!response.ok || !payload.points || payload.points.length < 2) {
          throw new Error(payload.error ?? 'Geometri rute belum tersedia.');
        }
        if (active) {
          setRoutePolyline(payload.points);
          setRouteSource(payload.source ?? null);
          if (payload.source === 'fallback') {
            setStatusMessage('Jalur cadangan digunakan. Estimasi kedatangan bisa kurang akurat.');
          }
        }
      } catch {
        if (active) {
          setRouteSource(null);
          setStatusMessage('Geometri jalan rute belum dapat dimuat. Halte tetap ditampilkan.');
        }
      }
    };

    void loadStops();
    void loadFleet();
    void loadSettings();
    void loadRoute();
    return () => {
      active = false;
    };
  }, []);

  // Muat halte terakhir & daftar halte favorit dari localStorage
  useEffect(() => {
    try {
      const queryStop = new URLSearchParams(window.location.search).get('stop');
      const savedStop = window.localStorage.getItem(STORAGE_SELECTED_STOP_KEY);
      const requestedStop = queryStop ?? savedStop;
      if (requestedStop && stops.some((stop) => stop.id === requestedStop)) {
        setSelectedStopId(requestedStop);
      }
      setFavoriteStopIds(getFavoriteStopIds());
      setNotificationPermission(getNotificationPermissionState());
      setNotificationsEnabled(isPassengerNotificationsOptedIn());
    } catch {
      setFavoriteStopIds([]);
      setNotificationPermission('unsupported');
    }
  }, [stops]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      const token = data.session?.access_token;
      if (!token || !active) return;
      const response = await fetch('/linusku/api/passenger/preferences', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!response.ok) return;
      const payload = await response.json() as { favoriteStopIds?: string[] };
      if (active && Array.isArray(payload.favoriteStopIds)) {
        setFavoriteStopIds(payload.favoriteStopIds);
        persistFavoriteStopIds(payload.favoriteStopIds);
      }
    }).catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleSelectStop = (stopId: string) => {
    setSelectedStopId(stopId);
    try {
      window.localStorage.setItem(STORAGE_SELECTED_STOP_KEY, stopId);
      const url = new URL(window.location.href);
      url.searchParams.set('stop', stopId);
      window.history.replaceState(null, '', url);
    } catch {
      setStatusMessage('Tujuan pilihan belum dapat disimpan pada tautan halaman.');
    }
  };

  const toggleFavoriteStop = (stopId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = updateFavoriteStop(stopId);
    setFavoriteStopIds(next);

    const targetStop = stops.find((s) => s.id === stopId);
    const isNowFavorite = next.includes(stopId);
    setToastMessage(
      isNowFavorite
        ? `Halte ${targetStop?.name || ''} disimpan ke favorit!`
        : `Halte ${targetStop?.name || ''} dihapus dari favorit.`
    );

    const supabase = getSupabaseClient();
    if (supabase) {
      void supabase.auth.getSession().then(({ data }) => {
        const token = data.session?.access_token;
        if (!token) return;
        void fetch('/linusku/api/passenger/preferences', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ favoriteStopIds: next }),
        }).then((response) => {
          if (!response.ok) {
            setToastMessage('Favorit tersimpan di perangkat, tetapi sinkronisasi akun gagal.');
          }
        }).catch(() => {
          setToastMessage('Favorit tersimpan di perangkat, tetapi sinkronisasi akun gagal.');
        });
      }).catch(() => undefined);
    }
  };

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setPassengerNotificationsOptedIn(false);
      setNotificationsEnabled(false);
      setNotificationStatus('Notifikasi keberangkatan dinonaktifkan.');
      setToastMessage('🔕 Pengingat bus dinonaktifkan.');
      return;
    }
    const permission = await askNotificationPermission();
    setNotificationPermission(permission);
    if (permission !== 'granted') {
      const msg = permission === 'denied'
        ? 'Izin notifikasi ditolak browser.'
        : 'Izin notifikasi belum diberikan browser.';
      setNotificationStatus(msg);
      setToastMessage(msg);
      return;
    }
    const saved = setPassengerNotificationsOptedIn(true);
    setNotificationsEnabled(saved);
    const msg = saved
      ? 'Notifikasi keberangkatan aktif untuk halte favorit.'
      : 'Preferensi notifikasi tidak dapat disimpan di perangkat ini.';
    setNotificationStatus(msg);
    setToastMessage(saved ? 'Pengingat bus aktif!' : msg);
  };

  const copySelectedEtaUrl = async () => {
    const result = await copyEtaUrl(selectedStop.id);
    setShareStatus(result.message);
    setToastMessage(`Tautan Halte ${selectedStop.name} disalin.`);
  };

  const shareSelectedEtaUrl = async () => {
    const result = await shareEtaUrl(selectedStop.id);
    setShareStatus(result.message);
    setToastMessage(`Tautan Halte ${selectedStop.name} siap dibagikan.`);
  };

  const fetchPositions = useCallback(async (showSpinner = false) => {
    const isOperatingNow = getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS).isOpen;
    if (showSpinner) setIsRefreshing(true);
    setIsLoadingPositions(true);
    try {
      const res = await fetch('/linusku/api/positions', {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const payload = (await res.json()) as {
        buses?: BusPosition[];
        mode?: 'live' | 'community' | 'simulation' | 'offline';
        cachedAt?: string;
        warnings?: string[];
        error?: string;
      };

      if (payload.buses) {
        setBuses(payload.buses);
      }
      if (payload.mode) {
        setFeedMode(payload.mode);
      }
      setLastSyncedAt(
        new Date(payload.cachedAt ?? Date.now()).toLocaleTimeString('id-ID')
      );
      setStatusMessage(
        isOperatingNow
          ? payload.warnings?.[0] ?? ''
          : 'Bus Linus beroperasi Senin-Jumat, 07.00-17.00 WIB. Buka lagi saat jam operasional.'
      );
    } catch {
      setFeedMode('offline');
      setBuses([]);
      setLastSyncedAt(null);
      setStatusMessage(
        isOperatingNow
          ? 'Periksa koneksi internetmu. Pengambilan data posisi sedang gagal.'
          : 'Bus Linus beroperasi Senin-Jumat, 07.00-17.00 WIB. Buka lagi saat jam operasional.'
      );
    } finally {
      if (showSpinner) setIsRefreshing(false);
      setIsLoadingPositions(false);
    }
  }, []);

  // Polling hemat kuota ke /api/positions (otomatis jeda saat tab di-background)
  useEffect(() => {
    fetchPositions(false);

    const interval = setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS).isOpen
      ) {
        fetchPositions(false);
      }
    }, POLL_INTERVAL_MS);

    const handleVisibility = () => {
      if (
        document.visibilityState === 'visible' &&
        getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS).isOpen
      ) {
        fetchPositions(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchPositions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setOperatingStatus(getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS));
    }, 60000);
    setOperatingStatus(getLinusOperatingStatus(new Date(), DEFAULT_OPERATING_SETTINGS));
    return () => clearInterval(timer);
  }, []);

  const findNearestFromLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Browser tidak mendukung lokasi.');
      return;
    }
    setLocationStatus('Membaca lokasi…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setCurrentLocation({ lat, lng });
        const nearest = findNearestStop(lat, lng, stops);
        handleSelectStop(nearest.stop.id);
        setNearestInfo({
          stopName: nearest.stop.name,
          distanceMeters: nearest.distanceMeters,
        });
        setLocationStatus(
          `~${nearest.distanceMeters} m menuju ${nearest.stop.name}`
        );
      },
      () => {
        setLocationStatus('Izin lokasi ditolak atau lokasi tidak tersedia.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  const shareCrowdLocation = () => {
    if (Date.now() < crowdCooldownUntil) {
      setCrowdStatus('Tunggu sebentar sebelum mengirim laporan lagi.');
      return;
    }
    if (maintenanceMode || !crowdReportingEnabled) {
      setCrowdStatus(
        maintenanceMode
          ? 'Laporan sementara dihentikan selama pemeliharaan.'
          : 'Fitur laporan mahasiswa sedang dinonaktifkan.'
      );
      return;
    }
    if (!crowdBusId) {
      setCrowdStatus('Belum ada armada aktif untuk laporan.');
      return;
    }
    if (!navigator.geolocation) {
      setCrowdStatus('Browser tidak mendukung lokasi.');
      return;
    }
    setCrowdStatus('Membaca lokasi bus…');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch('/linusku/api/crowd', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              busId: crowdBusId,
              stopId: selectedStop.id,
              occupancy: crowdOccupancy,
            }),
          });
          const payload = await response.json();
          if (!response.ok) {
            setCrowdStatus(payload.error ?? 'Laporan gagal dikirim.');
            return;
          }
          setCrowdCooldownUntil(Date.now() + 60_000);
          setCrowdStatus('Lokasi dan kepadatan berhasil dibagikan.');
          fetchPositions(false);
        } catch {
          setCrowdStatus('Tidak dapat mengirim laporan saat ini.');
        }
      },
      () => {
        setCrowdStatus('Izin lokasi ditolak atau lokasi tidak tersedia.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  };

  const shareCrowdAtStop = async () => {
    if (Date.now() < crowdCooldownUntil) {
      setCrowdStatus('Tunggu sebentar sebelum mengirim laporan lagi.');
      return;
    }
    if (maintenanceMode || !crowdReportingEnabled) {
      setCrowdStatus('Laporan komunitas sedang tidak tersedia.');
      return;
    }
    if (!crowdBusId) {
      setCrowdStatus('Belum ada armada aktif untuk laporan.');
      return;
    }
    setCrowdStatus('Mengirim laporan halte…');
    try {
      const response = await fetch('/linusku/api/crowd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: selectedStop.lat,
          lng: selectedStop.lng,
          busId: crowdBusId,
          stopId: selectedStop.id,
          occupancy: crowdOccupancy,
        }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) {
        setCrowdStatus(payload?.error ?? 'Laporan halte gagal dikirim.');
        return;
      }
      setCrowdCooldownUntil(Date.now() + 60_000);
      setCrowdStatus(`Laporan ${selectedStop.name} berhasil dikirim.`);
      void fetchPositions(false);
    } catch {
      setCrowdStatus('Laporan halte tidak dapat dikirim saat ini.');
    }
  };

  const selectedStop: BusStop = useMemo(() => {
    return stops.find((s) => s.id === selectedStopId) ?? stops[0] ?? USU_STOPS[0];
  }, [selectedStopId, stops]);

  const nextDeparture = useMemo(
    () => getNextDepartureTimes(scheduleSettings, new Date(), 1)[0] ?? null,
    [scheduleSettings]
  );

  const activePolyline =
    routePolyline.length >= 2 ? routePolyline : undefined;

  const stopEtas = useMemo(() => {
    return buses
      .map((bus) => {
        const details = estimateEtaDetails(bus, selectedStop, {
          polyline: activePolyline,
          etaSettings,
          scheduleSettings,
        });
        const upcoming = getUpcomingStop(bus, stops, activePolyline);
        return {
          bus,
          etaMinutes: details.minutes,
          details,
          upcoming,
        };
      })
      .filter(({ bus }) =>
        Date.now() - new Date(bus.updatedAt).getTime() <
        etaSettings.staleThresholdSeconds * 1000
      )
      .sort((a, b) => a.etaMinutes - b.etaMinutes);
  }, [buses, selectedStop, activePolyline, etaSettings, scheduleSettings, stops]);

  const notificationDepartures = useMemo<NextDeparture[]>(() => {
    const targetStopIds = Array.from(
      new Set([selectedStop.id, ...favoriteStopIds])
    );
    return targetStopIds.flatMap((stopId) => {
      const stop = stops.find((item) => item.id === stopId);
      if (!stop) return [];
      const nearest = buses
        .map((bus) => ({
          bus,
          details: estimateEtaDetails(bus, stop, {
            polyline: activePolyline,
            etaSettings,
            scheduleSettings,
          }),
        }))
        .sort((left, right) => left.details.minutes - right.details.minutes)[0];
      if (!nearest) return [];
      return [{
        stopId: stop.id,
        stopName: stop.name,
        busId: nearest.bus.busId,
        busName: nearest.bus.name,
        etaMinutes: nearest.details.minutes,
      }];
    });
  }, [
    activePolyline,
    buses,
    etaSettings,
    favoriteStopIds,
    scheduleSettings,
    selectedStop.id,
    stops,
  ]);

  useEffect(() => {
    if (
      !pushNotificationsEnabled ||
      !notificationsEnabled ||
      notificationPermission !== 'granted' ||
      notificationDepartures.length === 0
    ) {
      return;
    }
    let active = true;
    void generateNextDepartureNotifications(notificationDepartures, {
      thresholdMinutes: NOTIFICATION_THRESHOLD_MINUTES,
      stopIds: favoriteStopIds.length ? favoriteStopIds : [selectedStop.id],
      limit: 5,
    }).then((results) => {
      if (!active) return;
      const sent = results.find((result) => result.status === 'sent');
      if (sent) {
        setNotificationStatus(
          `Notifikasi dikirim untuk ${sent.departure?.stopName ?? selectedStop.name}.`
        );
      }
    });
    return () => {
      active = false;
    };
  }, [
    favoriteStopIds,
    notificationDepartures,
    notificationPermission,
    notificationsEnabled,
    pushNotificationsEnabled,
    selectedStop.id,
    selectedStop.name,
  ]);

  const filteredStops = useMemo(() => {
    const q = stopQuery.trim().toLowerCase();
    const matching = q
      ? stops.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.area.toLowerCase().includes(q)
        )
      : stops;

    return [...matching].sort((a, b) => {
      const aFav = favoriteStopIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteStopIds.includes(b.id) ? 0 : 1;
      if (aFav !== bFav) return aFav - bFav;

      if (sortByNearest && currentLocation) {
        const distA = haversineDistanceKm(currentLocation.lat, currentLocation.lng, a.lat, a.lng);
        const distB = haversineDistanceKm(currentLocation.lat, currentLocation.lng, b.lat, b.lng);
        return distA - distB;
      }

      return a.sequenceOrder - b.sequenceOrder;
    });
  }, [stopQuery, favoriteStopIds, stops, sortByNearest, currentLocation]);
  const operationsError = settingsError || stopsError || fleetError;
  const mapStatus = (() => {
    if (isLoadingPositions) return 'loading';
    if (!operatingStatus.isOpen) return 'simulation';
    const now = Date.now();
    const hasFreshDriverData = buses.some(
      (bus) =>
        bus.sourceType === 'driver' &&
        now - new Date(bus.updatedAt).getTime() <= 20_000
    );
    if (hasFreshDriverData) return 'live';
    const hasDelayedData = buses.some(
      (bus) =>
        bus.sourceType === 'driver' &&
        now - new Date(bus.updatedAt).getTime() <= etaSettings.staleThresholdSeconds * 1000
    );
    if (hasDelayedData) return 'delayed';
    if (feedMode === 'community') return 'community';
    return 'offline';
  })();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/linusku" className="brand" aria-label="LINUSKU, kembali ke beranda">
            <span className="brand-mark"><img src="/linusku/icon.svg" alt="" /></span>
            <span>
              <span className="brand-name">LINUSKU</span>
              <span className="brand-place">Universitas Sumatera Utara</span>
            </span>
          </Link>

          <PrimaryNavigation variant="desktop" />

          <div className="topbar-actions">
            {statusMessage && (
              <span className="visually-hidden" role="status">{statusMessage}</span>
            )}
            <button
              type="button"
              onClick={() => fetchPositions(true)}
              title="Segarkan posisi bus"
              aria-label="Segarkan posisi bus Linus"
              className="live-chip active:translate-y-px disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              disabled={isRefreshing}
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{lastSyncedAt ? `${lastSyncedAt}` : 'Segarkan'}</span>
            </button>
            <button
              type="button"
              className={`live-chip focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${feedMode === 'live' ? 'is-live' : ''}`}
              role="status"
              aria-label="Sumber data posisi bus"
              onClick={() => {
                const messages: Record<string, string> = {
                  live: operatingStatus.isOpen
                    ? 'Posisi segar: dikirim langsung oleh GPS supir tiap 3–5 detik'
                    : 'Di luar jam operasional: peta menampilkan simulasi demo',
                  community: operatingStatus.isOpen
                    ? 'Laporan mahasiswa: posisi berbasis laporan sukarela mahasiswa'
                    : 'Di luar jam operasional: peta menampilkan simulasi demo',
                  simulation: 'Simulasi: pergerakan contoh untuk demo, bukan bus nyata',
                  offline: operatingStatus.isOpen
                    ? 'Offline: periksa koneksi internet untuk mengambil posisi'
                    : 'Di luar jam operasional: peta menampilkan simulasi demo',
                };
                setToastMessage(messages[feedMode] ?? messages.offline);
              }}
            >
              <Radio size={14} />
              <span>
                {!operatingStatus.isOpen
                  ? 'Demo / Simulasi'
                  : feedMode === 'live'
                    ? 'Posisi Segar'
                    : feedMode === 'community'
                      ? 'Laporan Mhs'
                      : feedMode === 'simulation'
                        ? 'Simulasi'
                        : 'Offline'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {!isOnline && (
        <div className="offline-alert-strip" role="alert">
          <WifiOff size={14} aria-hidden="true" />
          <span>Koneksi offline. Menampilkan jadwal & rute statis kampus.</span>
          <button
            type="button"
            className="offline-dismiss-btn"
            onClick={() => setIsOnline(true)}
            aria-label="Sembunyikan peringatan offline"
            title="Sembunyikan"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Saran halte terdekat otomatis */}
      {nearestStopSuggestion && (
        <div className="nearest-stop-banner" role="alert">
          <span className="nearest-stop-banner-text">
            Kamu terdeteksi dekat <strong>{nearestStopSuggestion.stopName}</strong>
            {' '}(~{nearestStopSuggestion.distanceMeters} m). Lihat jadwal halte ini?
          </span>
          <div className="nearest-stop-banner-actions">
            <button
              type="button"
              className="nearest-stop-accept-btn"
              onClick={() => {
                handleSelectStop(nearestStopSuggestion.stopId);
                setNearestStopSuggestion(null);
                setToastMessage(`Beralih ke ${nearestStopSuggestion.stopName}`);
              }}
            >
              Ya, ganti halte
            </button>
            <button
              type="button"
              className="nearest-stop-dismiss-btn"
              onClick={() => setNearestStopSuggestion(null)}
              aria-label="Tutup saran halte"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      <div className="operations-strip">
        <div
          className={`operating-banner ${
            operationsError || statusMessage || !operatingStatus.isOpen ? 'is-warning' : ''
          }`}
          role="status"
          aria-live="polite"
        >
          <Clock size={16} aria-hidden="true" />
          <span>
            <strong>
              {maintenanceMode
                ? 'Pemeliharaan'
                : operationsError
                  ? 'Jadwal bawaan'
                  : statusMessage
                    ? 'Peringatan data'
                    : operatingStatus.label}
            </strong>
            <small>
              {maintenanceMode
                ? 'Pelaporan sementara dihentikan.'
                : operationsError
                  ? 'Online belum tersedia.'
                  : statusMessage || operatingStatus.detail}
            </small>
          </span>
        </div>
        <a
          className="marketplace-button"
          href="/jual-beli"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Buka Marketplace USU Polmed dan Open PO"
        >
          <span>
            <strong>Marketplace USU Polmed</strong>
            <small>Jual beli &amp; Open PO mahasiswa</small>
          </span>
          <ExternalLink size={16} aria-hidden="true" />
        </a>
      </div>

      <nav
        aria-label="Navigasi bagian LINUSKU"
        className="mx-auto flex w-full max-w-[1440px] gap-2 px-4 pt-3 sm:px-6 xl:hidden"
      >
        <a
          href="#peta"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#134e35] px-4 text-sm font-bold text-[#134e35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-[#bef264] dark:text-[#bef264]"
        >
          Peta
        </a>
        <a
          href="#halte"
          className="inline-flex min-h-11 items-center rounded-lg border border-[#134e35] px-4 text-sm font-bold text-[#134e35] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-[#bef264] dark:text-[#bef264]"
        >
          Halte
        </a>
      </nav>

      <main className="app-main">
        <section className="map-column" id="peta" aria-label="Peta rute Linus">
          <div className="map-frame">
            <span
              className={`map-status-chip ${
                mapStatus === 'live'
                  ? 'is-live'
                  : mapStatus === 'simulation'
                    ? 'is-simulation'
                    : 'is-delayed'
              }`}
              role="status"
              style={{ position: 'absolute', top: 52, left: 12, zIndex: 500 }}
            >
              <i aria-hidden="true" />
              {mapStatus === 'simulation'
                ? 'DEMO / SIMULASI'
                : mapStatus === 'loading'
                  ? 'MEMUAT POSISI'
                : mapStatus === 'live'
                  ? 'POSISI SEGAR'
                  : mapStatus === 'delayed'
                    ? 'POSISI TERLAMBAT'
                    : mapStatus === 'community'
                      ? 'LAPORAN MAHASISWA'
                      : 'GPS TIDAK TERSEDIA'}
            </span>
            <LinusMap
              buses={buses}
              stops={stops}
              routePolyline={activePolyline}
              etaSettings={etaSettings}
              mapSettings={mapSettings}
              selectedStopId={selectedStop.id}
              onSelectStop={(stop) => handleSelectStop(stop.id)}
              onLocateMe={findNearestFromLocation}
              isLocating={locationStatus.startsWith('Membaca')}
              currentLocation={currentLocation}
              feedMode={feedMode}
              isOperating={operatingStatus.isOpen}
            />
            {/* Overlay saat bus tidak beroperasi, dapat ditutup agar peta tetap terlihat */}
            {!operatingStatus.isOpen && !isClosedOverlayDismissed && (
              <div
                className="map-closed-overlay cursor-pointer"
                role="status"
                aria-live="polite"
                onClick={() => setIsClosedOverlayDismissed(true)}
              >
                <div
                  className="map-closed-card cursor-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="map-closed-close-btn"
                    onClick={() => setIsClosedOverlayDismissed(true)}
                    aria-label="Tutup pesan simulasi dan lihat peta"
                    title="Tutup pesan simulasi"
                  >
                    <X size={18} />
                  </button>
                  <img src="/linusku/stickers/mascot-halte.png" alt="" className="w-14 h-14 object-contain" aria-hidden="true" />
                  <p className="map-closed-title">Bus Linus Sedang Istirahat</p>
                  <p className="map-closed-sub">
                    Pergerakan di bawah adalah <strong>simulasi demo</strong>, bukan posisi bus nyata.
                    <br />Beroperasi <strong>Senin-Jumat 07.00-17.00 WIB</strong>.
                  </p>
                  <button
                    type="button"
                    className="map-closed-btn"
                    onClick={() => setIsClosedOverlayDismissed(true)}
                  >
                    Lihat Peta (Simulasi)
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <aside className="board-column" aria-label="Informasi kedatangan dan halte">
          {showGuide && (
            <div className="quick-guide-banner" role="complementary" aria-label="Panduan cepat">
              <div className="quick-guide-content">
                <img
                  src="/linusku/stickers/mascot-map.png"
                  alt=""
                  className="quick-guide-avatar"
                  aria-hidden="true"
                />
                <div className="quick-guide-text">
                      <h4>Panduan singkat Linus</h4>
                  <p>
                        1. Pilih halte. 2. Cek perkiraan kedatangan. 3. Aktifkan pengingat atau bagikan posisi langsung dari halte.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismissGuide}
                className="quick-guide-dismiss"
                aria-label="Tutup panduan"
                title="Tutup panduan"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}

          <section className="arrival-board" aria-labelledby="arrival-title">
            <div className="arrival-head">
              <div className="arrival-head-info">
                <h2 id="arrival-title">{selectedStop.name}</h2>
                <p className="stop-area">{selectedStop.area}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Simpan favorit. Pengingat bus
                </p>
              </div>
              <div className="arrival-head-actions">
                <span className="route-chip">
                  <Clock size={13} aria-hidden="true" />
                  07.00-17.00
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void toggleNotifications()}
                    disabled={!pushNotificationsEnabled || notificationPermission === 'unsupported'}
                    aria-pressed={notificationsEnabled}
                    aria-label={notificationsEnabled ? 'Matikan pengingat halte' : 'Aktifkan pengingat halte'}
                    title={notificationsEnabled ? 'Pengingat aktif: Matikan' : 'Ingatkan saat bus mendekati halte ini'}
                    className="arrival-action"
                  >
                    {notificationsEnabled ? <BellRing size={15} aria-hidden="true" /> : <Bell size={15} aria-hidden="true" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void copySelectedEtaUrl()}
                    aria-label="Salin tautan halte"
                    title="Salin tautan halte"
                    className="arrival-action"
                  >
                    <Copy size={15} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void shareSelectedEtaUrl()}
                    aria-label="Bagikan halte"
                    title="Bagikan halte"
                    className="arrival-action"
                  >
                    <Share2 size={15} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
            {pushNotificationsEnabled && notificationPermission !== 'unsupported' && !notificationsEnabled && (
              <div className="watch-bus-cta-card">
                <div className="watch-bus-cta-info">
                  <div className="watch-bus-cta-text">
                    <h4>
                      <Bell size={15} />
                      Pantau Bus di Halte Ini
                    </h4>
                    <p>Dapat notifikasi otomatis saat bus mendekati {selectedStop.name}.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="watch-bus-cta-btn"
                  onClick={() => void toggleNotifications()}
                >
                  Aktifkan
                </button>
              </div>
            )}
            {/* Confidence Legend */}
            <div className="confidence-legend" role="group" aria-label="Tingkat keyakinan estimasi ETA">
              <span className="confidence-legend-label">Keyakinan:</span>
              <span className="confidence-legend-item" tabIndex={0} aria-label="Baru: Seberapa baru data posisi bus ini. GPS baru kurang dari 20 detik." title="Seberapa baru data posisi bus ini. GPS baru kurang dari 20 detik.">
                <span className="confidence-dot" style={{ background: 'var(--color-success)' }} aria-hidden="true" />
                <span>Baru</span>
              </span>
              <span aria-hidden="true"> · </span>
              <span className="confidence-legend-item" tabIndex={0} aria-label="Diperkirakan: Seberapa baru data posisi bus ini. GPS 20 sampai 45 detik." title="Seberapa baru data posisi bus ini. GPS 20 sampai 45 detik.">
                <span className="confidence-dot" style={{ background: 'var(--color-accent-2)' }} aria-hidden="true" />
                <span>Diperkirakan</span>
              </span>
              <span aria-hidden="true"> · </span>
              <span className="confidence-legend-item" tabIndex={0} aria-label="Lama: Seberapa baru data posisi bus ini. GPS lebih dari 45 detik." title="Seberapa baru data posisi bus ini. GPS lebih dari 45 detik.">
                <span className="confidence-dot" style={{ background: 'var(--color-muted)' }} aria-hidden="true" />
                <span>Lama</span>
              </span>
              <span className="text-[10px] text-slate-500">Seberapa baru data posisi bus ini.</span>
            </div>

            {pushNotificationsEnabled && notificationsEnabled && (
              <div className="watch-bus-cta-card" style={{ background: 'var(--utility-emerald-50)', borderColor: 'var(--utility-emerald-600)' }}>
                <div className="watch-bus-cta-info">
                  <div className="watch-bus-cta-text">
                    <h4>
                      <BellRing size={15} style={{ color: 'var(--utility-emerald-600)' }} />
                      Pengingat Halte Aktif
                    </h4>
                        <p>Notifikasi muncul saat bus diperkirakan 10 menit dari {selectedStop.name}.</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="watch-bus-cta-btn"
                  style={{ backgroundColor: 'transparent', color: 'var(--utility-emerald-800)', border: '1px solid var(--utility-emerald-600)' }}
                  onClick={() => void toggleNotifications()}
                >
                  Matikan
                </button>
              </div>
            )}
            {(notificationStatus || shareStatus) && (
              <p className="mt-2 text-xs text-slate-600 font-medium" role="status" aria-live="polite">
                {[notificationStatus, shareStatus].filter(Boolean).join(' · ')}
              </p>
            )}
            {operatingStatus.isOpen && nextDeparture && (
              <p className="mt-2 text-xs text-slate-600">
                Keberangkatan berikutnya{' '}
                {new Intl.DateTimeFormat('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: scheduleSettings.timeZone,
                }).format(new Date(nextDeparture))}
              </p>
            )}
            {!operatingStatus.isOpen && (
              <p className="service-status-note" role="status">
                Bus tidak beroperasi sekarang. Posisi di bawah hanyalah peragaan simulasi rute.
              </p>
            )}

            {isLoadingPositions ? (
              <div className="flex flex-col items-center justify-center p-6 text-center" role="status" aria-live="polite">
                <RefreshCw size={24} className="mb-2 animate-spin text-emerald-700" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-800">Memuat posisi bus…</p>
              </div>
            ) : stopEtas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-center">
                <img
                  src="/linusku/stickers/mascot-halte.png"
                  alt="Halte Linus"
                  className="mb-2 h-20 w-20 object-contain"
                />
                <p className="text-sm font-bold text-slate-800">
                  {!operatingStatus.isOpen
                    ? 'Posisi bus belum ditampilkan'
                    : feedMode === 'offline'
                      ? 'Data posisi belum tersedia'
                      : 'Belum ada armada Linus aktif di rute'}
                </p>
                <p className="mt-1 text-xs text-slate-500 max-w-xs">
                  {!operatingStatus.isOpen
                    ? 'Bus Linus beroperasi Senin-Jumat, 07.00-17.00 WIB. Buka lagi saat jam operasional.'
                    : feedMode === 'offline'
                      ? 'Periksa koneksi internetmu. Pengambilan data posisi sedang gagal.'
                      : 'Bus Linus beroperasi resmi Senin-Jumat pukul 07.00-17.00 WIB.'}
                </p>
              </div>
            ) : (
              stopEtas.map(({ bus, etaMinutes, upcoming, details }, index) => {
                const diffSec = Math.max(
                  0,
                  Math.floor(
                    (Date.now() - new Date(bus.updatedAt).getTime()) / 1000
                  )
                );
                const isStale =
                  diffSec > etaSettings.staleThresholdSeconds;
                const isSimulation = !operatingStatus.isOpen || feedMode === 'simulation';
                const isDelayed =
                  !isSimulation &&
                  diffSec > 20 &&
                  diffSec <= etaSettings.staleThresholdSeconds;
                const isStationary = bus.speedKmh <= 2;
                const freshnessText =
                  isSimulation
                    ? 'data contoh'
                    : isDelayed
                      ? `Lokasi tertunda (${diffSec} dtk lalu)`
                      : diffSec < 20
                    ? 'GPS baru (<20 dtk)'
                    : `Update ${diffSec < 60 ? `${diffSec} dtk` : `${Math.floor(diffSec / 60)} mnt`} lalu`;

                const isHighConfidence = details.confidence >= 0.75;
                const isMediumConfidence = details.confidence >= 0.45;

                return (
                  <div className="arrival-row" key={bus.busId}>
                    <div className="arrival-bus-info">
                      <div className="bus-name">
                        <img className="bus-name-mark" src="/linusku/icon.svg" alt="" aria-hidden="true" />
                        <span className="font-extrabold">{bus.busId}</span>
                        {index === 0 && <span className="nearest-badge">Terdekat</span>}
                        {isSimulation && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Simulasi
                          </span>
                        )}
                      </div>

                      {/* Arah Rute Loop Bus */}
                      {upcoming && (
                        <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-emerald-800">
                          <span>→ Menuju Halte {upcoming.stop.name}</span>
                          {upcoming.isAtStop && (
                            <span className="rounded bg-emerald-100 px-1 py-0.2 text-[10px] text-emerald-900">
                              Di Halte
                            </span>
                          )}
                        </div>
                      )}

                      {/* Alur Mini Rute Loop Menuju Halte Pilihan Penumpang */}
                      {(() => {
                        const routeSequence = getStopsSequenceToDest(bus, selectedStop, stops, activePolyline);
                        if (!routeSequence || routeSequence.length === 0) return null;
                        return (
                          <div className="mt-2 rounded-lg bg-emerald-50/80 p-2 border border-emerald-200 text-xs">
                            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 mb-1">
                              <span>Alur Menuju Halte Ini:</span>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-semibold">
                                {routeSequence.length === 1 ? 'Halte berikutnya!' : `${routeSequence.length - 1} halte lagi`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px] text-emerald-800">
                              {routeSequence.map((seqStop, seqIdx) => {
                                const isCurrentTarget = seqStop.id === selectedStop.id;
                                return (
                                  <span key={seqStop.id} className="flex items-center gap-1 shrink-0">
                                    <span
                                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                                        isCurrentTarget
                                          ? 'bg-emerald-600 text-white font-bold shadow-xs'
                                          : 'bg-white border border-emerald-200 text-slate-700'
                                      }`}
                                    >
                                      {seqStop.name.replace('Halte ', '')}
                                    </span>
                                    {seqIdx < routeSequence.length - 1 && (
                                      <span className="text-emerald-400 font-bold text-[10px]">→</span>
                                    )}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Status Kecepatan: Berhenti vs Melaju */}
                      <div className="mt-0.5 text-xs">
                        {isStationary ? (
                          <span className="font-medium text-amber-800">
                            Sedang berhenti / naik-turun
                          </span>
                        ) : (
                          <span className="font-medium text-slate-700">
                            Sedang melaju (~{Math.round(bus.speedKmh)} km/jam)
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className={`occupancy-chip ${bus.occupancy}`}>
                          <Users size={12} aria-hidden="true" />
                          {occupancyBadge[bus.occupancy].label}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            isHighConfidence
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : isMediumConfidence
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-slate-50 text-slate-600 border border-slate-200'
                          }`}
                          title={`Tingkat keyakinan estimasi: ${Math.round(details.confidence * 100)}%`}
                        >
                          {isHighConfidence ? 'Posisi Baru' : isMediumConfidence ? 'Diperkirakan' : 'Posisi Lama'}
                        </span>
                        <small className="arrival-source">
                          {isSimulation
                            ? 'Contoh simulasi'
                            : bus.sourceType === 'driver'
                              ? 'GPS Driver'
                              : bus.sourceType === 'crowd'
                                ? 'Laporan Mahasiswa'
                                : 'Simulasi'} · {freshnessText} · ~{details.distanceKm.toFixed(1)} km
                          {routeSource === 'fallback' ? ' · Jalur cadangan' : ''}
                        </small>
                      </div>

                      {isStale && (
                        <small className="mt-1 block font-semibold text-amber-700">Sinyal GPS sempat terhenti</small>
                      )}
                    </div>
                    <div className="eta">
                      {isSimulation ? (
                        <>
                          ~{etaMinutes}
                          <small className="text-amber-800 font-bold">simulasi</small>
                        </>
                      ) : (
                        <>
                          {etaMinutes <= 1 ? 'Dekat' : etaMinutes}
                          <small>{etaMinutes <= 1 ? 'di halte' : 'menit'}</small>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="utility-panel" aria-label="Lokasi dan pelaporan penumpang">
            <div className="utility-heading">
              <strong>Bantu temankan Linus (Opsional)</strong>
              <small>Laporkan kondisi yang benar-benar kamu lihat</small>
            </div>

            <button
              type="button"
              className="nearest-button active:translate-y-px"
              onClick={findNearestFromLocation}
              disabled={Boolean(locationStatus.startsWith('Membaca'))}
            >
              <Navigation size={16} />
              {locationStatus.startsWith('Membaca') ? 'Mencari lokasi…' : 'Cari halte terdekat dari lokasiku'}
            </button>
            <p className="mt-1 text-[10px] text-slate-500">
              Lokasi diproses di perangkat untuk memilih halte terdekat dan tidak dikirim atau disimpan oleh fitur ini.
            </p>
            {(nearestInfo || locationStatus) && (
              <p className="utility-status font-medium text-emerald-800" role="status">
                {locationStatus}
              </p>
            )}

            <details className="crowd-report-details">
              <summary>
                Laporkan bus atau kepadatan
              </summary>
              <div className="crowd-report-content">
              <p className="mt-0.5 text-[11px] text-slate-500">
                Pilih satu mode, lalu kirim kepadatan bus. Laporan tidak menggantikan posisi GPS supir.
              </p>

              <div className="density-chips" role="group" aria-label="Pilih tingkat kepadatan bus">
                <button
                  type="button"
                  className={`density-chip-btn ${crowdOccupancy === 'low' ? 'is-active' : ''}`}
                  onClick={() => setCrowdOccupancy('low')}
                  aria-pressed={crowdOccupancy === 'low'}
                  aria-label="Kepadatan Lega: penumpang sedikit, banyak kursi kosong"
                >
                  Lega
                </button>
                <button
                  type="button"
                  className={`density-chip-btn ${crowdOccupancy === 'medium' ? 'is-active' : ''}`}
                  onClick={() => setCrowdOccupancy('medium')}
                  aria-pressed={crowdOccupancy === 'medium'}
                  aria-label="Kepadatan Sedang: penumpang lumayan, beberapa kursi kosong"
                >
                  Sedang
                </button>
                <button
                  type="button"
                  className={`density-chip-btn ${crowdOccupancy === 'full' ? 'is-active' : ''}`}
                  onClick={() => setCrowdOccupancy('full')}
                  aria-pressed={crowdOccupancy === 'full'}
                  aria-label="Kepadatan Penuh: penumpang penuh dan ada yang berdiri"
                >
                  Penuh
                </button>
              </div>

              <button
                type="button"
                className="crowd-button mt-2 active:translate-y-px"
                onClick={() => void shareCrowdAtStop()}
                disabled={
                  maintenanceMode ||
                  !operatingStatus.isOpen ||
                  !crowdReportingEnabled ||
                  crowdStatus.startsWith('Mengirim') ||
                  fleet.length === 0
                }
              >
                <MapPin size={15} />
                {operatingStatus.isOpen
                  ? 'Bus terlihat di halte ini'
                  : 'Aktif saat jam operasional bus'}
              </button>
              <p className="mt-1 text-[10px] text-slate-500">
                Bus terlihat di halte ini: kamu sedang berada di halte dan melihat bus lewat atau berhenti.
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                <label className="flex items-center gap-1">
                  <span>Nama bus:</span>
                  <select
                    value={crowdBusId}
                    disabled={fleet.length === 0}
                    onChange={(e) => setCrowdBusId(e.target.value)}
                    className="border border-slate-300 bg-white px-1 py-0.5 text-[11px]"
                  >
                    {fleet.map((bus) => (
                      <option value={bus.id} key={bus.id}>
                        {bus.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={shareCrowdLocation}
                  disabled={
                    maintenanceMode ||
                    !operatingStatus.isOpen ||
                    !crowdReportingEnabled ||
                    crowdStatus.startsWith('Membaca') ||
                    fleet.length === 0
                  }
                  className="font-semibold text-emerald-700 hover:underline"
                  title="Gunakan hanya jika lokasi kamu sedang berada di dalam bus Linus"
                >
                  Saya di dalam bus
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-500">
                Laporan mahasiswa berlaku 3 menit dan hanya membantu perkiraan kepadatan. Ini bukan panggilan bus.
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Saya di dalam bus: kamu sedang naik Linus. Nama armada dapat dilihat pada daftar LINUS-01/02/03 atau ditanyakan kepada supir. Pada mode ini, lokasi perangkat dikirim ke server bersama laporan kepadatan.
              </p>
              </div>
            </details>

            {crowdStatus && (
              <p className="utility-status font-medium text-emerald-800 mt-2" role="status">
                {crowdStatus}
              </p>
            )}
          </section>

          {/* Panduan & Aturan Operasional Linus */}
          <div className="passenger-faq-card" id="panduan-naik-linus">
            <div
              className="passenger-faq-title"
              onClick={() => setShowInfoCard(!showInfoCard)}
              role="button"
              tabIndex={0}
              aria-expanded={showInfoCard}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setShowInfoCard((current) => !current);
                }
              }}
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Info size={15} className="text-emerald-700" />
                Panduan &amp; Aturan Naik Linus USU
              </span>
              <span className="text-xs text-slate-500">{showInfoCard ? '▲ Tutup' : '▼ Info Naik Bus'}</span>
            </div>

            {showInfoCard && (
              <div className="passenger-faq-grid">
                <div className="passenger-faq-item">
                  <strong>100% Gratis</strong>
                  <p>Fasilitas resmi kampus USU untuk mahasiswa, dosen, &amp; staf tanpa biaya.</p>
                </div>
                <div className="passenger-faq-item">
                  <strong>Tanpa Tap Kartu</strong>
                  <p>Tidak perlu tap KTM atau kartu khusus. Cukup antre dan langsung naik.</p>
                </div>
                <div className="passenger-faq-item">
                  <strong>Wajib di Halte Resmi</strong>
                  <p>Naik &amp; turun hanya di halte bertanda Linus demi keselamatan lalu lintas.</p>
                </div>
                <div className="passenger-faq-item">
                  <strong>Rute Loop 1 Arah</strong>
                  <p>Linus berputar keliling kampus searah jarum jam. Cek alur rute sebelum naik.</p>
                </div>
              </div>
            )}
          </div>

          <section className="stops-panel" id="halte" aria-labelledby="stops-title">
            <div className="stops-head">
              <h2 id="stops-title">Pilih halte</h2>
              <input
                className="stop-search focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                type="search"
                value={stopQuery}
                onChange={(e) => setStopQuery(e.target.value)}
                placeholder="Cari halte"
                aria-label="Cari halte"
              />
            </div>

            <div className="stop-filter-chips px-2">
              <button
                type="button"
                onClick={() => setSortByNearest(false)}
                className={`stop-filter-chip ${!sortByNearest ? 'is-active' : ''}`}
              >
                Urutan Rute
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!currentLocation) {
                    findNearestFromLocation();
                  }
                  setSortByNearest(true);
                }}
                className={`stop-filter-chip ${sortByNearest ? 'is-active' : ''}`}
                title="Urutkan halte terdekat dari posisi kamu"
              >
                <Compass size={12} aria-hidden="true" />
                <span>Terdekat {currentLocation ? '✓' : '(GPS)'}</span>
              </button>
            </div>

            <div className="stop-list">
              {filteredStops.map((stop) => {
                const isSelected = stop.id === selectedStop.id;
                const isFavorite = favoriteStopIds.includes(stop.id);
                const nearest = buses.length
                  ? Math.min(...buses.map((b) => estimateEtaMinutes(b, stop, activePolyline, etaSettings)))
                  : null;

                const distMeters = currentLocation
                  ? Math.round(
                      haversineDistanceKm(
                        currentLocation.lat,
                        currentLocation.lng,
                        stop.lat,
                        stop.lng
                      ) * 1000
                    )
                  : null;

                return (
                  <div key={stop.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-stretch">
                    <button
                      type="button"
                      onClick={() => handleSelectStop(stop.id)}
                      className={`stop-button active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${isSelected ? 'is-selected' : ''}`}
                    >
                      <span>
                        <span className="stop-name">
                          <MapPin size={13} aria-hidden="true" /> {stop.name}
                        </span>
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <span className="stop-area">{stop.area}</span>
                          {distMeters !== null && (
                            <span className="rounded bg-blue-50 px-1 py-0.2 text-[10px] font-semibold text-blue-700">
                              {distMeters < 1000 ? `${distMeters} m` : `${(distMeters / 1000).toFixed(1)} km`}
                            </span>
                          )}
                        </span>
                      </span>
                      {nearest !== null && (
                        <span className="stop-nearest">
                          {!operatingStatus.isOpen
                            ? `${Math.max(0, nearest)} menit contoh`
                            : nearest <= 1
                              ? 'Sudah dekat'
                              : `${nearest} menit`}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={(event) => toggleFavoriteStop(stop.id, event)}
                      aria-pressed={isFavorite}
                      aria-label={isFavorite ? `Hapus ${stop.name} dari favorit` : `Tambahkan ${stop.name} ke favorit`}
                      className={`min-h-11 border-b border-slate-200 px-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 ${isFavorite ? 'text-amber-600' : 'text-slate-400 hover:text-amber-600'}`}
                    >
                      <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Ekosistem Mahasiswa USU */}
          <div className="campus-ecosystem-card">
            <div className="ecosystem-heading">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-500">
                Ekosistem Kampus USU
              </span>
            </div>
            <div className="ecosystem-links">
              <a
                className="ecosystem-link-item active:translate-y-px"
                href="https://www.kampuskita.my.id/jual-beli"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Buka Marketplace KampusKita"
              >
                <ShoppingBag size={18} className="text-emerald-700 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-xs text-slate-900">Marketplace KampusKita</div>
                  <div className="text-[11px] text-slate-500 truncate">Jual-beli & Open PO mahasiswa USU</div>
                </div>
                <ExternalLink size={13} className="text-slate-400 shrink-0" />
              </a>

              {process.env.NEXT_PUBLIC_LINUSKU_CONTACT_URL?.trim() && (
                <a
                  className="ecosystem-link-item active:translate-y-px"
                  href={process.env.NEXT_PUBLIC_LINUSKU_CONTACT_URL.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Lapor masalah atau lihat kontak LINUSKU"
                >
                  <HelpCircle size={18} className="text-slate-700 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs text-slate-900">Lapor masalah / Kontak</div>
                    <div className="text-[11px] text-slate-500 truncate">Sampaikan kendala penggunaan LINUSKU</div>
                  </div>
                  <ExternalLink size={13} className="text-slate-400 shrink-0" />
                </a>
              )}
            </div>
          </div>
        </aside>
      </main>

      {showInstallBanner && deferredPrompt && (
        <aside className="pwa-install-banner" aria-label="Pasang Aplikasi LINUSKU">
          <div className="pwa-install-content">
            <img
              src="/linusku/icon.svg"
              alt="Logo LINUSKU"
              className="pwa-install-app-icon"
            />
            <div className="pwa-install-text">
              <h4>Pasang Aplikasi LINUSKU</h4>
              <p>Akses cepat posisi bus USU langsung dari layar HP.</p>
            </div>
          </div>
          <div className="pwa-install-actions">
            <button
              type="button"
              className="pwa-install-btn"
              onClick={() => void handleInstallApp()}
            >
              Pasang
            </button>
            <button
              type="button"
              className="pwa-install-dismiss"
              onClick={dismissInstallBanner}
              aria-label="Tutup saran pemasangan"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}

      {toastMessage && (
        <div className="linus-toast" role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
