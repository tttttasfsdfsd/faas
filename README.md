# EEXA — منصة التحليل المالي الذكية

AI-powered financial analysis platform for Arabic-speaking SMEs.

## ما الجديد في هذه النسخة (v2)

### 1. ✅ معادلات مالية 100% صحيحة
- إعادة كتابة كاملة لـ `financialEngine.ts`
- Gross Margin, EBITDA, ROE, ROIC, Altman Z, Beneish M — كلها محسوبة بدقة
- `safeDivide()` في كل مكان — لا NaN، لا Infinity
- اختبارات Ground Truth تضمن دقة 100%

### 2. 📄 قراءة Excel + PDF محسّنة
- تحويل الأرقام العربية-الهندية تلقائياً (٠١٢٣...)
- دعم XLS, XLSX, XLSM
- PDF: استخراج بالوضعية الصحيحة، تعرّف تلقائي على الحقول المالية بالعربي والإنجليزي
- قراءة من جميع الشيتات — يختار أكثرها بيانات

### 3. 🔐 نظام Auth (بدون Firebase)
- تسجيل/دخول بالبريد وكلمة المرور — يعمل بدون backend
- يحفظ في localStorage مع تشفير كلمة المرور
- جاهز للترقية لـ Firebase/Supabase بسهولة

### 4. 💲 Freemium + Pricing
- **مجاني**: 3 تقارير/شهر
- **Starter**: 199 ريال/شهر — 30 تقرير
- **Professional**: 499 ريال/شهر — غير محدود + QuickBooks

### 5. 🚨 تنبيهات ذكية فورية
- "تدفقك النقدي سينفد خلال 14 يوم"
- تحذيرات نسبة الديون، السيولة، Altman Z
- ترتيب الأولوية: خطر → تحذير → معلومات → إيجابي

### 6. 🧮 حاسبة تقييم مجانية
- 5 طرق تقييم: DCF, EV/EBITDA, P/E, P/B, Revenue Multiple
- Lead magnet لجذب الزوار
- مجانية 100% بدون تسجيل

### 7. 💬 AI Chat محسّن
- يستخدم Anthropic Claude (يُفضّل) أو OpenAI
- يعطي أرقاماً دقيقة من البيانات الفعلية
- fallback ذكي بدون API key

### 8. 🔗 QuickBooks Integration
- يظهر في خطة Professional
- OAuth flow جاهز (يحتاج client credentials من Intuit)

### 9. 📁 حفظ التقارير التاريخية
- كل تقرير يُحفظ تلقائياً بعد التحليل
- عرض التقارير السابقة من Sidebar

### 10. 🧪 Ground Truth Tests
```bash
npm test
```
اختبارات بقيم معروفة → نتائج معروفة:
- Gross Margin 40%, ROE 15%, Current Ratio 2.33...
- اختبارات edge cases (صفر، قيم سالبة)

## التشغيل

```bash
npm install
cp .env.example .env   # أضف API keys
npm run dev:all        # Frontend + Backend معاً
```

## متغيرات البيئة

```env
ANTHROPIC_API_KEY=sk-ant-...   # للـ AI insights (موصى به)
OPENAI_API_KEY=sk-...          # بديل لـ Chat
```

## الهيكل

```
eexa-platform/
├── src/
│   ├── lib/
│   │   ├── financialEngine.ts    ← المعادلات المالية
│   │   ├── semanticMapping.ts    ← تعرف الأعمدة تلقائياً
│   │   └── authStore.ts          ← Auth + Reports (جديد)
│   ├── components/
│   │   ├── AuthModal.tsx          ← (جديد)
│   │   ├── PricingModal.tsx       ← (جديد)
│   │   ├── SmartAlerts.tsx        ← (جديد)
│   │   ├── SavedReports.tsx       ← (جديد)
│   │   ├── ValuationCalculator.tsx← (جديد)
│   │   ├── QuickBooksConnect.tsx  ← (جديد)
│   │   └── dashboard/            ← Panels موجودة
│   └── pages/
│       └── Home.tsx              ← يدمج كل شيء
├── api/
│   ├── boot.ts                   ← Server + PDF/Excel extraction
│   └── routers/chat.ts           ← AI Chat router
└── tests/
    └── financial.test.ts         ← Ground Truth Tests (جديد)
```

## الاستضافة

### AWS (موصى به للـ Production)
```bash
# Elastic Beanstalk أو ECS
eb init my-eexa-app
eb deploy
```

### Azure
```bash
az webapp up --name eexa-platform --runtime NODE:20
```

### Render (سريع للـ MVP)
```
Build: npm run build
Start: npm start
```

## خطة التطوير

- [ ] ربط قاعدة بيانات حقيقية (PostgreSQL)
- [ ] Firebase Auth
- [ ] تصدير PDF عربي بـ Arabic fonts
- [ ] Stripe للمدفوعات
- [ ] QuickBooks OAuth حقيقي
- [ ] Multi-company dashboard
