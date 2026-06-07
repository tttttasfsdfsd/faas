import { env } from "../lib/env";

let instance: unknown = null;

export function getDb() {
  if (!env.databaseUrl) {
    return null;
  }
  if (!instance) {
    try {
      const { drizzle } = require("drizzle-orm/mysql2");
      const schema = require("@db/schema");
      const relations = require("@db/relations");
      instance = drizzle(env.databaseUrl, {
        mode: "planetscale",
        schema: { ...schema, ...relations },
      });
    } catch {
      return null;
    }
  }
  return instance;
}
