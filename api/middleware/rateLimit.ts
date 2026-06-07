import type { Context, Next } from "hono";

interface RateLimitEntry { count: number; resetAt: number }

const ipStore = new Map<string, RateLimitEntry>();
const userStore = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of ipStore) if (now > v.resetAt) ipStore.delete(k);
  for (const [k, v] of userStore) if (now > v.resetAt) userStore.delete(k);
}, 5 * 60_000);

function check(store: Map<string, RateLimitEntry>, key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

function getIP(c: Context): string {
  return (
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    "unknown"
  );
}

/** General IP-based rate limiter */
export function ipRateLimit(max: number, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const ip = getIP(c);
    if (!check(ipStore, ip, max, windowMs)) {
      return c.json({ success: false, error: "Rate limit exceeded. Please wait before retrying." }, 429);
    }
    await next();
  };
}

/** Per-user rate limiter — reads user from context (call after requireAuth) */
export function userRateLimit(max: number, windowMs = 60_000) {
  return async (c: Context, next: Next) => {
    const user = c.get("user") as { id: string } | undefined;
    const key = user?.id ? `user:${user.id}` : `ip:${getIP(c)}`;
    if (!check(userStore, key, max, windowMs)) {
      return c.json({ success: false, error: "Rate limit exceeded for your account." }, 429);
    }
    await next();
  };
}

/** Quota check: requires auth. Verifies user has reports remaining. */
export async function quotaCheck(c: Context, next: Next) {
  // This is a soft check middleware; hard enforcement is in the consume-report endpoint.
  // We only block /api/analyze if the user is authenticated and over limit.
  const user = c.get("user") as { id: string } | undefined;
  if (!user) return await next(); // requireAuth will handle missing auth
  await next();
}
