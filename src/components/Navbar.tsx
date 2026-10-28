import React, { useState } from 'react';
import {
  TrendingUp,
  Settings,
  Download,
  CloudOff,
  Sparkles,
  Trash2,
  CheckCircle2,
  Bell,
  X,
  Share2,
  ArrowRight,
  Store,
  Building2,
  LogOut,
  UserCheck,
  LogIn,
  Copy,
  Check,
} from 'lucide-react';
import { Business, Product, Sale, StoreType } from '../types';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { isDemoMode, clearAllBusinessData } from '../lib/storage';
import { generateProactiveAlerts, generateWholesalePurchaseOrderText } from '../lib/notifications';
import { useAuth } from '../lib/authContext';

interface NavbarProps {
  business: Business;
  products?: Product[];
  sales?: Sale[];
  onOpenSettings: () => void;
  onOpenImportExport: () => void;
  onNavigateToDashboard?: () => void;
  supabaseConnected: boolean;
  onRefreshData: () => void;
  onOpenAuth?: () => void;
  onToggleStoreType?: (newType: StoreType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  business,
  products = [],
  sales = [],
  onOpenSettings,
  onOpenImportExport,
  onNavigateToDashboard,
  supabaseConnected,
  onRefreshData,
  onOpenAuth,
  onToggleStoreType,
}) => {
  const { user, isGuest, signOutUser, storeType, setStoreType } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const demoActive = isDemoMode();
  
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Proactive Alerts
  const proactiveAlerts = React.useMemo(() => {
    return generateProactiveAlerts(products, sales, business.currency_symbol);
  }, [products, sales, business.currency_symbol]);

  const multiStockAlert = proactiveAlerts.find((a) => a.type === 'MULTI_LOW_STOCK');

  const handleClearDemo = () => {
    clearAllBusinessData();
    onRefreshData();
  };

  const handleCopySupplierOrder = () => {
    if (!multiStockAlert?.items) return;
    const text = generateWholesalePurchaseOrderText(
      business.name,
      multiStockAlert.items,
      business.currency_symbol
    );
    navigator.clipboard?.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 sm:px-6">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Brand & Business Selector */}
        <div className="flex items-center justify-between w-full sm:w-auto gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Store className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight text-white">Sale Analytics</h1>
                
                {/* Store Badge */}
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                  <span>Daily Profit & Loss</span>
                </span>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span className="font-medium text-slate-200">{business.name}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400">{business.category}</span>
              </p>
            </div>
          </div>

          {/* Mobile Right Action Icons */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              {proactiveAlerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {proactiveAlerts.length}
                </span>
              )}
            </button>

            {user ? (
              <button
                onClick={signOutUser}
                className="p-2 rounded-lg bg-slate-800 text-slate-300 border border-slate-700"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4 text-rose-400" />
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="p-2 rounded-lg bg-indigo-600 text-white"
                title="Sign In"
              >
                <LogIn className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Controls & Badges */}
        <div className="flex items-center flex-wrap justify-end gap-2.5 w-full sm:w-auto">
          {/* Notification Bell (Desktop) */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationDrawer(!showNotificationDrawer)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/90 text-slate-200 border border-slate-700 hover:bg-slate-700 text-xs font-medium transition relative"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span>Alerts</span>
              {proactiveAlerts.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-bold animate-pulse">
                  {proactiveAlerts.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown Drawer */}
            {showNotificationDrawer && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">Automated Proactive Alerts</span>
                  </div>
                  <button
                    onClick={() => setShowNotificationDrawer(false)}
                    className="p-1 rounded text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {proactiveAlerts.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-1.5 opacity-80" />
                    <span className="font-semibold text-slate-300">All inventory healthy!</span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No products currently below reorder thresholds.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {proactiveAlerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                          alert.severity === 'critical'
                            ? 'bg-rose-950/60 border-rose-800 text-rose-200'
                            : 'bg-amber-950/60 border-amber-800 text-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            {alert.title}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {alert.description}
                        </p>
                        {alert.type === 'MULTI_LOW_STOCK' && alert.items && (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setShowNotificationDrawer(false);
                                if (onNavigateToDashboard) onNavigateToDashboard();
                              }}
                              className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5"
                            >
                              <span>View in Dashboard</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={handleCopySupplierOrder}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[10px] flex items-center gap-1"
                            >
                              {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                              <span>{copiedText ? 'Copied!' : 'Copy Order'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Online / Offline Status */}
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800/60 text-xs font-medium animate-pulse">
              <CloudOff className="w-3.5 h-3.5 text-amber-400" />
              <span>Offline (Cached)</span>
            </div>
          )}

          {/* Demo Mode Badge */}
          {demoActive && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>14-Mo Demo Data</span>
              <button
                onClick={handleClearDemo}
                className="ml-1 text-slate-400 hover:text-rose-400 transition"
                title="Reset demo data"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* User Auth Profile Badge */}
          {user ? (
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs">
              <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-[11px]">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-200 max-w-[120px] truncate leading-tight">
                  {user.displayName || user.email || user.phoneNumber || 'Store Owner'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {isGuest ? 'Demo Account' : user.phoneNumber ? 'Mobile Verified' : 'Signed In'}
                </span>
              </div>
              {isGuest ? (
                <button
                  type="button"
                  onClick={onOpenAuth}
                  className="ml-1 px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[10px] transition cursor-pointer"
                >
                  Create Account
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signOutUser}
                  className="ml-1 p-1 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium shadow-md shadow-indigo-600/25 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 text-white text-xs font-semibold hover:from-indigo-500 hover:to-indigo-400 shadow-md shadow-indigo-600/25 transition active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install App</span>
            </button>
          )}

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 hover:bg-slate-700 text-xs font-medium transition cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-400" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
