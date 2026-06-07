/**
 * ExtractionConfirmModal — شاشة تأكيد الاستخراج الإلزامية
 * 
 * تظهر بعد استخراج البيانات وقبل التحليل بلا استثناء.
 * لا يبدأ التحليل إلا بعد ضغط "تأكيد وتحليل".
 * 
 * ترميز الثقة:
 * ≥ 90% → أخضر (تمر تلقائياً)
 * 70-89% → أصفر (تُعرض للتأكيد)
 * < 70%  → أحمر (تطلب تصحيحاً إلزامياً)
 * غائبة → خانة إدخال فارغة اختيارية
 */

import { useState } from 'react';
import type { FieldMapping } from '@/lib/semanticMapping';

interface ExtractedField {
  originalColumn: string;
  standardField: string;
  standardFieldLabel: string;
  value: number | null;
  confidence: number; // 0-100
  source: 'claude' | 'pattern' | 'memory';
}

interface MissingField {
  standardField: string;
  standardFieldLabel: string;
}

interface Props {
  extractedFields: ExtractedField[];
  missingFields: MissingField[];
  companyName: string;
  onConfirm: (confirmedData: Record<string, number | null>, corrections: Array<{ originalColumn: string; standardField: string }>) => void;
  onCancel: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  revenue: 'الإيرادات',
  cogs: 'تكلفة المبيعات',
  grossProfit: 'إجمالي الربح',
  operatingExpenses: 'المصروفات التشغيلية',
  ebitda: 'EBITDA',
  ebit: 'EBIT / الربح التشغيلي',
  interestExpense: 'مصروفات الفوائد',
  tax: 'الضريبة',
  netIncome: 'صافي الربح',
  totalAssets: 'إجمالي الأصول',
  currentAssets: 'الأصول المتداولة',
  fixedAssets: 'الأصول الثابتة',
  inventory: 'المخزون',
  accountsReceivable: 'المدينون',
  cash: 'النقد',
  totalLiabilities: 'إجمالي الخصوم',
  currentLiabilities: 'الخصوم المتداولة',
  longTermDebt: 'الديون طويلة الأجل',
  accountsPayable: 'الدائنون',
  totalEquity: 'حقوق الملكية',
  retainedEarnings: 'الأرباح المحتجزة',
  operatingCashFlow: 'التدفق التشغيلي',
  investingCashFlow: 'التدفق الاستثماري',
  financingCashFlow: 'التدفق التمويلي',
  capex: 'الإنفاق الرأسمالي',
  depreciation: 'الإهلاك',
};

