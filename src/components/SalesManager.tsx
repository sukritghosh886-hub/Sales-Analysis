import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Printer,
  X,
  CreditCard,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
  Store,
  ArrowRight,
  Edit2,
  Calendar,
} from 'lucide-react';
import { Sale, SaleItem, Product, Business, PaymentMethod, PaymentStatus } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../lib/formatters';
import { exportSalesToCSV } from '../lib/csvHelper';

interface SalesManagerProps {
  business: Business;
  sales: Sale[];
  products: Product[];
  onSaveSale: (sale: Omit<Sale, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteSale: (saleId: string) => Promise<void>;
  onViewReceipt: (sale: Sale) => void;
  isOpenNewModalDefault?: boolean;
}

export const SalesManager: React.FC<SalesManagerProps> = ({
  business,
  sales,
  products,
  onSaveSale,
  onDeleteSale,
  onViewReceipt,
  isOpenNewModalDefault = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PaymentStatus>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | PaymentMethod>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(isOpenNewModalDefault);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [saleToDelete, setSaleToDelete] = useState<Sale | null>(null);

  // Fast Counter Form State
  const [quickItemName, setQuickItemName] = useState('');
  const [quickProductId, setQuickProductId] = useState('');
  const [quickCost, setQuickCost] = useState<number | ''>('');
  const [quickPrice, setQuickPrice] = useState<number | ''>('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickPayment, setQuickPayment] = useState<'Cash' | 'UPI'>('Cash');
  const [quickIsDue, setQuickIsDue] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickSuccessMsg, setQuickSuccessMsg] = useState<string | null>(null);
  const [quickErrorMsg, setQuickErrorMsg] = useState<string | null>(null);
  const [isSavingQuick, setIsSavingQuick] = useState(false);

  // Modal Form State (for multi-item sales or editing)
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [saleDate, setSaleDate] = useState(getTodayDateString());
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Paid');
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [modalFormError, setModalFormError] = useState<string | null>(null);

  const [lineItems, setLineItems] = useState<
    Array<{
      product_id?: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      purchase_cost: number;
      total: number;
    }>
  >([
    {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      purchase_cost: 0,
      total: 0,
    },
  ]);

  const todayStr = getTodayDateString();

  // Popular item suggestions
  const quickChips = [
    { name: 'Milk 500ml', cost: 28, sale: 32 },
    { name: 'Sugar 1kg', cost: 40, sale: 46 },
    { name: 'Cooking Oil 1L', cost: 125, sale: 150 },
    { name: 'Tea Leaves 250g', cost: 75, sale: 95 },
    { name: 'Flour / Atta 10kg', cost: 395, sale: 460 },
    { name: 'Lentils / Pulses 1kg', cost: 135, sale: 160 },
    { name: 'Biscuits Pack', cost: 25, sale: 30 },
    { name: 'Soap / Toiletries Pack', cost: 110, sale: 140 },
  ];

  const handleSelectQuickChip = (chip: { name: string; cost: number; sale: number }) => {
    setQuickItemName(chip.name);
    setQuickCost(chip.cost);
    setQuickPrice(chip.sale);
    const existing = products.find(p => p.name.toLowerCase().includes(chip.name.toLowerCase().split(' ')[0]));
    if (existing) {
      setQuickProductId(existing.id);
      setQuickCost(existing.purchase_cost);
      setQuickPrice(existing.selling_price);
    } else {
      setQuickProductId('');
    }
  };

  const handleSelectQuickProduct = (productId: string) => {
    setQuickProductId(productId);
    const prod = products.find(p => p.id === productId);
    if (prod) {
      setQuickItemName(prod.name);
      setQuickCost(prod.purchase_cost);
      setQuickPrice(prod.selling_price);
    }
  };

  const quickCostVal = typeof quickCost === 'number' ? quickCost : 0;
  const quickPriceVal = typeof quickPrice === 'number' ? quickPrice : 0;
  const quickQtyVal = Number(quickQty) || 1;
  const quickTotalSale = quickPriceVal * quickQtyVal;
  const quickTotalCost = quickCostVal * quickQtyVal;
  const quickProfit = quickTotalSale - quickTotalCost;
  const quickMarginPct = quickTotalSale > 0 ? (quickProfit / quickTotalSale) * 100 : 0;

  // Handle Quick Counter Sale
  const handleQuickSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSuccessMsg(null);
    setQuickErrorMsg(null);

    const nameToSave = quickItemName.trim();
    if (!nameToSave) {
      setQuickErrorMsg('Please enter an item name or select a quick suggestion below.');
      return;
    }
    if (quickPriceVal <= 0) {
      setQuickErrorMsg('Please enter a valid selling price greater than 0.');
      return;
    }

    setIsSavingQuick(true);
    try {
      const year = new Date().getFullYear();
      const invoiceNumber = `BILL-${year}-${Date.now().toString().slice(-5)}`;

      await onSaveSale({
        business_id: business.id,
        user_id: business.user_id,
        invoice_number: invoiceNumber,
        date: todayStr,
        customer_name: quickIsDue && quickCustomerName.trim() ? quickCustomerName.trim() : undefined,
        customer_phone: undefined,
        subtotal: quickTotalSale,
        discount: 0,
        tax: 0,
        total: quickTotalSale,
        total_cost: quickTotalCost,
        payment_method: quickIsDue ? 'Credit/Due' : quickPayment,
        payment_status: quickIsDue ? 'Unpaid' : 'Paid',
        amount_paid: quickIsDue ? 0 : quickTotalSale,
        amount_due: quickIsDue ? quickTotalSale : 0,
        notes: quickIsDue ? `Customer Due: ${quickCustomerName.trim() || 'Local Customer'}` : 'Counter Walk-in Sale',
        items: [
          {
            id: '',
            sale_id: '',
            business_id: business.id,
            user_id: business.user_id,
            product_id: quickProductId || null,
            product_name: nameToSave,
            quantity: quickQtyVal,
            unit_price: quickPriceVal,
            purchase_cost: quickCostVal,
            discount: 0,
            total: quickTotalSale,
          },
        ],
      });

      setQuickSuccessMsg(
        `✅ Sale recorded! "${nameToSave}" — Total Sale: ₹${quickTotalSale} | Gross Profit: +₹${quickProfit}`
      );

      // Reset
      setQuickItemName('');
      setQuickProductId('');
      setQuickCost('');
      setQuickPrice('');
      setQuickQty(1);
      setQuickIsDue(false);
      setQuickCustomerName('');
      setTimeout(() => setQuickSuccessMsg(null), 3500);
    } catch (err: any) {
      setQuickErrorMsg(err.message || 'Failed to save sale record.');
    } finally {
      setIsSavingQuick(false);
    }
  };

  // Modal Handlers
  const openCreateModal = () => {
    setEditingSale(null);
    setModalFormError(null);
    const year = new Date().getFullYear();
    const nextSeq = sales.length + 1001;
    setInvoiceNumber(`BILL-${year}-${nextSeq}`);
    setSaleDate(todayStr);
    setCustomerName('');
    setPaymentMethod('Cash');
    setPaymentStatus('Paid');
    setDiscountAmount(0);
    setNotes('');
    setLineItems([
      {
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        purchase_cost: 0,
        total: 0,
      },
    ]);
    setIsModalOpen(true);
  };

  const openEditModal = (sale: Sale) => {
    setEditingSale(sale);
    setModalFormError(null);
    setInvoiceNumber(sale.invoice_number);
    setSaleDate(sale.date);
    setCustomerName(sale.customer_name || '');
    setPaymentMethod(sale.payment_method);
    setPaymentStatus(sale.payment_status);
    setDiscountAmount(sale.discount || 0);
    setNotes(sale.notes || '');

    if (sale.items && sale.items.length > 0) {
      setLineItems(
        sale.items.map(it => ({
          product_id: it.product_id || '',
          product_name: it.product_name,
          quantity: it.quantity,
          unit_price: it.unit_price,
          purchase_cost: it.purchase_cost,
          total: it.total,
        }))
      );
    } else {
      setLineItems([
        {
          product_id: '',
          product_name: 'Counter Item',
          quantity: 1,
          unit_price: sale.total,
          purchase_cost: sale.total_cost,
          total: sale.total,
        },
      ]);
    }

    setIsModalOpen(true);
  };

  const handleItemProductSelect = (index: number, productId: string) => {
    const updated = [...lineItems];
    const product = products.find(p => p.id === productId);
    if (product) {
      updated[index].product_id = product.id;
      updated[index].product_name = product.name;
      updated[index].unit_price = product.selling_price;
      updated[index].purchase_cost = product.purchase_cost;
      updated[index].total = product.selling_price * updated[index].quantity;
    } else {
      updated[index].product_id = '';
    }
    setLineItems(updated);
  };

  const handleItemQtyChange = (index: number, qty: number) => {
    const updated = [...lineItems];
    updated[index].quantity = qty;
    updated[index].total = updated[index].unit_price * qty;
    setLineItems(updated);
  };

  const handleItemPriceChange = (index: number, price: number) => {
    const updated = [...lineItems];
    updated[index].unit_price = price;
    updated[index].total = price * updated[index].quantity;
    setLineItems(updated);
  };

  const handleItemCostChange = (index: number, cost: number) => {
    const updated = [...lineItems];
    updated[index].purchase_cost = cost;
    setLineItems(updated);
  };

  const handleItemNameChange = (index: number, name: string) => {
    const updated = [...lineItems];
    updated[index].product_name = name;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        product_id: '',
        product_name: '',
        quantity: 1,
        unit_price: 0,
        purchase_cost: 0,
        total: 0,
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, idx) => idx !== index));
  };

  const modalSubtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const modalTotalCost = lineItems.reduce((sum, item) => sum + item.purchase_cost * item.quantity, 0);
  const modalGrandTotal = Math.max(0, modalSubtotal - discountAmount);
  const modalGrossProfit = modalGrandTotal - modalTotalCost;

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFormError(null);

    const validItems = lineItems.filter(it => it.product_name.trim() !== '');
    if (validItems.length === 0) {
      setModalFormError('Please enter at least one item name.');
      return;
    }

    const salePayload = {
      id: editingSale ? editingSale.id : undefined,
      business_id: business.id,
      user_id: business.user_id,
      invoice_number: invoiceNumber || `BILL-${Date.now()}`,
      date: saleDate,
      customer_name: customerName.trim() || undefined,
      customer_phone: undefined,
      subtotal: modalSubtotal,
      discount: discountAmount,
      tax: 0,
      total: modalGrandTotal,
      total_cost: modalTotalCost,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      amount_paid: paymentStatus === 'Paid' ? modalGrandTotal : paymentStatus === 'Unpaid' ? 0 : modalGrandTotal / 2,
      amount_due: paymentStatus === 'Paid' ? 0 : paymentStatus === 'Unpaid' ? modalGrandTotal : modalGrandTotal / 2,
      notes: notes.trim() || undefined,
      items: validItems.map(it => ({
        id: '',
        sale_id: editingSale ? editingSale.id : '',
        business_id: business.id,
        user_id: business.user_id,
        product_id: it.product_id || null,
        product_name: it.product_name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        purchase_cost: it.purchase_cost,
        discount: 0,
        total: it.total,
      })),
    };

    await onSaveSale(salePayload);
    setIsModalOpen(false);
  };

  // Filtered Sales
  const filteredSales = sales.filter(s => {
    const matchesSearch =
      s.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.items && s.items.some(i => i.product_name.toLowerCase().includes(searchTerm.toLowerCase())));

    const matchesStatus = statusFilter === 'ALL' || s.payment_status === statusFilter;
    const matchesMethod = methodFilter === 'ALL' || s.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  const totalFilteredRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalFilteredCost = filteredSales.reduce((acc, s) => acc + (s.total_cost || 0), 0);
  const totalFilteredProfit = totalFilteredRevenue - totalFilteredCost;
  const totalFilteredDue = filteredSales.reduce(
    (acc, s) => acc + (s.amount_due || (s.payment_status !== 'Paid' ? s.total : 0)),
    0
  );

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* 1. TOP HEADER & CSV EXPORT */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Sales Register</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Daily Counter Sales & Profit
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record counter sales, track purchase cost of goods and real-time gross profit
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportSalesToCSV(sales)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Multi-Item Bill</span>
          </button>
        </div>
      </div>

      {/* 2. FAST COUNTER ENTRY PINNED AT TOP */}
      <div className="bg-slate-900/90 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-lg">
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-white">Quick Counter Sale Entry (Fast 5-Second Sale)</h3>
          </div>
          <span className="text-[11px] text-slate-400">
            No customer phone required
          </span>
        </div>

        {quickSuccessMsg && (
          <div className="mt-2.5 p-2.5 bg-emerald-950/80 border border-emerald-600/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{quickSuccessMsg}</span>
          </div>
        )}

        {quickErrorMsg && (
          <div className="mt-2.5 p-2.5 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{quickErrorMsg}</span>
          </div>
        )}

        {/* 1-Tap Chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuickChip(chip)}
              className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <span>{chip.name}</span>
              <span className="text-[10px] text-emerald-400 font-mono">₹{chip.sale}</span>
            </button>
          ))}
        </div>

        {/* Quick Form */}
        <form onSubmit={handleQuickSaleSubmit} className="mt-3 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Item Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Milk, Sugar, Rice, Biscuits..."
              value={quickItemName}
              onChange={e => {
                setQuickItemName(e.target.value);
                setQuickProductId('');
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Purchase Cost (₹)</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="₹ Cost"
              value={quickCost}
              onChange={e => setQuickCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Selling Price (₹)</label>
            <input
              type="number"
              min="0"
              step="any"
              required
              placeholder="₹ Price"
              value={quickPrice}
              onChange={e => setQuickPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
              className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Qty</label>
            <input
              type="number"
              min="1"
              required
              value={quickQty}
              onChange={e => setQuickQty(parseFloat(e.target.value) || 1)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-center font-bold text-white focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3 flex items-center gap-2">
            <div className="flex bg-slate-950 border border-slate-700 p-0.5 rounded-lg shrink-0">
              <button
                type="button"
                onClick={() => setQuickPayment('Cash')}
                className={`px-2 py-1 text-[11px] font-semibold rounded ${
                  quickPayment === 'Cash' ? 'bg-emerald-600 text-white' : 'text-slate-400'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setQuickPayment('UPI')}
                className={`px-2 py-1 text-[11px] font-semibold rounded ${
                  quickPayment === 'UPI' ? 'bg-indigo-600 text-white' : 'text-slate-400'
                }`}
              >
                UPI
              </button>
            </div>

            <button
              type="submit"
              disabled={isSavingQuick}
              className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSavingQuick ? '...' : '+ Record Sale'}</span>
            </button>
          </div>
        </form>

        {/* Live Calculation preview tag */}
        {quickPriceVal > 0 && (
          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-2">
            <span>Total Sale: <strong className="text-white">₹{quickTotalSale}</strong></span>
            <span>•</span>
            <span>Total Cost: <strong className="text-slate-300">₹{quickTotalCost}</strong></span>
            <span>•</span>
            <span className={quickProfit >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Gross Profit: {quickProfit >= 0 ? '+' : ''}₹{quickProfit} ({quickMarginPct.toFixed(1)}%)
            </span>
          </div>
        )}
      </div>

      {/* 3. FILTER STATS BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Sales Count</span>
          <div className="text-lg font-bold text-white mt-0.5 font-mono">{filteredSales.length} bills</div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Sales Revenue</span>
          <div className="text-lg font-bold text-white mt-0.5 font-mono">
            {formatCurrency(totalFilteredRevenue, business.currency_symbol)}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-emerald-900/50 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Gross Profit</span>
          <div className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">
            {formatCurrency(totalFilteredProfit, business.currency_symbol)}
          </div>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Customer Due / Credit</span>
          <div className={`text-lg font-bold mt-0.5 font-mono ${totalFilteredDue > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
            {formatCurrency(totalFilteredDue, business.currency_symbol)}
          </div>
        </div>
      </div>

      {/* 4. SEARCH & FILTERS */}
      <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by bill number, product name, or customer..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Payment Status</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid / Credit</option>
          </select>

          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="ALL">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Credit/Due">Credit / Store Due</option>
          </select>
        </div>
      </div>

      {/* 5. SALES REGISTER TABLE */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        {filteredSales.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-slate-300">No sales records found</p>
            <p className="text-xs text-slate-500 mt-1">Record your first sale using the quick counter above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Date & Bill No</th>
                  <th className="py-3 px-3">Items & Qty</th>
                  <th className="py-3 px-3 text-right">Purchase Cost (₹)</th>
                  <th className="py-3 px-3 text-right">Selling Price (₹)</th>
                  <th className="py-3 px-3 text-right">Gross Profit (₹)</th>
                  <th className="py-3 px-3 text-center">Payment Mode</th>
                  <th className="py-3 px-3 text-center">Receipt</th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredSales.map(sale => {
                  const saleCost = sale.total_cost || 0;
                  const saleProfit = sale.total - saleCost;
                  const marginPct = sale.total > 0 ? (saleProfit / sale.total) * 100 : 0;

                  return (
                    <tr key={sale.id} className="hover:bg-slate-800/40 transition">
                      {/* Date & Bill */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-semibold text-white">{formatDate(sale.date)}</div>
                        <span className="font-mono text-[10px] text-slate-500">{sale.invoice_number}</span>
                        {sale.customer_name && (
                          <span className="block text-[10px] text-amber-300 font-semibold">
                            Due: {sale.customer_name}
                          </span>
                        )}
                      </td>

                      {/* Items */}
                      <td className="py-3 px-3 max-w-xs">
                        <div className="font-semibold text-slate-200 truncate">
                          {sale.items?.map(i => `${i.product_name} (${i.quantity})`).join(', ') || 'Counter item'}
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {sale.items?.length || 1} item{sale.items?.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* Kharid Lagat */}
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {formatCurrency(saleCost, business.currency_symbol)}
                      </td>

                      {/* Bikri Daam */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-white">
                        {formatCurrency(sale.total, business.currency_symbol)}
                        {sale.amount_due > 0 && (
                          <div className="text-[10px] text-amber-400 font-medium">
                            Due: {formatCurrency(sale.amount_due, business.currency_symbol)}
                          </div>
                        )}
                      </td>

                      {/* Munafa */}
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={saleProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {saleProfit >= 0 ? '+' : ''}{formatCurrency(saleProfit, business.currency_symbol)}
                        </span>
                        <div className="text-[10px] text-slate-500 font-normal">
                          {marginPct.toFixed(0)}% margin
                        </div>
                      </td>

                      {/* Payment Mode */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="font-medium text-slate-300 block">{sale.payment_method}</span>
                        <span
                          className={`inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                            sale.payment_status === 'Paid'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
                              : 'bg-amber-950/70 text-amber-300 border-amber-800'
                          }`}
                        >
                          {sale.payment_status}
                        </span>
                      </td>

                      {/* Receipt */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => onViewReceipt(sale)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 text-indigo-300 hover:text-white hover:bg-slate-700 text-xs font-medium border border-slate-700 inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Receipt</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(sale)}
                            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                            title="Edit Bill"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setSaleToDelete(sale)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                            title="Delete Bill"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DELETE CONFIRMATION MODAL (No window.confirm) */}
      {saleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 p-5 rounded-2xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2 rounded-xl bg-rose-950 border border-rose-800">
                <Trash2 className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-white text-sm">Delete Sale Record?</h4>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete bill <strong>{saleToDelete.invoice_number}</strong>? Stock will be restored to your inventory.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSaleToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const id = saleToDelete.id;
                  setSaleToDelete(null);
                  await onDeleteSale(id);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MULTI-ITEM MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {editingSale ? 'Edit Transaction' : 'Record Multi-Item Bill'}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Multiple products with purchase cost and selling price
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalFormError && (
              <div className="m-4 p-2.5 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalFormError}</span>
              </div>
            )}

            <form onSubmit={handleModalSubmit} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Meta row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Bill Number</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Date</label>
                  <input
                    type="date"
                    required
                    value={saleDate}
                    onChange={e => setSaleDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-0.5">Customer Name / Due Account (Optional)</label>
                  <input
                    type="text"
                    placeholder="Walk-in / Cash"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="border border-slate-800 rounded-xl bg-slate-950/40 p-3 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="flex items-center gap-1 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                {lineItems.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row items-center gap-2 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <div className="flex-1 w-full sm:w-auto space-y-1">
                      <select
                        value={item.product_id || ''}
                        onChange={e => handleItemProductSelect(idx, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-xs text-white"
                      >
                        <option value="">Select from catalog or type below...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.selling_price})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item name"
                        value={item.product_name}
                        onChange={e => handleItemNameChange(idx, e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-xs text-slate-200"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-[9px] text-slate-400 block">Cost ₹</label>
                      <input
                        type="number"
                        min="0"
                        value={item.purchase_cost}
                        onChange={e => handleItemCostChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-slate-300 text-right"
                      />
                    </div>

                    <div className="w-20">
                      <label className="text-[9px] text-slate-400 block">Price ₹</label>
                      <input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={e => handleItemPriceChange(idx, parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs font-mono text-emerald-400 text-right font-bold"
                      />
                    </div>

                    <div className="w-14">
                      <label className="text-[9px] text-slate-400 block">Qty</label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => handleItemQtyChange(idx, parseFloat(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-center font-bold text-white"
                      />
                    </div>

                    <div className="w-20 text-right">
                      <label className="text-[9px] text-slate-400 block">Total</label>
                      <div className="text-xs font-mono font-bold text-white py-1">
                        ₹{item.total}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Payment & Totals */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Payment Method</label>
                      <select
                        value={paymentMethod}
                        onChange={e => setPaymentMethod(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Credit/Due">Credit / Store Due</option>
                        <option value="Card">Card</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Status</label>
                      <select
                        value={paymentStatus}
                        onChange={e => setPaymentStatus(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                      >
                        <option value="Paid">Paid</option>
                        <option value="Unpaid">Unpaid (Credit)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Paid via UPI / Store credit entry"
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal:</span>
                    <span className="font-mono text-white font-semibold">₹{modalSubtotal}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Purchase Cost (COGS):</span>
                    <span className="font-mono text-slate-300">₹{modalTotalCost}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-white">Total Sales:</span>
                    <span className="font-mono text-white text-sm">₹{modalGrandTotal}</span>
                  </div>
                  <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                    <span className="text-emerald-400">Total Gross Profit:</span>
                    <span className="font-mono text-emerald-400 text-sm">
                      {modalGrossProfit >= 0 ? '+' : ''}₹{modalGrossProfit}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-lg shadow-emerald-600/25"
                >
                  Save Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
