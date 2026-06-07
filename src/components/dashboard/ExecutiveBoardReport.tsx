/**
 * ExecutiveBoardReport — التقرير التنفيذي لمجلس الإدارة
 * 
 * يُولَّد بضغطة زر واحدة ويجيب على 9 أسئلة بعربية بسيطة وبأرقام صريحة.
 * كل إجابة يولّدها Claude مبنية حصراً على الأرقام المحسوبة.
 */

import { useState, useRef } from 'react';
import { trpc } from '@/providers/trpc';
import type { ComprehensiveFinancials } from '@/lib/financialEngine';

interface Props {
  financials: ComprehensiveFinancials;
  companyName: string;
  sector?: string;
  targets?: Record<string, number | null>;
  isRTL?: boolean;
}

interface ReportSection {
  question: string;
  answer: string;
  type: 'growth' | 'profitability' | 'liquidity' | 'debt' | 'cashflow' | 'goals' | 'risks' | 'opportunities' | 'recommendations';
  icon: string;
}

function buildReportPrompt(
  financials: ComprehensiveFinancials,
  companyName: string,
  sector?: string,
  targets?: Record<string, number | null>
): string {
  const f = financials;
  const prof = f.profitability;
  const liq = f.liquidity;
  const sol = f.solvency;
  const cf = f.cashFlow;
  const score = f.score;

  const targetsStr = targets ? Object.entries(targets)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ') : 'لا توجد أهداف محددة';

  return `أنت مستشار مالي خبير. اكتب تقريراً تنفيذياً موجزاً لصاحب القرار عن شركة "${companyName}" (قطاع: ${sector || 'غير محدد'}).

## البيانات المالية الفعلية المحسوبة:
- التقييم الشامل: ${score.overall}/100
- الإيرادات: ${f.totalRevenue.toLocaleString()} ريال
- صافي الربح: ${f.netProfit.toLocaleString()} ريال
- نمو الإيرادات: ${f.revenueGrowth?.toFixed(1) ?? 'N/A'}%
- هامش الربح الإجمالي: ${prof.grossMargin.toFixed(1)}%
- هامش EBITDA: ${prof.ebitdaMargin.toFixed(1)}%
- هامش الربح الصافي: ${prof.netMargin.toFixed(1)}%
- ROE: ${prof.roe.toFixed(1)}%
- ROA: ${prof.roa.toFixed(1)}%
- ROIC: ${prof.roic.toFixed(1)}%
- نسبة التداول: ${liq.currentRatio.toFixed(2)}x
- نسبة السيولة السريعة: ${liq.quickRatio.toFixed(2)}x
- رأس المال العامل: ${liq.workingCapital.toLocaleString()} ريال
- نسبة الدين: ${(sol.debtRatio * 100).toFixed(1)}%
- الدين إلى حقوق الملكية: ${sol.debtToEquity.toFixed(2)}x
- تغطية الفوائد: ${sol.interestCoverage.toFixed(1)}x
- التدفق التشغيلي: ${cf.ocf.toLocaleString()} ريال
- التدفق الحر: ${cf.freeCashFlow.toLocaleString()} ريال
- النقد: ${f.cash.toLocaleString()} ريال
- أشهر البقاء النقدي: ${cf.monthsRunway?.toFixed(1) ?? 'N/A'} أشهر

## الأهداف المدخلة من المستخدم:
${targetsStr}

## المطلوب منك — أجب على الأسئلة التسعة التالية بعربية بسيطة جداً وبأرقام صريحة من البيانات أعلاه. لا تكتب جملة بدون رقم يدعمها. كل إجابة من سطر إلى ثلاثة أسطر فقط.

أجب بصيغة JSON التالية فقط (لا مقدمات، لا markdown خارج JSON):
{
  "growth": "هل الشركة تنمو — اذكر نسبة النمو الفعلية",
  "profitability": "هل الربحية جيدة — اذكر الهامش الفعلي ومقارنته بالهدف",
  "liquidity": "هل السيولة آمنة — اذكر نسبة التداول الفعلية",
  "debt": "هل الديون خطرة — اذكر نسبة الدين الفعلية",
  "cashflow": "هل التدفقات النقدية صحية — اذكر أشهر البقاء الفعلية",
  "goals": "هل نحقق أهدافنا — اذكر نسبة التحقق لكل هدف",
  "risks": "أهم 3 مخاطر مع الرقم الذي يدل على كل خطر",
  "opportunities": "أهم 3 فرص مع الرقم الذي يدعمها",
  "recommendations": "أهم 5 توصيات مرتبة بالأولوية مع الأرقام"
}`;
}

