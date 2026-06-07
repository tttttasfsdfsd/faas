/**
 * AuthModal — نموذج تسجيل الدخول وإنشاء الحساب
 *
 * يستقبل onSignIn/onSignUp من الخارج (useAuth hook)
 * لا يستدعي أي منطق محلي — المصادقة كلها على الخادم
 */

import { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';

interface Props {
  mode: 'login' | 'signup';
  onClose: () => void;
  onSignIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onSignUp: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  isRTL?: boolean;
}

export default function AuthModal({ mode: initialMode, onClose, onSignIn, onSignUp, isRTL = true }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError('');
    if (!email || !password) {
      setError(isRTL ? 'يرجى تعبئة جميع الحقول' : 'Please fill all fields');
      return;
    }
    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = mode === 'signup'
        ? await onSignUp(email, password, name || undefined)
        : await onSignIn(email, password);

      if (result.success) {
        onClose();
      } else {
        setError(result.error || (isRTL ? 'حدث خطأ. يرجى المحاولة مجدداً.' : 'An error occurred. Please try again.'));
      }
    } catch {
      setError(isRTL ? 'خطأ في الاتصال بالخادم.' : 'Server connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="bg-[#0D1117] border border-gray-800 rounded-2xl p-6 w-full max-w-md"
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-bold text-xl">
            {mode === 'login'
              ? (isRTL ? 'تسجيل الدخول' : 'Sign In')
              : (isRTL ? 'إنشاء حساب' : 'Create Account')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User size={16} className="absolute top-3.5 right-3 text-gray-500" />
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={isRTL ? 'الاسم الكامل' : 'Full name'}
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={16} className="absolute top-3.5 right-3 text-gray-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={isRTL ? 'البريد الإلكتروني' : 'Email address'}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Lock size={16} className="absolute top-3.5 right-3 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder={isRTL ? 'كلمة المرور (6 أحرف على الأقل)' : 'Password (min 6 chars)'}
              className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-3 pr-10 focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all"
          >
            {loading
              ? (isRTL ? 'جارٍ المعالجة...' : 'Processing...')
              : mode === 'login'
                ? (isRTL ? 'تسجيل الدخول' : 'Sign In')
                : (isRTL ? 'إنشاء الحساب' : 'Create Account')}
          </button>
        </div>

        {/* Toggle mode */}
        <p className="text-center text-gray-500 text-sm mt-4">
          {mode === 'login'
            ? (isRTL ? 'ليس لديك حساب؟' : "Don't have an account?")
            : (isRTL ? 'لديك حساب بالفعل؟' : 'Already have an account?')}
          {' '}
          <button
            onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {mode === 'login'
              ? (isRTL ? 'أنشئ حساباً' : 'Create account')
              : (isRTL ? 'سجّل الدخول' : 'Sign in')}
          </button>
        </p>
      </div>
    </div>
  );
}
