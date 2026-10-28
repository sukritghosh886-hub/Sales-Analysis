import { Business, Product, Sale, Expense, ImportJob, StoreType } from '../types';
import { db, auth } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where } from 'firebase/firestore';

const STORAGE_KEYS = {
  ACTIVE_BUSINESS_ID: 'sale_analytics_active_business_id',
  BUSINESSES: 'sale_analytics_businesses',
  PRODUCTS: 'sale_analytics_products',
  SALES: 'sale_analytics_sales',
  EXPENSES: 'sale_analytics_expenses',
  IMPORT_JOBS: 'sale_analytics_import_jobs',
  IS_DEMO: 'sale_analytics_is_demo_mode',
  STORE_TYPE: 'sale_analytics_store_type',
};

// Safe Local Storage Helpers
function getLocalItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (err) {
    console.error(`Failed to read ${key} from localStorage:`, err);
    return defaultValue;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error(`Failed to save ${key} to localStorage:`, err);
  }
}

// ==========================================
// BUSINESS OPERATIONS
// ==========================================
export async function getBusinesses(): Promise<Business[]> {
  const currentUser = auth.currentUser;
  
  // 1. Try Firebase Firestore if user is authenticated
  if (currentUser) {
    try {
      const q = query(collection(db, 'businesses'), where('userId', '==', currentUser.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreList = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            user_id: data.userId || currentUser.uid,
            name: data.name || 'My Business',
            store_type: (data.storeType as StoreType) || 'shop',
            category: data.category || 'Retail',
            currency: data.currency || 'INR',
            currency_symbol: data.currencySymbol || '₹',
            phone: data.phone || '',
            address: data.address || '',
            tax_id: data.taxId || '',
            fiscal_year_start: data.fiscalYearStart || 4,
            created_at: data.createdAt || new Date().toISOString(),
            updated_at: data.updatedAt || new Date().toISOString(),
          } as Business;
        });
        setLocalItem(STORAGE_KEYS.BUSINESSES, firestoreList);
        return firestoreList;
      }
    } catch (err) {
      console.warn('Firestore fetch businesses offline or error:', err);
    }
  }

  // 2. Fallback to Local Storage
  let businesses = getLocalItem<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  if (businesses.length === 0) {
    const defaultBusiness: Business = {
      id: 'biz-default-01',
      user_id: currentUser?.uid || 'local-owner',
      name: 'Shree Krishna General Store',
      store_type: 'shop',
      category: 'Grocery, Kirana & Daily Counter Store',
      currency: 'INR',
      currency_symbol: '₹',
      tax_id: '27AAAAA0000A1Z5',
      phone: '+91 98765 43210',
      address: 'Shop 14, Main Market, MG Road, Pune, Maharashtra',
      fiscal_year_start: 4,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    businesses = [defaultBusiness];
    setLocalItem(STORAGE_KEYS.BUSINESSES, businesses);
    setActiveBusinessId(defaultBusiness.id);
  }
  return businesses;
}

export function getActiveBusinessId(): string {
  if (typeof window === 'undefined') return 'biz-default-01';
  let id = localStorage.getItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID);
  if (!id) {
    const list = getLocalItem<Business[]>(STORAGE_KEYS.BUSINESSES, []);
    id = list[0]?.id || 'biz-default-01';
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID, id);
  }
  return id;
}

export function setActiveBusinessId(id: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BUSINESS_ID, id);
  }
}