function confidenceBadge(confidence: number) {
  if (confidence >= 90) return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-800', label: `${confidence}% ✓` };
  if (confidence >= 70) return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-800', label: `${confidence}% ⚠` };
  return { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-800', label: `${confidence}% ✗` };
}

export default function ExtractionConfirmModal({ extractedFields, missingFields, companyName, onConfirm, onCancel }: Props) {
  const [editedValues, setEditedValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const f of extractedFields) {
      initial[f.standardField] = f.value !== null ? String(f.value) : '';
    }
    return initial;
  });

  const [missingValues, setMissingValues] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Array<{ originalColumn: string; standardField: string }>>([]);

  // التحقق: الحقول الحمراء (<70%) مطلوب تصحيحها
  const hasBlockingErrors = extractedFields.some(f => f.confidence < 70 && !editedValues[f.standardField]);

  function handleConfirm() {
    if (hasBlockingErrors) return;

    const confirmedData: Record<string, number | null> = {};

    for (const f of extractedFields) {
      const val = editedValues[f.standardField];
      confirmedData[f.standardField] = val ? parseFloat(val.replace(/,/g, '')) || null : null;
    }

    for (const f of missingFields) {
      const val = missingValues[f.standardField];
      if (val) confirmedData[f.standardField] = parseFloat(val.replace(/,/g, '')) || null;
    }

    onConfirm(confirmedData, corrections);
  }

  const highConf = extractedFields.filter(f => f.confidence >= 90);
  const medConf = extractedFields.filter(f => f.confidence >= 70 && f.confidence < 90);
  const lowConf = extractedFields.filter(f => f.confidence < 70);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#0D1117] border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-blue-900/20 to-purple-900/20">
          <h2 className="text-xl font-bold text-white text-right">
            ✅ مراجعة البيانات المستخرجة — {companyName}
          </h2>
          <p className="text-gray-400 text-sm mt-1 text-right">
            راجع البيانات المستخرجة وصحّح ما يلزم قبل بدء التحليل
          </p>
          <div className="flex gap-4 mt-3 justify-end text-xs">
            <span className="text-green-400">🟢 {highConf.length} حقل موثوق</span>
            <span className="text-yellow-400">🟡 {medConf.length} يحتاج تأكيد</span>
            <span className="text-red-400">🔴 {lowConf.length} يحتاج تصحيح</span>
            <span className="text-gray-400">⬜ {missingFields.length} غائب</span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto flex-1 p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 text-right border-b border-gray-800">
                <th className="pb-3 pr-4">البند الأصلي</th>
                <th className="pb-3 pr-4">الحقل المالي المعياري</th>
                <th className="pb-3 pr-4">القيمة</th>
                <th className="pb-3 pr-4">نسبة الثقة</th>
              </tr>
            </thead>
            <tbody>
              {extractedFields.map(field => {
                const badge = confidenceBadge(field.confidence);
                const needsEdit = field.confidence < 70;
                return (
                  <tr key={field.standardField} className={`border-b border-gray-800/50 ${badge.bg}`}>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-gray-300 font-mono text-xs">{field.originalColumn}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className="text-white">{FIELD_LABELS[field.standardField] || field.standardField}</span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {needsEdit ? (
                        <input
                          type="number"
                          placeholder="أدخل القيمة الصحيحة *"
                          value={editedValues[field.standardField] || ''}
                          onChange={e => {
                            setEditedValues(prev => ({ ...prev, [field.standardField]: e.target.value }));
                            setCorrections(prev => {
                              const without = prev.filter(c => c.originalColumn !== field.originalColumn);
                              return [...without, { originalColumn: field.originalColumn, standardField: field.standardField }];
                            });
                          }}
                          className="bg-red-900/20 border border-red-700 text-white rounded px-3 py-1 w-full text-right focus:outline-none focus:border-red-500"
                          dir="rtl"
                        />
                      ) : (
                        <input
                          type="number"
                          value={editedValues[field.standardField] || ''}
                          onChange={e => {
                            setEditedValues(prev => ({ ...prev, [field.standardField]: e.target.value }));
                            setCorrections(prev => {
                              const without = prev.filter(c => c.originalColumn !== field.originalColumn);
                              return [...without, { originalColumn: field.originalColumn, standardField: field.standardField }];
                            });
                          }}
                          className="bg-transparent border border-gray-700 text-white rounded px-3 py-1 w-full text-right focus:outline-none focus:border-blue-500"
                          dir="rtl"
                        />
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <span className={`text-xs font-mono ${badge.text} border ${badge.border} rounded px-2 py-0.5`}>
                        {badge.label}
                        {field.source === 'memory' && ' 🧠'}
                        {field.source === 'claude' && ' 🤖'}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {/* الحقول الغائبة */}
              {missingFields.map(field => (
                <tr key={field.standardField} className="border-b border-gray-800/50 bg-gray-900/20">
                  <td className="py-3 pr-4 text-right">
                    <span className="text-gray-500 text-xs">— لم يُعثر عليه</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-gray-400">{FIELD_LABELS[field.standardField] || field.standardField}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <input
                      type="number"
                      placeholder="اختياري"
                      value={missingValues[field.standardField] || ''}
                      onChange={e => setMissingValues(prev => ({ ...prev, [field.standardField]: e.target.value }))}
                      className="bg-transparent border border-gray-700/50 text-white rounded px-3 py-1 w-full text-right focus:outline-none focus:border-blue-500 placeholder-gray-600"
                      dir="rtl"
                    />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-xs text-gray-600">—</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-800 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            إلغاء
          </button>

          {hasBlockingErrors && (
            <p className="text-red-400 text-sm">
              ⚠️ يجب تصحيح الحقول الحمراء أولاً
            </p>
          )}

          <button
            onClick={handleConfirm}
            disabled={hasBlockingErrors}
            className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
              hasBlockingErrors
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-500 hover:to-purple-500 shadow-lg'
            }`}
          >
            ✅ تأكيد وتحليل
          </button>
        </div>
      </div>
    </div>
  );
}

export { FIELD_LABELS };
