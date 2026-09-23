type RateLimitEntry = {
  count: number;
  resetTime: number;
};

// In-memory store for rate limiting
// NOTE: For a multi-instance/serverless environment, a distributed store (e.g., Redis) should be used.
const loginAttempts = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { success: boolean; resetTime?: number } {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { success: true };
  }

  // If the window has expired, reset
  if (now > record.resetTime) {
    loginAttempts.set(identifier, { count: 1, resetTime: now + WINDOW_MS });
    return { success: true };
  }

  // Increment count
  record.count += 1;

  if (record.count > MAX_ATTEMPTS) {
    return { success: false, resetTime: record.resetTime };
  }

  return { success: true };
}
