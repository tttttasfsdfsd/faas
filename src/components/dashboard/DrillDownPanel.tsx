/**
 * DrillDownPanel — لوحة التفاصيل عند الضغط على أي محور
 * 
 * يفتح panel جانبي في نفس الصفحة دون انتقال — زر إغلاق واضح.
 * 
 * الأنواع المدعومة:
 * - liquidity: نسب السيولة + رأس المال العامل
 * - profitability: الهوامش + ROA/ROE/ROIC/ROCE + DuPont
 * - efficiency: دوران الأصول + DIO/DSO/DPO/CCC
 * - solvency: نسب الدين + الرافعة + تغطية الفوائد
 */

import type { ComprehensiveFinancials } from '@/lib/financialEngine';

type DrillType = 'liquidity' | 'profitability' | 'efficiency' | 'solvency';

interface Props {
  type: DrillType | null;
  financials: ComprehensiveFinancials;
  onClose: () => void;
  isRTL?: boolean;
}

interface MetricRow {
  label: string;
  value: number | null;
  unit: string;
  description: string;
  good?: (v: number) => boolean;
}

function fmt(n: number | null | undefined, decimals = 2): string {
  if (n == null || isNaN(n as number)) return '—';
  return (n as number).toFixed(decimals);
}

function StatusDot({ value, good }: { value: number | null; good?: (v: number) => boolean }) {
  if (value == null || !good) return null;
  return (
    <span className={`inline-block w-2 h-2 rounded-full ml-2 ${good(value) ? 'bg-green-400' : 'bg-red-400'}`} />
  );
}

function MetricItem({ row, isRTL }: { row: MetricRow; isRTL: boolean }) {
  const isGood = row.value != null && row.good ? row.good(row.value) : null;

  return (
    <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-800 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between mb-1">
        <div className={`text-xl font-bold font-mono ${
          isGood === true ? 'text-green-400' :
          isGood === false ? 'text-red-400' : 'text-white'
        }`}>
          {row.value != null ? `${fmt(row.value)}${row.unit}` : '—'}
          <StatusDot value={row.value} good={row.good} />
        </div>
        <span className="text-gray-300 text-sm font-medium" dir={isRTL ? 'rtl' : 'ltr'}>
          {row.label}
        </span>
      </div>
      <p className="text-gray-500 text-xs" dir={isRTL ? 'rtl' : 'ltr'}>{row.description}</p>
    </div>
  );
}

function getLiquidityRows(f: ComprehensiveFinancials): MetricRow[] {
  const l = f.liquidity;
  return [
    {
      label: 'نسبة التداول (Current Ratio)',
      value: l.currentRatio,
      unit: 'x',
      description: 'الأصول المتداولة ÷ الخصوم المتداولة — المثالي فوق 1.5',
      good: v => v >= 1.5,
    },
    {
      label: 'نسبة السيولة السريعة (Quick Ratio)',
      value: l.quickRatio,
      unit: 'x',
      description: '(الأصول المتداولة - المخزون) ÷ الخصوم المتداولة — المثالي فوق 1.0',
      good: v => v >= 1.0,
    },
    {
      label: 'نسبة النقدية (Cash Ratio)',
      value: l.cashRatio,
      unit: 'x',
      description: 'النقد ÷ الخصوم المتداولة — يقيس القدرة على السداد الفوري',
      good: v => v >= 0.2,
    },
    {
      label: 'رأس المال العامل',
      value: l.workingCapital,
      unit: ' ريال',
      description: 'الأصول المتداولة - الخصوم المتداولة — يجب أن يكون موجباً',
      good: v => v > 0,
    },
    {
      label: 'نسبة التدفق التشغيلي (OCF Ratio)',
      value: f.cashFlow.ocf != null && l.currentLiabilities != null && l.currentLiabilities > 0
        ? f.cashFlow.ocf / l.currentLiabilities : null,
      unit: 'x',
      description: 'التدفق التشغيلي ÷ الخصوم المتداولة — يقيس قدرة الأرباح النقدية على تغطية الالتزامات',
      good: v => v >= 0.4,
    },
  ];
}

