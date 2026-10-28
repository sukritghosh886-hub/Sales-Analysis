import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Navigation, NavTab } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { SalesManager } from './components/SalesManager';
import { ProductManager } from './components/ProductManager';
import { ExpenseManager } from './components/ExpenseManager';
import { AnalyticsView } from './components/AnalyticsView';
import { ImportExportModal } from './components/ImportExportModal';
import { SettingsModal } from './components/SettingsModal';
import { ReceiptModal } from './components/ReceiptModal';
import { AuthScreen } from './components/AuthScreen';
import { AuthProvider, useAuth } from './lib/authContext';
import { Business, Product, Sale, Expense, StoreType } from './types';
import {
  getBusinesses,
  getActiveBusinessId,
  saveBusiness,
  getProducts,
  saveProduct,
  deleteProduct,
  adjustProductStock,
  getSales,
  saveSale,
  deleteSale,
  getExpenses,
  saveExpense,
  deleteExpense,
  isDemoMode,
  generate14MonthDemoData,
} from './lib/storage';
import { getSupabaseClient, testSupabaseConnection } from './lib/supabase';
import { testFirestoreConnection } from './lib/firebase';
import { X } from 'lucide-react';

function AppContent() {
  const { user, isGuest, storeType, setStoreType, isLoading: isAuthLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Modals
  const [selectedReceiptSale, setSelectedReceiptSale] = useState<Sale | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);

  // Quick Action Modal Triggers
  const [openNewSaleTrigger, setOpenNewSaleTrigger] = useState(false);
  const [openNewProductTrigger, setOpenNewProductTrigger] = useState(false);
  const [openNewExpenseTrigger, setOpenNewExpenseTrigger] = useState(false);

  // Load All Business Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const businesses = await getBusinesses();
      let currentBiz = businesses[0];

      // Ensure business is configured as a small store / dukandar
      if (currentBiz && (currentBiz.name.includes('Mall') || currentBiz.store_type !== 'shop')) {
        currentBiz = {
          ...currentBiz,
          store_type: 'shop',
          name: 'Shree Krishna General Store',
          category: 'Grocery, Kirana & Daily Counter Store',
        };
        await saveBusiness(currentBiz);
      }

      setBusiness(currentBiz);

      if (currentBiz) {
        const [loadedProducts, loadedSales, loadedExpenses] = await Promise.all([
          getProducts(currentBiz.id),
          getSales(currentBiz.id),
          getExpenses(currentBiz.id),
        ]);

        // If this is a fresh launch or demo mode, pre-load 14-month data
        if (loadedProducts.length === 0 && loadedSales.length === 0) {
          generate14MonthDemoData(storeType);
          const [dProds, dSales, dExps] = await Promise.all([
            getProducts(currentBiz.id),
            getSales(currentBiz.id),
            getExpenses(currentBiz.id),
          ]);
          setProducts(dProds);
          setSales(dSales);
          setExpenses(dExps);
        } else {
          setProducts(loadedProducts);
          setSales(loadedSales);
          setExpenses(loadedExpenses);
        }
      }

      // Check cloud connectivity
      const ping = await testFirestoreConnection();
      setSupabaseConnected(ping.success);
    } catch (err) {
      console.error('Error loading business records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [storeType]);

  useEffect(() => {
    if (user || isGuest) {
      loadData();
    }
  }, [user, isGuest, loadData]);

  // Refresh store data
  const handleToggleStoreType = async () => {
    await loadData();
  };

  // CRUD Handlers
  const handleSaveSale = async (saleData: Omit<Sale, 'id' | 'created_at'> & { id?: string }) => {
    await saveSale(saleData);
    await loadData();
  };

  const handleDeleteSale = async (saleId: string) => {
    await deleteSale(saleId);
    await loadData();
  };

  const handleSaveProduct = async (
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
  ) => {
    await saveProduct(productData);
    await loadData();
  };

  const handleDeleteProduct = async (productId: string) => {
    await deleteProduct(productId);
    await loadData();
  };

  const handleAdjustStock = async (productId: string, delta: number) => {
    await adjustProductStock(productId, delta);
    await loadData();
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id' | 'created_at'> & { id?: string }) => {
    await saveExpense(expenseData);
    await loadData();
  };

  const handleDeleteExpense = async (expenseId: string) => {
    await deleteExpense(expenseId);
    await loadData();
  };

  const handleUpdateBusiness = async (updated: Partial<Business>) => {
    if (!business) return;
    const saved = await saveBusiness({ ...business, ...updated });
    setBusiness(saved);
  };

  // Bulk CSV Import Handlers
  const handleImportProducts = async (
    newProducts: Array<Omit<Product, 'id' | 'created_at' | 'updated_at'>>
  ) => {
    for (const p of newProducts) {
      await saveProduct(p);
    }
    await loadData();
    return newProducts.length;
  };

  const handleImportSales = async (newSales: Array<Omit<Sale, 'id' | 'created_at'>>) => {
    for (const s of newSales) {
      await saveSale(s);
    }
    await loadData();
    return newSales.length;
  };

  const handleImportExpenses = async (newExpenses: Array<Omit<Expense, 'id' | 'created_at'>>) => {
    for (const e of newExpenses) {
      await saveExpense(e);
    }
    await loadData();
    return newExpenses.length;
  };

  // Low stock counter for nav badge
  const lowStockCount = products.filter((p) => p.stock_quantity <= p.reorder_threshold).length;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Loading Sale Analytics...
        </span>
      </div>
    );
  }

  // FIRST INTERFACE: If user is not authenticated and not exploring guest demo, show AuthScreen!
  if (!user && !isGuest) {
    return <AuthScreen onSuccess={() => loadData()} />;
  }

  if (isLoading && !business) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold tracking-wider uppercase text-slate-300">
          Syncing Store Database...
        </span>
      </div>
    );
  }

  if (!business) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Navbar
        business={business}
        products={products}
        sales={sales}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenImportExport={() => setIsImportExportOpen(true)}
        onNavigateToDashboard={() => setActiveTab('dashboard')}
        supabaseConnected={supabaseConnected}
        onRefreshData={loadData}
        onOpenAuth={() => setShowAuthModal(true)}
        onToggleStoreType={handleToggleStoreType}
      />

      {/* Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'settings') {
            setIsSettingsOpen(true);
          } else if (tab === 'import-export') {
            setIsImportExportOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        lowStockCount={lowStockCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            business={business}
            sales={sales}
            products={products}
            expenses={expenses}
            onNavigate={(tab) => setActiveTab(tab)}
            onNewSale={() => {
              setActiveTab('sales');
              setOpenNewSaleTrigger(true);
            }}
            onNewProduct={() => {
              setActiveTab('products');
              setOpenNewProductTrigger(true);
            }}
            onNewExpense={() => {
              setActiveTab('expenses');
              setOpenNewExpenseTrigger(true);
            }}
            onViewReceipt={(sale) => setSelectedReceiptSale(sale)}
            onAdjustStock={handleAdjustStock}
            onSaveSale={handleSaveSale}
            onDeleteSale={handleDeleteSale}
          />
        )}

        {activeTab === 'sales' && (
          <SalesManager
            business={business}
            sales={sales}
            products={products}
            onSaveSale={handleSaveSale}
            onDeleteSale={handleDeleteSale}
            onViewReceipt={(sale) => setSelectedReceiptSale(sale)}
            isOpenNewModalDefault={openNewSaleTrigger}
          />
        )}

        {activeTab === 'products' && (
          <ProductManager
            business={business}
            products={products}
            onSaveProduct={handleSaveProduct}
            onDeleteProduct={handleDeleteProduct}
            onAdjustStock={handleAdjustStock}
            isOpenNewModalDefault={openNewProductTrigger}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpenseManager
            business={business}
            expenses={expenses}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
            isOpenNewModalDefault={openNewExpenseTrigger}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            business={business}
            sales={sales}
            expenses={expenses}
            products={products}
          />
        )}
      </main>

      {/* Receipt View Modal */}
      {selectedReceiptSale && (
        <ReceiptModal
          sale={selectedReceiptSale}
          business={business}
          onClose={() => setSelectedReceiptSale(null)}
        />
      )}

      {/* Import / Export Modal */}
      {isImportExportOpen && (
        <ImportExportModal
          business={business}
          products={products}
          sales={sales}
          expenses={expenses}
          onImportProducts={handleImportProducts}
          onImportSales={handleImportSales}
          onImportExpenses={handleImportExpenses}
          onClose={() => setIsImportExportOpen(false)}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          business={business}
          onUpdateBusiness={handleUpdateBusiness}
          onRefreshData={loadData}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}

      {/* Auth Modal (when guest wants to register or sign in) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 z-20 p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <AuthScreen
              onSuccess={() => {
                setShowAuthModal(false);
                loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
