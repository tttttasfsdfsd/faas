import type { NormalizedFinancialRecord } from './semanticMapping';

// ==================== TYPES ====================

export interface ProfitabilityRatios {
  grossMargin: number;
  operatingMargin: number;
  ebitdaMargin: number;
  netMargin: number;
  roa: number;
  roe: number;
  roce: number;
  roic: number;
}

export interface LiquidityRatios {
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapital: number;
  ocfRatio: number;
}

export interface SolvencyRatios {
  debtRatio: number;
  debtToEquity: number;
  equityRatio: number;
  interestCoverage: number;
  financialLeverage: number;
}

export interface EfficiencyRatios {
  assetTurnover: number;
  fixedAssetTurnover: number;
  inventoryTurnover: number;
  dio: number;
  arTurnover: number;
  dso: number;
  apTurnover: number;
  dpo: number;
  ccc: number;
}

export interface DuPontAnalysis {
  roe: number;
  netProfitMargin: number;
  assetTurnover: number;
  financialLeverage: number;
  npmContribution: number;
  atoContribution: number;
  flContribution: number;
}

export interface EarningsQuality {
  accrualsRatio: number;
  cashToEarningsRatio: number;
  nonRecurringItems: number;
  sustainabilityScore: number;
  quality: 'high' | 'moderate' | 'low';
  description: string;
}

export interface CashFlowAnalysis {
  ocf: number;
  icf: number;
  fcf: number;
  burnRate: number;
  monthsRunway: number;
  liquidityRisk: 'safe' | 'caution' | 'danger';
  fundingDependency: number;
  freeCashFlow: number;
  ocfToNetIncome: number;
  daysUntilCashOut: number;
}

export interface AltmanZScore {
  zScore: number;
  zone: 'safe' | 'grey' | 'distress';
  probability: number;
  components: { x1: number; x2: number; x3: number; x4: number; x5: number };
}

export interface BeneishMScore {
  mScore: number;
  isManipulator: boolean;
  dataInsufficient?: boolean;
  dataInsufficientReason?: string;
  components: { dsri: number; gmi: number; aqi: number; sgi: number; depi: number; sgai: number; lvgi: number; tata: number };
}

export interface FinancialScore {
  overall: number;
  profitability: number;
  liquidity: number;
  solvency: number;
  efficiency: number;
  growth: number;
  cashFlow: number;
  earningsQuality: number;
  label: string;
}

export interface ForecastPoint {
  period: string;
  value: number;
  lowerBound: number;
  upperBound: number;
}

export interface Forecasts {
  revenue: ForecastPoint[];
  profit: ForecastPoint[];
  ebitda: ForecastPoint[];
  cashFlow: ForecastPoint[];
  cashBalance: ForecastPoint[];
  workingCapital: ForecastPoint[];
}

export interface ScenarioCase {
  name: string;
  revenueGrowth: number;
  costChange: number;
  projectedRevenue: number;
  projectedProfit: number;
  projectedCash: number;
  projectedLiquidity: number;
}

export interface ScenarioAnalysis {
  bestCase: ScenarioCase;
  baseCase: ScenarioCase;
  worstCase: ScenarioCase;
}

export interface BenchmarkComparison {
  metric: string;
  companyValue: number;
  industryAvg: number;
  percentile: number;
  status: 'above' | 'at' | 'below';
}

export interface SmartAlert {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  metric?: string;
  value?: number;
  threshold?: number;
  actionLabel?: string;
}

export interface ComprehensiveFinancials {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  netMargin: number;
  revenueGrowth: number;
  expenseGrowth: number;
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  cash: number;
  inventory: number;
  accountsReceivable: number;
  accountsPayable: number;
  profitability: ProfitabilityRatios;
  liquidity: LiquidityRatios;
  solvency: SolvencyRatios;
  efficiency: EfficiencyRatios;
  dupont: DuPontAnalysis;
  earningsQuality: EarningsQuality;
  cashFlow: CashFlowAnalysis;
  altmanZ: AltmanZScore;
  beneishM: BeneishMScore;
  piotroskiF: PiotroskiFScore;
  dscr: DSCRAnalysis;
  score: FinancialScore;
  forecasts: Forecasts;
  scenarioAnalysis: ScenarioAnalysis;
  benchmarks: BenchmarkComparison[];
  smartAlerts: SmartAlert[];
  months: string[];
  monthlyRevenue: number[];
  monthlyExpenses: number[];
  monthlyNetIncome: number[];
  monthlyCash: number[];
  monthlyAssets: number[];
  monthlyLiabilities: number[];
}

// ==================== SAFE MATH ====================

/** Divide a/b — returns fallback (default 0) for any bad denominator or result */
function safeDivide(a: number, b: number, fallback = 0): number {
  if (!isFinite(a) || !isFinite(b) || b === 0) return fallback;
  const r = a / b;
  return isFinite(r) ? r : fallback;
}

