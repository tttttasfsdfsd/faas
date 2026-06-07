import { Hono } from "hono";
import { env } from "../lib/env.js";
import { requireAuth, getUser } from "../middleware/auth.js";
import { ipRateLimit, userRateLimit } from "../middleware/rateLimit.js";
import { sanitizeCompanyName, sanitizeSector } from "../middleware/sanitize.js";
import { validateFileUpload, AnalyzeRequestSchema } from "../middleware/validation.js";

const analysis = new Hono();

// ==================== /api/analyze ====================
// Requires authentication + per-user rate limiting + IP fallback

analysis.post(
  "/analyze",
  requireAuth,
  ipRateLimit(15, 60_000),   // IP-level protection
  userRateLimit(10, 60_000),  // Per-user quota
  async (c) => {
    try {
      const user = getUser(c);

      // Check report quota before processing
      if (env.supabaseUrl && env.supabaseServiceRoleKey) {
        const dbRes = await fetch(
          `${env.supabaseUrl}/rest/v1/users?supabase_id=eq.${user.id}&select=reports_used,reports_limit&limit=1`,
          {
            headers: {
              apikey: env.supabaseServiceRoleKey,
              Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
            },
          }
        );
        const rows = await dbRes.json() as Array<{ reports_used: number; reports_limit: number }>;
        const dbUser = rows?.[0];
        if (dbUser && dbUser.reports_used >= dbUser.reports_limit) {
          return c.json({
            success: false,
            error: "Report limit reached. Please upgrade your plan.",
            limitReached: true,
          }, 403);
        }
      }

      const formData = await c.req.formData();
      const file = formData.get("file") as File | null;

      // Validate and sanitize user inputs (prompt injection prevention)
      const rawCompanyName = formData.get("companyName") as string;
      const rawSector = formData.get("sector") as string;
      const companyName = sanitizeCompanyName(rawCompanyName);
      const sector = sanitizeSector(rawSector);

      if (!file) {
        return c.json({ success: false, error: "No file uploaded." }, 400);
      }

      // MIME / extension validation
      const fileValidation = validateFileUpload(file);
      if (!fileValidation.valid) {
        return c.json({ success: false, error: fileValidation.error }, 400);
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const isPDF = file.name.toLowerCase().endsWith(".pdf");

      let rawData: Record<string, unknown>[] = [];

      if (isPDF) {
        rawData = await extractPDFData(bytes, buffer);
      } else {
        rawData = await extractExcelData(buffer);
      }

      if (rawData.length === 0) {
        return c.json({
          success: false,
          error: isPDF
            ? "Could not extract data from this PDF. Ensure it contains clear financial tables or use Excel format."
            : "File is empty or contains no readable data.",
        }, 400);
      }

      const { mapColumnsWithClaude, mapFinancialColumns, normalizeFinancialData } = await import(
        "../../src/lib/semanticMapping.js"
      );
      const { analyzeFinancials } = await import("../../src/lib/financialEngine.js");

      const columns = Object.keys(rawData[0]);

      let mappings = env.anthropicApiKey && !env.anthropicApiKey.includes("placeholder")
        ? await mapColumnsWithClaude(columns, rawData.slice(0, 3), env.anthropicApiKey)
        : [];

      if (mappings.length === 0) {
        mappings = mapFinancialColumns(columns);
      }

      const normalizedData = normalizeFinancialData(rawData, mappings);
      const financials = analyzeFinancials(normalizedData);
      const insights = await generateInsights(financials, companyName, sector, env.anthropicApiKey);

      return c.json({
        success: true,
        financials,
        insights,
        rawData,
        mappings,
        companyName,
        sector,
        isPDF,
        needsConfirmation: true,
      });
    } catch (error) {
      console.error("Analysis error:", error);
      return c.json({
        success: false,
        error: error instanceof Error ? error.message : "An unexpected error occurred.",
      }, 500);
    }
  }
);

// ==================== PDF EXTRACTION ====================

async function extractPDFData(bytes: ArrayBuffer, _buffer: Buffer): Promise<Record<string, unknown>[]> {
  try {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(bytes) });
    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const items = content.items as Array<{ str: string; transform: number[] }>;
      const lineMap = new Map<number, string[]>();
      for (const item of items) {
        const y = Math.round(item.transform[5]);
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(item.str);
      }
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      for (const y of sortedY) {
        fullText += lineMap.get(y)!.join(" ") + "\n";
      }
    }

    return parsePDFTextToRows(fullText);
  } catch (e) {
    console.error("PDF extraction failed:", e);
    return [];
  }
}