export async function saveBusiness(business: Partial<Business>): Promise<Business> {
  const currentUser = auth.currentUser;
  const newBusiness: Business = {
    id: business.id || `biz-${Date.now()}`,
    user_id: business.user_id || currentUser?.uid || 'local-owner',
    name: business.name || 'My Business',
    store_type: business.store_type || 'shop',
    category: business.category || 'Retail',
    currency: business.currency || 'INR',
    currency_symbol: business.currency_symbol || '₹',
    tax_id: business.tax_id || '',
    phone: business.phone || '',
    address: business.address || '',
    fiscal_year_start: business.fiscal_year_start || 4,
    created_at: business.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Sync to Firestore if authenticated
  if (currentUser) {
    try {
      await setDoc(doc(db, 'businesses', newBusiness.id), {
        id: newBusiness.id,
        userId: currentUser.uid,
        name: newBusiness.name,
        storeType: newBusiness.store_type,
        category: newBusiness.category,
        currency: newBusiness.currency,
        currencySymbol: newBusiness.currency_symbol,
        phone: newBusiness.phone,
        address: newBusiness.address,
        taxId: newBusiness.tax_id,
        fiscalYearStart: newBusiness.fiscal_year_start,
        createdAt: newBusiness.created_at,
        updatedAt: newBusiness.updated_at,
      });
    } catch (e) {
      console.warn('Firestore save business error:', e);
    }
  }

  const list = getLocalItem<Business[]>(STORAGE_KEYS.BUSINESSES, []);
  const idx = list.findIndex((b) => b.id === newBusiness.id);
  if (idx >= 0) {
    list[idx] = newBusiness;
  } else {
    list.push(newBusiness);
  }
  setLocalItem(STORAGE_KEYS.BUSINESSES, list);
  setActiveBusinessId(newBusiness.id);
  return newBusiness;
}

// ==========================================
// PRODUCT OPERATIONS
// ==========================================
export async function getProducts(businessId?: string): Promise<Product[]> {
  const bId = businessId || getActiveBusinessId();
  const currentUser = auth.currentUser;

  // Try Firestore
  if (currentUser) {
    try {
      const q = query(
        collection(db, 'products'),
        where('businessId', '==', bId),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreProducts = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            business_id: data.businessId,
            user_id: data.userId,
            name: data.name,
            sku: data.sku || '',
            category: data.category || 'General',
            purchase_cost: Number(data.purchaseCost || 0),
            selling_price: Number(data.sellingPrice || 0),
            stock_quantity: Number(data.stockQuantity || 0),
            reorder_threshold: Number(data.reorderThreshold || 0),
            unit: data.unit || 'pcs',
            outlet_name: data.outletName || undefined,
            created_at: data.createdAt || new Date().toISOString(),
            updated_at: data.updatedAt || new Date().toISOString(),
          } as Product;
        });
        const allLocal = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
        const otherBiz = allLocal.filter((p) => p.business_id !== bId);
        setLocalItem(STORAGE_KEYS.PRODUCTS, [...otherBiz, ...firestoreProducts]);
        return firestoreProducts;
      }
    } catch (e) {
      console.warn('Firestore products fetch fallback:', e);
    }
  }

  const allProducts = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  return allProducts.filter((p) => p.business_id === bId);
}

export async function saveProduct(
  product: Omit<Product, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Product> {
  const now = new Date().toISOString();
  const currentUser = auth.currentUser;
  const saved: Product = {
    id: product.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    created_at: now,
    ...product,
    user_id: product.user_id || currentUser?.uid || 'local-owner',
    updated_at: now,
  };

  // Firestore
  if (currentUser) {
    try {
      await setDoc(doc(db, 'products', saved.id), {
        id: saved.id,
        businessId: saved.business_id,
        userId: currentUser.uid,
        name: saved.name,
        sku: saved.sku,
        category: saved.category,
        purchaseCost: saved.purchase_cost,
        sellingPrice: saved.selling_price,
        stockQuantity: saved.stock_quantity,
        reorderThreshold: saved.reorder_threshold,
        unit: saved.unit,
        outletName: saved.outlet_name || '',
        createdAt: saved.created_at,
        updatedAt: saved.updated_at,
      });
    } catch (e) {
      console.warn('Firestore save product error:', e);
    }
  }

  const list = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const idx = list.findIndex((p) => p.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.push(saved);
  }
  setLocalItem(STORAGE_KEYS.PRODUCTS, list);
  return saved;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await deleteDoc(doc(db, 'products', productId));
    } catch (e) {
      console.warn('Firestore product delete error:', e);
    }
  }

  const list = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const filtered = list.filter((p) => p.id !== productId);
  setLocalItem(STORAGE_KEYS.PRODUCTS, filtered);
  return true;
}

