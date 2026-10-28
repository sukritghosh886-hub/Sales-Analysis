import { Sale, Expense, Product, AnalyticsSummary, TimeRangeFilter, GrowthStatus, PeriodComparison } from '../types';
import { formatCurrency, formatMonthYear, formatPercent } from './formatters';

export function calculateDateRangeBounds(range: TimeRangeFilter, customStart?: string, customEnd?: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  let start: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (range) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate(), 0, 0, 0, 0);
      break;
    }
    case 'this_week': {
      // Monday to today
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      const duration = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - duration);
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      end.setTime(lastDay.getTime());
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      start = new Date(now.getFullYear(), qMonth, 1, 0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth() - 2, 1, 0, 0, 0, 0);
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      break;
    }
    case 'last_12_months':
    case 'all_time':
    default: {
      // 12 months rolling window
      start = new Date(now.getFullYear() - 1, now.getMonth(), 1, 0, 0, 0, 0);
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(start.getFullYear() - 1, start.getMonth(), 1, 0, 0, 0, 0);
      break;
    }
  }

  if (range === 'custom' && customStart && customEnd) {
    start = new Date(`${customStart}T00:00:00`);
    end.setTime(new Date(`${customEnd}T23:59:59`).getTime());
    const duration = end.getTime() - start.getTime();
    prevEnd = new Date(start.getTime() - 1);
    prevStart = new Date(prevEnd.getTime() - duration);
  }

  return { start, end, prevStart, prevEnd };
}

