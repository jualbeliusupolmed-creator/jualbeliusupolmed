'use client';

import {
  Dispatch,
  FormEvent,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bus,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  LogOut,
  MapPin,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Settings2,
  ShieldCheck,
  QrCode,
  Upload,
  UserCheck,
  Users,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Session } from '@supabase/supabase-js';
import {
  DEFAULT_ETA_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
  DEFAULT_GEOFENCE_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_SCHEDULE_SETTINGS,
  type ScheduleSettings,
} from '@/data/usuRoutes';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/linuskuSupabase';
import './admin.css';

type AdminTab =
  | 'overview'
  | 'fleet'
  | 'drivers'
  | 'requests'
  | 'stops'
  | 'reports'
  | 'operations'
  | 'audit'
  | 'history';
type Occupancy = 'low' | 'medium' | 'full';

interface AdminBus {
  id: string;
  name: string;
  plate_number: string | null;
  capacity: number;
  is_active: boolean;
  driver_id: string | null;
}

interface AdminStop {
  id: string;
  name: string;
  area: string;
  lat: number;
  lng: number;
  sequence_order: number;
}

interface AdminPosition {
  bus_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  occupancy: Occupancy;
  source_type: string;
  updated_at: string;
}

interface AdminReport {
  id: string;
  bus_id: string | null;
  stop_id: string | null;
  lat: number;
  lng: number;
  occupancy: Occupancy;
  created_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  fullName: string;
  occupancy: Occupancy;
  createdAt: string;
  lastSignInAt: string | null;
  bannedUntil: string | null;
  assignedBusId: string | null;
  isAdmin: boolean;
  isDriver: boolean;
  provider: string;
}

interface AdminSettings {
  service: {
    serviceDays: number[];
    openingTime: string;
    closingTime: string;
    timeZone: string;
  };
  schedule?: ScheduleSettings;
  eta?: {
    minSpeedKmh: number;
    maxSpeedKmh: number;
    staleThresholdSeconds: number;
  };
  map?: {
    tileProvider: 'carto_voyager' | 'pmtiles_r2' | 'osm';
    fallbackToOsm: boolean;
  };
  features?: {
    crowdReportingEnabled: boolean;
    simulationMode: boolean;
    maintenanceMode: boolean;
  };
  geofence?: {
    campusBounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    };
    maxDistanceFromRouteKm: number;
  };
  updatedAt?: string;
}

interface AdminData {
  buses: AdminBus[];
  stops: AdminStop[];
  positions: AdminPosition[];
  reports: AdminReport[];
  reportCount24h: number;
  settings: AdminSettings;
  settingsSource?: string;
  settingsUpdatedAt?: string;
  users: AdminUser[];
  drivers: AdminUser[];
  loadedAt: string;
}

interface AuditLog {
  id: number;
  admin_id: string;
  action: string;
  target_table: string;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface AuditLogResponse {
  logs: AuditLog[];
  totalCount: number;
  limit: number;
  offset: number;
}

interface PositionHistory {
  id: number;
  bus_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  occupancy: Occupancy;
  source_type: string;
  recorded_at: string;
}

interface PositionHistoryResponse {
  history: PositionHistory[];
  totalCount: number;
  limit: number;
  offset: number;
}

interface AdminHealthCheck {
  key: string;
  ok: boolean;
  count: number;
  error: string | null;
}

interface AdminHealth {
  ok: boolean;
  checks: AdminHealthCheck[];
  fleet: {
    active: number;
    unassigned: number;
    unassignedBusIds: string[];
    stale: number;
    staleBusIds: string[];
  };
  generatedAt: string;
}

interface DriverAccessRequest {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  notes: string;
  requested_bus_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  email: string;
}

interface BulkResponse {
  ok: boolean;
  updated: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}

interface ImportResult {
  index: number;
  id?: string;
  status: 'created' | 'updated' | 'failed';
  errors: string[];
}

interface ImportResponse {
  ok: boolean;
  resource: string;
  created: number;
  updated: number;
  failed: number;
  results: ImportResult[];
}

type TransferSource = 'armada' | 'halte' | 'akun';
type AdminRequester = <T>(url: string, init?: RequestInit) => Promise<T>;

interface BusForm {
  id: string;
  name: string;
  plateNumber: string;
  capacity: string;
  isActive: boolean;
  driverId: string;
}

interface StopForm {
  id: string;
  name: string;
  area: string;
  lat: string;
  lng: string;
}

interface DriverForm {
  id: string;
  email: string;
  fullName: string;
  occupancy: Occupancy;
  password: string;
  active: boolean;
}

const TABS: Array<{ id: AdminTab; label: string; icon: typeof Activity }> = [
  { id: 'overview', label: 'Ikhtisar', icon: Activity },
  { id: 'fleet', label: 'Bus', icon: Bus },
  { id: 'drivers', label: 'Supir', icon: Users },
  { id: 'requests', label: 'Izin Supir', icon: UserCheck },
  { id: 'stops', label: 'Halte', icon: MapPin },
  { id: 'reports', label: 'Laporan crowd', icon: FileText },
  { id: 'operations', label: 'Jam & Jadwal', icon: Clock3 },
  { id: 'audit', label: 'Audit Log', icon: FileText },
  { id: 'history', label: 'Riwayat Pergerakan', icon: Clock3 },
];

const PAGE_SIZE = 10;

const DAYS = [
  { id: 1, label: 'Senin' },
  { id: 2, label: 'Selasa' },
  { id: 3, label: 'Rabu' },
  { id: 4, label: 'Kamis' },
  { id: 5, label: 'Jumat' },
  { id: 6, label: 'Sabtu' },
  { id: 7, label: 'Minggu' },
];

const EMPTY_BUS_FORM: BusForm = {
  id: '',
  name: '',
  plateNumber: '',
  capacity: '30',
  isActive: true,
  driverId: '',
};

const EMPTY_STOP_FORM: StopForm = {
  id: '',
  name: '',
  area: '',
  lat: '',
  lng: '',
};

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : 'Permintaan belum berhasil. Coba lagi.';
}

