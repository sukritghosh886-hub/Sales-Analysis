-- =========================================================================
-- SALE ANALYTICS — Production Supabase PostgreSQL Schema & Security Rules
-- Created by Sukrit Ghosh
-- Supabase PostgreSQL Migration Schema
-- =========================================================================

-- 1. User Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Businesses
CREATE TABLE IF NOT EXISTS public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Retail',
  currency TEXT NOT NULL DEFAULT 'INR',
  currency_symbol TEXT NOT NULL DEFAULT '₹',
  tax_id TEXT, -- GSTIN or Business Tax ID
  phone TEXT,
  address TEXT,
  fiscal_year_start INTEGER NOT NULL DEFAULT 4, -- April for Indian Financial Year
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Products & Inventory
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category TEXT DEFAULT 'General',
  purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  selling_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  stock_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reorder_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pcs',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Sales Transactions
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT,
  customer_phone TEXT,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- Cost of Goods Sold for accurate gross margin
  payment_method TEXT NOT NULL DEFAULT 'Cash', -- 'Cash', 'UPI', 'Card', 'Net Banking', 'Credit/Due', 'Cheque'
  payment_status TEXT NOT NULL DEFAULT 'Paid', -- 'Paid', 'Partial', 'Unpaid'
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  amount_due NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Sale Line Items (Multiple Products per Sale)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  purchase_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Business Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL, -- 'Rent', 'Utilities', 'Salaries', 'Logistics', 'Packaging', 'Marketing', 'Maintenance', 'Tea & Refreshments', 'Taxes', 'Direct Product Cost', 'Misc'
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  payment_method TEXT NOT NULL DEFAULT 'Cash',
  reference_no TEXT,
  is_cogs BOOLEAN NOT NULL DEFAULT false, -- Distinguish Operating Expenses (OPEX) from COGS to avoid double-counting
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Import Jobs & Audit
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'sales', 'products', 'expenses'
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  imported_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  errors JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =========================================================================
-- Indexes for High Performance Queries over 12+ Months of Historical Data
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_user ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_products_business ON public.products(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_business_date ON public.sales(business_id, date);
CREATE INDEX IF NOT EXISTS idx_sales_user ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON public.sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_expenses_business_date ON public.expenses(business_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category);

-- =========================================================================
-- Enable Row Level Security (RLS) on All Tables
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- =========================================================================
-- Create Strict RLS Policies (Users can only access their own data)
-- =========================================================================
DROP POLICY IF EXISTS "profiles_user_policy" ON public.profiles;
CREATE POLICY "profiles_user_policy" ON public.profiles
  FOR ALL TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "businesses_user_policy" ON public.businesses;
CREATE POLICY "businesses_user_policy" ON public.businesses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "products_user_policy" ON public.products;
CREATE POLICY "products_user_policy" ON public.products
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sales_user_policy" ON public.sales;
CREATE POLICY "sales_user_policy" ON public.sales
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "sale_items_user_policy" ON public.sale_items;
CREATE POLICY "sale_items_user_policy" ON public.sale_items
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "expenses_user_policy" ON public.expenses;
CREATE POLICY "expenses_user_policy" ON public.expenses
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "import_jobs_user_policy" ON public.import_jobs;
CREATE POLICY "import_jobs_user_policy" ON public.import_jobs
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Profile creation trigger on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
