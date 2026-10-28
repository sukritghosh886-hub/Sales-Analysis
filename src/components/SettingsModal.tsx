import React, { useState } from 'react';
import {
  Settings,
  Building,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Trash2,
  Smartphone,
  Save,
  X,
  Mail,
  User,
  ShieldCheck,
  LogOut,
  Phone,
} from 'lucide-react';
import { Business, CurrencyCode } from '../types';
import {
  generate14MonthDemoData,
  clearAllBusinessData,
} from '../lib/storage';
import { useAuth } from '../lib/authContext';

interface SettingsModalProps {
  business: Business;
  onUpdateBusiness: (updated: Partial<Business>) => Promise<void>;
  onRefreshData: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  business,
  onUpdateBusiness,
  onRefreshData,
  onClose,
}) => {
  const { user, isGuest, signOutUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'BUSINESS' | 'AUTH' | 'DEMO' | 'ANDROID'>('BUSINESS');

  // Business Profile Form
  const [name, setName] = useState(business.name);
  const [category, setCategory] = useState(business.category);
  const [currency, setCurrency] = useState<CurrencyCode>(business.currency);
  const [currencySymbol, setCurrencySymbol] = useState(business.currency_symbol);
  const [taxId, setTaxId] = useState(business.tax_id || '');
  const [phone, setPhone] = useState(business.phone || '');
  const [address, setAddress] = useState(business.address || '');

  // Notifications / feedback
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Save Business Profile
  const handleSaveBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await onUpdateBusiness({
        name: name.trim(),
        category: category.trim(),
        currency,
        currency_symbol: currencySymbol,
        tax_id: taxId.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      });
      setStatusMessage({ type: 'success', text: 'Business profile updated successfully!' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to update business profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Demo Data Controls
  const handleLoadDemo = () => {
    generate14MonthDemoData(business.store_type || 'shop');
    onRefreshData();
    setStatusMessage({ type: 'success', text: '14 months of realistic store data loaded successfully!' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleClearData = () => {
    clearAllBusinessData();
    onRefreshData();
    setStatusMessage({ type: 'success', text: 'Store records cleared successfully.' });
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-white">Store Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 overflow-x-auto">
          {[
            { id: 'BUSINESS' as const, label: 'Store Profile', icon: Building },
            { id: 'AUTH' as const, label: 'User Account', icon: User },
            { id: 'DEMO' as const, label: 'Sample Data', icon: Sparkles },
            { id: 'ANDROID' as const, label: 'Mobile App (PWA)', icon: Smartphone },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id);
                  setStatusMessage(null);
                }}
                className={`py-3 px-3.5 text-xs font-semibold border-b-2 flex items-center gap-1.5 whitespace-nowrap transition cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/70 border-rose-800 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: STORE PROFILE */}
          {activeTab === 'BUSINESS' && (
            <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Store / Mall Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Category</label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Tax ID / GSTIN</label>
                  <input
                    type="text"
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Store Address (printed on receipts)</label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Currency Code</label>
                  <select
                    value={currency}
                    onChange={(e) => {
                      const c = e.target.value as CurrencyCode;
                      setCurrency(c);
                      setCurrencySymbol(c === 'INR' ? '₹' : c === 'USD' ? '$' : c === 'EUR' ? '€' : '£');
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="INR">INR (₹ - Indian Rupee)</option>
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="EUR">EUR (€ - Euro)</option>
                    <option value="GBP">GBP (£ - British Pound)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">Currency Symbol</label>
                  <input
                    type="text"
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save Store Profile'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: USER ACCOUNT */}
          {activeTab === 'AUTH' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                    {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white">
                      {user?.displayName || 'Store Owner'}
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      {isGuest ? 'Demo Account' : user?.email || user?.phoneNumber || 'Active Account'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-3 space-y-1.5 text-[11px] text-slate-300">
                  {user?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  {user?.phoneNumber && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{user.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Business records secured to your private account</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await signOutUser();
                      onClose();
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAMPLE DATA */}
          {activeTab === 'DEMO' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-white text-sm">Load 14-Month Sample Dataset</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Loads 14 continuous months of realistic small store counter transactions, popular FMCG grocery items, and daily shop expenses.
                </p>
                <button
                  type="button"
                  onClick={handleLoadDemo}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 flex items-center gap-2 transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Sample Store Records</span>
                </button>
              </div>

              <div className="bg-rose-950/30 border border-rose-900/60 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-rose-300">
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span className="font-bold text-sm">Reset Store Records</span>
                </div>
                <p className="text-rose-400/80 leading-relaxed text-[11px]">
                  Clears all current sales, products, and expenses, returning to a clean slate.
                </p>
                <button
                  type="button"
                  onClick={handleClearData}
                  className="px-4 py-2 rounded-xl bg-rose-900 hover:bg-rose-800 text-rose-200 text-xs font-semibold border border-rose-700/60 transition cursor-pointer"
                >
                  Reset Records
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: MOBILE & TABLET PWA */}
          {activeTab === 'ANDROID' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <span className="font-bold text-white text-sm">Instant Mobile & Tablet Installation</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Sale Analytics is optimized as a mobile-first Progressive Web App (PWA):
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-[11px] pl-1">
                  <li>Open this app on your mobile phone or tablet browser.</li>
                  <li>Tap the <strong>"Install App"</strong> button in the top navigation bar.</li>
                  <li>Or tap browser menu (<strong className="text-white">⋮</strong> or Share) and select <strong>"Add to Home screen"</strong>.</li>
                  <li>The app will launch in standalone full-screen mode like a native counter billing app.</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
