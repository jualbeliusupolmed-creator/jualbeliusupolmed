import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  FAVORITE_STOPS_STORAGE_KEY,
  PASSENGER_NOTIFICATION_OPT_IN_KEY,
  askNotificationPermission,
  buildEtaUrl,
  clearPassengerNotificationHistory,
  copyEtaUrl,
  generateNextDepartureNotifications,
  getFavoriteStopIds,
  getNotificationPermissionState,
  getPassengerNotificationAvailability,
  isFavoriteStop,
  isPassengerNotificationsOptedIn,
  isWithinNotificationThreshold,
  selectNextDepartures,
  setFavoriteStopIds,
  setPassengerNotificationsOptedIn,
  shareEtaUrl,
  showPassengerNotification,
  toggleFavoriteStop,
} from './passengerNotifications';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, String(value));
  }
}

class MockNotification {
  static permission: NotificationPermission = 'granted';
  static requestPermission = vi.fn(
    async (): Promise<NotificationPermission> => MockNotification.permission
  );
  static instances: MockNotification[] = [];

  readonly body: string;
  readonly tag: string;

  constructor(
    readonly title: string,
    readonly options: NotificationOptions = {}
  ) {
    this.body = options.body ?? '';
    this.tag = options.tag ?? '';
    MockNotification.instances.push(this);
  }

  close(): void {}
}

function installBrowser(
  permission: NotificationPermission = 'granted'
): MemoryStorage {
  const storage = new MemoryStorage();
  MockNotification.permission = permission;
  MockNotification.requestPermission.mockReset();
  MockNotification.requestPermission.mockImplementation(
    async (): Promise<NotificationPermission> => MockNotification.permission
  );
  MockNotification.instances = [];
  vi.stubGlobal('window', {
    Notification: MockNotification,
    localStorage: storage,
    location: { origin: 'https://linusku.test' },
  });
  return storage;
}

const departure = {
  stopId: 'halte-a',
  stopName: 'Halte A',
  busId: 'LINUS-01',
  etaMinutes: 5,
};

