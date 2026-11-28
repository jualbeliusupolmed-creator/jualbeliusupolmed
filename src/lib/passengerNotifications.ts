export const PASSENGER_NOTIFICATION_OPT_IN_KEY =
  'linusku:passengerNotificationsEnabled';
export const FAVORITE_STOPS_STORAGE_KEY = 'linusku:favoriteStopIds';
export const DEFAULT_NOTIFICATION_THRESHOLD_MINUTES = 10;
export const DEFAULT_NOTIFICATION_DEDUPE_WINDOW_MINUTES = 15;

export type NotificationPermissionState =
  | 'default'
  | 'granted'
  | 'denied'
  | 'unsupported';

export type PassengerNotificationStatus =
  | 'sent'
  | 'duplicate'
  | 'threshold-not-met'
  | 'not-opted-in'
  | 'permission-denied'
  | 'permission-required'
  | 'unsupported'
  | 'invalid-departure'
  | 'failed';

export interface NextDeparture {
  stopId: string;
  stopName: string;
  busId: string;
  busName?: string;
  etaMinutes: number;
}

export interface PassengerNotificationOptions {
  thresholdMinutes?: number;
  dedupeWindowMinutes?: number;
  now?: () => number;
  notificationFactory?: (
    title: string,
    options: NotificationOptions
  ) => Notification;
}

export interface NextDepartureNotificationOptions
  extends PassengerNotificationOptions {
  stopIds?: readonly string[];
  limit?: number;
}

export interface PassengerNotificationAvailability {
  supported: boolean;
  permission: NotificationPermissionState;
  optedIn: boolean;
}

export interface PassengerNotificationResult {
  status: PassengerNotificationStatus;
  permission: NotificationPermissionState;
  optedIn: boolean;
  departure: NextDeparture | null;
  notification: Notification | null;
  message: string;
}

export type EtaUrlActionStatus =
  | 'copied'
  | 'shared'
  | 'cancelled'
  | 'unsupported'
  | 'failed';

export interface EtaUrlResult {
  status: EtaUrlActionStatus;
  url: string;
  message: string;
}

export interface EtaUrlOptions {
  baseUrl?: string;
}

export interface CopyEtaUrlOptions extends EtaUrlOptions {
  clipboard?: Pick<Clipboard, 'writeText'>;
}

export interface ShareEtaUrlOptions extends EtaUrlOptions {
  share?: (data: ShareData) => Promise<void>;
}

interface NotificationApi {
  permission: NotificationPermission;
  requestPermission?: () => Promise<NotificationPermission>;
  new (title: string, options?: NotificationOptions): Notification;
}

interface BrowserWindow extends Window {
  Notification?: NotificationApi;
}

const notificationHistory = new Map<string, number>();

function getBrowserWindow(): BrowserWindow | null {
  return typeof window === 'undefined' ? null : (window as BrowserWindow);
}

function getNotificationApi(): NotificationApi | null {
  const browserWindow = getBrowserWindow();
  if (!browserWindow || typeof browserWindow.Notification === 'undefined') {
    return null;
  }
  return browserWindow.Notification;
}

function getDefaultStorage(): Storage | null {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return null;
  try {
    return browserWindow.localStorage;
  } catch {
    return null;
  }
}

function readStorageItem(storage: Storage | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorageItem(
  storage: Storage | null,
  key: string,
  value: string
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function isPermissionState(value: unknown): value is NotificationPermission {
  return value === 'default' || value === 'denied' || value === 'granted';
}

function normalizeThresholdMinutes(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_NOTIFICATION_THRESHOLD_MINUTES;
  }
  return value;
}

function normalizeDedupeWindowMinutes(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return DEFAULT_NOTIFICATION_DEDUPE_WINDOW_MINUTES;
  }
  return value;
}

