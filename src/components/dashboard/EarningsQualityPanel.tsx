/**
 * EarningsQualityPanel — جودة الأرباح بخمسة مستويات
 * 
 * يعرض المقارنة بين صافي الربح والتدفق التشغيلي.
 * التقييم النهائي من 5 مستويات: ممتاز / جيد / متوسط / ضعيف / سيئ
 */

import type { EarningsQuality, CashFlowAnalysis } from '@/lib/financialEngine';

interface Props {
  earningsQuality: EarningsQuality;
  cashFlow: CashFlowAnalysis;
  netProfit: number;
  isRTL?: boolean;
}

// المستويات الخمسة بالعربية مع التفسيرات
function getQualityLevel(score: number): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: string;
  explanation: string;
} {
  if (score >= 80) return {
    label: 'ممتاز',
    color: 'text-green-400',
    bg: 'bg-green-900/20',
    border: 'border-green-800',
    icon: '🏆',
    explanation: 'أرباح الشركة مدعومة بتدفقات نقدية قوية — الأرقام المحاسبية تعكس نقداً فعلياً في يد الشركة.',
  };
  if (score >= 60) return {
    label: 'جيد',
    color: 'text-blue-400',
    bg: 'bg-blue-900/20',
    border: 'border-blue-800',
    icon: '✅',
    explanation: 'جودة الأرباح جيدة — معظم الأرباح المُبلَّغ عنها تتحول لنقد فعلي مع فجوة بسيطة.',
  };
  if (score >= 40) return {
    label: 'متوسط',
    color: 'text-yellow-400',
    bg: 'bg-yellow-900/20',
    border: 'border-yellow-800',
    icon: '⚠️',
    explanation: 'هناك فجوة ملحوظة بين الأرباح المحاسبية والنقد المحصَّل — تأكد من دورة التحصيل وبنود الاستحقاق.',
  };
  if (score >= 20) return {
    label: 'ضعيف',
    color: 'text-orange-400',
    bg: 'bg-orange-900/20',
    border: 'border-orange-800',
    icon: '⚡',
    explanation: 'معظم الأرباح المُبلَّغ عنها محاسبية وليست نقدية — يحتاج هيكل التحصيل والمصروفات لمراجعة جدية.',
  };
  return {
    label: 'سيئ',
    color: 'text-red-400',
    bg: 'bg-red-900/20',
    border: 'border-red-800',
    icon: '🚨',
    explanation: 'الفجوة الكبيرة بين الأرباح والتدفق النقدي قد تشير لتحديات جدية في التحصيل أو بنود محاسبية غير نقدية مرتفعة.',
  };
}

function fmtNum(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}م`;
  if (abs >= 1_000)     return `${(n / 1_000).toFixed(0)}ك`;
  return n.toFixed(0);
}

export default function EarningsQualityPanel({ earningsQuality, cashFlow, netProfit, isRTL = true }: Props) {
  const { accrualsRatio, cashToEarningsRatio, sustainabilityScore } = earningsQuality;
  const { ocf, freeCashFlow } = cashFlow;
  
  const level = getQualityLevel(sustainabilityScore);

  // OCF Ratio
  const ocfRatio = netProfit !== 0 ? ocf / Math.abs(netProfit) : 0;
  // Accrual Ratio
  const accrualRatio = accrualsRatio;
  // Cash Conversion Ratio
  const ccratio = netProfit !== 0 ? freeCashFlow / Math.abs(netProfit) : 0;
  // Cash Earnings Ratio
  const cashEarningsRatio = cashToEarningsRatio;

  const metrics = [
    {
      label: 'نسبة التدفق النقدي التشغيلي (OCF Ratio)',
      value: ocfRatio,
      format: (v: number) => v.toFixed(2) + 'x',
      good: (v: number) => v >= 1.0,
      description: 'التدفق التشغيلي ÷ صافي الربح — فوق 1.0 يعني التدفق أكبر من الربح المحاسبي',
    },
    {
      label: 'نسبة الاستحقاقات (Accrual Ratio)',
      value: accrualRatio,
      format: (v: number) => (v * 100).toFixed(1) + '%',
      good: (v: number) => Math.abs(v) < 0.05,
      description: '(صافي الربح - التدفق التشغيلي) ÷ إجمالي الأصول — كلما اقترب من صفر كان أفضل',
    },
    {
      label: 'نسبة تحويل النقد (Cash Conversion Ratio)',
      value: ccratio,
      format: (v: number) => v.toFixed(2) + 'x',
      good: (v: number) => v >= 0.8,
      description: 'التدفق الحر ÷ صافي الربح — يقيس قدرة الشركة على تحويل الأرباح لنقد',
    },
    {
      label: 'نسبة الأرباح النقدية (Cash Earnings Ratio)',
      value: cashEarningsRatio,
      format: (v: number) => v.toFixed(2) + 'x',
      good: (v: number) => v >= 0.8,
      description: 'التدفق التشغيلي ÷ |صافي الربح| — النسبة المثالية فوق 1.0',
    },
  ];

  return (
    <div className={`bg-[#0D1117] rounded-2xl border ${level.border} p-6 ${level.bg}`}>
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
        💎 جودة الأرباح (Earnings Quality)
      </h3>

      {/* التقييم الرئيسي */}
      <div className="flex items-center justify-between p-5 rounded-xl bg-black/30 mb-6">
        <div className="text-right" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`text-5xl font-bold ${level.color}`}>{level.icon}</div>
          <div className={`text-2xl font-bold mt-1 ${level.color}`}>{level.label}</div>
          <div className={`text-sm ${level.color} mt-0.5`}>{sustainabilityScore}/100</div>
        </div>
        <div className="flex-1 mx-6" dir={isRTL ? 'rtl' : 'ltr'}>
          <p className="text-gray-300 text-sm leading-relaxed">{level.explanation}</p>
        </div>
      </div>

      {/* مقارنة الربح بالتدفق */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/20 rounded-xl p-4 text-center">
          <div className="text-gray-400 text-xs mb-1">صافي الربح</div>
          <div className="text-white text-xl font-bold font-mono">{fmtNum(netProfit)} ريال</div>
        </div>
        <div className="bg-black/20 rounded-xl p-4 text-center">
          <div className="text-gray-400 text-xs mb-1">التدفق التشغيلي</div>
          <div className={`text-xl font-bold font-mono ${ocf >= netProfit ? 'text-green-400' : 'text-orange-400'}`}>
            {fmtNum(ocf)} ريال
          </div>
        </div>
      </div>

      {/* المؤشرات الأربعة */}
      <div className="space-y-3">
        {metrics.map(m => {
          const isGood = m.good(m.value);
          return (
            <div key={m.label} className={`p-3 rounded-lg ${isGood ? 'bg-green-900/10 border border-green-800/30' : 'bg-red-900/10 border border-red-800/30'}`}>
              <div className="flex justify-between items-center mb-1">
                <span className={`font-mono font-bold ${isGood ? 'text-green-400' : 'text-red-400'}`}>
                  {m.format(m.value)}
                </span>
                <span className="text-gray-300 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>{m.label}</span>
              </div>
              <p className="text-gray-500 text-xs text-right" dir={isRTL ? 'rtl' : 'ltr'}>{m.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
