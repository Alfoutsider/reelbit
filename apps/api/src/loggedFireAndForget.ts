/**
 * Tiny wrapper for fire-and-forget side effects (analytics, referral
 * accounting, downstream pings). The audit flagged dozens of `.catch(() => {})`
 * sites that swallowed errors silently — when one of those calls fails in
 * production we want a log line, not invisibility.
 *
 * Usage:
 *   loggedFnf(analyticsLogTrade(ev), "analytics:trade", { mint });
 *
 * The promise is awaited internally but the wrapper itself never throws, so
 * callers can still drop it without an unhandled rejection.
 */

export function loggedFnf<T>(
  promise: Promise<T>,
  label: string,
  ctx?: Record<string, unknown>,
): Promise<T | void> {
  return promise.catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[fnf:${label}] ${message}`, ctx ?? {});
  });
}
