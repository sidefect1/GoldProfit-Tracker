
import React, { useState, useEffect } from 'react';
import { ProjectSettings, MarketplaceRates, ProjectSnapshot, KaratEnum, ProfitConfig } from '../types';
import { Save, AlertCircle, DollarSign, Package, Layers, TrendingUp, Calculator, Book, Globe, Lock, Info, ChevronDown, ChevronUp, ShoppingBag, Tag, ChevronsLeft, ChevronsRight, RefreshCw, AlertTriangle, X, Menu, LineChart, InfoIcon, Coins, CheckCircle, ArrowRight } from 'lucide-react';
import { formatCurrency, formatDate, formatNumber } from '../utils/calculations';
import { DEFAULT_PROFIT_CONFIG } from '../constants';

interface SidebarProps {
  settings: ProjectSettings;
  updateSettings: (newSettings: ProjectSettings) => void;
  onExport: () => void;
  activeTab: 'builder' | 'monitor' | 'marketplace'; // controlled by Workspace
  onSaveBook: (name: string) => void;
  onOverwriteBook: () => void; // New Prop
  globalGoldPrice: number;
  marketplaceRates: MarketplaceRates;
  selectedKarat?: KaratEnum; // New Prop to determine scope
  // For Monitor Mode
  monitorSubMode?: 'standard' | 'coupon' | 'offsite';
}

// --- HELPER COMPONENTS ---

// Input that handles commas as dots for decimals and maintains local state
const SmartNumberInput = ({ 
  value, 
  onChange, 
  prefix, 
  suffix,
  disabled = false,
  className = ""
}: { 
  value: number; 
  onChange: (val: number) => void; 
  prefix?: string; 
  suffix?: string;
  disabled?: boolean;
  className?: string;
}) => {
  const [localStr, setLocalStr] = useState<string>(value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
        setLocalStr(value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalStr(raw);
    const normalized = raw.replace(',', '.');
    if (normalized === '' || normalized === '-' || normalized === '.') return;
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) onChange(parsed);
  };

  const handleBlur = () => {
      setIsFocused(false);
      setLocalStr(value.toString());
  };

  return (
    <div className={`relative rounded-md shadow-sm group ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''} ${className}`}>
      {prefix && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <span className="text-gray-400 sm:text-xs group-focus-within:text-blue-500 transition-colors font-medium">{prefix}</span>
        </div>
      )}
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        className={`block w-full rounded-md border-gray-300 bg-white py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 text-sm sm:leading-6 transition-all ${prefix ? 'pl-6' : 'pl-3'} ${suffix ? 'pr-7' : 'pr-3'} ${disabled ? 'bg-gray-100 text-gray-500 select-none' : ''}`}
        value={localStr}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
      />
      {suffix && (
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <span className="text-gray-400 sm:text-xs font-medium">{suffix}</span>
        </div>
      )}
    </div>
  );
};

const ReadOnlyField = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{label}</span>
        <span className="text-sm font-bold text-gray-800">{value}</span>
    </div>
);

