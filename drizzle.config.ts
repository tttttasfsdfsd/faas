import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error(
    "DATABASE_URL مطلوب لتشغيل أوامر drizzle.\n" +
    "مثال: postgresql://postgres.[project-ref]:[password]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
  );
}

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  // ✅ Supabase يستخدم PostgreSQL — تم تغيير mysql إلى postgresql
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
  // Supabase uses connection pooling — recommended settings:
  verbose: true,
  strict: true,
});
