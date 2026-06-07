/**
 * useFileAnalysis — hook لرفع وتحليل الملف المالي
 *
 * يعزل منطق: رفع الملف / consumeReport / polling / حفظ النتيجة
 * عن واجهة المستخدم في Home.tsx
 */

import { useState, useCallback } from 'react';
import type { AnalysisResult } from '@/types/financial';

interface UseFileAnalysisOptions {
  companyName: string;
  isRTL: boolean;
  authToken?: string | null;
  onLimitReached: () => void;
  onAuthRequired: () => void;
}

export function useFileAnalysis({
  companyName,
  isRTL,
  authToken,
  onLimitReached,
  onAuthRequired,
}: UseFileAnalysisOptions) {
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const LOADING_STEPS = isRTL
    ? ['', 'قراءة الملف...', 'استخراج البيانات...', 'حساب المؤشرات...', 'توليد التقرير...']
    : ['', 'Reading file...', 'Extracting data...', 'Computing ratios...', 'Generating report...'];

  const analyzeFile = useCallback(async (file: File) => {
    // التحقق من الحصة — على الخادم
    if (authToken) {
      const limitCheck = await fetch('/api/auth/consume-report', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      });
      const limitData = await limitCheck.json() as { success: boolean; limitReached?: boolean; error?: string };
      if (!limitData.success) {
        if (limitData.limitReached) { onLimitReached(); return; }
        // إذا لم يكن هناك token صالح
        onAuthRequired();
        return;
      }
    } else {
      // مستخدم غير مسجّل — طلب التسجيل
      onAuthRequired();
      return;
    }

    setLoading(true);
    setLoadingStep(1);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('companyName', companyName || (isRTL ? 'شركتي' : 'My Company'));
    formData.append('fileType', file.name?.endsWith('.pdf') ? 'pdf' : 'excel');

    const stepTimers = [
      setTimeout(() => setLoadingStep(2), 800),
      setTimeout(() => setLoadingStep(3), 1800),
    ];

    try {
      const headers: Record<string, string> = {};
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch('/api/analyze', { method: 'POST', body: formData, headers });
      const data = await res.json() as AnalysisResult & { success: boolean; error?: string };

      if (data.success) {
        setLoadingStep(4);
        setTimeout(() => {
          setResult(data);
          setLoading(false);
          setLoadingStep(0);
        }, 600);
      } else {
        setError(data.error || (isRTL ? 'فشل التحليل. يرجى المحاولة مجدداً.' : 'Analysis failed. Please try again.'));
        setLoading(false);
        setLoadingStep(0);
      }
    } catch {
      setError(isRTL ? 'خطأ في الاتصال. تحقق من الشبكة وحاول مجدداً.' : 'Connection error. Check network and retry.');
      setLoading(false);
      setLoadingStep(0);
    } finally {
      stepTimers.forEach(clearTimeout);
    }
  }, [companyName, isRTL, authToken, onLimitReached, onAuthRequired]);

  return {
    loading,
    loadingStep,
    loadingLabel: LOADING_STEPS[loadingStep] || '',
    result,
    error,
    analyzeFile,
    setResult,
    clearResult: () => setResult(null),
  };
}
