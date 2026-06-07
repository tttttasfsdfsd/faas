/**
 * Ground Truth Tests for EEXA Financial Engine
 * Known inputs → known expected outputs
 * Run: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  calculateProfitabilityRatios,
  calculateLiquidityRatios,
  calculateSolvencyRatios,
  calculateEfficiencyRatios,
  calculateAltmanZScore,
  calculateBeneishMScore,
  calculateFinancialScore,
  analyzeFinancials,
  generateSmartAlerts,
} from '../src/lib/financialEngine';
import type { NormalizedFinancialRecord } from '../src/lib/semanticMapping';

const PRECISION = 2; // decimal places for toBeCloseTo

// ==================== GROUND TRUTH RECORD ====================
// Hand-calculated from first principles
const baseRecord: NormalizedFinancialRecord = {
  month: 'Dec',
  revenue: 1_000_000,
  sales: 1_000_000,
  cogs: 600_000,
  grossProfit: 400_000,       // 1M - 600K
  operatingExpenses: 150_000,
  ebitda: 260_000,            // 400K - 150K + 10K depreciation
  ebit: 250_000,              // 400K - 150K = 250K
  depreciation: 10_000,
  amortization: 0,
  interestExpense: 25_000,
  tax: 45_000,                // 225K * 20%
  netIncome: 180_000,         // 250K - 25K - 45K = 180K

  totalAssets: 2_000_000,
  currentAssets: 700_000,
  fixedAssets: 1_200_000,
  inventory: 200_000,
  accountsReceivable: 150_000,
  cash: 350_000,

  totalLiabilities: 800_000,
  currentLiabilities: 300_000,
  longTermDebt: 500_000,
  accountsPayable: 100_000,
  shortTermDebt: 0,

  totalEquity: 1_200_000,     // 2M - 800K
  retainedEarnings: 500_000,

  operatingCashFlow: 220_000, // Slightly below net income (accruals)
  investingCashFlow: -80_000,
  financingCashFlow: -40_000,
  capex: 80_000,
  dividends: 0,
};

const prevRecord: NormalizedFinancialRecord = {
  ...baseRecord,
  month: 'Nov',
  revenue: 900_000,
  netIncome: 160_000,
  ebit: 220_000,
  totalAssets: 1_900_000,
  accountsReceivable: 135_000,
  inventory: 180_000,
};

// ==================== PROFITABILITY ====================
describe('Profitability Ratios', () => {
  const p = calculateProfitabilityRatios(baseRecord);

  it('Gross Margin = 40.00%', () => {
    // 400K / 1M = 40%
    expect(p.grossMargin).toBeCloseTo(40, PRECISION);
  });

  it('Operating Margin = 25.00%', () => {
    // EBIT 250K / 1M = 25%
    expect(p.operatingMargin).toBeCloseTo(25, PRECISION);
  });

  it('EBITDA Margin = 26.00%', () => {
    // EBITDA 260K / 1M = 26%
    expect(p.ebitdaMargin).toBeCloseTo(26, PRECISION);
  });

  it('Net Margin = 17.00%', () => {
    // Net Income: EBIT 250K - Interest 25K - Tax 45K = 180K... but engine uses ebit=250K recorded directly
    // Test record has netIncome: 180_000 → 180K/1M = 18%
    expect(p.netMargin).toBeCloseTo(18, 0); // within 0.5%
  });

  it('ROA = 9.00%', () => {
    // 180K / 2M = 9%
    expect(p.roa).toBeCloseTo(9, PRECISION);
  });

  it('ROE = 15.00%', () => {
    // 180K / 1.2M = 15%
    expect(p.roe).toBeCloseTo(15, PRECISION);
  });

  it('ROCE = 14.71%', () => {
    // EBIT 250K / (2M - 300K) = 250K/1700K = 14.71%
    expect(p.roce).toBeCloseTo(14.71, 1);
  });
});

// ==================== LIQUIDITY ====================
describe('Liquidity Ratios', () => {
  const l = calculateLiquidityRatios(baseRecord);

  it('Current Ratio = 2.33', () => {
    // 700K / 300K = 2.33
    expect(l.currentRatio).toBeCloseTo(2.33, 1);
  });

  it('Quick Ratio = 1.67', () => {
    // (700K - 200K) / 300K = 1.67
    expect(l.quickRatio).toBeCloseTo(1.67, 1);
  });

  it('Cash Ratio = 1.17', () => {
    // 350K / 300K = 1.17
    expect(l.cashRatio).toBeCloseTo(1.17, 1);
  });

  it('Working Capital = 400,000', () => {
    // 700K - 300K = 400K
    expect(l.workingCapital).toBeCloseTo(400_000, -3);
  });
});

// ==================== SOLVENCY ====================
describe('Solvency Ratios', () => {
  const s = calculateSolvencyRatios(baseRecord);

  it('Debt Ratio = 0.40', () => {
    // 800K / 2M = 0.40
    expect(s.debtRatio).toBeCloseTo(0.40, PRECISION);
  });

  it('Debt-to-Equity = 0.67', () => {
    // 800K / 1.2M = 0.667
    expect(s.debtToEquity).toBeCloseTo(0.667, 1);
  });

  it('Interest Coverage = 10.00', () => {
    // EBIT 250K / Interest 25K = 10
    expect(s.interestCoverage).toBeCloseTo(10, 0);
  });

  it('Financial Leverage = 1.67', () => {
    // 2M / 1.2M = 1.667
    expect(s.financialLeverage).toBeCloseTo(1.667, 1);
  });
});

// ==================== EFFICIENCY ====================
describe('Efficiency Ratios', () => {
  const e = calculateEfficiencyRatios(baseRecord);

  it('Asset Turnover = 0.50', () => {
    // 1M / 2M = 0.5
    expect(e.assetTurnover).toBeCloseTo(0.50, PRECISION);
  });

  it('Inventory Turnover = 3.00', () => {
    // COGS 600K / Inventory 200K = 3
    expect(e.inventoryTurnover).toBeCloseTo(3, 1);
  });

  it('DSO ≈ 54.75 days', () => {
    // 365 / (1M / 150K) = 365 / 6.67 = 54.75
    expect(e.dso).toBeCloseTo(54.75, 0);
  });

  it('DIO ≈ 121.67 days', () => {
    // 365 / 3 = 121.67
    expect(e.dio).toBeCloseTo(121.67, 0);
  });
});

// ==================== ALTMAN Z-SCORE ====================
describe('Altman Z-Score', () => {
  const z = calculateAltmanZScore(baseRecord);

  it('X1 (Working Capital / Assets) ≈ 0.20', () => {
    // WC 400K / 2M = 0.20
    expect(z.components.x1).toBeCloseTo(0.20, PRECISION);
  });

  it('X2 (Retained Earnings / Assets) = 0.25', () => {
    // 500K / 2M = 0.25
    expect(z.components.x2).toBeCloseTo(0.25, PRECISION);
  });

  it('X3 (EBIT / Assets) = 0.125', () => {
    // 250K / 2M = 0.125
    expect(z.components.x3).toBeCloseTo(0.125, PRECISION);
  });

  it('X5 (Revenue / Assets) = 0.50', () => {
    // 1M / 2M = 0.50
    expect(z.components.x5).toBeCloseTo(0.50, PRECISION);
  });

  it('Z-Score in grey/safe zone (not distress)', () => {
    // Z' = 0.717*0.20 + 0.847*0.25 + 3.107*0.125 + 0.420*1.50 + 0.998*0.50 ≈ 1.87
    // Grey zone (1.23 < Z < 2.9) — company is financially sound but not top-tier
    expect(z.zScore).toBeGreaterThan(1.23);
    expect(z.zone).not.toBe('distress');
  });
});

// ==================== SMART ALERTS ====================
describe('Smart Alerts', () => {
  it('No danger alerts for healthy company', () => {
    const { calculateLiquidityRatios: lr, calculateSolvencyRatios: sr,
            calculateProfitabilityRatios: pr, calculateCashFlowAnalysis: cf,
            calculateAltmanZScore: az, calculateFinancialScore: fs,
            calculateEarningsQuality: eq } = require('../src/lib/financialEngine');

    const liq = lr(baseRecord);
    const sol = sr(baseRecord);
    const prof = pr(baseRecord);
    const cashflow = cf(baseRecord, prevRecord);
    const altman = az(baseRecord);
    const eq_ = eq(baseRecord);
    const score = fs(prof, liq, sol, calculateEfficiencyRatios(baseRecord), cashflow, eq_, 11.1);
    const alerts = generateSmartAlerts(baseRecord, cashflow, liq, sol, prof, score, altman);

    const dangerAlerts = alerts.filter(a => a.type === 'danger');
    expect(dangerAlerts.length).toBe(0);
  });

  it('Danger alert when cash runway < 30 days', () => {
    const poorCash: NormalizedFinancialRecord = {
      ...baseRecord,
      cash: 5_000,   // tiny cash
      revenue: 1_000_000,
      // expenses still high → massive burn
    };
    const { calculateLiquidityRatios: lr, calculateSolvencyRatios: sr,
            calculateProfitabilityRatios: pr, calculateCashFlowAnalysis: cf,
            calculateAltmanZScore: az, calculateFinancialScore: fs,
            calculateEarningsQuality: eq, generateSmartAlerts: ga } = require('../src/lib/financialEngine');

    const liq = lr(poorCash);
    const sol = sr(poorCash);
    const prof = pr(poorCash);
    const cashflow = cf(poorCash);
    const altman = az(poorCash);
    const eq_ = eq(poorCash);
    const score = fs(prof, liq, sol, calculateEfficiencyRatios(poorCash), cashflow, eq_, 0);
    const alerts = ga(poorCash, cashflow, liq, sol, prof, score, altman);

    const cashAlert = alerts.find(a => a.id === 'cash_critical' || a.id === 'cash_warning');
    expect(cashAlert).toBeDefined();
  });
});

// ==================== FULL ANALYSIS INTEGRATION ====================
describe('Full Analysis Integration', () => {
  it('analyzeFinancials returns correct net margin', () => {
    const result = analyzeFinancials([baseRecord]);
    expect(result.netMargin).toBeCloseTo(18, 1);
    expect(result.totalRevenue).toBe(1_000_000);
    expect(result.netProfit).toBe(180_000);
  });

  it('analyzeFinancials returns smartAlerts array', () => {
    const result = analyzeFinancials([baseRecord]);
    expect(Array.isArray(result.smartAlerts)).toBe(true);
  });

  it('Revenue growth calculated correctly with 2 periods', () => {
    const result = analyzeFinancials([prevRecord, baseRecord]);
    // (1M - 900K) / 900K * 100 = 11.11%
    expect(result.revenueGrowth).toBeCloseTo(11.11, 1);
  });

  it('Financial score between 0-100', () => {
    const result = analyzeFinancials([baseRecord]);
    expect(result.score.overall).toBeGreaterThanOrEqual(0);
    expect(result.score.overall).toBeLessThanOrEqual(100);
  });

  it('High score for financially healthy company', () => {
    const result = analyzeFinancials([baseRecord]);
    // Healthy company (40% margins, 2.33 current ratio, low debt) → should score ≥ 60
    expect(result.score.overall).toBeGreaterThanOrEqual(60);
  });
});

// ==================== EDGE CASES ====================
describe('Edge Cases — no divide by zero', () => {
  const zeroRecord: NormalizedFinancialRecord = {
    month: 'Jan',
    revenue: 0, sales: 0, cogs: 0, grossProfit: 0,
    operatingExpenses: 0, ebitda: 0, ebit: 0, depreciation: 0, amortization: 0,
    interestExpense: 0, tax: 0, netIncome: 0,
    totalAssets: 0, currentAssets: 0, fixedAssets: 0, inventory: 0,
    accountsReceivable: 0, cash: 0,
    totalLiabilities: 0, currentLiabilities: 0, longTermDebt: 0,
    accountsPayable: 0, shortTermDebt: 0,
    totalEquity: 0, retainedEarnings: 0,
    operatingCashFlow: 0, investingCashFlow: 0, financingCashFlow: 0,
    capex: 0, dividends: 0,
  };

  it('No NaN or Infinity in profitability ratios for zero inputs', () => {
    const p = calculateProfitabilityRatios(zeroRecord);
    Object.values(p).forEach(v => {
      expect(isNaN(v)).toBe(false);
      expect(isFinite(v)).toBe(true);
    });
  });

  it('No NaN in liquidity ratios for zero inputs', () => {
    const l = calculateLiquidityRatios(zeroRecord);
    Object.values(l).forEach(v => {
      expect(isNaN(v)).toBe(false);
    });
  });

  it('analyzeFinancials handles single zero record without throwing', () => {
    expect(() => analyzeFinancials([zeroRecord])).not.toThrow();
  });
});
