import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileDown,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Product, Business } from '../types';
import { formatCurrency } from '../lib/formatters';
import { exportProductsToCSV } from '../lib/csvHelper';

interface ProductManagerProps {
  business: Business;
  products: Product[];
  onSaveProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onAdjustStock: (productId: string, delta: number) => Promise<void>;
  isOpenNewModalDefault?: boolean;
}

export const ProductManager: React.FC<ProductManagerProps> = ({
  business,
  products,
  onSaveProduct,
  onDeleteProduct,
  onAdjustStock,
  isOpenNewModalDefault = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(isOpenNewModalDefault);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Restock State
  const [restockProduct, setRestockProduct] = useState<Product | null>(null);
  const [restockDelta, setRestockDelta] = useState<number>(10);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Staples & Grains');
  const [purchaseCost, setPurchaseCost] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [stockQuantity, setStockQuantity] = useState<number>(0);
  const [reorderThreshold, setReorderThreshold] = useState<number>(5);
  const [unit, setUnit] = useState('pcs');

  // Categories list
  const existingCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
  const defaultCategories = [
    'Staples & Grains',
    'Edible Oils',
    'Dairy & Breakfast',
    'Snacks & Confectionery',
    'Beverages',
    'Cleaning & Household',
    'Personal Care',
    'General',
  ];
  const allCategories = Array.from(new Set([...defaultCategories, ...existingCategories]));

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setCategory('Staples & Grains');
    setPurchaseCost(0);
    setSellingPrice(0);
    setStockQuantity(10);
    setReorderThreshold(5);
    setUnit('pcs');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setSku(p.sku || '');
    setCategory(p.category || 'General');
    setPurchaseCost(p.purchase_cost);
    setSellingPrice(p.selling_price);
    setStockQuantity(p.stock_quantity);
    setReorderThreshold(p.reorder_threshold);
    setUnit(p.unit || 'pcs');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await onSaveProduct({
      id: editingProduct ? editingProduct.id : undefined,
      business_id: business.id,
      user_id: business.user_id,
      name: name.trim(),
      sku: sku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      category: category.trim() || 'General',
      purchase_cost: purchaseCost,
      selling_price: sellingPrice,
      stock_quantity: stockQuantity,
      reorder_threshold: reorderThreshold,
      unit: unit.trim() || 'pcs',
    });

    setIsModalOpen(false);
  };

  const handleRestockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockProduct) return;
    await onAdjustStock(restockProduct.id, restockDelta);
    setRestockProduct(null);
  };

  // Live margin calculation
  const markup = purchaseCost > 0 ? ((sellingPrice - purchaseCost) / purchaseCost) * 100 : 0;
  const grossMargin = sellingPrice > 0 ? ((sellingPrice - purchaseCost) / sellingPrice) * 100 : 0;

  // Inventory Valuation Metrics
  const totalCostValuation = products.reduce((acc, p) => acc + (p.purchase_cost * p.stock_quantity), 0);
  const totalRetailValuation = products.reduce((acc, p) => acc + (p.selling_price * p.stock_quantity), 0);
  const totalUnitsInStock = products.reduce((acc, p) => acc + p.stock_quantity, 0);
  const lowStockCount = products.filter(p => p.stock_quantity <= p.reorder_threshold && p.stock_quantity > 0).length;
  const outOfStockCount = products.filter(p => p.stock_quantity <= 0).length;

  // Filtered Products
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchesStock = true;
    if (stockFilter === 'IN_STOCK') matchesStock = p.stock_quantity > p.reorder_threshold;
    else if (stockFilter === 'LOW_STOCK') matchesStock = p.stock_quantity <= p.reorder_threshold && p.stock_quantity > 0;
    else if (stockFilter === 'OUT_OF_STOCK') matchesStock = p.stock_quantity <= 0;

    return matchesSearch && matchesCat && matchesStock;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Header & Quick Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Products & Inventory</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Track catalog, purchase costs (for COGS), stock levels, and valuation
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => exportProductsToCSV(products)}
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
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Inventory Valuation Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Inventory Value (Cost)</span>
          <div className="text-lg sm:text-xl font-bold text-slate-200 mt-1">
            {formatCurrency(totalCostValuation, business.currency_symbol)}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Capital tied in stock</span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Expected Retail Value</span>
          <div className="text-lg sm:text-xl font-bold text-emerald-400 mt-1">
            {formatCurrency(totalRetailValuation, business.currency_symbol)}
          </div>
          <span className="text-[10px] text-emerald-500 block mt-0.5">
            +₹{(totalRetailValuation - totalCostValuation).toFixed(0)} potential profit
          </span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Total Products / Units</span>
          <div className="text-lg sm:text-xl font-bold text-white mt-1">
            {products.length} <span className="text-xs font-normal text-slate-400">items</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">{totalUnitsInStock} total units in store</span>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 p-3.5 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium">Low / Out of Stock</span>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-lg sm:text-xl font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              {lowStockCount} Low
            </span>
            {outOfStockCount > 0 && (
              <span className="text-xs font-bold text-rose-400">({outOfStockCount} Out)</span>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">Action needed for reordering</span>
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
            placeholder="Search products by name or SKU..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="flex-1 md:flex-initial bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            {allCategories.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={e => setStockFilter(e.target.value as any)}
            className="flex-1 md:flex-initial bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="IN_STOCK">Normal Stock</option>
            <option value="LOW_STOCK">Low Stock (≤ Reorder)</option>
            <option value="OUT_OF_STOCK">Out of Stock (0)</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <Package className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-50" />
            <h4 className="text-xs font-semibold text-slate-300">No matching products found</h4>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Add products using the "+ Add Product" button or import your catalog via CSV.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name & SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Cost Price (COGS)</th>
                  <th className="py-3 px-4 text-right">Selling Price</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-4 text-center">Stock Level</th>
                  <th className="py-3 px-4 text-right">Valuation</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredProducts.map(p => {
                  const pMargin = p.selling_price > 0 ? ((p.selling_price - p.purchase_cost) / p.selling_price) * 100 : 0;
                  const isLow = p.stock_quantity <= p.reorder_threshold && p.stock_quantity > 0;
                  const isOut = p.stock_quantity <= 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & SKU */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-white">{p.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">{p.sku}</div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] border border-slate-700">
                          {p.category}
                        </span>
                      </td>

                      {/* Purchase Cost */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-400">
                        {formatCurrency(p.purchase_cost, business.currency_symbol)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-bold text-white">
                        {formatCurrency(p.selling_price, business.currency_symbol)}
                      </td>

                      {/* Margin % */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-semibold text-emerald-400">
                        {pMargin.toFixed(1)}%
                      </td>

                      {/* Stock Level Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isOut
                                ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                                : isLow
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                                : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                            }`}
                          >
                            {p.stock_quantity} {p.unit}
                          </span>
                        </div>
                        {isLow && <span className="block text-[9px] text-amber-400 font-medium">Reorder soon</span>}
                        {isOut && <span className="block text-[9px] text-rose-400 font-medium">Out of stock</span>}
                      </td>

                      {/* Valuation */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono text-slate-300">
                        {formatCurrency(p.purchase_cost * p.stock_quantity, business.currency_symbol)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Quick Restock Button */}
                          <button
                            onClick={() => {
                              setRestockProduct(p);
                              setRestockDelta(10);
                            }}
                            className="px-2 py-1 rounded bg-slate-800 text-emerald-300 hover:text-white hover:bg-emerald-800/50 text-[10px] font-medium border border-slate-700 transition"
                            title="Restock units"
                          >
                            + Stock
                          </button>
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete ${p.name}? Historical sales will still preserve its record.`)) {
                                onDeleteProduct(p.id);
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

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
              <h3 className="font-bold text-base text-white">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aashirvaad Chakki Atta 10kg"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">SKU / Barcode</label>
                  <input
                    type="text"
                    placeholder="e.g. ATT-10K"
                    value={sku}
                    onChange={e => setSku(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Category</label>
                  <input
                    type="text"
                    list="category-suggestions"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <datalist id="category-suggestions">
                    {allCategories.map(c => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Pricing & Cost */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Purchase Cost (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={purchaseCost}
                    onChange={e => setPurchaseCost(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Used to compute accurate COGS</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={sellingPrice}
                    onChange={e => setSellingPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
                  />
                  <span className="text-[10px] text-emerald-500 mt-0.5 block font-semibold">
                    Margin: {grossMargin.toFixed(1)}% | Markup: {markup.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Stock & Unit */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min="0"
                    value={stockQuantity}
                    onChange={e => setStockQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={reorderThreshold}
                    onChange={e => setReorderThreshold(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Unit</label>
                  <select
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                  >
                    <option value="pcs">pcs</option>
                    <option value="packet">packet</option>
                    <option value="bag">bag</option>
                    <option value="box">box</option>
                    <option value="kg">kg</option>
                    <option value="liter">liter</option>
                    <option value="can">can</option>
                    <option value="bottle">bottle</option>
                    <option value="tube">tube</option>
                  </select>
                </div>
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
                  {editingProduct ? 'Save Changes' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK MODAL */}
      {restockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-2xl shadow-2xl p-5">
            <h3 className="font-bold text-sm text-white">Quick Restock Units</h3>
            <p className="text-xs text-slate-400 mt-1">
              Add new inventory to <span className="text-indigo-400 font-semibold">{restockProduct.name}</span>
            </p>
            <div className="my-4 p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
              <span className="text-slate-400">Current In Stock:</span>
              <span className="font-bold text-white">{restockProduct.stock_quantity} {restockProduct.unit}</span>
            </div>

            <form onSubmit={handleRestockSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Add Quantity ({restockProduct.unit}):</label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  required
                  value={restockDelta}
                  onChange={e => setRestockDelta(parseFloat(e.target.value) || 1)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-base font-bold text-white text-center"
                />
              </div>

              <div className="flex gap-2">
                {[5, 10, 25, 50].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setRestockDelta(amt)}
                    className="flex-1 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-medium"
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRestockProduct(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  Confirm Restock (+{restockDelta})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
