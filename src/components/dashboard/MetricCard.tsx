/**
 * MetricCard — بطاقة المؤشر الموحدة (Comparative Intelligence Layer)
 * 
 * تعرض في بطاقة واحدة لكل مؤشر:
 * 1. القيمة الفعلية المحسوبة رياضياً
 * 2. القيمة المستهدفة من صفحة الأهداف
 * 3. متوسط القطاع من جدول البنشمارك
 * 4. الفرق عن الهدف والفرق عن القطاع
 * 5. الاتجاه التاريخي (سهم)
 * 6. الحالة النهائية بمؤشر بصري
 */

import type { BenchmarkRange } from '@/lib/sectorBenchmarks';
import { evaluateMetric } from '@/lib/sectorBenchmarks';

interface MetricCardProps {
  // البيانات الأساسية
  label: string;
  value: number | null;
  unit?: '%' | 'x' | 'days' | 'ريال' | '';
  decimals?: number;
  
  // المقارنة
  target?: number | null;
  benchmark?: BenchmarkRange | null;
  
  // الاتجاه التاريخي
  previousValue?: number | null;
  historicalValues?: number[];
  
  // التخصيص
  description?: string;
  higherIsBetter?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

type Status = 'above_target' | 'at_target' | 'below_target' | 'no_target';

function getStatus(value: number, target: number | null | undefined, higherIsBetter: boolean): Status {
  if (!target) return 'no_target';
  const diff = value - target;
  const diffPct = Math.abs(diff) / Math.max(1, Math.abs(target)) * 100;
  
  if (diffPct <= 5) return 'at_target';
  if (higherIsBetter) return diff > 0 ? 'above_target' : 'below_target';
  return diff < 0 ? 'above_target' : 'below_target';
}

const STATUS_STYLES: Record<Status, { bg: string; text: string; label: string; dot: string }> = {
  above_target: { bg: 'bg-green-900/20', text: 'text-green-400', label: 'فوق الهدف', dot: '🟢' },
  at_target:    { bg: 'bg-blue-900/20',  text: 'text-blue-400',  label: 'عند الهدف',  dot: '🔵' },
  below_target: { bg: 'bg-red-900/20',   text: 'text-red-400',   label: 'تحت الهدف',  dot: '🔴' },
  no_target:    { bg: 'bg-gray-900/20',  text: 'text-gray-400',  label: '',            dot: '⚪' },
};

function TrendArrow({ current, previous, higherIsBetter }: { current: number; previous: number; higherIsBetter: boolean }) {
  const up = current >= previous;
  const good = up === higherIsBetter;
  return (
    <span className={`text-sm ${good ? 'text-green-400' : 'text-red-400'}`} title={`السابق: ${previous}`}>
      {up ? '↑' : '↓'} {Math.abs(((current - previous) / Math.max(1, Math.abs(previous))) * 100).toFixed(1)}%
    </span>
  );
}

function formatValue(val: number, unit: string, decimals: number): string {
  if (unit === 'ريال') {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}م ريال`;
    if (val >= 1_000)     return `${(val / 1_000).toFixed(0)}ألف ريال`;
    return `${val.toFixed(decimals)} ريال`;
  }
  return `${val.toFixed(decimals)}${unit}`;
}

export default function MetricCard({
  label,
  value,
  unit = '%',
  decimals = 1,
  target,
  benchmark,
  previousValue,
  higherIsBetter = true,
  compact = false,
  onClick,
}: MetricCardProps) {
  if (value === null || value === undefined) {
    return (
      <div className={`bg-gray-900/30 rounded-xl border border-gray-800/50 p-4 ${compact ? '' : 'min-h-[160px]'}`}>
        <div className="text-gray-500 text-sm text-right">{label}</div>
        <div className="text-gray-600 text-2xl font-bold text-right mt-2">—</div>
        <div className="text-gray-600 text-xs text-right mt-1">بيانات غير متوفرة</div>
      </div>
    );
  }

  const status = getStatus(value, target, higherIsBetter);
  const statusStyle = STATUS_STYLES[status];
  const benchmarkEval = benchmark ? evaluateMetric(value, benchmark) : null;

  const targetDiff = target ? value - target : null;
  const targetDiffPct = target ? ((value - target) / Math.max(1, Math.abs(target))) * 100 : null;
  const sectorDiff = benchmark ? value - benchmark.avg : null;

  return (
    <div
      className={`rounded-xl border p-4 transition-all cursor-pointer hover:border-blue-700/50 ${statusStyle.bg} ${compact ? '' : 'min-h-[160px]'} ${onClick ? 'hover:scale-[1.01]' : ''}`}
      style={{ borderColor: 'rgba(75,85,99,0.5)' }}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-right flex-1">
          <div className="text-gray-400 text-xs mb-1">{label}</div>
          <div className={`text-2xl font-bold ${statusStyle.text}`}>
            {formatValue(value, unit, decimals)}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-xs">{statusStyle.dot}</span>
          {previousValue !== null && previousValue !== undefined && (
            <TrendArrow current={value} previous={previousValue} higherIsBetter={higherIsBetter} />
          )}
        </div>
      </div>

      {/* المقارنة الثلاثية */}
      {!compact && (
        <div className="space-y-1.5 text-xs">
          {/* vs الهدف */}
          {target !== null && target !== undefined && (
            <div className="flex justify-between items-center">
              <span className={`${targetDiff !== null && ((higherIsBetter && targetDiff >= 0) || (!higherIsBetter && targetDiff <= 0)) ? 'text-green-400' : 'text-red-400'}`}>
                {targetDiff !== null && targetDiff >= 0 ? '+' : ''}{targetDiff?.toFixed(decimals)}{unit}
                {targetDiffPct !== null && ` (${targetDiffPct >= 0 ? '+' : ''}${targetDiffPct.toFixed(1)}%)`}
              </span>
              <span className="text-gray-500">
                الهدف: <span className="text-gray-300">{formatValue(target, unit, decimals)}</span>
              </span>
            </div>
          )}

          {/* vs القطاع */}
          {benchmark && benchmarkEval && (
            <div className="flex justify-between items-center">
              <span className={`${sectorDiff !== null && ((higherIsBetter && sectorDiff >= 0) || (!higherIsBetter && sectorDiff <= 0)) ? 'text-blue-400' : 'text-orange-400'}`}>
                {sectorDiff !== null && sectorDiff >= 0 ? '+' : ''}{sectorDiff?.toFixed(decimals)}{unit}
              </span>
              <span className="text-gray-500">
                القطاع: <span className="text-gray-300">{formatValue(benchmark.avg, unit, decimals)}</span>
                <span className="text-gray-600 mr-1">({benchmarkEval.percentile}th)</span>
              </span>
            </div>
          )}

          {/* نطاق البنشمارك */}
          {benchmark && (
            <div className="flex justify-between text-gray-600">
              <span>↑ {formatValue(benchmark.high, unit, decimals)}</span>
              <div className="flex-1 mx-2 flex items-center">
                <div className="w-full h-1 bg-gray-700 rounded">
                  <div
                    className={`h-1 rounded transition-all ${
                      benchmarkEval?.status === 'excellent' ? 'bg-green-500' :
                      benchmarkEval?.status === 'above_avg' ? 'bg-blue-500' :
                      benchmarkEval?.status === 'below_avg' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${benchmarkEval?.percentile ?? 50}%` }}
                  />
                </div>
              </div>
              <span>↓ {formatValue(benchmark.low, unit, decimals)}</span>
            </div>
          )}

          {/* الحالة */}
          {status !== 'no_target' && (
            <div className={`text-center text-xs ${statusStyle.text} font-medium`}>
              {statusStyle.label}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