function growthRate(curr: number, prev: number): number {
  if (!prev || prev === 0) return 0;
  return safeDivide((curr - prev) * 100, Math.abs(prev));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Smart asset guard: ensures a balance-sheet denominator is never
 * so tiny that it inflates ratios into billions.
 * Rule: denominator must be at least 1% of revenue, else we return 0
 * (which formatters will show as "—").
 */
function safeBS(
  value: number,
  revenue: number,
  fallbackFromOtherField = 0
): number {
  if (value > 0) return value;
  if (fallbackFromOtherField > 0) return fallbackFromOtherField;
  // Cannot derive — return 0 so ratios show "—" rather than garbage
  return 0;
}

/** Clamp a percentage to a realistic range [-200, 999] */
function clampPct(v: number): number {
  return clamp(v, -200, 999);
}

/** Clamp a turnover ratio to a realistic range [0, 200] */
function clampTurnover(v: number): number {
  return clamp(v, 0, 200);
}

/** Clamp days to [0, 9999] */
function clampDays(v: number): number {
  return clamp(v, 0, 9999);
}

// ==================== DERIVE KEY FIGURES ====================

function deriveNetIncome(d: NormalizedFinancialRecord): number {
  // FIXED: treat netIncome === 0 as valid (company broke even). Only fall back for null/undefined.
  if (d.netIncome !== null && d.netIncome !== undefined) return d.netIncome;
  // Try from EBIT
  const gp = d.grossProfit > 0 ? d.grossProfit : Math.max(0, d.revenue - d.cogs);
  const ebit = d.ebit > 0 ? d.ebit : gp - d.operatingExpenses - d.depreciation - d.amortization;
  return ebit - d.interestExpense - d.tax;
}

function deriveEBIT(d: NormalizedFinancialRecord): number {
  if (d.ebit > 0) return d.ebit;
  const gp = d.grossProfit > 0 ? d.grossProfit : Math.max(0, d.revenue - d.cogs);
  return gp - d.operatingExpenses - d.depreciation - d.amortization;
}

function deriveEBITDA(d: NormalizedFinancialRecord): number {
  if (d.ebitda > 0) return d.ebitda;
  return deriveEBIT(d) + d.depreciation + d.amortization;
}

function deriveCurrentAssets(d: NormalizedFinancialRecord): number {
  if (d.currentAssets > 0) return d.currentAssets;
  return d.cash + d.accountsReceivable + d.inventory;
}

function deriveCurrentLiabilities(d: NormalizedFinancialRecord): number {
  if (d.currentLiabilities > 0) return d.currentLiabilities;
  return d.accountsPayable + d.shortTermDebt;
}

// ==================== PROFITABILITY ====================

export function calculateProfitabilityRatios(d: NormalizedFinancialRecord): ProfitabilityRatios {
  const revenue   = Math.max(1, d.revenue);
  const gp        = d.grossProfit > 0 ? d.grossProfit : Math.max(0, d.revenue - d.cogs);
  const ebit      = deriveEBIT(d);
  const ebitda    = deriveEBITDA(d);
  const ni        = deriveNetIncome(d);

  // Balance sheet items — safeBS ensures no tiny fallback inflates ratios
  const totalAssets  = safeBS(d.totalAssets,  revenue, d.currentAssets + d.fixedAssets);
  const totalEquity  = safeBS(d.totalEquity,  revenue, d.totalAssets - d.totalLiabilities);
  const clFallback   = deriveCurrentLiabilities(d);
  const cl           = safeBS(d.currentLiabilities, revenue, clFallback);
  const capitalEmp   = totalAssets > 0 ? Math.max(1, totalAssets - cl) : 0;
  const investedCap  = capitalEmp;

  const taxRate = d.tax > 0 && ebit > 0 ? clamp(safeDivide(d.tax, ebit), 0, 0.5) : 0.15;
  const nopat   = ebit * (1 - taxRate);

  return {
    grossMargin:     clampPct(safeDivide(gp   * 100, revenue)),
    operatingMargin: clampPct(safeDivide(ebit * 100, revenue)),
    ebitdaMargin:    clampPct(safeDivide(ebitda * 100, revenue)),
    netMargin:       clampPct(safeDivide(ni   * 100, revenue)),
    roa:  totalAssets > 0  ? clampPct(safeDivide(ni    * 100, totalAssets))  : 0,
    roe:  totalEquity > 0  ? clampPct(safeDivide(ni    * 100, totalEquity))  : 0,
    roce: capitalEmp  > 0  ? clampPct(safeDivide(ebit  * 100, capitalEmp))   : 0,
    roic: investedCap > 0  ? clampPct(safeDivide(nopat * 100, investedCap))  : 0,
  };
}

// ==================== LIQUIDITY ====================

export function calculateLiquidityRatios(d: NormalizedFinancialRecord): LiquidityRatios {
  const ca  = deriveCurrentAssets(d);
  const cl  = Math.max(1, deriveCurrentLiabilities(d) || d.currentLiabilities || 1);
  const ocf = d.operatingCashFlow;

  return {
    currentRatio:  clamp(safeDivide(ca,                    cl), 0, 50),
    quickRatio:    clamp(safeDivide(ca - d.inventory,      cl), 0, 50),
    cashRatio:     clamp(safeDivide(d.cash,                cl), 0, 50),
    workingCapital: ca - cl,
    ocfRatio:      clamp(safeDivide(ocf,                   cl), -50, 50),
  };
}

// ==================== SOLVENCY ====================

export function calculateSolvencyRatios(d: NormalizedFinancialRecord): SolvencyRatios {
  const totalAssets = Math.max(1, d.totalAssets);
  const totalEquity = d.totalEquity || Math.max(1, d.totalAssets - d.totalLiabilities);
  const tl          = d.totalLiabilities;
  const interest    = Math.max(0.001, d.interestExpense);
  const ebit        = deriveEBIT(d);

  return {
    debtRatio:        clamp(safeDivide(tl,          totalAssets), 0, 2),
    debtToEquity:     totalEquity > 0 ? clamp(safeDivide(tl, totalEquity), 0, 50) : 0,
    equityRatio:      clamp(safeDivide(totalEquity, totalAssets), 0, 2),
    interestCoverage: clamp(safeDivide(ebit,        interest),   -50, 200),
    financialLeverage:totalEquity > 0 ? clamp(safeDivide(totalAssets, totalEquity), 0, 50) : 1,
  };
}

// ==================== EFFICIENCY ====================

export function calculateEfficiencyRatios(d: NormalizedFinancialRecord): EfficiencyRatios {
  const revenue = Math.max(1, d.revenue);
  const cogs    = d.cogs > 0 ? d.cogs : revenue * 0.6;

  // Guard each balance sheet item — if 0, efficiency ratio = 0 (shown as "—")
  const totalAssets  = d.totalAssets  > 0 ? d.totalAssets  : 0;
  const fixedAssets  = d.fixedAssets  > 0 ? d.fixedAssets  : (totalAssets > 0 ? totalAssets * 0.5 : 0);
  const inventory    = d.inventory    > 0 ? d.inventory    : 0;
  const ar           = d.accountsReceivable > 0 ? d.accountsReceivable : 0;
  const ap           = d.accountsPayable    > 0 ? d.accountsPayable    : 0;

  const invTurn = inventory > 0 ? clampTurnover(safeDivide(cogs,    inventory)) : 0;
  const arTurn  = ar        > 0 ? clampTurnover(safeDivide(revenue, ar))        : 0;
  const apTurn  = ap        > 0 ? clampTurnover(safeDivide(cogs,    ap))        : 0;

  const dio = invTurn > 0 ? clampDays(safeDivide(365, invTurn)) : 0;
  const dso = arTurn  > 0 ? clampDays(safeDivide(365, arTurn))  : 0;
  const dpo = apTurn  > 0 ? clampDays(safeDivide(365, apTurn))  : 0;

  return {
    assetTurnover:      totalAssets > 0 ? clampTurnover(safeDivide(revenue, totalAssets)) : 0,
    fixedAssetTurnover: fixedAssets > 0 ? clampTurnover(safeDivide(revenue, fixedAssets)) : 0,
    inventoryTurnover:  invTurn,
    dio,
    arTurnover:         arTurn,
    dso,
    apTurnover:         apTurn,
    dpo,
    ccc: dio + dso - dpo,
  };
}

// ==================== DUPONT ====================

export function calculateDuPont(d: NormalizedFinancialRecord): DuPontAnalysis {
  const revenue     = Math.max(1, d.revenue);
  const totalAssets = d.totalAssets > 0 ? d.totalAssets : 0;
  const totalEquity = d.totalEquity > 0 ? d.totalEquity : (d.totalAssets > 0 ? d.totalAssets - d.totalLiabilities : 0);
  const ni          = deriveNetIncome(d);

  const npm = safeDivide(ni,      revenue);
  const ato = totalAssets > 0 ? clampTurnover(safeDivide(revenue, totalAssets)) : 0;
  const fl  = totalEquity > 0 ? clamp(safeDivide(totalAssets, totalEquity), 0, 50) : 1;
  const roe = clampPct(npm * ato * fl * 100);

  const totalEffect = Math.abs(npm) + ato + fl;

  return {
    roe,
    netProfitMargin:   clampPct(npm * 100),
    assetTurnover:     ato,
    financialLeverage: fl,
    npmContribution: totalEffect > 0 ? clamp(safeDivide(Math.abs(npm) * 100, totalEffect), 0, 100) : 0,
    atoContribution: totalEffect > 0 ? clamp(safeDivide(ato           * 100, totalEffect), 0, 100) : 0,
    flContribution:  totalEffect > 0 ? clamp(safeDivide(fl            * 100, totalEffect), 0, 100) : 0,
  };
}

// ==================== EARNINGS QUALITY ====================

export function calculateEarningsQuality(d: NormalizedFinancialRecord): EarningsQuality {
  const ni          = deriveNetIncome(d);
  const ocf         = d.operatingCashFlow;
  const totalAssets = Math.max(1, d.totalAssets);

  const accrualsRatio     = clamp(safeDivide(ni - ocf, totalAssets), -1, 1);
  const cashToEarnings    = ni !== 0 ? clamp(safeDivide(ocf, Math.abs(ni)), -5, 5) : 0;

  let score = 100;
  if (Math.abs(accrualsRatio) > 0.1)            score -= 30;
  else if (Math.abs(accrualsRatio) > 0.05)      score -= 15;
  if (cashToEarnings < 0.5 && ni > 0)           score -= 25;
  else if (cashToEarnings < 0.8 && ni > 0)      score -= 10;
  if (ocf < 0 && ni > 0)                        score -= 20;

  const ss = clamp(score, 0, 100);
  const quality: 'high' | 'moderate' | 'low' =
    ss >= 70 ? 'high' : ss >= 40 ? 'moderate' : 'low';
  const description =
    quality === 'high'     ? 'Earnings backed by strong cash flows' :
    quality === 'moderate' ? 'Some gap between earnings and cash generation' :
                             'Significant accruals — earnings may not be sustainable';

  return { accrualsRatio, cashToEarningsRatio: cashToEarnings, nonRecurringItems: 0, sustainabilityScore: ss, quality, description };
}

// ==================== CASH FLOW ====================

export function calculateCashFlowAnalysis(d: NormalizedFinancialRecord): CashFlowAnalysis {
  const ocf  = d.operatingCashFlow;
  const icf  = d.investingCashFlow;
  const fcf  = d.financingCashFlow;
  const capex = Math.abs(d.capex);
  const freeCashFlow = ocf - capex;
  const cash = d.cash;
  const ni   = deriveNetIncome(d);

  const totalExp      = d.cogs + d.operatingExpenses + d.interestExpense;
  const monthlyExp    = totalExp  > 0 ? totalExp  / 12 : 0;
  const monthlyRev    = d.revenue > 0 ? d.revenue / 12 : 0;
  const netMonthlyBurn = Math.max(0, monthlyExp - monthlyRev);
  const burnRate      = netMonthlyBurn > 0
    ? netMonthlyBurn
    : (ocf < 0 ? Math.abs(ocf) / 12 : monthlyExp * 0.1);

  const monthsRunway     = burnRate > 0 ? clamp(safeDivide(cash, burnRate), 0, 999) : 999;
  const daysUntilCashOut = monthsRunway < 999 ? Math.round(monthsRunway * 30) : 9999;
  const liquidityRisk: 'safe' | 'caution' | 'danger' =
    monthsRunway > 12 ? 'safe' : monthsRunway > 3 ? 'caution' : 'danger';
  const fundingDependency = monthlyRev > 0
    ? clamp((monthlyExp - monthlyRev) / Math.max(1, monthlyExp) * 100, 0, 100)
    : 0;

  return {
    ocf, icf, fcf, burnRate, monthsRunway, liquidityRisk, fundingDependency,
    freeCashFlow,
    ocfToNetIncome: ni !== 0 ? clamp(safeDivide(ocf, Math.abs(ni)), -5, 5) : 0,
    daysUntilCashOut,
  };
}

// ==================== ALTMAN Z' ====================

export function calculateAltmanZScore(d: NormalizedFinancialRecord): AltmanZScore {
  const totalAssets = d.totalAssets > 0 ? d.totalAssets : 1;
  const tl          = d.totalLiabilities;
  const te          = d.totalEquity || Math.max(0, d.totalAssets - tl);
  const ca          = deriveCurrentAssets(d);
  const cl          = deriveCurrentLiabilities(d) || d.currentLiabilities || 0;
  const re          = d.retainedEarnings > 0 ? d.retainedEarnings : Math.max(0, te * 0.4);
  const ebit        = deriveEBIT(d);

  const x1 = safeDivide(ca - cl,    totalAssets);
  const x2 = safeDivide(re,         totalAssets);
  const x3 = safeDivide(ebit,       totalAssets);
  const x4 = tl > 0 ? safeDivide(te, tl) : 1;
  const x5 = safeDivide(d.revenue,  totalAssets);

  const z = 0.717*x1 + 0.847*x2 + 3.107*x3 + 0.420*x4 + 0.998*x5;
  const zone: 'safe' | 'grey' | 'distress' = z > 2.9 ? 'safe' : z > 1.23 ? 'grey' : 'distress';
  const probability = zone === 'safe' ? 5 : zone === 'grey' ? 35 : 75;

  return { zScore: z, zone, probability, components: { x1, x2, x3, x4, x5 } };
}

// ==================== BENEISH M ====================

export function calculateBeneishMScore(d: NormalizedFinancialRecord, prev?: NormalizedFinancialRecord): BeneishMScore {
  if (!prev) {
    return {
      mScore: -2.5, isManipulator: false,
      dataInsufficient: true,
      dataInsufficientReason: "Requires at least two periods of financial data for accurate M-Score calculation",
      components: { dsri:1, gmi:1, aqi:1, sgi:1, depi:1, sgai:1, lvgi:1, tata:0 }
    };
  }
  const sd = (n: number, den: number) => safeDivide(n, Math.max(0.001, den));

  const dsri = sd(sd(d.accountsReceivable, d.revenue), sd(prev.accountsReceivable, prev.revenue));
  const prevGross = prev.revenue - prev.cogs;
  const currGross = d.revenue    - d.cogs;
  const gmi  = sd(sd(prevGross, prev.revenue), sd(currGross, d.revenue));
  const prevNCA = prev.totalAssets - prev.currentAssets - prev.fixedAssets;
  const currNCA = d.totalAssets   - d.currentAssets   - d.fixedAssets;
  const aqi  = sd(sd(currNCA, d.totalAssets), sd(prevNCA, prev.totalAssets));
  const sgi  = sd(d.revenue,  prev.revenue);
  const depi = sd(sd(prev.depreciation, prev.fixedAssets + prev.depreciation),
                  sd(d.depreciation,    d.fixedAssets    + d.depreciation));
  const sgai = sd(sd(d.operatingExpenses, d.revenue), sd(prev.operatingExpenses, prev.revenue));
  const lvgi = sd(sd(d.totalLiabilities, d.totalAssets), sd(prev.totalLiabilities, prev.totalAssets));
  const tata = sd(deriveNetIncome(d) - d.operatingCashFlow, d.totalAssets);

  const m = -4.84 + 0.920*dsri + 0.528*gmi + 0.404*aqi + 0.892*sgi
            + 0.115*depi - 0.172*sgai + 4.679*tata - 0.327*lvgi;

  return { mScore: m, isManipulator: m > -2.22, components: { dsri, gmi, aqi, sgi, depi, sgai, lvgi, tata } };
}

// ==================== SMART ALERTS ====================

export function generateSmartAlerts(
  d: NormalizedFinancialRecord,
  cf: CashFlowAnalysis,
  liq: LiquidityRatios,
  sol: SolvencyRatios,
  prof: ProfitabilityRatios,
  score: FinancialScore,
  altman: AltmanZScore
): SmartAlert[] {
  const alerts: SmartAlert[] = [];

  if (cf.daysUntilCashOut < 30) {
    alerts.push({ id:'cash_critical', type:'danger',
      title:'🚨 خطر نفاد السيولة',
      message:`تدفقك النقدي سينفد خلال ${cf.daysUntilCashOut} يوم. يجب التصرف الآن.`,
      metric:'daysUntilCashOut', value:cf.daysUntilCashOut, threshold:30, actionLabel:'مراجعة التدفقات النقدية' });
  } else if (cf.daysUntilCashOut < 90) {
    alerts.push({ id:'cash_warning', type:'warning',
      title:'⚠️ تحذير السيولة',
      message:`تدفقك النقدي سينفد خلال ${cf.daysUntilCashOut} يوم (${cf.monthsRunway.toFixed(1)} شهر).`,
      metric:'daysUntilCashOut', value:cf.daysUntilCashOut, threshold:90 });
  }

  if (sol.debtRatio > 0.75) {
    alerts.push({ id:'debt_high', type:'danger',
      title:'📊 نسبة ديون مرتفعة جداً',
      message:`نسبة الديون ${(sol.debtRatio*100).toFixed(1)}% — خطر ائتماني مرتفع.`,
      metric:'debtRatio', value:sol.debtRatio*100, threshold:75 });
  } else if (sol.debtRatio > 0.55) {
    alerts.push({ id:'debt_elevated', type:'warning',
      title:'📊 نسبة ديون مرتفعة',
      message:`نسبة الديون ${(sol.debtRatio*100).toFixed(1)}% — فوق المتوسط.`,
      metric:'debtRatio', value:sol.debtRatio*100, threshold:55 });
  }

  if (liq.currentRatio > 0 && liq.currentRatio < 1.0) {
    alerts.push({ id:'liquidity_danger', type:'danger',
      title:'💧 نقص السيولة الجارية',
      message:`نسبة التداول ${liq.currentRatio.toFixed(2)} — أقل من 1.0. لن تتمكن من تغطية الالتزامات القصيرة.`,
      metric:'currentRatio', value:liq.currentRatio, threshold:1.0 });
  } else if (liq.currentRatio > 0 && liq.currentRatio < 1.5) {
    alerts.push({ id:'liquidity_low', type:'warning',
      title:'💧 سيولة منخفضة',
      message:`نسبة التداول ${liq.currentRatio.toFixed(2)} — دون المستوى المريح (1.5).`,
      metric:'currentRatio', value:liq.currentRatio, threshold:1.5 });
  }

  if (altman.zone === 'distress') {
    alerts.push({ id:'altman_distress', type:'danger',
      title:'🔴 خطر إفلاس مرتفع',
      message:`Altman Z = ${altman.zScore.toFixed(2)} — في منطقة الخطر. احتمالية الضائقة ${altman.probability}%.`,
      metric:'altmanZ', value:altman.zScore, threshold:1.23 });
  }

  if (prof.netMargin < 0) {
    alerts.push({ id:'loss', type:'danger',
      title:'📉 الشركة تعمل بخسارة',
      message:`هامش الربح الصافي ${prof.netMargin.toFixed(1)}%. راجع هيكل التكاليف فوراً.`,
      metric:'netMargin', value:prof.netMargin, threshold:0 });
  } else if (prof.netMargin < 5) {
    alerts.push({ id:'margin_low', type:'warning',
      title:'📉 هامش ربح منخفض',
      message:`هامش الربح ${prof.netMargin.toFixed(1)}% — ضعيف. المتوسط الصناعي 10%+.`,
      metric:'netMargin', value:prof.netMargin, threshold:5 });
  }

  if (score.overall >= 80) {
    alerts.push({ id:'excellent', type:'success', title:'🏆 أداء مالي ممتاز',
      message:`التقييم المالي ${score.overall}/100 — في المستوى الأعلى.` });
  }

  if (cf.monthsRunway > 24) {
    alerts.push({ id:'cash_strong', type:'success', title:'✅ سيولة قوية',
      message:`لديك ${cf.monthsRunway.toFixed(0)} شهراً من السيولة — وضع مريح جداً.` });
  }

  const order = { danger:0, warning:1, info:2, success:3 };
  return alerts.sort((a, b) => order[a.type] - order[b.type]);
}

// ==================== FORECASTING ====================

function linearRegression(x: number[], y: number[]): { slope: number; intercept: number } {
  const n = x.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  const sx  = x.reduce((a, b) => a+b, 0);
  const sy  = y.reduce((a, b) => a+b, 0);
  const sxy = x.reduce((acc, xi, i) => acc + xi*y[i], 0);
  const sx2 = x.reduce((acc, xi) => acc + xi*xi, 0);
  const den = n*sx2 - sx*sx;
  if (den === 0) return { slope: 0, intercept: safeDivide(sy, n) };
  return { slope: (n*sxy - sx*sy)/den, intercept: (sy - ((n*sxy-sx*sy)/den)*sx)/n };
}

export function generateForecasts(data: NormalizedFinancialRecord[], periods = 12): Forecasts {
  const makeForecast = (series: number[]): ForecastPoint[] => {
    const valid = series.filter(v => isFinite(v) && !isNaN(v));
    if (valid.length === 0) return Array.from({length:periods}, (_,i) => ({ period:`M${i+1}`, value:0, lowerBound:0, upperBound:0 }));
    const xs = valid.map((_,i) => i);
    const { slope, intercept } = linearRegression(xs, valid);
    const residuals = valid.map((v,i) => v - (slope*i + intercept));
    const std = Math.sqrt(residuals.reduce((s,r) => s+r*r, 0) / Math.max(1, valid.length-1));
    return Array.from({length:periods}, (_,i) => {
      const xv = valid.length + i;
      const pred = Math.max(0, slope*xv + intercept);
      const margin = 1.96 * std;
      return { period:`M${i+1}`, value:pred, lowerBound:Math.max(0,pred-margin), upperBound:pred+margin };
    });
  };

  return {
    revenue:       makeForecast(data.map(d => d.revenue)),
    profit:        makeForecast(data.map(d => deriveNetIncome(d))),
    ebitda:        makeForecast(data.map(d => deriveEBITDA(d))),
    cashFlow:      makeForecast(data.map(d => d.operatingCashFlow)),
    cashBalance:   makeForecast(data.map(d => d.cash)),
    workingCapital:makeForecast(data.map(d => deriveCurrentAssets(d) - deriveCurrentLiabilities(d))),
  };
}

// ==================== SCENARIOS ====================

export function generateScenarios(d: NormalizedFinancialRecord): ScenarioAnalysis {
  const rev = d.revenue || 1;
  const ni  = deriveNetIncome(d);
  const cash = d.cash || 0;
  const ca   = deriveCurrentAssets(d);
  const cl   = Math.max(1, deriveCurrentLiabilities(d) || 1);
  const baseLiq = safeDivide(ca, cl);

  return {
    bestCase:  { name:'Best Case',  revenueGrowth:20,  costChange:-10, projectedRevenue:rev*1.2,  projectedProfit:ni*1.5,                           projectedCash:cash+ni*1.2, projectedLiquidity:baseLiq*1.2 },
    baseCase:  { name:'Base Case',  revenueGrowth:8,   costChange:3,   projectedRevenue:rev*1.08, projectedProfit:ni*1.05,                          projectedCash:cash+ni,     projectedLiquidity:baseLiq*1.05 },
    worstCase: { name:'Worst Case', revenueGrowth:-20, costChange:10,  projectedRevenue:rev*0.8,  projectedProfit:ni<0?ni*1.5:ni*0.4, projectedCash:Math.max(0,cash-Math.abs(ni)*0.5), projectedLiquidity:baseLiq*0.8 },
  };
}

// ==================== BENCHMARKS ====================

export function generateBenchmarks(d: NormalizedFinancialRecord): BenchmarkComparison[] {
  const p = calculateProfitabilityRatios(d);
  const l = calculateLiquidityRatios(d);
  const s = calculateSolvencyRatios(d);
  const e = calculateEfficiencyRatios(d);

  const items = [
    { metric:'Net Margin',         value:p.netMargin,          avg:10 },
    { metric:'Gross Margin',       value:p.grossMargin,        avg:35 },
    { metric:'ROA',                value:p.roa,                avg:6 },
    { metric:'ROE',                value:p.roe,                avg:12 },
    { metric:'Current Ratio',      value:l.currentRatio,       avg:1.5 },
    { metric:'Quick Ratio',        value:l.quickRatio,         avg:1.0 },
    { metric:'Debt Ratio',         value:s.debtRatio*100,      avg:50 },
    { metric:'Interest Coverage',  value:s.interestCoverage,   avg:4 },
    { metric:'Asset Turnover',     value:e.assetTurnover,      avg:0.6 },
    { metric:'Inventory Turnover', value:e.inventoryTurnover,  avg:6 },
    { metric:'DSO (days)',         value:e.dso,                avg:45 },
  ];

  return items.map(b => {
    if (b.value === 0) return { metric:b.metric, companyValue:0, industryAvg:b.avg, percentile:50, status:'at' as const };
    const diff = safeDivide(b.value - b.avg, Math.abs(b.avg)) * 50;
    return {
      metric: b.metric,
      companyValue: b.value,
      industryAvg: b.avg,
      percentile: clamp(50 + diff, 5, 95),
      status: diff > 5 ? 'above' : diff < -5 ? 'below' : 'at',
    };
  });
}

// ==================== SCORE ====================

export function calculateFinancialScore(
  prof: ProfitabilityRatios,
  liq: LiquidityRatios,
  sol: SolvencyRatios,
  eff: EfficiencyRatios,
  cf: CashFlowAnalysis,
  eq: EarningsQuality,
  revenueGrowth: number
): FinancialScore {
  const profScore = clamp(
    (prof.netMargin>15?30:prof.netMargin>8?20:prof.netMargin>0?10:0) +
    (prof.grossMargin>40?25:prof.grossMargin>25?15:prof.grossMargin>10?8:0) +
    (prof.roa>10?25:prof.roa>5?15:prof.roa>0?8:0) +
    (prof.roe>20?20:prof.roe>12?12:prof.roe>5?6:0), 0, 100);

  const liqScore = clamp(
    liq.currentRatio>2.5?100:liq.currentRatio>2?90:liq.currentRatio>1.5?75:
    liq.currentRatio>1.2?60:liq.currentRatio>1?45:liq.currentRatio>0.8?30:15, 0, 100);

  const solScore = clamp(
    (sol.debtRatio<0.25?40:sol.debtRatio<0.4?30:sol.debtRatio<0.55?20:sol.debtRatio<0.7?10:0) +
    (sol.interestCoverage>8?35:sol.interestCoverage>5?25:sol.interestCoverage>2?15:sol.interestCoverage>1?5:0) +
    (sol.debtToEquity<0.5?25:sol.debtToEquity<1?18:sol.debtToEquity<2?10:5), 0, 100);

  const effScore = clamp(
    (eff.assetTurnover>1?25:eff.assetTurnover>0.7?18:eff.assetTurnover>0.4?10:eff.assetTurnover>0?5:0) +
    (eff.inventoryTurnover>10?25:eff.inventoryTurnover>6?18:eff.inventoryTurnover>3?10:eff.inventoryTurnover>0?5:0) +
    (eff.dso>0&&eff.dso<30?25:eff.dso>0&&eff.dso<45?18:eff.dso>0&&eff.dso<60?10:eff.dso>0?5:12) +
    (eff.ccc<20?25:eff.ccc<40?18:eff.ccc<60?10:5), 0, 100);

  const growthScore = clamp(
    revenueGrowth>30?100:revenueGrowth>20?85:revenueGrowth>10?70:
    revenueGrowth>5?55:revenueGrowth>0?40:revenueGrowth>-10?25:10, 0, 100);

  const cfScore = clamp(
    (cf.ocf>0?30:0)+(cf.freeCashFlow>0?25:0)+
    (cf.monthsRunway>18?25:cf.monthsRunway>12?20:cf.monthsRunway>6?12:cf.monthsRunway>3?5:0)+
    (cf.ocfToNetIncome>1?20:cf.ocfToNetIncome>0.8?15:cf.ocfToNetIncome>0.5?8:3), 0, 100);

  const overall = Math.round(
    profScore*0.22 + liqScore*0.15 + solScore*0.15 +
    effScore*0.10 + growthScore*0.15 + cfScore*0.13 + eq.sustainabilityScore*0.10);

  const label = overall>=80?'Excellent':overall>=60?'Good':overall>=40?'Needs Improvement':'High Risk';

  return { overall, profitability:profScore, liquidity:liqScore, solvency:solScore, efficiency:effScore, growth:growthScore, cashFlow:cfScore, earningsQuality:eq.sustainabilityScore, label };
}


// ==================== PIOTROSKI F-SCORE ====================

export interface PiotroskiFScore {
  fScore: number;           // 0-9
  signals: {
    // Profitability
    positiveROA: boolean;
    positiveCFO: boolean;
    roaImproving: boolean;
    cfoExceedsEarnings: boolean;
    // Leverage / Liquidity / Source of Funds
    lowerLeverage: boolean;
    higherLiquidity: boolean;
    noNewShares: boolean;
    // Operating Efficiency
    betterGrossMargin: boolean;
    betterAssetTurnover: boolean;
  };
  interpretation: string;
  category: "strong" | "neutral" | "weak";
}

export function calculatePiotroskiFScore(
  d: NormalizedFinancialRecord,
  prev?: NormalizedFinancialRecord
): PiotroskiFScore {
  const ni  = deriveNetIncome(d);
  const cfo = d.operatingCashFlow;
  const ta  = Math.max(1, d.totalAssets);
  const roa = safeDivide(ni, ta);

  const positiveROA         = roa > 0;
  const positiveCFO         = cfo > 0;
  const cfoExceedsEarnings  = cfo > ni;

  let roaImproving      = false;
  let lowerLeverage     = false;
  let higherLiquidity   = false;
  let noNewShares       = true;   // default true (no data = no evidence of dilution)
  let betterGrossMargin = false;
  let betterAssetTurnover = false;

  if (prev) {
    const prevNI  = deriveNetIncome(prev);
    const prevTA  = Math.max(1, prev.totalAssets);
    const prevROA = safeDivide(prevNI, prevTA);
    roaImproving  = roa > prevROA;

    const currLev = safeDivide(d.totalLiabilities, ta);
    const prevLev = safeDivide(prev.totalLiabilities, prevTA);
    lowerLeverage = currLev < prevLev;

    const currCA = deriveCurrentAssets(d);
    const currCL = Math.max(1, deriveCurrentLiabilities(d));
    const prevCA = deriveCurrentAssets(prev);
    const prevCL = Math.max(1, deriveCurrentLiabilities(prev));
    higherLiquidity = safeDivide(currCA, currCL) > safeDivide(prevCA, prevCL);

    const rev = Math.max(1, d.revenue);
    const prevRev = Math.max(1, prev.revenue);
    const currGM = safeDivide(d.revenue - d.cogs, rev);
    const prevGM = safeDivide(prev.revenue - prev.cogs, prevRev);
    betterGrossMargin = currGM > prevGM;

    const currATO = safeDivide(rev, ta);
    const prevATO = safeDivide(prevRev, prevTA);
    betterAssetTurnover = currATO > prevATO;
  }

  const fScore =
    (positiveROA ? 1 : 0) +
    (positiveCFO ? 1 : 0) +
    (roaImproving ? 1 : 0) +
    (cfoExceedsEarnings ? 1 : 0) +
    (lowerLeverage ? 1 : 0) +
    (higherLiquidity ? 1 : 0) +
    (noNewShares ? 1 : 0) +
    (betterGrossMargin ? 1 : 0) +
    (betterAssetTurnover ? 1 : 0);

  const category: PiotroskiFScore["category"] =
    fScore >= 7 ? "strong" : fScore >= 4 ? "neutral" : "weak";

  const interpretation =
    fScore >= 7
      ? `Strong (${fScore}/9): Company shows robust financial health and improving fundamentals.`
      : fScore >= 4
      ? `Neutral (${fScore}/9): Mixed signals. Some areas of improvement needed.`
      : `Weak (${fScore}/9): Multiple financial weaknesses detected. High-risk profile.`;

  return {
    fScore,
    signals: {
      positiveROA, positiveCFO, roaImproving, cfoExceedsEarnings,
      lowerLeverage, higherLiquidity, noNewShares,
      betterGrossMargin, betterAssetTurnover,
    },
    interpretation,
    category,
  };
}

// ==================== DSCR (Debt Service Coverage Ratio) ====================

export interface DSCRAnalysis {
  dscr: number;
  netOperatingIncome: number;
  totalDebtService: number;
  interpretation: string;
  risk: "safe" | "marginal" | "danger";
  dataInsufficient?: boolean;
}

export function calculateDSCR(d: NormalizedFinancialRecord): DSCRAnalysis {
  const ebitda    = deriveEBITDA(d);
  const principal = d.shortTermDebt || 0;     // Annual principal repayment (approximated)
  const interest  = d.interestExpense || 0;
  const totalDebtService = principal + interest;

  if (totalDebtService <= 0) {
    return {
      dscr: 0,
      netOperatingIncome: ebitda,
      totalDebtService: 0,
      interpretation: "No debt service obligations detected.",
      risk: "safe",
      dataInsufficient: true,
    };
  }

  const dscr = safeDivide(ebitda, totalDebtService);

  const risk: DSCRAnalysis["risk"] =
    dscr >= 1.25 ? "safe" : dscr >= 1.0 ? "marginal" : "danger";

  const interpretation =
    dscr >= 1.5
      ? `Strong (${dscr.toFixed(2)}x): Company comfortably covers debt service. Low default risk.`
      : dscr >= 1.25
      ? `Adequate (${dscr.toFixed(2)}x): Sufficient coverage with some buffer.`
      : dscr >= 1.0
      ? `Marginal (${dscr.toFixed(2)}x): Barely covers debt service. Monitor closely.`
      : `Danger (${dscr.toFixed(2)}x): Operating income insufficient to cover debt obligations. Default risk.`;

  return { dscr, netOperatingIncome: ebitda, totalDebtService, interpretation, risk };
}

// ==================== MAIN ====================

export function analyzeFinancials(data: NormalizedFinancialRecord[]): ComprehensiveFinancials {
  if (data.length === 0) throw new Error('No financial data provided');

  const latest = data[data.length - 1];
  const previous = data.length > 1 ? data[data.length - 2] : undefined;

  const profitability  = calculateProfitabilityRatios(latest);
  const liquidity      = calculateLiquidityRatios(latest);
  const solvency       = calculateSolvencyRatios(latest);
  const efficiency     = calculateEfficiencyRatios(latest);
  const dupont         = calculateDuPont(latest);
  const earningsQuality= calculateEarningsQuality(latest);
  const cashFlow       = calculateCashFlowAnalysis(latest);
  const altmanZ        = calculateAltmanZScore(latest);
  const beneishM       = calculateBeneishMScore(latest, previous);
  const piotroskiF     = calculatePiotroskiFScore(latest, previous);
  const dscrAnalysis   = calculateDSCR(latest);

  const revenueGrowth  = previous ? growthRate(latest.revenue, previous.revenue) : 0;
  const expenseGrowth  = previous ? growthRate(
    latest.cogs + latest.operatingExpenses,
    previous.cogs + previous.operatingExpenses) : 0;

  const score       = calculateFinancialScore(profitability, liquidity, solvency, efficiency, cashFlow, earningsQuality, revenueGrowth);
  const smartAlerts = generateSmartAlerts(latest, cashFlow, liquidity, solvency, profitability, score, altmanZ);
  const forecasts   = generateForecasts(data, 12);
  const scenarioAnalysis = generateScenarios(latest);
  const benchmarks  = generateBenchmarks(latest);
  const ni          = deriveNetIncome(latest);

  return {
    totalRevenue:    latest.revenue,
    totalExpenses:   latest.cogs + latest.operatingExpenses + latest.interestExpense + latest.tax,
    netProfit:       ni,
    netMargin:       profitability.netMargin,
    revenueGrowth,
    expenseGrowth,
    totalAssets:     latest.totalAssets,
    totalLiabilities:latest.totalLiabilities,
    totalEquity:     latest.totalEquity,
    cash:            latest.cash,
    inventory:       latest.inventory,
    accountsReceivable: latest.accountsReceivable,
    accountsPayable: latest.accountsPayable,
    profitability, liquidity, solvency, efficiency, dupont,
    earningsQuality, cashFlow, altmanZ, beneishM, piotroskiF, dscr: dscrAnalysis, score, smartAlerts,
    forecasts, scenarioAnalysis, benchmarks,
    months:              data.map(d => d.month || '').filter(Boolean),
    monthlyRevenue:      data.map(d => d.revenue),
    monthlyExpenses:     data.map(d => d.cogs + d.operatingExpenses + d.interestExpense + d.tax),
    monthlyNetIncome:    data.map(d => deriveNetIncome(d)),
    monthlyCash:         data.map(d => d.cash),
    monthlyAssets:       data.map(d => d.totalAssets),
    monthlyLiabilities:  data.map(d => d.totalLiabilities),
  };
}
