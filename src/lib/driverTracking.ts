export const DRIVER_TRACKING_STORAGE_KEY = 'linusku:driver-gps-outbox:v1';
export const DRIVER_TRACKING_MAX_QUEUE_SIZE = 500;
export const DRIVER_TRACKING_RETRY_BASE_MS = 1_000;
export const DRIVER_TRACKING_RETRY_MAX_MS = 30_000;

export type DriverDeliveryStatus =
  | 'idle'
  | 'preparing'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'retry'
  | 'offline'
  | 'error';

export type DeliveryStatus = DriverDeliveryStatus;
export type DriverOccupancy = 'low' | 'medium' | 'full';
export type DriverSourceType = 'driver' | 'device' | 'simulator' | 'crowd';

export interface DriverGpsSample {
  busId: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  occupancy: DriverOccupancy;
  sourceType: DriverSourceType;
  capturedAt: number;
}

export interface PendingGpsSample {
  id: string;
  busId: string;
  sample: DriverGpsSample;
  attemptCount: number;
  nextAttemptAt: number;
  lastError: string | null;
  queuedAt: number;
  updatedAt: number;
}

export interface DriverDeliveryAcknowledgement {
  busId: string;
  serverTimestamp: string;
}

export interface DriverDeliveryAck {
  serverTimestamp: string | number;
}

export type DriverSendResult =
  | DriverDeliveryAck
  | string
  | number
  | Date;

export interface DriverSendContext {
  attempt: number;
  queuedAt: number;
}

export type DriverSendCallback = (
  sample: DriverGpsSample,
  context: DriverSendContext
) => Promise<DriverSendResult>;

export interface DriverTrackingStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface DriverTrackingOptions {
  storageKey?: string;
  maxQueueSize?: number;
  retryBaseMs?: number;
  retryMaxMs?: number;
  send?: DriverSendCallback;
  autoFlushOnOnline?: boolean;
  now?: () => number;
  storage?: DriverTrackingStorage | null;
}

export interface DriverDeliveryState {
  status: DriverDeliveryStatus;
  online: boolean;
  queue: readonly PendingGpsSample[];
  pending: PendingGpsSample | null;
  lastAcknowledgement: DriverDeliveryAcknowledgement | null;
  lastError: string | null;
  retryAt: number | null;
}

export interface DriverEnqueueResult {
  accepted: boolean;
  persisted: boolean;
  item: PendingGpsSample | null;
  reason?: 'invalid-sample' | 'queue-full' | 'storage-error';
  error?: string;
}

export interface DriverFlushError {
  busId: string;
  error: string;
}

export interface DriverFlushResult {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  errors: DriverFlushError[];
}

export interface DriverPositionPayload {
  bus_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading: number;
  occupancy: DriverOccupancy;
  source_type: DriverSourceType;
  updated_at: string;
}

export type DriverTrackingListener = (state: DriverDeliveryState) => void;

interface StoredDriverQueue {
  version: 1;
  items: PendingGpsSample[];
}

interface StorageObserver {
  owner: string;
  callback: (storageKey: string) => void;
}

const storageObservers = new Set<StorageObserver>();
const flushOperationTails = new Map<string, Promise<void>>();
let operationTail: Promise<void> = Promise.resolve();
let identifierCounter = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isOccupancy(value: unknown): value is DriverOccupancy {
  return value === 'low' || value === 'medium' || value === 'full';
}

function isSourceType(value: unknown): value is DriverSourceType {
  return (
    value === 'driver' ||
    value === 'device' ||
    value === 'simulator' ||
    value === 'crowd'
  );
}

