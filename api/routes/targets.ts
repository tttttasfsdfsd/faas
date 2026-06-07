import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { TargetsSchema } from "../middleware/validation.js";

const targets = new Hono();

// All targets routes require authentication
targets.use("*", requireAuth);

/**
 * Verify that a companyId belongs to the authenticated user.
 * Returns the row or null.
 */
async function verifyCompanyOwnership(userId: string, companyId: string): Promise<boolean> {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return false;

  // A company is "owned" by a user if there is at least one report
  // saved by that user with matching company_id
  const res = await fetch(
    `${env.supabaseUrl}/rest/v1/reports?user_id=eq.${encodeURIComponent(userId)}&company_id=eq.${encodeURIComponent(companyId)}&select=id&limit=1`,
    {
      headers: {
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
      },
    }
  );
  if (!res.ok) return false;
  const rows = await res.json() as unknown[];
  return rows.length > 0;
}

/**
 * GET /api/targets/:companyId
 */
targets.get("/:companyId", async (c) => {
  try {
    const user = getUser(c);
    const companyId = c.req.param("companyId");

    if (!companyId || !/^[a-zA-Z0-9_-]{1,100}$/.test(companyId)) {
      return c.json({ success: false, error: "Invalid company ID." }, 400);
    }

    const owns = await verifyCompanyOwnership(user.id, companyId);
    if (!owns) {
      // Return 403 (not 404) to prevent enumeration
      return c.json({ success: false, error: "Access denied." }, 403);
    }

    const res = await fetch(
      `${env.supabaseUrl}/rest/v1/targets?company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(user.id)}&select=*&limit=1`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    const rows = await res.json() as unknown[];
    return c.json({ success: true, targets: rows?.[0] || null });
  } catch {
    return c.json({ success: false, error: "Failed to fetch targets." }, 500);
  }
});

/**
 * PUT /api/targets/:companyId
 */
targets.put("/:companyId", async (c) => {
  try {
    const user = getUser(c);
    const companyId = c.req.param("companyId");

    if (!companyId || !/^[a-zA-Z0-9_-]{1,100}$/.test(companyId)) {
      return c.json({ success: false, error: "Invalid company ID." }, 400);
    }

    const owns = await verifyCompanyOwnership(user.id, companyId);
    if (!owns) {
      return c.json({ success: false, error: "Access denied." }, 403);
    }

    const body = await c.req.json();
    const parsed = TargetsSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Validation failed", details: parsed.error.errors }, 400);
    }

    const res = await fetch(`${env.supabaseUrl}/rest/v1/targets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify({
        ...parsed.data,
        company_id: companyId,
        user_id: user.id, // Ensure user_id is always set
        updated_at: new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      return c.json({ success: false, error: "Failed to save targets." }, 500);
    }

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Failed to save targets." }, 500);
  }
});

/**
 * DELETE /api/targets/:companyId
 */
targets.delete("/:companyId", async (c) => {
  try {
    const user = getUser(c);
    const companyId = c.req.param("companyId");

    if (!companyId || !/^[a-zA-Z0-9_-]{1,100}$/.test(companyId)) {
      return c.json({ success: false, error: "Invalid company ID." }, 400);
    }

    // Always scope deletion to user's own targets
    await fetch(
      `${env.supabaseUrl}/rest/v1/targets?company_id=eq.${encodeURIComponent(companyId)}&user_id=eq.${encodeURIComponent(user.id)}`,
      {
        method: "DELETE",
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    return c.json({ success: true });
  } catch {
    return c.json({ success: false, error: "Failed to delete targets." }, 500);
  }
});

export default targets;
