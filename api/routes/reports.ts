import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { SaveReportSchema } from "../middleware/validation.js";

const reports = new Hono();

reports.use("*", requireAuth);

/**
 * GET /api/reports
 */
reports.get("/", async (c) => {
  try {
    const user = getUser(c);

    const res = await fetch(
      `${env.supabaseUrl}/rest/v1/reports?user_id=eq.${user.id}&select=id,company_name,created_at,periods_count&order=created_at.desc&limit=50`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    const reportList = await res.json();
    return c.json({ success: true, reports: reportList });
  } catch {
    return c.json({ success: false, error: "Failed to fetch reports." }, 500);
  }
});

/**
 * GET /api/reports/:id
 */
reports.get("/:id", async (c) => {
  try {
    const user = getUser(c);
    const reportId = c.req.param("id");

    const res = await fetch(
      `${env.supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}&user_id=eq.${user.id}&select=*&limit=1`,
      {
        headers: {
          apikey: env.supabaseServiceRoleKey,
          Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        },
      }
    );

    const rows = await res.json() as unknown[];
    if (!rows.length) {
      return c.json({ success: false, error: "Report not found." }, 404);
    }

    return c.json({ success: true, report: rows[0] });
  } catch {
    return c.json({ success: false, error: "Failed to fetch report." }, 500);
  }
});

/**
 * POST /api/reports/save
 */
reports.post("/save", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();

    const parsed = SaveReportSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: "Validation failed", details: parsed.error.errors }, 400);
    }

    const { companyName, financials, insights, periodsCount } = parsed.data;

    const res = await fetch(`${env.supabaseUrl}/rest/v1/reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.supabaseServiceRoleKey,
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        user_id: user.id,
        company_name: companyName,
        financials_json: financials,
        insights_json: insights,
        periods_count: periodsCount || 1,
        created_at: new Date().toISOString(),
      }),
    });

    const saved = await res.json() as Array<{ id: string }>;
    return c.json({ success: true, reportId: saved?.[0]?.id });
  } catch {
    return c.json({ success: false, error: "Failed to save report." }, 500);
  }
});

/**
 * DELETE /api/reports/:id
 */
reports.delete("/:id", async (c) => {
  try {
    const user = getUser(c);
    const reportId = c.req.param("id");

    // Always scope deletion to user's own reports — prevents IDOR
    await fetch(
      `${env.supabaseUrl}/rest/v1/reports?id=eq.${encodeURIComponent(reportId)}&user_id=eq.${user.id}`,
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
    return c.json({ success: false, error: "Failed to delete report." }, 500);
  }
});

export default reports;