function normalizeHeading(value: number): number {
  const normalized = value % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function normalizeSample(value: unknown): DriverGpsSample | null {
  if (!isRecord(value)) return null;

  const busId = typeof value.busId === 'string' ? value.busId.trim() : '';
  if (
    !busId ||
    busId.length > 128 ||
    !isFiniteNumber(value.lat) ||
    value.lat < -90 ||
    value.lat > 90 ||
    !isFiniteNumber(value.lng) ||
    value.lng < -180 ||
    value.lng > 180 ||
    !isFiniteNumber(value.speedKmh) ||
    value.speedKmh < 0 ||
    !isFiniteNumber(value.heading) ||
    !isOccupancy(value.occupancy) ||
    !isSourceType(value.sourceType) ||
    !isFiniteNumber(value.capturedAt) ||
    value.capturedAt <= 0
  ) {
    return null;
  }

  return {
    busId,
    lat: value.lat,
    lng: value.lng,
    speedKmh: value.speedKmh,
    heading: normalizeHeading(value.heading),
    occupancy: value.occupancy,
    sourceType: value.sourceType,
    capturedAt: value.capturedAt,
  };
}

function normalizePending(value: unknown): PendingGpsSample | null {
  if (!isRecord(value)) return null;

  const sample = normalizeSample(value.sample);
  const id = typeof value.id === 'string' ? value.id : '';
  const busId = typeof value.busId === 'string' ? value.busId.trim() : '';
  if (
    !sample ||
    !id ||
    id.length > 200 ||
    !busId ||
    busId !== sample.busId ||
    !Number.isInteger(value.attemptCount) ||
    (value.attemptCount as number) < 0 ||
    !isFiniteNumber(value.nextAttemptAt) ||
    value.nextAttemptAt < 0 ||
    !isFiniteNumber(value.queuedAt) ||
    value.queuedAt <= 0 ||
    !isFiniteNumber(value.updatedAt) ||
    value.updatedAt <= 0
  ) {
    return null;
  }

  const lastError =
    typeof value.lastError === 'string' && value.lastError.length <= 1_000
      ? value.lastError
      : null;

  return {
    id,
    busId,
    sample,
    attemptCount: value.attemptCount as number,
    nextAttemptAt: value.nextAttemptAt,
    lastError,
    queuedAt: value.queuedAt,
    updatedAt: value.updatedAt,
  };
}

function parseStoredQueue(
  raw: string | null,
  maxQueueSize: number
): PendingGpsSample[] {
  if (!raw) return [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }

  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !Array.isArray(parsed.items)
  ) {
    return [];
  }

  const byBus = new Map<string, PendingGpsSample>();
  for (const value of parsed.items) {
    const item = normalizePending(value);
    if (item) byBus.set(item.busId, item);
  }

  return Array.from(byBus.values())
    .sort((left, right) => left.queuedAt - right.queuedAt)
    .slice(0, maxQueueSize);
}

function clonePending(item: PendingGpsSample): PendingGpsSample {
  return {
    ...item,
    sample: { ...item.sample },
  };
}

function cloneSample(sample: DriverGpsSample): DriverGpsSample {
  return { ...sample };
}

function getDefaultStorage(): DriverTrackingStorage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  try {
    const candidate = (globalThis as typeof globalThis & {
      localStorage?: DriverTrackingStorage;
    }).localStorage;
    return candidate ?? null;
  } catch {
    return null;
  }
}

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine !== false;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return String(error || 'Unknown error');
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (!isFiniteNumber(value) || value <= 0) return fallback;
  return Math.max(1, Math.floor(value));
}

function positiveDuration(value: number | undefined, fallback: number): number {
  if (!isFiniteNumber(value) || value <= 0) return fallback;
  return Math.floor(value);
}

function normalizeServerTimestamp(value: unknown): string {
  let date: Date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'number') {
    date = new Date(value);
  } else if (typeof value === 'string') {
    date = new Date(value);
  } else {
    throw new Error('Server acknowledgement timestamp is missing');
  }

  if (!Number.isFinite(date.getTime())) {
    throw new Error('Server acknowledgement timestamp is invalid');
  }
  return date.toISOString();
}

