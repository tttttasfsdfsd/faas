/**
 * WaterfallPanel — Profit Bridge بمخطط Waterfall احترافي
 * 
 * يعرض رحلة الربح من الإيراد حتى صافي الربح:
 * الإيراد → (-COGS) → الربح الإجمالي → (-OpEx) → EBIT → (+DA) → EBITDA → (-فوائد-ضرائب) → صافي الربح
 * 
 * كل قيمة مأخوذة من الحسابات الفعلية — لا يُكمَّل أي رقم ناقص.
 */

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine
} from 'recharts';
import type { NormalizedFinancialRecord } from '@/lib/semanticMapping';
import type { ComprehensiveFinancials } from '@/lib/financialEngine';

interface VarianceItem {
  label: string;
  current: number;
  previous: number | null;
  changeAbs: number | null;
  changePct: number | null;
  higherIsBetter: boolean;
}

interface Props {
  financials: ComprehensiveFinancials;
  currentPeriod: NormalizedFinancialRecord;
  previousPeriod?: NormalizedFinancialRecord | null;
}

function fmtCur(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (Math.abs(n) >= 1_000)     return `${(n / 1_000).toFixed(0)}ك`;
  return n.toFixed(0);
}

interface WaterfallEntry {
  name: string;
  value: number;
  start: number;
  type: 'start' | 'positive' | 'negative' | 'subtotal' | 'total';
  displayValue: number;
}

function buildWaterfallData(d: NormalizedFinancialRecord, f: ComprehensiveFinancials): WaterfallEntry[] {
  const revenue = d.revenue;
  const cogs = d.cogs || 0;
  const grossProfit = d.grossProfit || revenue - cogs;
  const opex = d.operatingExpenses || 0;
  const depreciation = d.depreciation || 0;
  const amortization = (d.amortization as number) || 0;
  const da = depreciation + amortization;
  const ebit = grossProfit - opex;
  const ebitda = ebit + da;
  const interest = d.interestExpense || 0;
  const tax = d.tax || 0;
  const netProfit = f.netProfit;

  const entries: WaterfallEntry[] = [];
  let cursor = 0;

  // الإيراد
  entries.push({ name: 'الإيراد', value: revenue, start: 0, type: 'start', displayValue: revenue });
  cursor = revenue;

  // (-) تكلفة المبيعات
  if (cogs > 0) {
    entries.push({ name: '(-) تكلفة المبيعات', value: -cogs, start: cursor - cogs, type: 'negative', displayValue: -cogs });
    cursor -= cogs;
  }

  // إجمالي الربح (subtotal)
  entries.push({ name: 'إجمالي الربح', value: cursor, start: 0, type: 'subtotal', displayValue: cursor });

  // (-) مصروفات تشغيلية
  if (opex > 0) {
    entries.push({ name: '(-) المصروفات التشغيلية', value: -opex, start: cursor - opex, type: 'negative', displayValue: -opex });
    cursor -= opex;
  }

  // EBIT (subtotal)
  entries.push({ name: 'EBIT', value: cursor, start: 0, type: 'subtotal', displayValue: cursor });

  // (+) الإهلاك — إضافة لأن EBITDA أعلى من EBIT
  if (da > 0) {
    entries.push({ name: '(+) الإهلاك والاستهلاك', value: da, start: cursor, type: 'positive', displayValue: da });
    cursor += da;
  }

  // EBITDA (subtotal)
  if (da > 0) {
    entries.push({ name: 'EBITDA', value: cursor, start: 0, type: 'subtotal', displayValue: cursor });
    // ارجع لـ EBIT للحسابات التالية
    cursor -= da;
  }

  // (-) الفوائد
  if (interest > 0) {
    entries.push({ name: '(-) مصروفات الفوائد', value: -interest, start: cursor - interest, type: 'negative', displayValue: -interest });
    cursor -= interest;
  }

  // (-) الضريبة
  if (tax > 0) {
    entries.push({ name: '(-) الضريبة', value: -tax, start: cursor - tax, type: 'negative', displayValue: -tax });
    cursor -= tax;
  }

  // صافي الربح (total)
  entries.push({ name: 'صافي الربح', value: netProfit, start: 0, type: 'total', displayValue: netProfit });

  return entries;
}

const COLORS = {
  start:    '#4F6AF6',
  positive: '#10B981',
  negative: '#EF4444',
  subtotal: '#8B5CF6',
  total:    '#F59E0B',
};

function WaterfallCustomBar(props: { x?: number; y?: number; width?: number; height?: number; fill?: string; entry?: WaterfallEntry }) {
  const { x = 0, y = 0, width = 0, height = 0, fill } = props;
  return <rect x={x} y={y} width={width} height={Math.abs(height)} fill={fill} rx={3} />;
}

