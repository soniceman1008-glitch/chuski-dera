type Bucket = { count: number; resetAt: number };

const g = globalThis as typeof globalThis & { __chuskiRateLimit__?: Map<string, Bucket> };

function store() {
  if (!g.__chuskiRateLimit__) g.__chuskiRateLimit__ = new Map();
  return g.__chuskiRateLimit__;
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  const buckets = store();
  const cur = buckets.get(key);
  if (!cur || now >= cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (cur.count >= max) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
  }
  cur.count += 1;
  return { ok: true };
}

export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for") ?? "";
  const ip =
    xff.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    "unknown";
  return ip.slice(0, 64);
}