function normalizeAcknowledgement(
  value: DriverSendResult
): DriverDeliveryAcknowledgement['serverTimestamp'] {
  if (value instanceof Date || typeof value === 'number' || typeof value === 'string') {
    return normalizeServerTimestamp(value);
  }
  if (isRecord(value) && 'serverTimestamp' in value) {
    return normalizeServerTimestamp(value.serverTimestamp);
  }
  throw new Error('Server acknowledgement timestamp is missing');
}

function generateIdentifier(now: number): string {
  identifierCounter += 1;
  return `${now.toString(36)}-${identifierCounter.toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

async function withGlobalOperationLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = operationTail.then(operation, operation);
  operationTail = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function withKeyedFlushLock<T>(
  storageKey: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = flushOperationTails.get(storageKey) ?? Promise.resolve();
  let release = (): void => undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  flushOperationTails.set(storageKey, tail);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (flushOperationTails.get(storageKey) === tail) {
      flushOperationTails.delete(storageKey);
    }
  }
}

export function calculateRetryDelayMs(
  attemptCount: number,
  baseMs = DRIVER_TRACKING_RETRY_BASE_MS,
  maxMs = DRIVER_TRACKING_RETRY_MAX_MS
): number {
  const safeBase = positiveDuration(baseMs, DRIVER_TRACKING_RETRY_BASE_MS);
  const safeMax = positiveDuration(maxMs, DRIVER_TRACKING_RETRY_MAX_MS);
  const safeAttempt = positiveInteger(attemptCount, 1);
  const exponent = Math.min(safeAttempt - 1, 30);
  return Math.min(safeMax, safeBase * 2 ** exponent);
}

export function toDriverPositionPayload(
  value: DriverGpsSample | PendingGpsSample
): DriverPositionPayload {
  const sample = 'sample' in value ? value.sample : value;
  return {
    bus_id: sample.busId,
    lat: sample.lat,
    lng: sample.lng,
    speed_kmh: sample.speedKmh,
    heading: normalizeHeading(sample.heading),
    occupancy: sample.occupancy,
    source_type: sample.sourceType,
    updated_at: new Date(sample.capturedAt).toISOString(),
  };
}

export function formatRelativeTime(
  value: string | number | Date,
  now = Date.now()
): string {
  const timestamp =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'number'
        ? value
        : Date.parse(value);
  if (!Number.isFinite(timestamp) || !Number.isFinite(now)) return '-';

  const difference = now - timestamp;
  const absoluteSeconds = Math.abs(difference);
  if (absoluteSeconds < 45_000) {
    return difference >= 0 ? 'baru saja' : 'sebentar lagi';
  }

  const future = difference < 0;
  const minutes = Math.floor(absoluteSeconds / 60_000);
  if (minutes < 60) {
    return future ? `${minutes} menit lagi` : `${minutes} menit lalu`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return future ? `${hours} jam lagi` : `${hours} jam lalu`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return future ? `${days} hari lagi` : `${days} hari lalu`;
  }

  const months = Math.floor(days / 30);
  if (months < 12) {
    return future ? `${months} bulan lagi` : `${months} bulan lalu`;
  }

  const years = Math.floor(months / 12);
  return future ? `${years} tahun lagi` : `${years} tahun lalu`;
}

export class DriverTrackingManager {
  private readonly storageKey: string;
  private readonly maxQueueSize: number;
  private readonly retryBaseMs: number;
  private readonly retryMaxMs: number;
  private readonly now: () => number;
  private readonly autoFlushOnOnline: boolean;
  private readonly ownerId = generateIdentifier(Date.now());
  private readonly storage: DriverTrackingStorage | null;
  private readonly listeners = new Set<DriverTrackingListener>();
  private queue: PendingGpsSample[];
  private status: DriverDeliveryStatus;
  private online: boolean;
  private sender: DriverSendCallback | undefined;
  private lastAcknowledgement: DriverDeliveryAcknowledgement | null = null;
  private lastError: string | null = null;
  private retryAt: number | null = null;
  private flushPromise: Promise<DriverFlushResult> | null = null;
  private disposed = false;

  constructor(options: DriverTrackingOptions = {}) {
    this.storageKey =
      options.storageKey?.trim() || DRIVER_TRACKING_STORAGE_KEY;
    this.maxQueueSize = positiveInteger(
      options.maxQueueSize,
      DRIVER_TRACKING_MAX_QUEUE_SIZE
    );
    this.retryBaseMs = positiveDuration(
      options.retryBaseMs,
      DRIVER_TRACKING_RETRY_BASE_MS
    );
    this.retryMaxMs = positiveDuration(
      options.retryMaxMs,
      DRIVER_TRACKING_RETRY_MAX_MS
    );
    this.now = options.now ?? Date.now;
    this.autoFlushOnOnline = options.autoFlushOnOnline ?? true;
    this.sender = options.send;
    this.storage =
      options.storage === undefined ? getDefaultStorage() : options.storage;
    this.online = isOnline();
    this.queue = this.readStoredQueue() ?? [];

    const now = this.now();
    this.retryAt = this.earliestRetryAt(this.queue, now);
    this.status = !this.online
      ? 'offline'
      : this.queue.length > 0
        ? this.retryAt !== null && this.retryAt > now
          ? 'retry'
          : 'queued'
        : 'idle';

    storageObservers.add({
      owner: this.ownerId,
      callback: (storageKey) => {
        if (storageKey === this.storageKey) this.reloadFromStorage();
      },
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      window.addEventListener('storage', this.handleStorageEvent);
    }
  }

  subscribe(listener: DriverTrackingListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): DriverDeliveryState {
    const queue = this.queue.map(clonePending);
    return {
      status: this.status,
      online: this.online,
      queue,
      pending: queue[0] ?? null,
      lastAcknowledgement: this.lastAcknowledgement
        ? { ...this.lastAcknowledgement }
        : null,
      lastError: this.lastError,
      retryAt: this.retryAt,
    };
  }

  setSender(sender: DriverSendCallback | undefined): void {
    this.sender = sender;
  }

  async enqueue(sample: DriverGpsSample): Promise<DriverEnqueueResult> {
    const normalized = normalizeSample(sample);
    if (!normalized) {
      const error = 'Invalid GPS sample';
      this.lastError = error;
      this.status = 'error';
      this.notify();
      return {
        accepted: false,
        persisted: false,
        item: null,
        reason: 'invalid-sample',
        error,
      };
    }

    return this.withLock(async () => {
      const base = this.readStoredQueue() ?? this.queue.slice();
      const existingIndex = base.findIndex(
        (item) => item.busId === normalized.busId
      );
      const queuedAt = this.now();
      const item: PendingGpsSample = {
        id: generateIdentifier(queuedAt),
        busId: normalized.busId,
        sample: normalized,
        attemptCount: 0,
        nextAttemptAt: queuedAt,
        lastError: null,
        queuedAt,
        updatedAt: queuedAt,
      };

      if (existingIndex < 0 && base.length >= this.maxQueueSize) {
        const error = `GPS outbox is full (${this.maxQueueSize} buses)`;
        this.lastError = error;
        this.status = 'error';
        this.notify();
        return {
          accepted: false,
          persisted: false,
          item: null,
          reason: 'queue-full',
          error,
        };
      }

      const next = existingIndex < 0
        ? [...base, item]
        : base.map((current) => (current.busId === normalized.busId ? item : current));

      if (this.storage) {
        try {
          this.persist(next);
        } catch (error) {
          const message = errorMessage(error);
          this.lastError = message;
          this.status = this.online ? 'error' : 'offline';
          this.notify();
          return {
            accepted: false,
            persisted: false,
            item: null,
            reason: 'storage-error',
            error: message,
          };
        }
      }

      this.commitQueue(next, 'queued');
      this.lastError = null;
      if (!this.online) this.status = 'offline';
      this.notify();
      this.publishStorageChange();
      return {
        accepted: true,
        persisted: this.storage !== null,
        item: clonePending(item),
      };
    });
  }

  async flush(): Promise<DriverFlushResult> {
    if (this.disposed) {
      return this.emptyFlushResult();
    }
    if (this.flushPromise) return this.flushPromise;

    const operation = this.performFlush();
    this.flushPromise = operation;
    try {
      return await operation;
    } finally {
      if (this.flushPromise === operation) this.flushPromise = null;
    }
  }

  async markSent(
    busId: string,
    serverTimestamp: string | number | Date
  ): Promise<boolean> {
    const normalizedBusId = busId.trim();
    if (!normalizedBusId) return false;

    let acknowledgement: string;
    try {
      acknowledgement = normalizeServerTimestamp(serverTimestamp);
    } catch {
      return false;
    }

    return this.withLock(async () => {
      const result = await this.markSentInternal(
        normalizedBusId,
        acknowledgement
      );
      return result.removed;
    });
  }

  async clear(): Promise<boolean> {
    return this.withLock(async () => {
      const base = this.readStoredQueue() ?? this.queue.slice();
      if (this.storage) {
        try {
          this.persist([]);
        } catch (error) {
          this.lastError = errorMessage(error);
          this.status = this.online ? 'error' : 'offline';
          this.notify();
          return false;
        }
      }

      this.commitQueue(base, 'idle');
      this.queue = [];
      this.lastAcknowledgement = null;
      this.lastError = null;
      this.retryAt = null;
      this.status = this.online ? 'idle' : 'offline';
      this.notify();
      this.publishStorageChange();
      return true;
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('storage', this.handleStorageEvent);
    }

    for (const observer of storageObservers) {
      if (observer.owner === this.ownerId) storageObservers.delete(observer);
    }
    this.listeners.clear();
  }

  private readonly handleOnline = (): void => {
    this.online = true;
    this.status = this.queue.length > 0 ? 'queued' : 'idle';
    this.lastError = null;
    this.notify();

    if (this.autoFlushOnOnline && this.sender && this.queue.length > 0) {
      void this.flush();
    }
  };

  private readonly handleOffline = (): void => {
    this.online = false;
    this.status = 'offline';
    this.notify();
  };

  private readonly handleStorageEvent = (event: StorageEvent): void => {
    if (event.key !== null && event.key !== this.storageKey) return;
    this.reloadFromStorage();
  };

  private async performFlush(): Promise<DriverFlushResult> {
    return this.withFlushLock(() => this.performFlushUnlocked());
  }

  private async performFlushUnlocked(): Promise<DriverFlushResult> {
    const result: DriverFlushResult = {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: this.queue.length,
      errors: [],
    };

    if (!this.sender) {
      this.lastError = 'GPS sender is not configured';
      this.status = 'error';
      this.notify();
      result.errors.push({ busId: '', error: this.lastError });
      result.failed += 1;
      return result;
    }

    if (!isOnline()) {
      this.online = false;
      this.status = 'offline';
      this.notify();
      result.skipped = this.queue.length;
      return result;
    }

    const now = this.now();
    const candidates = this.readyCandidates(now);
    if (candidates.length === 0) {
      this.retryAt = this.earliestRetryAt(this.queue, now);
      this.status = this.queue.length > 0
        ? this.retryAt !== null && this.retryAt > now
          ? 'retry'
          : 'queued'
        : 'idle';
      this.notify();
      result.skipped = this.queue.length;
      return result;
    }

    this.online = true;
    this.status = 'sending';
    this.lastError = null;
    this.notify();

    for (const candidate of candidates) {
      const current = this.queue.find((item) => item.id === candidate.id);
      if (!current) {
        result.skipped += 1;
        continue;
      }

      result.attempted += 1;
      try {
        const sendResult = await this.sender(cloneSample(current.sample), {
          attempt: current.attemptCount + 1,
          queuedAt: current.queuedAt,
        });
        const serverTimestamp = normalizeAcknowledgement(sendResult);
        const marked = await this.withLock(() =>
          this.markSentInternal(current.busId, serverTimestamp, current.id)
        );
        result.sent += 1;
        if (marked.error) {
          result.failed += 1;
          result.errors.push({ busId: current.busId, error: marked.error });
        }
      } catch (error) {
        result.failed += 1;
        const message = errorMessage(error);
        result.errors.push({ busId: current.busId, error: message });
        await this.recordFailure(current, message);
      }
    }

    result.remaining = this.queue.length;
    const finalNow = this.now();
    this.retryAt = this.earliestRetryAt(this.queue, finalNow);
    if (!this.online) {
      this.status = 'offline';
    } else if (this.queue.length === 0) {
      this.status = result.sent > 0 ? 'sent' : 'idle';
    } else if (result.failed > 0 || (this.retryAt !== null && this.retryAt > finalNow)) {
      this.status = 'retry';
    } else {
      this.status = 'queued';
    }
    this.notify();
    return result;
  }

  private async markSentInternal(
    busId: string,
    serverTimestamp: string,
    expectedId?: string
  ): Promise<{ removed: boolean; error: string | null }> {
    const base = this.readStoredQueue() ?? this.queue.slice();
    const match = base.find((item) => item.busId === busId);
    const canRemove = match && (!expectedId || match.id === expectedId);
    const next = canRemove
      ? base.filter((item) => item.busId !== busId)
      : base;

    if (this.storage && canRemove) {
      try {
        this.persist(next);
      } catch (error) {
        const message = errorMessage(error);
        this.commitQueue(base, 'error');
        this.lastError = message;
        this.notify();
        return { removed: false, error: message };
      }
    }

    this.commitQueue(next, next.length === 0 ? 'sent' : 'queued');
    this.lastAcknowledgement = { busId, serverTimestamp };
    this.lastError = null;
    this.retryAt = this.earliestRetryAt(next, this.now());
    this.status = !this.online
      ? 'offline'
      : next.length === 0
        ? 'sent'
        : this.retryAt !== null && this.retryAt > this.now()
          ? 'retry'
          : 'queued';
    this.notify();
    if (canRemove) this.publishStorageChange();
    return { removed: Boolean(canRemove), error: null };
  }

  private async recordFailure(
    candidate: PendingGpsSample,
    message: string
  ): Promise<void> {
    await this.withLock(async () => {
      const base = this.readStoredQueue() ?? this.queue.slice();
      const current = base.find((item) => item.id === candidate.id);
      if (!current) return;

      const now = this.now();
      const attemptCount = current.attemptCount + 1;
      const nextItem: PendingGpsSample = {
        ...current,
        attemptCount,
        nextAttemptAt: now + calculateRetryDelayMs(
          attemptCount,
          this.retryBaseMs,
          this.retryMaxMs
        ),
        lastError: message.slice(0, 1_000),
        updatedAt: now,
      };
      const next = base.map((item) => (item.id === candidate.id ? nextItem : item));

      if (this.storage) {
        try {
          this.persist(next);
        } catch (error) {
          const storageMessage = errorMessage(error);
          this.commitQueue(base, 'error');
          this.lastError = storageMessage;
          this.notify();
          return;
        }
      }

      this.commitQueue(next, 'retry');
      this.lastError = message.slice(0, 1_000);
      this.retryAt = this.earliestRetryAt(next, now);
      this.notify();
      this.publishStorageChange();
    });
  }

  private readyCandidates(now: number): PendingGpsSample[] {
    const candidates: PendingGpsSample[] = [];
    const buses = new Set<string>();
    for (const item of this.queue) {
      if (item.nextAttemptAt > now || buses.has(item.busId)) continue;
      buses.add(item.busId);
      candidates.push(item);
    }
    return candidates;
  }

  private earliestRetryAt(
    queue: readonly PendingGpsSample[],
    now: number
  ): number | null {
    let earliest: number | null = null;
    for (const item of queue) {
      if (item.nextAttemptAt <= now) continue;
      earliest = earliest === null ? item.nextAttemptAt : Math.min(earliest, item.nextAttemptAt);
    }
    return earliest;
  }

  private readStoredQueue(): PendingGpsSample[] | null {
    if (!this.storage) return null;
    try {
      const raw = this.storage.getItem(this.storageKey);
      return parseStoredQueue(raw, this.maxQueueSize);
    } catch {
      return null;
    }
  }

  private persist(queue: readonly PendingGpsSample[]): void {
    if (!this.storage) return;
    const stored: StoredDriverQueue = {
      version: 1,
      items: queue.map(clonePending),
    };
    this.storage.setItem(this.storageKey, JSON.stringify(stored));
  }

  private commitQueue(
    queue: readonly PendingGpsSample[],
    status: DriverDeliveryStatus
  ): void {
    this.queue = queue.map(clonePending);
    this.status = status;
    this.retryAt = this.earliestRetryAt(this.queue, this.now());
  }

  private reloadFromStorage(): void {
    if (this.disposed) return;
    const stored = this.readStoredQueue();
    if (!stored) return;

    this.queue = stored;
    const now = this.now();
    this.retryAt = this.earliestRetryAt(this.queue, now);
    if (this.status !== 'sending') {
      this.status = !this.online
        ? 'offline'
        : this.queue.length === 0
          ? this.lastAcknowledgement
            ? 'sent'
            : 'idle'
          : this.retryAt !== null && this.retryAt > now
            ? 'retry'
            : 'queued';
    }
    this.notify();
  }

  private publishStorageChange(): void {
    for (const observer of storageObservers) {
      if (observer.owner === this.ownerId) continue;
      try {
        observer.callback(this.storageKey);
      } catch {
        continue;
      }
    }
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      try {
        listener(snapshot);
      } catch {
        continue;
      }
    }
  }

  private async withFlushLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockManager = (
      typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & {
            locks?: {
              request<T>(
                name: string,
                callback: () => Promise<T>
              ): Promise<T>;
            };
          }).locks
    );

    if (!lockManager) {
      return withKeyedFlushLock(this.storageKey, operation);
    }

    let acquired = false;
    try {
      return await lockManager.request(
        `linusku-driver-tracking:flush:${this.storageKey}`,
        async () => {
          acquired = true;
          return operation();
        }
      );
    } catch (error) {
      if (acquired) throw error;
      return withKeyedFlushLock(this.storageKey, operation);
    }
  }

  private async withLock<T>(operation: () => Promise<T>): Promise<T> {
    const lockManager = (
      typeof navigator === 'undefined'
        ? undefined
        : (navigator as Navigator & {
            locks?: {
              request<T>(
                name: string,
                callback: () => Promise<T>
              ): Promise<T>;
            };
          }).locks
    );

    if (!lockManager) return withGlobalOperationLock(operation);

    let acquired = false;
    try {
      return await lockManager.request(
        `linusku-driver-tracking:${this.storageKey}`,
        async () => {
          acquired = true;
          return operation();
        }
      );
    } catch (error) {
      if (acquired) throw error;
      return withGlobalOperationLock(operation);
    }
  }

  private emptyFlushResult(): DriverFlushResult {
    return {
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining: this.queue.length,
      errors: [],
    };
  }
}

export function createDriverTracking(
  options: DriverTrackingOptions = {}
): DriverTrackingManager {
  return new DriverTrackingManager(options);
}