// Safe percentage calculation to avoid division by zero or infinite %
export function safePercentageChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return 0;
    return null; // Cannot calculate reliable growth from 0 base
  }
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function computeAnalytics(
  sales: Sale[],
  expenses: Expense[],
  products: Product[],
  timeRange: TimeRangeFilter = 'last_12_months',
  currencySymbol = '₹'
): AnalyticsSummary {
  const { start, end, prevStart, prevEnd } = calculateDateRangeBounds(timeRange);

  // Filter sales & expenses for Current Period vs Previous Period
  const currentSales = sales.filter(s => {
    const d = new Date(s.date + 'T00:00:00');
    return d >= start && d <= end;
  });

  const previousSales = sales.filter(s => {
    const d = new Date(s.date + 'T00:00:00');
    return d >= prevStart && d <= prevEnd;
  });

  const currentExpenses = expenses.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= start && d <= end;
  });

  const previousExpenses = expenses.filter(e => {
    const d = new Date(e.date + 'T00:00:00');
    return d >= prevStart && d <= prevEnd;
  });

  // Calculate Aggregates for Current Period
  const curRevenue = currentSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const curCOGS = currentSales.reduce((acc, s) => acc + (s.total_cost || 0), 0);
  const curGrossProfit = curRevenue - curCOGS;
  // Operating expenses: filter out items marked is_cogs to avoid double-counting
  const curOpex = currentExpenses.filter(e => !e.is_cogs).reduce((acc, e) => acc + (e.amount || 0), 0);
  const curNetProfit = curGrossProfit - curOpex;
  const curTxCount = currentSales.length;
  const curAOV = curTxCount > 0 ? curRevenue / curTxCount : 0;

  // Calculate Aggregates for Previous Period
  const prevRevenue = previousSales.reduce((acc, s) => acc + (s.total || 0), 0);
  const prevCOGS = previousSales.reduce((acc, s) => acc + (s.total_cost || 0), 0);
  const prevGrossProfit = prevRevenue - prevCOGS;
  const prevOpex = previousExpenses.filter(e => !e.is_cogs).reduce((acc, e) => acc + (e.amount || 0), 0);
  const prevNetProfit = prevGrossProfit - prevOpex;
  const prevTxCount = previousSales.length;
  const prevAOV = prevTxCount > 0 ? prevRevenue / prevTxCount : 0;

  const comparison: PeriodComparison = {
    currentRevenue: curRevenue,
    previousRevenue: prevRevenue,
    revenueChange: curRevenue - prevRevenue,
    revenueChangePct: safePercentageChange(curRevenue, prevRevenue),
    currentGrossProfit: curGrossProfit,
    previousGrossProfit: prevGrossProfit,
    grossProfitChange: curGrossProfit - prevGrossProfit,
    grossProfitChangePct: safePercentageChange(curGrossProfit, prevGrossProfit),
    currentNetProfit: curNetProfit,
    previousNetProfit: prevNetProfit,
    netProfitChange: curNetProfit - prevNetProfit,
    netProfitChangePct: safePercentageChange(curNetProfit, prevNetProfit),
    currentExpenses: curOpex,
    previousExpenses: prevOpex,
    expenseChange: curOpex - prevOpex,
    expenseChangePct: safePercentageChange(curOpex, prevOpex),
    currentTransactions: curTxCount,
    previousTransactions: prevTxCount,
    currentAOV: curAOV,
    previousAOV: prevAOV,
  };

  // Group by Month across all available historical records (at least 12 months)
  const monthlyMap = new Map<string, {
    revenue: number;
    cogs: number;
    expenses: number;
    salesCount: number;
  }>();

  for (const s of sales) {
    const mKey = s.date.substring(0, 7); // 'YYYY-MM'
    const entry = monthlyMap.get(mKey) || { revenue: 0, cogs: 0, expenses: 0, salesCount: 0 };
    entry.revenue += s.total || 0;
    entry.cogs += s.total_cost || 0;
    entry.salesCount += 1;
    monthlyMap.set(mKey, entry);
  }

  for (const e of expenses) {
    if (e.is_cogs) continue; // OPEX only
    const mKey = e.date.substring(0, 7);
    const entry = monthlyMap.get(mKey) || { revenue: 0, cogs: 0, expenses: 0, salesCount: 0 };
    entry.expenses += e.amount || 0;
    monthlyMap.set(mKey, entry);
  }

  const sortedMonthKeys = Array.from(monthlyMap.keys()).sort();
  const monthlyTrends = sortedMonthKeys.map(key => {
    const d = monthlyMap.get(key)!;
    const grossProfit = d.revenue - d.cogs;
    const netProfit = grossProfit - d.expenses;
    const aov = d.salesCount > 0 ? d.revenue / d.salesCount : 0;
    const grossMarginPct = d.revenue > 0 ? (grossProfit / d.revenue) * 100 : 0;
    const netMarginPct = d.revenue > 0 ? (netProfit / d.revenue) * 100 : 0;

    return {
      monthKey: key,
      monthLabel: formatMonthYear(key),
      revenue: d.revenue,
      cogs: d.cogs,
      grossProfit,
      expenses: d.expenses,
      netProfit,
      salesCount: d.salesCount,
      averageOrderValue: aov,
      grossMarginPct,
      netMarginPct,
    };
  });

  // Seasonal Insights
  let highestMonth: { monthLabel: string; revenue: number } | null = null;
  let lowestMonth: { monthLabel: string; revenue: number } | null = null;

  if (monthlyTrends.length > 0) {
    const sortedByRev = [...monthlyTrends].sort((a, b) => b.revenue - a.revenue);
    highestMonth = { monthLabel: sortedByRev[0].monthLabel, revenue: sortedByRev[0].revenue };
    lowestMonth = { monthLabel: sortedByRev[sortedByRev.length - 1].monthLabel, revenue: sortedByRev[sortedByRev.length - 1].revenue };
  }

  // Day of week analysis
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayRevenue = [0, 0, 0, 0, 0, 0, 0];
  for (const s of sales) {
    const day = new Date(s.date + 'T00:00:00').getDay();
    dayRevenue[day] += s.total || 0;
  }
  let bestDayIdx = 0;
  for (let i = 1; i < 7; i++) {
    if (dayRevenue[i] > dayRevenue[bestDayIdx]) bestDayIdx = i;
  }
  const bestDayOfWeek = sales.length > 0 ? dayNames[bestDayIdx] : null;

  // Product Performance aggregation
  const productSalesMap = new Map<string, { quantity: number; revenue: number; cost: number; category: string }>();
  for (const s of sales) {
    for (const item of s.items || []) {
      const prodName = item.product_name || 'Item';
      const existing = productSalesMap.get(prodName) || { quantity: 0, revenue: 0, cost: 0, category: 'General' };
      existing.quantity += item.quantity || 1;
      existing.revenue += item.total || 0;
      existing.cost += (item.purchase_cost || 0) * (item.quantity || 1);

      // Find matching product category if possible
      const p = products.find(pr => pr.id === item.product_id || pr.name.toLowerCase() === prodName.toLowerCase());
      if (p) existing.category = p.category;

      productSalesMap.set(prodName, existing);
    }
  }

  const productPerformance = Array.from(productSalesMap.entries())
    .map(([name, data]) => {
      const grossProfit = data.revenue - data.cost;
      const marginPct = data.revenue > 0 ? (grossProfit / data.revenue) * 100 : 0;
      return {
        name,
        category: data.category,
        quantitySold: data.quantity,
        revenue: data.revenue,
        grossProfit,
        marginPct,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Category Expenses Breakdown
  const expenseCatMap = new Map<string, number>();
  for (const e of currentExpenses) {
    if (e.is_cogs) continue;
    const cat = e.category || 'Miscellaneous';
    expenseCatMap.set(cat, (expenseCatMap.get(cat) || 0) + (e.amount || 0));
  }
  const categoryExpenses = Array.from(expenseCatMap.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: curOpex > 0 ? (amount / curOpex) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // GROWTH CLASSIFICATION & PLAIN-LANGUAGE INSIGHTS ENGINE
  let growthStatus: GrowthStatus = 'Insufficient data';
  let growthHeadline = 'Insufficient Data for Long-term Analysis';
  let plainLanguageExplanation = `We need at least 2 distinct monthly cycles and multiple recorded transactions to evaluate business trajectory. Start recording sales or import your historical CSV records.`;

  const monthsCount = monthlyTrends.length;
  const dataPointsCount = sales.length;

  if (monthsCount >= 2 && dataPointsCount >= 5) {
    const revPct = comparison.revenueChangePct;
    const profitPct = comparison.netProfitChangePct;

    if (revPct !== null && profitPct !== null) {
      // RULE: Increasing sales but decreasing profit -> "Profit Squeeze Warning" (not healthy growth)
      if (revPct > 3 && profitPct < -2) {
        growthStatus = 'Profit Squeeze Warning';
        growthHeadline = 'Revenue Growing, But Net Profit is Declining';
        plainLanguageExplanation = `Sales revenue expanded by ${formatPercent(revPct)} (${formatCurrency(comparison.revenueChange, currencySymbol)}), but net profit contracted by ${formatPercent(profitPct)} (${formatCurrency(comparison.netProfitChange, currencySymbol)}). Your operating costs and procurement costs rose faster than revenue. Review your highest expense categories (${categoryExpenses[0]?.category || 'Operating expenses'}) and check line-item purchase costs.`;
      } else if (revPct >= 3 && profitPct >= 2) {
        growthStatus = 'Growing';
        growthHeadline = 'Healthy Business Growth';
        plainLanguageExplanation = `Your business demonstrates strong upward momentum. Revenue increased by ${formatPercent(revPct)} (${formatCurrency(comparison.revenueChange, currencySymbol)}) and net profit expanded by ${formatPercent(profitPct)} (${formatCurrency(comparison.netProfitChange, currencySymbol)}) compared with the previous period. Both top-line sales and bottom-line profitability are expanding together.`;
      } else if (revPct < -3 || profitPct < -5) {
        growthStatus = 'Declining';
        growthHeadline = 'Business Contraction Detected';
        plainLanguageExplanation = `Sales revenue fell by ${formatPercent(revPct)} and net profit changed by ${formatPercent(profitPct)} compared with the previous period. Transaction volume changed from ${comparison.previousTransactions} to ${comparison.currentTransactions} sales. Consider promotional campaigns on your top revenue drivers (${productPerformance[0]?.name || 'key products'}) and optimizing discretionary overhead.`;
      } else {
        growthStatus = 'Relatively stable';
        growthHeadline = 'Stable Business Trajectory';
        plainLanguageExplanation = `Revenue variance is within ${formatPercent(revPct)} (${formatCurrency(comparison.revenueChange, currencySymbol)}) and net profit shifted by ${formatPercent(profitPct)}. Business operations are running predictably with steady recurring customer demand and balanced expenses.`;
      }
    } else {
      growthStatus = 'Relatively stable';
      growthHeadline = 'Baseline Performance Established';
      plainLanguageExplanation = `Recorded ${dataPointsCount} transactions across ${monthsCount} months totaling ${formatCurrency(curRevenue, currencySymbol)}. As more comparative periods accrue, detailed period-over-period percentages will unlock automatically.`;
    }
  }

  // Linear Trend Forecast for Next 2 Months (if at least 3 months data exists)
  let forecast: AnalyticsSummary['forecast'] = undefined;
  if (monthlyTrends.length >= 3) {
    const recent = monthlyTrends.slice(-4);
    const avgMonthlyRev = recent.reduce((sum, r) => sum + r.revenue, 0) / recent.length;
    const avgMonthlyProfit = recent.reduce((sum, r) => sum + r.netProfit, 0) / recent.length;

    // simple moving average slope
    const lastRev = recent[recent.length - 1].revenue;
    const prevRev = recent[0].revenue;
    const slope = (lastRev - prevRev) / (recent.length - 1);

    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + 1);
    const followingDate = new Date();
    followingDate.setMonth(followingDate.getMonth() + 2);

    forecast = {
      nextMonth: {
        label: nextDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        estimatedRevenue: Math.max(0, Math.round(avgMonthlyRev + slope * 0.5)),
        estimatedProfit: Math.max(0, Math.round(avgMonthlyProfit + (slope * 0.15))),
      },
      followingMonth: {
        label: followingDate.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
        estimatedRevenue: Math.max(0, Math.round(avgMonthlyRev + slope * 1.0)),
        estimatedProfit: Math.max(0, Math.round(avgMonthlyProfit + (slope * 0.25))),
      },
      methodologyNote: 'Projections are mathematical estimates calculated using 4-month weighted moving averages. They do not account for unforeseen market events, unexpected supplier price surges, or festival calendar shifts.',
    };
  }

  return {
    growthStatus,
    growthHeadline,
    plainLanguageExplanation,
    dataPointsCount,
    monthsCount,
    dateRange: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    },
    comparison,
    monthlyTrends,
    seasonalInsights: {
      highestMonth,
      lowestMonth,
      bestDayOfWeek,
      peakQuarter: null,
    },
    productPerformance,
    categoryExpenses,
    forecast,
  };
}