function parsePDFTextToRows(text: string): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const lines = text.split("\n").map((l: string) => l.trim()).filter(Boolean);

  const toWesternNum = (s: string) =>
    s.replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d: string) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

  // PHASE 5 FIX: Parse parenthesized negatives like (1,500) → -1500
  const parseNum = (s: string): number => {
    const trimmed = s.trim();
    const isNeg = trimmed.startsWith("(") && trimmed.endsWith(")");
    const cleaned = toWesternNum(trimmed.replace(/[()]/g, "").replace(/[,،\s]/g, ""));
    const num = parseFloat(cleaned);
    if (isNaN(num)) return 0;
    return isNeg ? -num : num;
  };

  // Detect year labels for multi-period extraction
  const yearRegex = /\b(20\d{2}|19\d{2})\b/;
  const periodMap = new Map<string, Record<string, unknown>>();

  // Number regex that handles parenthesized negatives
  const numRegex = /\([\d,،٠-٩\s.]+\)|[\d٠-٩][,،\d٠-٩]*\.?[\d٠-٩]*/g;

  const isRevenueLine = (l: string) => /revenue|sales|إيراد|مبيعات|الإيرادات|المبيعات/i.test(l);
  const isExpenseLine = (l: string) => /expense|cost|مصروف|تكلفة|مصاريف/i.test(l);
  const isAssetLine = (l: string) => /total\s+assets?|إجمالي الأصول/i.test(l);
  const isLiabLine = (l: string) => /total\s+liabilit|إجمالي الخصوم|إجمالي الالتزامات/i.test(l);
  const isCashLine = (l: string) => /^cash\b|^نقد|نقدية وما|cash and cash/i.test(l);
  const isEquityLine = (l: string) => /equity|حقوق الملك/i.test(l);
  const isInventoryLine = (l: string) => /inventor|مخزون/i.test(l);
  const isProfitLine = (l: string) => /net (income|profit)|صافي (الربح|الدخل)/i.test(l);
  const isCOGSLine = (l: string) => /cost of (goods|revenue|sales)|تكلفة البضاعة/i.test(l);
  const isGrossProfitLine = (l: string) => /gross profit|إجمالي الربح|الربح الإجمالي/i.test(l);
  const isDepreciationLine = (l: string) => /depreciation|استهلاك/i.test(l);
  const isInterestLine = (l: string) => /interest expense|مصروف الفائدة/i.test(l);
  const isTaxLine = (l: string) => /income tax|ضريبة الدخل/i.test(l);
  const isOCFLine = (l: string) => /operating cash|التدفق النقدي.*تشغيل/i.test(l);

  // Try to detect multi-year header
  const headerLine = lines.slice(0, 10).join(" ");
  const years = [...headerLine.matchAll(/\b(20\d{2})\b/g)].map(m => m[1]);

  if (years.length >= 2) {
    // Multi-period: initialize a record for each detected year
    for (const y of years) {
      periodMap.set(y, { month: y });
    }

    for (const line of lines) {
      const nums = line.match(numRegex);
      if (!nums || nums.length < 2) continue;
      const parsedNums = nums.map(parseNum).filter(n => n !== 0);
      if (parsedNums.length < 2) continue;

      const setPeriodField = (field: string, values: number[]) => {
        years.forEach((y, i) => {
          const rec = periodMap.get(y)!;
          if (values[i] !== undefined && !rec[field]) rec[field] = values[i];
        });
      };

      if (isRevenueLine(line)) setPeriodField("revenue", parsedNums);
      else if (isProfitLine(line)) setPeriodField("netIncome", parsedNums);
      else if (isCOGSLine(line)) setPeriodField("cogs", parsedNums);
      else if (isGrossProfitLine(line)) setPeriodField("grossProfit", parsedNums);
      else if (isExpenseLine(line)) setPeriodField("operatingExpenses", parsedNums);
      else if (isAssetLine(line)) setPeriodField("totalAssets", parsedNums);
      else if (isLiabLine(line)) setPeriodField("totalLiabilities", parsedNums);
      else if (isCashLine(line)) setPeriodField("cash", parsedNums);
      else if (isEquityLine(line)) setPeriodField("equity", parsedNums);
      else if (isInventoryLine(line)) setPeriodField("inventory", parsedNums);
      else if (isDepreciationLine(line)) setPeriodField("depreciation", parsedNums);
      else if (isInterestLine(line)) setPeriodField("interestExpense", parsedNums);
      else if (isTaxLine(line)) setPeriodField("tax", parsedNums);
      else if (isOCFLine(line)) setPeriodField("operatingCashFlow", parsedNums);
    }

    for (const rec of periodMap.values()) {
      if ((rec.revenue as number) > 0 || (rec.totalAssets as number) > 0) {
        rows.push(rec);
      }
    }

    if (rows.length > 0) return rows;
  }

  // Single-period fallback
  const record: Record<string, unknown> = { month: "Period 1" };

  for (const line of lines) {
    const nums = line.match(numRegex);
    if (!nums || nums.length === 0) continue;
    const mainNum = parseNum(nums[0]);
    if (mainNum === 0) continue;

    if (isRevenueLine(line) && !record.revenue) record.revenue = mainNum;
    else if (isProfitLine(line) && !record.netIncome) record.netIncome = mainNum;
    else if (isCOGSLine(line) && !record.cogs) record.cogs = mainNum;
    else if (isGrossProfitLine(line) && !record.grossProfit) record.grossProfit = mainNum;
    else if (isExpenseLine(line) && !record.operatingExpenses) record.operatingExpenses = mainNum;
    else if (isAssetLine(line) && !record.totalAssets) record.totalAssets = mainNum;
    else if (isLiabLine(line) && !record.totalLiabilities) record.totalLiabilities = mainNum;
    else if (isCashLine(line) && !record.cash) record.cash = mainNum;
    else if (isEquityLine(line) && !record.equity) record.equity = mainNum;
    else if (isInventoryLine(line) && !record.inventory) record.inventory = mainNum;
    else if (isDepreciationLine(line) && !record.depreciation) record.depreciation = mainNum;
    else if (isInterestLine(line) && !record.interestExpense) record.interestExpense = mainNum;
    else if (isTaxLine(line) && !record.tax) record.tax = mainNum;
    else if (isOCFLine(line) && !record.operatingCashFlow) record.operatingCashFlow = mainNum;
  }

  if ((record.revenue as number) > 0 || (record.totalAssets as number) > 0) {
    rows.push(record);
  }

  return rows;
}

