/**
 * EEXA Sector Benchmarks
 * 
 * جدول بنشمارك حقيقي مختلف لكل قطاع
 * مبني على معايير صناعية معتمدة (CFA / IFRS / Bloomberg Industry Averages)
 * 
 * كل مؤشر له ثلاثة نطاقات: low / avg / high
 */

import type { Sector } from './semanticMapping';

export interface BenchmarkRange {
  low: number;
  avg: number;
  high: number;
  unit: '%' | 'x' | 'days' | 'number';
  higherIsBetter: boolean; // true = القيمة الأعلى أفضل
}

export interface SectorBenchmarks {
  netMargin: BenchmarkRange;
  grossMargin: BenchmarkRange;
  ebitdaMargin: BenchmarkRange;
  operatingMargin: BenchmarkRange;
  roa: BenchmarkRange;
  roe: BenchmarkRange;
  roic: BenchmarkRange;
  roce: BenchmarkRange;
  currentRatio: BenchmarkRange;
  quickRatio: BenchmarkRange;
  cashRatio: BenchmarkRange;
  debtRatio: BenchmarkRange;
  debtToEquity: BenchmarkRange;
  interestCoverage: BenchmarkRange;
  assetTurnover: BenchmarkRange;
  inventoryTurnover: BenchmarkRange;
  dso: BenchmarkRange;
  dio: BenchmarkRange;
  dpo: BenchmarkRange;
  ccc: BenchmarkRange;
}