function getProfitabilityRows(f: ComprehensiveFinancials): MetricRow[] {
  const p = f.profitability;
  return [
    {
      label: 'هامش الربح الإجمالي',
      value: p.grossMargin,
      unit: '%',
      description: 'إجمالي الربح ÷ الإيرادات × 100',
      good: v => v >= 30,
    },
    {
      label: 'هامش EBITDA',
      value: p.ebitdaMargin,
      unit: '%',
      description: 'EBITDA ÷ الإيرادات × 100 — يستثني الاستهلاك والفوائد والضرائب',
      good: v => v >= 15,
    },
    {
      label: 'هامش EBIT',
      value: p.ebitMargin,
      unit: '%',
      description: 'EBIT ÷ الإيرادات × 100',
      good: v => v >= 10,
    },
    {
      label: 'هامش الربح الصافي',
      value: p.netMargin,
      unit: '%',
      description: 'صافي الربح ÷ الإيرادات × 100',
      good: v => v >= 5,
    },
    {
      label: 'العائد على الأصول (ROA)',
      value: p.roa,
      unit: '%',
      description: 'صافي الربح ÷ إجمالي الأصول × 100',
      good: v => v >= 5,
    },
    {
      label: 'العائد على حقوق الملكية (ROE)',
      value: p.roe,
      unit: '%',
      description: 'صافي الربح ÷ حقوق الملكية × 100',
      good: v => v >= 12,
    },
    {
      label: 'العائد على رأس المال المستثمر (ROIC)',
      value: p.roic,
      unit: '%',
      description: 'EBIT (1-t) ÷ (حقوق الملكية + الدين طويل الأجل) × 100',
      good: v => v >= 10,
    },
    {
      label: 'العائد على رأس المال المستخدم (ROCE)',
      value: p.roce,
      unit: '%',
      description: 'EBIT ÷ (الأصول - الخصوم المتداولة) × 100',
      good: v => v >= 10,
    },
  ];
}

function getEfficiencyRows(f: ComprehensiveFinancials): MetricRow[] {
  const e = f.efficiency;
  return [
    {
      label: 'دوران الأصول (Asset Turnover)',
      value: e.assetTurnover,
      unit: 'x',
      description: 'الإيرادات ÷ إجمالي الأصول — كلما ارتفع كان أفضل',
      good: v => v >= 0.8,
    },
    {
      label: 'دوران المخزون (Inventory Turnover)',
      value: e.inventoryTurnover,
      unit: 'x',
      description: 'تكلفة المبيعات ÷ متوسط المخزون',
      good: v => v >= 4,
    },
    {
      label: 'أيام المخزون (DIO)',
      value: e.dio,
      unit: ' يوم',
      description: '365 ÷ دوران المخزون — كلما قل كان أفضل',
      good: v => v <= 60,
    },
    {
      label: 'أيام التحصيل (DSO)',
      value: e.dso,
      unit: ' يوم',
      description: 'ذمم المدينين ÷ الإيرادات × 365 — كلما قل كان أفضل',
      good: v => v <= 45,
    },
    {
      label: 'أيام الدفع (DPO)',
      value: e.dpo,
      unit: ' يوم',
      description: 'ذمم الدائنين ÷ تكلفة المبيعات × 365 — كلما ارتفع كان أفضل',
      good: v => v >= 30,
    },
    {
      label: 'دورة التحويل النقدي (CCC)',
      value: e.ccc,
      unit: ' يوم',
      description: 'DIO + DSO - DPO — كلما قل كان أفضل، السلبي مثالي',
      good: v => v <= 30,
    },
  ];
}

