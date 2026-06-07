/**
 * UploadZone — منطقة رفع الملف (Tab: رفع ملف | إدخال يدوي)
 *
 * يدعم:
 * - Drag & Drop
 * - اختيار ملف بالنقر
 * - إدخال اسم الشركة
 * - Tab للإدخال اليدوي (مستقبلاً)
 */

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from 'react';

interface Props {
  companyName: string;
  onCompanyNameChange: (name: string) => void;
  onFileSelected: (file: File) => void;
  loading: boolean;
  loadingLabel: string;
  isRTL?: boolean;
}

type ActiveTab = 'upload' | 'manual';

export default function UploadZone({
  companyName,
  onCompanyNameChange,
  onFileSelected,
  loading,
  loadingLabel,
  isRTL = true,
}: Props) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelected(file);
  }, [onFileSelected]);

  return (
    <div className="w-full max-w-2xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Tabs */}
      <div className="flex border-b border-gray-800 mb-6">
        {[
          { id: 'upload' as ActiveTab, label: isRTL ? '📎 رفع ملف' : '📎 Upload File' },
          { id: 'manual' as ActiveTab, label: isRTL ? '✏️ إدخال يدوي' : '✏️ Manual Entry', disabled: true },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : tab.disabled
                  ? 'border-transparent text-gray-700 cursor-not-allowed'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.disabled && (
              <span className="mr-2 text-xs bg-gray-800 text-gray-600 px-1.5 py-0.5 rounded">
                {isRTL ? 'قريباً' : 'Soon'}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'upload' && (
        <div className="space-y-4">
          {/* Company Name Input */}
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              {isRTL ? 'اسم الشركة (اختياري)' : 'Company Name (optional)'}
            </label>
            <input
              type="text"
              value={companyName}
              onChange={e => onCompanyNameChange(e.target.value)}
              placeholder={isRTL ? 'مثال: شركة النخبة للتجارة' : 'e.g. Elite Trading Company'}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-colors"
              dir={isRTL ? 'rtl' : 'ltr'}
            />
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !loading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
              loading
                ? 'border-blue-500 bg-blue-900/10 cursor-default'
                : isDragOver
                  ? 'border-blue-400 bg-blue-900/20 scale-[1.01]'
                  : 'border-gray-700 hover:border-gray-500 hover:bg-gray-900/30'
            }`}
          >
            {loading ? (
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-blue-400 font-medium">{loadingLabel}</p>
                <p className="text-gray-500 text-sm">
                  {isRTL ? 'يرجى الانتظار...' : 'Please wait...'}
                </p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-4">{isDragOver ? '📂' : '📊'}</div>
                <p className="text-white font-medium text-lg mb-2">
                  {isRTL ? 'اسحب الملف هنا أو انقر للاختيار' : 'Drop file here or click to select'}
                </p>
                <p className="text-gray-500 text-sm">
                  {isRTL ? 'Excel (.xlsx, .xls) أو PDF — حجم أقصى 50MB' : 'Excel (.xlsx, .xls) or PDF — Max 50MB'}
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Tips */}
          <div className="bg-gray-900/30 rounded-xl p-4 text-sm text-gray-500" dir={isRTL ? 'rtl' : 'ltr'}>
            <p className="font-medium text-gray-400 mb-2">
              {isRTL ? '💡 نصائح لأفضل نتيجة:' : '💡 Tips for best results:'}
            </p>
            <ul className="space-y-1 list-disc list-inside">
              <li>{isRTL ? 'تأكد أن الملف يحتوي على قائمة الدخل والميزانية العمومية' : 'Include income statement and balance sheet'}</li>
              <li>{isRTL ? 'بيانات فترتين أو أكثر تُمكّن من تحليل الاتجاهات' : 'Multiple periods enable trend analysis'}</li>
              <li>{isRTL ? 'يدعم القوائم باللغة العربية والإنجليزية' : 'Supports Arabic and English statements'}</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'manual' && (
        <div className="text-center py-12 text-gray-500">
          <div className="text-4xl mb-4">🚧</div>
          <p>{isRTL ? 'الإدخال اليدوي قيد التطوير' : 'Manual entry coming soon'}</p>
        </div>
      )}
    </div>
  );
}