export default function ExecutiveBoardReport({ financials, companyName, sector, targets, isRTL = true }: Props) {
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const chatMutation = trpc.chat.send.useMutation();

  const QUESTIONS: { key: keyof Omit<ReportSection, 'answer' | 'type' | 'icon'>; icon: string; label: string; type: ReportSection['type'] }[] = [
    { key: 'question', icon: '📈', label: 'هل الشركة تنمو؟', type: 'growth' },
    { key: 'question', icon: '💰', label: 'هل الربحية جيدة؟', type: 'profitability' },
    { key: 'question', icon: '💧', label: 'هل السيولة آمنة؟', type: 'liquidity' },
    { key: 'question', icon: '🏦', label: 'هل الديون خطرة؟', type: 'debt' },
    { key: 'question', icon: '💵', label: 'هل التدفقات النقدية صحية؟', type: 'cashflow' },
    { key: 'question', icon: '🎯', label: 'هل نحقق أهدافنا؟', type: 'goals' },
    { key: 'question', icon: '⚠️', label: 'أهم 3 مخاطر', type: 'risks' },
    { key: 'question', icon: '🚀', label: 'أهم 3 فرص', type: 'opportunities' },
    { key: 'question', icon: '✅', label: 'أهم 5 توصيات', type: 'recommendations' },
  ];

  async function generateReport() {
    setLoading(true);
    setError(null);
    setSections([]);

    try {
      const prompt = buildReportPrompt(financials, companyName, sector, targets);
      const result = await chatMutation.mutateAsync({
        message: prompt,
        companyName,
        language: 'ar',
      });

      if (!result.success) {
        setError('فشل توليد التقرير. يرجى المحاولة مجدداً.');
        return;
      }

      // Parse JSON response
      let parsed: Record<string, string>;
      try {
        const cleaned = result.reply.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        setError('خطأ في قراءة استجابة النظام. يرجى المحاولة مجدداً.');
        return;
      }

      const typeMap: Record<string, { icon: string; label: string; type: ReportSection['type'] }> = {
        growth:          { icon: '📈', label: 'هل الشركة تنمو؟', type: 'growth' },
        profitability:   { icon: '💰', label: 'هل الربحية جيدة؟', type: 'profitability' },
        liquidity:       { icon: '💧', label: 'هل السيولة آمنة؟', type: 'liquidity' },
        debt:            { icon: '🏦', label: 'هل الديون خطرة؟', type: 'debt' },
        cashflow:        { icon: '💵', label: 'هل التدفقات النقدية صحية؟', type: 'cashflow' },
        goals:           { icon: '🎯', label: 'هل نحقق أهدافنا؟', type: 'goals' },
        risks:           { icon: '⚠️', label: 'أهم 3 مخاطر', type: 'risks' },
        opportunities:   { icon: '🚀', label: 'أهم 3 فرص', type: 'opportunities' },
        recommendations: { icon: '✅', label: 'أهم 5 توصيات', type: 'recommendations' },
      };

      const result_sections: ReportSection[] = Object.entries(parsed)
        .filter(([k]) => typeMap[k])
        .map(([k, answer]) => ({
          question: typeMap[k].label,
          answer: String(answer),
          type: typeMap[k].type,
          icon: typeMap[k].icon,
        }));

      setSections(result_sections);
      setGenerated(true);
    } catch {
      setError('خطأ في الاتصال بالخادم. يرجى المحاولة مجدداً.');
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    // PDF export via window.print with print styles
    window.print();
  }

  const sectionColors: Record<ReportSection['type'], string> = {
    growth:          'border-blue-800 bg-blue-900/10',
    profitability:   'border-green-800 bg-green-900/10',
    liquidity:       'border-cyan-800 bg-cyan-900/10',
    debt:            'border-orange-800 bg-orange-900/10',
    cashflow:        'border-emerald-800 bg-emerald-900/10',
    goals:           'border-purple-800 bg-purple-900/10',
    risks:           'border-red-800 bg-red-900/10',
    opportunities:   'border-yellow-800 bg-yellow-900/10',
    recommendations: 'border-indigo-800 bg-indigo-900/10',
  };

  return (
    <div className="bg-[#0D1117] rounded-2xl border border-gray-800 p-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white font-bold text-xl flex items-center gap-2">
            📋 التقرير التنفيذي
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            موجّه لصاحب القرار — بعربية بسيطة وأرقام صريحة
          </p>
        </div>
        <div className="flex gap-3">
          {generated && (
            <button
              onClick={exportPDF}
              className="px-4 py-2 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl hover:border-gray-500 transition-all text-sm flex items-center gap-2"
            >
              <span>⬇️</span> تصدير PDF
            </button>
          )}
          <button
            onClick={generateReport}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all text-sm flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span> جارٍ التوليد...
              </>
            ) : (
              <>
                <span>✨</span> {generated ? 'تحديث التقرير' : 'توليد التقرير'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-gray-900/30 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-700 rounded w-1/3 mb-3"></div>
              <div className="h-3 bg-gray-800 rounded w-full mb-2"></div>
              <div className="h-3 bg-gray-800 rounded w-4/5"></div>
            </div>
          ))}
        </div>
      )}

      {/* Report Content */}
      {!loading && generated && sections.length > 0 && (
        <div ref={reportRef} className="space-y-4">
          {/* Executive Summary Header */}
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-white font-bold text-lg">{companyName}</h3>
                <p className="text-gray-400 text-sm">
                  {sector && <span className="text-blue-400 ml-2">القطاع: {sector}</span>}
                  <span>{new Date().toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </p>
              </div>
              <div className="text-center">
                <div className={`text-4xl font-bold ${
                  financials.score.overall >= 70 ? 'text-green-400' :
                  financials.score.overall >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>{financials.score.overall}</div>
                <div className="text-gray-400 text-xs">/ 100</div>
              </div>
            </div>
          </div>

          {/* Sections */}
          {sections.map((section) => (
            <div
              key={section.type}
              className={`rounded-xl border p-4 ${sectionColors[section.type]}`}
            >
              <h4 className="text-white font-bold text-base mb-2 flex items-center gap-2">
                <span>{section.icon}</span>
                {section.question}
              </h4>
              <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-line">
                {section.answer}
              </p>
            </div>
          ))}

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 pt-4 border-t border-gray-800">
            تم توليد هذا التقرير من بيانات محسوبة رياضياً — جميع الأرقام من القوائم المالية الفعلية
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !generated && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-gray-400 text-sm max-w-md">
            اضغط "توليد التقرير" للحصول على تحليل شامل يجيب على أهم 9 أسئلة مالية بعربية بسيطة وأرقام صريحة من البيانات الفعلية.
          </p>
        </div>
      )}
    </div>
  );
}