afterEach(() => {
  clearPassengerNotificationHistory();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('passenger notification permissions and opt-in', () => {
  it('reports an unsupported browser environment', async () => {
    expect(getNotificationPermissionState()).toBe('unsupported');
    await expect(askNotificationPermission()).resolves.toBe('unsupported');

    const result = await showPassengerNotification(departure);

    expect(result.status).toBe('unsupported');
    expect(result.permission).toBe('unsupported');
    expect(result.notification).toBeNull();
  });

  it('reports default, granted, and denied permission states', () => {
    installBrowser('default');
    expect(getNotificationPermissionState()).toBe('default');

    MockNotification.permission = 'granted';
    expect(getNotificationPermissionState()).toBe('granted');

    MockNotification.permission = 'denied';
    expect(getNotificationPermissionState()).toBe('denied');
  });

  it('asks for browser permission and returns the browser response', async () => {
    installBrowser('default');
    MockNotification.requestPermission.mockResolvedValueOnce('granted');

    await expect(askNotificationPermission()).resolves.toBe('granted');
    expect(MockNotification.requestPermission).toHaveBeenCalledTimes(1);
  });

  it('does not ask again after permission was granted or denied', async () => {
    installBrowser('granted');
    await expect(askNotificationPermission()).resolves.toBe('granted');
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();

    MockNotification.permission = 'denied';
    await expect(askNotificationPermission()).resolves.toBe('denied');
    expect(MockNotification.requestPermission).not.toHaveBeenCalled();
  });

  it('keeps the default permission state when the request fails', async () => {
    installBrowser('default');
    MockNotification.requestPermission.mockRejectedValueOnce(new Error('failed'));

    await expect(askNotificationPermission()).resolves.toBe('default');
  });

  it('persists explicit notification opt-in in localStorage', () => {
    const storage = installBrowser('granted');

    expect(isPassengerNotificationsOptedIn()).toBe(false);
    expect(setPassengerNotificationsOptedIn(true)).toBe(true);
    expect(storage.getItem(PASSENGER_NOTIFICATION_OPT_IN_KEY)).toBe('true');
    expect(isPassengerNotificationsOptedIn()).toBe(true);
    expect(getPassengerNotificationAvailability()).toEqual({
      supported: true,
      permission: 'granted',
      optedIn: true,
    });

    setPassengerNotificationsOptedIn(false);
    expect(storage.getItem(PASSENGER_NOTIFICATION_OPT_IN_KEY)).toBe('false');
    expect(isPassengerNotificationsOptedIn()).toBe(false);
  });

  it('handles unavailable localStorage without throwing', () => {
    installBrowser('granted');
    const storage = getDefaultStorageForTest();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(setPassengerNotificationsOptedIn(true)).toBe(false);
    expect(isPassengerNotificationsOptedIn()).toBe(false);
  });
});

describe('favorite stops', () => {
  it('reads valid unique favorite stop ids', () => {
    const storage = installBrowser();
    storage.setItem(
      FAVORITE_STOPS_STORAGE_KEY,
      JSON.stringify(['halte-a', 'halte-a', 'halte-b', 3, ''])
    );

    expect(getFavoriteStopIds()).toEqual(['halte-a', 'halte-b']);
  });

  it('ignores malformed favorite stop data', () => {
    const storage = installBrowser();
    storage.setItem(FAVORITE_STOPS_STORAGE_KEY, '{invalid');

    expect(getFavoriteStopIds()).toEqual([]);
  });

  it('sets and toggles favorite stops', () => {
    const storage = installBrowser();

    expect(setFavoriteStopIds(['halte-a', 'halte-a', 'halte-b'])).toEqual([
      'halte-a',
      'halte-b',
    ]);
    expect(storage.getItem(FAVORITE_STOPS_STORAGE_KEY)).toBe(
      JSON.stringify(['halte-a', 'halte-b'])
    );
    expect(isFavoriteStop('halte-a')).toBe(true);

    expect(toggleFavoriteStop('halte-a')).toEqual(['halte-b']);
    expect(isFavoriteStop('halte-a')).toBe(false);
    expect(toggleFavoriteStop('halte-c')).toEqual(['halte-b', 'halte-c']);
  });
});

describe('departure selection and notification delivery', () => {
  it('checks ETA against a configurable threshold', () => {
    expect(isWithinNotificationThreshold(10, 10)).toBe(true);
    expect(isWithinNotificationThreshold(11, 10)).toBe(false);
    expect(isWithinNotificationThreshold(3, 5)).toBe(true);
    expect(isWithinNotificationThreshold(-1, 5)).toBe(false);
    expect(isWithinNotificationThreshold(Number.NaN, 5)).toBe(false);
  });

  it('selects the closest valid departure for each stop', () => {
    const selected = selectNextDepartures(
      [
        { ...departure, busId: 'LINUS-02', etaMinutes: 8 },
        { ...departure, busId: 'LINUS-01', etaMinutes: 3 },
        { ...departure, stopId: 'halte-b', stopName: 'Halte B', etaMinutes: 6 },
        { ...departure, stopId: 'halte-c', stopName: 'Halte C', etaMinutes: -1 },
      ],
      ['halte-a', 'halte-b']
    );

    expect(selected).toEqual([
      { ...departure, busId: 'LINUS-01', etaMinutes: 3 },
      {
        stopId: 'halte-b',
        stopName: 'Halte B',
        busId: 'LINUS-01',
        etaMinutes: 6,
      },
    ]);
  });

  it('requires opt-in and granted permission before notifying', async () => {
    installBrowser('granted');
    expect((await showPassengerNotification(departure)).status).toBe(
      'not-opted-in'
    );

    setPassengerNotificationsOptedIn(true);
    MockNotification.permission = 'default';
    expect((await showPassengerNotification(departure)).status).toBe(
      'permission-required'
    );

    MockNotification.permission = 'denied';
    expect((await showPassengerNotification(departure)).status).toBe(
      'permission-denied'
    );
    expect(MockNotification.instances).toHaveLength(0);
  });

  it('does not notify before the ETA threshold is reached', async () => {
    installBrowser('granted');
    setPassengerNotificationsOptedIn(true);

    const result = await showPassengerNotification(
      { ...departure, etaMinutes: 12 },
      { thresholdMinutes: 10 }
    );

    expect(result.status).toBe('threshold-not-met');
    expect(MockNotification.instances).toHaveLength(0);
  });

  it('shows a browser notification for an eligible departure', async () => {
    installBrowser('granted');
    setPassengerNotificationsOptedIn(true);

    const result = await showPassengerNotification(departure);

    expect(result.status).toBe('sent');
    expect(result.notification).not.toBeNull();
    expect(MockNotification.instances).toHaveLength(1);
    expect(MockNotification.instances[0].title).toBe(
      'Bus LINUS-01 menuju Halte A'
    );
    expect(MockNotification.instances[0].body).toBe(
      'Bus LINUS-01 diperkirakan tiba dalam 5 menit.'
    );
    expect(MockNotification.instances[0].tag).toBe(
      'linusku:halte-a:LINUS-01'
    );
  });

  it('deduplicates by stop and bus within the configured window', async () => {
    installBrowser('granted');
    setPassengerNotificationsOptedIn(true);
    let now = 1_000_000;

    const first = await showPassengerNotification(departure, {
      now: () => now,
      dedupeWindowMinutes: 15,
    });
    now += 5 * 60_000;
    const duplicate = await showPassengerNotification(departure, {
      now: () => now,
      dedupeWindowMinutes: 15,
    });
    const otherBus = await showPassengerNotification(
      { ...departure, busId: 'LINUS-02' },
      { now: () => now, dedupeWindowMinutes: 15 }
    );
    const otherStop = await showPassengerNotification(
      { ...departure, stopId: 'halte-b', stopName: 'Halte B' },
      { now: () => now, dedupeWindowMinutes: 15 }
    );
    now += 11 * 60_000;
    const afterWindow = await showPassengerNotification(departure, {
      now: () => now,
      dedupeWindowMinutes: 15,
    });

    expect(first.status).toBe('sent');
    expect(duplicate.status).toBe('duplicate');
    expect(otherBus.status).toBe('sent');
    expect(otherStop.status).toBe('sent');
    expect(afterWindow.status).toBe('sent');
    expect(MockNotification.instances).toHaveLength(4);
  });

  it('generates one next-departure notification per selected stop', async () => {
    installBrowser('granted');
    setPassengerNotificationsOptedIn(true);

    const results = await generateNextDepartureNotifications(
      [
        { ...departure, busId: 'LINUS-02', etaMinutes: 8 },
        { ...departure, busId: 'LINUS-01', etaMinutes: 3 },
        {
          stopId: 'halte-b',
          stopName: 'Halte B',
          busId: 'LINUS-03',
          etaMinutes: 6,
        },
      ],
      { stopIds: ['halte-a', 'halte-b'] }
    );

    expect(results).toHaveLength(2);
    expect(results.map((result) => result.status)).toEqual(['sent', 'sent']);
    expect(MockNotification.instances.map((item) => item.tag)).toEqual([
      'linusku:halte-a:LINUS-01',
      'linusku:halte-b:LINUS-03',
    ]);
  });
});

describe('ETA URL sharing', () => {
  it('builds a root URL with an encoded stop parameter', () => {
    installBrowser();

    expect(buildEtaUrl('halte/a')).toBe(
      'https://linusku.test/linusku?stop=halte%2Fa'
    );
  });

  it('keeps the base URL query and adds the stop parameter', () => {
    installBrowser();

    expect(buildEtaUrl('halte-a', 'https://example.test/eta?source=map')).toBe(
      'https://example.test/eta?source=map&stop=halte-a'
    );
  });

  it('builds a relative LINUSKU URL without a browser environment', () => {
    vi.stubGlobal('window', undefined);
    expect(buildEtaUrl('halte-a')).toBe('/linusku?stop=halte-a');
  });

  it('rejects an empty stop id', () => {
    expect(() => buildEtaUrl(' ')).toThrow('stopId wajib diisi.');
  });

  it('copies the ETA URL through the clipboard API', async () => {
    installBrowser();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await copyEtaUrl('halte-a');

    expect(result.status).toBe('copied');
    expect(result.url).toBe('https://linusku.test/linusku?stop=halte-a');
    expect(writeText).toHaveBeenCalledWith(result.url);
  });

  it('reports an unsupported clipboard when no copy API exists', async () => {
    installBrowser();
    vi.stubGlobal('navigator', {});

    const result = await copyEtaUrl('halte-a');

    expect(result.status).toBe('unsupported');
    expect(result.url).toContain('stop=halte-a');
  });

  it('shares the ETA URL through the Web Share API', async () => {
    installBrowser();
    const share = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { share });

    const result = await shareEtaUrl('halte-a');

    expect(result.status).toBe('shared');
    expect(share).toHaveBeenCalledWith({
      title: 'LINUSKU ETA',
      text: 'Lihat perkiraan waktu tiba bus LINUSKU.',
      url: 'https://linusku.test/linusku?stop=halte-a',
    });
  });

  it('falls back to copying when Web Share is unavailable', async () => {
    installBrowser();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });

    const result = await shareEtaUrl('halte-a');

    expect(result.status).toBe('copied');
    expect(writeText).toHaveBeenCalledWith(
      'https://linusku.test/linusku?stop=halte-a'
    );
  });

  it('returns a cancelled state when sharing is aborted', async () => {
    installBrowser();
    const share = vi.fn(async () => {
      throw new DOMException('cancelled', 'AbortError');
    });
    vi.stubGlobal('navigator', { share });

    const result = await shareEtaUrl('halte-a');

    expect(result.status).toBe('cancelled');
  });
});

function getDefaultStorageForTest(): Storage {
  const browserWindow = window as Window & typeof globalThis;
  return browserWindow.localStorage;
}
