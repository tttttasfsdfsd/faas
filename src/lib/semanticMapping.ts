/**
 * EEXA Semantic Financial Field Mapping Engine — v2
 * 
 * ثلاث طبقات:
 * 1. Claude API: يفهم السياق المحاسبي ويربط كل بند بالحقل الصحيح
 * 2. Pattern Matching: خط دفاع احتياطي عند غياب Claude
 * 3. Field Mappings DB: ذاكرة التعلم من التصحيحات السابقة
 */

export type FinancialField =
  | 'revenue' | 'sales' | 'netSales' | 'turnover' | 'income' | 'totalRevenue'
  | 'cogs' | 'costOfGoodsSold' | 'costOfRevenue'
  | 'grossProfit'
  | 'operatingExpenses' | 'opex' | 'sga' | 'adminExpenses'
  | 'ebitda'
  | 'ebit' | 'operatingIncome'
  | 'interestExpense'
  | 'tax'
  | 'netIncome' | 'netProfit' | 'profit'
  | 'totalAssets' | 'assets'
  | 'currentAssets'
  | 'fixedAssets' | 'ppe'
  | 'inventory' | 'stock'
  | 'accountsReceivable' | 'ar' | 'debtors'
  | 'cash' | 'cashAndEquivalents'
  | 'totalLiabilities' | 'liabilities'
  | 'currentLiabilities'
  | 'longTermDebt'
  | 'shortTermDebt'
  | 'accountsPayable' | 'ap' | 'creditors'
  | 'totalEquity' | 'equity' | 'shareholdersEquity'
  | 'retainedEarnings'
  | 'operatingCashFlow' | 'ocf'
  | 'investingCashFlow'
  | 'financingCashFlow'
  | 'capex'
  | 'dividends'
  | 'depreciation'
  | 'amortization'
  | 'employees'
  | 'sharesOutstanding'
  | 'month' | 'period' | 'date' | 'year' | 'quarter';

export interface FieldMapping {
  field: FinancialField;
  confidence: number; // 0-100 (وليس 0-1)
  originalColumn: string;
  source: 'claude' | 'pattern' | 'memory'; // مصدر الربط
}

// ==================== NORMALIZED RECORD ====================

export interface NormalizedFinancialRecord {
  month?: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  ebitda: number;
  ebit: number;
  interestExpense: number;
  tax: number;
  netIncome: number;
  totalAssets: number;
  currentAssets: number;
  fixedAssets: number;
  inventory: number;
  accountsReceivable: number;
  cash: number;
  totalLiabilities: number;
  currentLiabilities: number;
  longTermDebt: number;
  accountsPayable: number;
  totalEquity: number;
  retainedEarnings: number;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  depreciation: number;
  amortization?: number;
  capex: number;
  dividends: number;
  shortTermDebt?: number;
  [key: string]: unknown;
}

// ==================== CLAUDE API MAPPING (الطبقة الأولى) ====================

export interface ClaudeExtractionResult {
  field: string;
  standardField: FinancialField | null;
  value: number | null;
  confidence: number; // 0-100
  reason: string;
}

/**
 * يُرسل القائمة المالية كاملاً لـ Claude API مع تعليمات صريحة.
 * 
 * القاعدة الصارمة: إذا لم يجد Claude القيمة بيقين → null
 * لا تخمين تحت أي ظرف.
 */
