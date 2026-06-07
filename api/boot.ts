/**
 * EEXA Platform — Main API Entry Point
 * Refactored: modular routes, security middleware, auth on all sensitive endpoints
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router.js";
import { createContext } from "./context.js";
import { env, validateProductionEnv } from "./lib/env.js";
import { securityHeaders, csrfProtection } from "./middleware/security.js";

// Route modules
import authRoutes from "./routes/auth.js";
import analysisRoutes from "./routes/analysis.js";
import targetsRoutes from "./routes/targets.js";
import reportsRoutes from "./routes/reports.js";
import billingRoutes from "./routes/billing.js";
import userRoutes from "./routes/user.js";

const app = new Hono<{ Bindings: HttpBindings }>();

// ==================== SECURITY HEADERS (all responses) ====================
app.use("*", securityHeaders);

// ==================== CORS ====================
const ALLOWED_ORIGINS = env.corsAllowedOrigins
  .split(",")
  .map((o: string) => o.trim())
  .filter(Boolean);

app.use("*", cors({
  origin: (origin: string | undefined) => {
    if (!origin) return null;
    return ALLOWED_ORIGINS.includes(origin) ? origin : null;
  },
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ==================== CSRF PROTECTION ====================
app.use("/api/*", csrfProtection);

// ==================== BODY LIMIT ====================
app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

// ==================== HEALTH CHECKS ====================

app.get("/health", (c) => c.json({ status: "ok", timestamp: new Date().toISOString() }));

app.get("/health/ready", async (c) => {
  const checks: Record<string, string> = { api: "ok" };

  // Check Supabase connectivity
  if (env.supabaseUrl) {
    try {
      const res = await fetch(`${env.supabaseUrl}/rest/v1/`, {
        headers: { apikey: env.supabaseAnonKey },
        signal: AbortSignal.timeout(3000),
      });
      checks.database = res.ok ? "ok" : "degraded";
    } catch {
      checks.database = "unavailable";
    }
  } else {
    checks.database = "not_configured";
  }

  const healthy = Object.values(checks).every(v => v === "ok" || v === "not_configured");
  return c.json({ status: healthy ? "ready" : "degraded", checks }, healthy ? 200 : 503);
});

// ==================== ROUTES ====================

// Auth endpoints (rate limited but some are public)
app.route("/api/auth", authRoutes);

// Analysis endpoint (requires auth)
app.route("/api", analysisRoutes);

// Targets (requires auth + ownership)
app.route("/api/targets", targetsRoutes);

// Reports (requires auth)
app.route("/api/reports", reportsRoutes);

// Billing: Stripe + Moyasar
app.route("/api/billing", billingRoutes);
// Legacy webhook paths
app.post("/api/stripe/webhook", async (c) => {
  const res = await fetch(`http://localhost:${parseInt(process.env.API_PORT || "3001")}/api/billing/stripe/webhook`, {
    method: "POST",
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body: await c.req.text(),
  });
  return new Response(res.body, { status: res.status, headers: res.headers });
});

// User settings
app.route("/api/user", userRoutes);

// ==================== TRPC ====================
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

// 404 catch-all for /api/*
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

// ==================== SERVER STARTUP ====================

const isMain =
  import.meta.url === `file:///${process.argv[1]?.replace(/\\/g, "/")}` ||
  process.argv[1]?.endsWith("boot.ts") ||
  process.argv[1]?.endsWith("server.ts");

if (isMain || env.isProduction) {
  validateProductionEnv();

  const { serve } = await import("@hono/node-server");
  if (env.isProduction) {
    const { serveStaticFiles } = await import("./lib/vite.js");
    serveStaticFiles(app);
  }
  const port = parseInt(process.env.API_PORT || process.env.PORT || "3001");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`✅ EEXA Platform API running on http://localhost:${port}/`);
    console.log(`   Environment: ${env.isProduction ? "production" : "development"}`);
  });
}
