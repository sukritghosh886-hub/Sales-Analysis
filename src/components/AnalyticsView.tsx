import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  BarChart3,
  PieChart,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  Info,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { Sale, Expense, Product, Business, TimeRangeFilter } from '../types';
import { computeAnalytics } from '../lib/analytics';
import { formatCurrency, formatPercent, formatDate } from '../lib/formatters';

interface AnalyticsViewProps {
  business: Business;
  sales: Sale[];
  expenses: Expense[];
  products: Product[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  business,
  sales,
  expenses,
  products,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('last_12_months');
  const [activeChartTab, setActiveChartTab] = useState<'REVENUE_PROFIT' | 'EXPENSES' | 'MARGINS' | 'AOV'>('REVENUE_PROFIT');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);

  const analytics = React.useMemo(() => {
    return computeAnalytics(sales, expenses, products, timeRange, business.currency_symbol);
  }, [sales, expenses, products, timeRange, business.currency_symbol]);

  const trends = analytics.monthlyTrends;
  const maxRevenue = Math.max(...trends.map(t => t.revenue), 1000);
  const maxExpense = Math.max(...trends.map(t => t.expenses), 500);
  const maxChartVal = Math.max(maxRevenue, maxExpense);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Growing':
        return {
          bg: 'bg-emerald-950/70 border-emerald-800 text-emerald-300',
          badgeBg: 'bg-emerald-900/60 text-emerald-300 border-emerald-700',
          icon: TrendingUp,
          iconColor: 'text-emerald-400',
        };
      case 'Declining':
        return {
          bg: 'bg-rose-950/70 border-rose-800 text-rose-300',
          badgeBg: 'bg-rose-900/60 text-rose-300 border-rose-700',
          icon: TrendingDown,
          iconColor: 'text-rose-400',
        };
      case 'Profit Squeeze Warning':
        return {
          bg: 'bg-amber-950/80 border-amber-800 text-amber-300',
          badgeBg: 'bg-amber-900/70 text-amber-300 border-amber-700',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'Relatively stable':
        return {
          bg: 'bg-blue-950/70 border-blue-800 text-blue-300',
          badgeBg: 'bg-blue-900/60 text-blue-300 border-blue-700',
          icon: TrendingUp,
          iconColor: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-slate-900 border-slate-800 text-slate-300',
          badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
          icon: Info,
          iconColor: 'text-slate-400',
        };
    }
  };

  const statusConfig = getStatusBadge(analytics.growthStatus);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header and Period Filter */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Long-Term Business Analytics</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 font-semibold">
              ≥12 Months Engine
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical growth, profit squeeze detection, category trends, and evidence-based forecasts
          </p>
        </div>

        {/* Time Filter Pills */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
          {(
            [
              { id: 'this_quarter', label: 'Quarter' },
              { id: 'this_year', label: 'This Year' },
              { id: 'last_12_months', label: '12 Months' },
              { id: 'all_time', label: 'All Time' },
            ] as const
          ).map(tab => (
            <button
              key={tab.id}
              onClick={() => setTimeRange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${
                timeRange === tab.id
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CORE DIFFERENTIATING FEATURE: GROWTH OR DECLINE CLASSIFICATION */}
      <div className={`p-5 rounded-2xl border ${statusConfig.bg} shadow-xl relative overflow-hidden`}>
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/10 shrink-0">
              <StatusIcon className={`w-7 h-7 ${statusConfig.iconColor}`} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Assessment:
                </span>
                <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${statusConfig.badgeBg}`}>
                  {analytics.growthStatus}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {analytics.growthHeadline}
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 mt-2 leading-relaxed max-w-3xl">
                {analytics.plainLanguageExplanation}
              </p>
            </div>
          </div>

          <div className="bg-slate-950/70 border border-white/10 rounded-xl p-3 shrink-0 text-xs w-full md:w-auto">
            <span className="text-slate-400 font-medium block">Data Scope Analyzed:</span>
            <div className="font-bold text-white mt-1 text-sm">
              {analytics.monthsCount} monthly cycles
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {analytics.dataPointsCount} recorded transactions
            </div>
            <div className="text-[10px] text-indigo-400 mt-1 font-mono">
              {analytics.dateRange.start} → {analytics.dateRange.end}
            </div>
          </div>
        </div>

        {/* Comparison Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
          <div>
            <span className="text-[11px] text-slate-300">Revenue Change</span>
            <div className="text-base font-bold text-white mt-0.5">
              {formatCurrency(analytics.comparison.currentRevenue, business.currency_symbol)}
            </div>
            <span
              className={`text-xs font-semibold flex items-center gap-0.5 ${
                (analytics.comparison.revenueChangePct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(analytics.comparison.revenueChangePct || 0) >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {formatPercent(analytics.comparison.revenueChangePct)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-300">Gross Profit (Margin)</span>
            <div className="text-base font-bold text-emerald-400 mt-0.5">
              {formatCurrency(analytics.comparison.currentGrossProfit, business.currency_symbol)}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {analytics.comparison.currentRevenue > 0
                ? ((analytics.comparison.currentGrossProfit / analytics.comparison.currentRevenue) * 100).toFixed(1) + '%'
                : '0%'} gross margin
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-300">Net Profit Change</span>
            <div className={`text-base font-bold mt-0.5 ${analytics.comparison.currentNetProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(analytics.comparison.currentNetProfit, business.currency_symbol)}
            </div>
            <span
              className={`text-xs font-semibold flex items-center gap-0.5 ${
                (analytics.comparison.netProfitChangePct || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {(analytics.comparison.netProfitChangePct || 0) >= 0 ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              {formatPercent(analytics.comparison.netProfitChangePct)}
            </span>
          </div>

          <div>
            <span className="text-[11px] text-slate-300">Operating Expenses</span>
            <div className="text-base font-bold text-rose-300 mt-0.5">
              {formatCurrency(analytics.comparison.currentExpenses, business.currency_symbol)}
            </div>
            <span className="text-xs text-slate-300 font-medium">
              {formatPercent(analytics.comparison.expenseChangePct)} vs prev period
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE VISUALIZATIONS TABS & CHART AREA */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm text-white">Interactive Performance Trends</h3>
            <p className="text-xs text-slate-400">
              Visualizing multi-month revenue, profit margins, and cost distribution
            </p>
          </div>

          {/* Chart View Switcher */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveChartTab('REVENUE_PROFIT')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeChartTab === 'REVENUE_PROFIT'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Revenue & Profit
            </button>
            <button
              onClick={() => setActiveChartTab('MARGINS')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeChartTab === 'MARGINS'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Margin % Trend
            </button>
            <button
              onClick={() => setActiveChartTab('EXPENSES')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeChartTab === 'EXPENSES'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Expense Categories
            </button>
            <button
              onClick={() => setActiveChartTab('AOV')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                activeChartTab === 'AOV'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Order Value (AOV)
            </button>
          </div>
        </div>

        {/* Tab 1: Revenue & Profit Trends (SVG Bars & Tooltips) */}
        {activeChartTab === 'REVENUE_PROFIT' && (
          <div>
            {/* Chart Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs mb-3">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-indigo-500" />
                <span className="text-slate-300">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-300">Net Profit</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500/70" />
                <span className="text-slate-300">Expenses (OPEX)</span>
              </div>
            </div>

            {/* SVG Interactive Chart */}
            {trends.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No monthly trends available yet. Record transactions or load demo data.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px] h-64 flex items-end gap-3 pt-6 pb-4 border-b border-slate-800">
                  {trends.map((item, idx) => {
                    const revHeight = maxChartVal > 0 ? (item.revenue / maxChartVal) * 190 : 0;
                    const profitHeight = maxChartVal > 0 ? Math.max(0, (item.netProfit / maxChartVal) * 190) : 0;
                    const expHeight = maxChartVal > 0 ? (item.expenses / maxChartVal) * 190 : 0;
                    const isHovered = hoveredMonthIndex === idx;

                    return (
                      <div
                        key={item.monthKey}
                        onMouseEnter={() => setHoveredMonthIndex(idx)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                        className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                      >
                        {/* Hover Tooltip */}
                        {isHovered && (
                          <div className="absolute -top-12 z-20 bg-slate-950 border border-slate-700 rounded-lg p-2 text-[10px] whitespace-nowrap shadow-xl">
                            <div className="font-bold text-white">{item.monthLabel}</div>
                            <div className="text-indigo-400">Rev: {formatCurrency(item.revenue, business.currency_symbol)}</div>
                            <div className="text-emerald-400">Profit: {formatCurrency(item.netProfit, business.currency_symbol)}</div>
                            <div className="text-rose-400">Exp: {formatCurrency(item.expenses, business.currency_symbol)}</div>
                          </div>
                        )}

                        {/* Bar Group */}
                        <div className="flex items-end gap-1 w-full justify-center">
                          {/* Revenue Bar */}
                          <div
                            style={{ height: `${Math.max(6, revHeight)}px` }}
                            className={`w-3.5 sm:w-4 rounded-t-sm transition-all ${
                              isHovered ? 'bg-indigo-400' : 'bg-indigo-500/80 group-hover:bg-indigo-400'
                            }`}
                          />
                          {/* Net Profit Bar */}
                          <div
                            style={{ height: `${Math.max(4, profitHeight)}px` }}
                            className={`w-3.5 sm:w-4 rounded-t-sm transition-all ${
                              isHovered ? 'bg-emerald-400' : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                            }`}
                          />
                          {/* Expenses Bar */}
                          <div
                            style={{ height: `${Math.max(4, expHeight)}px` }}
                            className={`w-3 sm:w-3 rounded-t-sm transition-all ${
                              isHovered ? 'bg-rose-400' : 'bg-rose-500/60 group-hover:bg-rose-400'
                            }`}
                          />
                        </div>

                        {/* Month Label */}
                        <span className="text-[10px] text-slate-400 mt-2 truncate w-full text-center">
                          {item.monthLabel.split(' ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Profit Margin % Trend */}
        {activeChartTab === 'MARGINS' && (
          <div className="space-y-4">
            <div className="text-xs text-slate-400">
              Tracking Gross Margin % (pricing efficiency) vs Net Margin % (true bottom-line health after all operating bills):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {trends.map(t => (
                <div key={t.monthKey} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white">{t.monthLabel}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Gross: <strong className="text-emerald-400">{t.grossMarginPct.toFixed(1)}%</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Net Margin</span>
                    <span className={`text-sm font-bold ${t.netMarginPct >= 0 ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {t.netMarginPct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Operating Expenses Category Breakdown */}
        {activeChartTab === 'EXPENSES' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-400 block">
              Breakdown of overhead expenses by category:
            </span>
            <div className="space-y-2">
              {analytics.categoryExpenses.map(cat => (
                <div key={cat.category} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">{cat.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {formatCurrency(cat.amount, business.currency_symbol)}
                      </span>
                      <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                        {cat.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, Math.max(3, cat.percentage))}%` }}
                      className="bg-indigo-500 h-full rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Order Value & Volume Trends */}
        {activeChartTab === 'AOV' && (
          <div className="space-y-3">
            <span className="text-xs text-slate-400 block">
              Average transaction basket size across months:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {trends.map(t => (
                <div key={t.monthKey} className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                  <span className="text-[10px] text-slate-400 block font-mono">{t.monthLabel}</span>
                  <div className="text-base font-bold text-white mt-1">
                    {formatCurrency(t.averageOrderValue, business.currency_symbol)}
                  </div>
                  <span className="text-[10px] text-indigo-400 block mt-0.5">
                    {t.salesCount} orders
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Seasonality Insights & Best/Worst Months */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Highest Revenue Month</span>
          </span>
          <div className="text-base font-bold text-white mt-1">
            {analytics.seasonalInsights.highestMonth?.monthLabel || 'N/A'}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block font-mono">
            {analytics.seasonalInsights.highestMonth
              ? formatCurrency(analytics.seasonalInsights.highestMonth.revenue, business.currency_symbol)
              : '₹0'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Lowest Revenue Month</span>
          </span>
          <div className="text-base font-bold text-white mt-1">
            {analytics.seasonalInsights.lowestMonth?.monthLabel || 'N/A'}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block font-mono">
            {analytics.seasonalInsights.lowestMonth
              ? formatCurrency(analytics.seasonalInsights.lowestMonth.revenue, business.currency_symbol)
              : '₹0'}
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
          <span className="text-[11px] font-semibold text-indigo-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Peak Day of Week</span>
          </span>
          <div className="text-base font-bold text-white mt-1">
            {analytics.seasonalInsights.bestDayOfWeek || 'N/A'}
          </div>
          <span className="text-xs text-slate-400 mt-0.5 block">
            Highest retail footfall & volume
          </span>
        </div>
      </div>

      {/* Top Performing Products Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
          <div>
            <h3 className="font-bold text-sm text-white">Top Revenue Driving Products</h3>
            <p className="text-xs text-slate-400">Best performing SKUs ranked by total sales value</p>
          </div>
          <span className="text-xs text-slate-400 font-medium">Ranked 1-10</span>
        </div>

        {analytics.productPerformance.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-500">
            No product sale records available yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Units Sold</th>
                  <th className="py-2.5 px-3 text-right">Total Revenue</th>
                  <th className="py-2.5 px-3 text-right">Gross Profit</th>
                  <th className="py-2.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {analytics.productPerformance.map((prod, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-slate-800 text-[9px] font-bold text-slate-400 flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>{prod.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{prod.category}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-slate-200">{prod.quantitySold}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">
                      {formatCurrency(prod.revenue, business.currency_symbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-emerald-400">
                      {formatCurrency(prod.grossProfit, business.currency_symbol)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                      {prod.marginPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SALES FORECAST (TRANSPARENT TREND PROJECTION) */}
      {analytics.forecast && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/60 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-white">Sales & Profit Trend Projection</h3>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              Moving Average Model
            </span>
          </div>

          <p className="text-xs text-slate-300 mb-4">
            Estimated forward baseline based on your historical trajectory:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-950/80 border border-indigo-800/40 p-4 rounded-xl">
              <span className="text-xs font-bold text-indigo-300 block">{analytics.forecast.nextMonth.label} (Next Month)</span>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Projected Revenue</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(analytics.forecast.nextMonth.estimatedRevenue, business.currency_symbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Projected Net Profit</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatCurrency(analytics.forecast.nextMonth.estimatedProfit, business.currency_symbol)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-950/80 border border-indigo-800/40 p-4 rounded-xl">
              <span className="text-xs font-bold text-indigo-300 block">{analytics.forecast.followingMonth.label} (Following Month)</span>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Projected Revenue</span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(analytics.forecast.followingMonth.estimatedRevenue, business.currency_symbol)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Projected Net Profit</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {formatCurrency(analytics.forecast.followingMonth.estimatedProfit, business.currency_symbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 flex items-start gap-1.5 leading-relaxed">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              <strong>Disclaimer:</strong> {analytics.forecast.methodologyNote} Actual historical business records remain the sole authoritative basis for accounting decisions.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
