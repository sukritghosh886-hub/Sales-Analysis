import React, { useState } from 'react';
import {
  Upload,
  Download,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { Product, Sale, Expense, Business } from '../types';
import {
  downloadCSVTemplate,
  parseCSVFile,
  exportProductsToCSV,
  exportSalesToCSV,
  exportExpensesToCSV,
} from '../lib/csvHelper';
import { saveImportJob } from '../lib/storage';

interface ImportExportModalProps {
  business: Business;
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  onImportProducts: (newProducts: Array<Omit<Product, 'id' | 'created_at' | 'updated_at'>>) => Promise<number>;
  onImportSales: (newSales: Array<Omit<Sale, 'id' | 'created_at'>>) => Promise<number>;
  onImportExpenses: (newExpenses: Array<Omit<Expense, 'id' | 'created_at'>>) => Promise<number>;
  onClose: () => void;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  business,
  products,
  sales,
  expenses,
  onImportProducts,
  onImportSales,
  onImportExpenses,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'IMPORT' | 'EXPORT'>('IMPORT');
  const [importType, setImportType] = useState<'products' | 'sales' | 'expenses'>('sales');

  // Wizard Steps: 1: Upload, 2: Map Columns, 3: Validation & Confirm
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  // Column Mapping
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [validationErrors, setValidationErrors] = useState<Array<{ row: number; error: string }>>([]);
  const [validRowCount, setValidRowCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccessMessage, setImportSuccessMessage] = useState<string | null>(null);

  // Handle File Selected
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    try {
      const parsed = await parseCSVFile(file);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);

      // Auto guess column mappings
      const initialMap: Record<string, string> = {};
      parsed.headers.forEach(h => {
        const lower = h.toLowerCase().trim();
        if (importType === 'sales') {
          if (lower.includes('invoice') || lower.includes('bill')) initialMap['invoice_number'] = h;
          if (lower.includes('date')) initialMap['date'] = h;
          if (lower.includes('customer') || lower.includes('client')) initialMap['customer_name'] = h;
          if (lower.includes('phone') || lower.includes('mobile')) initialMap['customer_phone'] = h;
          if (lower.includes('product') || lower.includes('item')) initialMap['product_name'] = h;
          if (lower.includes('qty') || lower.includes('quantity')) initialMap['quantity'] = h;
          if (lower.includes('price') || lower.includes('rate')) initialMap['unit_price'] = h;
          if (lower.includes('cost')) initialMap['purchase_cost'] = h;
          if (lower.includes('method') || lower.includes('mode')) initialMap['payment_method'] = h;
          if (lower.includes('status')) initialMap['payment_status'] = h;
        } else if (importType === 'products') {
          if (lower.includes('name') || lower.includes('product') || lower.includes('title')) initialMap['name'] = h;
          if (lower.includes('sku') || lower.includes('code') || lower.includes('barcode')) initialMap['sku'] = h;
          if (lower.includes('cat')) initialMap['category'] = h;
          if (lower.includes('cost') || lower.includes('purchase')) initialMap['purchase_cost'] = h;
          if (lower.includes('sell') || lower.includes('price') || lower.includes('mrp')) initialMap['selling_price'] = h;
          if (lower.includes('stock') || lower.includes('qty')) initialMap['stock_quantity'] = h;
          if (lower.includes('unit')) initialMap['unit'] = h;
        } else if (importType === 'expenses') {
          if (lower.includes('date')) initialMap['date'] = h;
          if (lower.includes('cat')) initialMap['category'] = h;
          if (lower.includes('desc') || lower.includes('title') || lower.includes('particular')) initialMap['description'] = h;
          if (lower.includes('amount') || lower.includes('cost') || lower.includes('rs')) initialMap['amount'] = h;
          if (lower.includes('method') || lower.includes('mode')) initialMap['payment_method'] = h;
          if (lower.includes('ref')) initialMap['reference_no'] = h;
        }
      });
      setColumnMap(initialMap);
      setStep(2);
    } catch (err: any) {
      alert(`Error reading CSV file: ${err.message || 'Invalid format'}`);
    }
  };

  // Run Validation on Step 2 -> Step 3
  const handleProceedToValidation = () => {
    const errors: Array<{ row: number; error: string }> = [];
    let valid = 0;

    rawRows.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-indexed header is row 1

      if (importType === 'products') {
        const prodName = row[columnMap['name'] || ''];
        const price = parseFloat(row[columnMap['selling_price'] || '']);
        if (!prodName || String(prodName).trim() === '') {
          errors.push({ row: rowNum, error: 'Missing product name' });
          return;
        }
        if (isNaN(price) || price < 0) {
          errors.push({ row: rowNum, error: `Invalid selling price: "${row[columnMap['selling_price']]}"` });
          return;
        }
        valid++;
      } else if (importType === 'sales') {
        const inv = row[columnMap['invoice_number'] || ''];
        const dateStr = row[columnMap['date'] || ''];
        const item = row[columnMap['product_name'] || ''];
        if (!dateStr) {
          errors.push({ row: rowNum, error: 'Missing transaction date' });
          return;
        }
        if (!item && !inv) {
          errors.push({ row: rowNum, error: 'Missing item or invoice number' });
          return;
        }
        valid++;
      } else if (importType === 'expenses') {
        const desc = row[columnMap['description'] || ''];
        const amount = parseFloat(row[columnMap['amount'] || '']);
        if (!desc) {
          errors.push({ row: rowNum, error: 'Missing expense description' });
          return;
        }
        if (isNaN(amount) || amount <= 0) {
          errors.push({ row: rowNum, error: `Invalid expense amount: "${row[columnMap['amount']]}"` });
          return;
        }
        valid++;
      }
    });

    setValidationErrors(errors);
    setValidRowCount(valid);
    setStep(3);
  };

  // Execute Final Import
  const handleExecuteImport = async () => {
    if (!uploadedFile) return;
    setIsProcessing(true);

    try {
      let importedCount = 0;

      if (importType === 'products') {
        const toSave: Array<Omit<Product, 'id' | 'created_at' | 'updated_at'>> = [];
        rawRows.forEach(row => {
          const nameVal = row[columnMap['name'] || ''];
          if (!nameVal || String(nameVal).trim() === '') return;

          const pCost = parseFloat(row[columnMap['purchase_cost'] || '']) || 0;
          const sPrice = parseFloat(row[columnMap['selling_price'] || '']) || 0;
          const stock = parseFloat(row[columnMap['stock_quantity'] || '']) || 0;

          toSave.push({
            business_id: business.id,
            user_id: business.user_id,
            name: String(nameVal).trim(),
            sku: String(row[columnMap['sku'] || ''] || `SKU-${Date.now().toString().slice(-4)}`).trim(),
            category: String(row[columnMap['category'] || ''] || 'General').trim(),
            purchase_cost: pCost,
            selling_price: sPrice,
            stock_quantity: stock,
            reorder_threshold: 5,
            unit: String(row[columnMap['unit'] || ''] || 'pcs').trim(),
          });
        });

        importedCount = await onImportProducts(toSave);
      } else if (importType === 'sales') {
        const toSave: Array<Omit<Sale, 'id' | 'created_at'>> = [];
        rawRows.forEach((row, idx) => {
          const dateVal = row[columnMap['date'] || ''] || new Date().toISOString().split('T')[0];
          const invVal = row[columnMap['invoice_number'] || ''] || `IMP-INV-${Date.now()}-${idx}`;
          const prodName = row[columnMap['product_name'] || ''] || 'Imported Item';
          const qty = parseFloat(row[columnMap['quantity'] || '']) || 1;
          const price = parseFloat(row[columnMap['unit_price'] || '']) || 0;
          const cost = parseFloat(row[columnMap['purchase_cost'] || '']) || 0;
          const totalVal = qty * price;
          const totalCostVal = qty * cost;

          toSave.push({
            business_id: business.id,
            user_id: business.user_id,
            invoice_number: invVal,
            date: dateVal,
            customer_name: row[columnMap['customer_name'] || ''] || 'Walk-in',
            customer_phone: row[columnMap['customer_phone'] || ''] || undefined,
            subtotal: totalVal,
            discount: 0,
            tax: 0,
            total: totalVal,
            total_cost: totalCostVal,
            payment_method: (row[columnMap['payment_method'] || ''] || 'Cash') as any,
            payment_status: (row[columnMap['payment_status'] || ''] || 'Paid') as any,
            amount_paid: totalVal,
            amount_due: 0,
            notes: 'Imported via CSV',
            items: [
              {
                id: '',
                sale_id: '',
                business_id: business.id,
                user_id: business.user_id,
                product_name: prodName,
                quantity: qty,
                unit_price: price,
                purchase_cost: cost,
                discount: 0,
                total: totalVal,
              },
            ],
          });
        });

        importedCount = await onImportSales(toSave);
      } else if (importType === 'expenses') {
        const toSave: Array<Omit<Expense, 'id' | 'created_at'>> = [];
        rawRows.forEach(row => {
          const desc = row[columnMap['description'] || ''];
          const amt = parseFloat(row[columnMap['amount'] || '']) || 0;
          if (!desc || amt <= 0) return;

          toSave.push({
            business_id: business.id,
            user_id: business.user_id,
            date: row[columnMap['date'] || ''] || new Date().toISOString().split('T')[0],
            category: row[columnMap['category'] || ''] || 'Miscellaneous',
            description: String(desc).trim(),
            amount: amt,
            payment_method: (row[columnMap['payment_method'] || ''] || 'Cash') as any,
            reference_no: row[columnMap['reference_no'] || ''] || undefined,
            is_cogs: false,
          });
        });

        importedCount = await onImportExpenses(toSave);
      }

      // Log import job audit record
      await saveImportJob({
        id: `imp-${Date.now()}`,
        business_id: business.id,
        user_id: business.user_id,
        type: importType,
        filename: uploadedFile.name,
        total_rows: rawRows.length,
        imported_rows: importedCount,
        failed_rows: validationErrors.length,
        errors: validationErrors.map(e => ({ row: e.row, error: e.error })),
        created_at: new Date().toISOString(),
      });

      setImportSuccessMessage(`Successfully imported ${importedCount} ${importType} records!`);
      setIsProcessing(false);
    } catch (err: any) {
      alert(`Import failed: ${err.message || 'Unknown error'}`);
      setIsProcessing(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setUploadedFile(null);
    setHeaders([]);
    setRawRows([]);
    setColumnMap({});
    setValidationErrors([]);
    setImportSuccessMessage(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-white">Import & Export Data</h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
              CSV & Excel Ready
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tabs: Import vs Export */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-3">
          <button
            onClick={() => setActiveTab('IMPORT')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'IMPORT'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Import Historical Records
          </button>
          <button
            onClick={() => setActiveTab('EXPORT')}
            className={`pb-3 px-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'EXPORT'
                ? 'border-indigo-500 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Export All Records (CSV)
          </button>
        </div>

        {/* TAB 1: IMPORT WIZARD */}
        {activeTab === 'IMPORT' && (
          <div className="p-5 space-y-4">
            {importSuccessMessage ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-white">{importSuccessMessage}</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Your business dashboard and long-term analytics engine will immediately reflect these updated figures.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={resetWizard}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700"
                  >
                    Import Another File
                  </button>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-500"
                  >
                    Done & View Records
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Stepper Progress */}
                <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                  <span className={`font-semibold ${step >= 1 ? 'text-indigo-400' : ''}`}>
                    1. Select & Upload
                  </span>
                  <span>→</span>
                  <span className={`font-semibold ${step >= 2 ? 'text-indigo-400' : ''}`}>
                    2. Column Mapping
                  </span>
                  <span>→</span>
                  <span className={`font-semibold ${step === 3 ? 'text-indigo-400' : ''}`}>
                    3. Validation & Finish
                  </span>
                </div>

                {/* STEP 1: SELECT & UPLOAD */}
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        What data are you importing?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['sales', 'products', 'expenses'] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setImportType(t)}
                            className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition ${
                              importType === t
                                ? 'bg-indigo-950 border-indigo-500 text-white'
                                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {t} Records
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Download Sample Template */}
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        <span className="text-slate-300">Download formatted CSV template for {importType}</span>
                      </div>
                      <button
                        onClick={() => downloadCSVTemplate(importType)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium border border-slate-700 inline-flex items-center gap-1 transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Template.csv</span>
                      </button>
                    </div>

                    {/* Upload Drop Zone */}
                    <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-slate-950/30 hover:bg-slate-950/50 transition">
                      <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                      <span className="text-xs font-semibold text-white">Select or drop CSV file here</span>
                      <span className="text-[11px] text-slate-500 mt-1">Supports standard CSV files with commas</span>
                      <input
                        type="file"
                        accept=".csv,text/csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* STEP 2: COLUMN MAPPING */}
                {step === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">
                        Uploaded file: <strong className="text-white">{uploadedFile?.name}</strong> ({rawRows.length} rows)
                      </span>
                      <button
                        onClick={resetWizard}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        Change File
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Match your CSV column headers to the target {importType} fields:
                    </p>

                    <div className="space-y-2 max-h-60 overflow-y-auto bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                      {importType === 'products' && (
                        <>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300 font-medium">Product Name *</span>
                            <select
                              value={columnMap['name'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, name: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Selling Price (₹) *</span>
                            <select
                              value={columnMap['selling_price'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, selling_price: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Purchase Cost (₹)</span>
                            <select
                              value={columnMap['purchase_cost'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, purchase_cost: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Stock Quantity</span>
                            <select
                              value={columnMap['stock_quantity'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, stock_quantity: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {importType === 'sales' && (
                        <>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300 font-medium">Date (YYYY-MM-DD) *</span>
                            <select
                              value={columnMap['date'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, date: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Invoice Number</span>
                            <select
                              value={columnMap['invoice_number'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, invoice_number: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Product / Item Name</span>
                            <select
                              value={columnMap['product_name'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, product_name: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Sale Total / Unit Price</span>
                            <select
                              value={columnMap['unit_price'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, unit_price: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}

                      {importType === 'expenses' && (
                        <>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300 font-medium">Description *</span>
                            <select
                              value={columnMap['description'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, description: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300 font-medium">Amount (₹) *</span>
                            <select
                              value={columnMap['amount'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, amount: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-center justify-between text-xs py-1">
                            <span className="text-slate-300">Category</span>
                            <select
                              value={columnMap['category'] || ''}
                              onChange={e => setColumnMap({ ...columnMap, category: e.target.value })}
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="">(Select Header)</option>
                              {headers.map(h => (
                                <option key={h} value={h}>{h}</option>
                              ))}
                            </select>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={resetWizard}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleProceedToValidation}
                        className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        <span>Validate Data</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: VALIDATION SUMMARY & CONFIRM */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-emerald-950/60 border border-emerald-800 p-3 rounded-xl">
                        <span className="text-[11px] text-emerald-300 font-medium">Valid Ready Rows</span>
                        <div className="text-xl font-bold text-emerald-400 mt-1">{validRowCount} rows</div>
                      </div>
                      <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[11px] text-slate-400 font-medium">Flagged Errors</span>
                        <div className="text-xl font-bold text-rose-400 mt-1">{validationErrors.length} rows</div>
                      </div>
                    </div>

                    {validationErrors.length > 0 && (
                      <div className="bg-rose-950/40 border border-rose-900/60 p-3 rounded-xl max-h-40 overflow-y-auto text-xs space-y-1">
                        <span className="font-semibold text-rose-300 block">Row Validation Errors:</span>
                        {validationErrors.map((err, i) => (
                          <div key={i} className="text-rose-400/90 text-[11px]">
                            • Row {err.row}: {err.error}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs"
                      >
                        Back to Mapping
                      </button>
                      <button
                        type="button"
                        disabled={validRowCount === 0 || isProcessing}
                        onClick={handleExecuteImport}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/25"
                      >
                        {isProcessing ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Importing...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm Import ({validRowCount} rows)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* TAB 2: EXPORT OPTIONS */}
        {activeTab === 'EXPORT' && (
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-300">
              Export complete business records to CSV format for local backup, spreadsheet analysis, or tax filing:
            </p>

            <div className="space-y-3">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Sales & Invoicing Ledger</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {sales.length} historical sales transactions with line-item COGS and payment status
                  </p>
                </div>
                <button
                  onClick={() => exportSalesToCSV(sales)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Sales</span>
                </button>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Products & Inventory Catalog</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {products.length} products with stock quantity, cost, and inventory valuation
                  </p>
                </div>
                <button
                  onClick={() => exportProductsToCSV(products)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Products</span>
                </button>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Expense Ledger</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {expenses.length} overhead expenses classified by OPEX and category
                  </p>
                </div>
                <button
                  onClick={() => exportExpensesToCSV(expenses)}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Expenses</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
