type RateLimitEntry = {
  count: number;
  resetTime: number;
};

// Global in-memory store for rate limiting
const globalForLimiter = globalThis as unknown as {
  rateLimitEntries?: Map<string, RateLimitEntry>;
};

const store = globalForLimiter.rateLimitEntries ?? new Map<string, RateLimitEntry>();
if (!globalForLimiter.rateLimitEntries) {
  globalForLimiter.rateLimitEntries = store;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Checks and increments rate limit counter for an identifier.
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS
): { success: boolean; resetTime?: number; remaining: number } {
  const now = Date.now();
  const record = store.get(identifier);

  // Periodic cleanup of expired entries if store gets large
  if (store.size > 10000) {
    for (const [key, val] of store.entries()) {
      if (now > val.resetTime) {
        store.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    const resetTime = now + windowMs;
    store.set(identifier, { count: 1, resetTime });
    return { success: true, resetTime, remaining: maxAttempts - 1 };
  }

  record.count += 1;

  if (record.count > maxAttempts) {
    return { success: false, resetTime: record.resetTime, remaining: 0 };
  }

  return { success: true, resetTime: record.resetTime, remaining: maxAttempts - record.count };
}

/**
 * Resets rate limit for an identifier (e.g. on successful login).
 */
export function resetRateLimit(identifier: string): void {
  store.delete(identifier);
}

/**
 * Safely extracts client IP address from standard proxy/CDN headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const clientIp = forwarded.split(",")[0]?.trim();
    if (clientIp) return clientIp;
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  return "127.0.0.1";
}
