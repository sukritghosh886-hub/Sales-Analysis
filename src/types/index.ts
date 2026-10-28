export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';
export type StoreType = 'shop';

export interface Business {
  id: string;
  user_id: string;
  name: string;
  store_type?: StoreType;
  category: string;
  currency: CurrencyCode;
  currency_symbol: string;
  tax_id?: string; // GSTIN or PAN
  phone?: string;
  address?: string;
  fiscal_year_start: number; // 4 for April (Indian FY)
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  user_id: string;
  name: string;
  sku: string;
  category: string;
  purchase_cost: number; // Cost price (for COGS)
  selling_price: number;
  stock_quantity: number;
  reorder_threshold: number;
  unit: string; // 'pcs', 'kg', 'liter', 'box', etc.
  outlet_name?: string; // For Shopping Mall multi-outlet setups
  created_at: string;
  updated_at: string;
}

export type PaymentMethod = 'Cash' | 'UPI' | 'Card' | 'Net Banking' | 'Credit/Due' | 'Cheque';
export type PaymentStatus = 'Paid' | 'Partial' | 'Unpaid';

export interface SaleItem {
  id: string;
  sale_id: string;
  business_id: string;
  user_id: string;
  product_id?: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  purchase_cost: number;
  discount: number;
  total: number;
  created_at?: string;
}

export interface Sale {
  id: string;
  business_id: string;
  user_id: string;
  invoice_number: string;
  date: string; // 'YYYY-MM-DD'
  customer_name?: string;
  customer_phone?: string;
  subtotal: number;
  discount: number;
  tax: number; // GST or sales tax
  total: number;
  total_cost: number; // COGS
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  amount_paid: number;
  amount_due: number;
  notes?: string;
  outlet_name?: string; // e.g., 'Ground Floor Outlet', 'Food Court 2B'
  items: SaleItem[];
  created_at: string;
}

export type ExpenseCategory =
  | 'Rent'
  | 'Utilities & Electricity'
  | 'Salaries & Staff'
  | 'Logistics & Transport'
  | 'Packaging & Supplies'
  | 'Marketing & Ads'
  | 'Repairs & Maintenance'
  | 'Tea & Refreshments'
  | 'Taxes & Compliance'
  | 'Direct Product Cost'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  business_id: string;
  user_id: string;
  date: string; // 'YYYY-MM-DD'
  category: ExpenseCategory | string;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  reference_no?: string;
  outlet_name?: string; // Optional outlet assignment for malls
  is_cogs: boolean; // OPEX vs COGS
  created_at: string;
}

export interface ImportJob {
  id: string;
  business_id: string;
  user_id: string;
  type: 'sales' | 'products' | 'expenses';
  filename: string;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  errors: Array<{ row: number; error: string; rawData?: any }>;
  created_at: string;
}

export type GrowthStatus = 'Growing' | 'Declining' | 'Relatively stable' | 'Profit Squeeze Warning' | 'Insufficient data';

export interface PeriodComparison {
  currentRevenue: number;
  previousRevenue: number;
  revenueChange: number;
  revenueChangePct: number | null; // null if comparison invalid
  currentGrossProfit: number;
  previousGrossProfit: number;
  grossProfitChange: number;
  grossProfitChangePct: number | null;
  currentNetProfit: number;
  previousNetProfit: number;
  netProfitChange: number;
  netProfitChangePct: number | null;
  currentExpenses: number;
  previousExpenses: number;
  expenseChange: number;
  expenseChangePct: number | null;
  currentTransactions: number;
  previousTransactions: number;
  currentAOV: number;
  previousAOV: number;
}

export interface AnalyticsSummary {
  growthStatus: GrowthStatus;
  growthHeadline: string;
  plainLanguageExplanation: string;
  dataPointsCount: number;
  monthsCount: number;
  dateRange: { start: string; end: string };
  comparison: PeriodComparison;
  monthlyTrends: Array<{
    monthKey: string; // '2025-01'
    monthLabel: string; // 'Jan 2025'
    revenue: number;
    cogs: number;
    grossProfit: number;
    expenses: number;
    netProfit: number;
    salesCount: number;
    averageOrderValue: number;
    grossMarginPct: number;
    netMarginPct: number;
  }>;
  seasonalInsights: {
    highestMonth: { monthLabel: string; revenue: number } | null;
    lowestMonth: { monthLabel: string; revenue: number } | null;
    bestDayOfWeek: string | null;
    peakQuarter: string | null;
  };
  productPerformance: Array<{
    name: string;
    category: string;
    quantitySold: number;
    revenue: number;
    grossProfit: number;
    marginPct: number;
  }>;
  categoryExpenses: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  forecast?: {
    nextMonth: { label: string; estimatedRevenue: number; estimatedProfit: number };
    followingMonth: { label: string; estimatedRevenue: number; estimatedProfit: number };
    methodologyNote: string;
  };
}

export type TimeRangeFilter =
  | 'today'
  | 'this_week'
  | 'this_month'
  | 'last_month'
  | 'this_quarter'
  | 'this_year'
  | 'last_12_months'
  | 'all_time'
  | 'custom';
