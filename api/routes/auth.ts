import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { ipRateLimit } from "../middleware/rateLimit.js";
import { SignupSchema, SigninSchema } from "../middleware/validation.js";

const auth = new Hono();

// Strict rate limit on auth endpoints to prevent brute force
const authLimit = ipRateLimit(5, 60_000);

/**
 * POST /api/auth/signup
 */
auth.post("/signup", authLimit, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Invalid input", details: parsed.error.errors }, 400);
    }
    const { email, password, fullName } = parsed.data;

    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      return c.json({ success: false, error: "Auth service not configured." }, 503);
    }

    const res = await fetch(`${env.supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName || "" },
      }),
    });

    const data = await res.json() as { id?: string; error?: string; message?: string };
    if (!res.ok) {
      return c.json({ success: false, error: data.message || data.error || "Signup failed." }, res.status as 400 | 409);
    }

    // Create user record in DB
    if (data.id && env.supabaseUrl && env.supabaseServiceRoleKey) {
      await fetch(`${env.supabaseUrl}/rest/v1/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
          Prefer: "resolution=ignore-duplicates",
        },
        body: JSON.stringify({
          supabase_id: data.id,
          email,
          full_name: fullName || "",
          plan: "free",
          reports_used: 0,
          reports_limit: 3,
          created_at: new Date().toISOString(),
        }),
      });
    }

    return c.json({ success: true, userId: data.id });
  } catch (err) {
    console.error("Signup error:", err);
    return c.json({ success: false, error: "Signup failed." }, 500);
  }
});

/**
 * POST /api/auth/signin
 */
auth.post("/signin", authLimit, async (c) => {
  try {
    const body = await c.req.json();
    const parsed = SigninSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Invalid credentials format." }, 400);
    }
    const { email, password } = parsed.data;

    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return c.json({ success: false, error: "Auth service not configured." }, 503);
    }

    const res = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseAnonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json() as {
      access_token?: string; refresh_token?: string; user?: unknown;
      error?: string; error_description?: string;
    };

    if (!res.ok || !data.access_token) {
      return c.json({ success: false, error: "Invalid email or password." }, 401);
    }

    return c.json({
      success: true,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      user: data.user,
    });
  } catch (err) {
    console.error("Signin error:", err);
    return c.json({ success: false, error: "Sign in failed." }, 500);
  }
});

/**
 * POST /api/auth/signout
 */
auth.post("/signout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader && env.supabaseUrl && env.supabaseAnonKey) {
      await fetch(`${env.supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: env.supabaseAnonKey, Authorization: authHeader },
      });
    }
    return c.json({ success: true });
  } catch {
    return c.json({ success: true }); // Always succeed on signout
  }
});

/**
 * GET /api/auth/me
 */
auth.get("/me", requireAuth, async (c) => {
  try {
    const user = getUser(c);
    const dbRes = await fetch(
      `${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${user.id}&select=plan,reports_used,reports_limit,cfo_mode,full_name`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );
    const rows = await dbRes.json() as Array<Record<string, unknown>>;
    return c.json({ success: true, user: { ...user, ...rows?.[0] } });
  } catch {
    return c.json({ success: false, error: "Failed to fetch user." }, 500);
  }
});

/**
 * POST /api/auth/consume-report
 * Decrement user's report quota by 1
 */
auth.post("/consume-report", requireAuth, async (c) => {
  try {
    const user = getUser(c);

    if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
      return c.json({ success: false, error: "Database not configured." }, 503);
    }

    const dbRes = await fetch(
      `${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${user.id}&select=plan,reports_used,reports_limit`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    const users = await dbRes.json() as Array<{ plan: string; reports_used: number; reports_limit: number }>;
    const dbUser = users?.[0];
    if (!dbUser) return c.json({ success: false, error: "Account not found." }, 404);

    if (dbUser.reports_used >= dbUser.reports_limit) {
      return c.json({
        success: false,
        error: `Report limit reached (${dbUser.reports_limit}). Please upgrade your plan.`,
        limitReached: true,
      }, 403);
    }

    await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${user.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({ reports_used: dbUser.reports_used + 1 }),
    });

    return c.json({
      success: true,
      reportsUsed: dbUser.reports_used + 1,
      reportsLimit: dbUser.reports_limit,
      remaining: dbUser.reports_limit - dbUser.reports_used - 1,
    });
  } catch {
    return c.json({ success: false, error: "Failed to process request." }, 500);
  }
});

export default auth;