function getSolvencyRows(f: ComprehensiveFinancials): MetricRow[] {
  const s = f.solvency;
  return [
    {
      label: 'نسبة الدين (Debt Ratio)',
      value: s.debtRatio * 100,
      unit: '%',
      description: 'إجمالي الخصوم ÷ إجمالي الأصول × 100 — كلما قل كان أأمن',
      good: v => v <= 50,
    },
    {
      label: 'الدين إلى حقوق الملكية (D/E)',
      value: s.debtToEquity,
      unit: 'x',
      description: 'إجمالي الخصوم ÷ حقوق الملكية',
      good: v => v <= 1.5,
    },
    {
      label: 'نسبة الدين طويل الأجل',
      value: s.longTermDebtRatio != null ? s.longTermDebtRatio * 100 : null,
      unit: '%',
      description: 'الديون طويلة الأجل ÷ إجمالي الأصول × 100',
      good: v => v <= 40,
    },
    {
      label: 'الرافعة المالية (Equity Multiplier)',
      value: s.equityMultiplier,
      unit: 'x',
      description: 'إجمالي الأصول ÷ حقوق الملكية — جزء DuPont',
      good: v => v <= 3,
    },
    {
      label: 'تغطية الفوائد (Interest Coverage)',
      value: s.interestCoverage,
      unit: 'x',
      description: 'EBIT ÷ مصروف الفوائد — فوق 3x يُعد آمناً',
      good: v => v >= 3,
    },
  ];
}

const PANEL_CONFIG: Record<DrillType, {
  title: string;
  icon: string;
  getRows: (f: ComprehensiveFinancials) => MetricRow[];
}> = {
  liquidity: {
    title: 'تحليل السيولة',
    icon: '💧',
    getRows: getLiquidityRows,
  },
  profitability: {
    title: 'تحليل الربحية',
    icon: '💰',
    getRows: getProfitabilityRows,
  },
  efficiency: {
    title: 'تحليل الكفاءة التشغيلية',
    icon: '⚙️',
    getRows: getEfficiencyRows,
  },
  solvency: {
    title: 'تحليل الملاءة المالية',
    icon: '🏦',
    getRows: getSolvencyRows,
  },
};

export default function DrillDownPanel({ type, financials, onClose, isRTL = true }: Props) {
  if (!type) return null;

  const config = PANEL_CONFIG[type];
  const rows = config.getRows(financials);

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed top-0 ${isRTL ? 'left-0' : 'right-0'} h-full w-full max-w-md bg-[#0D1117] border-${isRTL ? 'r' : 'l'} border-gray-700 z-50 overflow-y-auto shadow-2xl`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0D1117] border-b border-gray-800 p-4 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <span>{config.icon}</span>
            {config.title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            aria-label="إغلاق"
          >
            ✕
          </button>
        </div>

        {/* Metrics */}
        <div className="p-4 space-y-3">
          {rows.map((row, i) => (
            <MetricItem key={i} row={row} isRTL={isRTL} />
          ))}
        </div>

        {/* DuPont decomposition for profitability */}
        {type === 'profitability' && (
          <div className="mx-4 mb-4 p-4 bg-purple-900/20 border border-purple-800 rounded-xl">
            <h4 className="text-purple-400 font-bold mb-3">تحليل DuPont</h4>
            <div className="text-sm text-gray-300 space-y-2" dir="rtl">
              <div className="flex justify-between">
                <span>هامش الربح الصافي</span>
                <span className="font-mono">{fmt(financials.profitability.netMargin)}%</span>
              </div>
              <div className="text-gray-600 text-center">×</div>
              <div className="flex justify-between">
                <span>دوران الأصول</span>
                <span className="font-mono">{fmt(financials.efficiency.assetTurnover)}x</span>
              </div>
              <div className="text-gray-600 text-center">×</div>
              <div className="flex justify-between">
                <span>مضاعف حقوق الملكية</span>
                <span className="font-mono">{fmt(financials.solvency.equityMultiplier)}x</span>
              </div>
              <div className="border-t border-purple-800 pt-2 flex justify-between font-bold">
                <span className="text-purple-300">ROE</span>
                <span className="font-mono text-purple-400">{fmt(financials.profitability.roe)}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="h-8" /> {/* bottom padding */}
      </div>
    </>
  );
}

// Export type for use in parent components
export type { DrillType };
