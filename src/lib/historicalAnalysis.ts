/**
 * Historical Analysis Engine — CAGR والتحليل التاريخي
 * 
 * يحسب جميع النسب لكل فترة على حدة ويعرض الاتجاه الزمني.
 * يحسب CAGR عند وجود فترتين سنويتين كاملتين على الأقل.
 * إذا كانت الفترات شهرية أو ربعية يحوّلها رياضياً لمعدل سنوي.
 */

import type { NormalizedFinancialRecord } from './semanticMapping';
import {
  calculateProfitabilityRatios,
  calculateLiquidityRatios,
  calculateSolvencyRatios,
  calculateEfficiencyRatios,
} from './financialEngine';

export type PeriodType = 'monthly' | 'quarterly' | 'annual';

export interface PeriodRatios {
  period: string;
  periodOrder: number;
  revenue: number;
  grossProfit: number;
  netProfit: number;
  equity: number;
  assets: number;
  cash: number;
  operatingCashFlow: number;
  profitability: ReturnType<typeof calculateProfitabilityRatios>;
  liquidity: ReturnType<typeof calculateLiquidityRatios>;
  solvency: ReturnType<typeof calculateSolvencyRatios>;
  efficiency: ReturnType<typeof calculateEfficiencyRatios>;
}

export interface CAGRResult {
  metric: string;
  label: string;
  cagr: number | null;
  startValue: number;
  endValue: number;
  periodsCount: number;
  yearsEquivalent: number;
  warning?: string;
}

export interface HistoricalAnalysis {
  periods: PeriodRatios[];
  periodType: PeriodType;
  cagr: CAGRResult[];
  trends: {
    metric: string;
    label: string;
    values: number[];
    periods: string[];
    direction: 'improving' | 'declining' | 'stable';
    changeOverall: number; // % التغير من أول فترة لآخر فترة
  }[];
  hasEnoughForCAGR: boolean;
  cagrWarning?: string;
}

/**
 * يكتشف نوع الفترات تلقائياً
 */
function detectPeriodType(records: NormalizedFinancialRecord[]): PeriodType {
  if (records.length <= 4) return 'annual';
  if (records.length <= 8) return 'quarterly';
  return 'monthly';
}

/**
 * يحوّل عدد الفترات لسنوات معادلة
 */
function periodsToYears(count: number, type: PeriodType): number {
  if (type === 'annual') return count - 1;
  if (type === 'quarterly') return (count - 1) / 4;
  return (count - 1) / 12;
}

/**
 * يحسب CAGR رياضياً
 * CAGR = (EndValue / StartValue)^(1 / years) - 1
 */
function calculateCAGR(startValue: number, endValue: number, years: number): number | null {
  if (years <= 0 || startValue <= 0 || endValue <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export function analyzeHistorical(records: NormalizedFinancialRecord[]): HistoricalAnalysis {
  if (records.length === 0) {
    return { periods: [], periodType: 'annual', cagr: [], trends: [], hasEnoughForCAGR: false };
  }

  const periodType = detectPeriodType(records);

  // حساب النسب لكل فترة
  const periods: PeriodRatios[] = records.map((rec, idx) => ({
    period: rec.month || `فترة ${idx + 1}`,
    periodOrder: idx + 1,
    revenue: rec.revenue,
    grossProfit: rec.grossProfit || Math.max(0, rec.revenue - rec.cogs),
    netProfit: rec.netIncome,
    equity: rec.totalEquity,
    assets: rec.totalAssets,
    cash: rec.cash,
    operatingCashFlow: rec.operatingCashFlow,
    profitability: calculateProfitabilityRatios(rec),
    liquidity: calculateLiquidityRatios(rec),
    solvency: calculateSolvencyRatios(rec),
    efficiency: calculateEfficiencyRatios(rec),
  }));

  // التحقق من إمكانية حساب CAGR
  const yearsEquiv = periodsToYears(records.length, periodType);
  const hasEnoughForCAGR = yearsEquiv >= 1.0; // سنة كاملة على الأقل

  let cagrWarning: string | undefined;
  if (!hasEnoughForCAGR) {
    cagrWarning = `البيانات المتوفرة تغطي ${(yearsEquiv * 12).toFixed(0)} شهراً فقط. يلزم سنة كاملة على الأقل لحساب CAGR.`;
  }

  // حساب CAGR للمؤشرات الرئيسية
  const first = periods[0];
  const last = periods[periods.length - 1];

  const cagrMetrics: Array<{ key: keyof Omit<PeriodRatios, 'period' | 'periodOrder' | 'profitability' | 'liquidity' | 'solvency' | 'efficiency'>; label: string }> = [
    { key: 'revenue',          label: 'نمو الإيرادات' },
    { key: 'grossProfit',      label: 'نمو إجمالي الربح' },
    { key: 'netProfit',        label: 'نمو صافي الربح' },
    { key: 'equity',           label: 'نمو حقوق الملكية' },
    { key: 'assets',           label: 'نمو إجمالي الأصول' },
    { key: 'cash',             label: 'نمو النقد' },
    { key: 'operatingCashFlow', label: 'نمو التدفق التشغيلي' },
  ];

  const cagr: CAGRResult[] = cagrMetrics.map(({ key, label }) => {
    const startVal = first[key] as number;
    const endVal = last[key] as number;

    if (!hasEnoughForCAGR) {
      return {
        metric: key,
        label,
        cagr: null,
        startValue: startVal,
        endValue: endVal,
        periodsCount: records.length,
        yearsEquivalent: yearsEquiv,
        warning: cagrWarning,
      };
    }

    return {
      metric: key,
      label,
      cagr: calculateCAGR(startVal, endVal, yearsEquiv),
      startValue: startVal,
      endValue: endVal,
      periodsCount: records.length,
      yearsEquivalent: yearsEquiv,
    };
  });

  // بناء اتجاهات المؤشرات
  const trendMetrics = [
    { key: 'revenue',     label: 'الإيرادات',        getValue: (p: PeriodRatios) => p.revenue },
    { key: 'netMargin',   label: 'هامش الربح الصافي', getValue: (p: PeriodRatios) => p.profitability.netMargin },
    { key: 'roe',         label: 'ROE',               getValue: (p: PeriodRatios) => p.profitability.roe },
    { key: 'currentRatio',label: 'نسبة التداول',      getValue: (p: PeriodRatios) => p.liquidity.currentRatio },
    { key: 'debtRatio',   label: 'نسبة الديون',       getValue: (p: PeriodRatios) => p.solvency.debtRatio * 100 },
    { key: 'ccc',         label: 'دورة التحويل النقدي', getValue: (p: PeriodRatios) => p.efficiency.ccc },
  ];

  const trends = trendMetrics.map(({ key, label, getValue }) => {
    const values = periods.map(getValue);
    const validValues = values.filter(v => isFinite(v) && !isNaN(v));
    const first_ = validValues[0] ?? 0;
    const last_ = validValues[validValues.length - 1] ?? 0;
    const changeOverall = first_ !== 0 ? ((last_ - first_) / Math.abs(first_)) * 100 : 0;
    
    const direction: 'improving' | 'declining' | 'stable' =
      Math.abs(changeOverall) < 5 ? 'stable' :
      changeOverall > 0 ? 'improving' : 'declining';

    return {
      metric: key,
      label,
      values,
      periods: periods.map(p => p.period),
      direction,
      changeOverall,
    };
  });

  return {
    periods,
    periodType,
    cagr,
    trends,
    hasEnoughForCAGR,
    cagrWarning,
  };
}
