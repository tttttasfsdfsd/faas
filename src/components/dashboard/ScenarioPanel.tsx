/**
 * ScenarioPanel — Financial Simulation Engine
 * 
 * يتيح للمستخدم تغيير متغير واحد فقط في كل مرة.
 * المتغيرات المتاحة ثابتة (6 فقط).
 * كل نتيجة تُحسب رياضياً فقط — AI يفسر بعد الظهور.
 * إذا كانت النتيجة غير منطقية → تحذير بدلاً من رقم خاطئ.
 */

import { useState } from 'react';
import type { NormalizedFinancialRecord } from '@/lib/semanticMapping';
import type { ComprehensiveFinancials } from '@/lib/financialEngine';
import {
  calculateProfitabilityRatios,
  calculateLiquidityRatios,
  calculateSolvencyRatios,
  calculateFinancialScore,
  calculateCashFlowAnalysis,
  calculateEarningsQuality,
  calculateEfficiencyRatios,
} from '@/lib/financialEngine';

// المتغيرات المتاحة ثابتة — لا تزيد
const SCENARIO_VARIABLES = [
  {
    key: 'revenueChange',
    label: 'نسبة تغيير الإيرادات',
    description: 'تأثير على الإيرادات الإجمالية',
    unit: '%',
    min: -50,
    max: 100,
    default: 10,
  },
  {
    key: 'cogsChange',
    label: 'نسبة تغيير تكلفة المبيعات',
    description: 'تأثير على تكلفة البضاعة المباعة',
    unit: '%',
    min: -30,
    max: 50,
    default: 5,
  },
  {
    key: 'opexChange',
    label: 'نسبة تغيير المصروفات التشغيلية',
    description: 'تأثير على مصروفات التشغيل',
    unit: '%',
    min: -30,
    max: 50,
    default: 5,
  },
  {
    key: 'debtChange',
    label: 'نسبة تغيير الديون',
    description: 'تأثير على إجمالي الديون',
    unit: '%',
    min: -50,
    max: 100,
    default: 0,
  },
  {
    key: 'inventoryChange',
    label: 'نسبة تغيير المخزون',
    description: 'تأثير على مستوى المخزون',
    unit: '%',
    min: -50,
    max: 100,
    default: 0,
  },
  {
    key: 'dsoChange',
    label: 'نسبة تغيير أيام التحصيل (DSO)',
    description: 'تأثير على متوسط أيام تحصيل الذمم',
    unit: '%',
    min: -50,
    max: 100,
    default: 0,
  },
] as const;

type ScenarioKey = typeof SCENARIO_VARIABLES[number]['key'];

interface ScenarioResult {
  revenue: number;
  grossProfit: number;
  netProfit: number;
  cash: number;
  currentRatio: number;
  netMargin: number;
  roe: number;
  score: number;
  isUnrealistic: boolean;
  unrealisticReason?: string;
}