export async function mapColumnsWithClaude(
  columns: string[],
  sampleRows: Record<string, unknown>[],
  apiKey: string,
  companyId?: string
): Promise<FieldMapping[]> {
  const sampleData = sampleRows.slice(0, 3).map(row =>
    Object.fromEntries(columns.map(col => [col, row[col]]))
  );

  const prompt = `أنت خبير محاسبة مالية. مهمتك ربط أسماء الأعمدة في قائمة مالية بالحقول المالية المعيارية.

## أسماء الأعمدة الموجودة:
${JSON.stringify(columns, null, 2)}

## عينة من البيانات (أول 3 صفوف):
${JSON.stringify(sampleData, null, 2)}

## الحقول المالية المعيارية المتاحة:
revenue, cogs, grossProfit, operatingExpenses, ebitda, ebit, interestExpense, tax, netIncome,
totalAssets, currentAssets, fixedAssets, inventory, accountsReceivable, cash,
totalLiabilities, currentLiabilities, longTermDebt, shortTermDebt, accountsPayable,
totalEquity, retainedEarnings, operatingCashFlow, investingCashFlow, financingCashFlow,
capex, dividends, depreciation, amortization, month, period

## قواعد صارمة جداً:
1. إذا لم تجد الحقل المقابل بيقين تام من النص الفعلي → ضع standardField: null
2. لا تخمّن أبداً تحت أي ظرف — الخطأ أسوأ من null
3. أي قيمة تضعها يجب أن تكون مدعومة من اسم العمود أو البيانات الفعلية
4. الثقة من 0 إلى 100: فوق 90 = متطابق تقريباً، 70-90 = محتمل جداً، تحت 70 = غير متأكد
5. أعد النتيجة بصيغة JSON فقط — بدون أي نص قبلها أو بعدها

## صيغة الإخراج المطلوبة (JSON array فقط):
[
  {
    "originalColumn": "اسم العمود كما هو",
    "standardField": "اسم الحقل المعياري أو null",
    "confidence": 95,
    "reason": "سبب قصير"
  }
]`;

  try {
    const Anthropic = await import('@anthropic-ai/sdk').then(m => m.default || m);
    const client = new (Anthropic as { new(opts: { apiKey: string }): { messages: { create: (opts: unknown) => Promise<{ content: Array<{ type: string; text: string }> }> } } })({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const match = raw.match(/\[[\s\S]*\]/);
    if (!match) throw new Error('Claude did not return valid JSON array');

    const parsed = JSON.parse(match[0]) as Array<{
      originalColumn: string;
      standardField: string | null;
      confidence: number;
      reason: string;
    }>;

    return parsed
      .filter(item => item.originalColumn)
      .map(item => ({
        field: (item.standardField ?? 'revenue') as FinancialField,
        confidence: item.standardField ? item.confidence : 0,
        originalColumn: item.originalColumn,
        source: 'claude' as const,
      }))
      .filter(m => m.confidence > 0);

  } catch (err) {
    console.warn('[SemanticMapping] Claude mapping failed, falling back to patterns:', err);
    return []; // سيُستخدم Pattern Matching كخط دفاع
  }
}

// ==================== PATTERN MATCHING (الطبقة الاحتياطية) ====================

const SEMANTIC_PATTERNS: Record<FinancialField, string[]> = {
  revenue: ['revenue','rev','إيرادات','الإيرادات','ايرادات','revenues','total revenue','إجمالي الإيرادات'],
  sales: ['sales','مبيعات','المبيعات','sale','net sales','صافي المبيعات'],
  netSales: ['net sales','صافي المبيعات','netsales','net revenue'],
  turnover: ['turnover','دوران'],
  income: ['income','دخل','الدخل','total income'],
  totalRevenue: ['total revenue','إجمالي الإيرادات','total revenues'],
  cogs: ['cogs','cost of goods sold','cost of goods','تكلفة البضاعة المباعة','تكلفة المبيعات'],
  costOfGoodsSold: ['cost of goods sold','cogs','cost of revenue','تكلفة البضاعة المباعة'],
  costOfRevenue: ['cost of revenue','تكلفة الإيرادات','cost of sales','تكلفة المبيعات'],
  grossProfit: ['gross profit','إجمالي الربح','الربح الإجمالي','مجمل الربح'],
  operatingExpenses: ['operating expenses','مصاريف تشغيل','مصروفات تشغيلية','opex','operating costs'],
  opex: ['opex','operating expenditure','مصاريف تشغيل'],
  sga: ['sga','selling general and administrative','مصاريف بيع وإدارية'],
  adminExpenses: ['administrative expenses','مصاريف إدارية'],
  ebitda: ['ebitda','الأرباح قبل الفوائد والضرائب والإهلاك'],
  ebit: ['ebit','operating income','الأرباح التشغيلية','الربح التشغيلي'],
  operatingIncome: ['operating income','ebit','operating profit','الربح التشغيلي'],
  interestExpense: ['interest expense','مصاريف فوائد','finance cost','تكلفة تمويل','interest'],
  tax: ['tax','taxes','ضريبة','الضريبة','income tax','ضريبة الدخل'],
  netIncome: ['net income','صافي الدخل','net profit','صافي الربح','bottom line'],
  netProfit: ['net profit','صافي الربح','الربح الصافي','profit after tax'],
  profit: ['profit','ربح','الربح','earnings'],
  totalAssets: ['total assets','إجمالي الأصول','الأصول الإجمالية'],
  assets: ['assets','أصول','الأصول','total assets'],
  currentAssets: ['current assets','الأصول المتداولة'],
  fixedAssets: ['fixed assets','الأصول الثابتة','non current assets','property plant equipment'],
  ppe: ['ppe','property plant and equipment','الأملاك والمنشآت والمعدات'],
  inventory: ['inventory','مخزون','المخزون','stock','بضاعة','inventories'],
  stock: ['stock','مخزون','inventory'],
  accountsReceivable: ['accounts receivable','مدينون','debtors','trade receivable','receivables'],
  ar: ['ar','accounts receivable','مدينون'],
  debtors: ['debtors','مدينون','accounts receivable'],
  cash: ['cash','نقد','النقد','cash and equivalents','النقد وما يعادله','cash balance'],
  cashAndEquivalents: ['cash and equivalents','النقد وما يعادله','cash equivalents'],
  totalLiabilities: ['total liabilities','إجمالي الخصوم','إجمالي الالتزامات'],
  liabilities: ['liabilities','خصوم','الخصوم','التزامات'],
  currentLiabilities: ['current liabilities','الخصوم المتداولة','الالتزامات المتداولة'],
  longTermDebt: ['long term debt','ديون طويلة الأجل','non current liabilities'],
  shortTermDebt: ['short term debt','ديون قصيرة الأجل'],
  accountsPayable: ['accounts payable','دائنون','creditors','trade payable','payables'],
  ap: ['ap','accounts payable','دائنون'],
  creditors: ['creditors','دائنون','accounts payable'],
  totalEquity: ['total equity','إجمالي حقوق الملكية','equity','حقوق الملكية','shareholders equity'],
  equity: ['equity','حقوق الملكية','shareholders equity','حقوق المساهمين'],
  shareholdersEquity: ['shareholders equity','حقوق المساهمين'],
  retainedEarnings: ['retained earnings','أرباح محتجزة','accumulated profits'],
  operatingCashFlow: ['operating cash flow','cash flow from operations','تدفق نقدي تشغيلي','ocf'],
  ocf: ['ocf','operating cash flow'],
  investingCashFlow: ['investing cash flow','cash flow from investing','تدفق نقدي استثماري'],
  financingCashFlow: ['financing cash flow','cash flow from financing','تدفق نقدي تمويلي'],
  capex: ['capex','capital expenditure','إنفاق رأسمالي'],
  dividends: ['dividends','توزيعات أرباح','dividend'],
  depreciation: ['depreciation','إهلاك','الإهلاك','depn'],
  amortization: ['amortization','استهلاك','amortisation'],
  employees: ['employees','موظفين','headcount','staff'],
  sharesOutstanding: ['shares outstanding','أسهم قائمة','shares'],
  month: ['month','شهر','months','الشهر'],
  period: ['period','فترة','الفترة'],
  date: ['date','تاريخ','التاريخ'],
  year: ['year','سنة','السنة','fiscal year'],
  quarter: ['quarter','ربع','الربع','q1','q2','q3','q4'],
};

function patternMatchScore(columnName: string, patterns: string[]): number {
  const normalized = columnName.toLowerCase().trim();
  const noSpaces = normalized.replace(/\s+/g, '');
  let best = 0;

  for (const pattern of patterns) {
    const pl = pattern.toLowerCase().trim();
    const pns = pl.replace(/\s+/g, '');

    if (normalized === pl) return 100;
    if (noSpaces === pns) { best = Math.max(best, 95); continue; }
    if (new RegExp(`\\b${pl}\\b`, 'i').test(normalized)) { best = Math.max(best, 90); continue; }
    if (normalized.includes(pl) || pl.includes(normalized)) { best = Math.max(best, 70); continue; }
    if (normalized.startsWith(pl)) { best = Math.max(best, 80); continue; }

    const colWords = new Set(normalized.split(/\s+/));
    const patWords = new Set(pl.split(/\s+/));
    const intersection = [...colWords].filter(w => patWords.has(w)).length;
    const union = new Set([...colWords, ...patWords]).size;
    if (union > 0) {
      const overlap = intersection / union;
      if (overlap > 0.5) best = Math.max(best, Math.round(overlap * 85));
    }
  }

  return best;
}

export function mapFinancialColumns(columns: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = [];
  const usedFields = new Set<FinancialField>();

  for (const column of columns) {
    let bestMatch: FieldMapping | null = null;

    for (const [field, patterns] of Object.entries(SEMANTIC_PATTERNS)) {
      const score = patternMatchScore(column, patterns);
      if (score >= 50 && (!bestMatch || score > bestMatch.confidence)) {
        bestMatch = { field: field as FinancialField, confidence: score, originalColumn: column, source: 'pattern' };
      }
    }

    if (bestMatch && !usedFields.has(bestMatch.field)) {
      usedFields.add(bestMatch.field);
      mappings.push(bestMatch);
    } else if (bestMatch) {
      mappings.push({ ...bestMatch, confidence: Math.round(bestMatch.confidence * 0.5) });
    }
  }

  return mappings.sort((a, b) => b.confidence - a.confidence);
}

// ==================== MEMORY MERGE (الطبقة الثالثة) ====================

/**
 * يدمج نتائج Claude مع الذاكرة المحفوظة، مع إعطاء الأولوية للذاكرة المؤكدة يدوياً
 */
export function mergeMappingsWithMemory(
  claudeMappings: FieldMapping[],
  savedMappings: Array<{ originalColumnName: string; standardField: string; confidence: number; isUserCorrected: boolean }>
): FieldMapping[] {
  const result = [...claudeMappings];

  for (const saved of savedMappings) {
    const existingIdx = result.findIndex(m => m.originalColumn === saved.originalColumnName);
    const memoryConf = saved.isUserCorrected ? 100 : Math.min(saved.confidence, 95);

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      // الذاكرة المؤكدة يدوياً تتغلب دائماً على Claude
      if (saved.isUserCorrected || memoryConf > existing.confidence) {
        result[existingIdx] = {
          field: saved.standardField as FinancialField,
          confidence: memoryConf,
          originalColumn: saved.originalColumnName,
          source: 'memory',
        };
      }
    } else {
      result.push({
        field: saved.standardField as FinancialField,
        confidence: memoryConf,
        originalColumn: saved.originalColumnName,
        source: 'memory',
      });
    }
  }

  return result.sort((a, b) => b.confidence - a.confidence);
}

// ==================== VALUE EXTRACTION ====================

export function extractNumericValue(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value === 'string') {
    // تحويل الأرقام العربية-الهندية: ٠١٢٣٤٥٦٧٨٩
    const cleaned = value
      .replace(/[٠١٢٣٤٥٦٧٨٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[$€£¥\s،,]/g, '')
      .replace(/\((.*)\)/, '-$1') // (100) → -100
      .replace(/[%]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ==================== NORMALIZE DATA ====================

export function getColumnForField(mappings: FieldMapping[], field: FinancialField): string | null {
  const mapping = mappings.find(m => m.field === field && m.confidence >= 50);
  return mapping?.originalColumn ?? null;
}

export function normalizeFinancialData(
  rawData: Record<string, unknown>[],
  mappings: FieldMapping[]
): NormalizedFinancialRecord[] {
  const getField = (field: FinancialField): string | null => getColumnForField(mappings, field);

  return rawData.map(row => {
    const get = (field: FinancialField): number => {
      const col = getField(field);
      if (!col) return 0;
      return extractNumericValue(row[col]) ?? 0;
    };

    const getString = (field: FinancialField): string | undefined => {
      const col = getField(field);
      if (!col) return undefined;
      const val = row[col];
      return val !== undefined && val !== null ? String(val) : undefined;
    };

    const revenue = get('revenue') || get('sales') || get('netSales') || get('turnover') || get('income') || get('totalRevenue');
    const cogs = get('cogs') || get('costOfGoodsSold') || get('costOfRevenue');
    const grossProfit = get('grossProfit') || (revenue > 0 && cogs > 0 ? revenue - cogs : 0);
    const operatingExpenses = get('operatingExpenses') || get('opex') || get('sga') || get('adminExpenses');
    const depreciation = get('depreciation');
    const amortization = get('amortization');
    const ebit = get('ebit') || get('operatingIncome') || (grossProfit > 0 ? grossProfit - operatingExpenses - depreciation - amortization : 0);
    const ebitda = get('ebitda') || (ebit + depreciation + amortization);
    const interestExpense = get('interestExpense');
    const tax = get('tax');
    const netIncome = get('netIncome') || get('netProfit') || get('profit') || (ebit - interestExpense - tax);
    const totalAssets = get('totalAssets') || get('assets');
    const currentAssets = get('currentAssets');
    const fixedAssets = get('fixedAssets') || get('ppe');
    const inventory = get('inventory') || get('stock');
    const accountsReceivable = get('accountsReceivable') || get('ar') || get('debtors');
    const cash = get('cash') || get('cashAndEquivalents');
    const totalLiabilities = get('totalLiabilities') || get('liabilities');
    const currentLiabilities = get('currentLiabilities');
    const longTermDebt = get('longTermDebt');
    const shortTermDebt = get('shortTermDebt');
    const accountsPayable = get('accountsPayable') || get('ap') || get('creditors');
    const totalEquity = get('totalEquity') || get('equity') || get('shareholdersEquity') || (totalAssets - totalLiabilities || 0);
    const retainedEarnings = get('retainedEarnings');
    const operatingCashFlow = get('operatingCashFlow') || get('ocf');
    const investingCashFlow = get('investingCashFlow');
    const financingCashFlow = get('financingCashFlow');
    const capex = get('capex');
    const dividends = get('dividends');
    const month = getString('month') || getString('period') || getString('date') || getString('year') || getString('quarter');

    return {
      month,
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      ebitda,
      ebit,
      interestExpense,
      tax,
      netIncome,
      totalAssets,
      currentAssets: currentAssets || (cash + accountsReceivable + inventory),
      fixedAssets,
      inventory,
      accountsReceivable,
      cash,
      totalLiabilities,
      currentLiabilities: currentLiabilities || (accountsPayable + shortTermDebt),
      longTermDebt,
      accountsPayable,
      totalEquity,
      retainedEarnings,
      operatingCashFlow,
      investingCashFlow,
      financingCashFlow,
      depreciation,
      amortization,
      capex,
      dividends,
      shortTermDebt,
      ...row,
    };
  });
}

// ==================== SECTOR CLASSIFICATION ====================

export type Sector = 
  | 'retail' | 'construction' | 'technology' | 'manufacturing'
  | 'healthcare' | 'food' | 'financial_services' | 'education'
  | 'logistics' | 'real_estate' | 'general';

const SECTOR_LABELS: Record<Sector, string> = {
  retail: 'التجزئة',
  construction: 'المقاولات',
  technology: 'التقنية',
  manufacturing: 'الصناعة',
  healthcare: 'الرعاية الصحية',
  food: 'الغذاء والمطاعم',
  financial_services: 'الخدمات المالية',
  education: 'التعليم',
  logistics: 'اللوجستيات',
  real_estate: 'العقارات',
  general: 'عام',
};

export async function classifySector(activityDescription: string, apiKey: string): Promise<{ sector: Sector; confidence: number; label: string }> {
  if (!activityDescription.trim()) {
    return { sector: 'general', confidence: 0, label: SECTOR_LABELS.general };
  }

  const prompt = `صنّف نشاط هذه الشركة إلى أحد القطاعات التالية فقط:
retail, construction, technology, manufacturing, healthcare, food, financial_services, education, logistics, real_estate, general

النشاط: "${activityDescription}"

القواعد:
- اختر القطاع الأقرب بالضبط من القائمة أعلاه
- إذا لم يتطابق مع أي قطاع بثقة كافية اختر general
- أعد JSON فقط بدون أي نص آخر:
{"sector": "اسم القطاع", "confidence": 85}`;

  try {
    const Anthropic = await import('@anthropic-ai/sdk').then(m => m.default || m);
    const client = new (Anthropic as { new(opts: { apiKey: string }): { messages: { create: (opts: unknown) => Promise<{ content: Array<{ type: string; text: string }> }> } } })({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0]?.type === 'text' ? response.content[0].text : '';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON');

    const parsed = JSON.parse(match[0]) as { sector: string; confidence: number };
    const sector = (parsed.sector in SECTOR_LABELS ? parsed.sector : 'general') as Sector;

    return {
      sector,
      confidence: parsed.confidence ?? 50,
      label: SECTOR_LABELS[sector],
    };
  } catch {
    return { sector: 'general', confidence: 0, label: SECTOR_LABELS.general };
  }
}

export { SECTOR_LABELS };
