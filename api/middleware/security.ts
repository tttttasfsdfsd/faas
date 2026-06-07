import type { Context, Next } from "hono";
import { env } from "../lib/env.js";

/** Apply HTTP security headers to every response */
export async function securityHeaders(c: Context, next: Next) {
  await next();

  // Content-Security-Policy
  c.header(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob:; " +
    "connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.stripe.com; " +
    "frame-ancestors 'none';"
  );
  c.header("X-Frame-Options", "DENY");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  if (env.isProduction) {
    c.header(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }

  // Remove server fingerprint headers
  c.header("X-Powered-By", "");
  c.header("Server", "");
}

/** CSRF token validation for mutating requests */
export async function csrfProtection(c: Context, next: Next) {
  const method = c.req.method;
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    // API endpoints using JSON body + Authorization header are CORS-protected.
    // For multipart/form endpoints we check the Origin header.
    const contentType = c.req.header("Content-Type") ?? "";
    if (contentType.includes("multipart/form-data") || contentType.includes("application/x-www-form-urlencoded")) {
      const origin = c.req.header("Origin");
      const host = c.req.header("Host");
      if (!origin || !host) {
        return c.json({ success: false, error: "CSRF validation failed." }, 403);
      }
      try {
        const originHost = new URL(origin).host;
        if (originHost !== host) {
          return c.json({ success: false, error: "CSRF validation failed: origin mismatch." }, 403);
        }
      } catch {
        return c.json({ success: false, error: "CSRF validation failed: malformed origin." }, 403);
      }
    }
  }
  await next();
}
