import type { Context, Next } from "hono";
import { env } from "../lib/env.js";

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

/** Verify Supabase JWT and attach user to context. Returns 401 on failure. */
export async function requireAuth(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ success: false, error: "Authentication required." }, 401);
  }
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return c.json({ success: false, error: "Auth service not configured." }, 503);
  }

  const res = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: authHeader,
    },
  });

  if (!res.ok) {
    return c.json({ success: false, error: "Invalid or expired session." }, 401);
  }

  const user = await res.json() as { id?: string; email?: string; role?: string };
  if (!user?.id) {
    return c.json({ success: false, error: "Invalid user token." }, 401);
  }

  c.set("user", { id: user.id, email: user.email ?? "", role: user.role });
  await next();
}

/** Helper: get authenticated user from context (call after requireAuth) */
export function getUser(c: Context): AuthUser {
  return c.get("user") as AuthUser;
}
