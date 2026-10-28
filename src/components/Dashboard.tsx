import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  AlertTriangle,
  ArrowRight,
  Plus,
  Receipt,
  Package,
  Calendar,
  Sparkles,
  Info,
  CheckCircle2,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  Store,
  Clock,
  Trash2,
  Percent,
  Check,
  Tag,
} from 'lucide-react';
import { Sale, Product, Expense, Business, TimeRangeFilter } from '../types';
import { computeAnalytics } from '../lib/analytics';
import { formatCurrency, formatPercent, formatDate, getTodayDateString } from '../lib/formatters';
import { generateProactiveAlerts, generateWholesalePurchaseOrderText } from '../lib/notifications';

interface DashboardProps {
  business: Business;
  sales: Sale[];
  products: Product[];
  expenses: Expense[];
  onNavigate: (tab: any) => void;
  onNewSale: () => void;
  onNewProduct: () => void;
  onNewExpense: () => void;
  onViewReceipt: (sale: Sale) => void;
  onAdjustStock?: (productId: string, delta: number) => Promise<void>;
  onSaveSale?: (sale: Omit<Sale, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteSale?: (saleId: string) => Promise<void>;
}

export const Dashboard: React.FC<DashboardProps> = ({
  business,
  sales,
  products,
  expenses,
  onNavigate,
  onNewSale,
  onNewProduct,
  onNewExpense,
  onViewReceipt,
  onAdjustStock,
  onSaveSale,
  onDeleteSale,
}) => {
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('this_month');
  const [isAlertDetailsExpanded, setIsAlertDetailsExpanded] = useState<boolean>(true);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  // Fast Counter Entry Form State
  const [counterItemName, setCounterItemName] = useState('');
  const [counterProductId, setCounterProductId] = useState('');
  const [counterPurchaseCost, setCounterPurchaseCost] = useState<number | ''>('');
  const [counterSellingPrice, setCounterSellingPrice] = useState<number | ''>('');
  const [counterQuantity, setCounterQuantity] = useState<number>(1);
  const [counterPaymentMethod, setCounterPaymentMethod] = useState<'Cash' | 'UPI'>('Cash');
  const [isKhataDue, setIsKhataDue] = useState(false);
  const [khataCustomerName, setKhataCustomerName] = useState('');
  const [isSavingCounterSale, setIsSavingCounterSale] = useState(false);
  const [counterSuccessMsg, setCounterSuccessMsg] = useState<string | null>(null);
  const [counterErrorMsg, setCounterErrorMsg] = useState<string | null>(null);

  const todayStr = getTodayDateString();

  // Fast suggestions for retail stores
  const quickChips = [
    { name: 'Milk 500ml', cost: 28, sale: 32 },
    { name: 'Sugar 1kg', cost: 40, sale: 46 },
    { name: 'Mustard Oil 1L', cost: 125, sale: 150 },
    { name: 'Tea Leaves 250g', cost: 75, sale: 95 },
    { name: 'Wheat Flour / Atta 10kg', cost: 395, sale: 460 },
    { name: 'Toor Dal 1kg', cost: 135, sale: 160 },
    { name: 'Biscuits Family Pack', cost: 25, sale: 30 },
    { name: 'Bath Soap Pack (4 pcs)', cost: 110, sale: 140 },
    { name: 'Snacks & Namkeen 400g', cost: 88, sale: 115 },
  ];

  // Auto-fill from quick chip
  const handleSelectChip = (chip: { name: string; cost: number; sale: number }) => {
    setCounterItemName(chip.name);
    setCounterPurchaseCost(chip.cost);
    setCounterSellingPrice(chip.sale);
    const existing = products.find(p => p.name.toLowerCase().includes(chip.name.toLowerCase().split(' ')[0]));
    if (existing) {
      setCounterProductId(existing.id);
      setCounterPurchaseCost(existing.purchase_cost);
      setCounterSellingPrice(existing.selling_price);
    } else {
      setCounterProductId('');
    }
  };

  // Auto-fill from catalog select
  const handleSelectProduct = (productId: string) => {
    setCounterProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setCounterItemName(prod.name);
      setCounterPurchaseCost(prod.purchase_cost);
      setCounterSellingPrice(prod.selling_price);
    }
  };

