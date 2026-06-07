/**
 * TargetsPage — صفحة الأهداف المالية
 * 
 * الأهداف مرتبطة بالشركة وليس بالتقرير.
 * تبقى لجميع التقارير القادمة لنفس الشركة.
 * المستخدم يصلها من القائمة الرئيسية قبل التحليل أو بعده.
 */

import { useState, useEffect } from 'react';
import { Target, Save, CheckCircle, TrendingUp } from 'lucide-react';
import { getSessionToken } from '@/lib/authStore';

interface FinancialTargets {
  // نمو
  revenueGrowthTarget: number | '';
  // ربحية
  roeTarget: number | '';
  roaTarget: number | '';
  roicTarget: number | '';
  grossMarginTarget: number | '';
  netMarginTarget: number | '';
  ebitdaMarginTarget: number | '';
  // سيولة
  currentRatioTarget: number | '';
  // ملاءة
  debtRatioTarget: number | '';
  // تدفق نقدي
  cashTarget: number | '';
  operatingCashFlowTarget: number | '';
}

const TARGET_FIELDS: Array<{
  key: keyof FinancialTargets;
  label: string;
  unit: string;
  description: string;
  placeholder: string;
}> = [
  { key: 'revenueGrowthTarget',     label: 'نمو الإيراد المستهدف',           unit: '%',    description: 'نسبة نمو الإيرادات المستهدفة سنوياً', placeholder: 'مثال: 15' },
  { key: 'grossMarginTarget',        label: 'هامش الربح الإجمالي المستهدف',   unit: '%',    description: 'الربح الإجمالي ÷ الإيرادات', placeholder: 'مثال: 40' },
  { key: 'ebitdaMarginTarget',       label: 'هامش EBITDA المستهدف',           unit: '%',    description: 'EBITDA ÷ الإيرادات', placeholder: 'مثال: 20' },
  { key: 'netMarginTarget',          label: 'هامش الربح الصافي المستهدف',     unit: '%',    description: 'صافي الربح ÷ الإيرادات', placeholder: 'مثال: 10' },
  { key: 'roeTarget',                label: 'العائد على حقوق الملكية (ROE)',   unit: '%',    description: 'صافي الربح ÷ حقوق الملكية', placeholder: 'مثال: 20' },
  { key: 'roaTarget',                label: 'العائد على الأصول (ROA)',         unit: '%',    description: 'صافي الربح ÷ إجمالي الأصول', placeholder: 'مثال: 8' },
  { key: 'roicTarget',               label: 'العائد على رأس المال المستثمر',  unit: '%',    description: 'NOPAT ÷ رأس المال المستثمر', placeholder: 'مثال: 12' },
  { key: 'currentRatioTarget',       label: 'نسبة التداول المستهدفة',         unit: 'x',    description: 'الأصول المتداولة ÷ الخصوم المتداولة', placeholder: 'مثال: 2.0' },
  { key: 'debtRatioTarget',          label: 'نسبة الدين المستهدفة',           unit: '%',    description: 'إجمالي الديون ÷ إجمالي الأصول', placeholder: 'مثال: 40' },
  { key: 'cashTarget',               label: 'الرصيد النقدي المستهدف',         unit: 'ريال', description: 'الرصيد النقدي المستهدف في نهاية الفترة', placeholder: 'مثال: 500000' },
  { key: 'operatingCashFlowTarget',  label: 'التدفق التشغيلي المستهدف',      unit: 'ريال', description: 'التدفق النقدي من العمليات التشغيلية', placeholder: 'مثال: 200000' },
];

interface Props {
  companyId?: string;
  companyName?: string;
  onClose?: () => void;
  onSave?: (targets: FinancialTargets) => void;
}

export default function TargetsPage({ companyId, companyName, onClose, onSave }: Props) {
  const [targets, setTargets] = useState<FinancialTargets>({
    revenueGrowthTarget: '',
    roeTarget: '',
    roaTarget: '',
    roicTarget: '',
    grossMarginTarget: '',
    netMarginTarget: '',
    ebitdaMarginTarget: '',
    currentRatioTarget: '',
    debtRatioTarget: '',
    cashTarget: '',
    operatingCashFlowTarget: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // تحميل الأهداف المحفوظة
  useEffect(() => {
    if (!companyId) { setLoading(false); return; }
    
    const token = getSessionToken();
    if (!token) { setLoading(false); return; }

    fetch(`/api/targets/${companyId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.targets) {
          setTargets(prev => ({ ...prev, ...data.targets }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const token = getSessionToken();
    
    if (token && companyId) {
      try {
        await fetch(`/api/targets/${companyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(targets),
        });
      } catch { /* سيعمل بشكل محلي */ }
    }

    onSave?.(targets);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">جاري تحميل الأهداف...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080C14] p-6" dir="rtl">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Target className="w-7 h-7 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">الأهداف المالية</h1>
              {companyName && (
                <p className="text-gray-400 text-sm mt-0.5">{companyName}</p>
              )}
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors text-sm">
              ← رجوع
            </button>
          )}
        </div>

        <div className="bg-[#0D1117] rounded-2xl border border-gray-800 p-3 mb-6 text-sm text-gray-400">
          <p className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400 flex-shrink-0" />
            الأهداف مرتبطة بالشركة وليس بالتقرير — ستُطبَّق تلقائياً على جميع التقارير القادمة لنفس الشركة. اتركها فارغة إذا لم تكن لديك هدف محدد.
          </p>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {TARGET_FIELDS.map(field => (
            <div key={field.key} className="bg-[#0D1117] rounded-xl border border-gray-800 p-5">
              <label className="block text-white font-medium text-sm mb-1">
                {field.label}
              </label>
              <p className="text-gray-500 text-xs mb-3">{field.description}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={field.placeholder}
                  value={targets[field.key] === '' ? '' : targets[field.key]}
                  onChange={e => setTargets(prev => ({
                    ...prev,
                    [field.key]: e.target.value === '' ? '' : parseFloat(e.target.value),
                  }))}
                  className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-right focus:outline-none focus:border-blue-500 transition-colors"
                  dir="rtl"
                />
                <span className="text-gray-400 text-sm min-w-[40px] text-right">
                  {field.unit}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <div className="flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-bold text-base transition-all ${
              saved
                ? 'bg-green-600 text-white'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg hover:shadow-blue-500/25'
            } ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {saved ? (
              <>
                <CheckCircle className="w-5 h-5" />
                تم حفظ الأهداف ✓
              </>
            ) : saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                حفظ الأهداف
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export type { FinancialTargets };