// ==================== EXCEL EXTRACTION ====================

async function extractExcelData(buffer: Buffer): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  let bestData: Record<string, unknown>[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, defval: null, raw: true, blankrows: false,
    }) as unknown[][];

    if (rawRows.length < 2) continue;

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      const row = rawRows[i];
      const financialKeywords = ["revenue", "sales", "إيراد", "مبيعات", "profit", "ربح", "asset", "أصول", "cash", "نقد", "expenses", "مصروف", "month", "شهر", "liabilit", "خصوم", "equity", "ملكية", "cogs", "تكلفة"];
      const hasKeyword = row.some((v) => typeof v === "string" && financialKeywords.some((kw) => (v as string).toLowerCase().includes(kw)));
      const nonNumericCells = row.filter((v) => v !== null && v !== undefined && v !== "" && typeof v === "string" && isNaN(Number(String(v).replace(/[,،٠-٩]/g, ""))));
      if (nonNumericCells.length >= 2 && hasKeyword) { headerRowIdx = i; break; }
    }

    if (headerRowIdx === -1) headerRowIdx = 0;

    const headers = rawRows[headerRowIdx].map((h, i) =>
      h !== null && h !== undefined && h !== "" ? String(h).trim() : `col_${i}`
    );

    const dataRows: Record<string, unknown>[] = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      const hasData = row.some((v) => v !== null && v !== undefined && v !== "");
      if (!hasData) continue;

      const obj: Record<string, unknown> = {};
      headers.forEach((h, j) => {
        let val: unknown = row[j] ?? null;
        if (typeof val === "string" && val.trim()) {
          // Handle parenthesized negatives: (1,500) → -1500
          const trimmed = val.trim();
          if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
            const inner = trimmed.slice(1, -1).replace(/[,،٠-٩]/g, (d) => {
              const arabic = "٠١٢٣٤٥٦٧٨٩";
              return arabic.includes(d) ? String(arabic.indexOf(d)) : d;
            }).replace(/,/g, "");
            const n = parseFloat(inner);
            val = isNaN(n) ? trimmed : -n;
          } else {
            const western = trimmed
              .replace(/[٠١٢٣٤٥٦٧٨٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
              .replace(/[,،٬']/g, "")
              .trim();
            const num = parseFloat(western);
            val = isNaN(num) ? trimmed : num;
          }
        }
        if (val !== null && val !== undefined && val !== "") obj[h] = val;
      });

      if (Object.values(obj).some((v) => typeof v === "number")) {
        dataRows.push(obj);
      }
    }

    if (dataRows.length > bestData.length) bestData = dataRows;
  }

  return bestData;
}

// ==================== AI INSIGHTS ====================

