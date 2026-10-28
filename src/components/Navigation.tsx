import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  Package,
  Wallet,
  TrendingUp,
  ArrowUpDown,
  Settings,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'sales' | 'products' | 'expenses' | 'analytics' | 'import-export' | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  lowStockCount?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onTabChange,
  lowStockCount = 0,
}) => {
  const tabs = [
    { id: 'dashboard' as NavTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sales' as NavTab, label: 'Sales Register', icon: Receipt },
    { id: 'products' as NavTab, label: 'Products & Stock', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'expenses' as NavTab, label: 'Shop Expenses', icon: Wallet },
    { id: 'analytics' as NavTab, label: 'Analytics (12+ Mo)', icon: TrendingUp, highlight: true },
    { id: 'import-export' as NavTab, label: 'Import/Export', icon: ArrowUpDown },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Desktop / Tablet Top Tab Navigation */}
      <nav className="hidden md:flex border-b border-slate-800 bg-slate-900/60 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto w-full py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-medium transition whitespace-nowrap relative ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : tab.highlight ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                    isActive ? 'bg-white text-indigo-700' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  }`}>
                    {tab.badge}
                  </span>
                )}
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Mobile Fixed Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur border-t border-slate-800 px-2 py-1.5">
        <div className="grid grid-cols-5 gap-1">
          {tabs.filter(t => t.id !== 'import-export' && t.id !== 'settings').map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-medium transition relative ${
                  isActive
                    ? 'text-indigo-400 bg-indigo-950/50'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4 mb-0.5" />
                  {tab.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 px-1 text-[8px] font-bold bg-rose-600 text-white rounded-full">
                      {tab.badge}
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[60px]">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
