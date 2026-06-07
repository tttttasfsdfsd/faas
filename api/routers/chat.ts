import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { env } from "../lib/env";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const chatRouter = createRouter({
  send: publicQuery
    .input(
      z.object({
        message: z.string().min(1),
        financials: z.record(z.unknown()).optional(),
        companyName: z.string().optional(),
        history: z.array(z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string(),
        })).optional(),
        language: z.enum(["ar", "en"]).default("ar"),
        // السياق الكامل للمستشار الذكي
        targets: z.record(z.number().nullable()).optional(),
        historicalPeriods: z.array(z.record(z.unknown())).optional(),
        sector: z.string().optional(),
        sectorBenchmarks: z.record(z.unknown()).optional(),
        earningsQualityScore: z.number().optional(),
        lastScenario: z.object({
          variable: z.string(),
          changePct: z.number(),
          result: z.record(z.unknown()),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const {
        message, financials, companyName, history, language,
        targets, historicalPeriods, sector, sectorBenchmarks,
        earningsQualityScore, lastScenario,
      } = input;

      if (!env.openaiApiKey && !env.anthropicApiKey) {
        return { success: true, reply: generateFallbackResponse(message, financials, language) };
      }

      const ctx = { targets, historicalPeriods, sector, sectorBenchmarks, earningsQualityScore, lastScenario };

      try {
        // Prefer Anthropic if available
        if (env.anthropicApiKey && !env.anthropicApiKey.includes("placeholder")) {
          return await callAnthropic(message, financials, companyName, history, language, env.anthropicApiKey, ctx);
        }
        if (env.openaiApiKey) {
          return await callOpenAI(message, financials, companyName, history, language, env.openaiApiKey, ctx);
        }
      } catch (error) {
        console.error("Chat error:", error);
      }

      return { success: true, reply: generateFallbackResponse(message, financials, language) };
    }),
});

interface AnalystContext {
  targets?: Record<string, number | null>;
  historicalPeriods?: Record<string, unknown>[];
  sector?: string;
  sectorBenchmarks?: Record<string, unknown>;
  earningsQualityScore?: number;
  lastScenario?: { variable: string; changePct: number; result: Record<string, unknown> };
}

async function callAnthropic(
  message: string,
  financials: Record<string, unknown> | undefined,
  companyName: string | undefined,
  history: ChatMessage[] | undefined,
  language: "ar" | "en",
  apiKey: string,
  ctx?: AnalystContext
) {
  const Anthropic = await import("@anthropic-ai/sdk");
  const client = new Anthropic.default({ apiKey });

  const systemPrompt = buildSystemPrompt(financials, companyName, language, ctx);

  const messages = [
    ...(history || []).slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
    { role: "user" as const, content: message },
  ];

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 800,
    system: systemPrompt,
    messages,
  });

  const reply = response.content[0]?.type === "text"
    ? response.content[0].text
    : (language === "ar" ? "معليش، ما قدرت أجاوب على هذا السؤال." : "Sorry, I couldn't answer that.");

  return { success: true, reply };
}

async function callOpenAI(
  message: string,
  financials: Record<string, unknown> | undefined,
  companyName: string | undefined,
  history: ChatMessage[] | undefined,
  language: "ar" | "en",
  apiKey: string,
  ctx?: AnalystContext
) {
  const OpenAI = await import("openai");
  const client = new OpenAI.default({ apiKey });

  const systemPrompt = buildSystemPrompt(financials, companyName, language, ctx);

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      ...(history || []).slice(-8).map(h => ({ role: h.role as "user" | "assistant", content: h.content })),
      { role: "user", content: message },
    ],
  });

  const reply = response.choices[0]?.message?.content
    ?? (language === "ar" ? "معليش، ما قدرت أجاوب على هذا السؤال." : "Sorry, I couldn't answer that.");

  return { success: true, reply };
}