async function generateInsights(
  financials: Record<string, unknown>,
  companyName: string,
  sector: string,
  anthropicKey?: string
): Promise<Array<{ type: string; title: string; text: string }>> {
  const f = financials as Record<string, number>;
  const prof = (financials.profitability as Record<string, number>) ?? {};
  const liq = (financials.liquidity as Record<string, number>) ?? {};
  const sol = (financials.solvency as Record<string, number>) ?? {};
  const cf = (financials.cashFlow as Record<string, number>) ?? {};
  const score = (financials.score as Record<string, number>) ?? {};

  if (anthropicKey && !anthropicKey.includes("placeholder")) {
    try {
      const Anthropic = await import("@anthropic-ai/sdk");
      const client = new (Anthropic as unknown as {
        default: new (opts: { apiKey: string }) => {
          messages: { create: (opts: unknown) => Promise<{ content: Array<{ type: string; text: string }> }> };
        };
      }).default({ apiKey: anthropicKey });

      // Sanitized inputs are already safe at this point (sanitized above)
      const prompt = `You are an expert CFO advisor. Analyze this company's financial data and provide 4 actionable insights in Arabic.

Company: ${companyName}
Sector: ${sector}
Score: ${score.overall ?? 0}/100
Revenue: ${(f.totalRevenue ?? 0).toLocaleString()} SAR
Net Profit: ${(f.netProfit ?? 0).toLocaleString()} SAR (${(prof.netMargin ?? 0).toFixed(1)}%)
Gross Margin: ${(prof.grossMargin ?? 0).toFixed(1)}% | EBITDA: ${(prof.ebitdaMargin ?? 0).toFixed(1)}%
ROA: ${(prof.roa ?? 0).toFixed(1)}% | ROE: ${(prof.roe ?? 0).toFixed(1)}%
Current Ratio: ${(liq.currentRatio ?? 0).toFixed(2)} | Quick Ratio: ${(liq.quickRatio ?? 0).toFixed(2)}
Debt Ratio: ${((sol.debtRatio ?? 0) * 100).toFixed(1)}% | Interest Coverage: ${(sol.interestCoverage ?? 0).toFixed(1)}x
Months Runway: ${(cf.monthsRunway ?? 0).toFixed(1)} | Burn Rate: ${(cf.burnRate ?? 0).toLocaleString()} SAR/month

Return ONLY valid JSON array (no markdown):
[
  {"type":"summary","title":"الملخص التنفيذي","text":"paragraph with specific numbers"},
  {"type":"risk","title":"أبرز المخاطر","text":"2-3 risks with numbers"},
  {"type":"opportunity","title":"فرص النمو","text":"2-3 opportunities"},
  {"type":"recommendation","title":"توصيات CFO","text":"3 prioritized recommendations with timelines"}
]`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = response.content[0]?.type === "text" ? response.content[0].text : "";
      const match = raw.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) {
      console.error("AI insights error:", e);
    }
  }

  // Fallback without AI
  const scoreVal = score.overall ?? 0;
  const netMargin = prof.netMargin ?? 0;
  const debtRatio = (sol.debtRatio ?? 0) * 100;
  const monthsRunway = cf.monthsRunway ?? 0;
  const currentRatio = liq.currentRatio ?? 0;

  return [
    {
      type: "summary", title: "الملخص التنفيذي",
      text: `التقييم المالي ${scoreVal}/100. هامش الربح الصافي ${netMargin.toFixed(1)}%. نمو الإيرادات ${(f.revenueGrowth || 0).toFixed(1)}%.`,
    },
    {
      type: "risk", title: "أبرز المخاطر",
      text: [
        debtRatio > 60 ? `نسبة ديون مرتفعة (${debtRatio.toFixed(1)}%).` : null,
        monthsRunway < 6 ? `🚨 أشهر البقاء النقدي ${monthsRunway.toFixed(1)} فقط.` : null,
        currentRatio < 1.2 ? `نسبة التداول ${currentRatio.toFixed(2)} — سيولة محدودة.` : null,
      ].filter(Boolean).join(" ") || "المخاطر في نطاق مقبول.",
    },
    {
      type: "opportunity", title: "فرص النمو",
      text: currentRatio > 2 && debtRatio < 40
        ? `الميزانية القوية تتيح فرصة للتوسع (نسبة التداول ${currentRatio.toFixed(2)}).`
        : `تحسين هامش الربح الإجمالي 3-5% سيضيف قيمة جوهرية.`,
    },
    {
      type: "recommendation", title: "توصيات CFO",
      text: [
        monthsRunway < 12 ? `[عاجل] بناء احتياطي نقدي 12 شهراً.` : null,
        debtRatio > 55 ? `[30 يوم] وضع خطة لتخفيض الديون.` : null,
        `[60 يوم] مراجعة أكبر 5 بنود تكلفة.`,
      ].filter(Boolean).join(" "),
    },
  ];
}

export default analysis;
