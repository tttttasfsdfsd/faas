/**
 * PricingModal — نافذة الترقية
 *
 * يعرض خطط الاشتراك. الترقية تتم حصراً عبر Stripe Checkout.
 * لا يوجد أي مسار للترقية من المتصفح مباشرة.
 */

import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  isRTL?: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  reports: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}

export default function PricingModal({ onClose, isRTL = true }: Props) {
  const plans: Plan[] = isRTL
    ? [
        {
          id: 'free',
          name: 'مجاني',
          price: '0',
          period: '/شهر',
          reports: '3 تقارير/شهر',
          features: ['تحليل مالي أساسي', 'مؤشرات الربحية والسيولة', 'تقرير PDF'],
          cta: 'الخطة الحالية',
        },
        {
          id: 'pro',
          name: 'احترافي',
          price: '199',
          period: '/شهر',
          reports: '50 تقرير/شهر',
          features: [
            'جميع مميزات المجاني',
            'تحليل بنشمارك القطاع',
            'Beneish M-Score',
            'محاكاة السيناريوهات',
            'التقرير التنفيذي',
            'وضع CFO',
          ],
          cta: 'ابدأ التجربة المجانية',
          highlight: true,
        },
        {
          id: 'enterprise',
          name: 'مؤسسي',
          price: '799',
          period: '/شهر',
          reports: 'غير محدود',
          features: [
            'جميع مميزات الاحترافي',
            'تقارير غير محدودة',
            'API Access',
            'دعم مخصص',
            'تدريب الفريق',
          ],
          cta: 'تواصل معنا',
        },
      ]
    : [
        {
          id: 'free',
          name: 'Free',
          price: '0',
          period: '/month',
          reports: '3 reports/month',
          features: ['Basic financial analysis', 'Profitability & liquidity', 'PDF report'],
          cta: 'Current plan',
        },
        {
          id: 'pro',
          name: 'Professional',
          price: '199',
          period: '/month',
          reports: '50 reports/month',
          features: ['All Free features', 'Sector benchmarking', 'Beneish M-Score', 'Scenario analysis', 'Executive report', 'CFO mode'],
          cta: 'Start free trial',
          highlight: true,
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          price: '799',
          period: '/month',
          reports: 'Unlimited',
          features: ['All Pro features', 'Unlimited reports', 'API Access', 'Dedicated support', 'Team training'],
          cta: 'Contact us',
        },
      ];

  async function handleUpgrade(planId: string) {
    if (planId === 'free') return;
    if (planId === 'enterprise') {
      window.open('mailto:sales@eexa.ai', '_blank');
      return;
    }

    // Redirect to Stripe Checkout — الترقية على الخادم فقط
    try {
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#0D1117] border border-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white font-bold text-2xl">
              {isRTL ? 'رقّ خطتك' : 'Upgrade Your Plan'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isRTL ? 'وصلت للحد الأقصى من التقارير المجانية' : 'You\'ve reached your free report limit'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-2xl p-5 border ${
                plan.highlight
                  ? 'border-blue-500 bg-blue-900/20'
                  : 'border-gray-800 bg-gray-900/20'
              }`}
            >
              {plan.highlight && (
                <div className="text-xs text-blue-400 font-bold mb-2 uppercase tracking-wider">
                  {isRTL ? '⭐ الأكثر شيوعاً' : '⭐ Most Popular'}
                </div>
              )}

              <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400 text-sm">
                  {isRTL ? 'ريال' : 'SAR'}{plan.period}
                </span>
              </div>
              <p className="text-blue-400 text-sm mb-4">{plan.reports}</p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-300 text-sm">
                    <span className="text-green-400 text-xs">✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={plan.id === 'free'}
                className={`w-full py-2.5 rounded-xl font-medium text-sm transition-all ${
                  plan.id === 'free'
                    ? 'bg-gray-800 text-gray-500 cursor-default'
                    : plan.highlight
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500'
                      : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