export default function WaterfallPanel({ financials, currentPeriod, previousPeriod }: Props) {
  const waterfallData = buildWaterfallData(currentPeriod, financials);

  // Variance Analysis
  const varianceItems: VarianceItem[] = [
    { label: 'الإيرادات',          current: currentPeriod.revenue,          previous: previousPeriod?.revenue ?? null,          higherIsBetter: true,  changeAbs: null, changePct: null },
    { label: 'تكلفة المبيعات',    current: currentPeriod.cogs,              previous: previousPeriod?.cogs ?? null,              higherIsBetter: false, changeAbs: null, changePct: null },
    { label: 'إجمالي الربح',       current: currentPeriod.grossProfit,       previous: previousPeriod?.grossProfit ?? null,       higherIsBetter: true,  changeAbs: null, changePct: null },
    { label: 'المصروفات التشغيلية',current: currentPeriod.operatingExpenses, previous: previousPeriod?.operatingExpenses ?? null, higherIsBetter: false, changeAbs: null, changePct: null },
    { label: 'صافي الربح',         current: financials.netProfit,            previous: previousPeriod ? (previousPeriod.netIncome || 0) : null, higherIsBetter: true, changeAbs: null, changePct: null },
    { label: 'النقد',              current: currentPeriod.cash,              previous: previousPeriod?.cash ?? null,              higherIsBetter: true,  changeAbs: null, changePct: null },
    { label: 'رأس المال العامل',   current: financials.liquidity.workingCapital, previous: null,                                  higherIsBetter: true,  changeAbs: null, changePct: null },
    { label: 'التدفق التشغيلي',    current: currentPeriod.operatingCashFlow, previous: previousPeriod?.operatingCashFlow ?? null, higherIsBetter: true,  changeAbs: null, changePct: null },
  ].map(item => ({
    ...item,
    changeAbs: item.previous !== null ? item.current - item.previous : null,
    changePct: item.previous && item.previous !== 0 ? ((item.current - item.previous) / Math.abs(item.previous)) * 100 : null,
  }));

  return (
    <div className="space-y-6">
      {/* Waterfall / Profit Bridge */}
      <div className="bg-[#0D1117] rounded-2xl border border-gray-800 p-6">
        <h3 className="text-white font-bold text-lg mb-2 text-right">🏗️ جسر الربح (Profit Bridge)</h3>
        <p className="text-gray-400 text-sm mb-6 text-right">رحلة الإيراد من أعلى إلى صافي الربح — أين تتسرب الأرباح؟</p>
        
        <ResponsiveContainer width="100%" height={380}>
          <BarChart data={waterfallData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
            <XAxis
              dataKey="name"
              tick={{ fill: '#9CA3AF', fontSize: 10 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis
              tickFormatter={fmtCur}
              tick={{ fill: '#9CA3AF', fontSize: 11 }}
            />
            <Tooltip
              formatter={(value: number, _name: string, props: { payload?: WaterfallEntry }) => {
                const entry = props.payload;
                return [
                  `${fmtCur(entry?.displayValue ?? value)} ريال`,
                  entry?.name ?? '',
                ];
              }}
              contentStyle={{ background: '#1F2937', border: '1px solid #374151', borderRadius: 8 }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <ReferenceLine y={0} stroke="#374151" strokeWidth={2} />
            <Bar dataKey="value" shape={<WaterfallCustomBar />}>
              {waterfallData.map((entry, idx) => (
                <Cell key={idx} fill={COLORS[entry.type]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center mt-2 text-xs">
          {Object.entries(COLORS).map(([type, color]) => {
            const labels: Record<string, string> = { start: 'انطلاق', positive: 'إضافة', negative: 'طرح', subtotal: 'مجموع فرعي', total: 'إجمالي' };
            return (
              <span key={type} className="flex items-center gap-1 text-gray-400">
                <span className="w-3 h-3 rounded inline-block" style={{ background: color }} />
                {labels[type]}
              </span>
            );
          })}
        </div>
      </div>

      {/* Variance Analysis */}
      {previousPeriod && (
        <div className="bg-[#0D1117] rounded-2xl border border-gray-800 p-6">
          <h3 className="text-white font-bold text-lg mb-2 text-right">📊 تحليل الانحراف (Variance Analysis)</h3>
          <p className="text-gray-400 text-sm mb-6 text-right">الانحراف بين الفترة الحالية والفترة السابقة</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-right border-b border-gray-800">
                  <th className="pb-3 pr-4">المؤشر</th>
                  <th className="pb-3 pr-4 text-left">الحالي</th>
                  <th className="pb-3 pr-4 text-left">السابق</th>
                  <th className="pb-3 pr-4 text-left">الانحراف</th>
                  <th className="pb-3 pr-4 text-left">%</th>
                </tr>
              </thead>
              <tbody>
                {varianceItems.filter(item => item.previous !== null).map(item => {
                  const positive = item.higherIsBetter
                    ? (item.changeAbs ?? 0) >= 0
                    : (item.changeAbs ?? 0) <= 0;

                  return (
                    <tr key={item.label} className="border-b border-gray-800/50 hover:bg-gray-900/20">
                      <td className="py-3 pr-4 text-right text-gray-300 font-medium">{item.label}</td>
                      <td className="py-3 pr-4 text-left text-white font-mono">{fmtCur(item.current)}</td>
                      <td className="py-3 pr-4 text-left text-gray-400 font-mono">{item.previous !== null ? fmtCur(item.previous) : '—'}</td>
                      <td className={`py-3 pr-4 text-left font-mono font-bold ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {item.changeAbs !== null ? (item.changeAbs >= 0 ? '+' : '') + fmtCur(item.changeAbs) : '—'}
                      </td>
                      <td className={`py-3 pr-4 text-left font-mono ${positive ? 'text-green-400' : 'text-red-400'}`}>
                        {item.changePct !== null
                          ? `${item.changePct >= 0 ? '▲' : '▼'} ${Math.abs(item.changePct).toFixed(1)}%`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!previousPeriod && (
        <div className="bg-gray-900/30 rounded-xl border border-gray-800 p-6 text-center text-gray-500">
          يتطلب تحليل الانحراف فترتين ماليتين على الأقل. ارفع بيانات فترة إضافية للحصول على هذا التحليل.
        </div>
      )}
    </div>
  );
}
