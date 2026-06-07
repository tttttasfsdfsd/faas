/**
 * Home.tsx — الصفحة الرئيسية لمنصة EEXA
 *
 * بعد إعادة الهيكلة:
 * - منطق رفع الملف      → useFileAnalysis hook
 * - منطق المحادثة        → useChat hook
 * - منطق المصادقة        → useAuth hook
 * - منطقة الرفع          → <UploadZone />
 * - مؤشرات المقارنة      → <MetricCard />
 * - تقرير مجلس الإدارة   → <ExecutiveBoardReport />
 * - لوحة التفاصيل        → <DrillDownPanel />
 * - وضع CFO              → <CFOModeToggle />
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useFileAnalysis } from '@/hooks/useFileAnalysis';
import { formatCurrency, formatNumber, formatPercent, formatRatio, getScoreColor } from '@/lib/formatters';

// Dashboard components
import ScoreRing from '@/components/dashboard/ScoreRing';
import ExpandableSection from '@/components/dashboard/ExpandableSection';
import ProfitabilityPanel from '@/components/dashboard/ProfitabilityPanel';
import LiquidityPanel from '@/components/dashboard/LiquidityPanel';
import SolvencyPanel from '@/components/dashboard/SolvencyPanel';
import EfficiencyPanel from '@/components/dashboard/EfficiencyPanel';
import DuPontPanel from '@/components/dashboard/DuPontPanel';
import EarningsQualityPanel from '@/components/dashboard/EarningsQualityPanel';
import CashFlowPanel from '@/components/dashboard/CashFlowPanel';
import ForecastPanel from '@/components/dashboard/ForecastPanel';
import ScenarioPanel from '@/components/dashboard/ScenarioPanel';
import AltmanZPanel from '@/components/dashboard/AltmanZPanel';
import BeneishMPanel from '@/components/dashboard/BeneishMPanel';
import BenchmarkPanel from '@/components/dashboard/BenchmarkPanel';
import WaterfallPanel from '@/components/dashboard/WaterfallPanel';
import ExecutiveBoardReport from '@/components/dashboard/ExecutiveBoardReport';
import DrillDownPanel, { type DrillType } from '@/components/dashboard/DrillDownPanel';
import MetricCard from '@/components/dashboard/MetricCard';

// UI components
import UploadZone from '@/components/UploadZone';
import CFOModeToggle, { shouldShow } from '@/components/CFOModeToggle';
import AuthModal from '@/components/AuthModal';
import PricingModal from '@/components/PricingModal';

import type { AnalysisResult, ChatMessage } from '@/types/financial';

// ──────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────
type ActiveView = 'upload' | 'dashboard' | 'executive';

// ──────────────────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────────────────
export default function Home() {
  const { language, toggleLanguage, isRTL } = useLanguage();

  // ── Auth ──
  const { user, authToken, isAuthenticated, signIn, signUp, signOut, setCFOMode } = useAuth();

  // ── UI state ──
  const [companyName, setCompanyName] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('upload');
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [showPricing, setShowPricing] = useState(false);
  const [drillType, setDrillType] = useState<DrillType | null>(null);
  const [cfoMode, setCFOModeLocal] = useState(user?.cfoMode ?? false);

  // Sync cfoMode with user
  useEffect(() => {
    if (user) setCFOModeLocal(user.cfoMode);
  }, [user]);

  // ── File analysis ──
  const {
    loading,
    loadingStep,
    loadingLabel,
    result,
    error: analysisError,
    analyzeFile,
    clearResult,
  } = useFileAnalysis({
    companyName,
    isRTL,
    authToken,
    onLimitReached: () => setShowPricing(true),
    onAuthRequired: () => {
      setAuthMode('signup');
      setShowAuth(true);
    },
  });

  // Show dashboard after successful analysis
  useEffect(() => {
    if (result) setActiveView('dashboard');
  }, [result]);

  // ── Chat ──
  const chat = useChat({
    financials: result?.financials ?? null,
    companyName: result?.companyName || companyName,
    language,
    targets: undefined, // TODO: wire from TargetsPage state
    sector: result?.sector,
  });

  // ── CFO mode toggle handler ──
  const handleCFOToggle = useCallback((mode: boolean) => {
    setCFOModeLocal(mode);
    setCFOMode(mode);
  }, [setCFOMode]);

  // ── Drill-down handler (used by child components via onClick) ──
  const handleDrillDown = useCallback((type: DrillType) => {
    setDrillType(type);
  }, []);

  // ─────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────
  const f = result?.financials;
  const periodsCount = result?.periodsCount ?? 1;

  // ─────────────────────────────────────
  // Render
  // ─────────────────────────────────────
  return (
    <div
      className="min-h-screen bg-[#080C10] text-white"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Navigation Bar ── */}
      <nav className="border-b border-gray-800 bg-[#0D1117] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">EEXA</span>
            <span className="text-gray-600 text-sm hidden md:block">
              {isRTL ? 'المستشار المالي الذكي' : 'Smart Financial Advisor'}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* CFO Mode — يظهر فقط عند وجود نتيجة */}
            {result && (
              <CFOModeToggle
                cfoMode={cfoMode}
                onToggle={handleCFOToggle}
                authToken={authToken ?? undefined}
                isRTL={isRTL}
              />
            )}

            {/* View switcher */}
            {result && (
              <div className="flex bg-gray-900 rounded-lg p-1 gap-1">
                {[
                  { id: 'dashboard' as ActiveView, label: isRTL ? 'لوحة التحكم' : 'Dashboard' },
                  { id: 'executive' as ActiveView, label: isRTL ? 'تقرير تنفيذي' : 'Executive' },
                ].map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeView === v.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}

            {/* Language toggle */}
            <button
              onClick={toggleLanguage}
              className="text-gray-400 hover:text-white text-sm px-2 py-1 rounded transition-colors"
            >
              {language === 'ar' ? 'EN' : 'ع'}
            </button>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm hidden md:block">{user?.email}</span>
                <button
                  onClick={signOut}
                  className="text-gray-500 hover:text-red-400 text-sm transition-colors"
                >
                  {isRTL ? 'خروج' : 'Sign out'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setAuthMode('login'); setShowAuth(true); }}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                {isRTL ? 'تسجيل الدخول' : 'Sign in'}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* ── Upload View ── */}
        {activeView === 'upload' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            {/* Hero */}
            <div className="text-center space-y-3">
              <h1 className="text-4xl font-bold text-white">
                {isRTL ? 'حلّل قوائمك المالية' : 'Analyze Your Financial Statements'}
              </h1>
              <p className="text-gray-400 text-lg max-w-xl mx-auto">
                {isRTL
                  ? 'ارفع ملف Excel أو PDF واحصل على تحليل مالي شامل في ثوانٍ'
                  : 'Upload Excel or PDF and get a comprehensive financial analysis in seconds'}
              </p>
            </div>

            <UploadZone
              companyName={companyName}
              onCompanyNameChange={setCompanyName}
              onFileSelected={analyzeFile}
              loading={loading}
              loadingLabel={loadingLabel}
              isRTL={isRTL}
            />

            {analysisError && (
              <div className="bg-red-900/20 border border-red-800 rounded-xl p-4 text-red-400 text-sm max-w-2xl w-full text-center">
                {analysisError}
              </div>
            )}
          </div>
        )}

        {/* ── Dashboard View ── */}
        {activeView === 'dashboard' && result && f && (
          <div className="space-y-6">
            {/* Back + Reset */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveView('upload')}
                  className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1"
                >
                  ← {isRTL ? 'رفع ملف جديد' : 'Upload new file'}
                </button>
                <span className="text-gray-700">|</span>
                <h2 className="text-white font-bold text-lg">
                  {result.companyName || companyName}
                </h2>
                {result.sector && (
                  <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-1 rounded-full">
                    {result.sector}
                  </span>
                )}
              </div>
              <div className="text-gray-500 text-sm">
                {isRTL ? `${periodsCount} فترة` : `${periodsCount} period${periodsCount !== 1 ? 's' : ''}`}
              </div>
            </div>

            {/* Score Ring */}
            {shouldShow('kpis', cfoMode) && (
              <div className="flex justify-center">
                <ScoreRing score={f.score.overall} label={f.score.label} />
              </div>
            )}

            {/* KPI Cards */}
            {shouldShow('kpis', cfoMode) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: isRTL ? 'الإيرادات' : 'Revenue', value: f.totalRevenue, unit: 'ريال' as const },
                  { label: isRTL ? 'صافي الربح' : 'Net Profit', value: f.netProfit, unit: 'ريال' as const },
                  { label: isRTL ? 'هامش الربح' : 'Net Margin', value: f.profitability.netMargin, unit: '%' as const },
                  { label: 'ROE', value: f.profitability.roe, unit: '%' as const },
                ].map((kpi, i) => (
                  <MetricCard
                    key={i}
                    label={kpi.label}
                    value={kpi.value}
                    unit={kpi.unit}
                  />
                ))}
              </div>
            )}

            {/* Waterfall — CFO Section */}
            {shouldShow('variance', cfoMode) && (
              <ExpandableSection title={isRTL ? 'جسر الربحية والتباين' : 'Profit Bridge & Variance'} defaultOpen>
                <WaterfallPanel financials={f} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Profitability */}
            {shouldShow('profitability', cfoMode) && (
              <ExpandableSection
                title={isRTL ? 'الربحية' : 'Profitability'}
                defaultOpen
                onTitleClick={() => handleDrillDown('profitability')}
              >
                <ProfitabilityPanel profitability={f.profitability} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Liquidity */}
            {shouldShow('liquidity', cfoMode) && (
              <ExpandableSection
                title={isRTL ? 'السيولة' : 'Liquidity'}
                onTitleClick={() => handleDrillDown('liquidity')}
              >
                <LiquidityPanel liquidity={f.liquidity} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Solvency */}
            {shouldShow('solvency', cfoMode) && (
              <ExpandableSection
                title={isRTL ? 'الملاءة المالية' : 'Solvency'}
                onTitleClick={() => handleDrillDown('solvency')}
              >
                <SolvencyPanel solvency={f.solvency} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Efficiency */}
            {shouldShow('efficiency', cfoMode) && (
              <ExpandableSection
                title={isRTL ? 'الكفاءة التشغيلية' : 'Efficiency'}
                onTitleClick={() => handleDrillDown('efficiency')}
              >
                <EfficiencyPanel efficiency={f.efficiency} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* DuPont */}
            {!cfoMode && (
              <ExpandableSection title="DuPont Analysis">
                <DuPontPanel profitability={f.profitability} efficiency={f.efficiency} solvency={f.solvency} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Earnings Quality */}
            {shouldShow('cashflow', cfoMode) && (
              <ExpandableSection title={isRTL ? 'جودة الأرباح' : 'Earnings Quality'} defaultOpen>
                <EarningsQualityPanel
                  earningsQuality={f.earningsQuality}
                  cashFlow={f.cashFlow}
                  netProfit={f.netProfit}
                  isRTL={isRTL}
                />
              </ExpandableSection>
            )}

            {/* Cash Flow */}
            {shouldShow('cashflow', cfoMode) && (
              <ExpandableSection title={isRTL ? 'التدفق النقدي' : 'Cash Flow'}>
                <CashFlowPanel cashFlow={f.cashFlow} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Forecast */}
            {shouldShow('forecasts', cfoMode) && (
              <ExpandableSection title={isRTL ? 'التوقعات' : 'Forecast'}>
                <ForecastPanel financials={f} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Scenarios — not in CFO mode (too detailed) */}
            {!cfoMode && (
              <ExpandableSection title={isRTL ? 'محاكاة السيناريوهات' : 'Scenario Analysis'}>
                <ScenarioPanel
                  financials={f}
                  currentPeriod={result.rawRecord ?? {} as never}
                  isRTL={isRTL}
                />
              </ExpandableSection>
            )}

            {/* Altman Z — not in CFO mode */}
            {!cfoMode && (
              <ExpandableSection title="Altman Z-Score">
                <AltmanZPanel altmanZ={f.altmanZ} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Beneish M — not in CFO mode */}
            {!cfoMode && (
              <ExpandableSection title="Beneish M-Score">
                <BeneishMPanel beneishM={f.beneishM} periodsCount={periodsCount} isRTL={isRTL} />
              </ExpandableSection>
            )}

            {/* Benchmarking */}
            {shouldShow('benchmarking', cfoMode) && (
              <ExpandableSection title={isRTL ? 'مقارنة القطاع' : 'Sector Benchmark'}>
                <BenchmarkPanel
                  financials={f}
                  sector={result.sector}
                  isRTL={isRTL}
                />
              </ExpandableSection>
            )}

            {/* AI Chat Panel */}
            <ExpandableSection title={isRTL ? '🤖 المستشار الذكي' : '🤖 AI Advisor'} defaultOpen>
              <div className="space-y-3">
                {/* Messages */}
                <div className="h-72 overflow-y-auto space-y-3 p-3 bg-black/20 rounded-xl">
                  {chat.messages.length === 0 && (
                    <p className="text-gray-600 text-sm text-center pt-8">
                      {isRTL ? 'اسأل عن أي مؤشر أو نتيجة في تقريرك...' : 'Ask about any metric or insight in your report...'}
                    </p>
                  )}
                  {chat.messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}>
                      <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-800 text-gray-100'
                      }`} dir={isRTL ? 'rtl' : 'ltr'}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {chat.isLoading && (
                    <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                      <div className="bg-gray-800 rounded-2xl px-4 py-2.5">
                        <span className="text-gray-400 text-sm animate-pulse">...</span>
                      </div>
                    </div>
                  )}
                  <div ref={chat.endRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chat.input}
                    onChange={e => chat.setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && chat.sendMessage()}
                    placeholder={isRTL ? 'اكتب سؤالك...' : 'Type your question...'}
                    className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-blue-500 text-sm"
                    dir={isRTL ? 'rtl' : 'ltr'}
                    disabled={chat.isLoading}
                  />
                  <button
                    onClick={() => chat.sendMessage()}
                    disabled={chat.isLoading || !chat.input.trim()}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-500 disabled:opacity-50 transition-colors"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {/* ── Executive View ── */}
        {activeView === 'executive' && result && f && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveView('dashboard')}
                className="text-gray-500 hover:text-white transition-colors text-sm"
              >
                ← {isRTL ? 'العودة للوحة' : 'Back to dashboard'}
              </button>
            </div>
            <ExecutiveBoardReport
              financials={f}
              companyName={result.companyName || companyName}
              sector={result.sector}
              isRTL={isRTL}
            />
          </div>
        )}

      </main>

      {/* ── Drill-Down Panel ── */}
      {result && f && drillType && (
        <DrillDownPanel
          type={drillType}
          financials={f}
          onClose={() => setDrillType(null)}
          isRTL={isRTL}
        />
      )}

      {/* ── Modals ── */}
      {showAuth && (
        <AuthModal
          mode={authMode}
          onClose={() => setShowAuth(false)}
          onSignIn={signIn}
          onSignUp={signUp}
          isRTL={isRTL}
        />
      )}

      {showPricing && (
        <PricingModal
          onClose={() => setShowPricing(false)}
          isRTL={isRTL}
        />
      )}
    </div>
  );
}
