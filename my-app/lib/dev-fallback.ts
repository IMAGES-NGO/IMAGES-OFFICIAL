/**
 * Several routes can fall back to mock users or an in-memory event store when the
 * database is unreachable. That is handy on a laptop without Neon configured, but in
 * production it shows fake people and reports success for writes that are lost on
 * the next restart. Fallbacks therefore run only under `next dev`.
 */
export const devFallbacksEnabled = process.env.NODE_ENV === "development";
