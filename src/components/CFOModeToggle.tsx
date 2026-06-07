/**
 * CFOModeToggle — زر تبديل وضع CFO
 * 
 * يُفعَّل بـ toggle واضح في أعلى الصفحة.
 * يحفظ الاختيار في قاعدة البيانات عبر الخادم.
 * يطبق على جميع صفحات المنصة.
 */

import { useState } from 'react';

interface Props {
  cfoMode: boolean;
  onToggle: (newMode: boolean) => void;
  authToken?: string;
  isRTL?: boolean;
}

export default function CFOModeToggle({ cfoMode, onToggle, authToken, isRTL = true }: Props) {
  const [saving, setSaving] = useState(false);

  async function handleToggle() {
    const newMode = !cfoMode;
    onToggle(newMode); // optimistic update

    // حفظ في الخادم
    if (authToken) {
      setSaving(true);
      try {
        await fetch('/api/user/cfo-mode', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
          body: JSON.stringify({ cfoMode: newMode }),
        });
      } catch {
        // silent fail — الـ state محفوظ في الذاكرة
      } finally {
        setSaving(false);
      }
    }
  }

  return (
    <div className="flex items-center gap-3" dir={isRTL ? 'rtl' : 'ltr'}>
      <span className="text-gray-400 text-sm">{isRTL ? 'وضع CFO' : 'CFO Mode'}</span>

      <button
        onClick={handleToggle}
        disabled={saving}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          cfoMode ? 'bg-blue-600' : 'bg-gray-600'
        } ${saving ? 'opacity-50' : ''}`}
        aria-label={cfoMode ? 'تعطيل وضع CFO' : 'تفعيل وضع CFO'}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
            cfoMode ? (isRTL ? 'translate-x-1' : 'translate-x-6') : (isRTL ? 'translate-x-6' : 'translate-x-1')
          }`}
        />
      </button>

      {cfoMode && (
        <span className="text-blue-400 text-xs font-medium px-2 py-0.5 bg-blue-900/30 rounded-full">
          {isRTL ? 'وضع تنفيذي' : 'Executive View'}
        </span>
      )}
    </div>
  );
}

/**
 * CFO_SECTIONS — الأقسام المعروضة في وضع CFO فقط
 * 
 * وضع CFO يعرض فقط:
 * - KPIs الرئيسية
 * - Variance Analysis
 * - Trend Analysis
 * - Benchmarking
 * - التوقعات والأهداف
 * - الملخص التنفيذي
 */
export const CFO_SECTIONS = [
  'kpis',
  'variance',
  'trend',
  'benchmarking',
  'forecasts',
  'goals',
  'executive_summary',
] as const;

export type CFOSection = typeof CFO_SECTIONS[number];

/**
 * shouldShow — تحديد ما إذا كان يجب عرض قسم في الوضع الحالي
 */
export function shouldShow(section: string, cfoMode: boolean): boolean {
  if (!cfoMode) return true; // الوضع العادي: يعرض كل شيء
  return CFO_SECTIONS.includes(section as CFOSection);
}
