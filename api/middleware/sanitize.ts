/**
 * Sanitize user-supplied strings before inserting them into AI prompts.
 * Removes/escapes common prompt injection patterns.
 */
export function sanitizeForPrompt(input: unknown): string {
  if (typeof input !== "string") return "";

  return input
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove prompt injection keywords (case-insensitive)
    .replace(/ignore\s+(previous|above|all)\s+instructions?/gi, "[removed]")
    .replace(/system\s*prompt/gi, "[removed]")
    .replace(/you\s+are\s+(now|a|an)\s+/gi, "[removed]")
    .replace(/act\s+as\s+(a|an|if)\s+/gi, "[removed]")
    .replace(/jailbreak/gi, "[removed]")
    .replace(/\bDAN\b/g, "[removed]")
    // Remove markdown code fences that could confuse structured prompts
    .replace(/```[\s\S]*?```/g, "[code block removed]")
    // Limit length
    .slice(0, 500)
    .trim();
}

/** Sanitize a company name for use in prompts and DB storage */
export function sanitizeCompanyName(name: unknown): string {
  if (typeof name !== "string") return "Unknown Company";
  return sanitizeForPrompt(name)
    .replace(/[<>"'`;]/g, "")
    .slice(0, 100)
    .trim() || "Unknown Company";
}

/** Sanitize a sector/industry label */
export function sanitizeSector(sector: unknown): string {
  if (typeof sector !== "string") return "General";
  return sanitizeForPrompt(sector)
    .replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-&]/g, "")
    .slice(0, 80)
    .trim() || "General";
}

/** Sanitize file metadata before prompt insertion */
export function sanitizeMetadata(obj: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const safeKey = String(key).replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 50);
    result[safeKey] = sanitizeForPrompt(String(value ?? "")).slice(0, 200);
  }
  return result;
}
