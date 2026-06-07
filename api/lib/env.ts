import "dotenv/config";

function optional(name: string, defaultVal = ""): string {
  return process.env[name] ?? defaultVal;
}

function required(name: string): string {
  const val = process.env[name];
  if (!val && process.env.NODE_ENV === "production") {
    console.error(`[ENV] Missing required environment variable: ${name}`);
  }
  return val ?? "";
}

export const env = {
  appId: optional("APP_ID", "eexa-platform"),
  appSecret: optional("APP_SECRET", "dev-secret"),
  appBaseUrl: optional("APP_BASE_URL", "http://localhost:3000"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: optional("DATABASE_URL"),
  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  openaiApiKey: optional("OPENAI_API_KEY"),
  // Supabase
  supabaseUrl: optional("SUPABASE_URL"),
  supabaseAnonKey: optional("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: optional("SUPABASE_SERVICE_ROLE_KEY"),
  // Stripe — unified plan price IDs
  stripeSecretKey: optional("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: optional("STRIPE_WEBHOOK_SECRET"),
  stripePriceIdStarter: optional("STRIPE_PRICE_ID_STARTER"),
  stripePriceIdProfessional: optional("STRIPE_PRICE_ID_PROFESSIONAL"),
  // Legacy aliases
  get stripePriceIdPro() { return optional("STRIPE_PRICE_ID_PRO") || optional("STRIPE_PRICE_ID_PROFESSIONAL"); },
  get stripePriceIdEnterprise() { return optional("STRIPE_PRICE_ID_ENTERPRISE") || optional("STRIPE_PRICE_ID_PROFESSIONAL"); },
  // Moyasar (Saudi Arabia)
  moyasarPublishableKey: optional("MOYASAR_PUBLISHABLE_KEY"),
  moyasarSecretKey: optional("MOYASAR_SECRET_KEY"),
  // CORS
  corsAllowedOrigins: optional("CORS_ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"),
  // Redis (optional — for production rate limiting/caching)
  redisUrl: optional("REDIS_URL"),
};

/** Validate required production env vars and log warnings */
export function validateProductionEnv(): void {
  if (!env.isProduction) return;

  const required_prod = [
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
    "APP_BASE_URL",
  ];

  const missing = required_prod.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[ENV] Missing production env vars: ${missing.join(", ")}`);
    if (process.env.REQUIRE_ENV === "strict") {
      process.exit(1);
    }
  }

  console.log("[ENV] ✅ Production environment validated.");
}