function runScenario(
  base: NormalizedFinancialRecord,
  variable: ScenarioKey,
  changePct: number
): ScenarioResult {
  const factor = 1 + changePct / 100;

  // بناء السجل المعدَّل (تغيير متغير واحد فقط)
  const modified: NormalizedFinancialRecord = { ...base };

  switch (variable) {
    case 'revenueChange':
      modified.revenue = base.revenue * factor;
      // تأثير مباشر على الربح الإجمالي وصافي الربح
      modified.grossProfit = modified.revenue - base.cogs;
      modified.netIncome = modified.grossProfit - base.operatingExpenses - base.interestExpense - base.tax;
      break;
    case 'cogsChange':
      modified.cogs = base.cogs * factor;
      modified.grossProfit = base.revenue - modified.cogs;
      modified.netIncome = modified.grossProfit - base.operatingExpenses - base.interestExpense - base.tax;
      break;
    case 'opexChange':
      modified.operatingExpenses = base.operatingExpenses * factor;
      modified.grossProfit = base.grossProfit || (base.revenue - base.cogs);
      modified.netIncome = modified.grossProfit - modified.operatingExpenses - base.interestExpense - base.tax;
      break;
    case 'debtChange':
      modified.totalLiabilities = base.totalLiabilities * factor;
      modified.totalEquity = base.totalAssets - modified.totalLiabilities;
      break;
    case 'inventoryChange':
      modified.inventory = base.inventory * factor;
      modified.currentAssets = base.cash + base.accountsReceivable + modified.inventory;
      break;
    case 'dsoChange': {
      // DSO = AR / Revenue * 365 → تغيير DSO يعني تغيير AR
      const currentDSO = base.accountsReceivable > 0 && base.revenue > 0
        ? (base.accountsReceivable / base.revenue) * 365 : 45;
      const newDSO = currentDSO * factor;
      modified.accountsReceivable = (newDSO * base.revenue) / 365;
      modified.currentAssets = base.cash + modified.accountsReceivable + base.inventory;
      break;
    }
  }

  // التحقق من منطقية النتيجة
  let isUnrealistic = false;
  let unrealisticReason: string | undefined;

  if (modified.totalEquity < 0 && base.totalEquity > 0) {
    isUnrealistic = true;
    unrealisticReason = 'هذا التغيير يؤدي لحقوق ملكية سالبة — غير منطقي مالياً';
  }
  if (modified.revenue < 0) {
    isUnrealistic = true;
    unrealisticReason = 'الإيرادات لا يمكن أن تكون سالبة';
  }
  if (modified.cogs > modified.revenue && modified.revenue > 0) {
    isUnrealistic = true;
    unrealisticReason = 'تكلفة المبيعات تتجاوز الإيرادات — مؤشر خطر';
  }

  const prof = calculateProfitabilityRatios(modified);
  const liq = calculateLiquidityRatios(modified);
  const sol = calculateSolvencyRatios(modified);
  const eff = calculateEfficiencyRatios(modified);
  const cf = calculateCashFlowAnalysis(modified);
  const eq = calculateEarningsQuality(modified);

  const score = calculateFinancialScore(prof, liq, sol, eff, cf, eq, 0);

  return {
    revenue: modified.revenue,
    grossProfit: modified.grossProfit,
    netProfit: modified.netIncome,
    cash: modified.cash,
    currentRatio: liq.currentRatio,
    netMargin: prof.netMargin,
    roe: prof.roe,
    score: score.overall,
    isUnrealistic,
    unrealisticReason,
  };
}

function formatDelta(current: number, base: number, unit = ''): { text: string; positive: boolean } {
  const diff = current - base;
  const pct = base !== 0 ? ((diff) / Math.abs(base)) * 100 : 0;
  const positive = diff >= 0;
  return {
    text: `${positive ? '+' : ''}${pct.toFixed(1)}% (${positive ? '+' : ''}${Math.round(diff).toLocaleString()}${unit})`,
    positive,
  };
}

interface Props {
  financials: ComprehensiveFinancials;
  currentPeriod: NormalizedFinancialRecord;
  isRTL?: boolean;
}

