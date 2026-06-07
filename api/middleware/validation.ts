import { z } from "zod";

// ==================== AUTH ====================

export const SignupSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
  fullName: z.string().max(100).optional(),
});

export const SigninSchema = z.object({
  email: z.string().email("Invalid email address").max(254),
  password: z.string().min(1, "Password required").max(128),
});

// ==================== TARGETS ====================

export const TargetsSchema = z.object({
  revenueTarget: z.number().finite().optional(),
  netMarginTarget: z.number().min(0).max(100).optional(),
  currentRatioTarget: z.number().min(0).max(20).optional(),
  debtRatioTarget: z.number().min(0).max(1).optional(),
  roaTarget: z.number().min(-100).max(100).optional(),
  roeTarget: z.number().min(-100).max(100).optional(),
  grossMarginTarget: z.number().min(0).max(100).optional(),
  freeCashFlowTarget: z.number().finite().optional(),
  notes: z.string().max(2000).optional(),
}).strict();

// ==================== REPORTS ====================

export const SaveReportSchema = z.object({
  companyName: z.string().min(1).max(200),
  financials: z.record(z.unknown()),
  insights: z.record(z.unknown()).optional(),
  periodsCount: z.number().int().min(1).max(60).optional(),
});

// ==================== USER SETTINGS ====================

export const UserSettingsSchema = z.object({
  cfoMode: z.boolean().optional(),
  language: z.enum(["ar", "en"]).optional(),
  theme: z.enum(["light", "dark", "system"]).optional(),
  sector: z.string().max(80).optional(),
}).strict();

// ==================== FILE UPLOAD ====================

const ALLOWED_MIME_TYPES = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel",                                            // xls
  "text/csv",
  "application/csv",
  "application/pdf",
];

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".csv", ".pdf"];

export function validateFileUpload(file: File): { valid: boolean; error?: string } {
  const ext = ("." + file.name.split(".").pop()?.toLowerCase()) ?? "";
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` };
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type) && file.type !== "") {
    // Allow empty MIME type (some browsers omit it for CSV) but block known bad types
    const badTypes = ["application/x-executable", "application/x-php", "text/javascript", "application/zip", "application/x-zip"];
    if (badTypes.some(t => file.type.includes(t))) {
      return { valid: false, error: "Rejected file type." };
    }
  }
  if (file.size > 50 * 1024 * 1024) {
    return { valid: false, error: "File too large. Maximum 50MB." };
  }
  return { valid: true };
}

// ==================== BILLING ====================

export const CheckoutSchema = z.object({
  plan: z.enum(["starter", "professional"]),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export const MoyasarCheckoutSchema = z.object({
  plan: z.enum(["starter", "professional"]),
  callbackUrl: z.string().url().optional(),
});

// ==================== AI ANALYSIS REQUEST ====================

export const AnalyzeRequestSchema = z.object({
  companyName: z.string().min(1).max(200).optional(),
  sector: z.string().max(80).optional(),
  language: z.enum(["ar", "en"]).optional(),
});

// ==================== HELPERS ====================

export function validationError(errors: z.ZodError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: "Validation failed",
      details: errors.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    }),
    { status: 400, headers: { "Content-Type": "application/json" } }
  );
}
