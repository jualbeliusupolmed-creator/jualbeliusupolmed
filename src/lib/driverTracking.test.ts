import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calculateRetryDelayMs,
  createDriverTracking,
  formatRelativeTime,
  toDriverPositionPayload,
  type DriverGpsSample,
  type DriverSendResult,
  type DriverTrackingStorage,
} from './driverTracking';

class MockLocalStorage implements DriverTrackingStorage {
  private readonly values = new Map<string, string>();
  failOnSet = false;

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failOnSet) {
      const error = new Error('Storage quota exceeded');
      error.name = 'QuotaExceededError';
      throw error;
    }
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

class MockWindow extends EventTarget {
  readonly localStorage: MockLocalStorage;

  constructor(localStorage: MockLocalStorage) {
    super();
    this.localStorage = localStorage;
  }
}

function createSample(
  busId = 'BUS-1',
  capturedAt = 1_700_000_000_000
): DriverGpsSample {
  return {
    busId,
    lat: 3.5656,
    lng: 98.6594,
    speedKmh: 18,
    heading: 365,
    occupancy: 'medium',
    sourceType: 'driver',
    capturedAt,
  };
}

const managers: Array<ReturnType<typeof createDriverTracking>> = [];

function createManager(
  options: Parameters<typeof createDriverTracking>[0] = {}
) {
  const manager = createDriverTracking(options);
  managers.push(manager);
  return manager;
}

afterEach(() => {
  for (const manager of managers.splice(0)) manager.dispose();
  vi.unstubAllGlobals();
});

describe('driver tracking delivery status', () => {
  it('keeps a queue in memory without touching browser globals on the server', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', undefined);

    const manager = createManager({ storage: null });
    const result = await manager.enqueue(createSample());

    expect(result.accepted).toBe(true);
    expect(result.persisted).toBe(false);
    expect(manager.getSnapshot()).toMatchObject({
      status: 'queued',
      online: true,
    });
    expect(manager.getSnapshot().queue).toHaveLength(1);
  });

  it('exposes every delivery state', () => {
    const manager = createManager({ storage: null });

    expect(manager.getSnapshot().status).toBe('idle');
    expect(manager.getSnapshot().pending).toBeNull();
  });
});

describe('driver GPS outbox storage', () => {
  it('ignores malformed storage and invalid queue entries', () => {
    const storage = new MockLocalStorage();
    storage.setItem(
      'linusku:driver-gps-outbox:v1',
      JSON.stringify({
        version: 1,
        items: [
          {
            id: 'valid-1',
            busId: 'BUS-1',
            sample: createSample(),
            attemptCount: 0,
            nextAttemptAt: 1_700_000_000_000,
            lastError: null,
            queuedAt: 1_700_000_000_000,
            updatedAt: 1_700_000_000_000,
          },
          {
            id: 'invalid-1',
            busId: 'BUS-2',
            sample: { ...createSample('BUS-2'), lat: null },
            attemptCount: 0,
            nextAttemptAt: 1_700_000_000_000,
            lastError: null,
            queuedAt: 1_700_000_000_000,
            updatedAt: 1_700_000_000_000,
          },
        ],
      })
    );
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', storage);

    const manager = createManager();

    expect(manager.getSnapshot().queue).toHaveLength(1);
    expect(manager.getSnapshot().queue[0].busId).toBe('BUS-1');
  });

  it('treats an invalid storage envelope as an empty outbox', () => {
    const storage = new MockLocalStorage();
    storage.setItem('linusku:driver-gps-outbox:v1', '{not-json');
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('localStorage', storage);

    const manager = createManager();

    expect(manager.getSnapshot().queue).toEqual([]);
    expect(manager.getSnapshot().status).toBe('idle');
  });

  it('deduplicates by bus and enforces the maximum queue size', async () => {
    const storage = new MockLocalStorage();
    const manager = createManager({ storage, maxQueueSize: 2 });

    await manager.enqueue(createSample('BUS-1', 1_700_000_000_000));
    await manager.enqueue(createSample('BUS-1', 1_700_000_001_000));
    await manager.enqueue(createSample('BUS-2', 1_700_000_002_000));
    const rejected = await manager.enqueue(
      createSample('BUS-3', 1_700_000_003_000)
    );

    expect(manager.getSnapshot().queue.map((item) => item.busId)).toEqual([
      'BUS-1',
      'BUS-2',
    ]);
    expect(manager.getSnapshot().queue[0].sample.capturedAt).toBe(
      1_700_000_001_000
    );
    expect(rejected).toMatchObject({
      accepted: false,
      persisted: false,
      reason: 'queue-full',
    });
  });

  it('keeps the existing queue when storage writes exceed quota', async () => {
    const storage = new MockLocalStorage();
    const manager = createManager({ storage });

    await manager.enqueue(createSample('BUS-1'));
    storage.failOnSet = true;
    const rejected = await manager.enqueue(createSample('BUS-2'));

    expect(rejected).toMatchObject({
      accepted: false,
      persisted: false,
      reason: 'storage-error',
    });
    expect(manager.getSnapshot().queue.map((item) => item.busId)).toEqual([
      'BUS-1',
    ]);
    expect(manager.getSnapshot().status).toBe('error');
  });
});