const AccordionItem = ({ 
    title, 
    icon: Icon, 
    isOpen, 
    onToggle, 
    children, 
    badge 
}: { 
    title: string, 
    icon: any, 
    isOpen: boolean, 
    onToggle: () => void, 
    children?: React.ReactNode, 
    badge?: string 
}) => {
    return (
        <div className="border-b border-gray-100 last:border-0">
            <button 
                onClick={onToggle}
                className={`w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors ${isOpen ? 'bg-gray-50/50' : ''}`}
            >
                <div className="flex items-center gap-2.5 text-gray-700">
                    <Icon size={16} className={`text-gray-400 ${isOpen ? 'text-blue-600' : ''}`} />
                    <span className="text-sm font-bold tracking-wide">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {badge && <span className="text-[10px] font-medium bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{badge}</span>}
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
            </button>
            
            {isOpen && (
                <div className="px-4 pb-5 pt-1">
                    {children}
                </div>
            )}
        </div>
    );
};

const InputLabel = ({ label }: { label: string }) => (
    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">{label}</label>
);

// --- MAIN COMPONENT ---

export const Sidebar: React.FC<SidebarProps> = ({ 
  settings, 
  updateSettings, 
  onExport,
  activeTab,
  onSaveBook,
  onOverwriteBook,
  globalGoldPrice,
  marketplaceRates,
  selectedKarat,
  monitorSubMode
}) => {
  
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [priceBookName, setPriceBookName] = useState('');
  
  const [pendingUpdate, setPendingUpdate] = useState<{key: keyof ProjectSettings | keyof ProfitConfig, value: any, scope?: 'global' | 'scoped'} | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  // Local state for Marketplace Discount Input (to support Apply flow)
  const [localDiscount, setLocalDiscount] = useState<number>(settings.marketplaceDiscount || 25);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      'market': true,
      'costs': false,
      'strategy': true,
      'visuals': false
  });

  const toggleSection = (key: string) => {
      setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Sync local discount when settings change externally
  useEffect(() => {
      setLocalDiscount(settings.marketplaceDiscount || 25);
  }, [settings.marketplaceDiscount]);

  // Toast Timer
  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);
  
  // Fields that trigger pending update check
  const CALCULATION_FIELDS_GLOBAL = [
      'goldPricePerGram', 'laborModel', 'laborMilyem', 
      'shippingCost', 'packagingCost', 'overheadCost'
  ];
  
  const CALCULATION_FIELDS_SCOPED = [
      'profitTargetMode', 'profitTargetValue', 'psychologicalRounding', 'variableProfit'
  ];

  const handleUpdateGlobal = (field: keyof ProjectSettings, value: any) => {
      const hasOverrides = settings.priceOverrides && Object.keys(settings.priceOverrides).length > 0;
      const affectsCalculation = CALCULATION_FIELDS_GLOBAL.includes(field as string);

      if (hasOverrides && affectsCalculation && activeTab === 'builder') {
          setPendingUpdate({ key: field, value, scope: 'global' });
      } else {
          updateSettings({ ...settings, [field]: value });
      }
  };

  const handleUpdateScoped = (field: keyof ProfitConfig, value: any) => {
      if (!selectedKarat) return;

      const hasOverrides = settings.priceOverrides && Object.keys(settings.priceOverrides).length > 0;
      const affectsCalculation = CALCULATION_FIELDS_SCOPED.includes(field as string);

      if (hasOverrides && affectsCalculation && activeTab === 'builder') {
          setPendingUpdate({ key: field, value, scope: 'scoped' });
      } else {
          const currentStrategy = settings.profitStrategyByKarat?.[selectedKarat] || DEFAULT_PROFIT_CONFIG;
          const updatedStrategy = { ...currentStrategy, [field]: value };
          
          updateSettings({
              ...settings,
              profitStrategyByKarat: {
                  ...settings.profitStrategyByKarat,
                  [selectedKarat]: updatedStrategy
              }
          });
      }
  };

  const updateVariableProfit = (key: string, val: number) => {
     if (!selectedKarat) return;
     const currentStrategy = settings.profitStrategyByKarat?.[selectedKarat] || DEFAULT_PROFIT_CONFIG;
     const currentVar = currentStrategy.variableProfit || DEFAULT_PROFIT_CONFIG.variableProfit;
     const updatedVar = { ...currentVar, [key]: val };
     handleUpdateScoped('variableProfit', updatedVar);
  };

  const confirmUpdate = (resetManuals: boolean) => {
      if (!pendingUpdate) return;
      
      let newSettings = { ...settings };
      if (resetManuals) newSettings.priceOverrides = {};

      if (pendingUpdate.scope === 'global') {
          newSettings = { ...newSettings, [pendingUpdate.key as keyof ProjectSettings]: pendingUpdate.value };
      } else if (pendingUpdate.scope === 'scoped' && selectedKarat) {
          const currentStrategy = settings.profitStrategyByKarat?.[selectedKarat] || DEFAULT_PROFIT_CONFIG;
          const updatedStrategy = { ...currentStrategy, [pendingUpdate.key as keyof ProfitConfig]: pendingUpdate.value };
          newSettings.profitStrategyByKarat = {
              ...newSettings.profitStrategyByKarat,
              [selectedKarat]: updatedStrategy
          };
      }

      updateSettings(newSettings);
      setPendingUpdate(null);
  };

  const handleColorThresholdUpdate = (key: keyof typeof settings.colorThresholds, value: number) => {
    updateSettings({
      ...settings,
      colorThresholds: { ...settings.colorThresholds, [key]: value }
    });
  }

  const handleSaveClick = () => {
    if (!priceBookName.trim()) {
        setToast({ message: 'Please enter a pricebook name.', type: 'error' });
        return;
    }
    onSaveBook(priceBookName);
    setToast({ message: `Pricebook saved: ${priceBookName}`, type: 'success' });
    setPriceBookName('');
  };

  const handleOverwriteClick = () => {
     if (!settings.activePriceBookId) return;
     setShowOverwriteConfirm(true);
  };

  const confirmOverwrite = () => {
     onOverwriteBook();
     setShowOverwriteConfirm(false);
     const currentBook = settings.priceBooks.find(b => b.id === settings.activePriceBookId);
     setToast({ message: `Pricebook overwritten: ${currentBook?.name || 'Current'}`, type: 'success' });
  };

  // New Handler for Marketplace Apply
  const handleApplyDiscount = () => {
      setIsApplyingDiscount(true);
      // 1. Update the setting
      updateSettings({ ...settings, marketplaceDiscount: localDiscount });
      
      // 2. Lock the snapshot (overwrite active book with new discount in snapshot)
      // We use a slight delay to ensure setting prop propagates or simply call overwrite in sequence if workspace handles it correctly.
      // But updateSettings is likely async in terms of render cycle. 
      // Ideally Workspace should handle this atomic operation, but Sidebar triggers it.
      // We'll optimistically wait a tick then trigger overwrite if a book is active.
      setTimeout(() => {
          if (settings.activePriceBookId) {
              onOverwriteBook();
              setToast({ message: 'Marketplace List Prices updated & locked.', type: 'success' });
          }
          setIsApplyingDiscount(false);
      }, 100);
  };

  const getHeaderStyle = () => {
      switch(activeTab) {
          case 'builder': return isDesktopCollapsed ? 'bg-gray-900 h-full' : 'bg-gray-900 text-white';
          case 'monitor': return isDesktopCollapsed ? 'bg-emerald-900 h-full' : 'bg-emerald-900 text-white';
          case 'marketplace': return isDesktopCollapsed ? 'bg-indigo-900 h-full' : 'bg-indigo-900 text-white';
      }
  };

  const getHeaderIcon = () => {
      switch(activeTab) {
        case 'builder': return <div className={`p-1.5 bg-blue-600 rounded-md shadow-sm ${isDesktopCollapsed ? 'mb-4 mx-auto' : ''}`}><Calculator size={14} className="text-white"/></div>;
        case 'monitor': return <div className={`p-1.5 bg-emerald-500 rounded-md shadow-sm ${isDesktopCollapsed ? 'mb-4 mx-auto' : ''}`}><TrendingUp size={14} className="text-white"/></div>;
        case 'marketplace': return <div className={`p-1.5 bg-indigo-500 rounded-md shadow-sm ${isDesktopCollapsed ? 'mb-4 mx-auto' : ''}`}><ShoppingBag size={14} className="text-white"/></div>;
      }
  };
  
  const getModeLabel = () => {
      switch(activeTab) {
          case 'builder': return 'Build Prices';
          case 'monitor': return 'Monitor Profit';
          case 'marketplace': return 'Marketplace List';
      }
  };

  const MobileToggle = () => (
    <button 
        onClick={() => setIsMobileOpen(true)}
        className="md:hidden fixed top-20 left-4 z-40 bg-gray-900 text-white p-2 rounded-full shadow-lg"
    >
        <Menu size={20} />
    </button>
  );

  const activeProfitConfig = selectedKarat 
      ? (settings.profitStrategyByKarat?.[selectedKarat] || DEFAULT_PROFIT_CONFIG) 
      : DEFAULT_PROFIT_CONFIG;

  const safeVariableProfit = activeProfitConfig.variableProfit || DEFAULT_PROFIT_CONFIG.variableProfit;
  const activeBook = settings.priceBooks.find(b => b.id === settings.activePriceBookId);
  const snapshot = activeBook?.snapshot;

  const sidebarContent = (
      <>
        {/* Sticky Summary Strip */}
        <div className={`p-4 shrink-0 shadow-md z-30 transition-colors duration-300 relative ${getHeaderStyle()}`}>
            <button 
                onClick={() => setIsDesktopCollapsed(true)}
                className="hidden md:block absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                title="Collapse Sidebar"
            >
                <ChevronsLeft size={18} />
            </button>
             <button 
                onClick={() => setIsMobileOpen(false)}
                className="md:hidden absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                title="Close Sidebar"
            >
                <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-2">
                {getHeaderIcon()}
                <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider opacity-60 leading-none mb-0.5">Mode</h3>
                    <div className="font-bold text-sm leading-none tracking-tight">{getModeLabel()}</div>
                </div>
            </div>
            
            {activeTab === 'monitor' && (
                <div className="space-y-2 mt-3 animate-in fade-in slide-in-from-top-1">
                    <div className="bg-emerald-800/50 border border-emerald-700 rounded px-3 py-2">
                        <div className="flex items-center gap-2 text-[10px] text-emerald-200 mb-0.5">
                            <Book size={12} /> 
                            <span className="uppercase tracking-wider font-bold">Active Book</span>
                        </div>
                        <div className="text-white font-medium truncate">
                            {activeBook?.name || 'No Book Selected'}
                        </div>
                        {snapshot && (
                            <div className="text-[10px] text-emerald-300 mt-1">
                                Snapshot: {formatDate(snapshot.date)}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin bg-white pb-20 md:pb-0">
            {activeTab === 'marketplace' ? (
                <div className="p-5 animate-in slide-in-from-left-2 duration-300">
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 text-indigo-700 font-bold mb-2">
                            <Tag size={16} />
                            <span>Listing Strategy</span>
                        </div>
                        <p className="text-xs text-indigo-600/80 leading-relaxed">
                            Enter the discount percentage you plan to offer on the marketplace.
                        </p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <InputLabel label="Planned Discount %" />
                            <SmartNumberInput 
                                suffix="%"
                                value={localDiscount} 
                                onChange={(v) => setLocalDiscount(v)} 
                            />
                            
                            <button 
                                onClick={handleApplyDiscount}
                                disabled={isApplyingDiscount}
                                className="w-full mt-2 bg-indigo-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {isApplyingDiscount ? <RefreshCw size={12} className="animate-spin" /> : <ArrowRight size={12} />}
                                Apply & Lock List Prices
                            </button>
                            
                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                Locking updates the active price book snapshot.
                            </p>
                        </div>
                        <div className="pt-4 border-t border-gray-100">
                             <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Formula</h4>
                             <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-xs font-mono text-gray-600 break-all">
                                 ListPrice = Sale / (1-{settings.marketplaceDiscount}%)
                             </div>
                        </div>
                    </div>
                </div>
            ) : activeTab === 'monitor' ? (
                 <div className="p-5 animate-in slide-in-from-left-2 duration-300">
                    {/* Monitor Sub-Mode Settings */}
                    {monitorSubMode === 'coupon' && settings.marketplace === 'etsy' && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-indigo-800 font-bold mb-3 text-sm">
                                <Tag size={16} /> Coupon Settings
                            </div>
                            <InputLabel label="Coupon Discount %" />
                            <div className="flex gap-2">
                                <SmartNumberInput 
                                    suffix="%"
                                    value={settings.couponDiscountPercent || 30}
                                    onChange={(v) => handleUpdateGlobal('couponDiscountPercent', v)}
                                />
                                <button 
                                    className="bg-indigo-600 text-white px-3 rounded-md font-bold text-xs hover:bg-indigo-700"
                                    onClick={() => {/* Trigger re-render by implied state update above */}}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}

                    {monitorSubMode === 'offsite' && settings.marketplace === 'etsy' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 animate-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 text-amber-800 font-bold mb-3 text-sm">
                                <Globe size={16} /> Offsite Ads Settings
                            </div>
                            <InputLabel label="Offsite Fee %" />
                            <div className="flex gap-2">
                                <SmartNumberInput 
                                    suffix="%"
                                    value={settings.offsiteAdsPercent || 15}
                                    onChange={(v) => handleUpdateGlobal('offsiteAdsPercent', v)}
                                />
                                <button 
                                    className="bg-amber-600 text-white px-3 rounded-md font-bold text-xs hover:bg-amber-700"
                                    onClick={() => {/* Trigger re-render */}}
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    )}

                    {snapshot ? (
                        <>
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                                <Lock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                                <div className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-bold">Locked:</span> Values are fixed from the active price book snapshot.
                                </div>
                            </div>
                            
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Locked Cost Basis</h4>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
                                <ReadOnlyField label="Labor Model" value={snapshot.laborModel} />
                                <ReadOnlyField label="Labor Milyem" value={snapshot.laborMilyem.toString()} />
                                <ReadOnlyField label="Shipping" value={formatCurrency(snapshot.shippingCost)} />
                                <ReadOnlyField label="Packaging" value={formatCurrency(snapshot.packagingCost)} />
                                <ReadOnlyField label="Overhead" value={formatCurrency(snapshot.overheadCost)} />
                            </div>

                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 mt-6">Marketplace Fees</h4>
                            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-1">
                                <ReadOnlyField label="Etsy Fee" value={`${snapshot.marketplaceRates.etsy}%`} />
                                <ReadOnlyField label="Shopify Fee" value={`${snapshot.marketplaceRates.shopify}%`} />
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-10 text-gray-400">
                            <AlertCircle size={32} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-sm">No snapshot data found for this book.</p>
                            <p className="text-xs mt-1">Calculations will fallback to current draft settings.</p>
                        </div>
                    )}
                 </div>
            ) : (
                <>
                    {/* Builder Mode Sidebar Content */}
                    <AccordionItem 
                        title="Profit Strategy" 
                        icon={Layers} 
                        isOpen={openSections['strategy']} 
                        onToggle={() => toggleSection('strategy')}
                        badge={selectedKarat || undefined}
                    >
                            {/* ... Strategy Content ... */}
                            <div className="space-y-5">
                                {selectedKarat && (
                                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 p-2 rounded-lg text-[10px] text-blue-700 font-bold uppercase tracking-wide">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                        Editing {selectedKarat} Settings Only
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <InputLabel label="Strategy Mode" />
                                    </div>
                                    <div className="relative mb-3">
                                        <select
                                            value={activeProfitConfig.profitTargetMode}
                                            onChange={(e) => handleUpdateScoped('profitTargetMode', e.target.value)}
                                            className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-8 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
                                        >
                                            <option value="PERCENT">Target % (Fixed)</option>
                                            <option value="USD">Target $ (Fixed)</option>
                                            <option value="VARIABLE_PERCENT">Target Var % + Fixed $</option>
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                                            <ChevronDown size={14} />
                                        </div>
                                    </div>

                                    {activeProfitConfig.profitTargetMode === 'VARIABLE_PERCENT' ? (
                                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 space-y-4">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                     <span className="text-[10px] font-bold text-gray-500 uppercase">Target % Curve</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[9px] text-center block text-gray-400 mb-0.5">Start</label>
                                                        <SmartNumberInput 
                                                            suffix="%" 
                                                            className="text-center font-bold"
                                                            value={safeVariableProfit.percentAtMin} 
                                                            onChange={(v) => updateVariableProfit('percentAtMin', v)} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[9px] text-center block text-gray-400 mb-0.5">End</label>
                                                        <SmartNumberInput 
                                                            suffix="%" 
                                                            className="text-center font-bold"
                                                            value={safeVariableProfit.percentAtMax} 
                                                            onChange={(v) => updateVariableProfit('percentAtMax', v)} 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div>
                                                 <div className="flex justify-between items-center mb-1">
                                                     <span className="text-[10px] font-bold text-gray-500 uppercase">Fixed Profit (+ $)</span>
                                                 </div>
                                                 <SmartNumberInput 
                                                     prefix="$"
                                                     value={safeVariableProfit.fixedAddon || 0}
                                                     onChange={(v) => updateVariableProfit('fixedAddon', v)}
                                                 />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <SmartNumberInput 
                                                prefix={activeProfitConfig.profitTargetMode === 'USD' ? '$' : undefined}
                                                suffix={activeProfitConfig.profitTargetMode === 'PERCENT' ? '%' : undefined}
                                                value={activeProfitConfig.profitTargetValue} 
                                                onChange={(v) => handleUpdateScoped('profitTargetValue', v)} 
                                            />
                                        </div>
                                    )}
                                </div>
                                
                                <div className="flex items-center justify-between pt-2">
                                    <InputLabel label="Rounding (.99)" />
                                    <button 
                                        onClick={() => handleUpdateScoped('psychologicalRounding', !activeProfitConfig.psychologicalRounding)}
                                        className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${activeProfitConfig.psychologicalRounding ? 'bg-blue-600' : 'bg-gray-300'}`}
                                    >
                                        <span className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform duration-200 shadow-sm ${activeProfitConfig.psychologicalRounding ? 'translate-x-4' : ''}`} />
                                    </button>
                                </div>
                            </div>
                    </AccordionItem>

                    {/* NEW: Price Book Actions */}
                    <div className="px-4 py-4 bg-gray-50 border-b border-gray-200 sticky top-0 z-10 flex flex-col gap-3">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Price Book Actions</span>
                        <div>
                            <input 
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                placeholder="e.g. Etsy – Ring – Jan 24 (Mixed)"
                                value={priceBookName}
                                onChange={(e) => setPriceBookName(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleSaveClick}
                                disabled={!priceBookName.trim()}
                                className="flex-1 px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save size={14} /> Save New
                            </button>
                            {settings.activePriceBookId && (
                                <button 
                                    onClick={handleOverwriteClick}
                                    className="flex-1 px-3 py-2 bg-white text-amber-700 border border-amber-200 rounded-lg text-xs font-bold hover:bg-amber-50 shadow-sm flex items-center justify-center gap-1.5 whitespace-nowrap"
                                >
                                    <RefreshCw size={14} /> Overwrite
                                </button>
                            )}
                        </div>
                    </div>

                    <AccordionItem 
                        title="Market Inputs" 
                        icon={DollarSign} 
                        isOpen={openSections['market']} 
                        onToggle={() => toggleSection('market')}
                    >
                        <div className="space-y-4">
                            <div>
                                <InputLabel label="Gold Price (24K)" />
                                <div className="relative group">
                                    <SmartNumberInput 
                                        prefix="$" 
                                        suffix="/g"
                                        value={settings.goldPricePerGram} 
                                        onChange={(v) => handleUpdateGlobal('goldPricePerGram', v)}
                                        disabled={true} // Read Only as per request
                                    />
                                    <div className="absolute inset-0 bg-gray-50/50 cursor-not-allowed group-hover:bg-gray-100/50 transition-colors rounded-md flex items-center justify-center opacity-0 hover:opacity-100">
                                        <span className="text-[10px] text-gray-500 font-bold bg-white px-2 py-1 rounded shadow-sm border border-gray-200">Read Only</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </AccordionItem>

                    <AccordionItem 
                        title="Costs (Base)" 
                        icon={Package} 
                        isOpen={openSections['costs']} 
                        onToggle={() => toggleSection('costs')}
                    >
                        <div className="space-y-4">
                            <div>
                                <InputLabel label="Labor Cost Model" />
                                <select 
                                    className="w-full text-xs rounded-md border-gray-300 py-2 bg-white text-gray-700 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm"
                                    value={settings.laborModel}
                                    onChange={(e) => handleUpdateGlobal('laborModel', e.target.value)}
                                >
                                    <option value="MILYEM_PER_ITEM">Per Item (Milyem)</option>
                                    <option value="MILYEM_PER_GRAM">Per Gram (Milyem)</option>
                                </select>
                            </div>
                            
                            <div>
                                <InputLabel label="Labor (Milyem)" />
                                <SmartNumberInput 
                                    value={settings.laborMilyem} 
                                    onChange={(v) => handleUpdateGlobal('laborMilyem', Math.min(1000, Math.max(0, v)))} 
                                />
                                <div className="text-[9px] text-gray-400 mt-1 italic">100 milyem = %10 of 24K Price</div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <InputLabel label="Shipping" />
                                    <SmartNumberInput prefix="$" value={settings.shippingCost} onChange={(v) => handleUpdateGlobal('shippingCost', v)} />
                                </div>
                                <div>
                                    <InputLabel label="Packaging" />
                                    <SmartNumberInput prefix="$" value={settings.packagingCost} onChange={(v) => handleUpdateGlobal('packagingCost', v)} />
                                </div>
                            </div>

                            <div>
                                <InputLabel label="Ads / Overhead" />
                                <SmartNumberInput prefix="$" value={settings.overheadCost} onChange={(v) => handleUpdateGlobal('overheadCost', v)} />
                            </div>
                        </div>
                    </AccordionItem>

                    <AccordionItem 
                        title="Visuals" 
                        icon={AlertCircle} 
                        isOpen={openSections['visuals']} 
                        onToggle={() => toggleSection('visuals')}
                    >
                        <div>
                            <InputLabel label="Heatmap Thresholds ($)" />
                            <div className="grid grid-cols-2 gap-3 mt-2">
                                <div className="bg-red-50 p-2 rounded border border-red-100">
                                    <span className="block text-[10px] text-red-800 font-bold mb-1">Critical &le;</span>
                                    <SmartNumberInput value={settings.colorThresholds.darkRed} onChange={(v) => handleColorThresholdUpdate('darkRed', v)} />
                                </div>
                                <div className="bg-green-50 p-2 rounded border border-green-100">
                                    <span className="block text-[10px] text-green-700 font-bold mb-1">Success &ge;</span>
                                    <SmartNumberInput value={settings.colorThresholds.lightGreen} onChange={(v) => handleColorThresholdUpdate('lightGreen', v)} />
                                </div>
                            </div>
                        </div>
                    </AccordionItem>
                </>
            )}
        </div>
        
        <div className="p-4 border-t border-gray-200 bg-gray-50 text-center">
            <button onClick={onExport} className="text-xs text-gray-500 hover:text-gray-900 font-medium underline">
                Export Project JSON
            </button>
        </div>

        {/* Confirmation Modal (Pending Updates) */}
        {pendingUpdate && (
             <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="max-w-sm w-full bg-white border border-gray-200 shadow-2xl rounded-xl p-6">
                  <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                      <AlertTriangle size={24} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Update Prices?</h3>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                      You have manually edited prices. Changing this parameter will affect calculations.
                  </p>
                  <div className="space-y-2">
                      <button 
                        onClick={() => confirmUpdate(true)}
                        className="w-full py-2.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700"
                      >
                          Reset Manuals & Update All
                      </button>
                      <button 
                        onClick={() => confirmUpdate(false)}
                        className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-xs font-bold hover:bg-black"
                      >
                          Keep Manuals & Update Others
                      </button>
                      <button 
                        onClick={() => setPendingUpdate(null)}
                        className="w-full py-2.5 text-gray-500 hover:text-gray-800 text-xs font-medium"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
        )}

        {/* Overwrite Confirmation Modal */}
        {showOverwriteConfirm && (
             <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6 text-center animate-in fade-in duration-200">
              <div className="max-w-sm w-full bg-white border border-gray-200 shadow-2xl rounded-xl p-6">
                  <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                      <RefreshCw size={24} />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Overwrite current pricebook?</h3>
                  <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                      This will replace the saved values for: <br/><strong>{activeBook?.name}</strong>
                  </p>
                  <div className="space-y-2">
                      <button 
                        onClick={confirmOverwrite}
                        className="w-full py-2.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
                      >
                          Yes, Overwrite
                      </button>
                      <button 
                        onClick={() => setShowOverwriteConfirm(false)}
                        className="w-full py-2.5 text-gray-500 hover:text-gray-800 text-xs font-medium"
                      >
                          Cancel
                      </button>
                  </div>
              </div>
          </div>
        )}

        {/* Toast Notification */}
        {toast && (
            <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-5 fade-in ${toast.type === 'success' ? 'bg-gray-900 text-white' : 'bg-red-600 text-white'}`}>
                {toast.type === 'success' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                {toast.message}
            </div>
        )}
      </>
  );

  // --- Render Logic ---

  return (
    <>
        {!isMobileOpen && <MobileToggle />}

        {/* 1. Desktop Sidebar (Fixed relative to flex container) */}
        <div className={`hidden md:flex flex-col h-screen border-r border-gray-200 bg-white shadow-xl z-20 transition-all duration-300 relative ${isDesktopCollapsed ? 'w-14 items-center py-4' : 'w-80'}`}>
            {isDesktopCollapsed ? (
                <>
                    <div className={`w-full h-full absolute inset-0 -z-10 ${getHeaderStyle()}`}></div>
                    {getHeaderIcon()}
                    <button 
                        onClick={() => setIsDesktopCollapsed(false)}
                        className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-md mt-2 transition-colors"
                        title="Expand Sidebar"
                    >
                        <ChevronsRight size={18} />
                    </button>
                </>
            ) : (
                sidebarContent
            )}
        </div>

        {/* 2. Mobile Sidebar (Absolute Overlay) */}
        {isMobileOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex">
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileOpen(false)}></div>
                <div className="w-80 bg-white h-full shadow-2xl relative flex flex-col z-50 animate-in slide-in-from-left-full duration-300">
                     {sidebarContent}
                </div>
            </div>
        )}
    </>
  );
};