function isValidDeparture(departure: NextDeparture): boolean {
  return (
    typeof departure.stopId === 'string' &&
    departure.stopId.trim().length > 0 &&
    typeof departure.stopName === 'string' &&
    departure.stopName.trim().length > 0 &&
    typeof departure.busId === 'string' &&
    departure.busId.trim().length > 0 &&
    typeof departure.etaMinutes === 'number' &&
    Number.isFinite(departure.etaMinutes) &&
    departure.etaMinutes >= 0
  );
}

function notificationKey(stopId: string, busId: string): string {
  return JSON.stringify([stopId.trim(), busId.trim()]);
}

export function getNotificationPermissionState(): NotificationPermissionState {
  const api = getNotificationApi();
  if (!api) return 'unsupported';
  return isPermissionState(api.permission) ? api.permission : 'default';
}

export async function askNotificationPermission(): Promise<NotificationPermissionState> {
  const api = getNotificationApi();
  if (!api) return 'unsupported';
  if (api.permission === 'granted' || api.permission === 'denied') {
    return api.permission;
  }
  if (typeof api.requestPermission !== 'function') return 'default';
  try {
    const permission = await api.requestPermission();
    return isPermissionState(permission) ? permission : 'default';
  } catch {
    return 'default';
  }
}

export function isPassengerNotificationsOptedIn(): boolean {
  return (
    readStorageItem(
      getDefaultStorage(),
      PASSENGER_NOTIFICATION_OPT_IN_KEY
    ) === 'true'
  );
}

export function setPassengerNotificationsOptedIn(enabled: boolean): boolean {
  return writeStorageItem(
    getDefaultStorage(),
    PASSENGER_NOTIFICATION_OPT_IN_KEY,
    String(enabled)
  );
}

export function getPassengerNotificationAvailability(): PassengerNotificationAvailability {
  const permission = getNotificationPermissionState();
  return {
    supported: permission !== 'unsupported',
    permission,
    optedIn: isPassengerNotificationsOptedIn(),
  };
}

export function getFavoriteStopIds(): string[] {
  const stored = readStorageItem(getDefaultStorage(), FAVORITE_STOPS_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return Array.from(
      new Set(
        parsed.filter(
          (id): id is string =>
            typeof id === 'string' && id.trim().length > 0
        )
      )
    );
  } catch {
    return [];
  }
}

export function setFavoriteStopIds(stopIds: readonly string[]): string[] {
  const normalized = Array.from(
    new Set(
      stopIds.filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    )
  );
  writeStorageItem(
    getDefaultStorage(),
    FAVORITE_STOPS_STORAGE_KEY,
    JSON.stringify(normalized)
  );
  return normalized;
}

export function toggleFavoriteStop(stopId: string): string[] {
  const normalizedStopId = stopId.trim();
  if (!normalizedStopId) return getFavoriteStopIds();
  const current = getFavoriteStopIds();
  const next = current.includes(normalizedStopId)
    ? current.filter((id) => id !== normalizedStopId)
    : [...current, normalizedStopId];
  return setFavoriteStopIds(next);
}

export function isFavoriteStop(stopId: string): boolean {
  const normalizedStopId = stopId.trim();
  return getFavoriteStopIds().includes(normalizedStopId);
}

export function isWithinNotificationThreshold(
  etaMinutes: number,
  thresholdMinutes: number = DEFAULT_NOTIFICATION_THRESHOLD_MINUTES
): boolean {
  return (
    Number.isFinite(etaMinutes) &&
    etaMinutes >= 0 &&
    etaMinutes <= normalizeThresholdMinutes(thresholdMinutes)
  );
}