function buildSystemPrompt(
  financials: Record<string, unknown> | undefined,
  companyName: string | undefined,
  language: "ar" | "en",
  ctx?: AnalystContext
): string {
  const isArabic = language === "ar";
  const hasFinancials = financials && Object.keys(financials).length > 0;

  const financialContext = hasFinancials ? formatFinancialsForPrompt(financials, companyName, isArabic) : "";
  const enrichedContext = buildEnrichedContext(ctx, isArabic);

  if (isArabic) {
    return `أنت مستشار مالي خبير اسمك "مساعد EEXA". تتحدث بالعربية بأسلوب مهني لكن ودي وطبيعي.

## دورك:
- تحليل البيانات المالية وتقديم رؤى دقيقة ومفيدة
- الإجابة على الأسئلة العامة بشكل طبيعي بدون ذكر الماليات
- تقديم توصيات عملية وقابلة للتنفيذ

## قواعد:
- لا تبدأ بـ "بالطبع" أو "سعيد بمساعدتك" — تكلم بشكل إنساني مباشر
- اذكر الأرقام الدقيقة من البيانات عند الإجابة على أسئلة مالية
- إذا لم يكن هناك بيانات كافية، قل ذلك بصدق بدلاً من التخمين
- ردودك مختصرة ومركّزة — لا تطوّل بدون فائدة
- استخدم الأرقام بالريال السعودي (ريال) عند الاقتضاء
- **القاعدة الذهبية**: لا تجيب على أي سؤال مالي بدون ذكر الرقم الفعلي المحسوب. مثال على إجابة صحيحة: "ROE الحالي هو 18.3%، هدفك 20%، الفرق 1.7%، متوسط القطاع 15.2%، إذن أنت فوق المتوسط لكن دون هدفك."
${financialContext}${enrichedContext}`.trim();
  }

  return `You are an expert financial advisor named "EEXA Assistant". You speak professionally but naturally and conversationally.

## Your role:
- Analyze financial data and provide accurate, actionable insights
- Answer general questions naturally without forcing financial references
- Give practical, specific recommendations

## Rules:
- Never start with "Of course!" or "Happy to help!" — be direct and human
- Cite exact numbers from the data when answering financial questions
- If data is insufficient, say so honestly rather than guessing
- Keep responses concise and focused
- Use SAR (Saudi Riyals) when referencing currency
${financialContext}${enrichedContext}`.trim();
}

