import React from 'react';
import { X, Printer, Share2 } from 'lucide-react';
import { Sale, Business } from '../types';
import { formatCurrency, formatDate } from '../lib/formatters';

interface ReceiptModalProps {
  sale: Sale | null;
  business: Business;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  business,
  onClose,
}) => {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const [copiedShare, setCopiedShare] = React.useState(false);

  const handleWhatsAppShare = () => {
    const text = `*INVOICE: ${sale.invoice_number}*\nStore: ${business.name}\nDate: ${formatDate(sale.date)}\nTotal: ${formatCurrency(sale.total, business.currency_symbol)}\nPayment: ${sale.payment_method} (${sale.payment_status})\nThank you for shopping with us!`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Top Action Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">Invoice Details</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
              {sale.invoice_number}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper */}
        <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-sans text-xs">
          {/* Header */}
          <div className="text-center pb-4 border-b border-dashed border-gray-300">
            <h2 className="text-base font-bold text-gray-950 tracking-tight uppercase">{business.name}</h2>
            {business.address && <p className="text-gray-600 mt-0.5">{business.address}</p>}
            <div className="flex items-center justify-center gap-3 text-gray-500 mt-1 text-[11px]">
              {business.phone && <span>Ph: {business.phone}</span>}
              {business.tax_id && <span>GSTIN: {business.tax_id}</span>}
            </div>
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-2 gap-2 py-3 border-b border-dashed border-gray-300 text-[11px]">
            <div>
              <span className="text-gray-500 block">Invoice No:</span>
              <span className="font-bold font-mono text-gray-800">{sale.invoice_number}</span>
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">Date:</span>
              <span className="font-semibold text-gray-800">{formatDate(sale.date)}</span>
            </div>
            <div>
              <span className="text-gray-500 block">Customer:</span>
              <span className="font-semibold text-gray-800">{sale.customer_name || 'Walk-in Customer'}</span>
              {sale.customer_phone && <span className="block text-gray-500">{sale.customer_phone}</span>}
            </div>
            <div className="text-right">
              <span className="text-gray-500 block">Payment Mode:</span>
              <span className="font-semibold text-gray-800">{sale.payment_method}</span>
              <span className={`block font-bold ${sale.payment_status === 'Paid' ? 'text-emerald-700' : 'text-amber-700'}`}>
                {sale.payment_status}
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-3 border-b border-dashed border-gray-300">
            <div className="grid grid-cols-12 font-bold text-gray-700 pb-1.5 border-b border-gray-200 text-[11px]">
              <span className="col-span-6">Item</span>
              <span className="col-span-2 text-center">Qty</span>
              <span className="col-span-2 text-right">Rate</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            <div className="divide-y divide-gray-100">
              {sale.items && sale.items.length > 0 ? (
                sale.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 py-1.5 text-[11px] text-gray-800">
                    <span className="col-span-6 font-medium truncate pr-1">{it.product_name}</span>
                    <span className="col-span-2 text-center text-gray-600">{it.quantity}</span>
                    <span className="col-span-2 text-right text-gray-600">₹{it.unit_price}</span>
                    <span className="col-span-2 text-right font-semibold">₹{it.total}</span>
                  </div>
                ))
              ) : (
                <div className="grid grid-cols-12 py-1.5 text-[11px] text-gray-800">
                  <span className="col-span-6 font-medium">Standard Sale</span>
                  <span className="col-span-2 text-center">1</span>
                  <span className="col-span-2 text-right">₹{sale.total}</span>
                  <span className="col-span-2 text-right font-semibold">₹{sale.total}</span>
                </div>
              )}
            </div>
          </div>

          {/* Financial Totals */}
          <div className="pt-3 pb-2 space-y-1 text-[11px]">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal:</span>
              <span>₹{sale.subtotal.toFixed(2)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount:</span>
                <span>- ₹{sale.discount.toFixed(2)}</span>
              </div>
            )}
            {sale.tax > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>GST / Tax:</span>
                <span>+ ₹{sale.tax.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t border-gray-300">
              <span>Grand Total:</span>
              <span>₹{sale.total.toFixed(2)}</span>
            </div>
            {sale.payment_status !== 'Paid' && (
              <div className="flex justify-between text-amber-800 font-semibold pt-1">
                <span>Outstanding Due:</span>
                <span>₹{(sale.amount_due || (sale.total - sale.amount_paid)).toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Footer Note */}
          <div className="text-center pt-3 mt-2 border-t border-dashed border-gray-300 text-[10px] text-gray-500">
            {sale.notes && <p className="italic mb-1">"{sale.notes}"</p>}
            <p>Thank you for your business! Please visit again.</p>
            <p className="text-[9px] text-gray-400 mt-1">Generated by Sale Analytics</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition"
          >
            <Share2 className="w-4 h-4" />
            <span>{copiedShare ? 'Copied Receipt!' : 'Copy / Share Bill'}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition shadow-lg shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};
