import Papa from 'papaparse';
import { Product, Sale, Expense } from '../types';

export interface ColumnMapping {
  [targetField: string]: string; // target field -> uploaded header name
}

export interface ImportPreview<T> {
  headers: string[];
  rows: any[];
  mappedRows: Partial<T>[];
  errors: Array<{ row: number; field: string; error: string; raw: any }>;
  validCount: number;
}

// ==========================================
// CSV DOWNLOAD TEMPLATES
// ==========================================
export function downloadCSVTemplate(type: 'sales' | 'products' | 'expenses') {
  let headers: string[] = [];
  let sampleRows: string[][] = [];
  let filename = '';

  if (type === 'products') {
    headers = ['Product Name', 'SKU', 'Category', 'Purchase Cost (₹)', 'Selling Price (₹)', 'Stock Quantity', 'Unit'];
    sampleRows = [
      ['Aashirvaad Atta 10kg', 'ATT-10K', 'Staples', '395.00', '460.00', '50', 'bag'],
      ['Fortune Refined Oil 1L', 'OIL-1L', 'Edible Oils', '118.00', '140.00', '35', 'pouch'],
      ['Tata Salt 1kg', 'SLT-1K', 'Staples', '22.00', '28.00', '100', 'packet'],
    ];
    filename = 'sale_analytics_products_template.csv';
  } else if (type === 'sales') {
    headers = ['Invoice Number', 'Date (YYYY-MM-DD)', 'Customer Name', 'Customer Phone', 'Product Name', 'Quantity', 'Unit Price (₹)', 'Purchase Cost (₹)', 'Discount (₹)', 'Tax (₹)', 'Payment Method', 'Payment Status'];
    sampleRows = [
      ['INV-2026-001', '2026-04-10', 'Ramesh Kumar', '9876543210', 'Aashirvaad Atta 10kg', '2', '460.00', '395.00', '20.00', '45.00', 'UPI', 'Paid'],
      ['INV-2026-002', '2026-04-12', 'Priya Sharma', '9812345678', 'Tata Salt 1kg', '5', '28.00', '22.00', '0.00', '7.00', 'Cash', 'Paid'],
    ];
    filename = 'sale_analytics_sales_template.csv';
  } else if (type === 'expenses') {
    headers = ['Date (YYYY-MM-DD)', 'Category', 'Description', 'Amount (₹)', 'Payment Method', 'Reference No', 'Is Direct Product Cost (Yes/No)'];
    sampleRows = [
      ['2026-04-05', 'Rent', 'Shop Monthly Rent', '18000.00', 'UPI', 'UPI-RENT-APR', 'No'],
      ['2026-04-10', 'Utilities & Electricity', 'Electricity bill', '3450.00', 'Net Banking', 'EB-APR26', 'No'],
      ['2026-04-15', 'Logistics & Transport', 'Wholesale market tempo', '1500.00', 'Cash', '', 'No'],
    ];
    filename = 'sale_analytics_expenses_template.csv';
  }

  const csvContent = Papa.unparse([headers, ...sampleRows]);
  triggerDownload(csvContent, filename);
}

// ==========================================
// EXPORT DATA TO CSV
// ==========================================
export function exportProductsToCSV(products: Product[]) {
  const data = products.map(p => ({
    'Product ID': p.id,
    'Product Name': p.name,
    'SKU': p.sku,
    'Category': p.category,
    'Purchase Cost': p.purchase_cost,
    'Selling Price': p.selling_price,
    'Stock Quantity': p.stock_quantity,
    'Unit': p.unit,
    'Reorder Level': p.reorder_threshold,
    'Inventory Value (Cost)': (p.purchase_cost * p.stock_quantity).toFixed(2),
    'Inventory Value (Retail)': (p.selling_price * p.stock_quantity).toFixed(2),
  }));
  const csv = Papa.unparse(data);
  triggerDownload(csv, `products_inventory_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportSalesToCSV(sales: Sale[]) {
  const rows: any[] = [];
  for (const s of sales) {
    if (s.items && s.items.length > 0) {
      for (const it of s.items) {
        rows.push({
          'Invoice Number': s.invoice_number,
          'Date': s.date,
          'Customer': s.customer_name || 'Walk-in',
          'Phone': s.customer_phone || '',
          'Item Name': it.product_name,
          'Item Qty': it.quantity,
          'Unit Price': it.unit_price,
          'Cost Price': it.purchase_cost,
          'Item Total': it.total,
          'Sale Total': s.total,
          'Sale COGS': s.total_cost,
          'Payment Method': s.payment_method,
          'Payment Status': s.payment_status,
          'Notes': s.notes || '',
        });
      }
    } else {
      rows.push({
        'Invoice Number': s.invoice_number,
        'Date': s.date,
        'Customer': s.customer_name || 'Walk-in',
        'Phone': s.customer_phone || '',
        'Item Name': 'General Sale',
        'Item Qty': 1,
        'Unit Price': s.total,
        'Cost Price': s.total_cost,
        'Item Total': s.total,
        'Sale Total': s.total,
        'Sale COGS': s.total_cost,
        'Payment Method': s.payment_method,
        'Payment Status': s.payment_status,
        'Notes': s.notes || '',
      });
    }
  }
  const csv = Papa.unparse(rows);
  triggerDownload(csv, `sales_ledger_${new Date().toISOString().split('T')[0]}.csv`);
}

export function exportExpensesToCSV(expenses: Expense[]) {
  const data = expenses.map(e => ({
    'Expense ID': e.id,
    'Date': e.date,
    'Category': e.category,
    'Description': e.description,
    'Amount': e.amount,
    'Payment Method': e.payment_method,
    'Reference No': e.reference_no || '',
    'Type': e.is_cogs ? 'Direct Cost (COGS)' : 'Operating Expense (OPEX)',
  }));
  const csv = Papa.unparse(data);
  triggerDownload(csv, `expenses_ledger_${new Date().toISOString().split('T')[0]}.csv`);
}

function triggerDownload(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ==========================================
// PARSING & VALIDATION ENGINE
// ==========================================
export function parseCSVFile(file: File): Promise<{ headers: string[]; rows: any[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const headers = results.meta.fields || [];
        resolve({
          headers,
          rows: results.data as any[],
        });
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}
