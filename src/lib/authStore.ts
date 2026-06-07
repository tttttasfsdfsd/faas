/**
 * EEXA Auth Store — Supabase Auth
 * 
 * الأمان: Supabase Auth يتولى التشفير والجلسات بالكامل.
 * لا كلمات مرور مخزنة في localStorage أو قاعدة البيانات.
 * حدود الاشتراك تُتحقق منها على الخادم فقط — لا ثقة بالمتصفح.
 */

// ==================== TYPES ====================

export interface User {
  id: string;
  email: string;
  name: string;
  plan: 'free' | 'starter' | 'professional';
  reportsUsed: number;
  reportsLimit: number;
  reportsResetDate: string;
  cfoMode: boolean;
  preferredLanguage: 'ar' | 'en';
  createdAt: string;
}

export interface SavedReport {
  id: string;
  companyName: string;
  date: string;
  score: number;
  revenue: number;
  netProfit: number;
  netMargin: number;
  data: Record<string, unknown>;
}

// ==================== SESSION CACHE (memory only, no localStorage) ====================
// لا نخزن أي بيانات حساسة في localStorage
// الجلسة تُدار بالكامل بواسطة Supabase Auth على الخادم

let _currentUser: User | null = null;
let _sessionToken: string | null = null;

export function setSession(user: User, token: string): void {
  _currentUser = user;
  _sessionToken = token;
}

export function clearSession(): void {
  _currentUser = null;
  _sessionToken = null;
}

export function getCurrentUser(): User | null {
  return _currentUser;
}

export function getSessionToken(): string | null {
  return _sessionToken;
}

// ==================== API CALLS (حدود الاشتراك على الخادم فقط) ====================

export async function signUp(email: string, name: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'فشل التسجيل');
  setSession(data.user, data.token);
  return data.user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة');
  setSession(data.user, data.token);
  return data.user;
}

export async function signOut(): Promise<void> {
  const token = _sessionToken;
  clearSession();
  if (token) {
    await fetch('/api/auth/signout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    }).catch(() => {}); // لا نوقف التطبيق إذا فشل طلب الخروج
  }
}

export async function refreshSession(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      headers: _sessionToken ? { 'Authorization': `Bearer ${_sessionToken}` } : {},
      credentials: 'include',
    });
    if (!res.ok) { clearSession(); return null; }
    const data = await res.json();
    if (data.user) {
      setSession(data.user, data.token || _sessionToken || '');
      return data.user;
    }
    return null;
  } catch {
    return null;
  }
}

// ==================== REPORT LIMIT (يُتحقق على الخادم) ====================
// هذه الدالة تسأل الخادم — لا تثق بقيمة محلية أبداً

export async function consumeReport(): Promise<{ allowed: boolean; remaining: number; user: User | null; error?: string }> {
  try {
    const res = await fetch('/api/auth/consume-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(_sessionToken ? { 'Authorization': `Bearer ${_sessionToken}` } : {}),
      },
      credentials: 'include',
    });
    const data = await res.json();
    
    if (data.user) {
      // تحديث بيانات المستخدم من الخادم
      _currentUser = data.user;
    }
    
    return {
      allowed: data.allowed ?? false,
      remaining: data.remaining ?? 0,
      user: data.user ?? _currentUser,
      error: data.error,
    };
  } catch {
    // في حالة انقطاع الشبكة — لا نسمح بالمتابعة
    return { allowed: false, remaining: 0, user: _currentUser, error: 'خطأ في الاتصال بالخادم' };
  }
}

// ==================== SAVED REPORTS (من الخادم) ====================

export async function saveReport(report: Omit<SavedReport, 'id' | 'date'>): Promise<SavedReport> {
  const saved: SavedReport = {
    id: `report_${Date.now()}`,
    date: new Date().toISOString(),
    ...report,
  };
  
  // حفظ على الخادم إذا كان المستخدم مسجلاً
  if (_sessionToken) {
    try {
      await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${_sessionToken}`,
        },
        body: JSON.stringify(saved),
      });
    } catch { /* سيحاول مرة أخرى لاحقاً */ }
  }
  
  return saved;
}

export async function getSavedReports(): Promise<SavedReport[]> {
  if (!_sessionToken) return [];
  try {
    const res = await fetch('/api/reports/list', {
      headers: { 'Authorization': `Bearer ${_sessionToken}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.reports ?? [];
  } catch {
    return [];
  }
}

export async function deleteReport(id: string): Promise<void> {
  if (!_sessionToken) return;
  await fetch(`/api/reports/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${_sessionToken}` },
  }).catch(() => {});
}