export async function adjustProductStock(productId: string, delta: number): Promise<void> {
  const list = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []);
  const idx = list.findIndex((p) => p.id === productId);
  if (idx >= 0) {
    list[idx].stock_quantity = Math.max(0, (list[idx].stock_quantity || 0) + delta);
    list[idx].updated_at = new Date().toISOString();
    setLocalItem(STORAGE_KEYS.PRODUCTS, list);

    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        await setDoc(
          doc(db, 'products', productId),
          {
            stockQuantity: list[idx].stock_quantity,
            updatedAt: list[idx].updated_at,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Firestore stock update error:', e);
      }
    }
  }
}

// ==========================================
// SALES & TRANSACTIONS OPERATIONS
// ==========================================
export async function getSales(businessId?: string): Promise<Sale[]> {
  const bId = businessId || getActiveBusinessId();
  const currentUser = auth.currentUser;

  if (currentUser) {
    try {
      const q = query(
        collection(db, 'sales'),
        where('businessId', '==', bId),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreSales = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            business_id: data.businessId,
            user_id: data.userId,
            invoice_number: data.invoiceNumber || '',
            date: data.date,
            customer_name: data.customerName || undefined,
            customer_phone: data.customerPhone || undefined,
            subtotal: Number(data.subtotal || data.total || 0),
            discount: Number(data.discount || 0),
            tax: Number(data.tax || 0),
            total: Number(data.total || 0),
            total_cost: Number(data.totalCost || 0),
            payment_method: data.paymentMethod || 'Cash',
            payment_status: data.paymentStatus || 'Paid',
            amount_paid: Number(data.amountPaid ?? data.total ?? 0),
            amount_due: Number(data.amountDue || 0),
            notes: data.notes || '',
            outlet_name: data.outletName || undefined,
            items: data.items || [],
            created_at: data.createdAt || new Date().toISOString(),
          } as Sale;
        });
        const allLocal = getLocalItem<Sale[]>(STORAGE_KEYS.SALES, []);
        const otherBiz = allLocal.filter((s) => s.business_id !== bId);
        setLocalItem(STORAGE_KEYS.SALES, [...otherBiz, ...firestoreSales]);
        return firestoreSales.sort((a, b) => b.date.localeCompare(a.date));
      }
    } catch (e) {
      console.warn('Firestore sales fetch fallback:', e);
    }
  }

  const allSales = getLocalItem<Sale[]>(STORAGE_KEYS.SALES, []);
  return allSales.filter((s) => s.business_id === bId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveSale(sale: Omit<Sale, 'id' | 'created_at'> & { id?: string }): Promise<Sale> {
  const now = new Date().toISOString();
  const currentUser = auth.currentUser;
  const saleId = sale.id || `sale-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

  const items = sale.items.map((it, idx) => ({
    ...it,
    id: it.id || `item-${saleId}-${idx}`,
    sale_id: saleId,
    business_id: sale.business_id,
    user_id: sale.user_id || currentUser?.uid || 'local-owner',
  }));

  const savedSale: Sale = {
    ...sale,
    id: saleId,
    user_id: sale.user_id || currentUser?.uid || 'local-owner',
    items,
    created_at: now,
  };

  // Firestore sync
  if (currentUser) {
    try {
      await setDoc(doc(db, 'sales', savedSale.id), {
        id: savedSale.id,
        businessId: savedSale.business_id,
        userId: currentUser.uid,
        invoiceNumber: savedSale.invoice_number,
        date: savedSale.date,
        customerName: savedSale.customer_name || '',
        customerPhone: savedSale.customer_phone || '',
        subtotal: savedSale.subtotal,
        discount: savedSale.discount,
        tax: savedSale.tax,
        total: savedSale.total,
        totalCost: savedSale.total_cost,
        paymentMethod: savedSale.payment_method,
        paymentStatus: savedSale.payment_status,
        amountPaid: savedSale.amount_paid,
        amountDue: savedSale.amount_due,
        notes: savedSale.notes || '',
        outletName: savedSale.outlet_name || '',
        items: savedSale.items,
        createdAt: savedSale.created_at,
      });
    } catch (e) {
      console.warn('Firestore save sale error:', e);
    }
  }

  // Deduct inventory stock for sold items
  for (const item of items) {
    if (item.product_id) {
      await adjustProductStock(item.product_id, -item.quantity);
    }
  }

  const list = getLocalItem<Sale[]>(STORAGE_KEYS.SALES, []);
  const idx = list.findIndex((s) => s.id === savedSale.id);
  if (idx >= 0) {
    list[idx] = savedSale;
  } else {
    list.unshift(savedSale);
  }
  setLocalItem(STORAGE_KEYS.SALES, list);
  return savedSale;
}

export async function deleteSale(saleId: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await deleteDoc(doc(db, 'sales', saleId));
    } catch (e) {
      console.warn('Firestore delete sale error:', e);
    }
  }

  const list = getLocalItem<Sale[]>(STORAGE_KEYS.SALES, []);
  const filtered = list.filter((s) => s.id !== saleId);
  setLocalItem(STORAGE_KEYS.SALES, filtered);
  return true;
}

// ==========================================
// EXPENSE OPERATIONS
// ==========================================
export async function getExpenses(businessId?: string): Promise<Expense[]> {
  const bId = businessId || getActiveBusinessId();
  const currentUser = auth.currentUser;

  if (currentUser) {
    try {
      const q = query(
        collection(db, 'expenses'),
        where('businessId', '==', bId),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const firestoreExpenses = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            business_id: data.businessId,
            user_id: data.userId,
            date: data.date,
            category: data.category,
            description: data.description || '',
            amount: Number(data.amount || 0),
            payment_method: data.paymentMethod || 'Cash',
            reference_no: data.referenceNo || undefined,
            outlet_name: data.outletName || undefined,
            is_cogs: Boolean(data.isCogs),
            created_at: data.createdAt || new Date().toISOString(),
          } as Expense;
        });
        const allLocal = getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
        const otherBiz = allLocal.filter((e) => e.business_id !== bId);
        setLocalItem(STORAGE_KEYS.EXPENSES, [...otherBiz, ...firestoreExpenses]);
        return firestoreExpenses.sort((a, b) => b.date.localeCompare(a.date));
      }
    } catch (e) {
      console.warn('Firestore expenses fetch fallback:', e);
    }
  }

  const allExpenses = getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  return allExpenses.filter((e) => e.business_id === bId).sort((a, b) => b.date.localeCompare(a.date));
}

export async function saveExpense(
  expense: Omit<Expense, 'id' | 'created_at'> & { id?: string }
): Promise<Expense> {
  const now = new Date().toISOString();
  const currentUser = auth.currentUser;
  const saved: Expense = {
    id: expense.id || `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    created_at: now,
    ...expense,
    user_id: expense.user_id || currentUser?.uid || 'local-owner',
  };

  if (currentUser) {
    try {
      await setDoc(doc(db, 'expenses', saved.id), {
        id: saved.id,
        businessId: saved.business_id,
        userId: currentUser.uid,
        date: saved.date,
        category: saved.category,
        description: saved.description,
        amount: saved.amount,
        paymentMethod: saved.payment_method,
        referenceNo: saved.reference_no || '',
        outletName: saved.outlet_name || '',
        isCogs: saved.is_cogs,
        createdAt: saved.created_at,
      });
    } catch (e) {
      console.warn('Firestore save expense error:', e);
    }
  }

  const list = getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const idx = list.findIndex((e) => e.id === saved.id);
  if (idx >= 0) {
    list[idx] = saved;
  } else {
    list.unshift(saved);
  }
  setLocalItem(STORAGE_KEYS.EXPENSES, list);
  return saved;
}