  // Instant Profit Calculations for Counter Form
  const unitCost = typeof counterPurchaseCost === 'number' ? counterPurchaseCost : 0;
  const unitPrice = typeof counterSellingPrice === 'number' ? counterSellingPrice : 0;
  const qty = Number(counterQuantity) || 1;
  const lineTotalSale = unitPrice * qty;
  const lineTotalCost = unitCost * qty;
  const lineTotalProfit = lineTotalSale - lineTotalCost;
  const lineMarginPct = lineTotalSale > 0 ? (lineTotalProfit / lineTotalSale) * 100 : 0;

  // Submit Fast Counter Sale
  const handleCounterSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCounterSuccessMsg(null);
    setCounterErrorMsg(null);

    const nameToSave = counterItemName.trim();
    if (!nameToSave) {
      setCounterErrorMsg('Please enter an item name or select one of the quick items.');
      return;
    }
    if (unitPrice <= 0) {
      setCounterErrorMsg('Please enter the selling price for this item.');
      return;
    }

    if (!onSaveSale) {
      onNewSale();
      return;
    }

    setIsSavingCounterSale(true);
    try {
      const year = new Date().getFullYear();
      const invoiceNumber = `BILL-${year}-${Date.now().toString().slice(-5)}`;

      await onSaveSale({
        business_id: business.id,
        user_id: business.user_id,
        invoice_number: invoiceNumber,
        date: todayStr,
        customer_name: isKhataDue && khataCustomerName.trim() ? khataCustomerName.trim() : undefined,
        customer_phone: undefined,
        subtotal: lineTotalSale,
        discount: 0,
        tax: 0,
        total: lineTotalSale,
        total_cost: lineTotalCost,
        payment_method: isKhataDue ? 'Credit/Due' : counterPaymentMethod,
        payment_status: isKhataDue ? 'Unpaid' : 'Paid',
        amount_paid: isKhataDue ? 0 : lineTotalSale,
        amount_due: isKhataDue ? lineTotalSale : 0,
        notes: isKhataDue ? `Customer Due: ${khataCustomerName.trim() || 'Credit Account'}` : 'Counter Walk-in Sale',
        items: [
          {
            id: '',
            sale_id: '',
            business_id: business.id,
            user_id: business.user_id,
            product_id: counterProductId || null,
            product_name: nameToSave,
            quantity: qty,
            unit_price: unitPrice,
            purchase_cost: unitCost,
            discount: 0,
            total: lineTotalSale,
          },
        ],
      });

      setCounterSuccessMsg(
        `Sale recorded! "${nameToSave}" (${qty} pcs) — Total Sale: ${formatCurrency(lineTotalSale, business.currency_symbol)} | Profit: +${formatCurrency(lineTotalProfit, business.currency_symbol)}`
      );

      // Reset form for next customer
      setCounterItemName('');
      setCounterProductId('');
      setCounterPurchaseCost('');
      setCounterSellingPrice('');
      setCounterQuantity(1);
      setIsKhataDue(false);
      setKhataCustomerName('');

      setTimeout(() => setCounterSuccessMsg(null), 4000);
    } catch (err: any) {
      setCounterErrorMsg(err.message || 'Failed to save transaction. Please try again.');
    } finally {
      setIsSavingCounterSale(false);
    }
  };

  // Compute Today's Specific Metrics (Today's Daily Register)
  const todayMetrics = useMemo(() => {
    const todaySales = sales.filter(s => s.date === todayStr);
    const todayExpenses = expenses.filter(e => e.date === todayStr);

    const totalSale = todaySales.reduce((acc, s) => acc + s.total, 0);
    const totalCost = todaySales.reduce((acc, s) => acc + (s.total_cost || 0), 0);
    const grossProfit = totalSale - totalCost;
    const grossMarginPct = totalSale > 0 ? (grossProfit / totalSale) * 100 : 0;
    const totalExpense = todayExpenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpense;

    return {
      todaySales,
      totalSale,
      totalCost,
      grossProfit,
      grossMarginPct,
      totalExpense,
      netProfit,
      ordersCount: todaySales.length,
    };
  }, [sales, expenses, todayStr]);

  // Overall Analytics for selected time range
  const analytics = useMemo(() => {
    return computeAnalytics(sales, expenses, products, timeRange, business.currency_symbol);
  }, [sales, expenses, products, timeRange, business.currency_symbol]);

  // Proactive Alerts Engine (Low stock & wholesaler reorders)
  const proactiveAlerts = useMemo(() => {
    return generateProactiveAlerts(products, sales, business.currency_symbol);
  }, [products, sales, business.currency_symbol]);

  const multiStockAlert = proactiveAlerts.find(a => a.type === 'MULTI_LOW_STOCK');

  // Customer due / credit total
  const totalReceivables = useMemo(() => {
    return sales
      .filter(s => s.payment_status !== 'Paid')
      .reduce((sum, s) => sum + (s.amount_due || (s.total - s.amount_paid)), 0);
  }, [sales]);

  // Status badge style helper
  const getGrowthBadge = (status: string) => {
    switch (status) {
      case 'Growing':
        return {
          bg: 'bg-emerald-950/60 border-emerald-800 text-emerald-300',
          icon: TrendingUp,
          iconColor: 'text-emerald-400',
        };
      case 'Declining':
        return {
          bg: 'bg-rose-950/60 border-rose-800 text-rose-300',
          icon: TrendingDown,
          iconColor: 'text-rose-400',
        };
      case 'Profit Squeeze Warning':
        return {
          bg: 'bg-amber-950/70 border-amber-800 text-amber-300',
          icon: AlertTriangle,
          iconColor: 'text-amber-400',
        };
      case 'Relatively stable':
        return {
          bg: 'bg-blue-950/60 border-blue-800 text-blue-300',
          icon: TrendingUp,
          iconColor: 'text-blue-400',
        };
      default:
        return {
          bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
          icon: Info,
          iconColor: 'text-slate-400',
        };
    }
  };

  const badgeInfo = getGrowthBadge(analytics.growthStatus);
  const StatusIcon = badgeInfo.icon;

  // Single restock action
  const handleRestockSingle = async (productId: string, quantity: number) => {
    if (!onAdjustStock) return;
    setRestockingId(productId);
    try {
      await onAdjustStock(productId, quantity);
    } finally {
      setRestockingId(null);
    }
  };

  // Bulk restock all low items
  const handleBulkRestockAll = async () => {
    if (!onAdjustStock || !multiStockAlert?.items) return;
    setRestockingId('BULK_ALL');
    try {
      for (const item of multiStockAlert.items) {
        await onAdjustStock(item.product.id, item.recommendedOrder);
      }
    } finally {
      setRestockingId(null);
    }
  };

  // Copy WhatsApp Purchase List
  const handleCopyWholesaleList = () => {
    if (!multiStockAlert?.items) return;
    const text = generateWholesalePurchaseOrderText(
      business.name,
      multiStockAlert.items,
      business.currency_symbol
    );
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedOrderId('COPIED');
      setTimeout(() => setCopiedOrderId(null), 2500);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. QUICK COUNTER SALE ENTRY */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border-2 border-indigo-500/40 rounded-2xl p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span>Quick Counter Sale Entry</span>
                <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Fast 5-Second Entry
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Enter item name, purchase cost, and selling price — Profit is calculated in real time
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-1.5 self-end sm:self-center">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Today's Date: <strong className="text-white">{formatDate(todayStr)}</strong></span>
          </div>
        </div>

        {/* Success / Error Banners */}
        {counterSuccessMsg && (
          <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2 font-medium animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{counterSuccessMsg}</span>
          </div>
        )}

        {counterErrorMsg && (
          <div className="mt-3 p-3 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center gap-2 font-medium">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{counterErrorMsg}</span>
          </div>
        )}

        {/* 1-Tap Popular Item Chips */}
        <div className="mt-4">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Quick 1-Tap Popular Items (Or type your own below):
          </span>
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectChip(chip)}
                className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 hover:border-indigo-400 text-slate-200 hover:text-white border border-slate-700/80 text-xs transition flex items-center gap-1 cursor-pointer"
              >
                <span>{chip.name}</span>
                <span className="text-[10px] text-emerald-400 font-mono">₹{chip.sale}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Counter Sale Input Form */}
        <form onSubmit={handleCounterSaleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Item Name / Catalog Select */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Item Name *
              </label>
              <div className="space-y-1.5">
                <input
                  type="text"
                  required
                  placeholder="e.g. Milk 500ml, Sugar 1kg, Atta 10kg, Tea..."
                  value={counterItemName}
                  onChange={e => {
                    setCounterItemName(e.target.value);
                    setCounterProductId('');
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                {products.length > 0 && (
                  <select
                    value={counterProductId}
                    onChange={e => handleSelectProduct(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-slate-400 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">Or select from store inventory...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — Cost: ₹{p.purchase_cost} | Sale: ₹{p.selling_price} (Stock: {p.stock_quantity})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Purchase Cost */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Purchase Cost (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="₹ Cost"
                value={counterPurchaseCost}
                onChange={e => setCounterPurchaseCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">What you paid for it</span>
            </div>

            {/* Selling Price */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Selling Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                placeholder="₹ Price"
                value={counterSellingPrice}
                onChange={e => setCounterSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-indigo-500/60 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-indigo-400"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Price sold to customer</span>
            </div>

            {/* Quantity */}
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Qty
              </label>
              <input
                type="number"
                min="1"
                step="any"
                required
                value={counterQuantity}
                onChange={e => setCounterQuantity(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs sm:text-sm text-center font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Payment Mode (Cash / UPI) */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Payment
              </label>
              <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setCounterPaymentMethod('Cash')}
                  className={`py-1 text-xs font-semibold rounded-lg transition ${
                    counterPaymentMethod === 'Cash'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Cash
                </button>
                <button
                  type="button"
                  onClick={() => setCounterPaymentMethod('UPI')}
                  className={`py-1 text-xs font-semibold rounded-lg transition ${
                    counterPaymentMethod === 'UPI'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  UPI
                </button>
              </div>
            </div>
          </div>

          {/* Real-time Profit Preview Bar & Save Action */}
          <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            {/* Live Profit Calculation */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Total Sale:</span>
                <strong className="text-white text-sm font-mono">
                  {formatCurrency(lineTotalSale, business.currency_symbol)}
                </strong>
              </div>
              <span className="text-slate-700">|</span>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Cost:</span>
                <strong className="text-slate-300 text-sm font-mono">
                  {formatCurrency(lineTotalCost, business.currency_symbol)}
                </strong>
              </div>
              <span className="text-slate-700">|</span>
              <div>
                <span className="text-slate-400 block text-[10px]">Profit on this item:</span>
                <span
                  className={`text-sm font-bold font-mono px-2 py-0.5 rounded-lg inline-flex items-center gap-1 ${
                    lineTotalProfit >= 0
                      ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                      : 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                  }`}
                >
                  {lineTotalProfit >= 0 ? '+' : ''}
                  {formatCurrency(lineTotalProfit, business.currency_symbol)} ({lineMarginPct.toFixed(1)}%)
                </span>
              </div>
            </div>

            {/* Optional Credit / Due toggle & Save Button */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isKhataDue}
                  onChange={e => setIsKhataDue(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <span className={isKhataDue ? 'text-amber-300 font-semibold' : ''}>Credit / Customer Due?</span>
              </label>

              {isKhataDue && (
                <input
                  type="text"
                  placeholder="Customer name (Optional)..."
                  value={khataCustomerName}
                  onChange={e => setKhataCustomerName(e.target.value)}
                  className="bg-slate-900 border border-amber-600/70 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none"
                />
              )}

              <button
                type="submit"
                disabled={isSavingCounterSale}
                className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{isSavingCounterSale ? 'Saving...' : 'Record Sale (+ Save)'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. TODAY'S DAILY REGISTER (DAILY PROFIT & LOSS OVERVIEW) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">Today's Daily Register</h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              {todayMetrics.ordersCount} Counter Transactions Today
            </span>
          </div>

          <span className="text-xs text-slate-400">
            {formatDate(todayStr)}
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Today's Total Sales */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">1. Today's Total Sales</span>
            <div className="text-lg sm:text-xl font-extrabold text-white font-mono tracking-tight">
              {formatCurrency(todayMetrics.totalSale, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-indigo-400 block mt-1">
              {todayMetrics.ordersCount} counter bills
            </span>
          </div>

          {/* Today's Cost of Goods */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">2. Purchase Cost of Goods</span>
            <div className="text-lg sm:text-xl font-extrabold text-slate-300 font-mono tracking-tight">
              {formatCurrency(todayMetrics.totalCost, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Direct cost of items sold
            </span>
          </div>

          {/* Gross Margin / Profit */}
          <div className="bg-slate-900/80 border border-emerald-900/50 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">3. Gross Profit (Sales Margin)</span>
            <div className="text-lg sm:text-xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatCurrency(todayMetrics.grossProfit, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-emerald-400/80 block mt-1 font-semibold">
              {todayMetrics.grossMarginPct.toFixed(1)}% margin
            </span>
          </div>

          {/* Today's Shop Expenses */}
          <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl shadow-sm">
            <span className="text-[11px] font-medium text-slate-400 block mb-1">4. Shop Operating Expenses</span>
            <div className="text-lg sm:text-xl font-extrabold text-amber-400 font-mono tracking-tight">
              {formatCurrency(todayMetrics.totalExpense, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Tea, bags, power, misc
            </span>
          </div>

          {/* Net In-Hand Profit */}
          <div className={`p-3.5 rounded-2xl shadow-sm border col-span-2 lg:col-span-1 ${
            todayMetrics.netProfit >= 0
              ? 'bg-gradient-to-br from-emerald-950/80 to-slate-900 border-emerald-600/60'
              : 'bg-rose-950/60 border-rose-800'
          }`}>
            <span className="text-[11px] font-bold text-slate-300 block mb-1">5. Net In-Hand Profit</span>
            <div className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${
              todayMetrics.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'
            }`}>
              {todayMetrics.netProfit >= 0 ? '+' : ''}
              {formatCurrency(todayMetrics.netProfit, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              After all shop expenses
            </span>
          </div>
        </div>
      </div>

      {/* 3. WHOLESALE RESTOCK ALERT (Multi-Product Low Stock Alert) */}
      {multiStockAlert && (
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-amber-950/60 border border-rose-700/60 rounded-2xl p-4 sm:p-5 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-rose-900/40">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-600 text-white shrink-0 shadow-md shadow-rose-600/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-white">
                    {multiStockAlert.title}
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Reorder Alert
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {multiStockAlert.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleCopyWholesaleList}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
              >
                {copiedOrderId === 'COPIED' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">List Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>WhatsApp Order List</span>
                  </>
                )}
              </button>

              <button
                onClick={() => setIsAlertDetailsExpanded(!isAlertDetailsExpanded)}
                className="p-1.5 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white"
              >
                {isAlertDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Sub-threshold Items List */}
          {isAlertDetailsExpanded && (
            <div className="mt-3 bg-slate-950/70 border border-rose-900/30 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-semibold border-b border-rose-900/30">
                    <tr>
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3 text-center">Remaining Stock</th>
                      <th className="py-2 px-3 text-center">Reorder Threshold</th>
                      <th className="py-2 px-3 text-center">Recommended Order</th>
                      <th className="py-2 px-3 text-right">Est. Cost (₹)</th>
                      <th className="py-2 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {multiStockAlert.items?.map(it => (
                      <tr key={it.product.id} className="hover:bg-rose-950/20 transition">
                        <td className="py-2 px-3 font-semibold text-white">
                          {it.product.name}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            {it.product.stock_quantity} {it.product.unit}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center text-slate-400">
                          {it.product.reorder_threshold} {it.product.unit}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-indigo-400">
                          +{it.recommendedOrder} {it.product.unit}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-slate-200">
                          {formatCurrency(it.estimatedCost, business.currency_symbol)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <button
                            disabled={restockingId !== null}
                            onClick={() => handleRestockSingle(it.product.id, it.recommendedOrder)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition disabled:opacity-40"
                          >
                            {restockingId === it.product.id ? 'Restocking...' : `+${it.recommendedOrder} Units`}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-slate-900/90 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
                <span className="text-xs text-slate-400">
                  Total Wholesale Procurement Budget:{' '}
                  <strong className="text-white font-mono">
                    {formatCurrency(multiStockAlert.totalEstimatedCost || 0, business.currency_symbol)}
                  </strong>
                </span>

                <button
                  disabled={restockingId !== null}
                  onClick={handleBulkRestockAll}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {restockingId === 'BULK_ALL' ? 'Restocking All...' : `1-Click Restock All (${multiStockAlert.items?.length} Items)`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. FINANCIAL COMPARISON & TIME RANGE FILTER */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Profit & Loss Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Total sales, product procurement cost, and net shop earnings for the selected period
            </p>
          </div>

          {/* Time Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {(
              [
                { id: 'today', label: 'Today' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'this_year', label: 'This Year' },
                { id: 'all_time', label: 'All Time' },
              ] as const
            ).map(t => (
              <button
                key={t.id}
                onClick={() => setTimeRange(t.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                  timeRange === t.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Period Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Revenue */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Total Sales</span>
            <div className="text-lg font-bold text-white mt-1 font-mono">
              {formatCurrency(analytics.comparison.currentRevenue, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {analytics.comparison.currentTransactions} counter transactions
            </span>
          </div>

          {/* Cost of Goods Sold */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Cost of Goods Sold (COGS)</span>
            <div className="text-lg font-bold text-slate-300 mt-1 font-mono">
              {formatCurrency(analytics.comparison.currentRevenue - analytics.comparison.currentGrossProfit, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Purchase cost of items sold
            </span>
          </div>

          {/* Gross Margin */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Gross Profit (Margin)</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
              {formatCurrency(analytics.comparison.currentGrossProfit, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-emerald-400/80 mt-1 block font-semibold">
              {analytics.comparison.currentRevenue > 0
                ? ((analytics.comparison.currentGrossProfit / analytics.comparison.currentRevenue) * 100).toFixed(1) + '%'
                : '0%'} margin
            </span>
          </div>

          {/* Net Profit */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
            <span className="text-[11px] text-slate-400 font-medium block">Net In-Hand Profit</span>
            <div className={`text-lg font-bold mt-1 font-mono ${analytics.comparison.currentNetProfit >= 0 ? 'text-white' : 'text-rose-400'}`}>
              {formatCurrency(analytics.comparison.currentNetProfit, business.currency_symbol)}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              After deducting all expenses
            </span>
          </div>
        </div>

        {/* Business Trajectory Banner */}
        <div className={`p-3.5 rounded-xl border ${badgeInfo.bg} flex items-center justify-between gap-3 text-xs`}>
          <div className="flex items-center gap-2.5">
            <StatusIcon className={`w-4 h-4 shrink-0 ${badgeInfo.iconColor}`} />
            <div>
              <span className="font-bold uppercase tracking-wider">{analytics.growthStatus}:</span>{' '}
              <span className="text-slate-300">{analytics.plainLanguageExplanation}</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate('analytics')}
            className="shrink-0 flex items-center gap-1 font-semibold text-indigo-400 hover:text-indigo-300"
          >
            <span>View Deep Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. ITEM-WISE PROFIT & LOSS BREAKDOWN */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Product-wise Profit & Loss Analysis
            </h3>
            <p className="text-xs text-slate-400">
              Breakdown of purchase cost, selling price, and profit margin for each item
            </p>
          </div>
          <button
            onClick={() => onNavigate('products')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>Manage Products ({products.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Product Name</th>
                <th className="py-2.5 px-3 text-right">Purchase Cost</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-center">Qty Sold</th>
                <th className="py-2.5 px-3 text-right">Total Sales</th>
                <th className="py-2.5 px-3 text-right">Total Profit (₹)</th>
                <th className="py-2.5 px-3 text-center">Margin %</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {analytics.productPerformance.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No sales recorded for the selected time range.
                  </td>
                </tr>
              ) : (
                analytics.productPerformance.slice(0, 10).map((item, idx) => {
                  const matchedProduct = products.find(p => p.name === item.name);
                  const costPerUnit = matchedProduct ? matchedProduct.purchase_cost : (item.quantitySold > 0 ? (item.revenue - item.grossProfit) / item.quantitySold : 0);
                  const pricePerUnit = item.quantitySold > 0 ? item.revenue / item.quantitySold : 0;
                  const isHighProfit = item.marginPct >= 20;
                  const isLoss = item.grossProfit < 0;

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-white block">{item.name}</span>
                        <span className="text-[10px] text-slate-500">{item.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatCurrency(costPerUnit, business.currency_symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-400 font-semibold">
                        {formatCurrency(pricePerUnit, business.currency_symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">
                        {item.quantitySold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-200">
                        {formatCurrency(item.revenue, business.currency_symbol)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold">
                        <span className={item.grossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {item.grossProfit >= 0 ? '+' : ''}{formatCurrency(item.grossProfit, business.currency_symbol)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          isHighProfit
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : isLoss
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}>
                          {item.marginPct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isHighProfit ? (
                          <span className="text-[10px] text-emerald-400 font-semibold">★ Top Earner</span>
                        ) : isLoss ? (
                          <span className="text-[10px] text-rose-400 font-semibold">⚠ Loss Alert</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. TODAY'S RECENT COUNTER TRANSACTIONS */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Today's Live Sales Register
            </h3>
            <p className="text-xs text-slate-400">Live stream of transactions recorded at the counter today</p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
          >
            <span>View Full Sales Register ({sales.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayMetrics.todaySales.length === 0 ? (
          <div className="text-center py-8 bg-slate-950/40 rounded-xl border border-slate-800/80">
            <Store className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-slate-400 font-medium">No sales recorded yet today.</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Use the quick counter entry box above to record your first transaction!
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {todayMetrics.todaySales.slice(0, 8).map(sale => {
              const saleCost = sale.total_cost || 0;
              const saleProfit = sale.total - saleCost;
              const itemSummary = sale.items?.map(i => `${i.product_name} (${i.quantity})`).join(', ') || 'Counter Sale';

              return (
                <div
                  key={sale.id}
                  className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{itemSummary}</span>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">
                          {sale.invoice_number}
                        </span>
                        {sale.customer_name && (
                          <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/60 border border-amber-800 px-1.5 py-0.5 rounded">
                            Due: {sale.customer_name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>Payment: <strong className="text-slate-300">{sale.payment_method}</strong></span>
                        <span>•</span>
                        <span>Cost: {formatCurrency(saleCost, business.currency_symbol)}</span>
                        <span>•</span>
                        <span>Sale: {formatCurrency(sale.total, business.currency_symbol)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    <div className="text-right">
                      <div className="font-bold text-xs sm:text-sm text-white font-mono">
                        {formatCurrency(sale.total, business.currency_symbol)}
                      </div>
                      <span className="text-[10px] font-bold text-emerald-400 font-mono">
                        Profit: +{formatCurrency(saleProfit, business.currency_symbol)}
                      </span>
                    </div>

                    <button
                      onClick={() => onViewReceipt(sale)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Print Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {onDeleteSale && (
                      <button
                        onClick={() => onDeleteSale(sale.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