const BENCHMARKS: Record<Sector, SectorBenchmarks> = {
  // ==================== التجزئة ====================
  retail: {
    netMargin:        { low: 1,   avg: 4,   high: 8,   unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 20,  avg: 35,  high: 50,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 4,   avg: 8,   high: 14,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 2,   avg: 5,   high: 10,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 8,   high: 15,  unit: '%',    higherIsBetter: true },
    roe:              { low: 8,   avg: 18,  high: 35,  unit: '%',    higherIsBetter: true },
    roic:             { low: 5,   avg: 12,  high: 25,  unit: '%',    higherIsBetter: true },
    roce:             { low: 6,   avg: 14,  high: 28,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 0.9, avg: 1.4, high: 2.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.4, avg: 0.7, high: 1.1, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.3, high: 0.6, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 30,  avg: 55,  high: 75,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.4, avg: 1.2, high: 2.5, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 5,   high: 12,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 1.0, avg: 1.8, high: 3.0, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 4,   avg: 8,   high: 15,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 5,   avg: 20,  high: 45,  unit: 'days', higherIsBetter: false },
    dio:              { low: 25,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: false },
    dpo:              { low: 20,  avg: 40,  high: 75,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -5,  avg: 25,  high: 60,  unit: 'days', higherIsBetter: false },
  },

  // ==================== المقاولات ====================
  construction: {
    netMargin:        { low: 1,   avg: 4,   high: 8,   unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 10,  avg: 20,  high: 35,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 5,   avg: 9,   high: 15,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 2,   avg: 5,   high: 10,  unit: '%',    higherIsBetter: true },
    roa:              { low: 2,   avg: 5,   high: 10,  unit: '%',    higherIsBetter: true },
    roe:              { low: 5,   avg: 12,  high: 22,  unit: '%',    higherIsBetter: true },
    roic:             { low: 4,   avg: 9,   high: 18,  unit: '%',    higherIsBetter: true },
    roce:             { low: 4,   avg: 10,  high: 20,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.1, avg: 1.5, high: 2.2, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.7, avg: 1.1, high: 1.7, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.4, high: 0.9, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 35,  avg: 58,  high: 75,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.5, avg: 1.4, high: 3.0, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 4,   high: 10,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.6, avg: 1.0, high: 1.8, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 3,   avg: 6,   high: 12,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 30,  avg: 60,  high: 120, unit: 'days', higherIsBetter: false },
    dio:              { low: 30,  avg: 60,  high: 120, unit: 'days', higherIsBetter: false },
    dpo:              { low: 30,  avg: 60,  high: 100, unit: 'days', higherIsBetter: true },
    ccc:              { low: -10, avg: 60,  high: 140, unit: 'days', higherIsBetter: false },
  },

  // ==================== التقنية ====================
  technology: {
    netMargin:        { low: 5,   avg: 15,  high: 30,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 40,  avg: 65,  high: 85,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 10,  avg: 25,  high: 40,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 5,   avg: 18,  high: 35,  unit: '%',    higherIsBetter: true },
    roa:              { low: 5,   avg: 12,  high: 25,  unit: '%',    higherIsBetter: true },
    roe:              { low: 10,  avg: 22,  high: 45,  unit: '%',    higherIsBetter: true },
    roic:             { low: 8,   avg: 18,  high: 40,  unit: '%',    higherIsBetter: true },
    roce:             { low: 8,   avg: 20,  high: 42,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.5, avg: 2.5, high: 5.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 1.2, avg: 2.2, high: 4.5, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.5, avg: 1.5, high: 3.0, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 15,  avg: 35,  high: 55,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.1, avg: 0.6, high: 1.5, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 5,   avg: 15,  high: 50,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.4, avg: 0.8, high: 1.5, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 5,   avg: 12,  high: 30,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 20,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: false },
    dio:              { low: 10,  avg: 30,  high: 75,  unit: 'days', higherIsBetter: false },
    dpo:              { low: 20,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -5,  avg: 30,  high: 75,  unit: 'days', higherIsBetter: false },
  },

  // ==================== الصناعة ====================
  manufacturing: {
    netMargin:        { low: 2,   avg: 7,   high: 14,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 15,  avg: 28,  high: 45,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 8,   avg: 14,  high: 22,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 7,   high: 14,  unit: '%',    higherIsBetter: true },
    roe:              { low: 6,   avg: 14,  high: 25,  unit: '%',    higherIsBetter: true },
    roic:             { low: 5,   avg: 11,  high: 22,  unit: '%',    higherIsBetter: true },
    roce:             { low: 5,   avg: 12,  high: 24,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.2, avg: 1.8, high: 3.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.6, avg: 1.0, high: 1.8, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.4, high: 0.9, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 30,  avg: 50,  high: 70,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.4, avg: 1.0, high: 2.5, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 5,   high: 12,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.4, avg: 0.8, high: 1.5, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 3,   avg: 6,   high: 12,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 20,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: false },
    dio:              { low: 30,  avg: 60,  high: 120, unit: 'days', higherIsBetter: false },
    dpo:              { low: 25,  avg: 50,  high: 100, unit: 'days', higherIsBetter: true },
    ccc:              { low: -5,  avg: 55,  high: 110, unit: 'days', higherIsBetter: false },
  },

  // ==================== الرعاية الصحية ====================
  healthcare: {
    netMargin:        { low: 3,   avg: 9,   high: 18,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 25,  avg: 45,  high: 65,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 8,   avg: 18,  high: 30,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 4,   avg: 12,  high: 22,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    roe:              { low: 8,   avg: 18,  high: 32,  unit: '%',    higherIsBetter: true },
    roic:             { low: 6,   avg: 14,  high: 26,  unit: '%',    higherIsBetter: true },
    roce:             { low: 6,   avg: 15,  high: 28,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.2, avg: 1.8, high: 3.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.8, avg: 1.4, high: 2.5, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.2, avg: 0.6, high: 1.5, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 25,  avg: 45,  high: 65,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.3, avg: 0.9, high: 2.0, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 3,   avg: 7,   high: 18,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.4, avg: 0.7, high: 1.2, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 5,   avg: 10,  high: 20,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 30,  avg: 60,  high: 100, unit: 'days', higherIsBetter: false },
    dio:              { low: 18,  avg: 36,  high: 75,  unit: 'days', higherIsBetter: false },
    dpo:              { low: 20,  avg: 40,  high: 80,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -5,  avg: 56,  high: 95,  unit: 'days', higherIsBetter: false },
  },

  // ==================== الغذاء والمطاعم ====================
  food: {
    netMargin:        { low: 1,   avg: 5,   high: 12,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 25,  avg: 45,  high: 65,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 5,   avg: 12,  high: 20,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 2,   avg: 7,   high: 15,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    roe:              { low: 8,   avg: 20,  high: 40,  unit: '%',    higherIsBetter: true },
    roic:             { low: 6,   avg: 14,  high: 28,  unit: '%',    higherIsBetter: true },
    roce:             { low: 7,   avg: 15,  high: 30,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 0.7, avg: 1.2, high: 2.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.4, avg: 0.7, high: 1.2, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.3, high: 0.8, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 35,  avg: 60,  high: 78,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.5, avg: 1.5, high: 3.5, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 5,   high: 12,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.8, avg: 1.5, high: 2.5, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 10,  avg: 18,  high: 35,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 2,   avg: 12,  high: 30,  unit: 'days', higherIsBetter: false },
    dio:              { low: 10,  avg: 20,  high: 36,  unit: 'days', higherIsBetter: false },
    dpo:              { low: 15,  avg: 35,  high: 65,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -20, avg: -3,  high: 25,  unit: 'days', higherIsBetter: false },
  },

  // ==================== الخدمات المالية ====================
  financial_services: {
    netMargin:        { low: 8,   avg: 18,  high: 35,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 40,  avg: 60,  high: 80,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 15,  avg: 30,  high: 50,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 10,  avg: 22,  high: 40,  unit: '%',    higherIsBetter: true },
    roa:              { low: 0.5, avg: 1.5, high: 3.0, unit: '%',    higherIsBetter: true },
    roe:              { low: 8,   avg: 15,  high: 25,  unit: '%',    higherIsBetter: true },
    roic:             { low: 5,   avg: 12,  high: 22,  unit: '%',    higherIsBetter: true },
    roce:             { low: 6,   avg: 14,  high: 25,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.0, avg: 1.5, high: 2.5, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.8, avg: 1.3, high: 2.2, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.3, avg: 0.8, high: 2.0, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 50,  avg: 75,  high: 90,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 1.0, avg: 3.0, high: 8.0, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 1.5, avg: 3.0, high: 8.0, unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.05,avg: 0.15,high: 0.4, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 0,   avg: 0,   high: 0,   unit: 'x',   higherIsBetter: true },
    dso:              { low: 15,  avg: 35,  high: 75,  unit: 'days', higherIsBetter: false },
    dio:              { low: 0,   avg: 0,   high: 0,   unit: 'days', higherIsBetter: false },
    dpo:              { low: 15,  avg: 30,  high: 60,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -30, avg: 5,   high: 75,  unit: 'days', higherIsBetter: false },
  },

  // ==================== التعليم ====================
  education: {
    netMargin:        { low: 3,   avg: 10,  high: 22,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 30,  avg: 50,  high: 70,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 8,   avg: 18,  high: 32,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 4,   avg: 12,  high: 25,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    roe:              { low: 6,   avg: 15,  high: 28,  unit: '%',    higherIsBetter: true },
    roic:             { low: 5,   avg: 12,  high: 24,  unit: '%',    higherIsBetter: true },
    roce:             { low: 5,   avg: 12,  high: 25,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 0.8, avg: 1.4, high: 2.5, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.6, avg: 1.2, high: 2.2, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.2, avg: 0.6, high: 1.5, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 20,  avg: 40,  high: 62,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.2, avg: 0.7, high: 1.7, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 3,   avg: 8,   high: 20,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.3, avg: 0.6, high: 1.0, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 0,   avg: 0,   high: 0,   unit: 'x',   higherIsBetter: true },
    dso:              { low: 15,  avg: 35,  high: 70,  unit: 'days', higherIsBetter: false },
    dio:              { low: 0,   avg: 0,   high: 0,   unit: 'days', higherIsBetter: false },
    dpo:              { low: 15,  avg: 30,  high: 60,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -20, avg: 5,   high: 70,  unit: 'days', higherIsBetter: false },
  },

  // ==================== اللوجستيات ====================
  logistics: {
    netMargin:        { low: 1,   avg: 5,   high: 10,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 15,  avg: 28,  high: 42,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 5,   avg: 12,  high: 20,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 2,   avg: 6,   high: 12,  unit: '%',    higherIsBetter: true },
    roa:              { low: 2,   avg: 6,   high: 12,  unit: '%',    higherIsBetter: true },
    roe:              { low: 5,   avg: 12,  high: 22,  unit: '%',    higherIsBetter: true },
    roic:             { low: 4,   avg: 9,   high: 18,  unit: '%',    higherIsBetter: true },
    roce:             { low: 4,   avg: 10,  high: 20,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.0, avg: 1.5, high: 2.2, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.7, avg: 1.2, high: 1.8, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.4, high: 0.9, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 35,  avg: 55,  high: 72,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.5, avg: 1.2, high: 2.8, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 5,   high: 12,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.8, avg: 1.4, high: 2.2, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 5,   avg: 10,  high: 20,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 20,  avg: 40,  high: 75,  unit: 'days', higherIsBetter: false },
    dio:              { low: 10,  avg: 25,  high: 55,  unit: 'days', higherIsBetter: false },
    dpo:              { low: 20,  avg: 40,  high: 75,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -10, avg: 25,  high: 55,  unit: 'days', higherIsBetter: false },
  },

  // ==================== العقارات ====================
  real_estate: {
    netMargin:        { low: 5,   avg: 15,  high: 30,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 20,  avg: 40,  high: 60,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 15,  avg: 35,  high: 55,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 8,   avg: 20,  high: 40,  unit: '%',    higherIsBetter: true },
    roa:              { low: 1,   avg: 4,   high: 9,   unit: '%',    higherIsBetter: true },
    roe:              { low: 4,   avg: 10,  high: 20,  unit: '%',    higherIsBetter: true },
    roic:             { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    roce:             { low: 3,   avg: 8,   high: 16,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 0.8, avg: 1.5, high: 3.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.5, avg: 1.0, high: 2.0, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.4, high: 1.0, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 40,  avg: 65,  high: 80,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.8, avg: 2.0, high: 5.0, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 1.5, avg: 3.5, high: 8.0, unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.05,avg: 0.15,high: 0.35,unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 0.5, avg: 1.5, high: 4.0, unit: 'x',   higherIsBetter: true },
    dso:              { low: 20,  avg: 50,  high: 100, unit: 'days', higherIsBetter: false },
    dio:              { low: 90,  avg: 240, high: 720, unit: 'days', higherIsBetter: false },
    dpo:              { low: 20,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: true },
    ccc:              { low: 45,  avg: 245, high: 730, unit: 'days', higherIsBetter: false },
  },

  // ==================== عام (fallback) ====================
  general: {
    netMargin:        { low: 2,   avg: 8,   high: 18,  unit: '%',    higherIsBetter: true },
    grossMargin:      { low: 20,  avg: 35,  high: 55,  unit: '%',    higherIsBetter: true },
    ebitdaMargin:     { low: 6,   avg: 14,  high: 25,  unit: '%',    higherIsBetter: true },
    operatingMargin:  { low: 3,   avg: 8,   high: 18,  unit: '%',    higherIsBetter: true },
    roa:              { low: 3,   avg: 7,   high: 15,  unit: '%',    higherIsBetter: true },
    roe:              { low: 6,   avg: 14,  high: 25,  unit: '%',    higherIsBetter: true },
    roic:             { low: 5,   avg: 11,  high: 22,  unit: '%',    higherIsBetter: true },
    roce:             { low: 5,   avg: 12,  high: 24,  unit: '%',    higherIsBetter: true },
    currentRatio:     { low: 1.0, avg: 1.8, high: 3.0, unit: 'x',   higherIsBetter: true },
    quickRatio:       { low: 0.6, avg: 1.1, high: 2.0, unit: 'x',   higherIsBetter: true },
    cashRatio:        { low: 0.1, avg: 0.4, high: 1.0, unit: 'x',   higherIsBetter: true },
    debtRatio:        { low: 25,  avg: 50,  high: 70,  unit: '%',    higherIsBetter: false },
    debtToEquity:     { low: 0.3, avg: 1.0, high: 2.5, unit: 'x',   higherIsBetter: false },
    interestCoverage: { low: 2,   avg: 6,   high: 15,  unit: 'x',   higherIsBetter: true },
    assetTurnover:    { low: 0.4, avg: 0.9, high: 2.0, unit: 'x',   higherIsBetter: true },
    inventoryTurnover:{ low: 3,   avg: 7,   high: 15,  unit: 'x',   higherIsBetter: true },
    dso:              { low: 15,  avg: 45,  high: 90,  unit: 'days', higherIsBetter: false },
    dio:              { low: 20,  avg: 55,  high: 120, unit: 'days', higherIsBetter: false },
    dpo:              { low: 15,  avg: 40,  high: 80,  unit: 'days', higherIsBetter: true },
    ccc:              { low: -10, avg: 60,  high: 130, unit: 'days', higherIsBetter: false },
  },
};

export function getBenchmarks(sector: Sector): SectorBenchmarks {
  return BENCHMARKS[sector] ?? BENCHMARKS.general;
}

export type BenchmarkStatus = 'excellent' | 'above_avg' | 'avg' | 'below_avg' | 'poor';

export function evaluateMetric(
  value: number,
  benchmark: BenchmarkRange
): { status: BenchmarkStatus; percentile: number; vsAvg: number } {
  const { low, avg, high, higherIsBetter } = benchmark;
  
  const vsAvg = value - avg;
  const range = high - low;
  
  let percentile: number;
  let status: BenchmarkStatus;

  if (higherIsBetter) {
    if (value >= high)       { percentile = 90; status = 'excellent'; }
    else if (value >= avg)   { percentile = Math.round(50 + (value - avg) / (high - avg) * 40); status = 'above_avg'; }
    else if (value >= low)   { percentile = Math.round(20 + (value - low) / (avg - low) * 30); status = 'below_avg'; }
    else                     { percentile = 10; status = 'poor'; }
  } else {
    if (value <= low)        { percentile = 90; status = 'excellent'; }
    else if (value <= avg)   { percentile = Math.round(50 + (avg - value) / (avg - low) * 40); status = 'above_avg'; }
    else if (value <= high)  { percentile = Math.round(20 + (high - value) / (high - avg) * 30); status = 'below_avg'; }
    else                     { percentile = 10; status = 'poor'; }
  }

  if (Math.abs(value - avg) / Math.max(1, Math.abs(avg)) < 0.05) {
    status = 'avg';
    percentile = 50;
  }

  return { status, percentile: Math.min(95, Math.max(5, percentile)), vsAvg };
}

export default BENCHMARKS;