export async function deleteExpense(expenseId: string): Promise<boolean> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await deleteDoc(doc(db, 'expenses', expenseId));
    } catch (e) {
      console.warn('Firestore delete expense error:', e);
    }
  }

  const list = getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const filtered = list.filter((e) => e.id !== expenseId);
  setLocalItem(STORAGE_KEYS.EXPENSES, filtered);
  return true;
}

// ==========================================
// IMPORT JOBS OPERATIONS
// ==========================================
export async function getImportJobs(businessId?: string): Promise<ImportJob[]> {
  const bId = businessId || getActiveBusinessId();
  const list = getLocalItem<ImportJob[]>(STORAGE_KEYS.IMPORT_JOBS, []);
  return list.filter((j) => j.business_id === bId);
}

export async function saveImportJob(job: ImportJob): Promise<void> {
  const list = getLocalItem<ImportJob[]>(STORAGE_KEYS.IMPORT_JOBS, []);
  list.unshift(job);
  setLocalItem(STORAGE_KEYS.IMPORT_JOBS, list);
}

// ==========================================
// DEMO DATA WORKSPACE GENERATOR (>= 14 Months)
// ==========================================
export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEYS.IS_DEMO) === 'true';
}

export function setDemoModeFlag(flag: boolean): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEYS.IS_DEMO, flag ? 'true' : 'false');
  }
}