export function selectNextDepartures(
  departures: readonly NextDeparture[],
  stopIds?: readonly string[]
): NextDeparture[] {
  const allowedStopIds = stopIds
    ? new Set(stopIds.map((id) => id.trim()).filter(Boolean))
    : null;
  const nearestByStop = new Map<string, NextDeparture>();

  for (const departure of departures) {
    if (!isValidDeparture(departure)) continue;
    if (allowedStopIds && !allowedStopIds.has(departure.stopId.trim())) {
      continue;
    }
    const key = departure.stopId.trim();
    const current = nearestByStop.get(key);
    if (
      !current ||
      departure.etaMinutes < current.etaMinutes ||
      (departure.etaMinutes === current.etaMinutes &&
        departure.busId.localeCompare(current.busId) < 0)
    ) {
      nearestByStop.set(key, departure);
    }
  }

  return Array.from(nearestByStop.values()).sort(
    (left, right) =>
      left.etaMinutes - right.etaMinutes ||
      left.stopId.localeCompare(right.stopId) ||
      left.busId.localeCompare(right.busId)
  );
}

export function clearPassengerNotificationHistory(): void {
  notificationHistory.clear();
}

export async function showPassengerNotification(
  departure: NextDeparture,
  options: PassengerNotificationOptions = {}
): Promise<PassengerNotificationResult> {
  const permission = getNotificationPermissionState();
  const optedIn = isPassengerNotificationsOptedIn();
  const baseResult = {
    permission,
    optedIn,
    departure,
    notification: null,
  };

  if (permission === 'unsupported') {
    return {
      ...baseResult,
      status: 'unsupported',
      message: 'Notifikasi browser tidak didukung pada perangkat ini.',
    };
  }
  if (!optedIn) {
    return {
      ...baseResult,
      status: 'not-opted-in',
      message: 'Notifikasi penumpang belum diaktifkan.',
    };
  }
  if (permission === 'denied') {
    return {
      ...baseResult,
      status: 'permission-denied',
      message: 'Izin notifikasi browser telah ditolak.',
    };
  }
  if (permission === 'default') {
    return {
      ...baseResult,
      status: 'permission-required',
      message: 'Izin notifikasi browser diperlukan.',
    };
  }
  if (!isValidDeparture(departure)) {
    return {
      ...baseResult,
      status: 'invalid-departure',
      message: 'Data keberangkatan berikutnya tidak valid.',
    };
  }
  if (
    !isWithinNotificationThreshold(
      departure.etaMinutes,
      options.thresholdMinutes
    )
  ) {
    return {
      ...baseResult,
      status: 'threshold-not-met',
      message: 'ETA belum berada dalam ambang notifikasi.',
    };
  }

  const now = options.now?.() ?? Date.now();
  const key = notificationKey(departure.stopId, departure.busId);
  const lastNotifiedAt = notificationHistory.get(key);
  const dedupeWindowMs =
    normalizeDedupeWindowMinutes(options.dedupeWindowMinutes) * 60_000;
  if (
    lastNotifiedAt !== undefined &&
    dedupeWindowMs > 0 &&
    now - lastNotifiedAt >= 0 &&
    now - lastNotifiedAt < dedupeWindowMs
  ) {
    return {
      ...baseResult,
      status: 'duplicate',
      message: 'Notifikasi keberangkatan ini baru saja dikirim.',
    };
  }

  const api = getNotificationApi();
  if (!api) {
    return {
      ...baseResult,
      status: 'unsupported',
      message: 'Notifikasi browser tidak didukung pada perangkat ini.',
    };
  }

  const busLabel = departure.busName?.trim() || `Bus ${departure.busId.trim()}`;
  const title = `Bus ${departure.busId.trim()} menuju ${departure.stopName.trim()}`;
  const body = `${busLabel} diperkirakan tiba dalam ${departure.etaMinutes} menit.`;
  const notificationOptions: NotificationOptions = {
    body,
    tag: `linusku:${departure.stopId.trim()}:${departure.busId.trim()}`,
  };

  try {
    const notification = options.notificationFactory
      ? options.notificationFactory(title, notificationOptions)
      : new api(title, notificationOptions);
    notificationHistory.set(key, now);
    return {
      ...baseResult,
      status: 'sent',
      notification,
      message: 'Notifikasi keberangkatan berhasil dikirim.',
    };
  } catch {
    return {
      ...baseResult,
      status: 'failed',
      message: 'Notifikasi keberangkatan gagal dikirim.',
    };
  }
}

