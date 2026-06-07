/**
 * useAuth — hook لإدارة حالة المصادقة
 *
 * يعزل: تسجيل الدخول / الخروج / التحقق من الجلسة / حالة المستخدم
 */

import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise';
  reportsUsed: number;
  reportsLimit: number;
  cfoMode: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // التحقق من الجلسة عند التحميل
  useEffect(() => {
    const stored = sessionStorage.getItem('eexa_token');
    if (stored) {
      setAuthToken(stored);
      verifySession(stored);
    } else {
      setLoading(false);
    }
  }, []);

  async function verifySession(token: string) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { success: boolean; user?: Record<string, unknown> };
        if (data.success && data.user) {
          // يُفترض أن الخادم يُعيد بيانات المستخدم كاملة
          setUser({
            id: data.user.id as string,
            email: data.user.email as string,
            plan: (data.user.plan as User['plan']) || 'free',
            reportsUsed: (data.user.reports_used as number) || 0,
            reportsLimit: (data.user.reports_limit as number) || 3,
            cfoMode: (data.user.cfo_mode as boolean) || false,
          });
        } else {
          // جلسة منتهية
          sessionStorage.removeItem('eexa_token');
          setAuthToken(null);
        }
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const signIn = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as {
        success: boolean;
        accessToken?: string;
        user?: Record<string, unknown>;
        error?: string;
      };

      if (data.success && data.accessToken) {
        sessionStorage.setItem('eexa_token', data.accessToken);
        setAuthToken(data.accessToken);
        if (data.user) {
          setUser({
            id: data.user.id as string,
            email: data.user.email as string,
            plan: 'free',
            reportsUsed: 0,
            reportsLimit: 3,
            cfoMode: false,
          });
        }
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'خطأ في الاتصال.' };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const data = await res.json() as { success: boolean; error?: string };
      if (data.success) {
        // بعد التسجيل مباشرة، سجّل الدخول
        return await signIn(email, password);
      }
      return { success: false, error: data.error };
    } catch {
      return { success: false, error: 'خطأ في الاتصال.' };
    }
  }, [signIn]);

  const signOut = useCallback(async () => {
    if (authToken) {
      await fetch('/api/auth/signout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      }).catch(() => {});
    }
    sessionStorage.removeItem('eexa_token');
    setAuthToken(null);
    setUser(null);
  }, [authToken]);

  const setCFOMode = useCallback((mode: boolean) => {
    setUser(prev => prev ? { ...prev, cfoMode: mode } : prev);
  }, []);

  return {
    user,
    authToken,
    loading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
    setCFOMode,
    refreshUser: () => authToken ? verifySession(authToken) : undefined,
  };
}

export type { User };