function formatTime(value: string | null): string {
  if (!value) return 'Belum diperiksa';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function formatDate(value: string | null): string {
  if (!value) return 'Belum pernah masuk';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(value));
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Belum tersedia';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Waktu tidak valid';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return 'Tidak ada';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function healthCheckLabel(key: string): string {
  const labels: Record<string, string> = {
    buses: 'Data armada',
    stops: 'Data halte',
    positions: 'Posisi GPS',
    settings: 'Pengaturan',
    driver_requests: 'Permintaan driver',
    driver_sessions: 'Sesi driver',
    realtime: 'Supabase Realtime',
    storage: 'Supabase Storage',
  };
  return labels[key] ?? key;
}

function settingsSourceLabel(source: string | undefined): string {
  if (source === 'database_v2') return 'Database v2';
  if (source === 'database_legacy') return 'Database lama';
  if (source === 'default') return 'Nilai bawaan sistem';
  return 'Tidak diketahui';
}

function formatOccupancy(value: Occupancy): string {
  return value === 'low' ? 'Lega' : value === 'medium' ? 'Sedang' : 'Penuh';
}

function ageLabel(value: string | undefined, now: number): string {
  if (!value) return 'Belum ada GPS';
  const ageSeconds = Math.max(0, Math.floor((now - new Date(value).getTime()) / 1000));
  if (ageSeconds < 45) return `Diperbarui ${ageSeconds} dtk lalu`;
  if (ageSeconds < 3600) return `Data lama, ${Math.floor(ageSeconds / 60)} mnt`;
  return `Data lama, ${formatTime(value)}`;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [data, setData] = useState<AdminData | null>(null);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');
  const [positionError, setPositionError] = useState('');
  const [actionMessage, setActionMessage] = useState<{
    kind: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [accountList, setAccountList] = useState<'users' | 'drivers'>('users');
  const [now, setNow] = useState(Date.now());
  const [lastPositionCheck, setLastPositionCheck] = useState<string | null>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [busEditorOpen, setBusEditorOpen] = useState(false);
  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [busForm, setBusForm] = useState<BusForm>(EMPTY_BUS_FORM);
  const [driverEditorOpen, setDriverEditorOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<DriverForm | null>(null);
  const [editingAccountType, setEditingAccountType] = useState<'user' | 'driver'>('driver');
  const [newDriver, setNewDriver] = useState({ email: '', fullName: '', password: '' });
  const [stopEditorOpen, setStopEditorOpen] = useState(false);
  const [editingStopId, setEditingStopId] = useState<string | null>(null);
  const [stopForm, setStopForm] = useState<StopForm>(EMPTY_STOP_FORM);
  const [qrModalStop, setQrModalStop] = useState<AdminStop | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const qrCacheRef = useRef<Map<string, string>>(new Map());
  const [serviceDays, setServiceDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [openingTime, setOpeningTime] = useState('07:00');
  const [closingTime, setClosingTime] = useState('17:00');
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>(
    DEFAULT_SCHEDULE_SETTINGS
  );
  const [etaSettings, setEtaSettings] = useState(DEFAULT_ETA_SETTINGS);
  const [mapSettings, setMapSettings] = useState(DEFAULT_MAP_SETTINGS);
  const [featureFlags, setFeatureFlags] = useState(DEFAULT_FEATURE_FLAGS);
  const [geofenceSettings, setGeofenceSettings] = useState(DEFAULT_GEOFENCE_SETTINGS);
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [driverRequests, setDriverRequests] = useState<DriverAccessRequest[]>([]);
  const [driverRequestsLoading, setDriverRequestsLoading] = useState(false);
  const [driverRequestsError, setDriverRequestsError] = useState('');
  const [driverRequestBuses, setDriverRequestBuses] = useState<Record<string, string>>({});
  const [fleetSearch, setFleetSearch] = useState('');
  const [fleetStatus, setFleetStatus] = useState('all');
  const [fleetSort, setFleetSort] = useState('id-asc');
  const [fleetPage, setFleetPage] = useState(1);
  const [selectedFleetIds, setSelectedFleetIds] = useState<Set<string>>(new Set());
  const [accountSearch, setAccountSearch] = useState('');
  const [accountStatus, setAccountStatus] = useState('all');
  const [accountSort, setAccountSort] = useState('name-asc');
  const [accountPage, setAccountPage] = useState(1);
  const [selectedAccountIds, setSelectedAccountIds] = useState<Set<string>>(new Set());
  const [reportSearch, setReportSearch] = useState('');
  const [reportOccupancy, setReportOccupancy] = useState('all');
  const [reportSort, setReportSort] = useState('newest');
  const [reportPage, setReportPage] = useState(1);
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string>>(new Set());

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditOffset, setAuditOffset] = useState(0);
  const [auditLimit] = useState(50);
  const [auditFilters, setAuditFilters] = useState({
    action: '',
    targetTable: '',
    targetId: '',
    adminId: '',
    since: '',
  });

  // History state
  const [positionHistory, setPositionHistory] = useState<PositionHistory[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyTotalCount, setHistoryTotalCount] = useState(0);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyLimit] = useState(100);
  const [historyFilters, setHistoryFilters] = useState({
    busId: '',
    sourceType: '',
    since: '',
    until: '',
  });

  const requestAdmin = useCallback(
    async <T,>(url: string, init: RequestInit = {}): Promise<T> => {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();
      if (sessionError) throw new Error(`Sesi admin tidak dapat dibaca: ${sessionError.message}`);
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error('Sesi admin sudah berakhir. Masuk kembali.');

      const headers = new Headers(init.headers);
      headers.set('Authorization', `Bearer ${accessToken}`);
      if (init.body) headers.set('Content-Type', 'application/json');
      const response = await fetch(`/linusku${url}`, { ...init, headers });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const errorMessage =
          payload && typeof payload === 'object' && 'error' in payload &&
          typeof payload.error === 'string'
            ? payload.error
            : `Permintaan gagal dengan status ${response.status}.`;
        throw new Error(errorMessage);
      }
      return payload as T;
    },
    []
  );

  const loadSummary = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    setDataLoading(true);
    setDataError('');
    try {
      const payload = await requestAdmin<AdminData>('/api/admin');
      setData(payload);
      setSummaryLoaded(true);
      return true;
    } catch (error) {
      setDataError(messageFromError(error));
      return false;
    } finally {
      setDataLoading(false);
    }
  }, [requestAdmin, session]);

  const loadHealth = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    setHealthLoading(true);
    setHealthError('');
    try {
      const payload = await requestAdmin<AdminHealth>('/api/admin/health');
      setHealth(payload);
      return true;
    } catch (error) {
      setHealthError(messageFromError(error));
      return false;
    } finally {
      setHealthLoading(false);
    }
  }, [requestAdmin, session]);

  const loadDriverRequests = useCallback(async (): Promise<boolean> => {
    if (!session) return false;
    setDriverRequestsLoading(true);
    setDriverRequestsError('');
    try {
      const payload = await requestAdmin<{ requests: DriverAccessRequest[] }>(
        '/api/admin/driver-requests'
      );
      setDriverRequests(payload.requests);
      setDriverRequestBuses((current) => {
        const next = { ...current };
        for (const item of payload.requests) {
          if (!next[item.id] && item.requested_bus_id) next[item.id] = item.requested_bus_id;
        }
        return next;
      });
      return true;
    } catch (error) {
      setDriverRequestsError(messageFromError(error));
      return false;
    } finally {
      setDriverRequestsLoading(false);
    }
  }, [requestAdmin, session]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Supabase belum dikonfigurasi untuk login admin.');
      setAuthLoading(false);
      return;
    }

    const fallbackTimer = setTimeout(() => {
      setAuthLoading(false);
    }, 3500);

    supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        clearTimeout(fallbackTimer);
        if (error) setAuthError(`Sesi login tidak dapat dimuat: ${error.message}`);
        setSession(sessionData?.session ?? null);
        setAuthLoading(false);
      })
      .catch((err) => {
        clearTimeout(fallbackTimer);
        setAuthError(err instanceof Error ? err.message : 'Gagal memeriksa sesi.');
        setAuthLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthError('');
      }
    );
    return () => {
      clearTimeout(fallbackTimer);
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((tab) => tab.id === queryTab)) {
      setActiveTab(queryTab as AdminTab);
    }
    const handlePopState = () => {
      const nextTab = new URLSearchParams(window.location.search).get('tab');
      if (TABS.some((tab) => tab.id === nextTab)) {
        setActiveTab(nextTab as AdminTab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    setData(null);
    setSummaryLoaded(false);
    if (session) void loadSummary();
  }, [loadSummary, session]);

  useEffect(() => {
    if (!summaryLoaded) return;
    void loadHealth();
    void loadDriverRequests();
  }, [summaryLoaded, loadHealth, loadDriverRequests]);

  useEffect(() => {
    if (!data?.settings) return;
    if (data.settings.service) {
      setServiceDays([1, 2, 3, 4, 5]);
      setOpeningTime('07:00');
      setClosingTime('17:00');
    }
    setScheduleSettings(data.settings.schedule ?? DEFAULT_SCHEDULE_SETTINGS);
    setEtaSettings(data.settings.eta ?? DEFAULT_ETA_SETTINGS);
    setMapSettings(data.settings.map ?? DEFAULT_MAP_SETTINGS);
    setFeatureFlags(data.settings.features ?? DEFAULT_FEATURE_FLAGS);
    setGeofenceSettings(data.settings.geofence ?? DEFAULT_GEOFENCE_SETTINGS);
  }, [data?.loadedAt, data?.settings]);

  useEffect(() => {
    if (!summaryLoaded) return;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const payload = await requestAdmin<{
          buses: Array<AdminBus & { position: Omit<AdminPosition, 'bus_id'> | null }>;
          checkedAt: string;
        }>('/api/admin/positions');
        if (!active) return;
        const nextPositions = payload.buses.flatMap((bus) =>
          bus.position ? [{ ...bus.position, bus_id: bus.id }] : []
        );
        setData((current) =>
          current ? { ...current, positions: nextPositions } : current
        );
        setLastPositionCheck(payload.checkedAt);
        setPositionError('');
        setNow(Date.now()); // Only update now when tab is visible and refresh runs
      } catch (error) {
        if (active) setPositionError(messageFromError(error));
      }
    };
    void refresh();
    const timer = window.setInterval(() => {
      // Only run refresh when tab is visible; refresh() handles visibility check and updates now
      void refresh();
    }, 10000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [summaryLoaded, requestAdmin]);

  // Load audit logs
  const loadAuditLogs = useCallback(async (requestedOffset = auditOffset) => {
    if (!session) return;
    setAuditLoading(true);
    setAuditError('');
    try {
      const params = new URLSearchParams({
        limit: String(auditLimit),
        offset: String(requestedOffset),
      });
      if (auditFilters.action) params.set('action', auditFilters.action);
      if (auditFilters.targetTable) params.set('targetTable', auditFilters.targetTable);
      if (auditFilters.targetId) params.set('targetId', auditFilters.targetId);
      if (auditFilters.adminId) params.set('adminId', auditFilters.adminId);
      if (auditFilters.since) params.set('since', auditFilters.since);

      const payload = await requestAdmin<AuditLogResponse>(`/api/admin/audit?${params.toString()}`);
      setAuditLogs(payload.logs);
      setAuditTotalCount(payload.totalCount);
    } catch (error) {
      setAuditError(messageFromError(error));
    } finally {
      setAuditLoading(false);
    }
  }, [session, requestAdmin, auditLimit, auditOffset, auditFilters]);

  // Load position history
  const loadPositionHistory = useCallback(async (requestedOffset = historyOffset) => {
    if (!session) return;
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const params = new URLSearchParams({
        limit: String(historyLimit),
        offset: String(requestedOffset),
      });
      if (historyFilters.busId) params.set('busId', historyFilters.busId);
      if (historyFilters.sourceType) params.set('sourceType', historyFilters.sourceType);
      if (historyFilters.since) params.set('since', historyFilters.since);
      if (historyFilters.until) params.set('until', historyFilters.until);

      const payload = await requestAdmin<PositionHistoryResponse>(`/api/admin/history?${params.toString()}`);
      setPositionHistory(payload.history);
      setHistoryTotalCount(payload.totalCount);
    } catch (error) {
      setHistoryError(messageFromError(error));
    } finally {
      setHistoryLoading(false);
    }
  }, [session, requestAdmin, historyLimit, historyOffset, historyFilters]);

  // Load audit logs when tab is active
  useEffect(() => {
    if (activeTab === 'audit') {
      void loadAuditLogs();
    }
  }, [activeTab, loadAuditLogs]);

  // Load history when tab is active
  useEffect(() => {
    if (activeTab === 'history') {
      void loadPositionHistory();
    }
  }, [activeTab, loadPositionHistory]);

  const positionsByBus = useMemo(
    () => new Map((data?.positions ?? []).map((position) => [position.bus_id, position])),
    [data?.positions]
  );

  const staleThresholdSeconds =
    data?.settings.eta?.staleThresholdSeconds ?? DEFAULT_ETA_SETTINGS.staleThresholdSeconds;

  const dynamicStaleBusIds = useMemo(() => {
    const stale = new Set<string>();
    for (const bus of data?.buses ?? []) {
      if (!bus.is_active) continue;
      const position = positionsByBus.get(bus.id);
      if (!position || now - new Date(position.updated_at).getTime() > staleThresholdSeconds * 1000) {
        stale.add(bus.id);
      }
    }
    return stale;
  }, [data?.buses, now, positionsByBus, staleThresholdSeconds]);

  const filteredFleet = useMemo(() => {
    const query = fleetSearch.trim().toLocaleLowerCase('id-ID');
    const rows = (data?.buses ?? []).filter((bus) => {
      const matchesQuery =
        !query ||
        bus.id.toLocaleLowerCase('id-ID').includes(query) ||
        bus.name.toLocaleLowerCase('id-ID').includes(query) ||
        (bus.plate_number ?? '').toLocaleLowerCase('id-ID').includes(query);
      const matchesStatus =
        fleetStatus === 'all' ||
        (fleetStatus === 'active' && bus.is_active) ||
        (fleetStatus === 'inactive' && !bus.is_active) ||
        (fleetStatus === 'stale' && dynamicStaleBusIds.has(bus.id)) ||
        (fleetStatus === 'unassigned' && !bus.driver_id);
      return matchesQuery && matchesStatus;
    });
    return rows.sort((left, right) => {
      if (fleetSort === 'id-desc') return right.id.localeCompare(left.id, 'id-ID');
      if (fleetSort === 'name-asc') return left.name.localeCompare(right.name, 'id-ID');
      if (fleetSort === 'name-desc') return right.name.localeCompare(left.name, 'id-ID');
      if (fleetSort === 'status-asc') {
        return Number(left.is_active) - Number(right.is_active) || left.id.localeCompare(right.id, 'id-ID');
      }
      return left.id.localeCompare(right.id, 'id-ID');
    });
  }, [data?.buses, dynamicStaleBusIds, fleetSearch, fleetSort, fleetStatus]);

  const accountRows = useMemo(
    () => (accountList === 'users' ? (data?.users ?? []) : (data?.drivers ?? [])),
    [accountList, data?.drivers, data?.users],
  );
  const pendingDriverRequests = driverRequests.filter((item) => item.status === 'pending');
  const filteredAccounts = useMemo(() => {
    const query = accountSearch.trim().toLocaleLowerCase('id-ID');
    const rows = accountRows.filter((user) => {
      const isActive = !user.bannedUntil || new Date(user.bannedUntil).getTime() <= now;
      const matchesQuery =
        !query ||
        user.fullName.toLocaleLowerCase('id-ID').includes(query) ||
        user.email.toLocaleLowerCase('id-ID').includes(query) ||
        (user.assignedBusId ?? '').toLocaleLowerCase('id-ID').includes(query);
      const matchesStatus =
        accountStatus === 'all' ||
        (accountStatus === 'active' && isActive) ||
        (accountStatus === 'inactive' && !isActive);
      return matchesQuery && matchesStatus;
    });
    return rows.sort((left, right) => {
      if (accountSort === 'name-desc') {
        return (right.fullName || right.email).localeCompare(left.fullName || left.email, 'id-ID');
      }
      if (accountSort === 'last-login-desc') {
        return (
          new Date(right.lastSignInAt ?? 0).getTime() -
          new Date(left.lastSignInAt ?? 0).getTime()
        );
      }
      if (accountSort === 'status-asc') {
        const leftActive = !left.bannedUntil || new Date(left.bannedUntil).getTime() <= now;
        const rightActive = !right.bannedUntil || new Date(right.bannedUntil).getTime() <= now;
        return Number(leftActive) - Number(rightActive);
      }
      return (left.fullName || left.email).localeCompare(right.fullName || right.email, 'id-ID');
    });
  }, [accountRows, accountSearch, accountSort, accountStatus, now]);

  const filteredReports = useMemo(() => {
    const query = reportSearch.trim().toLocaleLowerCase('id-ID');
    const rows = (data?.reports ?? []).filter((report) => {
      const matchesQuery =
        !query ||
        report.id.toLocaleLowerCase('id-ID').includes(query) ||
        (report.bus_id ?? '').toLocaleLowerCase('id-ID').includes(query) ||
        (report.stop_id ?? '').toLocaleLowerCase('id-ID').includes(query);
      const matchesOccupancy =
        reportOccupancy === 'all' || report.occupancy === reportOccupancy;
      return matchesQuery && matchesOccupancy;
    });
    return rows.sort((left, right) => {
      const difference =
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
      return reportSort === 'oldest' ? -difference : difference;
    });
  }, [data?.reports, reportOccupancy, reportSearch, reportSort]);

  const fleetPageCount = Math.max(1, Math.ceil(filteredFleet.length / PAGE_SIZE));
  const currentFleetPage = Math.min(fleetPage, fleetPageCount);
  const fleetPageRows = filteredFleet.slice(
    (currentFleetPage - 1) * PAGE_SIZE,
    currentFleetPage * PAGE_SIZE
  );
  const accountPageCount = Math.max(1, Math.ceil(filteredAccounts.length / PAGE_SIZE));
  const currentAccountPage = Math.min(accountPage, accountPageCount);
  const accountPageRows = filteredAccounts.slice(
    (currentAccountPage - 1) * PAGE_SIZE,
    currentAccountPage * PAGE_SIZE
  );
  const replayHistory = useMemo(
    () => positionHistory.filter((item) => item.bus_id === historyFilters.busId),
    [historyFilters.busId, positionHistory]
  );
  const reportPageCount = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE));
  const currentReportPage = Math.min(reportPage, reportPageCount);
  const reportPageRows = filteredReports.slice(
    (currentReportPage - 1) * PAGE_SIZE,
    currentReportPage * PAGE_SIZE
  );

  const selectTab = (tab: AdminTab) => {
    if (activeTab === tab) return;
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState(null, '', url);
  };

  const mutate = async (
    url: string,
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body: unknown,
    successMessage: string
  ): Promise<boolean> => {
    setSaving(true);
    setActionMessage(null);
    try {
      await requestAdmin(url, {
        method,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch (error) {
      setActionMessage({ kind: 'error', text: messageFromError(error) });
      return false;
    } finally {
      setSaving(false);
    }

    const refreshed = await loadSummary();
    setActionMessage({
      kind: refreshed ? 'success' : 'warning',
      text: refreshed
        ? successMessage
        : `${successMessage} Perubahan tersimpan, tetapi data layar gagal dimuat ulang.`,
    });
    return true;
  };

  const toggleSelected = (
    setter: Dispatch<SetStateAction<Set<string>>>,
    id: string
  ) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBulkAction = async (
    resource: 'armada' | 'akun' | 'laporan',
    action: 'activate' | 'deactivate' | 'make_driver' | 'make_user' | 'delete',
    ids: string[]
  ) => {
    if (!ids.length) return;
    const labels: Record<typeof action, string> = {
      activate: 'Aktifkan',
      deactivate: 'Nonaktifkan',
      make_driver: 'Jadikan driver',
      make_user: 'Jadikan pengguna',
      delete: 'Hapus',
    };
    if (
      action === 'deactivate' &&
      !window.confirm(`Nonaktifkan ${ids.length} akun terpilih? Akun tidak dapat masuk sampai diaktifkan kembali.`)
    ) {
      return;
    }
    if (
      action === 'make_user' &&
      !window.confirm(`Ubah ${ids.length} akun driver menjadi pengguna?`)
    ) {
      return;
    }
    if (
      action === 'delete' &&
      !window.confirm(`Hapus ${ids.length} laporan terpilih? Tindakan ini tidak dapat dibatalkan.`)
    ) {
      return;
    }

    setSaving(true);
    setActionMessage(null);
    try {
      const payload = await requestAdmin<BulkResponse>('/api/admin/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ resource, action, ids }),
      });
      const refreshed = await loadSummary();
      const detail = payload.errors
        .slice(0, 2)
        .map((item) => `${item.id}: ${item.error}`)
        .join('; ');
      setActionMessage({
        kind: payload.failed > 0 || !refreshed ? 'warning' : 'success',
        text:
          payload.failed > 0
            ? `${payload.updated} berhasil, ${payload.failed} gagal. ${detail}`
            : refreshed
              ? `${payload.updated} data berhasil ${labels[action].toLocaleLowerCase('id-ID')}.`
              : `Operasi tersimpan, tetapi data layar gagal dimuat ulang.`,
      });
      if (payload.updated > 0) {
        if (resource === 'armada') setSelectedFleetIds(new Set());
        if (resource === 'akun') setSelectedAccountIds(new Set());
        if (resource === 'laporan') setSelectedReportIds(new Set());
      }
    } catch (error) {
      setActionMessage({ kind: 'error', text: messageFromError(error) });
    } finally {
      setSaving(false);
    }
  };

  const reviewDriverRequest = async (
    item: DriverAccessRequest,
    decision: 'approve' | 'reject'
  ) => {
    if (
      decision === 'reject' &&
      !window.confirm(`Tolak permintaan driver ${item.full_name || item.email}?`)
    ) {
      return;
    }
    setSaving(true);
    setActionMessage(null);
    try {
      await requestAdmin('/api/admin/driver-requests', {
        method: 'PATCH',
        body: JSON.stringify({
          requestId: item.id,
          decision,
          busId: driverRequestBuses[item.id] ?? '',
        }),
      });
    } catch (error) {
      setActionMessage({ kind: 'error', text: messageFromError(error) });
      return false;
    } finally {
      setSaving(false);
    }

    const [summaryRefreshed, requestsRefreshed] = await Promise.all([
      loadSummary(),
      loadDriverRequests(),
    ]);
    setActionMessage({
      kind: summaryRefreshed && requestsRefreshed ? 'success' : 'warning',
      text:
        summaryRefreshed && requestsRefreshed
          ? decision === 'approve'
            ? 'Permintaan driver disetujui.'
            : 'Permintaan driver ditolak.'
          : 'Keputusan tersimpan, tetapi data layar gagal dimuat ulang.',
    });
    return true;
  };

  const handleImported = async (result: ImportResponse): Promise<boolean> => {
    const refreshed = await loadSummary();
    const summary = `${result.created} dibuat, ${result.updated} diperbarui, ${result.failed} gagal.`;
    setActionMessage({
      kind: result.failed > 0 || !refreshed ? 'warning' : 'success',
      text: !refreshed
        ? `${summary} Data tersimpan, tetapi data layar gagal dimuat ulang.`
        : summary,
    });
    return refreshed;
  };

  const signInWithPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Supabase belum dikonfigurasi untuk login admin.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');
    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });
    setAuthLoading(false);
    if (error) setAuthError(`Login gagal: ${error.message}`);
  };

  const signInWithGoogle = async () => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setAuthError('Supabase belum dikonfigurasi untuk login admin.');
      return;
    }
    setAuthLoading(true);
    setAuthError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/linusku/admin`,
          queryParams: { prompt: 'select_account' },
        },
      });

      if (error) {
        setAuthError(`Login Google gagal: ${error.message}`);
        setAuthLoading(false);
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal membuka login Google.');
      setAuthLoading(false);
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    const { error } = (await supabase?.auth.signOut()) ?? { error: null };
    if (error) setAuthError(`Keluar gagal: ${error.message}`);
  };

  const openNewBusForm = () => {
    setEditingBusId(null);
    setBusForm(EMPTY_BUS_FORM);
    setBusEditorOpen(true);
  };

  const openBusForm = (bus: AdminBus) => {
    setEditingBusId(bus.id);
    setBusForm({
      id: bus.id,
      name: bus.name,
      plateNumber: bus.plate_number ?? '',
      capacity: String(bus.capacity),
      isActive: bus.is_active,
      driverId: bus.driver_id ?? '',
    });
    setBusEditorOpen(true);
  };

  const submitBus = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await mutate(
      '/api/admin/buses',
      editingBusId ? 'PATCH' : 'POST',
      {
        ...busForm,
        id: busForm.id.trim().toUpperCase(),
        capacity: Number(busForm.capacity),
        driverId: busForm.driverId || null,
      },
      editingBusId ? 'Data armada diperbarui.' : 'Armada ditambahkan.'
    );
    if (saved) {
      setBusEditorOpen(false);
      setBusForm(EMPTY_BUS_FORM);
    }
  };

  const submitNewDriver = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await mutate(
      '/api/admin/users',
      'POST',
      newDriver,
      'Akun driver dibuat. Tetapkan bus dari bagian Armada.'
    );
    if (saved) {
      setNewDriver({ email: '', fullName: '', password: '' });
      setDriverEditorOpen(false);
    }
  };

  const changeAccountType = async (
    user: AdminUser,
    accountType: 'user' | 'driver'
  ) => {
    const saved = await mutate(
      '/api/admin/users/role',
      'PATCH',
      {
        id: user.id,
        accountType,
      },
      accountType === 'driver'
        ? 'Akun dipindahkan ke daftar driver. Tetapkan armada dari bagian Armada.'
        : 'Akun dipindahkan ke daftar pengguna.'
    );
    if (saved) setEditingDriver(null);
  };

  const submitDriverEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingDriver) return;
    const currentUser = [...(data?.users ?? []), ...(data?.drivers ?? [])].find(
      (user) => user.id === editingDriver.id
    );
    const currentlyActive =
      !currentUser?.bannedUntil || new Date(currentUser.bannedUntil).getTime() <= now;
    if (
      currentlyActive &&
      !editingDriver.active &&
      !window.confirm(`Nonaktifkan akun ${currentUser?.email ?? editingDriver.email}?`)
    ) {
      return;
    }
    const saved = await mutate(
      '/api/admin/users',
      'PATCH',
      {
        id: editingDriver.id,
        email: editingDriver.email,
        fullName: editingDriver.fullName,
        occupancy: editingDriver.occupancy,
        password: editingDriver.password || undefined,
        active: editingDriver.active,
      },
      'Akun driver diperbarui.'
    );
    if (saved) {
      setEditingDriver(null);
    }
  };

  const openDriverEditor = (user: AdminUser) => {
    setEditingDriver({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      occupancy: user.occupancy,
      password: '',
      active: !user.bannedUntil || new Date(user.bannedUntil).getTime() <= now,
    });
    setEditingAccountType('driver');
  };

  const submitStop = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const saved = await mutate(
      '/api/admin/stops',
      editingStopId ? 'PATCH' : 'POST',
      {
        ...stopForm,
        id: stopForm.id.trim().toLowerCase(),
        lat: Number(stopForm.lat),
        lng: Number(stopForm.lng),
      },
      editingStopId ? 'Data halte diperbarui.' : 'Halte ditambahkan.'
    );
    if (saved) {
      setStopEditorOpen(false);
      setEditingStopId(null);
      setStopForm(EMPTY_STOP_FORM);
    }
  };

  const reorderStop = async (index: number, direction: -1 | 1) => {
    if (!data) return;
    const stops = [...data.stops];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= stops.length) return;
    [stops[index], stops[targetIndex]] = [stops[targetIndex], stops[index]];
    await mutate(
      '/api/admin/stops/reorder',
      'POST',
      { ids: stops.map((stop) => stop.id) },
      'Urutan halte dan rute diperbarui.'
    );
  };

  const deleteStop = async (stop: AdminStop) => {
    const typedId = window.prompt(`Ketik ${stop.id} untuk menghapus halte ini.`);
    if (typedId !== stop.id) return;
    await mutate(
      `/api/admin/stops?id=${encodeURIComponent(stop.id)}`,
      'DELETE',
      undefined,
      'Halte dihapus.'
    );
  };

  const deleteBus = async (bus: AdminBus) => {
    const typedId = window.prompt(`Ketik ${bus.id} untuk menghapus armada beserta posisi GPS-nya.`);
    if (typedId !== bus.id) return;
    await mutate(
      `/api/admin/buses?id=${encodeURIComponent(bus.id)}`,
      'DELETE',
      undefined,
      'Armada dihapus. Posisi GPS terkait juga dihapus.'
    );
  };

  const deleteReport = async (report: AdminReport) => {
    const typedId = window.prompt(`Ketik ID laporan ${report.id} untuk menghapusnya.`);
    if (typedId !== report.id) return;
    await mutate(
      `/api/admin/reports?id=${encodeURIComponent(report.id)}`,
      'DELETE',
      undefined,
      'Laporan dihapus.'
    );
  };

  const submitSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (serviceDays.length === 0) {
      setActionMessage({
        kind: 'error',
        text: 'Pilih setidaknya satu hari layanan.',
      });
      return;
    }
    if (scheduleSettings.firstDepartureTime >= scheduleSettings.lastDepartureTime) {
      setActionMessage({
        kind: 'error',
        text: 'Keberangkatan pertama harus lebih awal dari keberangkatan terakhir.',
      });
      return;
    }
    await mutate(
      '/api/admin/settings',
      'PUT',
      {
        service: {
          serviceDays: [1, 2, 3, 4, 5],
          openingTime: '07:00',
          closingTime: '17:00',
          timeZone: 'Asia/Jakarta',
        },
        schedule: scheduleSettings,
        eta: etaSettings,
        map: mapSettings,
        features: featureFlags,
        geofence: geofenceSettings,
      },
      'Pengaturan operasional disimpan.'
    );
  };

  const toggleDay = (day: number) => {
    setServiceDays((current) =>
      current.includes(day)
        ? current.filter((value) => value !== day)
        : [...current, day].sort((a, b) => a - b)
    );
  };

  const startEditingStop = (stop: AdminStop) => {
    setEditingStopId(stop.id);
    setStopForm({
      id: stop.id,
      name: stop.name,
      area: stop.area,
      lat: String(stop.lat),
      lng: String(stop.lng),
    });
    setStopEditorOpen(true);
  };

  const stopCreation = () => {
    setEditingStopId(null);
    setStopForm(EMPTY_STOP_FORM);
    setStopEditorOpen(true);
  };

  const handleShowQr = async (stop: AdminStop) => {
    setQrModalStop(stop);
    setQrDataUrl('');
    try {
      // Use current origin; no hardcoded fallback — QR codes must point to actual deployment
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : '';
      if (!origin) {
        throw new Error('Tidak dapat menentukan origin halaman untuk QR code.');
      }
      const cacheKey = `${origin}/?stop=${encodeURIComponent(stop.id)}`;
      const cached = qrCacheRef.current.get(cacheKey);
      if (cached) {
        setQrDataUrl(cached);
        return;
      }
      const stopUrl = cacheKey;
      const url = await QRCode.toDataURL(stopUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      qrCacheRef.current.set(cacheKey, url);
      setQrDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  const renderBusForm = () => (
    <form className="admin-form" onSubmit={submitBus}>
      <div className="admin-form-heading">
        <h2>{editingBusId ? `Ubah ${editingBusId}` : 'Tambah armada'}</h2>
        <button
          type="button"
          className="admin-button admin-button--quiet"
          onClick={() => setBusEditorOpen(false)}
        >
          Tutup
        </button>
      </div>
      <div className="admin-fields admin-fields--three">
        <label className="admin-field">
          ID armada
          <input
            name="bus-id"
            autoComplete="off"
            value={busForm.id}
            disabled={Boolean(editingBusId)}
            placeholder="LINUS-04"
            onChange={(event) => setBusForm({ ...busForm, id: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Nama armada
          <input
            name="bus-name"
            autoComplete="organization"
            value={busForm.name}
            onChange={(event) => setBusForm({ ...busForm, name: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Nomor kendaraan
          <input
            name="plate-number"
            autoComplete="off"
            value={busForm.plateNumber}
            onChange={(event) =>
              setBusForm({ ...busForm, plateNumber: event.target.value })
            }
          />
        </label>
        <label className="admin-field">
          Kapasitas kursi
          <input
            name="capacity"
            type="number"
            min="1"
            max="100"
            value={busForm.capacity}
            onChange={(event) =>
              setBusForm({ ...busForm, capacity: event.target.value })
            }
            required
          />
        </label>
        <label className="admin-field">
          Driver yang ditugaskan
          <select
            name="driver"
            value={busForm.driverId}
            onChange={(event) => setBusForm({ ...busForm, driverId: event.target.value })}
          >
            <option value="">Belum ditugaskan</option>
            {(data?.drivers ?? [])
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.fullName || user.email}
                </option>
              ))}
          </select>
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={busForm.isActive}
            onChange={(event) =>
              setBusForm({ ...busForm, isActive: event.target.checked })
            }
          />
          Armada aktif
        </label>
      </div>
      <button className="admin-button admin-button--primary" type="submit" disabled={saving}>
        {saving ? 'Menyimpan…' : editingBusId ? 'Simpan perubahan' : 'Tambah armada'}
      </button>
    </form>
  );

  const renderDriverForm = () => (
    <form className="admin-form" onSubmit={submitNewDriver}>
      <div className="admin-form-heading">
        <h2>Buat akun driver</h2>
        <button
          type="button"
          className="admin-button admin-button--quiet"
          onClick={() => setDriverEditorOpen(false)}
        >
          Tutup
        </button>
      </div>
      <div className="admin-fields admin-fields--three">
        <label className="admin-field">
          Nama lengkap
          <input
            name="full-name"
            autoComplete="name"
            value={newDriver.fullName}
            onChange={(event) =>
              setNewDriver({ ...newDriver, fullName: event.target.value })
            }
            required
          />
        </label>
        <label className="admin-field">
          Email driver
          <input
            name="driver-email"
            type="email"
            autoComplete="email"
            value={newDriver.email}
            onChange={(event) =>
              setNewDriver({ ...newDriver, email: event.target.value })
            }
            required
          />
        </label>
        <label className="admin-field">
          Password awal
          <input
            name="driver-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            value={newDriver.password}
            onChange={(event) =>
              setNewDriver({ ...newDriver, password: event.target.value })
            }
            required
          />
        </label>
      </div>
      <p className="admin-help">
        Password hanya disimpan oleh Supabase Auth dan tidak dapat dibaca kembali dari panel.
      </p>
      <button className="admin-button admin-button--primary" type="submit" disabled={saving}>
        {saving ? 'Membuat akun…' : 'Buat akun driver'}
      </button>
    </form>
  );

  const renderDriverEditForm = () =>
    editingDriver && (
      <form className="admin-form" onSubmit={submitDriverEdit}>
        <div className="admin-form-heading">
          <h2>Ubah akun driver</h2>
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => setEditingDriver(null)}
          >
            Tutup
          </button>
        </div>
        <div className="admin-fields admin-fields--three">
          <label className="admin-field">
            Nama lengkap
            <input
              name="edit-full-name"
              autoComplete="name"
              value={editingDriver.fullName}
              onChange={(event) =>
                setEditingDriver({ ...editingDriver, fullName: event.target.value })
              }
              required
            />
          </label>
          <label className="admin-field">
            Email
            <input
              name="edit-email"
              type="email"
              autoComplete="email"
              value={editingDriver.email}
              onChange={(event) =>
                setEditingDriver({ ...editingDriver, email: event.target.value })
              }
              required
            />
          </label>
          {editingAccountType === 'driver' && (
            <label className="admin-field">
              Status kepadatan driver
              <select
                value={editingDriver.occupancy}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === 'low' || value === 'medium' || value === 'full') {
                    setEditingDriver({ ...editingDriver, occupancy: value });
                  }
                }}
              >
                <option value="low">Lega</option>
                <option value="medium">Sedang</option>
                <option value="full">Penuh</option>
              </select>
            </label>
          )}
          <label className="admin-field">
            Password baru
            <input
              name="edit-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={editingDriver.password}
              onChange={(event) =>
                setEditingDriver({ ...editingDriver, password: event.target.value })
              }
            />
            <small className="admin-field-help">Kosongkan bila password tidak diganti.</small>
          </label>
        </div>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={editingDriver.active}
            onChange={(event) =>
              setEditingDriver({ ...editingDriver, active: event.target.checked })
            }
          />
          Akun dapat masuk
        </label>
        <button className="admin-button admin-button--primary" type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Simpan akun'}
        </button>
      </form>
    );

  const renderStopForm = () => (
    <form className="admin-form" onSubmit={submitStop}>
      <div className="admin-form-heading">
        <h2>{editingStopId ? `Ubah halte ${editingStopId}` : 'Tambah halte'}</h2>
        <button
          type="button"
          className="admin-button admin-button--quiet"
          onClick={() => setStopEditorOpen(false)}
        >
          Tutup
        </button>
      </div>
      <div className="admin-fields admin-fields--three">
        <label className="admin-field">
          ID halte
          <input
            name="stop-id"
            autoComplete="off"
            value={stopForm.id}
            disabled={Boolean(editingStopId)}
            placeholder="halte-nama"
            onChange={(event) => setStopForm({ ...stopForm, id: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Nama halte
          <input
            name="stop-name"
            value={stopForm.name}
            onChange={(event) => setStopForm({ ...stopForm, name: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Area atau jalan
          <input
            name="stop-area"
            value={stopForm.area}
            onChange={(event) => setStopForm({ ...stopForm, area: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Latitude
          <input
            name="stop-lat"
            type="number"
            step="any"
            inputMode="decimal"
            value={stopForm.lat}
            onChange={(event) => setStopForm({ ...stopForm, lat: event.target.value })}
            required
          />
        </label>
        <label className="admin-field">
          Longitude
          <input
            name="stop-lng"
            type="number"
            step="any"
            inputMode="decimal"
            value={stopForm.lng}
            onChange={(event) => setStopForm({ ...stopForm, lng: event.target.value })}
            required
          />
        </label>
      </div>
      <p className="admin-help">
        Koordinat harus berada di area Kampus USU. Urutan halte membentuk rute putar.
      </p>
      <button className="admin-button admin-button--primary" type="submit" disabled={saving}>
        {saving ? 'Menyimpan…' : editingStopId ? 'Simpan perubahan' : 'Tambah halte'}
      </button>
    </form>
  );

  if (authLoading) {
    return (
      <main className="admin-login-shell">
        <section className="admin-login" aria-busy="true">
          <p>Memeriksa sesi LINUSKU…</p>
        </section>
      </main>
    );
  }

  if (session && !data && dataLoading) {
    return (
      <main className="admin-shell">
        <div className="admin-main">
          <div className="admin-page-heading">
            <div>
              <h1>Panel operasional</h1>
              <p>Memuat data armada dan layanan LINUSKU…</p>
            </div>
          </div>
          <section className="admin-workspace" aria-busy="true">
            <div className="admin-section-heading">
              <div>
                <h2>Memuat status armada</h2>
                <p>Data akan muncul setelah layanan admin terverifikasi.</p>
              </div>
            </div>
            <div className="admin-skeleton-table" aria-hidden="true">
              {Array.from({ length: 5 }, (_, index) => (
                <div className="admin-skeleton-row" key={index}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (!session || !data) {
    const isAuthenticated = Boolean(session);
    return (
      <main className="admin-login-shell">
        <section className="admin-login">
          <a className="admin-brand" href="/linusku">
            <span>LINUSKU <small>Pengelolaan operasional</small></span>
          </a>
          <h1>
            {isAuthenticated
              ? dataLoading
                ? 'Memuat panel admin…'
                : dataError.includes('tidak memiliki akses admin')
                  ? 'Akun ini bukan admin'
                  : 'Panel admin belum tersedia'
              : 'Masuk ke panel admin'}
          </h1>
          <p
            className="admin-login-copy"
            role={isAuthenticated && dataError ? 'alert' : undefined}
          >
            {isAuthenticated
              ? (
                <>
                  {dataError || 'Akun ini sudah masuk, tetapi belum ditetapkan sebagai pengelola LINUSKU.'}
                  {session?.user.email && (
                    <>
                      <br />
                      Akun yang aktif: <strong>{session.user.email}</strong>. Pilih akun admin yang benar.
                    </>
                  )}
                </>
              )
              : 'Masuk memakai akun pengelola yang sudah diizinkan oleh tim LINUSKU.'}
          </p>
          {!isAuthenticated && (
            <>
              <button
                type="button"
                className="admin-button admin-button--primary admin-login-google"
                onClick={signInWithGoogle}
                disabled={!isSupabaseConfigured || authLoading}
                aria-busy={authLoading}
              >
                <ShieldCheck size={17} aria-hidden="true" />
                {authLoading ? 'Membuka Google…' : 'Masuk dengan Google'}
              </button>
              <div className="admin-divider"><span>atau email</span></div>
              <form className="admin-login-form" onSubmit={signInWithPassword}>
                <label className="admin-field">
                  Email admin
                  <input
                    name="admin-email"
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                  />
                </label>
                <label className="admin-field">
                  Password
                  <input
                    name="admin-password"
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="admin-button admin-button--quiet"
                  disabled={!isSupabaseConfigured || authLoading}
                  aria-busy={authLoading}
                >
                  Masuk dengan email
                </button>
              </form>
            </>
          )}
          {authError && <p className="admin-message admin-message--error" role="alert">{authError}</p>}
          {isAuthenticated && (
            <div className="admin-login-actions">
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={signInWithGoogle}
                disabled={!isSupabaseConfigured || authLoading}
                aria-busy={authLoading}
              >
                <ShieldCheck size={16} aria-hidden="true" />
                {authLoading ? 'Membuka Google…' : 'Pilih akun Google lain'}
              </button>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => void loadSummary()}
                disabled={dataLoading}
              >
                {dataLoading ? 'Memuat…' : 'Coba lagi'}
              </button>
              <button type="button" className="admin-button admin-button--quiet" onClick={signOut}>
                <LogOut size={16} aria-hidden="true" />
                Keluar
              </button>
            </div>
          )}
        </section>
      </main>
    );
  }

  const activeBusIds = new Set(
    data.buses.filter((bus) => bus.is_active).map((bus) => bus.id)
  );
  const freshPositions = data.positions.filter(
    (position) =>
      activeBusIds.has(position.bus_id) &&
      now - new Date(position.updated_at).getTime() <= staleThresholdSeconds * 1000
  );

  return (
    <main className="admin-shell">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <a className="admin-brand" href="/linusku">
            <span>LINUSKU <small>Panel operasional</small></span>
          </a>
          <div className="admin-account">
            <span>{session.user.email}</span>
            <button
              type="button"
              className="admin-icon-button"
              onClick={signOut}
              aria-label="Keluar dari panel admin"
              title="Keluar"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav className="admin-tabs" aria-label="Bagian panel admin">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-current={activeTab === id ? 'page' : undefined}
              className={activeTab === id ? 'is-selected' : ''}
              onClick={() => selectTab(id)}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div className="admin-main">
        <div className="admin-page-heading">
          <div>
            <h1>
              {activeTab === 'overview'
                ? 'Operasi Linus'
                : TABS.find((tab) => tab.id === activeTab)?.label}
            </h1>
            <p>
              {activeTab === 'overview'
                ? 'Pantau keadaan armada, GPS, dan laporan Kampus USU.'
                : 'Kelola data LINUSKU yang tersimpan di Supabase.'}
            </p>
          </div>
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => void loadSummary()}
            disabled={dataLoading}
            aria-busy={dataLoading}
          >
            <RefreshCw size={16} aria-hidden="true" />
            {dataLoading ? 'Memuat…' : 'Segarkan data'}
          </button>
        </div>

        {dataError && (
          <div className="admin-message admin-message--error" role="alert">
            {dataError}
          </div>
        )}
        {positionError && (
          <div className="admin-message admin-message--error" role="alert">
            {positionError}
          </div>
        )}
        {actionMessage && (
          <div
            className={`admin-message ${
              actionMessage.kind === 'error'
                ? 'admin-message--error'
                : actionMessage.kind === 'warning'
                  ? 'admin-message--warning'
                  : ''
            }`}
            role={actionMessage.kind === 'error' ? 'alert' : 'status'}
          >
            {actionMessage.text}
          </div>
        )}

        {activeTab === 'overview' && (
          <section className="admin-workspace admin-health-panel" aria-labelledby="health-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="health-title">Kesehatan operasional</h2>
                <p>
                  Pemeriksaan database, armada aktif, penugasan driver, dan freshness GPS.
                </p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => void loadHealth()}
                disabled={healthLoading}
                aria-busy={healthLoading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                {healthLoading ? 'Memeriksa…' : 'Periksa lagi'}
              </button>
            </div>
            {healthError && (
              <div className="admin-message admin-message--error" role="alert">
                {healthError}
              </div>
            )}
            <div className="admin-health-summary">
              <div className={health?.ok ? 'is-healthy' : 'is-warning'}>
                {health?.ok ? (
                  <CheckCircle2 size={20} aria-hidden="true" />
                ) : (
                  <AlertTriangle size={20} aria-hidden="true" />
                )}
                <span>
                  <strong>{health?.ok ? 'Layanan utama tersedia' : 'Ada pemeriksaan yang perlu ditinjau'}</strong>
                  <small>
                    Diperiksa {health ? formatDateTime(health.generatedAt) : 'belum tersedia'}
                  </small>
                </span>
              </div>
              <dl className="admin-facts admin-facts--compact">
                <div>
                  <dt>Armada aktif</dt>
                  <dd>{health?.fleet.active ?? data.buses.filter((bus) => bus.is_active).length}</dd>
                </div>
                <div>
                  <dt>Tanpa driver</dt>
                  <dd>{health?.fleet.unassigned ?? data.buses.filter((bus) => bus.is_active && !bus.driver_id).length}</dd>
                </div>
                <div>
                  <dt>GPS kedaluwarsa</dt>
                  <dd>{dynamicStaleBusIds.size}</dd>
                </div>
                <div>
                  <dt>Permintaan tertunda</dt>
                  <dd>{driverRequests.filter((item) => item.status === 'pending').length}</dd>
                </div>
              </dl>
            </div>
            <div className="admin-health-checks" aria-label="Hasil pemeriksaan layanan">
              {(health?.checks ?? []).map((check) => (
                <div key={check.key} className={check.ok ? 'is-healthy' : 'is-warning'}>
                  <span>{check.ok ? 'Normal' : 'Gagal'}</span>
                  <strong>{healthCheckLabel(check.key)}</strong>
                  <small>{check.ok ? `${check.count} data` : check.error}</small>
                </div>
              ))}
              {!health && !healthLoading && (
                <div className="is-warning">
                  <span>Belum diperiksa</span>
                  <strong>Status database</strong>
                  <small>Tekan Periksa lagi untuk mengambil status terbaru.</small>
                </div>
              )}
            </div>
            <div className="admin-health-actions">
              {(health?.fleet.unassigned ?? 0) > 0 && (
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    setFleetStatus('unassigned');
                    setFleetPage(1);
                    selectTab('fleet');
                  }}
                >
                  Tinjau armada tanpa driver
                </button>
              )}
              {dynamicStaleBusIds.size > 0 && (
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    setFleetStatus('stale');
                    setFleetPage(1);
                    selectTab('fleet');
                  }}
                >
                  Tinjau GPS kedaluwarsa
                </button>
              )}
              {driverRequests.some((item) => item.status === 'pending') && (
                <button
                  type="button"
                  className="admin-button admin-button--primary"
                  onClick={() => selectTab('requests')}
                >
                  Review permintaan driver
                </button>
              )}
              <p>
                Ambang GPS kedaluwarsa {staleThresholdSeconds} detik dari pengaturan operasional.
              </p>
            </div>
          </section>
        )}

        {activeTab === 'overview' && (
          <section className="admin-workspace" aria-labelledby="fleet-status-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="fleet-status-title">Status armada</h2>
                <p>
                  Pembaruan posisi otomatis setiap 10 detik. Terakhir diperiksa{' '}
                  {formatTime(lastPositionCheck)} WIB.
                </p>
              </div>
              <span className="admin-live-label">
                {freshPositions.length > 0 ? 'GPS terpantau' : 'Belum ada GPS aktif'}
              </span>
            </div>
            <dl className="admin-facts">
              <div><dt>Armada aktif</dt><dd>{data.buses.filter((bus) => bus.is_active).length}</dd></div>
              <div><dt>Posisi baru</dt><dd>{freshPositions.length}</dd></div>
              <div><dt>Pengguna</dt><dd>{data.users.length}</dd></div>
              <div><dt>Laporan 24 jam</dt><dd>{data.reportCount24h}</dd></div>
            </dl>
            <FleetTable
              buses={data.buses}
              users={data.drivers}
              positionsByBus={positionsByBus}
              now={now}
              staleThresholdSeconds={staleThresholdSeconds}
              saving={saving}
              compact
              onEdit={openBusForm}
              onDelete={deleteBus}
            />
            {busEditorOpen && renderBusForm()}
          </section>
        )}

        {activeTab === 'fleet' && (
          <section className="admin-workspace" aria-labelledby="fleet-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="fleet-title">Daftar armada</h2>
                <p>Ubah identitas, kapasitas, status layanan, dan penugasan driver.</p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={openNewBusForm}
              >
                Tambah armada
              </button>
            </div>
            {busEditorOpen && renderBusForm()}
            <div className="admin-table-toolbar" aria-label="Filter dan urutan armada">
              <label className="admin-field">
                Cari armada
                <input
                  type="search"
                  value={fleetSearch}
                  placeholder="ID, nama, atau nomor kendaraan"
                  onChange={(event) => {
                    setFleetSearch(event.target.value);
                    setFleetPage(1);
                  }}
                />
              </label>
              <label className="admin-field">
                Status
                <select
                  value={fleetStatus}
                  onChange={(event) => {
                    setFleetStatus(event.target.value);
                    setFleetPage(1);
                  }}
                >
                  <option value="all">Semua status</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                  <option value="stale">GPS kedaluwarsa</option>
                  <option value="unassigned">Belum ada driver</option>
                </select>
              </label>
              <label className="admin-field">
                Urutkan
                <select
                  value={fleetSort}
                  onChange={(event) => {
                    setFleetSort(event.target.value);
                    setFleetPage(1);
                  }}
                >
                  <option value="id-asc">ID armada A–Z</option>
                  <option value="id-desc">ID armada Z–A</option>
                  <option value="name-asc">Nama A–Z</option>
                  <option value="name-desc">Nama Z–A</option>
                  <option value="status-asc">Status layanan</option>
                </select>
              </label>
            </div>
            {selectedFleetIds.size > 0 && (
              <div className="admin-selection-bar" role="status">
                <strong>{selectedFleetIds.size} armada dipilih</strong>
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  disabled={saving}
                  onClick={() => void runBulkAction('armada', 'activate', [...selectedFleetIds])}
                >
                  Aktifkan
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--danger"
                  disabled={saving}
                  onClick={() => void runBulkAction('armada', 'deactivate', [...selectedFleetIds])}
                >
                  Nonaktifkan
                </button>
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => setSelectedFleetIds(new Set())}
                >
                  Batalkan pilihan
                </button>
              </div>
            )}
            {data.buses.length ? (
              <>
                <FleetTable
                  buses={fleetPageRows}
                  users={data.drivers}
                  positionsByBus={positionsByBus}
                  now={now}
                  staleThresholdSeconds={staleThresholdSeconds}
                  saving={saving}
                  selectedIds={selectedFleetIds}
                  onToggleSelection={(id) => toggleSelected(setSelectedFleetIds, id)}
                  onSelectionChange={(ids, selected) =>
                    setSelectedFleetIds((current) => {
                      const next = new Set(current);
                      for (const id of ids) {
                        if (selected) next.add(id);
                        else next.delete(id);
                      }
                      return next;
                    })
                  }
                  onEdit={openBusForm}
                  onDelete={deleteBus}
                />
                <TablePagination
                  currentPage={currentFleetPage}
                  pageCount={fleetPageCount}
                  total={filteredFleet.length}
                  onPageChange={setFleetPage}
                />
              </>
            ) : (
              <EmptyState
                title="Belum ada armada"
                detail="Tambahkan armada agar dapat ditugaskan kepada driver."
                action="Tambah armada"
                onAction={openNewBusForm}
              />
            )}
            <DataTransferPanel
              source="armada"
              requestAdmin={requestAdmin}
              onImported={handleImported}
            />
          </section>
        )}

        {activeTab === 'drivers' && (
          <section className="admin-workspace" aria-labelledby="drivers-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="drivers-title">
                  {accountList === 'users' ? 'Pengguna' : 'Driver'}
                </h2>
                <p>
                  {accountList === 'users'
                    ? 'Akun pengguna terpisah dari akun driver. Hanya admin yang dapat mengubah jenis akun.'
                    : 'Kelola profil driver dan penugasannya. Tetapkan armada dari bagian Armada.'}
                </p>
              </div>
              {accountList === 'drivers' && (
                <button
                  type="button"
                  className="admin-button admin-button--primary"
                  onClick={() => setDriverEditorOpen(true)}
                >
                  Tambah driver
                </button>
              )}
            </div>
            <div className="admin-account-switch" role="tablist" aria-label="Jenis akun">
              <button
                type="button"
                role="tab"
                aria-selected={accountList === 'users'}
                className={accountList === 'users' ? 'is-selected' : ''}
                onClick={() => {
                  setAccountList('users');
                  setDriverEditorOpen(false);
                  setEditingDriver(null);
                  setAccountPage(1);
                  setSelectedAccountIds(new Set());
                }}
              >
                Pengguna
                <span>{data.users.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={accountList === 'drivers'}
                className={accountList === 'drivers' ? 'is-selected' : ''}
                onClick={() => {
                  setAccountList('drivers');
                  setEditingDriver(null);
                  setAccountPage(1);
                  setSelectedAccountIds(new Set());
                }}
              >
                Driver
                <span>{data.drivers.length}</span>
              </button>
            </div>
            {accountList === 'drivers' && driverEditorOpen && renderDriverForm()}
            {accountList === 'drivers' && renderDriverEditForm()}
            {accountRows.length ? (
              <>
                <div className="admin-table-toolbar" aria-label="Filter dan urutan akun">
                  <label className="admin-field">
                    Cari akun
                    <input
                      type="search"
                      value={accountSearch}
                      placeholder="Nama, email, atau armada"
                      onChange={(event) => {
                        setAccountSearch(event.target.value);
                        setAccountPage(1);
                      }}
                    />
                  </label>
                  <label className="admin-field">
                    Status
                    <select
                      value={accountStatus}
                      onChange={(event) => {
                        setAccountStatus(event.target.value);
                        setAccountPage(1);
                      }}
                    >
                      <option value="all">Semua status</option>
                      <option value="active">Aktif</option>
                      <option value="inactive">Dinonaktifkan</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    Urutkan
                    <select
                      value={accountSort}
                      onChange={(event) => {
                        setAccountSort(event.target.value);
                        setAccountPage(1);
                      }}
                    >
                      <option value="name-asc">Nama A–Z</option>
                      <option value="name-desc">Nama Z–A</option>
                      <option value="last-login-desc">Terakhir masuk terbaru</option>
                      <option value="status-asc">Status akun</option>
                    </select>
                  </label>
                </div>
                {selectedAccountIds.size > 0 && (
                  <div className="admin-selection-bar" role="status">
                    <strong>{selectedAccountIds.size} akun dipilih</strong>
                    <button
                      type="button"
                      className="admin-button admin-button--quiet"
                      disabled={saving}
                      onClick={() => void runBulkAction('akun', 'activate', [...selectedAccountIds])}
                    >
                      Aktifkan
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      disabled={saving}
                      onClick={() => void runBulkAction('akun', 'deactivate', [...selectedAccountIds])}
                    >
                      Nonaktifkan
                    </button>
                    {accountList === 'users' ? (
                      <button
                        type="button"
                        className="admin-button admin-button--quiet"
                        disabled={saving}
                        onClick={() => void runBulkAction('akun', 'make_driver', [...selectedAccountIds])}
                      >
                        Jadikan driver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="admin-button admin-button--quiet"
                        disabled={saving}
                        onClick={() => void runBulkAction('akun', 'make_user', [...selectedAccountIds])}
                      >
                        Jadikan pengguna
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-button admin-button--quiet"
                      onClick={() => setSelectedAccountIds(new Set())}
                    >
                      Batalkan pilihan
                    </button>
                  </div>
                )}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col" className="admin-select-column">
                          <input
                            type="checkbox"
                            aria-label="Pilih akun pada halaman ini"
                            checked={
                              accountPageRows.length > 0 &&
                              accountPageRows.every((user) => selectedAccountIds.has(user.id))
                            }
                            onChange={(event) => {
                              setSelectedAccountIds((current) => {
                                const next = new Set(current);
                                for (const user of accountPageRows) {
                                  if (event.target.checked) next.add(user.id);
                                  else next.delete(user.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </th>
                        <th scope="col">{accountList === 'users' ? 'Pengguna' : 'Driver'}</th>
                        <th scope="col">Masuk dengan</th>
                        {accountList === 'drivers' && (
                          <>
                            <th scope="col">Penugasan</th>
                            <th scope="col">Status penumpang</th>
                          </>
                        )}
                        <th scope="col">Terakhir masuk</th>
                        <th scope="col">Status</th>
                        <th scope="col"><span className="admin-visually-hidden">Tindakan</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountPageRows.map((user) => (
                        <tr key={user.id} className={selectedAccountIds.has(user.id) ? 'is-selected' : ''}>
                          <td data-label="Pilih" className="admin-select-column">
                            <input
                              type="checkbox"
                              aria-label={`Pilih ${user.fullName || user.email}`}
                              checked={selectedAccountIds.has(user.id)}
                              onChange={() => toggleSelected(setSelectedAccountIds, user.id)}
                            />
                          </td>
                          <td data-label={accountList === 'users' ? 'Pengguna' : 'Driver'}>
                            <strong>{user.fullName || user.email}</strong>
                            {user.fullName && <small>{user.email}</small>}
                          </td>
                          <td data-label="Masuk dengan">
                            {user.provider === 'google' ? 'Google' : 'Email'}
                          </td>
                          {accountList === 'drivers' && (
                            <>
                              <td data-label="Penugasan">{user.assignedBusId ?? 'Belum ditugaskan'}</td>
                              <td data-label="Status penumpang">{formatOccupancy(user.occupancy)}</td>
                            </>
                          )}
                          <td data-label="Terakhir masuk">{formatDate(user.lastSignInAt)}</td>
                          <td data-label="Status">
                            {!user.bannedUntil || new Date(user.bannedUntil).getTime() <= now
                              ? 'Aktif'
                              : 'Dinonaktifkan'}
                          </td>
                          <td data-label="Tindakan" className="admin-actions-cell">
                            {accountList === 'drivers' ? (
                              <>
                                <button
                                  type="button"
                                  className="admin-button admin-button--quiet"
                                  onClick={() => openDriverEditor(user)}
                                >
                                  Ubah profil
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button--quiet"
                                  disabled={Boolean(user.assignedBusId) || saving}
                                  title={user.assignedBusId ? 'Lepas penugasan armada terlebih dahulu.' : undefined}
                                  onClick={() => void changeAccountType(user, 'user')}
                                >
                                  Jadikan pengguna
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className="admin-button admin-button--quiet"
                                  onClick={() => openDriverEditor(user)}
                                >
                                  Ubah profil
                                </button>
                                <button
                                  type="button"
                                  className="admin-button admin-button--primary"
                                  disabled={saving}
                                  onClick={() => void changeAccountType(user, 'driver')}
                                >
                                  Jadikan driver
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={currentAccountPage}
                  pageCount={accountPageCount}
                  total={filteredAccounts.length}
                  onPageChange={setAccountPage}
                />
              </>
            ) : (
              <EmptyState
                title={accountList === 'users' ? 'Belum ada pengguna' : 'Belum ada driver'}
                detail={
                  accountList === 'users'
                    ? 'Akun pengguna terdaftar akan muncul di daftar ini.'
                    : 'Buat akun driver atau ubah akun pengguna menjadi driver.'
                }
                action={accountList === 'drivers' ? 'Buat akun driver' : undefined}
                onAction={accountList === 'drivers' ? () => setDriverEditorOpen(true) : undefined}
              />
            )}
            <DataTransferPanel
              source="akun"
              requestAdmin={requestAdmin}
              onImported={handleImported}
            />
          </section>
        )}

        {activeTab === 'requests' && (
          <section className="admin-workspace" aria-labelledby="requests-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="requests-title">Permintaan akses driver</h2>
                <p>Periksa pengaju, tetapkan armada, lalu setujui atau tolak permintaan.</p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => void loadDriverRequests()}
                disabled={driverRequestsLoading}
                aria-busy={driverRequestsLoading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                {driverRequestsLoading ? 'Memuat…' : 'Segarkan permintaan'}
              </button>
            </div>
            {driverRequestsError && (
              <div className="admin-message admin-message--error" role="alert">
                {driverRequestsError}
              </div>
            )}
            {driverRequestsLoading && !driverRequests.length ? (
              <div className="admin-skeleton-table" aria-busy="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="admin-skeleton-row" key={index}>
                    <span /><span /><span /><span />
                  </div>
                ))}
              </div>
            ) : pendingDriverRequests.length ? (
              <div className="admin-request-list">
                {pendingDriverRequests.map((item) => (
                  <article className="admin-request-card" key={item.id}>
                    <div className="admin-request-identity">
                      <span className="admin-request-avatar" aria-hidden="true">
                        {(item.full_name || item.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <div>
                        <h3>{item.full_name || 'Nama belum diisi'}</h3>
                        <p>{item.email || 'Email tidak tersedia'}</p>
                        <small>Diajukan {formatDateTime(item.created_at)}</small>
                      </div>
                    </div>
                    <dl className="admin-request-facts">
                      <div>
                        <dt>Telepon</dt>
                        <dd>{item.phone || 'Tidak diisi'}</dd>
                      </div>
                      <div>
                        <dt>Armada diminta</dt>
                        <dd>{item.requested_bus_id || 'Tidak ditentukan'}</dd>
                      </div>
                      <div>
                        <dt>Catatan</dt>
                        <dd>{item.notes || 'Tidak ada catatan'}</dd>
                      </div>
                    </dl>
                    <label className="admin-field">
                      Armada yang ditugaskan
                      <select
                        value={driverRequestBuses[item.id] ?? ''}
                        onChange={(event) =>
                          setDriverRequestBuses((current) => ({
                            ...current,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="">Belum ditugaskan</option>
                        {data.buses
                          .filter((bus) => bus.is_active && (!bus.driver_id || bus.driver_id === item.user_id))
                          .map((bus) => (
                            <option key={bus.id} value={bus.id}>
                              {bus.id} — {bus.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="admin-request-actions">
                      <button
                        type="button"
                        className="admin-button admin-button--primary"
                        disabled={saving}
                        onClick={() => void reviewDriverRequest(item, 'approve')}
                      >
                        <UserCheck size={16} aria-hidden="true" />
                        Setujui
                      </button>
                      <button
                        type="button"
                        className="admin-button admin-button--danger"
                        disabled={saving}
                        onClick={() => void reviewDriverRequest(item, 'reject')}
                      >
                        Tolak
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Tidak ada permintaan tertunda"
                detail="Permintaan akses driver baru akan muncul di sini."
              />
            )}
            {driverRequests.some((item) => item.status !== 'pending') && (
              <details className="admin-review-history">
                <summary>
                  Riwayat keputusan ({driverRequests.filter((item) => item.status !== 'pending').length})
                </summary>
                <ul>
                  {driverRequests
                    .filter((item) => item.status !== 'pending')
                    .slice(0, 20)
                    .map((item) => (
                      <li key={item.id}>
                        <strong>{item.full_name || item.email}</strong>
                        <span>{item.status === 'approved' ? 'Disetujui' : 'Ditolak'}</span>
                        <small>{formatDateTime(item.reviewed_at ?? item.updated_at)}</small>
                      </li>
                    ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {activeTab === 'stops' && (
          <section className="admin-workspace" aria-labelledby="stops-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="stops-title">Halte dan urutan rute</h2>
                <p>Rute jalan akan dihitung ulang mengikuti koordinat dan urutan halte.</p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={stopCreation}
              >
                Tambah halte
              </button>
            </div>
            {stopEditorOpen && renderStopForm()}
            {data.stops.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Urutan</th>
                      <th scope="col">Halte</th>
                      <th scope="col">Koordinat</th>
                      <th scope="col"><span className="admin-visually-hidden">Tindakan</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.stops.map((stop, index) => (
                      <tr key={stop.id}>
                        <td data-label="Urutan" className="admin-number">{stop.sequence_order}</td>
                        <td data-label="Halte">
                          <strong>{stop.name}</strong>
                          <small>{stop.area}</small>
                          <small>ID halte: {stop.id}</small>
                        </td>
                        <td data-label="Koordinat" className="admin-number">
                          {stop.lat.toFixed(5)}, {stop.lng.toFixed(5)}
                        </td>
                        <td data-label="Tindakan" className="admin-actions-cell">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => void reorderStop(index, -1)}
                            disabled={saving || index === 0}
                            aria-label={`Pindahkan ${stop.name} ke atas`}
                          >
                            <ArrowUp size={17} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => void reorderStop(index, 1)}
                            disabled={saving || index === data.stops.length - 1}
                            aria-label={`Pindahkan ${stop.name} ke bawah`}
                          >
                            <ArrowDown size={17} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--quiet"
                            onClick={() => void handleShowQr(stop)}
                            title={`QR Code ${stop.name}`}
                          >
                            <QrCode size={15} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                            QR
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--quiet"
                            onClick={() => startEditingStop(stop)}
                          >
                            Ubah
                          </button>
                          <button
                            type="button"
                            className="admin-button admin-button--danger"
                            onClick={() => void deleteStop(stop)}
                            disabled={saving}
                          >
                            Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Belum ada halte"
                detail="Tambahkan sedikitnya dua halte agar rute dapat dihitung."
                action="Tambah halte"
                onAction={stopCreation}
              />
            )}
            <DataTransferPanel
              source="halte"
              requestAdmin={requestAdmin}
              onImported={handleImported}
            />
            {qrModalStop && (
              <div
                className="admin-modal-backdrop"
                onClick={() => setQrModalStop(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="qr-modal-title"
              >
                <div
                  className="admin-modal"
                  onClick={(e) => e.stopPropagation()}
                  style={{ textAlign: 'center' }}
                >
                  <div className="admin-modal-header">
                    <h3 id="qr-modal-title">QR Halte: {qrModalStop.name}</h3>
                    <button
                      type="button"
                      className="admin-modal-close-btn"
                      onClick={() => setQrModalStop(null)}
                      aria-label="Tutup"
                    >
                      ✕
                    </button>
                  </div>
                  <p
                    style={{
                      fontSize: '0.825rem',
                      color: 'var(--color-muted)',
                      margin: '8px 0 16px',
                    }}
                  >
                    Scan QR ini untuk langsung membuka pelacak bus di{' '}
                    <strong>{qrModalStop.name}</strong>. Cocok dicetak dan ditempel di fisik halte.
                  </p>
                  {qrDataUrl ? (
                    <div
                      style={{
                        display: 'inline-block',
                        padding: 12,
                        background: '#ffffff',
                        borderRadius: 12,
                        border: 'var(--rule-hair) solid var(--color-rule)',
                        boxShadow: 'var(--shadow-card)',
                      }}
                    >
                      <img
                        src={qrDataUrl}
                        alt={`QR Code ${qrModalStop.name}`}
                        width={260}
                        height={260}
                        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
                      />
                    </div>
                  ) : (
                    <div style={{ padding: 40, color: 'var(--color-muted)' }}>Menghasilkan QR…</div>
                  )}
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: '0.725rem',
                      wordBreak: 'break-all',
                      color: 'var(--color-muted)',
                    }}
                  >
                    <code>
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/linusku?stop=${qrModalStop.id}`
                        : `/?stop=${qrModalStop.id}`}
                    </code>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      gap: 10,
                      justifyContent: 'center',
                      marginTop: 16,
                    }}
                  >
                    {qrDataUrl && (
                      <button
                        type="button"
                        className="admin-button admin-button--primary"
                        onClick={() => {
                          // Convert data URL to blob for reliable download across browsers
                          fetch(qrDataUrl)
                            .then((res) => res.blob())
                            .then((blob) => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `QR-Halte-${qrModalStop.id}.png`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);
                            })
                            .catch((err) => {
                              console.error('Failed to download QR code', err);
                            });
                        }}
                      >
                        <Download
                          size={16}
                          style={{
                            marginRight: 6,
                            display: 'inline-block',
                            verticalAlign: 'middle',
                          }}
                        />
                        Unduh PNG
                      </button>
                    )}
                    <button
                      type="button"
                      className="admin-button"
                      onClick={() => setQrModalStop(null)}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'audit' && (
          <section className="admin-workspace" aria-labelledby="audit-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="audit-title">Log Audit Admin</h2>
                <p>Riwayat perubahan yang dilakukan oleh admin.</p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => void loadAuditLogs()}
                disabled={auditLoading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Segarkan
              </button>
            </div>
            {auditError && (
              <div className="admin-message admin-message--error" role="alert">{auditError}</div>
            )}
            <div className="admin-form admin-filter-form">
              <div className="admin-fields admin-fields--three">
                <label className="admin-field">
                  Aksi
                  <input
                    name="audit-action"
                    type="text"
                    value={auditFilters.action}
                    onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                    placeholder="create_bus, update_stop, etc"
                  />
                </label>
                <label className="admin-field">
                  Tabel Target
                  <input
                    name="audit-table"
                    type="text"
                    value={auditFilters.targetTable}
                    onChange={(e) => setAuditFilters({ ...auditFilters, targetTable: e.target.value })}
                    placeholder="buses, stops, etc"
                  />
                </label>
                <label className="admin-field">
                  Target ID
                  <input
                    name="audit-target-id"
                    type="text"
                    value={auditFilters.targetId}
                    onChange={(e) => setAuditFilters({ ...auditFilters, targetId: e.target.value })}
                    placeholder="LINUS-01, halte-pintu-1"
                  />
                </label>
                <label className="admin-field">
                  Admin ID
                  <input
                    name="audit-admin-id"
                    type="text"
                    value={auditFilters.adminId}
                    onChange={(e) => setAuditFilters({ ...auditFilters, adminId: e.target.value })}
                    placeholder="UUID admin"
                  />
                </label>
                <label className="admin-field">
                  Dari Tanggal
                  <input
                    name="audit-since"
                    type="date"
                    value={auditFilters.since}
                    onChange={(e) => setAuditFilters({ ...auditFilters, since: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <button
                    type="button"
                    className="admin-button admin-button--primary"
                    onClick={() => { setAuditOffset(0); void loadAuditLogs(0); }}
                    disabled={auditLoading}
                  >
                    Filter
                  </button>
                </label>
              </div>
            </div>
            {auditLoading ? (
              <div className="admin-skeleton-table" aria-busy="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="admin-skeleton-row" key={index}>
                    <span /><span /><span /><span /><span />
                  </div>
                ))}
              </div>
            ) : auditLogs.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Waktu</th>
                      <th scope="col">Admin</th>
                      <th scope="col">Aksi</th>
                      <th scope="col">Tabel</th>
                      <th scope="col">Target ID</th>
                      <th scope="col">IP</th>
                      <th scope="col"><span className="admin-visually-hidden">Rincian</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id}>
                        <td data-label="Waktu">{formatDateTime(log.created_at)}</td>
                        <td data-label="Admin">{log.admin_id.slice(0, 8)}…</td>
                        <td data-label="Aksi"><code>{log.action}</code></td>
                        <td data-label="Tabel">{log.target_table}</td>
                        <td data-label="Target ID">{log.target_id ?? '-'}</td>
                        <td data-label="IP">{log.ip_address ?? '-'}</td>
                        <td data-label="Rincian" className="admin-detail-cell">
                          <details className="admin-detail">
                            <summary>Detail</summary>
                            <dl className="admin-detail-list">
                              <div><dt>Waktu lengkap</dt><dd>{formatDateTime(log.created_at)}</dd></div>
                              <div><dt>Admin ID</dt><dd>{log.admin_id}</dd></div>
                              <div><dt>User agent</dt><dd>{log.user_agent ?? '-'}</dd></div>
                            </dl>
                            <div className="admin-json-grid">
                              <div>
                                <strong>Nilai lama</strong>
                                <pre>{formatJson(log.old_value)}</pre>
                              </div>
                              <div>
                                <strong>Nilai baru</strong>
                                <pre>{formatJson(log.new_value)}</pre>
                              </div>
                            </div>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Belum ada log audit" detail="Log akan muncul setelah admin melakukan perubahan." />
            )}
            {auditTotalCount > auditLimit && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    const nextOffset = Math.max(0, auditOffset - auditLimit);
                    setAuditOffset(nextOffset);
                    void loadAuditLogs(nextOffset);
                  }}
                  disabled={auditOffset === 0 || auditLoading}
                >
                  Sebelumnya
                </button>
                <span>Halaman {Math.floor(auditOffset / auditLimit) + 1} dari {Math.ceil(auditTotalCount / auditLimit)}</span>
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    const nextOffset = auditOffset + auditLimit;
                    setAuditOffset(nextOffset);
                    void loadAuditLogs(nextOffset);
                  }}
                  disabled={auditOffset + auditLimit >= auditTotalCount || auditLoading}
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'history' && (
          <section className="admin-workspace" aria-labelledby="history-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="history-title">Riwayat Posisi GPS</h2>
                <p>Data historis posisi armada (diambil dari trigger database).</p>
              </div>
              <button
                type="button"
                className="admin-button admin-button--quiet"
                onClick={() => void loadPositionHistory()}
                disabled={historyLoading}
              >
                <RefreshCw size={16} aria-hidden="true" />
                Segarkan
              </button>
            </div>
            {historyError && (
              <div className="admin-message admin-message--error" role="alert">{historyError}</div>
            )}
            <div className="admin-form admin-filter-form">
              <div className="admin-fields admin-fields--three">
                <label className="admin-field">
                  Armada
                  <select
                    name="history-bus"
                    value={historyFilters.busId}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, busId: e.target.value })}
                  >
                    <option value="">Semua armada</option>
                    {data.buses.map((bus) => (
                      <option key={bus.id} value={bus.id}>{bus.id} — {bus.name}</option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  Sumber
                  <select
                    name="history-source"
                    value={historyFilters.sourceType}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, sourceType: e.target.value })}
                  >
                    <option value="">Semua sumber</option>
                    <option value="driver">Driver</option>
                    <option value="device">Device</option>
                    <option value="simulator">Simulator</option>
                    <option value="crowd">Crowd</option>
                  </select>
                </label>
                <label className="admin-field">
                  Dari
                  <input
                    name="history-since"
                    type="datetime-local"
                    value={historyFilters.since}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, since: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  Sampai
                  <input
                    name="history-until"
                    type="datetime-local"
                    value={historyFilters.until}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, until: e.target.value })}
                  />
                </label>
                <label className="admin-field">
                  <button
                    type="button"
                    className="admin-button admin-button--primary"
                    onClick={() => { setHistoryOffset(0); void loadPositionHistory(0); }}
                    disabled={historyLoading}
                  >
                    Filter
                  </button>
                </label>
              </div>
            </div>
            <PositionReplay
              history={replayHistory}
              busName={
                data.buses.find((bus) => bus.id === historyFilters.busId)?.name ?? null
              }
            />
            {historyLoading ? (
              <div className="admin-skeleton-table" aria-busy="true">
                {Array.from({ length: 5 }, (_, index) => (
                  <div className="admin-skeleton-row" key={index}>
                    <span /><span /><span /><span /><span />
                  </div>
                ))}
              </div>
            ) : positionHistory.length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th scope="col">Waktu</th>
                      <th scope="col">Armada</th>
                      <th scope="col">Koordinat</th>
                      <th scope="col">Kecepatan</th>
                      <th scope="col">Kepadatan</th>
                      <th scope="col">Sumber</th>
                      <th scope="col"><span className="admin-visually-hidden">Rincian</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionHistory.map((item) => (
                      <tr key={item.id}>
                        <td data-label="Waktu">{formatDateTime(item.recorded_at)}</td>
                        <td data-label="Armada">{item.bus_id}</td>
                        <td data-label="Koordinat" className="admin-number">
                          {item.lat.toFixed(5)}, {item.lng.toFixed(5)}
                        </td>
                        <td data-label="Kecepatan">{Math.round(item.speed_kmh)} km/j</td>
                        <td data-label="Kepadatan">{formatOccupancy(item.occupancy)}</td>
                        <td data-label="Sumber">{item.source_type}</td>
                        <td data-label="Rincian" className="admin-detail-cell">
                          <details className="admin-detail">
                            <summary>Detail</summary>
                            <dl className="admin-detail-list">
                              <div><dt>Waktu lengkap</dt><dd>{formatDateTime(item.recorded_at)}</dd></div>
                              <div><dt>ID riwayat</dt><dd>{item.id}</dd></div>
                              <div><dt>Arah</dt><dd>{Math.round(item.heading)}°</dd></div>
                              <div><dt>Sumber</dt><dd>{item.source_type}</dd></div>
                            </dl>
                          </details>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="Belum ada riwayat posisi" detail="Data historis akan terisi saat armada mengirim GPS." />
            )}
            {historyTotalCount > historyLimit && (
              <div className="admin-pagination">
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    const nextOffset = Math.max(0, historyOffset - historyLimit);
                    setHistoryOffset(nextOffset);
                    void loadPositionHistory(nextOffset);
                  }}
                  disabled={historyOffset === 0 || historyLoading}
                >
                  Sebelumnya
                </button>
                <span>Halaman {Math.floor(historyOffset / historyLimit) + 1} dari {Math.ceil(historyTotalCount / historyLimit)}</span>
                <button
                  type="button"
                  className="admin-button admin-button--quiet"
                  onClick={() => {
                    const nextOffset = historyOffset + historyLimit;
                    setHistoryOffset(nextOffset);
                    void loadPositionHistory(nextOffset);
                  }}
                  disabled={historyOffset + historyLimit >= historyTotalCount || historyLoading}
                >
                  Selanjutnya
                </button>
              </div>
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="admin-workspace" aria-labelledby="reports-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="reports-title">Laporan mahasiswa</h2>
                <p>Daftar laporan 24 jam terakhir. Hapus laporan yang tidak sesuai.</p>
              </div>
              <span className="admin-live-label">
                {data.reports.length} ditampilkan dari {data.reportCount24h}
              </span>
            </div>
            {data.reports.length ? (
              <>
                <div className="admin-table-toolbar" aria-label="Filter dan urutan laporan">
                  <label className="admin-field">
                    Cari laporan
                    <input
                      type="search"
                      value={reportSearch}
                      placeholder="ID, armada, atau halte"
                      onChange={(event) => {
                        setReportSearch(event.target.value);
                        setReportPage(1);
                      }}
                    />
                  </label>
                  <label className="admin-field">
                    Kepadatan
                    <select
                      value={reportOccupancy}
                      onChange={(event) => {
                        setReportOccupancy(event.target.value);
                        setReportPage(1);
                      }}
                    >
                      <option value="all">Semua kepadatan</option>
                      <option value="low">Lega</option>
                      <option value="medium">Sedang</option>
                      <option value="full">Penuh</option>
                    </select>
                  </label>
                  <label className="admin-field">
                    Urutkan
                    <select
                      value={reportSort}
                      onChange={(event) => {
                        setReportSort(event.target.value);
                        setReportPage(1);
                      }}
                    >
                      <option value="newest">Terbaru</option>
                      <option value="oldest">Terlama</option>
                    </select>
                  </label>
                  <AdminDownloadButton resource="laporan" label="Ekspor CSV" />
                </div>
                {selectedReportIds.size > 0 && (
                  <div className="admin-selection-bar" role="status">
                    <strong>{selectedReportIds.size} laporan dipilih</strong>
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      disabled={saving}
                      onClick={() => void runBulkAction('laporan', 'delete', [...selectedReportIds])}
                    >
                      Hapus terpilih
                    </button>
                    <button
                      type="button"
                      className="admin-button admin-button--quiet"
                      onClick={() => setSelectedReportIds(new Set())}
                    >
                      Batalkan pilihan
                    </button>
                  </div>
                )}
                <div className="admin-table-wrap">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th scope="col" className="admin-select-column">
                          <input
                            type="checkbox"
                            aria-label="Pilih laporan pada halaman ini"
                            checked={
                              reportPageRows.length > 0 &&
                              reportPageRows.every((report) => selectedReportIds.has(report.id))
                            }
                            onChange={(event) => {
                              setSelectedReportIds((current) => {
                                const next = new Set(current);
                                for (const report of reportPageRows) {
                                  if (event.target.checked) next.add(report.id);
                                  else next.delete(report.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </th>
                        <th scope="col">Waktu</th>
                        <th scope="col">Armada</th>
                        <th scope="col">Kepadatan</th>
                        <th scope="col">Lokasi</th>
                        <th scope="col"><span className="admin-visually-hidden">Tindakan</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportPageRows.map((report) => (
                        <tr key={report.id} className={selectedReportIds.has(report.id) ? 'is-selected' : ''}>
                          <td data-label="Pilih" className="admin-select-column">
                            <input
                              type="checkbox"
                              aria-label={`Pilih laporan ${report.id}`}
                              checked={selectedReportIds.has(report.id)}
                              onChange={() => toggleSelected(setSelectedReportIds, report.id)}
                            />
                          </td>
                          <td data-label="Waktu">{formatDateTime(report.created_at)}</td>
                          <td data-label="Armada">
                            {report.bus_id ?? 'Tidak diketahui'}
                            {report.stop_id && <small>{report.stop_id}</small>}
                          </td>
                          <td data-label="Kepadatan">{formatOccupancy(report.occupancy)}</td>
                          <td data-label="Lokasi" className="admin-number">
                            {report.lat.toFixed(5)}, {report.lng.toFixed(5)}
                          </td>
                          <td data-label="Tindakan" className="admin-actions-cell">
                            <button
                              type="button"
                              className="admin-button admin-button--danger"
                              onClick={() => void deleteReport(report)}
                              disabled={saving}
                            >
                              Hapus laporan
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePagination
                  currentPage={currentReportPage}
                  pageCount={reportPageCount}
                  total={filteredReports.length}
                  onPageChange={setReportPage}
                />
              </>
            ) : (
              <EmptyState
                title="Belum ada laporan baru"
                detail="Laporan kepadatan yang masuk dalam 24 jam akan muncul di sini."
              />
            )}
          </section>
        )}

        {activeTab === 'operations' && (
          <section className="admin-workspace" aria-labelledby="operations-title">
            <div className="admin-section-heading">
              <div>
                <h2 id="operations-title">Jam layanan dan rute</h2>
                <p>Jam menggunakan WIB. Rute mengikuti urutan halte pada bagian Halte.</p>
              </div>
              <Settings2 size={20} aria-hidden="true" />
            </div>
            <div className="admin-settings-meta">
              <Database size={18} aria-hidden="true" />
              <div>
                <span>Sumber pengaturan</span>
                <strong>{settingsSourceLabel(data.settingsSource)}</strong>
              </div>
              <div>
                <span>Diperbarui</span>
                <strong>{formatDateTime(data.settingsUpdatedAt ?? data.settings.updatedAt ?? null)}</strong>
              </div>
              <div>
                <span>Ambang GPS stale</span>
                <strong>{staleThresholdSeconds} detik</strong>
              </div>
            </div>
            <form className="admin-form admin-settings-form" onSubmit={submitSettings}>
              <fieldset className="admin-day-fieldset">
                <legend>Hari beroperasi</legend>
                <p className="admin-field-help">
                  Jadwal operasional resmi tetap Senin-Jumat, 07.00-17.00 WIB.
                </p>
                <div className="admin-day-list">
                  {DAYS.map((day) => (
                    <label className="admin-day" key={day.id}>
                      <input
                        type="checkbox"
                        checked={serviceDays.includes(day.id)}
                        onChange={() => toggleDay(day.id)}
                        disabled
                      />
                      {day.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="admin-fields admin-fields--two">
                <label className="admin-field">
                  Mulai layanan
                  <input
                    name="opening-time"
                    type="time"
                    value={openingTime}
                    onChange={(event) => setOpeningTime(event.target.value)}
                    disabled
                    required
                  />
                </label>
                <label className="admin-field">
                  Akhir layanan
                  <input
                    name="closing-time"
                    type="time"
                    value={closingTime}
                    onChange={(event) => setClosingTime(event.target.value)}
                    disabled
                    required
                  />
                </label>
              </div>
              <fieldset className="admin-settings-group">
                <legend>Jadwal keberangkatan</legend>
                <div className="admin-fields admin-fields--three">
                  <label className="admin-field">
                    Keberangkatan pertama
                    <input
                      name="first-departure-time"
                      type="time"
                      value={scheduleSettings.firstDepartureTime}
                      onChange={(event) =>
                        setScheduleSettings((current) => ({
                          ...current,
                          firstDepartureTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Keberangkatan terakhir
                    <input
                      name="last-departure-time"
                      type="time"
                      value={scheduleSettings.lastDepartureTime}
                      onChange={(event) =>
                        setScheduleSettings((current) => ({
                          ...current,
                          lastDepartureTime: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Interval keberangkatan (menit)
                    <input
                      name="headway-minutes"
                      type="number"
                      min="1"
                      max="240"
                      value={scheduleSettings.headwayMinutes}
                      onChange={(event) =>
                        setScheduleSettings((current) => ({
                          ...current,
                          headwayMinutes: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="admin-settings-group">
                <legend>Estimasi dan posisi</legend>
                <div className="admin-fields admin-fields--three">
                  <label className="admin-field">
                    Kecepatan minimum (km/jam)
                    <input
                      name="min-speed"
                      type="number"
                      min="1"
                      max="120"
                      value={etaSettings.minSpeedKmh}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          minSpeedKmh: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Kecepatan maksimum (km/jam)
                    <input
                      name="max-speed"
                      type="number"
                      min="1"
                      max="120"
                      value={etaSettings.maxSpeedKmh}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          maxSpeedKmh: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Posisi dianggap kedaluwarsa (detik)
                    <input
                      name="stale-threshold"
                      type="number"
                      min="1"
                      max="3600"
                      value={etaSettings.staleThresholdSeconds}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          staleThresholdSeconds: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Durasi berhenti rata-rata (detik)
                    <input
                      name="average-dwell-seconds"
                      type="number"
                      min="0"
                      max="600"
                      value={etaSettings.averageDwellSeconds ?? 30}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          averageDwellSeconds: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Pengali lalu lintas
                    <input
                      name="traffic-multiplier"
                      type="number"
                      min="1"
                      max="5"
                      step="0.05"
                      value={etaSettings.trafficMultiplier ?? 1}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          trafficMultiplier: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                  <label className="admin-field">
                    Ambang keyakinan (detik)
                    <input
                      name="confidence-threshold-seconds"
                      type="number"
                      min="1"
                      max="3600"
                      value={etaSettings.confidenceThresholdSeconds ?? 180}
                      onChange={(event) =>
                        setEtaSettings((current) => ({
                          ...current,
                          confidenceThresholdSeconds: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
              <fieldset className="admin-settings-group">
                <legend>Peta dan fitur</legend>
                <div className="admin-fields admin-fields--two">
                  <label className="admin-field">
                    Penyedia peta
                    <select
                      name="tile-provider"
                      value={mapSettings.tileProvider}
                      onChange={(event) => {
                        const tileProvider = event.currentTarget.value;
                        if (
                          tileProvider === 'carto_voyager' ||
                          tileProvider === 'osm' ||
                          tileProvider === 'pmtiles_r2'
                        ) {
                          setMapSettings((current) => ({
                            ...current,
                            tileProvider,
                          }));
                        }
                      }}
                    >
                      <option value="carto_voyager">CARTO Voyager</option>
                      <option value="osm">OpenStreetMap</option>
                      <option value="pmtiles_r2">Peta khusus (URL lingkungan)</option>
                    </select>
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={mapSettings.fallbackToOsm}
                      onChange={(event) =>
                        setMapSettings((current) => ({
                          ...current,
                          fallbackToOsm: event.target.checked,
                        }))
                      }
                    />
                    Gunakan OSM jika peta utama gagal
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={featureFlags.crowdReportingEnabled}
                      onChange={(event) =>
                        setFeatureFlags((current) => ({
                          ...current,
                          crowdReportingEnabled: event.target.checked,
                        }))
                      }
                    />
                    Aktifkan laporan mahasiswa
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={featureFlags.simulationMode}
                      onChange={(event) =>
                        setFeatureFlags((current) => ({
                          ...current,
                          simulationMode: event.target.checked,
                        }))
                      }
                    />
                    Paksa mode simulasi
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={featureFlags.maintenanceMode}
                      onChange={(event) =>
                        setFeatureFlags((current) => ({
                          ...current,
                          maintenanceMode: event.target.checked,
                        }))
                      }
                    />
                    Mode pemeliharaan
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={featureFlags.pushNotificationsEnabled ?? false}
                      onChange={(event) =>
                        setFeatureFlags((current) => ({
                          ...current,
                          pushNotificationsEnabled: event.target.checked,
                        }))
                      }
                    />
                    Aktifkan notifikasi penumpang
                  </label>
                  <label className="admin-day">
                    <input
                      type="checkbox"
                      checked={featureFlags.driverAccessRequestsEnabled ?? false}
                      onChange={(event) =>
                        setFeatureFlags((current) => ({
                          ...current,
                          driverAccessRequestsEnabled: event.target.checked,
                        }))
                      }
                    />
                    Izinkan permintaan akses driver
                  </label>
                </div>
              </fieldset>
              <fieldset className="admin-settings-group">
                <legend>Batas area kampus</legend>
                <div className="admin-fields admin-fields--three">
                  {([
                    ['minLat', 'Lintang minimum'],
                    ['maxLat', 'Lintang maksimum'],
                    ['minLng', 'Bujur minimum'],
                    ['maxLng', 'Bujur maksimum'],
                  ] as const).map(([key, label]) => (
                    <label className="admin-field" key={key}>
                      {label}
                      <input
                        name={key}
                        type="number"
                        step="0.000001"
                        value={geofenceSettings.campusBounds[key]}
                        onChange={(event) =>
                          setGeofenceSettings((current) => ({
                            ...current,
                            campusBounds: {
                              ...current.campusBounds,
                              [key]: Number(event.target.value),
                            },
                          }))
                        }
                        required
                      />
                    </label>
                  ))}
                  <label className="admin-field">
                    Jarak maksimum dari rute (km)
                    <input
                      name="max-distance"
                      type="number"
                      min="0.01"
                      max="10"
                      step="0.01"
                      value={geofenceSettings.maxDistanceFromRouteKm}
                      onChange={(event) =>
                        setGeofenceSettings((current) => ({
                          ...current,
                          maxDistanceFromRouteKm: Number(event.target.value),
                        }))
                      }
                      required
                    />
                  </label>
                </div>
              </fieldset>
              <p className="admin-help">
                Mengubah halte atau urutannya akan memperbarui rute yang dipakai peta dan ETA.
              </p>
              <button
                type="submit"
                className="admin-button admin-button--primary"
                disabled={saving}
              >
                {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
              </button>
            </form>
            <div className="admin-route-note">
              <MapPin size={18} aria-hidden="true" />
              <p>
                Rute jalan mengikuti daftar halte yang aktif. Untuk mengubah jalurnya,
                perbarui koordinat atau urutan halte.
              </p>
            </div>
          </section>
        )}

        <footer className="admin-footer">
          <span>LINUSKU, pengelolaan operasi</span>
          <span>Masuk sebagai {session.user.email}</span>
        </footer>
      </div>
    </main>
  );
}

function TablePagination({
  currentPage,
  pageCount,
  total,
  onPageChange,
}: {
  currentPage: number;
  pageCount: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (!total) return null;
  return (
    <nav className="admin-pagination" aria-label="Navigasi halaman tabel">
      <button
        type="button"
        className="admin-button admin-button--quiet"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage <= 1}
      >
        Sebelumnya
      </button>
      <span>
        Halaman {currentPage} dari {pageCount} · {total} data
      </span>
      <button
        type="button"
        className="admin-button admin-button--quiet"
        onClick={() => onPageChange(Math.min(pageCount, currentPage + 1))}
        disabled={currentPage >= pageCount}
      >
        Selanjutnya
      </button>
    </nav>
  );
}

async function downloadAdminFile(url: string, fallbackFilename: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(`Sesi admin tidak dapat dibaca: ${sessionError.message}`);
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error('Sesi admin sudah berakhir. Masuk kembali.');
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : `Unduhan gagal dengan status ${response.status}.`;
    throw new Error(message);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallbackFilename;
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function AdminDownloadButton({
  resource,
  label,
}: {
  resource: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <div className="admin-download-control">
      <button
        type="button"
        className="admin-button admin-button--quiet"
        disabled={busy}
        aria-busy={busy}
        onClick={() => {
          setBusy(true);
          setError('');
          void downloadAdminFile(
            `/api/admin/data?resource=${encodeURIComponent(resource)}`,
            `linusku-${resource}.csv`
          )
            .catch((reason: unknown) => setError(messageFromError(reason)))
            .finally(() => setBusy(false));
        }}
      >
        <Download size={16} aria-hidden="true" />
        {busy ? 'Mengunduh…' : label}
      </button>
      {error && <span className="admin-inline-error" role="alert">{error}</span>}
    </div>
  );
}

function DataTransferPanel({
  source,
  requestAdmin,
  onImported,
}: {
  source: TransferSource;
  requestAdmin: AdminRequester;
  onImported: (result: ImportResponse) => Promise<boolean>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const labels: Record<TransferSource, string> = {
    armada: 'armada',
    halte: 'halte',
    akun: 'akun',
  };

  const importFile = async () => {
    if (!file) {
      setError('Pilih file CSV atau JSON terlebih dahulu.');
      return;
    }
    if (
      !window.confirm(
        `Impor dapat membuat atau memperbarui data ${labels[source]}. Pastikan file sudah benar. Lanjutkan?`
      )
    ) {
      return;
    }
    setBusy(true);
    setError('');
    setResult(null);
    try {
      const text = await file.text();
      let body: { resource: TransferSource; csv?: string; rows?: unknown[] };
      if (file.name.toLocaleLowerCase('id-ID').endsWith('.json') || file.type.includes('json')) {
        const parsed: unknown = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('File JSON harus berisi array baris data.');
        body = { resource: source, rows: parsed };
      } else {
        body = { resource: source, csv: text };
      }
      const payload = await requestAdmin<ImportResponse>('/api/admin/data', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setResult(payload);
      await onImported(payload);
    } catch (reason) {
      setError(messageFromError(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-transfer-panel" aria-labelledby={`transfer-${source}`}>
      <div className="admin-transfer-heading">
        <div>
          <h3 id={`transfer-${source}`}>Transfer data {labels[source]}</h3>
          <p>Unduh template, ekspor data saat ini, atau impor CSV/JSON.</p>
        </div>
        <div className="admin-transfer-actions">
          <button
            type="button"
            className="admin-button admin-button--quiet"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              setError('');
              void downloadAdminFile(
                `/api/admin/data?resource=template&source=${source}`,
                `linusku-template-${source}.csv`
              )
                .catch((reason: unknown) => setError(messageFromError(reason)))
                .finally(() => setBusy(false));
            }}
          >
            <Download size={16} aria-hidden="true" />
            Unduh template CSV
          </button>
          <AdminDownloadButton resource={source} label="Ekspor CSV" />
        </div>
      </div>
      <div className="admin-import-row">
        <label className="admin-field">
          File CSV atau JSON
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setResult(null);
              setError('');
            }}
          />
        </label>
        <button
          type="button"
          className="admin-button admin-button--primary"
          disabled={busy || !file}
          aria-busy={busy}
          onClick={() => void importFile()}
        >
          <Upload size={16} aria-hidden="true" />
          {busy ? 'Memproses…' : 'Impor data'}
        </button>
      </div>
      <p className="admin-help">
        CSV mengikuti kolom template. JSON harus berupa array objek dengan kolom yang sama. Maksimal 500 baris per impor.
      </p>
      {error && <div className="admin-message admin-message--error" role="alert">{error}</div>}
      {result && (
        <div className="admin-import-result" role="status">
          <strong>
            {result.created} dibuat · {result.updated} diperbarui · {result.failed} gagal
          </strong>
          {result.results.length > 0 && (
            <details>
              <summary>Rincian per baris ({result.results.length})</summary>
              <ul>
                {result.results.map((row) => (
                  <li key={`${row.index}-${row.id ?? 'tanpa-id'}`} className={row.status === 'failed' ? 'is-failed' : ''}>
                    <span>Baris {row.index + 1}</span>
                    <strong>{row.id ?? 'Tanpa ID'}</strong>
                    <span>
                      {row.status === 'created'
                        ? 'Dibuat'
                        : row.status === 'updated'
                          ? 'Diperbarui'
                          : 'Gagal'}
                    </span>
                    {row.errors.length > 0 && <small>{row.errors.join('; ')}</small>}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}

function PositionReplay({
  history,
  busName,
}: {
  history: PositionHistory[];
  busName: string | null;
}) {
  const points = useMemo(
    () => [...history].sort((left, right) => left.recorded_at.localeCompare(right.recorded_at)),
    [history]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setActiveIndex(Math.max(0, points.length - 1));
    setPlaying(false);
  }, [points]);

  useEffect(() => {
    if (!playing || points.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => Math.min(current + 1, points.length - 1));
    }, 650);
    return () => window.clearInterval(timer);
  }, [playing, points.length]);

  useEffect(() => {
    if (playing && activeIndex >= points.length - 1) setPlaying(false);
  }, [activeIndex, playing, points.length]);

  if (!points.length) {
    return (
      <div className="admin-replay admin-replay--empty">
        <MapPin size={20} aria-hidden="true" />
        <p>Pilih satu armada dan terapkan filter untuk melihat replay rute.</p>
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padding = 28;
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latRange = Math.max(maxLat - minLat, 0.0001);
  const lngRange = Math.max(maxLng - minLng, 0.0001);
  const project = (point: PositionHistory) => ({
    x: padding + ((point.lng - minLng) / lngRange) * (width - padding * 2),
    y: height - padding - ((point.lat - minLat) / latRange) * (height - padding * 2),
  });
  const projected = points.map(project);
  const active = points[Math.min(activeIndex, points.length - 1)];
  const activePoint = projected[Math.min(activeIndex, projected.length - 1)];
  const polyline = projected.map((point) => `${point.x},${point.y}`).join(' ');
  const sampleStep = Math.max(1, Math.ceil(points.length / 12));

  return (
    <section className="admin-replay" aria-labelledby="replay-title">
      <div className="admin-replay-heading">
        <div>
          <h3 id="replay-title">Replay operasional {busName ?? active.bus_id}</h3>
          <p>{points.length} titik dari {formatDateTime(points[0].recorded_at)} hingga {formatDateTime(points[points.length - 1].recorded_at)}.</p>
        </div>
        <div className="admin-replay-controls">
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => {
              setActiveIndex(0);
              setPlaying(true);
            }}
            disabled={points.length < 2}
            aria-label="Mulai replay"
          >
            <Play size={16} aria-hidden="true" />
            Putar
          </button>
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => setPlaying((current) => !current)}
            disabled={points.length < 2}
            aria-label={playing ? 'Jeda replay' : 'Lanjutkan replay'}
          >
            {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
            {playing ? 'Jeda' : 'Lanjut'}
          </button>
          <button
            type="button"
            className="admin-button admin-button--quiet"
            onClick={() => {
              setPlaying(false);
              setActiveIndex(Math.max(0, points.length - 1));
            }}
            aria-label="Kembali ke titik terakhir"
          >
            <RotateCcw size={16} aria-hidden="true" />
            Ulang
          </button>
        </div>
      </div>
      <div className="admin-replay-visual">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-labelledby="replay-svg-title replay-svg-description"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id="replay-svg-title">Visualisasi lintasan GPS {active.bus_id}</title>
          <desc id="replay-svg-description">
            Garis menunjukkan arah perjalanan armada dan titik biru menunjukkan posisi saat ini.
          </desc>
          <rect className="admin-replay-canvas" x="0" y="0" width={width} height={height} />
          <polyline className="admin-replay-path" points={polyline} />
          {projected.map((point, index) => (
            <circle
              key={points[index].id}
              className="admin-replay-point"
              cx={point.x}
              cy={point.y}
              r={index === activeIndex ? 6 : 3}
            />
          ))}
          <circle className="admin-replay-active" cx={activePoint.x} cy={activePoint.y} r="8" />
        </svg>
        <div className="admin-replay-current">
          <span>{formatDateTime(active.recorded_at)}</span>
          <strong>{active.lat.toFixed(5)}, {active.lng.toFixed(5)}</strong>
          <small>{Math.round(active.speed_kmh)} km/j · {formatOccupancy(active.occupancy)}</small>
        </div>
      </div>
      <label className="admin-replay-slider">
        <span>Posisi replay</span>
        <input
          type="range"
          min="0"
          max={Math.max(0, points.length - 1)}
          value={Math.min(activeIndex, points.length - 1)}
          onChange={(event) => {
            setPlaying(false);
            setActiveIndex(Number(event.target.value));
          }}
          aria-valuetext={formatDateTime(active.recorded_at)}
        />
      </label>
      <ol className="admin-replay-timeline">
        {points.map((point, index) =>
          index % sampleStep === 0 || index === points.length - 1 ? (
            <li key={point.id} className={index === activeIndex ? 'is-active' : ''}>
              <span>{formatTime(point.recorded_at)}</span>
              <small>{Math.round(point.speed_kmh)} km/j</small>
            </li>
          ) : null
        )}
      </ol>
    </section>
  );
}

function FleetTable({
  buses,
  users,
  positionsByBus,
  now,
  staleThresholdSeconds,
  saving,
  compact = false,
  selectedIds,
  onToggleSelection,
  onSelectionChange,
  onEdit,
  onDelete,
}: {
  buses: AdminBus[];
  users: AdminUser[];
  positionsByBus: Map<string, AdminPosition>;
  now: number;
  staleThresholdSeconds: number;
  saving: boolean;
  compact?: boolean;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  onSelectionChange?: (ids: string[], selected: boolean) => void;
  onEdit: (bus: AdminBus) => void;
  onDelete: (bus: AdminBus) => void;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {selectedIds && onToggleSelection && (
              <th scope="col" className="admin-select-column">
                <input
                  type="checkbox"
                  aria-label="Pilih armada pada halaman ini"
                  checked={buses.length > 0 && buses.every((bus) => selectedIds.has(bus.id))}
                  onChange={(event) =>
                    onSelectionChange?.(
                      buses.map((bus) => bus.id),
                      event.target.checked
                    )
                  }
                />
              </th>
            )}
            <th scope="col">Armada</th>
            <th scope="col">Driver</th>
            <th scope="col">Posisi terakhir</th>
            <th scope="col">Kepadatan</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="admin-visually-hidden">Tindakan</span></th>
          </tr>
        </thead>
        <tbody>
          {buses.map((bus) => {
            const position = positionsByBus.get(bus.id);
            const driver = users.find((user) => user.id === bus.driver_id);
            const isFresh =
              Boolean(position) &&
              now - new Date(position?.updated_at ?? '').getTime() <= staleThresholdSeconds * 1000;
            return (
              <tr key={bus.id} className={selectedIds?.has(bus.id) ? 'is-selected' : ''}>
                {selectedIds && onToggleSelection && (
                  <td data-label="Pilih" className="admin-select-column">
                    <input
                      type="checkbox"
                      aria-label={`Pilih armada ${bus.id}`}
                      checked={selectedIds.has(bus.id)}
                      onChange={() => onToggleSelection(bus.id)}
                    />
                  </td>
                )}
                <td data-label="Armada">
                  <strong>{bus.id}</strong>
                  <small>{bus.name}</small>
                  {!compact && bus.plate_number && (
                    <small>Nomor kendaraan: {bus.plate_number}</small>
                  )}
                </td>
                <td data-label="Driver">
                  {driver
                    ? driver.fullName || driver.email
                    : bus.driver_id
                      ? 'Driver ditugaskan'
                      : 'Belum ditugaskan'}
                </td>
                <td data-label="Posisi terakhir" className="admin-number">
                  {position
                    ? `${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
                    : 'Belum ada GPS'}
                  {position && (
                    <>
                      <small>{ageLabel(position.updated_at, now)}</small>
                      <small>Sumber posisi: {position.source_type}</small>
                      <small>Kecepatan: {Math.round(position.speed_kmh)} km/j</small>
                    </>
                  )}
                </td>
                <td data-label="Kepadatan">
                  {position ? formatOccupancy(position.occupancy) : 'Belum ada data'}
                </td>
                <td data-label="Status">
                  {!bus.is_active
                    ? 'Nonaktif'
                    : isFresh
                      ? 'GPS aktif'
                      : position
                        ? 'Data lama'
                        : 'Menunggu GPS'}
                </td>
                <td data-label="Tindakan" className="admin-actions-cell">
                  <button
                    type="button"
                    className="admin-button admin-button--quiet"
                    onClick={() => onEdit(bus)}
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    className="admin-button admin-button--danger"
                    onClick={() => onDelete(bus)}
                    disabled={saving || bus.is_active}
                    title={bus.is_active ? 'Nonaktifkan armada sebelum menghapusnya' : undefined}
                    aria-label={`Hapus armada ${bus.id}`}
                  >
                    Hapus
                  </button>
                  {bus.is_active && <small>Nonaktifkan dahulu</small>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!buses.length && (
        <EmptyState
          title="Belum ada armada"
          detail="Tambahkan bus sebelum mengatur penugasan driver."
        />
      )}
    </div>
  );
}

function EmptyState({
  title,
  detail,
  action,
  onAction,
}: {
  title: string;
  detail: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="admin-empty">
      <Activity size={20} aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <p>{detail}</p>
      </div>
      {action && onAction && (
        <button type="button" className="admin-button admin-button--quiet" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  );
}
