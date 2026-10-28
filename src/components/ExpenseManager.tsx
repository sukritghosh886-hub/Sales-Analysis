import React, { useState } from 'react';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  FileDown,
  Info,
  DollarSign,
  Calendar,
  X,
  CreditCard,
  Building,
  Zap,
  Users,
  Truck,
  Coffee,
  AlertCircle,
} from 'lucide-react';
import { Expense, Business, PaymentMethod, ExpenseCategory } from '../types';
import { formatCurrency, formatDate, getTodayDateString } from '../lib/formatters';
import { exportExpensesToCSV } from '../lib/csvHelper';

interface ExpenseManagerProps {
  business: Business;
  expenses: Expense[];
  onSaveExpense: (expense: Omit<Expense, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteExpense: (expenseId: string) => Promise<void>;
  isOpenNewModalDefault?: boolean;
}

export const ExpenseManager: React.FC<ExpenseManagerProps> = ({
  business,
  expenses,
  onSaveExpense,
  onDeleteExpense,
  isOpenNewModalDefault = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(isOpenNewModalDefault);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields
  const [date, setDate] = useState(getTodayDateString());
  const [category, setCategory] = useState<ExpenseCategory | string>('Rent');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [referenceNo, setReferenceNo] = useState('');
  const [isCogs, setIsCogs] = useState(false);

  const defaultCategories: ExpenseCategory[] = [
    'Rent',
    'Utilities & Electricity',
    'Salaries & Staff',
    'Logistics & Transport',
    'Packaging & Supplies',
    'Marketing & Ads',
    'Repairs & Maintenance',
    'Tea & Refreshments',
    'Taxes & Compliance',
    'Direct Product Cost',
    'Miscellaneous',
  ];

  const openAddModal = () => {
    setEditingExpense(null);
    setModalError(null);
    setDate(getTodayDateString());
    setCategory('Rent');
    setDescription('');
    setAmount(0);
    setPaymentMethod('UPI');
    setReferenceNo('');
    setIsCogs(false);
    setIsModalOpen(true);
  };

  const openEditModal = (e: Expense) => {
    setEditingExpense(e);
    setModalError(null);
    setDate(e.date);
    setCategory(e.category);
    setDescription(e.description);
    setAmount(e.amount);
    setPaymentMethod(e.payment_method);
    setReferenceNo(e.reference_no || '');
    setIsCogs(e.is_cogs);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || amount <= 0) {
      setModalError('Please enter a description and valid amount greater than 0.');
      return;
    }

    await onSaveExpense({
      id: editingExpense ? editingExpense.id : undefined,
      business_id: business.id,
      user_id: business.user_id,
      date,
      category,
      description: description.trim(),
      amount,
      payment_method: paymentMethod,
      reference_no: referenceNo.trim() || undefined,
      is_cogs: isCogs,
    });

    setIsModalOpen(false);
  };

  // Metrics
  const totalOpex = expenses.filter(e => !e.is_cogs).reduce((sum, e) => sum + e.amount, 0);
  const totalDirectCost = expenses.filter(e => e.is_cogs).reduce((sum, e) => sum + e.amount, 0);

  // Group by category
  const categoryTotals = new Map<string, number>();
  for (const exp of expenses.filter(e => !e.is_cogs)) {
    categoryTotals.set(exp.category, (categoryTotals.get(exp.category) || 0) + exp.amount);
  }
  const topCategories = Array.from(categoryTotals.entries())
    .map(([cat, amt]) => ({ category: cat, amount: amt }))
    .sort((a, b) => b.amount - a.amount);

  // Filtered Expenses
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.reference_no && e.reference_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      e.category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCat = categoryFilter === 'ALL' || e.category === categoryFilter;

    return matchesSearch && matchesCat;
  });

  const getCategoryIcon = (cat: string) => {
    if (cat.includes('Rent')) return Building;
    if (cat.includes('Electricity') || cat.includes('Utilities')) return Zap;
    if (cat.includes('Salar') || cat.includes('Staff')) return Users;
    if (cat.includes('Transport') || cat.includes('Logistics')) return Truck;
    if (cat.includes('Tea') || cat.includes('Snack')) return Coffee;
    return Wallet;
  };

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Top Header & New Expense */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Expense Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track overhead costs, rent, electricity, and salaries without double-counting product COGS
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportExpensesToCSV(expenses)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Accounting Clarification Callout */}
      <div className="bg-slate-900/40 border border-slate-800/80 p-3.5 rounded-xl flex items-start gap-3 text-xs text-slate-400">
        <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-slate-200">Accounting Rule:</strong> Operating Expenses (OPEX) such as rent, utility bills, employee wages, and packaging are deducted from Gross Profit to compute your bottom-line <strong>Net Profit</strong>. Direct inventory purchases are separated to strictly protect against double-counting with Cost of Goods Sold (COGS).
        </p>
      </div>

      {/* Expense Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Operating Expenses (OPEX)</span>
          <div className="text-lg sm:text-xl font-bold text-rose-400 mt-1">
            {formatCurrency(totalOpex, business.currency_symbol)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{expenses.filter(e => !e.is_cogs).length} total expense entries</span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Top Expense Category</span>
          <div className="text-lg sm:text-xl font-bold text-white mt-1 truncate">
            {topCategories[0]?.category || 'None'}
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
            {topCategories[0] ? formatCurrency(topCategories[0].amount, business.currency_symbol) : '₹0'}
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-400 font-medium">Direct Product / Raw Stock</span>
          <div className="text-lg sm:text-xl font-bold text-slate-300 mt-1">
            {formatCurrency(totalDirectCost, business.currency_symbol)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Flagged as COGS to avoid double-counting</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search expenses by description, reference, or category..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="w-full md:w-auto bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {defaultCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
            <h4 className="text-xs font-semibold text-slate-300">No matching expenses found</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Add your shop expenses like rent, power bills, or staff salaries using the "+ Record Expense" button.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Description & Ref</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4">Accounting Type</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredExpenses.map(exp => {
                  const CatIcon = getCategoryIcon(exp.category);

                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition">
                      {/* Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                        {formatDate(exp.date)}
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 shrink-0">
                            <CatIcon className="w-3.5 h-3.5 text-indigo-400" />
                          </div>
                          <span className="font-semibold text-slate-200">{exp.category}</span>
                        </div>
                      </td>

                      {/* Description & Reference */}
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{exp.description}</div>
                        {exp.reference_no && (
                          <div className="text-[10px] font-mono text-slate-500">Ref: {exp.reference_no}</div>
                        )}
                      </td>

                      {/* Payment Method */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                        {exp.payment_method}
                      </td>

                      {/* Accounting Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            exp.is_cogs
                              ? 'bg-amber-950/70 text-amber-300 border-amber-800'
                              : 'bg-indigo-950/70 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          {exp.is_cogs ? 'Direct Cost (COGS)' : 'Operating (OPEX)'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-sm text-white">
                        {formatCurrency(exp.amount, business.currency_symbol)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete expense "${exp.description}"?`)) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Delete"
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

      {/* ADD / EDIT EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
              <h3 className="font-bold text-base text-white">
                {editingExpense ? 'Edit Expense' : 'Record Business Expense'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="m-4 mb-0 p-2.5 bg-rose-950/80 border border-rose-600/60 rounded-xl text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    required
                    value={amount}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-rose-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                  {defaultCategories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shop monthly rent for October"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={e => setPaymentMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Net Banking">Net Banking</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Reference / Bill No</label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-12345"
                    value={referenceNo}
                    onChange={e => setReferenceNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* OPEX vs COGS Checkbox */}
              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCogs}
                    onChange={e => setIsCogs(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block">
                      This is a direct inventory purchase (COGS)
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Check this only if you bought inventory directly and want it treated as Product Cost rather than an overhead operating expense.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/25 transition"
                >
                  {editingExpense ? 'Save Changes' : 'Record Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
