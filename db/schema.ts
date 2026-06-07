/**
 * EEXA Platform — Supabase (PostgreSQL) Schema via Drizzle ORM
 * 
 * جداول:
 * - users          : المستخدمون مع بيانات الخطة والحدود
 * - companies      : الشركات مع نشاط الشركة والقطاع المصنّف
 * - reports        : التقارير المرتبطة بالمستخدم والشركة
 * - financial_periods: كل فترة مالية بنسبها المحسوبة منفصلة
 * - targets        : الأهداف المالية مرتبطة بالشركة
 * - field_mappings : ذاكرة النظام عن تنسيق قوائم كل شركة
 */

import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  real,
  boolean,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ==================== ENUMS ====================

export const planEnum = pgEnum('plan', ['free', 'starter', 'professional']);
export const periodTypeEnum = pgEnum('period_type', ['monthly', 'quarterly', 'annual']);
export const sectorEnum = pgEnum('sector', [
  'retail',
  'construction',
  'technology',
  'manufacturing',
  'healthcare',
  'food',
  'financial_services',
  'education',
  'logistics',
  'real_estate',
  'general', // fallback when sector unclear
]);

// ==================== USERS ====================

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  supabaseId: varchar('supabase_id', { length: 255 }).unique(), // Supabase Auth UID
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  plan: planEnum('plan').notNull().default('free'),
  reportsUsed: integer('reports_used').notNull().default(0),
  reportsLimit: integer('reports_limit').notNull().default(3),
  reportsResetDate: timestamp('reports_reset_date').notNull(),
  cfoMode: boolean('cfo_mode').notNull().default(false), // CFO View preference
  preferredLanguage: varchar('preferred_language', { length: 5 }).default('ar'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  supabaseIdx: uniqueIndex('users_supabase_idx').on(t.supabaseId),
}));

// ==================== COMPANIES ====================

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // حقل نصي حر يكتب فيه المستخدم نشاط شركته بكلماته الخاصة
  activityDescription: text('activity_description'),
  // القطاع المصنّف آلياً بواسطة Claude
  sector: sectorEnum('sector').default('general'),
  sectorClassifiedAt: timestamp('sector_classified_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('companies_user_idx').on(t.userId),
}));

// ==================== REPORTS ====================

export const reports = pgTable('reports', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  score: integer('score').notNull().default(0),
  revenue: real('revenue'),
  netProfit: real('net_profit'),
  netMargin: real('net_margin'),
  // البيانات الكاملة للتقرير (ComprehensiveFinancials)
  financialsJson: jsonb('financials_json'),
  // الرؤى المولّدة بواسطة Claude
  insightsJson: jsonb('insights_json'),
  // عدد الفترات المالية في هذا التقرير
  periodsCount: integer('periods_count').default(1),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('reports_user_idx').on(t.userId),
  companyIdx: index('reports_company_idx').on(t.companyId),
}));

// ==================== FINANCIAL PERIODS ====================

export const financialPeriods = pgTable('financial_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  reportId: uuid('report_id').notNull().references(() => reports.id, { onDelete: 'cascade' }),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
  // رقم الترتيب الزمني للفترة (1 = الأقدم)
  periodOrder: integer('period_order').notNull(),
  periodLabel: varchar('period_label', { length: 100 }), // "Q1 2024", "Jan 2024", "2023"
  periodType: periodTypeEnum('period_type').notNull().default('monthly'),
  // البيانات الخام المعيّرة
  rawDataJson: jsonb('raw_data_json'),
  // النسب المحسوبة لهذه الفترة تحديداً
  ratiosJson: jsonb('ratios_json'),
  // الأرقام الرئيسية (لتسهيل الاستعلام)
  revenue: real('revenue'),
  netProfit: real('net_profit'),
  grossProfit: real('gross_profit'),
  ebitda: real('ebitda'),
  totalAssets: real('total_assets'),
  totalEquity: real('total_equity'),
  cash: real('cash'),
  operatingCashFlow: real('operating_cash_flow'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  reportIdx: index('fp_report_idx').on(t.reportId),
  companyIdx: index('fp_company_idx').on(t.companyId),
}));

