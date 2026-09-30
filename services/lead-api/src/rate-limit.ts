/** Same window as the legacy Express handler in `server/contact.ts`. Best-effort: each function instance has its own memory. */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 5;

const hits = new Map<string, number[]>();

export function resetLeadRateLimits(): void {
  hits.clear();
}

export function isRateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  if (hits.size > 5000) {
    const oldest = hits.keys().next().value;
    if (oldest && oldest !== ip) hits.delete(oldest);
  }
  hits.set(ip, recent);
  return false;
}