export default function ScenarioPanel({ financials, currentPeriod, isRTL = true }: Props) {
  const [selectedVar, setSelectedVar] = useState<ScenarioKey>('revenueChange');
  const [changeValue, setChangeValue] = useState(10);
  const [result, setResult] = useState<ScenarioResult | null>(null);

  const selectedDef = SCENARIO_VARIABLES.find(v => v.key === selectedVar)!;

  function runSimulation() {
    const res = runScenario(currentPeriod, selectedVar, changeValue);
    setResult(res);
  }

  return (
    <div className="bg-[#0D1117] rounded-2xl border border-gray-800 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      <h3 className="text-white font-bold text-lg mb-2">🎛️ محاكاة السيناريوهات</h3>
      <p className="text-gray-400 text-sm mb-6">
        غيّر متغيراً واحداً وشاهد تأثيره على جميع المؤشرات المالية — الحسابات رياضية بحتة.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel التحكم */}
        <div className="space-y-4">
          {/* اختيار المتغير */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">اختر المتغير:</label>
            <div className="space-y-2">
              {SCENARIO_VARIABLES.map(v => (
                <button
                  key={v.key}
                  onClick={() => { setSelectedVar(v.key as ScenarioKey); setResult(null); }}
                  className={`w-full text-right p-3 rounded-xl border text-sm transition-all ${
                    selectedVar === v.key
                      ? 'bg-blue-900/30 border-blue-600 text-white'
                      : 'bg-gray-900/30 border-gray-800 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div className="font-medium">{v.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{v.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* قيمة التغيير */}
          <div>
            <label className="text-gray-400 text-sm block mb-2">
              نسبة التغيير: <span className="text-white font-bold">{changeValue > 0 ? '+' : ''}{changeValue}%</span>
            </label>
            <input
              type="range"
              min={selectedDef.min}
              max={selectedDef.max}
              value={changeValue}
              onChange={e => { setChangeValue(Number(e.target.value)); setResult(null); }}
              className="w-full accent-blue-500"
              dir="ltr"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1" dir="ltr">
              <span>{selectedDef.min}%</span>
              <span>0%</span>
              <span>+{selectedDef.max}%</span>
            </div>
            <input
              type="number"
              value={changeValue}
              onChange={e => { setChangeValue(Number(e.target.value)); setResult(null); }}
              className="mt-2 w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2 text-center focus:outline-none focus:border-blue-500"
              dir="ltr"
            />
          </div>

          <button
            onClick={runSimulation}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-purple-500 transition-all"
          >
            ▶ تشغيل المحاكاة
          </button>
        </div>

        {/* النتائج */}
        <div>
          {result === null ? (
            <div className="h-full flex items-center justify-center text-gray-600 text-sm text-center">
              اختر متغيراً وحدد نسبة التغيير ثم اضغط "تشغيل المحاكاة"
            </div>
          ) : result.isUnrealistic ? (
            <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
              <div className="text-red-400 text-xl font-bold mb-2">⚠️ نتيجة غير منطقية</div>
              <p className="text-gray-300 text-sm">{result.unrealisticReason}</p>
              <p className="text-gray-500 text-xs mt-3">
                حاول بنسبة تغيير أصغر أو اختر متغيراً مختلفاً.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-gray-300 text-sm mb-3 text-center">
                تأثير تغيير {selectedDef.label} بنسبة {changeValue > 0 ? '+' : ''}{changeValue}%
              </div>

              {[
                { label: 'الإيرادات', current: result.revenue, base: financials.totalRevenue, unit: ' ريال' },
                { label: 'إجمالي الربح', current: result.grossProfit, base: financials.totalRevenue - (currentPeriod.cogs || 0), unit: ' ريال' },
                { label: 'صافي الربح', current: result.netProfit, base: financials.netProfit, unit: ' ريال' },
                { label: 'النقد', current: result.cash, base: financials.cash, unit: ' ريال' },
                { label: 'نسبة التداول', current: result.currentRatio, base: financials.liquidity.currentRatio, unit: 'x' },
                { label: 'هامش الربح الصافي', current: result.netMargin, base: financials.profitability.netMargin, unit: '%' },
                { label: 'ROE', current: result.roe, base: financials.profitability.roe, unit: '%' },
                { label: 'التقييم الشامل', current: result.score, base: financials.score.overall, unit: '/100' },
              ].map(item => {
                const delta = formatDelta(item.current, item.base, item.unit);
                const improved = delta.positive;
                return (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-xl border border-gray-800">
                    <span className={`text-sm font-mono ${improved ? 'text-green-400' : 'text-red-400'}`}>
                      {delta.text}
                    </span>
                    <span className="text-gray-300 text-sm">{item.label}</span>
                  </div>
                );
              })}

              <div className="text-center text-xs text-gray-600 mt-2 pt-2 border-t border-gray-800">
                جميع النتائج محسوبة رياضياً من معادلات المحرك المالي
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
