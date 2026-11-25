/**
 * Deployment-aware in-memory sliding window rate limiter per runtime instance.
 *
 * NOTE: In serverless deployments (e.g. Vercel / AWS Lambda), each ephemeral instance
 * enforces this window locally. For globally synchronized limits across multi-region clusters,
 * a distributed key-value store (e.g. Upstash Redis) is recommended.
 */
export const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1-minute window
export const MAX_REQUESTS_PER_WINDOW = 20; // 20 review requests/minute per client IP

interface RateRecord {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateRecord>();

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfter: number;
} {
  const now = Date.now();
  const record = requestCounts.get(ip);

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_WINDOW - 1,
      retryAfter: 0,
    };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      allowed: false,
      remaining: 0,
      retryAfter,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    retryAfter: 0,
  };
}

export function resetRateLimitsForTesting(): void {
  requestCounts.clear();
}