export function clearAllBusinessData(): void {
  const bizId = getActiveBusinessId();
  const products = getLocalItem<Product[]>(STORAGE_KEYS.PRODUCTS, []).filter((p) => p.business_id !== bizId);
  const sales = getLocalItem<Sale[]>(STORAGE_KEYS.SALES, []).filter((s) => s.business_id !== bizId);
  const expenses = getLocalItem<Expense[]>(STORAGE_KEYS.EXPENSES, []).filter((e) => e.business_id !== bizId);
  const jobs = getLocalItem<ImportJob[]>(STORAGE_KEYS.IMPORT_JOBS, []).filter((j) => j.business_id !== bizId);

  setLocalItem(STORAGE_KEYS.PRODUCTS, products);
  setLocalItem(STORAGE_KEYS.SALES, sales);
  setLocalItem(STORAGE_KEYS.EXPENSES, expenses);
  setLocalItem(STORAGE_KEYS.IMPORT_JOBS, jobs);
  setDemoModeFlag(false);
}

/**
 * Generates 14 continuous months of realistic small store / dukandar retail business data
 * Fast counter sales with item cost price (kharid daam) and selling price (bikri daam)
 */
export function generate14MonthDemoData(_type?: StoreType): void {
  const businessId = getActiveBusinessId();
  const userId = auth.currentUser?.uid || 'demo-user';

  const sampleProducts: Product[] = [
    { id: 'p1', business_id: businessId, user_id: userId, name: 'Aashirvaad Shudh Chakki Atta 10kg', sku: 'ATT-10K', category: 'Staples & Grains', purchase_cost: 395, selling_price: 460, stock_quantity: 45, reorder_threshold: 15, unit: 'bag', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p2', business_id: businessId, user_id: userId, name: 'Fortune Sunlite Refined Oil 5L', sku: 'OIL-5L', category: 'Edible Oils', purchase_cost: 590, selling_price: 685, stock_quantity: 28, reorder_threshold: 10, unit: 'can', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p3', business_id: businessId, user_id: userId, name: 'Tata Salt Vacuum Evaporated 1kg', sku: 'SLT-1K', category: 'Staples & Grains', purchase_cost: 22, selling_price: 28, stock_quantity: 120, reorder_threshold: 30, unit: 'packet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p4', business_id: businessId, user_id: userId, name: 'Amul Butter Pasteurised 500g', sku: 'BTR-500', category: 'Dairy & Breakfast', purchase_cost: 235, selling_price: 275, stock_quantity: 8, reorder_threshold: 15, unit: 'pack', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, // LOW STOCK!
    { id: 'p5', business_id: businessId, user_id: userId, name: 'Surf Excel Quick Wash Detergent 2kg', sku: 'SRF-2K', category: 'Cleaning & Household', purchase_cost: 290, selling_price: 365, stock_quantity: 35, reorder_threshold: 12, unit: 'pack', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p6', business_id: businessId, user_id: userId, name: 'Taj Mahal Tea Leaves 500g', sku: 'TEA-500', category: 'Beverages', purchase_cost: 280, selling_price: 340, stock_quantity: 50, reorder_threshold: 15, unit: 'box', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p7', business_id: businessId, user_id: userId, name: 'Daawat Rozana Gold Basmati Rice 5kg', sku: 'RCE-5K', category: 'Staples & Grains', purchase_cost: 410, selling_price: 495, stock_quantity: 4, reorder_threshold: 10, unit: 'bag', created_at: new Date().toISOString(), updated_at: new Date().toISOString() }, // LOW STOCK!
    { id: 'p8', business_id: businessId, user_id: userId, name: 'Refined Pure Sugar 1kg', sku: 'SUG-1K', category: 'Staples & Grains', purchase_cost: 40, selling_price: 46, stock_quantity: 180, reorder_threshold: 40, unit: 'kg', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p9', business_id: businessId, user_id: userId, name: 'Amul Taaza Milk 500ml', sku: 'MLK-500', category: 'Dairy & Breakfast', purchase_cost: 28, selling_price: 32, stock_quantity: 60, reorder_threshold: 20, unit: 'pouch', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p10', business_id: businessId, user_id: userId, name: 'Haldiram Bhujia Sev 400g', sku: 'HLD-BHU', category: 'Snacks & Confectionery', purchase_cost: 88, selling_price: 115, stock_quantity: 65, reorder_threshold: 20, unit: 'packet', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p11', business_id: businessId, user_id: userId, name: 'Parle-G Gold Biscuit Pack', sku: 'PRL-GLD', category: 'Snacks & Confectionery', purchase_cost: 25, selling_price: 30, stock_quantity: 90, reorder_threshold: 25, unit: 'pack', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 'p12', business_id: businessId, user_id: userId, name: 'Everest Garam Masala 100g', sku: 'EVR-MSL', category: 'Staples & Grains', purchase_cost: 68, selling_price: 84, stock_quantity: 40, reorder_threshold: 12, unit: 'box', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];

  const today = new Date();
  const sales: Sale[] = [];
  const expenses: Expense[] = [];

  const paymentMethods: Array<'Cash' | 'UPI'> = ['Cash', 'Cash', 'UPI', 'UPI', 'Cash'];

  let invCounter = 1001;

  for (let m = 14; m >= 0; m--) {
    const targetMonthDate = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth() + 1;
    const daysInMonth = new Date(year, month, 0).getDate();

    let seasonalBoost = 1.0;
    if (month === 10 || month === 11) seasonalBoost = 1.4; // Diwali / Festive
    else if (month === 3) seasonalBoost = 1.15; // Financial Year closing
    else if (month === 7 || month === 8) seasonalBoost = 0.95;

    const numTransactions = Math.floor((22 + Math.floor(Math.random() * 8)) * seasonalBoost);

    for (let t = 0; t < numTransactions; t++) {
      const day = Math.min(daysInMonth, Math.max(1, Math.floor(Math.random() * daysInMonth) + 1));
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      const numItems = Math.floor(Math.random() * 3) + 1;
      const selectedProducts = [...sampleProducts].sort(() => 0.5 - Math.random()).slice(0, numItems);

      let saleSubtotal = 0;
      let saleCost = 0;
      const saleItems = selectedProducts.map((prod, idx) => {
        const qty = Math.floor(Math.random() * 2) + 1;
        const itemTotal = prod.selling_price * qty;
        const itemCost = prod.purchase_cost * qty;
        saleSubtotal += itemTotal;
        saleCost += itemCost;

        return {
          id: `item-d-${invCounter}-${idx}`,
          sale_id: `sale-d-${invCounter}`,
          business_id: businessId,
          user_id: userId,
          product_id: prod.id,
          product_name: prod.name,
          quantity: qty,
          unit_price: prod.selling_price,
          purchase_cost: prod.purchase_cost,
          discount: 0,
          total: itemTotal,
        };
      });

      const total = saleSubtotal;
      const payMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const isDue = Math.random() < 0.05; // 5% chance of Store Credit / Due

      sales.push({
        id: `sale-d-${invCounter}`,
        business_id: businessId,
        user_id: userId,
        invoice_number: `BILL-${year}-${invCounter}`,
        date: dateStr,
        customer_name: isDue ? 'Store Credit Customer' : '',
        customer_phone: '',
        subtotal: saleSubtotal,
        discount: 0,
        tax: 0,
        total,
        total_cost: saleCost,
        payment_method: isDue ? 'Credit/Due' : payMethod,
        payment_status: isDue ? 'Unpaid' : 'Paid',
        amount_paid: isDue ? 0 : total,
        amount_due: isDue ? total : 0,
        notes: isDue ? 'Store Credit entry' : 'Counter Sale',
        items: saleItems,
        created_at: new Date(targetMonthDate.getFullYear(), targetMonthDate.getMonth(), day, 10 + (t % 11), (t * 7) % 60).toISOString(),
      });

      invCounter++;
    }

    // Monthly small shop expenses
    expenses.push({
      id: `exp-rent-${year}-${month}`,
      business_id: businessId,
      user_id: userId,
      date: `${year}-${String(month).padStart(2, '0')}-05`,
      category: 'Rent',
      description: 'Shop Monthly Rent',
      amount: 12000,
      payment_method: 'UPI',
      is_cogs: false,
      created_at: new Date(year, month - 1, 5).toISOString(),
    });

    expenses.push({
      id: `exp-elec-${year}-${month}`,
      business_id: businessId,
      user_id: userId,
      date: `${year}-${String(month).padStart(2, '0')}-10`,
      category: 'Utilities & Electricity',
      description: 'Shop Electricity Bill',
      amount: 2400 + Math.floor(Math.random() * 600),
      payment_method: 'UPI',
      is_cogs: false,
      created_at: new Date(year, month - 1, 10).toISOString(),
    });

    expenses.push({
      id: `exp-tea-${year}-${month}`,
      business_id: businessId,
      user_id: userId,
      date: `${year}-${String(month).padStart(2, '0')}-28`,
      category: 'Tea & Refreshments',
      description: 'Staff & Counter Daily Refreshments',
      amount: 1500 + Math.floor(Math.random() * 400),
      payment_method: 'Cash',
      is_cogs: false,
      created_at: new Date(year, month - 1, 28).toISOString(),
    });

    expenses.push({
      id: `exp-bags-${year}-${month}`,
      business_id: businessId,
      user_id: userId,
      date: `${year}-${String(month).padStart(2, '0')}-15`,
      category: 'Packaging & Supplies',
      description: 'Packaging Bags & Counter Supplies',
      amount: 800 + Math.floor(Math.random() * 300),
      payment_method: 'Cash',
      is_cogs: false,
      created_at: new Date(year, month - 1, 15).toISOString(),
    });
  }

  setLocalItem(STORAGE_KEYS.PRODUCTS, sampleProducts);
  setLocalItem(STORAGE_KEYS.SALES, sales);
  setLocalItem(STORAGE_KEYS.EXPENSES, expenses);
  setDemoModeFlag(true);
}