export async function generateNextDepartureNotifications(
  departures: readonly NextDeparture[],
  options: NextDepartureNotificationOptions = {}
): Promise<PassengerNotificationResult[]> {
  let selected = selectNextDepartures(departures, options.stopIds);
  if (typeof options.limit === 'number' && Number.isFinite(options.limit)) {
    selected = selected.slice(0, Math.max(0, Math.floor(options.limit)));
  }
  return Promise.all(
    selected.map((departure) => showPassengerNotification(departure, options))
  );
}

function getBrowserOrigin(): string | null {
  const browserWindow = getBrowserWindow();
  if (!browserWindow) return null;
  try {
    return browserWindow.location?.origin || null;
  } catch {
    return null;
  }
}

function isAbsoluteUrl(value: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value);
}

export function buildEtaUrl(stopId: string, baseUrl?: string): string {
  const normalizedStopId = stopId.trim();
  if (!normalizedStopId) {
    throw new TypeError('stopId wajib diisi.');
  }
  const origin = getBrowserOrigin();
  const base = baseUrl?.trim() || '/linusku';
  let url: URL;
  try {
    url = origin
      ? new URL(base, origin)
      : new URL(base, 'http://linusku.local');
  } catch {
    throw new TypeError('baseUrl tidak valid.');
  }
  url.searchParams.set('stop', normalizedStopId);
  if (origin || isAbsoluteUrl(base)) return url.toString();
  return `${url.pathname}${url.search}${url.hash}`;
}

function getNavigator(): Navigator | null {
  return typeof navigator === 'undefined' ? null : navigator;
}

function legacyCopy(text: string): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied =
      typeof document.execCommand === 'function' && document.execCommand('copy');
  } catch {
    copied = false;
  }
  textarea.remove();
  return copied;
}

export async function copyEtaUrl(
  stopId: string,
  options: CopyEtaUrlOptions = {}
): Promise<EtaUrlResult> {
  const url = buildEtaUrl(stopId, options.baseUrl);
  const browserNavigator = getNavigator();
  const clipboard = options.clipboard ?? browserNavigator?.clipboard;
  if (clipboard && typeof clipboard.writeText === 'function') {
    try {
      await clipboard.writeText(url);
      return {
        status: 'copied',
        url,
        message: 'Tautan ETA berhasil disalin.',
      };
    } catch {
      if (legacyCopy(url)) {
        return {
          status: 'copied',
          url,
          message: 'Tautan ETA berhasil disalin.',
        };
      }
      return {
        status: 'failed',
        url,
        message: 'Tautan ETA gagal disalin.',
      };
    }
  }
  if (legacyCopy(url)) {
    return {
      status: 'copied',
      url,
      message: 'Tautan ETA berhasil disalin.',
    };
  }
  return {
    status: 'unsupported',
    url,
    message: 'API salin tidak tersedia pada perangkat ini.',
  };
}

export async function shareEtaUrl(
  stopId: string,
  options: ShareEtaUrlOptions = {}
): Promise<EtaUrlResult> {
  const url = buildEtaUrl(stopId, options.baseUrl);
  const browserNavigator = getNavigator();
  const share = options.share ?? browserNavigator?.share?.bind(browserNavigator);
  if (!share) {
    return copyEtaUrl(stopId, options);
  }

  try {
    await share({
      title: 'LINUSKU ETA',
      text: 'Lihat perkiraan waktu tiba bus LINUSKU.',
      url,
    });
    return {
      status: 'shared',
      url,
      message: 'Tautan ETA berhasil dibagikan.',
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        status: 'cancelled',
        url,
        message: 'Pembagian tautan ETA dibatalkan.',
      };
    }
    const copied = await copyEtaUrl(stopId, options);
    if (copied.status === 'copied') {
      return {
        ...copied,
        message: 'Tautan ETA berhasil disalin.',
      };
    }
    return {
      status: 'failed',
      url,
      message: 'Tautan ETA gagal dibagikan.',
    };
  }
}