// ==================== TARGETS ====================
// الأهداف مرتبطة بالشركة وليس بالتقرير — تبقى لجميع التقارير القادمة

export const targets = pgTable('targets', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  // أهداف النمو
  revenueGrowthTarget: real('revenue_growth_target'),     // % نمو الإيراد المستهدف
  // أهداف الربحية
  roeTarget: real('roe_target'),
  roaTarget: real('roa_target'),
  roicTarget: real('roic_target'),
  grossMarginTarget: real('gross_margin_target'),
  netMarginTarget: real('net_margin_target'),
  ebitdaMarginTarget: real('ebitda_margin_target'),
  // أهداف السيولة
  currentRatioTarget: real('current_ratio_target'),
  // أهداف الملاءة
  debtRatioTarget: real('debt_ratio_target'),
  // أهداف التدفق النقدي
  cashTarget: real('cash_target'),
  operatingCashFlowTarget: real('operating_cash_flow_target'),
  // أهداف إضافية بصيغة JSON لمرونة المستقبل
  customTargetsJson: jsonb('custom_targets_json'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => ({
  companyIdx: uniqueIndex('targets_company_idx').on(t.companyId),
}));

// ==================== FIELD MAPPINGS ====================
// ذاكرة النظام: كل تصحيح يقوم به المستخدم يُحفظ هنا

export const fieldMappings = pgTable('field_mappings', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // اسم العمود الأصلي في ملف الشركة (مثل "إجمالي الإيرادات")
  originalColumnName: varchar('original_column_name', { length: 255 }).notNull(),
  // الحقل المالي المعياري المرتبط به
  standardField: varchar('standard_field', { length: 100 }).notNull(),
  // نسبة الثقة الأخيرة (0-100)
  confidence: integer('confidence').notNull().default(100),
  // عدد مرات تأكيد هذا الربط (كلما زاد كلما زادت الدقة)
  confirmationCount: integer('confirmation_count').notNull().default(1),
  // هل صحّحه المستخدم يدوياً؟
  isUserCorrected: boolean('is_user_corrected').notNull().default(false),
  lastSeenAt: timestamp('last_seen_at').notNull().defaultNow(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  // مفتاح فريد: شركة + اسم عمود
  companyColumnIdx: uniqueIndex('fm_company_column_idx').on(t.companyId, t.originalColumnName),
}));

// ==================== RELATIONS ====================

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(companies),
  reports: many(reports),
  targets: many(targets),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  user: one(users, { fields: [companies.userId], references: [users.id] }),
  reports: many(reports),
  targets: many(targets),
  fieldMappings: many(fieldMappings),
  financialPeriods: many(financialPeriods),
}));

export const reportsRelations = relations(reports, ({ one, many }) => ({
  user: one(users, { fields: [reports.userId], references: [users.id] }),
  company: one(companies, { fields: [reports.companyId], references: [companies.id] }),
  periods: many(financialPeriods),
}));

export const financialPeriodsRelations = relations(financialPeriods, ({ one }) => ({
  report: one(reports, { fields: [financialPeriods.reportId], references: [reports.id] }),
  company: one(companies, { fields: [financialPeriods.companyId], references: [companies.id] }),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
  company: one(companies, { fields: [targets.companyId], references: [companies.id] }),
  user: one(users, { fields: [targets.userId], references: [users.id] }),
}));

export const fieldMappingsRelations = relations(fieldMappings, ({ one }) => ({
  company: one(companies, { fields: [fieldMappings.companyId], references: [companies.id] }),
}));

// ==================== TYPE EXPORTS ====================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type FinancialPeriod = typeof financialPeriods.$inferSelect;
export type NewFinancialPeriod = typeof financialPeriods.$inferInsert;
export type Target = typeof targets.$inferSelect;
export type NewTarget = typeof targets.$inferInsert;
export type FieldMapping = typeof fieldMappings.$inferSelect;
export type NewFieldMapping = typeof fieldMappings.$inferInsert;
