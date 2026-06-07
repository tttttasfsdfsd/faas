/**
 * BeneishMPanel — تحليل Beneish M-Score
 * 
 * ⚠️ لا يُحسب عند وجود فترة واحدة فقط — يعرض تحذيراً واضحاً بدلاً من رقم خاطئ
 */

import type { BeneishMScore } from '@/lib/financialEngine';

interface Props {
  beneishM: BeneishMScore;
  periodsCount: number; // عدد الفترات المتوفرة
  isRTL?: boolean;
}

export default function BeneishMPanel({ beneishM, periodsCount, isRTL = true }: Props) {
  // ⚠️ تحذير واضح عند فترة واحدة فقط
  if (periodsCount < 2) {
    return (
      <div className="bg-[#0D1117] rounded-2xl border border-yellow-800/50 p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="text-yellow-400 font-bold text-lg mb-2" dir={isRTL ? 'rtl' : 'ltr'}>
              Beneish M-Score — يتطلب فترتين
            </h3>
            <p className="text-gray-400 text-sm" dir={isRTL ? 'rtl' : 'ltr'}>
              {isRTL
                ? 'تحليل Beneish M-Score يقارن بين فترتين ماليتين متتاليتين لرصد التغيرات غير الطبيعية. ارفع بيانات فترتين على الأقل لتفعيل هذا التحليل.'
                : 'Beneish M-Score requires two consecutive periods to compare. Upload at least two periods of data to enable this analysis.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { mScore, isManipulator, components } = beneishM;
  const riskLevel = isManipulator ? 'high' : mScore > -2.5 ? 'moderate' : 'low';

  const riskConfig = {
    high:     { color: 'text-red-400',    bg: 'bg-red-900/20',    border: 'border-red-800',    label: 'خطر مرتفع — احتمال تلاعب محاسبي', icon: '🔴' },
    moderate: { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-800', label: 'خطر متوسط — يستوجب المراجعة',       icon: '🟡' },
    low:      { color: 'text-green-400',  bg: 'bg-green-900/20',  border: 'border-green-800',  label: 'خطر منخفض — لا مؤشرات تلاعب',      icon: '🟢' },
  };

  const cfg = riskConfig[riskLevel];

  const componentDescriptions: Record<keyof typeof components, string> = {
    dsri: 'مؤشر نسبة المبيعات-المدينين (DSRI)',
    gmi:  'مؤشر هامش الربح الإجمالي (GMI)',
    aqi:  'مؤشر جودة الأصول (AQI)',
    sgi:  'مؤشر نمو المبيعات (SGI)',
    depi: 'مؤشر الإهلاك (DEPI)',
    sgai: 'مؤشر نفقات البيع والإدارة (SGAI)',
    lvgi: 'مؤشر الرافعة المالية (LVGI)',
    tata: 'إجمالي المستحقات إلى الأصول (TATA)',
  };

  return (
    <div className={`bg-[#0D1117] rounded-2xl border ${cfg.border} p-6 ${cfg.bg}`}>
      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2" dir={isRTL ? 'rtl' : 'ltr'}>
        {cfg.icon} Beneish M-Score — كشف التلاعب المحاسبي
      </h3>

      {/* النتيجة الرئيسية */}
      <div className="flex items-center justify-between mb-6 p-4 rounded-xl bg-black/30">
        <div dir={isRTL ? 'rtl' : 'ltr'}>
          <div className={`text-4xl font-bold font-mono ${cfg.color}`}>
            {mScore.toFixed(2)}
          </div>
          <div className="text-gray-400 text-sm mt-1">M-Score</div>
        </div>
        <div className={`text-right ${cfg.color}`} dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="text-xl font-bold">{cfg.icon} {cfg.label}</div>
          <div className="text-sm text-gray-400 mt-1">
            {isRTL ? 'الحد الفاصل: -2.22' : 'Threshold: -2.22'} | {mScore > -2.22 ? '> Threshold ⚠️' : '< Threshold ✓'}
          </div>
        </div>
      </div>

      {/* مكونات النموذج */}
      <div className="space-y-2">
        <h4 className="text-gray-400 text-sm font-medium mb-3" dir={isRTL ? 'rtl' : 'ltr'}>
          مكونات النموذج:
        </h4>
        {(Object.entries(components) as [keyof typeof components, number][]).map(([key, val]) => {
          const warning = (key === 'dsri' && val > 1.465) || (key === 'gmi' && val > 1.193) || (key === 'tata' && Math.abs(val) > 0.031);
          return (
            <div
              key={key}
              className={`flex items-center justify-between p-2.5 rounded-lg ${warning ? 'bg-yellow-900/15 border border-yellow-800/30' : 'bg-gray-900/30'}`}
            >
              <span className="text-gray-400 text-xs" dir={isRTL ? 'rtl' : 'ltr'}>
                {componentDescriptions[key]}
                {warning && <span className="text-yellow-400 mr-2">⚠</span>}
              </span>
              <span className={`font-mono text-sm ${warning ? 'text-yellow-400' : 'text-gray-300'}`}>
                {val.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* تفسير */}
      <div className="mt-4 p-3 rounded-lg bg-black/20 text-xs text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
        {isRTL
          ? `نموذج Beneish المكوّن من 8 متغيرات. القيمة فوق -2.22 تشير لاحتمال تلاعب محاسبي. هذا التحليل يقيس الاحتمالية فقط ولا يُعدّ دليلاً قاطعاً.`
          : 'Beneish 8-factor model. Score above -2.22 indicates possible earnings manipulation. This is a probabilistic indicator, not conclusive evidence.'}
      </div>
    </div>
  );
}