describe('driver GPS delivery', () => {
  it('sends at most one pending sample per bus and keeps a replacement received during send', async () => {
    const storage = new MockLocalStorage();
    let resolveFirst: ((value: DriverSendResult) => void) | undefined;
    const send = vi.fn(async (sample: DriverGpsSample) => {
      if (sample.busId === 'BUS-1') {
        return new Promise<DriverSendResult>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return { serverTimestamp: '2026-11-18T08:00:01.000Z' };
    });
    const manager = createManager({ storage, send });

    await manager.enqueue(createSample('BUS-1', 1_700_000_000_000));
    await manager.enqueue(createSample('BUS-2', 1_700_000_001_000));
    const flushing = manager.flush();

    await Promise.resolve();
    await manager.enqueue(createSample('BUS-1', 1_700_000_002_000));
    resolveFirst?.({ serverTimestamp: '2026-11-18T08:00:00.000Z' });
    const result = await flushing;

    expect(result.attempted).toBe(2);
    expect(result.sent).toBe(2);
    expect(send.mock.calls.filter(([sample]) => sample.busId === 'BUS-1')).toHaveLength(1);
    expect(send.mock.calls.filter(([sample]) => sample.busId === 'BUS-2')).toHaveLength(1);
    expect(manager.getSnapshot().queue.map((item) => item.busId)).toEqual([
      'BUS-1',
    ]);
    expect(manager.getSnapshot().queue[0].sample.capturedAt).toBe(
      1_700_000_002_000
    );
  });

  it('serializes flushes from managers sharing the same outbox', async () => {
    const storage = new MockLocalStorage();
    const send = vi.fn(async () => ({
      serverTimestamp: '2026-11-18T08:00:00.000Z',
    }));
    const first = createManager({ storage, send });
    const second = createManager({ storage, send });

    await first.enqueue(createSample('BUS-1'));
    await Promise.all([first.flush(), second.flush()]);

    expect(send).toHaveBeenCalledTimes(1);
    expect(first.getSnapshot().queue).toEqual([]);
    expect(second.getSnapshot().queue).toEqual([]);
  });

  it('applies capped exponential retry delays', async () => {
    let now = 1_700_000_000_000;
    const send = vi.fn(async () => {
      throw new Error('Network unavailable');
    });
    const manager = createManager({
      storage: new MockLocalStorage(),
      send,
      now: () => now,
      retryBaseMs: 1_000,
      retryMaxMs: 2_500,
    });

    await manager.enqueue(createSample('BUS-1', now));
    await manager.flush();

    expect(manager.getSnapshot().queue[0].attemptCount).toBe(1);
    expect(manager.getSnapshot().queue[0].nextAttemptAt).toBe(now + 1_000);

    now += 1_000;
    await manager.flush();
    expect(manager.getSnapshot().queue[0].attemptCount).toBe(2);
    expect(manager.getSnapshot().queue[0].nextAttemptAt).toBe(now + 2_000);

    now += 2_000;
    await manager.flush();
    expect(manager.getSnapshot().queue[0].attemptCount).toBe(3);
    expect(manager.getSnapshot().queue[0].nextAttemptAt).toBe(now + 2_500);
    expect(manager.getSnapshot().status).toBe('retry');
    expect(calculateRetryDelayMs(20, 1_000, 2_500)).toBe(2_500);
  });

  it('marks a bus sent with the server acknowledgement and clears the outbox', async () => {
    const manager = createManager({ storage: new MockLocalStorage() });
    await manager.enqueue(createSample('BUS-1'));

    const marked = await manager.markSent(
      'BUS-1',
      '2026-11-18T08:00:00.000Z'
    );

    expect(marked).toBe(true);
    expect(manager.getSnapshot().queue).toEqual([]);
    expect(manager.getSnapshot().lastAcknowledgement).toEqual({
      busId: 'BUS-1',
      serverTimestamp: '2026-11-18T08:00:00.000Z',
    });
    expect(manager.getSnapshot().status).toBe('sent');

    await manager.enqueue(createSample('BUS-2'));
    expect(await manager.clear()).toBe(true);
    expect(manager.getSnapshot().queue).toEqual([]);
    expect(manager.getSnapshot().lastAcknowledgement).toBeNull();
    expect(manager.getSnapshot().status).toBe('idle');
  });
});

describe('driver tracking connectivity', () => {
  it('notifies listeners synchronously when the browser comes online', async () => {
    const storage = new MockLocalStorage();
    const browserWindow = new MockWindow(storage);
    let online = false;
    const navigatorMock = {};
    Object.defineProperty(navigatorMock, 'onLine', {
      get: () => online,
    });
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal('navigator', navigatorMock);

    const manager = createManager({
      storage,
      send: async () => ({ serverTimestamp: '2026-11-18T08:00:00.000Z' }),
    });
    await manager.enqueue(createSample('BUS-1'));
    const listener = vi.fn();
    manager.subscribe(listener);
    listener.mockClear();

    online = true;
    browserWindow.dispatchEvent(new Event('online'));

    const observed = listener.mock.calls.map(([state]) => state);
    expect(observed.some((state) => state.online && state.status === 'queued')).toBe(
      true
    );
    expect(manager.getSnapshot().online).toBe(true);

    online = false;
    browserWindow.dispatchEvent(new Event('offline'));
    expect(manager.getSnapshot().status).toBe('offline');
  });
});

describe('driver tracking formatting', () => {
  it('creates a server position payload from a GPS sample', () => {
    expect(toDriverPositionPayload(createSample('BUS-7'))).toEqual({
      bus_id: 'BUS-7',
      lat: 3.5656,
      lng: 98.6594,
      speed_kmh: 18,
      heading: 5,
      occupancy: 'medium',
      source_type: 'driver',
      updated_at: '2023-11-14T22:13:20.000Z',
    });
  });

  it('formats timestamps as relative Indonesian time', () => {
    const now = Date.parse('2026-11-18T08:00:00.000Z');
    expect(formatRelativeTime('2026-11-18T07:59:50.000Z', now)).toBe('baru saja');
    expect(formatRelativeTime('2026-11-18T07:55:00.000Z', now)).toBe(
      '5 menit lalu'
    );
    expect(formatRelativeTime('2026-11-18T06:00:00.000Z', now)).toBe(
      '2 jam lalu'
    );
    expect(formatRelativeTime('2026-11-16T08:00:00.000Z', now)).toBe(
      '2 hari lalu'
    );
    expect(formatRelativeTime('invalid', now)).toBe('-');
  });
});
