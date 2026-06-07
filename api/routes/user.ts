import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { UserSettingsSchema } from "../middleware/validation.js";

const user = new Hono();

user.use("*", requireAuth);

/**
 * PATCH /api/user/settings
 * Update user preferences (cfoMode, language, theme, sector)
 */
user.patch("/settings", async (c) => {
  try {
    const authUser = getUser(c);
    const body = await c.req.json();

    const parsed = UserSettingsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Validation failed", details: parsed.error.errors }, 400);
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.cfoMode !== undefined) updates.cfo_mode = parsed.data.cfoMode;
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.theme !== undefined) updates.theme = parsed.data.theme;
    if (parsed.data.sector !== undefined) updates.sector = parsed.data.sector;

    await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${authUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify(updates),
    });

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Failed to update settings." }, 500);
  }
});

/**
 * PATCH /api/user/cfo-mode  (legacy endpoint — kept for backwards compat)
 */
user.patch("/cfo-mode", async (c) => {
  try {
    const authUser = getUser(c);
    const { cfoMode } = await c.req.json() as { cfoMode?: boolean };

    if (typeof cfoMode !== "boolean") {
      return c.json({ success: false, error: "cfoMode must be a boolean." }, 400);
    }

    await fetch(`${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${authUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
      body: JSON.stringify({ cfo_mode: cfoMode }),
    });

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Failed to update setting." }, 500);
  }
});

export default user;
