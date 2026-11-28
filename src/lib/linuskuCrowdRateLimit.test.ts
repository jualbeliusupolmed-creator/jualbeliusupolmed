import { describe, expect, it, vi } from 'vitest';
import { consumeLinuskuCrowdRateLimit } from './linuskuCrowdRateLimit';

describe('LINUSKU crowd rate limit', () => {
  it('uses a hashed IP key and allows the first request', async () => {
    const recordHit = vi.fn().mockResolvedValue({ data: 1, error: null });
    const result = await consumeLinuskuCrowdRateLimit('203.0.113.8', recordHit);

    expect(result).toEqual({ allowed: true });
    expect(recordHit).toHaveBeenCalledWith(
      expect.stringMatching(/^linusku:crowd:[a-f0-9]{64}$/),
      30
    );
    expect(recordHit.mock.calls[0][0]).not.toContain('203.0.113.8');
  });

  it('rejects subsequent requests in the active window', async () => {
    const recordHit = vi.fn().mockResolvedValue({ data: 2, error: null });

    await expect(
      consumeLinuskuCrowdRateLimit('203.0.113.8', recordHit)
    ).resolves.toEqual({ allowed: false, reason: 'limited', retryAfter: 30 });
  });

  it('fails closed when the shared limiter is unavailable or malformed', async () => {
    const unavailable = vi
      .fn()
      .mockResolvedValue({ data: null, error: { code: '08006' } });
    const malformed = vi.fn().mockResolvedValue({ data: null, error: null });

    await expect(
      consumeLinuskuCrowdRateLimit('203.0.113.8', unavailable)
    ).resolves.toEqual({
      allowed: false,
      reason: 'unavailable',
      errorCode: '08006',
    });
    await expect(
      consumeLinuskuCrowdRateLimit('203.0.113.8', malformed)
    ).resolves.toEqual({ allowed: false, reason: 'unavailable' });
  });
});
