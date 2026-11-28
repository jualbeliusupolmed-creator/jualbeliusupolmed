const WINDOW_SECONDS = 30;

type RateLimitResponse = {
  data: unknown;
  error: { code?: string } | null;
};

type RecordRateLimitHit = (
  key: string,
  windowSeconds: number
) => PromiseLike<RateLimitResponse>;

export type LinuskuCrowdRateLimitResult =
  | { allowed: true }
  | { allowed: false; reason: 'limited'; retryAfter: number }
  | { allowed: false; reason: 'unavailable'; errorCode?: string; errorName?: string };

async function hashIpAddress(ipAddress: string): Promise<string> {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) throw new Error('Web Crypto is unavailable');

  const digest = await cryptoApi.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(ipAddress)
  );
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
}

export async function consumeLinuskuCrowdRateLimit(
  ipAddress: string,
  recordHit: RecordRateLimitHit
): Promise<LinuskuCrowdRateLimitResult> {
  try {
    const ipHash = await hashIpAddress(ipAddress);
    const { data, error } = await recordHit(
      `linusku:crowd:${ipHash}`,
      WINDOW_SECONDS
    );
    if (error) {
      return {
        allowed: false,
        reason: 'unavailable',
        errorCode: error.code,
      };
    }

    const count = Number(data);
    if (!Number.isSafeInteger(count) || count < 1) {
      return { allowed: false, reason: 'unavailable' };
    }
    if (count > 1) {
      return {
        allowed: false,
        reason: 'limited',
        retryAfter: WINDOW_SECONDS,
      };
    }

    return { allowed: true };
  } catch (error) {
    return {
      allowed: false,
      reason: 'unavailable',
      errorName: error instanceof Error ? error.name : 'UnknownError',
    };
  }
}
