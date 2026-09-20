// In-memory rate limiting and attempt tracker
interface AttemptRecord {
  count: number;
  lockedUntil: number;
}

const globalForLimiter = globalThis as unknown as {
  authVerificationAttempts?: Map<string, AttemptRecord>;
  authResendCooldowns?: Map<string, number>;
};

export const verificationAttempts =
  globalForLimiter.authVerificationAttempts ??
  new Map<string, AttemptRecord>();

export const resendCooldowns =
  globalForLimiter.authResendCooldowns ?? new Map<string, number>();

if (!globalForLimiter.authVerificationAttempts) {
  globalForLimiter.authVerificationAttempts = verificationAttempts;
}

if (!globalForLimiter.authResendCooldowns) {
  globalForLimiter.authResendCooldowns = resendCooldowns;
}