function buildEnrichedContext(ctx: AnalystContext | undefined, isArabic: boolean): string {
  if (!ctx) return "";
  const parts: string[] = [];
  const fmt = (n?: number | null, d = 1) => (typeof n === "number" && n !== null) ? n.toFixed(d) : "N/A";

  if (ctx.targets && Object.keys(ctx.targets).length > 0) {
    const t = ctx.targets;
    if (isArabic) {
      parts.push(`
## الأهداف المالية المدخلة من المستخدم:
` +
        (t.revenueGrowth != null ? `- نمو الإيرادات المستهدف: ${fmt(t.revenueGrowth)}%
` : "") +
        (t.roe != null ? `- ROE المستهدف: ${fmt(t.roe)}%
` : "") +
        (t.roa != null ? `- ROA المستهدف: ${fmt(t.roa)}%
` : "") +
        (t.roic != null ? `- ROIC المستهدف: ${fmt(t.roic)}%
` : "") +
        (t.grossMargin != null ? `- هامش الربح الإجمالي المستهدف: ${fmt(t.grossMargin)}%
` : "") +
        (t.netMargin != null ? `- هامش الربح الصافي المستهدف: ${fmt(t.netMargin)}%
` : "") +
        (t.currentRatio != null ? `- نسبة التداول المستهدفة: ${fmt(t.currentRatio, 2)}x
` : "") +
        (t.debtRatio != null ? `- نسبة الدين المستهدفة: ${fmt(t.debtRatio)}%
` : "")
      );
    } else {
      parts.push(`
## User-Defined Financial Targets:
` +
        (t.revenueGrowth != null ? `- Target Revenue Growth: ${fmt(t.revenueGrowth)}%
` : "") +
        (t.roe != null ? `- Target ROE: ${fmt(t.roe)}%
` : "") +
        (t.netMargin != null ? `- Target Net Margin: ${fmt(t.netMargin)}%
` : "")
      );
    }
  }

  if (ctx.sector && ctx.sectorBenchmarks) {
    const b = ctx.sectorBenchmarks as Record<string, { low: number; avg: number; high: number }>;
    if (isArabic) {
      parts.push(`
## بنشمارك القطاع (${ctx.sector}):
` +
        Object.entries(b).slice(0, 8).map(([k, v]) =>
          `- ${k}: منخفض ${fmt(v.low)}% | متوسط ${fmt(v.avg)}% | مرتفع ${fmt(v.high)}%`
        ).join("
")
      );
    } else {
      parts.push(`
## Sector Benchmarks (${ctx.sector}):
` +
        Object.entries(b).slice(0, 8).map(([k, v]) =>
          `- ${k}: Low ${fmt(v.low)}% | Avg ${fmt(v.avg)}% | High ${fmt(v.high)}%`
        ).join("
")
      );
    }
  }

  if (ctx.historicalPeriods && ctx.historicalPeriods.length > 1) {
    const periods = ctx.historicalPeriods as Array<Record<string, unknown>>;
    const label = isArabic ? "## البيانات التاريخية (آخر الفترات):" : "## Historical Periods (recent):";
    parts.push("
" + label + "
" + periods.slice(-4).map((p, i) => {
      const rev = (p.revenue as number) || 0;
      const np = (p.netIncome as number) || 0;
      return `- الفترة ${i + 1}: الإيرادات ${rev.toLocaleString()} ريال | صافي الربح ${np.toLocaleString()} ريال`;
    }).join("
"));
  }

  if (ctx.earningsQualityScore != null) {
    const score = ctx.earningsQualityScore;
    const label = score >= 80 ? "ممتاز" : score >= 60 ? "جيد" : score >= 40 ? "متوسط" : score >= 20 ? "ضعيف" : "سيئ";
    parts.push(isArabic
      ? `
## جودة الأرباح: ${label} (${score}/100) — تعني أن التدفق النقدي ${score >= 60 ? "يدعم" : "لا يدعم"} الأرباح المحاسبية.`
      : `
## Earnings Quality: ${label} (${score}/100)`
    );
  }

  if (ctx.lastScenario) {
    const s = ctx.lastScenario;
    parts.push(isArabic
      ? `
## آخر تحليل سيناريو أجراه المستخدم: تغيير "بمتغير ${s.variable}" بنسبة ${s.changePct > 0 ? "+" : ""}${s.changePct}% — النتائج: ${JSON.stringify(s.result)}`
      : `
## Last Scenario: Changed "variable ${s.variable}" by ${s.changePct}% — Results: ${JSON.stringify(s.result)}`
    );
  }

  return parts.join("");
}

function formatFinancialsForPrompt(
  financials: Record<string, unknown>,
  companyName: string | undefined,
  isArabic: boolean
): string {
  const f = financials as Record<string, number | Record<string, number>>;
  const prof = (f.profitability as Record<string, number>) || {};
  const liq = (f.liquidity as Record<string, number>) || {};
  const sol = (f.solvency as Record<string, number>) || {};
  const eff = (f.efficiency as Record<string, number>) || {};
  const cf = (f.cashFlow as Record<string, number>) || {};
  const score = (f.score as Record<string, number>) || {};
  const altman = (f.altmanZ as Record<string, unknown>) || {};

  const fmt = (n?: number, decimals = 1) => (typeof n === 'number' ? n.toFixed(decimals) : 'N/A');
  const fmtCur = (n?: number) => typeof n === 'number' ? n.toLocaleString('ar-SA') : 'N/A';

  if (isArabic) {
    return `
## البيانات المالية لـ${companyName || "الشركة"}:

**ملخص الأداء:**
- التقييم: ${score.overall ?? 'N/A'}/100 (${score.label || ''})
- الإيرادات: ${fmtCur(f.totalRevenue as number)} ريال
- صافي الربح: ${fmtCur(f.netProfit as number)} ريال
- نمو الإيرادات: ${fmt(f.revenueGrowth as number)}%

**الربحية:**
- هامش الربح الإجمالي: ${fmt(prof.grossMargin)}%
- هامش EBITDA: ${fmt(prof.ebitdaMargin)}%
- هامش الربح الصافي: ${fmt(prof.netMargin)}%
- العائد على الأصول (ROA): ${fmt(prof.roa)}%
- العائد على حقوق الملكية (ROE): ${fmt(prof.roe)}%
- العائد على رأس المال المستثمر (ROIC): ${fmt(prof.roic)}%

**السيولة:**
- نسبة التداول: ${fmt(liq.currentRatio, 2)}
- نسبة السيولة السريعة: ${fmt(liq.quickRatio, 2)}
- رأس المال العامل: ${fmtCur(liq.workingCapital)} ريال

**الملاءة المالية:**
- نسبة الديون: ${fmt((sol.debtRatio ?? 0) * 100)}%
- نسبة الدين إلى حقوق الملكية: ${fmt(sol.debtToEquity, 2)}
- تغطية الفوائد: ${fmt(sol.interestCoverage, 1)}x

**الكفاءة التشغيلية:**
- دوران الأصول: ${fmt(eff.assetTurnover, 2)}x
- أيام المخزون (DIO): ${fmt(eff.dio, 0)} يوم
- أيام القبض (DSO): ${fmt(eff.dso, 0)} يوم
- دورة التحويل النقدي (CCC): ${fmt(eff.ccc, 0)} يوم

**التدفقات النقدية:**
- التدفق التشغيلي: ${fmtCur(cf.ocf)} ريال
- التدفق النقدي الحر: ${fmtCur(cf.freeCashFlow)} ريال
- معدل الحرق: ${fmtCur(cf.burnRate)} ريال/شهر
- أشهر البقاء: ${fmt(cf.monthsRunway, 1)} شهر
- أيام حتى نفاد السيولة: ${cf.daysUntilCashOut === 9999 ? 'آمن' : cf.daysUntilCashOut + ' يوم'}

**مؤشرات الخطر:**
- Altman Z-Score: ${fmt((altman.zScore as number), 2)} (${altman.zone === 'safe' ? 'آمن' : altman.zone === 'grey' ? 'رمادي' : 'خطر'})
`;
  }

  return `
## Financial Data for ${companyName || "Company"}:

**Performance Summary:**
- Score: ${score.overall ?? 'N/A'}/100 (${score.label || ''})
- Revenue: ${fmtCur(f.totalRevenue as number)} SAR
- Net Profit: ${fmtCur(f.netProfit as number)} SAR
- Revenue Growth: ${fmt(f.revenueGrowth as number)}%

**Profitability:**
- Gross Margin: ${fmt(prof.grossMargin)}% | EBITDA Margin: ${fmt(prof.ebitdaMargin)}%
- Net Margin: ${fmt(prof.netMargin)}% | ROA: ${fmt(prof.roa)}% | ROE: ${fmt(prof.roe)}%

**Liquidity:**
- Current Ratio: ${fmt(liq.currentRatio, 2)} | Quick Ratio: ${fmt(liq.quickRatio, 2)}
- Working Capital: ${fmtCur(liq.workingCapital)} SAR

**Solvency:**
- Debt Ratio: ${fmt((sol.debtRatio ?? 0) * 100)}% | D/E: ${fmt(sol.debtToEquity, 2)} | Coverage: ${fmt(sol.interestCoverage)}x

**Efficiency:** DIO: ${fmt(eff.dio, 0)}d | DSO: ${fmt(eff.dso, 0)}d | CCC: ${fmt(eff.ccc, 0)}d

**Cash Flow:**
- OCF: ${fmtCur(cf.ocf)} SAR | FCF: ${fmtCur(cf.freeCashFlow)} SAR
- Runway: ${fmt(cf.monthsRunway)} months | Days until cash out: ${cf.daysUntilCashOut === 9999 ? 'Safe' : cf.daysUntilCashOut + ' days'}

**Risk Indicators:** Altman Z: ${fmt((altman.zScore as number), 2)} (${altman.zone})
`;
}

function generateFallbackResponse(
  message: string,
  financials: Record<string, unknown> | undefined,
  language: "ar" | "en"
): string {
  const isArabic = language === "ar";
  const f = financials as Record<string, number> || {};
  const prof = (financials?.profitability as Record<string, number>) || {};
  const liq = (financials?.liquidity as Record<string, number>) || {};
  const sol = (financials?.solvency as Record<string, number>) || {};
  const cf = (financials?.cashFlow as Record<string, number>) || {};
  const score = (financials?.score as Record<string, number>) || {};
  const lower = message.toLowerCase();

  const greetings = ["كيف حالك","كيفك","مرحبا","هلا","السلام","hello","hi","how are","good morning","good evening","صباح","مساء"];
  if (greetings.some(g => lower.includes(g))) {
    return isArabic ? "الحمد لله بخير! كيف أقدر أساعدك في تحليل الوضع المالي اليوم؟" : "Doing great, thanks! How can I help with your financial analysis today?";
  }

  if (lower.includes("شكر") || lower.includes("thank")) {
    return isArabic ? "العفو! أي سؤال ثاني؟" : "You're welcome! Any other questions?";
  }

  if (!financials || Object.keys(financials).length === 0) {
    return isArabic
      ? "ما فيه بيانات مالية محمّلة حالياً. ارفع ملف Excel أو PDF لأقدر أحلل وضعك المالي."
      : "No financial data loaded yet. Upload an Excel or PDF file so I can analyze your financials.";
  }

  // Financial specific answers using actual computed ratios
  if (/roe|عائد.*ملك|return.*equity/i.test(message)) {
    const roe = prof.roe ?? 0;
    return isArabic
      ? `العائد على حقوق الملكية (ROE): **${roe.toFixed(1)}%**\n\n${roe > 20 ? "ممتاز! يتجاوز المتوسط الصناعي 12%." : roe > 12 ? "جيد. فوق المتوسط الصناعي." : roe > 5 ? "مقبول. هناك مجال للتحسين." : "منخفض. يحتاج مراجعة هيكل التمويل."}\n\nللرفع: تحسين هامش الربح الصافي، رفع كفاءة استخدام الأصول، أو إعادة هيكلة رأس المال.`
      : `Return on Equity (ROE): **${roe.toFixed(1)}%**\n\n${roe > 20 ? "Excellent — above industry average of 12%." : roe > 12 ? "Good — above average." : roe > 5 ? "Acceptable — room to improve." : "Low — review capital structure and profitability drivers."}\n\nTo improve: boost net margin, improve asset utilization, or optimize leverage.`;
  }

  if (/roa|عائد.*أصول|return.*assets/i.test(message)) {
    const roa = prof.roa ?? 0;
    return isArabic
      ? `العائد على الأصول (ROA): **${roa.toFixed(1)}%**\n\n${roa > 10 ? "ممتاز!" : roa > 5 ? "جيد. المتوسط الصناعي 6%." : roa > 0 ? "أقل من المتوسط." : "الأصول لا تدر عائداً إيجابياً."}`
      : `Return on Assets (ROA): **${roa.toFixed(1)}%**\n\n${roa > 10 ? "Excellent!" : roa > 5 ? "Good — near industry average of 6%." : roa > 0 ? "Below average." : "Assets are not generating positive returns."}`;
  }

  if (/profit|ربح|margin|هامش/i.test(message)) {
    const nm = prof.netMargin ?? 0;
    const gm = prof.grossMargin ?? 0;
    return isArabic
      ? `**الربحية:**\n- هامش الربح الإجمالي: ${gm.toFixed(1)}%\n- هامش الربح الصافي: ${nm.toFixed(1)}%\n\n${nm > 15 ? "ممتاز! هامش صحي." : nm > 8 ? "مقبول. المتوسط الصناعي ~10%." : nm > 0 ? "منخفض. يحتاج تحسين." : "الشركة تعمل بخسارة — مراجعة التكاليف ضرورية."}`
      : `**Profitability:**\n- Gross Margin: ${gm.toFixed(1)}%\n- Net Margin: ${nm.toFixed(1)}%\n\n${nm > 15 ? "Excellent — strong margins." : nm > 8 ? "Acceptable — near industry average." : nm > 0 ? "Low margins — review cost structure." : "Operating at a loss — urgent cost review needed."}`;
  }

  if (/cash|سيولة|نقد|runway|بقاء/i.test(message)) {
    const runway = cf.monthsRunway ?? 0;
    const days = cf.daysUntilCashOut ?? 9999;
    const cr = liq.currentRatio ?? 0;
    return isArabic
      ? `**وضع السيولة:**\n- نسبة التداول: ${cr.toFixed(2)}\n- أشهر البقاء النقدي: ${runway.toFixed(1)} شهر\n- معدل الحرق: ${(cf.burnRate ?? 0).toLocaleString()} ريال/شهر\n\n${days < 30 ? "🚨 خطر فوري! السيولة ستنفد خلال " + days + " يوم." : days < 90 ? "⚠️ تحذير: " + days + " يوم حتى نفاد السيولة." : runway > 12 ? "✅ وضع آمن." : "مراقبة مستمرة مطلوبة."}`
      : `**Liquidity Status:**\n- Current Ratio: ${cr.toFixed(2)}\n- Cash Runway: ${runway.toFixed(1)} months\n- Burn Rate: ${(cf.burnRate ?? 0).toLocaleString()} SAR/mo\n\n${days < 30 ? "🚨 Critical: Cash runs out in " + days + " days!" : days < 90 ? "⚠️ Warning: " + days + " days until cash depletion." : runway > 12 ? "✅ Safe position." : "Monitor monthly."}`;
  }

  if (/debt|دين|ديون|leverage|رافعة/i.test(message)) {
    const dr = (sol.debtRatio ?? 0) * 100;
    const de = sol.debtToEquity ?? 0;
    const ic = sol.interestCoverage ?? 0;
    return isArabic
      ? `**الملاءة المالية:**\n- نسبة الديون: ${dr.toFixed(1)}%\n- الدين/حقوق الملكية: ${de.toFixed(2)}x\n- تغطية الفوائد: ${ic.toFixed(1)}x\n\n${dr > 70 ? "⚠️ مديونية مرتفعة جداً." : dr > 50 ? "تعدت المتوسط. راقب تدفقات السداد." : "✅ مستوى دين مقبول."}`
      : `**Solvency:**\n- Debt Ratio: ${dr.toFixed(1)}%\n- D/E: ${de.toFixed(2)}x\n- Interest Coverage: ${ic.toFixed(1)}x\n\n${dr > 70 ? "⚠️ High leverage — financial flexibility limited." : dr > 50 ? "Above average — monitor repayment capacity." : "✅ Manageable debt levels."}`;
  }

  if (/risk|خطر|مخاطر|altman|beneish/i.test(message)) {
    const altman = (financials?.altmanZ as Record<string, unknown>) || {};
    const beneish = (financials?.beneishM as Record<string, unknown>) || {};
    const z = (altman.zScore as number) ?? 0;
    const m = (beneish.mScore as number) ?? -3;
    return isArabic
      ? `**تحليل المخاطر:**\n- Altman Z-Score: ${z.toFixed(2)} — ${altman.zone === 'safe' ? '✅ منطقة آمنة' : altman.zone === 'grey' ? '⚠️ منطقة رمادية' : '🚨 منطقة الضائقة المالية'}\n- Beneish M-Score: ${m.toFixed(2)} — ${m > -2.22 ? '⚠️ احتمال تلاعب محاسبي' : '✅ لا تلاعب محتمل'}\n- التقييم العام: ${score.overall ?? 0}/100`
      : `**Risk Analysis:**\n- Altman Z-Score: ${z.toFixed(2)} — ${altman.zone === 'safe' ? '✅ Safe zone' : altman.zone === 'grey' ? '⚠️ Grey zone' : '🚨 Distress zone'}\n- Beneish M-Score: ${m.toFixed(2)} — ${m > -2.22 ? '⚠️ Earnings manipulation possible' : '✅ No manipulation detected'}\n- Overall Score: ${score.overall ?? 0}/100`;
  }

  // Default
  const scoreVal = score.overall ?? 0;
  return isArabic
    ? `**ملخص مالي:**\n- التقييم: ${scoreVal}/100\n- الإيرادات: ${(f.totalRevenue ?? 0).toLocaleString()} ريال | الربح: ${(f.netProfit ?? 0).toLocaleString()} ريال (${(prof.netMargin ?? 0).toFixed(1)}%)\n- أشهر السيولة: ${(cf.monthsRunway ?? 0).toFixed(1)}\n\nتقدر تسألني عن: الربحية، السيولة، الديون، مخاطر الإفلاس، جودة الأرباح، أو التوقعات.`
    : `**Financial Summary:**\n- Score: ${scoreVal}/100\n- Revenue: ${(f.totalRevenue ?? 0).toLocaleString()} SAR | Profit: ${(f.netProfit ?? 0).toLocaleString()} SAR (${(prof.netMargin ?? 0).toFixed(1)}%)\n- Cash Runway: ${(cf.monthsRunway ?? 0).toFixed(1)} months\n\nAsk me about: profitability, liquidity, debt, bankruptcy risk, earnings quality, or forecasts.`;
}
