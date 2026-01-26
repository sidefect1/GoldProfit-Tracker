
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sidebar } from './Sidebar';
import { ProjectHeader } from './ProjectHeader';
import { GridCell } from './GridCell';
import { SummaryCard } from './SummaryCard';
import { CalibrationModal } from './CalibrationModal';
import { PurityModal } from './PurityModal';
import { SetupWizard } from './SetupWizard';
import { Tooltip } from './Tooltip'; 
import { KARATS, getSizesForProduct, PRODUCT_CONFIGS } from '../constants';
import { ProjectSettings, KaratEnum, CalculationResult, PriceBook, MarketplaceRates, ProjectSnapshot } from '../types';
import { calculateRow, formatCurrency, formatDate } from '../utils/calculations';
import { Sliders, Info, Calculator, TrendingUp, BookOpen, ShoppingBag, CheckCircle, RefreshCcw, Save, Play, AlertTriangle, Lock, ChevronDown, Check, Tag, Globe, ZoomIn, ZoomOut, Pause, Bug, Users } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface ProjectWorkspaceProps {
  project: ProjectSettings;
  onUpdate: (updatedProject: ProjectSettings) => void;
  onBack: () => void;
  globalGoldPrice: number;
  marketplaceRates: MarketplaceRates;
  // NEW: Global Settings from Store
  storePurities: Record<KaratEnum, number>;
  storeCoupon: number;
  storeOffsite: number;
}

const ProfitModeMenu = ({ 
    isOpen, 
    onClose, 
    anchorEl, 
    currentMode, 
    onSelect 
}: {
    isOpen: boolean;
    onClose: () => void;
    anchorEl: HTMLElement | null;
    currentMode: 'standard' | 'coupon' | 'offsite';
    onSelect: (mode: 'standard' | 'coupon' | 'offsite') => void;
}) => {
    const [style, setStyle] = useState<React.CSSProperties>({});
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const updatePosition = () => {
             const mobile = window.innerWidth < 768;
             setIsMobile(mobile);
             
             if (mobile) {
                 setStyle({});
                 return;
             }

             if (anchorEl) {
                 const rect = anchorEl.getBoundingClientRect();
                 const top = rect.bottom + 8;
                 let left = rect.left;
                 
                 // Basic flip/shift logic
                 if (left + 300 > window.innerWidth) {
                     left = window.innerWidth - 320; 
                 }
                 if (left < 16) left = 16;
                 
                 setStyle({
                     position: 'fixed',
                     top: `${top}px`,
                     left: `${left}px`,
                     zIndex: 9999
                 });
             }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        }
    }, [isOpen, anchorEl]);

    if (!isOpen) return null;

    const content = (
        <div className="relative z-[9999]">
             <div className="fixed inset-0 bg-black/5 dark:bg-black/50 cursor-default backdrop-blur-[1px]" onClick={onClose} />
             <div 
                className={`fixed bg-white dark:bg-navy-900 shadow-2xl border border-gray-100 dark:border-white/10 p-2 animate-in duration-200 ${
                    isMobile 
                    ? 'bottom-0 left-0 right-0 rounded-t-2xl border-b-0 slide-in-from-bottom-10 fade-in' 
                    : 'rounded-xl w-72 zoom-in-95 fade-in origin-top-left'
                }`}
                style={!isMobile ? style : { bottom: 0, left: 0, right: 0, zIndex: 10000 }}
             >
                <div className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider px-3 py-2 flex justify-between items-center">
                    Select Profit Mode
                    {isMobile && <button onClick={onClose} className="p-1 bg-gray-100 dark:bg-navy-800 rounded-full"><ChevronDown size={14}/></button>}
                </div>
                
                <div className="space-y-1">
                    <button onClick={() => onSelect('standard')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'standard' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'hover:bg-gray-50 dark:hover:bg-navy-800'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'standard' ? 'bg-emerald-200 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-slate-400'}`}><TrendingUp size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800 dark:text-slate-200">Standard Monitor</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Standard view based on active price book.</div>
                        </div>
                        {currentMode === 'standard' && <Check size={16} className="text-emerald-600 dark:text-emerald-400 mt-1" />}
                    </button>

                    <button onClick={() => onSelect('coupon')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'coupon' ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-gray-50 dark:hover:bg-navy-800'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'coupon' ? 'bg-indigo-200 text-indigo-800 dark:bg-indigo-800 dark:text-indigo-200' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-slate-400'}`}><Tag size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800 dark:text-slate-200">Coupon Code</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Simulate profit after applying a coupon.</div>
                        </div>
                        {currentMode === 'coupon' && <Check size={16} className="text-indigo-600 dark:text-indigo-400 mt-1" />}
                    </button>

                    <button onClick={() => onSelect('offsite')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'offsite' ? 'bg-amber-50 dark:bg-amber-900/30' : 'hover:bg-gray-50 dark:hover:bg-navy-800'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'offsite' ? 'bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200' : 'bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-slate-400'}`}><Globe size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800 dark:text-slate-200">Offsite Ads</div>
                            <div className="text-[10px] text-gray-500 dark:text-slate-400">Simulate profit with offsite ads fee.</div>
                        </div>
                        {currentMode === 'offsite' && <Check size={16} className="text-amber-600 dark:text-amber-400 mt-1" />}
                    </button>
                </div>
             </div>
        </div>
    );

    return createPortal(content, document.body);
};

const DebugOverlay = ({ data }: { data: CalculationResult | null }) => {
    if (!data || !data._debug) return null;
    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 dark:bg-navy-800 text-white rounded-lg p-4 shadow-2xl z-50 text-xs font-mono max-w-xs animate-in slide-in-from-bottom-2 border border-gray-700 dark:border-white/10">
            <div className="flex justify-between items-center mb-2 border-b border-gray-700 dark:border-white/10 pb-1">
                <span className="font-bold text-green-400">Calculation Debug</span>
                <span className="text-gray-500 dark:text-slate-400">{data.karat} | {data.width}mm | #{data.size}</span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-slate-400">Source:</span>
                    <span className="font-bold">{data._debug.source}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-slate-400">Base Cost:</span>
                    <span>${data.baseCost.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-slate-400">Locked/Sale Price:</span>
                    <span className="text-yellow-400">${data.salePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-slate-400">Base Fee Rate:</span>
                    <span>{data._debug.baseFeeRate}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400 dark:text-slate-400">Total Fee Rate:</span>
                    <span>{data._debug.totalFeeRate}%</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 dark:border-white/10 pt-1 mt-1">
                    <span className="text-gray-400 dark:text-slate-400">Raw Net Rev:</span>
                    <span>${data._debug.rawNetRevenue.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-green-400">
                    <span>Calc Profit:</span>
                    <span>${data.profitUSD.toFixed(2)}</span>
                </div>
            </div>
        </div>
    );
}

// Presence Component
const PresenceBar = ({ projectId }: { projectId: string }) => {
    const [onlineUsers, setOnlineUsers] = useState<any[]>([]);

    useEffect(() => {
        const channel = supabase.channel(`presence:project:${projectId}`, {
            config: { presence: { key: projectId } }
        });

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState();
                const users: any[] = [];
                for (const key in state) {
                    users.push(...state[key]);
                }
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data } = await supabase.auth.getSession();
                    const user = data.session?.user;
                    if (user) {
                         const name = user.user_metadata?.display_name || user.email?.split('@')[0] || 'Unknown';
                         await channel.track({ user_id: user.id, name, at: Date.now() });
                    }
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [projectId]);

    if (onlineUsers.length <= 1) return null; // Don't show if only me

    return (
        <div className="bg-blue-50 dark:bg-navy-800 border-b border-blue-100 dark:border-white/10 px-4 py-1.5 flex items-center justify-center gap-3 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                <Users size={12} />
                <span>Active now:</span>
            </div>
            <div className="flex -space-x-1.5">
                {onlineUsers.map((u: any, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-blue-200 dark:bg-blue-800 border border-white dark:border-navy-900 flex items-center justify-center text-[8px] font-bold text-blue-800 dark:text-blue-100" title={u.name}>
                        {u.name?.charAt(0).toUpperCase()}
                    </div>
                ))}
            </div>
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">
                {onlineUsers.map(u => u.name).join(', ')}
            </span>
        </div>
    );
};

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ 
    project: rawProject, 
    onUpdate: setRawSettings, 
    onBack, 
    globalGoldPrice, 
    marketplaceRates,
    storePurities,
    storeCoupon,
    storeOffsite
}) => {
  
  // Construct Effective Project (Overlay Global Settings)
  // This forces all existing projects to use the store-level globals for these values.
  const settings = useMemo(() => ({
      ...rawProject,
      purities: storePurities,
      couponDiscountPercent: storeCoupon,
      offsiteAdsPercent: storeOffsite
  }), [rawProject, storePurities, storeCoupon, storeOffsite]);

  // Wrap setSettings to handle updates correctly (we update the raw project)
  const setSettings = (updated: ProjectSettings) => {
      setRawSettings(updated);
  };

  // ... (Existing state hooks remain unchanged) ...
  const sortedActiveKarats = useMemo(() => {
    const current = settings.activeKarats || KARATS;
    return KARATS.filter(k => current.includes(k));
  }, [settings.activeKarats]);

  const productConfig = PRODUCT_CONFIGS[settings.productType];
  
  const rowSizes = useMemo(() => {
    if (settings.sizes && settings.sizes.length > 0) {
        return [...settings.sizes].sort((a,b) => a-b);
    }
    return getSizesForProduct(settings.productType);
  }, [settings.productType, settings.sizes]);

  const [activeKarat, setActiveKarat] = useState<KaratEnum>(sortedActiveKarats[0] || '14K');
  const [viewMode, setViewMode] = useState<'profit' | 'price' | 'cost'>('profit');
  const [isCalibrationOpen, setIsCalibrationOpen] = useState(false);
  const [isPurityModalOpen, setIsPurityModalOpen] = useState(false);
  
  const [monitorSubMode, setMonitorSubMode] = useState<'standard' | 'coupon' | 'offsite'>('standard');
  const [isMonitorMenuOpen, setIsMonitorMenuOpen] = useState(false);
  const monitorMenuRef = useRef<HTMLButtonElement>(null);

  const [showSimulation, setShowSimulation] = useState(false);
  const [gridZoom, setGridZoom] = useState(1); 
  const [highlightedCoords, setHighlightedCoords] = useState<{r: number, c: number} | null>(null);
  
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
      if (settings.marketplace === 'shopify') {
          setMonitorSubMode('standard');
      }
  }, [settings.marketplace]);

  const [tooltipState, setTooltipState] = useState<{
      id: string | null;
      data: CalculationResult | null;
      rect: DOMRect | undefined;
  }>({ id: null, data: null, rect: undefined });

  const handleCellHover = (id: string | null, data?: CalculationResult, rect?: DOMRect) => {
      if (id && data && rect) {
          setTooltipState({ id, data, rect });
      } else {
          setTooltipState({ id: null, data: null, rect: undefined });
      }
  };

  const handleCellClick = (r: number, c: number) => {
      setHighlightedCoords({ r, c });
  };

  const [activeTab, setActiveTab] = useState<'builder' | 'monitor' | 'marketplace'>('builder');
  const [selectedBookId, setSelectedBookId] = useState<string | undefined>(settings.activePriceBookId);

  useEffect(() => {
      if (activeTab === 'monitor' && !selectedBookId && settings.activePriceBookId) {
          setSelectedBookId(settings.activePriceBookId);
      }
      if (activeTab !== 'monitor') {
          setShowSimulation(false);
      }
  }, [activeTab, settings.activePriceBookId, selectedBookId]);

  useEffect(() => {
    if (!sortedActiveKarats.includes(activeKarat) && sortedActiveKarats.length > 0) {
      setActiveKarat(sortedActiveKarats[0]);
    }
  }, [sortedActiveKarats, activeKarat]);

  // Derived Simulation Values
  const simulationMode = settings.monitorSimulationMode || 'PERCENT';
  const simulationValue = settings.monitorSimulationValue || 0;
  
  // For coupon/offsite, simulation controls are always visible/active
  const isSimulationActive = showSimulation || ['coupon', 'offsite'].includes(monitorSubMode);

  const gridData = useMemo(() => {
    const data: CalculationResult[] = [];
    let minP = Infinity, maxP = -Infinity, totalP = 0, count = 0;
    let minLabel = '', maxLabel = '';
    
    let maxBreakEvenDelta = 0;
    let maxBreakEvenLabel = '';
    let totalBreakEvenDelta = 0;

    let lockedBook: PriceBook | undefined;
    if ((activeTab === 'monitor' || activeTab === 'marketplace') && selectedBookId) {
       lockedBook = settings.priceBooks.find(b => b.id === selectedBookId);
    }

    const sizesToIterate = settings.productType === 'EARRING' ? [1] : rowSizes;
    const totalSteps = sizesToIterate.length * settings.widths.length;
    let stepIndex = 0;

    sizesToIterate.forEach(size => {
      settings.widths.forEach(width => {
        let targetPercent = 0;
        const profitConfig = settings.profitStrategyByKarat?.[activeKarat]; 
        
        if (profitConfig && profitConfig.variableProfit) {
            const startP = profitConfig.variableProfit.percentAtMin; 
            const endP = profitConfig.variableProfit.percentAtMax;   
            if (totalSteps > 1) {
                const t = stepIndex / (totalSteps - 1);
                targetPercent = startP + (endP - startP) * t;
            } else {
                targetPercent = startP;
            }
        }

        let lockedPrice: number | undefined = undefined;
        if (lockedBook) {
           const key = `${activeKarat}:${width}:${size}`;
           const originalPrice = lockedBook.prices[key];
           
           if (originalPrice !== undefined) {
               let simulatedPrice = originalPrice;
               
               // Apply Price Increase Simulation
               if (activeTab === 'monitor' && isSimulationActive && simulationValue !== 0) {
                   if (simulationMode === 'USD') {
                       simulatedPrice = Math.max(0, originalPrice + simulationValue);
                   } else {
                       // Percent Mode
                       simulatedPrice = originalPrice * (1 + (simulationValue / 100));
                   }
               }
               lockedPrice = simulatedPrice;
           }
        }

        const overrideGold = activeTab === 'monitor' ? globalGoldPrice : undefined;
        let snapshot = (activeTab === 'monitor' || activeTab === 'marketplace') && lockedBook ? lockedBook.snapshot : undefined;
        const profitModeToUse = activeTab === 'marketplace' ? 'standard' : monitorSubMode;

        const row = calculateRow(
            activeKarat, 
            size, 
            width, 
            settings, 
            lockedPrice, 
            overrideGold, 
            targetPercent, 
            marketplaceRates, 
            snapshot,
            profitModeToUse 
        );
        data.push(row);

        if (row.profitUSD < minP) {
          minP = row.profitUSD;
          minLabel = settings.productType === 'EARRING' ? `${width} (Style)` : `${width}mm / ${size}`;
        }
        if (row.profitUSD > maxP) {
          maxP = row.profitUSD;
          maxLabel = settings.productType === 'EARRING' ? `${width} (Style)` : `${width}mm / ${size}`;
        }
        
        if (row.breakEvenDelta > maxBreakEvenDelta) {
            maxBreakEvenDelta = row.breakEvenDelta;
            maxBreakEvenLabel = settings.productType === 'EARRING' ? `${width}` : `${width}mm / ${size}`;
        }
        totalBreakEvenDelta += row.breakEvenDelta;

        totalP += row.profitUSD;
        count++;
        stepIndex++;
      });
    });

    return {
      cells: data,
      stats: {
        min: { val: minP === Infinity ? 0 : minP, label: minLabel },
        max: { val: maxP === -Infinity ? 0 : maxP, label: maxLabel },
        avg: { val: count ? totalP / count : 0, label: 'Average' },
        breakEven: { val: maxBreakEvenDelta, label: maxBreakEvenLabel }
      }
    };
  }, [settings, activeKarat, activeTab, selectedBookId, rowSizes, globalGoldPrice, marketplaceRates, simulationValue, simulationMode, isSimulationActive, monitorSubMode]);

  const activeBook = settings.priceBooks.find(b => b.id === selectedBookId);

  // ... (Save Handlers same as before) ...
  const handleSaveBook = (nameOrId: string) => {
    // ... same logic ...
    const snapshot: ProjectSnapshot = {
        date: Date.now(),
        laborModel: settings.laborModel,
        laborMilyem: settings.laborMilyem,
        shippingCost: settings.shippingCost,
        packagingCost: settings.packagingCost,
        overheadCost: settings.overheadCost,
        purities: { ...settings.purities },
        anchors: { ...settings.anchors },
        referenceAnchors: { ...settings.referenceAnchors },
        exactWeights: settings.exactWeights ? { ...settings.exactWeights } : undefined,
        referenceExactWeights: settings.referenceExactWeights ? { ...settings.referenceExactWeights } : undefined,
        marketplaceRates: { ...marketplaceRates },
        profitStrategyByKarat: { ...settings.profitStrategyByKarat },
        marketplaceDiscount: settings.marketplaceDiscount 
    };

    const prices: Record<string, number> = {};
    const sizes = settings.productType === 'EARRING' ? [1] : rowSizes;
    const totalSteps = sizes.length * settings.widths.length;

    sortedActiveKarats.forEach(karat => {
      const profitConfig = settings.profitStrategyByKarat?.[karat];
      let stepIndex = 0;
      sizes.forEach(size => {
        settings.widths.forEach(width => {
           let targetPercent = 0;
           if (profitConfig && profitConfig.variableProfit) {
                const startP = profitConfig.variableProfit.percentAtMin;
                const endP = profitConfig.variableProfit.percentAtMax;
                if (totalSteps > 1) {
                    const t = stepIndex / (totalSteps - 1);
                    targetPercent = startP + (endP - startP) * t;
                } else {
                    targetPercent = startP;
                }
           }
           const res = calculateRow(karat, size, width, settings, undefined, undefined, targetPercent, marketplaceRates);
           const key = `${karat}:${width}:${size}`;
           prices[key] = res.salePrice;
           stepIndex++;
        });
      });
    });

    let updatedBooks = [...settings.priceBooks];
    let newId = crypto.randomUUID();

    const newBook: PriceBook = {
        id: newId,
        name: nameOrId,
        createdAt: Date.now(),
        prices,
        snapshot
    };
    updatedBooks.push(newBook);

    setSettings({ ...settings, priceBooks: updatedBooks, activePriceBookId: newId });
  };

  const handleSaveSimulation = () => {
      if (!selectedBookId) return;
      const baseBook = settings.priceBooks.find(b => b.id === selectedBookId);
      if (!baseBook) return;

      const suffix = simulationMode === 'USD' ? `+$${simulationValue}` : `+${simulationValue}%`;
      const newName = `${baseBook.name} (${suffix})`;
      const newPrices: Record<string, number> = {};
      
      Object.entries(baseBook.prices).forEach(([key, price]) => {
          let p = Number(price);
          if (simulationMode === 'USD') {
              p = Math.max(0, p + simulationValue);
          } else {
              p = p * (1 + (simulationValue / 100));
          }
          newPrices[key] = p;
      });

      const newBook: PriceBook = {
          id: crypto.randomUUID(),
          name: newName,
          createdAt: Date.now(),
          prices: newPrices,
          snapshot: baseBook.snapshot 
      };

      setSettings({ 
          ...settings, 
          priceBooks: [...settings.priceBooks, newBook],
          activePriceBookId: newBook.id,
          // Reset simulation after save
          monitorSimulationValue: 0
      });
      setSelectedBookId(newBook.id);
  };

  const handleOverwriteBook = (options?: { marketplaceDiscount?: number }) => {
      if (!settings.activePriceBookId) return;
      
      // Determine the discount to use in snapshot:
      // Either the one explicitly passed (deterministic update) OR the current setting state
      const effectiveDiscount = options?.marketplaceDiscount ?? settings.marketplaceDiscount;

      const snapshot: ProjectSnapshot = {
        date: Date.now(),
        laborModel: settings.laborModel,
        laborMilyem: settings.laborMilyem,
        shippingCost: settings.shippingCost,
        packagingCost: settings.packagingCost,
        overheadCost: settings.overheadCost,
        purities: { ...settings.purities },
        anchors: { ...settings.anchors },
        referenceAnchors: { ...settings.referenceAnchors },
        exactWeights: settings.exactWeights ? { ...settings.exactWeights } : undefined,
        referenceExactWeights: settings.referenceExactWeights ? { ...settings.referenceExactWeights } : undefined,
        marketplaceRates: { ...marketplaceRates },
        profitStrategyByKarat: { ...settings.profitStrategyByKarat },
        marketplaceDiscount: effectiveDiscount 
      };

      const prices: Record<string, number> = {};
      const sizes = settings.productType === 'EARRING' ? [1] : rowSizes;
      const totalSteps = sizes.length * settings.widths.length;

      sortedActiveKarats.forEach(karat => {
        const profitConfig = settings.profitStrategyByKarat?.[karat];
        let stepIndex = 0;
        sizes.forEach(size => {
            settings.widths.forEach(width => {
            let targetPercent = 0;
            if (profitConfig && profitConfig.variableProfit) {
                    const startP = profitConfig.variableProfit.percentAtMin;
                    const endP = profitConfig.variableProfit.percentAtMax;
                    if (totalSteps > 1) {
                        const t = stepIndex / (totalSteps - 1);
                        targetPercent = startP + (endP - startP) * t;
                    } else {
                        targetPercent = startP;
                    }
            }
            const res = calculateRow(karat, size, width, settings, undefined, undefined, targetPercent, marketplaceRates);
            const key = `${karat}:${width}:${size}`;
            prices[key] = res.salePrice;
            stepIndex++;
            });
        });
      });

      const updatedBooks = settings.priceBooks.map(b => {
          if (b.id === settings.activePriceBookId) {
              return { ...b, prices, snapshot, createdAt: Date.now() };
          }
          return b;
      });
      setSettings({ ...settings, priceBooks: updatedBooks });
  };

  const handleSetActiveBook = () => {
      if (selectedBookId) {
          setSettings({ ...settings, activePriceBookId: selectedBookId });
      }
  };

  const handlePriceOverride = (cellData: CalculationResult, newPrice: number) => {
      const key = `${cellData.karat}:${cellData.width}:${cellData.size}`;
      const sizesToIterate = settings.productType === 'EARRING' ? [1] : rowSizes;
      const totalSteps = sizesToIterate.length * settings.widths.length;
      const sizeIndex = sizesToIterate.indexOf(cellData.size);
      const widthIndex = settings.widths.indexOf(cellData.width);
      const stepIndex = (sizeIndex * settings.widths.length) + widthIndex;
      
      let targetPercent = 0;
      const profitConfig = settings.profitStrategyByKarat?.[cellData.karat];

      if (profitConfig && profitConfig.variableProfit && sizeIndex >= 0 && widthIndex >= 0) {
            const startP = profitConfig.variableProfit.percentAtMin;
            const endP = profitConfig.variableProfit.percentAtMax;
            if (totalSteps > 1) {
                const t = Number(stepIndex) / (Number(totalSteps) - 1);
                targetPercent = startP + (endP - startP) * t;
            } else {
                targetPercent = startP;
            }
      }

      const theoreticalRow = calculateRow(cellData.karat, cellData.size, cellData.width, settings, undefined, undefined, targetPercent, marketplaceRates);
      const newOverrides = { ...(settings.priceOverrides || {}) };

      if (Math.abs(theoreticalRow.salePrice - newPrice) < 0.02) {
          delete newOverrides[key];
      } else {
          newOverrides[key] = newPrice;
      }
      setSettings({ ...settings, priceOverrides: newOverrides });
  };

  const handleExport = () => {
    // ... same export logic
    const headers = ['Karat', productConfig.widthLabel, productConfig.sizeLabel, 'Weight(g)', 'Metal Cost', 'Labor', 'Other Costs', 'Total Cost', 'Sale Price', 'Profit($)', 'Profit(%)'];
    const rows = gridData.cells.map(c => [
      c.karat, c.width, c.size, c.estimatedGram.toFixed(2), c.metalCost.toFixed(2), c.laborCost.toFixed(2), c.otherCosts.toFixed(2), c.totalCost.toFixed(2), c.salePrice.toFixed(2), c.profitUSD.toFixed(2), (c.profitPercent).toFixed(2) + '%'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const prefix = activeTab === 'monitor' ? 'profit_report' : 'price_book';
    link.setAttribute("download", `${prefix}_${activeKarat}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const HeatmapLegend = () => (
      <div className="flex items-center gap-2 text-[10px] bg-white dark:bg-navy-900 px-2 py-1 rounded-md border border-gray-200 dark:border-white/10 shadow-sm ml-auto shrink-0 transition-colors">
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-200 dark:bg-red-800"></div>
              <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">Loss</span>
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-100 dark:bg-green-900"></div>
              <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">0-${settings.colorThresholds.darkGreen}</span>
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-300 dark:bg-emerald-700"></div>
              <span className="text-gray-500 dark:text-slate-400 hidden sm:inline">{'>'}${settings.colorThresholds.darkGreen}</span>
          </div>
      </div>
  );

  const handleCalibrationClose = (autoFilledCount?: number) => {
      setIsCalibrationOpen(false);
  };

  const getMonitorTabLabel = () => {
      if (monitorSubMode === 'coupon') return 'Coupon Code Profit';
      if (monitorSubMode === 'offsite') return 'Offsite Ads Profit';
      return 'Monitor Profit';
  };

  const handleZoom = (direction: 'in' | 'out') => {
      setGridZoom(prev => {
          if (direction === 'in') return Math.min(2, prev + 1);
          return Math.max(0, prev - 1);
      });
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-navy-950 overflow-hidden font-sans relative transition-colors duration-300">
      <Sidebar 
        settings={settings} 
        updateSettings={setSettings} 
        onExport={handleExport} 
        activeTab={activeTab} 
        onSaveBook={(name) => handleSaveBook(name)} 
        onOverwriteBook={handleOverwriteBook}
        globalGoldPrice={globalGoldPrice} 
        marketplaceRates={marketplaceRates} 
        selectedKarat={activeKarat} 
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <ProjectHeader settings={settings} updateSettings={setSettings} onBack={onBack} marketplaceRates={marketplaceRates} />
        
        {/* Presence Bar */}
        <PresenceBar projectId={settings.id} />

        {/* --- MAIN TOOLBAR & TABS --- */}
        <div className={`border-b border-gray-200 dark:border-white/10 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 transition-colors duration-300 ${activeTab === 'monitor' ? 'bg-emerald-50/50 dark:bg-emerald-900/20' : (activeTab === 'marketplace' ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-navy-900')}`}>
            {/* ... Toolbar Content Same as Before ... */}
            <div className="flex items-center gap-4 overflow-visible">
                <div className="bg-gray-100/80 dark:bg-navy-800 p-1 rounded-xl flex shadow-inner shrink-0">
                    <button onClick={() => setActiveTab('builder')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'builder' ? 'bg-white dark:bg-navy-700 text-gray-900 dark:text-white shadow-sm ring-1 ring-black/5 dark:ring-white/5' : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-navy-700/50'}`}>
                        <Calculator size={14} /> Build Prices
                    </button>
                    {settings.marketplace === 'etsy' ? (
                        <>
                            <button 
                                ref={monitorMenuRef}
                                onClick={() => {
                                    if (activeTab === 'monitor') setIsMonitorMenuOpen(!isMonitorMenuOpen);
                                    else setActiveTab('monitor');
                                }} 
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'monitor' ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'}`}>
                                <TrendingUp size={14} /> {getMonitorTabLabel()} {activeTab === 'monitor' && <ChevronDown size={12} className={`ml-1 transition-transform ${isMonitorMenuOpen ? 'rotate-180' : ''}`} />}
                            </button>
                            <ProfitModeMenu 
                                isOpen={isMonitorMenuOpen}
                                onClose={() => setIsMonitorMenuOpen(false)}
                                anchorEl={monitorMenuRef.current}
                                currentMode={monitorSubMode}
                                onSelect={(mode) => {
                                    setMonitorSubMode(mode);
                                    setIsMonitorMenuOpen(false);
                                }}
                            />
                        </>
                    ) : (
                        <button onClick={() => setActiveTab('monitor')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'monitor' ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md shadow-emerald-200 dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30'}`}>
                            <TrendingUp size={14} /> Monitor Profit
                        </button>
                    )}
                    <button onClick={() => setActiveTab('marketplace')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'marketplace' ? 'bg-indigo-600 dark:bg-indigo-700 text-white shadow-md shadow-indigo-200 dark:shadow-none' : 'text-gray-500 dark:text-slate-400 hover:text-indigo-700 dark:hover:text-indigo-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30'}`}>
                        <ShoppingBag size={14} /> Market
                    </button>
                </div>

                {(activeTab === 'monitor' || activeTab === 'marketplace') && (
                    <div className="hidden md:flex flex-col ml-2 border-l border-emerald-200 dark:border-emerald-800 pl-4 h-9 justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800/60 dark:text-emerald-400/60 leading-none mb-1">
                            <Lock size={10} /> Active Price Book
                        </div>
                        <div className="flex items-center gap-2 leading-none">
                             <div className="relative group">
                                 <select 
                                    className="appearance-none bg-transparent font-bold text-emerald-900 dark:text-emerald-300 text-xs pr-4 cursor-pointer focus:outline-none dark:bg-navy-900"
                                    value={selectedBookId || ''} 
                                    onChange={(e) => setSelectedBookId(e.target.value)}
                                 >
                                    <option value="" disabled>Select Book</option>
                                    {settings.priceBooks.map(b => <option key={b.id} value={b.id}>{b.name} {b.id === settings.activePriceBookId ? '(Active)' : ''}</option>)}
                                 </select>
                                 <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                             </div>
                             {activeBook?.snapshot && (
                                 <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                    Snapshot: {formatDate(activeBook.snapshot.date).split(' ')[0]}
                                 </span>
                             )}
                             {selectedBookId && selectedBookId !== settings.activePriceBookId && (
                                <button onClick={handleSetActiveBook} className="text-sm bg-emerald-600 text-white px-4 py-1.5 rounded shadow-sm hover:bg-emerald-700 font-bold transition-colors animate-in fade-in">
                                    Set Active
                                </button>
                             )}
                        </div>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-2">
                {activeTab === 'monitor' && (
                    <>
                        {/* Only show Simulation Toggle in Standard Mode. In other modes, it is always active. */}
                        {monitorSubMode === 'standard' && (
                            <button 
                                onClick={() => setShowSimulation(!showSimulation)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showSimulation ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800' : 'bg-white dark:bg-navy-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                            >
                                {showSimulation ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                                {showSimulation ? 'Simulation ON' : 'Simulation'}
                            </button>
                        )}
                        
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showDebug ? 'bg-gray-800 dark:bg-navy-700 text-green-400 border-gray-700 dark:border-navy-600' : 'bg-white dark:bg-navy-900 text-gray-400 dark:text-slate-500 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
                            title="Toggle Calc Debug"
                        >
                            <Bug size={12} />
                        </button>
                    </>
                )}
            </div>
            {activeTab !== 'monitor' && <HeatmapLegend />}
        </div>

        {activeTab === 'marketplace' && selectedBookId && (
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 px-6 py-2 flex items-center justify-center gap-2 text-xs text-indigo-800 dark:text-indigo-300 font-medium">
                <Lock size={12} className="text-indigo-500" />
                <span>Using <strong>Standard Base Price (Active Price Book)</strong> as base for Marketplace List Prices.</span>
            </div>
        )}

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth ${activeTab === 'monitor' ? 'bg-emerald-50/20 dark:bg-emerald-900/10' : (activeTab === 'marketplace' ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : 'bg-gray-50/50 dark:bg-navy-950')}`}>
          
          {/* Floating Monitor Simulation Panel (Moved inside main for sticky support) */}
          {activeTab === 'monitor' && isSimulationActive && (
            <div className="sticky top-0 z-40 mb-6 -mx-1">
                <div className="rounded-2xl border border-white/10 bg-navy-900/90 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.35)] ring-1 ring-white/5 px-4 py-3 transition-colors duration-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between animate-in slide-in-from-top-2">
                    {/* Left Zone: Inputs */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Price Increase</span>
                        
                        {/* Segmented Control */}
                        <div className="inline-flex rounded-xl bg-navy-950/60 border border-white/10 p-1">
                            <button 
                                onClick={() => setSettings({...settings, monitorSimulationMode: 'PERCENT'})}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${simulationMode === 'PERCENT' ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30' : 'text-slate-400 hover:text-white'}`}
                            >
                                %
                            </button>
                            <button 
                                onClick={() => setSettings({...settings, monitorSimulationMode: 'USD'})}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors duration-200 cursor-pointer ${simulationMode === 'USD' ? 'bg-gold-500/15 text-gold-300 border border-gold-500/30' : 'text-slate-400 hover:text-white'}`}
                            >
                                USD
                            </button>
                        </div>
                        
                        {/* Input Group */}
                        <div className="relative group flex items-center">
                            <input 
                                type="number"
                                className="bg-navy-950 text-white border border-white/15 focus:ring-2 focus:ring-gold-500 ring-offset-2 ring-offset-navy-950 rounded-xl px-3 py-2 text-sm font-semibold w-24 text-center transition-colors duration-200 outline-none"
                                value={simulationValue}
                                placeholder="0"
                                onChange={(e) => setSettings({...settings, monitorSimulationValue: parseFloat(e.target.value) || 0})}
                            />
                            {/* Overlay Suffix/Prefix purely visual or integrated in layout if desired, here relying on context */}
                            <span className="ml-2 text-slate-400 text-xs font-bold">{simulationMode === 'USD' ? '$' : '%'}</span>
                        </div>

                        {/* Reset Button */}
                        {simulationValue !== 0 && (
                            <button 
                                onClick={() => setSettings({...settings, monitorSimulationValue: 0})}
                                className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10 cursor-pointer"
                                title="Reset to 0"
                            >
                                <RefreshCcw size={14} />
                            </button>
                        )}
                    </div>

                    {/* Divider (Desktop) */}
                    <div className="hidden md:block w-px h-8 bg-white/10"></div>

                    {/* Middle Zone: Context Chips */}
                    <div className="flex items-center gap-3 flex-wrap justify-center sm:justify-start">
                        {/* Chip 1: Fee Context */}
                        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border bg-gold-500/10 text-gold-200 border-gold-500/20 transition-colors duration-200">
                            {monitorSubMode === 'standard' && <TrendingUp size={12}/>}
                            {monitorSubMode === 'coupon' && <Tag size={12}/>}
                            {monitorSubMode === 'offsite' && <Globe size={12}/>}
                            <span>
                                {monitorSubMode === 'standard' && 'Standard Mode'}
                                {monitorSubMode === 'coupon' && `Coupon: ${settings.couponDiscountPercent ?? 30}%`}
                                {monitorSubMode === 'offsite' && `Offsite Ads: ${settings.offsiteAdsPercent ?? 15}%`}
                            </span>
                        </div>
                        
                        {/* Chip 2: Value Summary */}
                        {simulationValue !== 0 && (
                            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold border bg-white/5 text-slate-200 border-white/10 transition-colors duration-200">
                                <span className={simulationValue > 0 ? 'text-green-400' : (simulationValue < 0 ? 'text-red-400' : 'text-slate-300')}>
                                    {simulationMode === 'USD' ? (simulationValue > 0 ? '+' : '') : (simulationValue > 0 ? '+' : '')}
                                    {simulationMode === 'USD' ? `$${simulationValue}` : `${simulationValue}%`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right Zone: Primary Action */}
                    <div className="flex items-center justify-end">
                        <button 
                            onClick={handleSaveSimulation} 
                            disabled={!selectedBookId}
                            className={`bg-gold-500 hover:bg-gold-400 text-navy-950 font-extrabold rounded-xl px-4 py-2 shadow-[0_8px_20px_rgba(212,138,27,0.25)] transition-all duration-200 cursor-pointer flex items-center gap-2 hover:shadow-[0_10px_26px_rgba(212,138,27,0.30)] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed ${simulationValue === 0 ? 'opacity-40 grayscale' : ''}`}
                        >
                            <Save size={16} /> Save New
                        </button>
                    </div>
                </div>
            </div>
          )}

          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                <div className="inline-flex bg-white dark:bg-navy-900 rounded-lg p-1 shadow-sm border border-gray-200 dark:border-white/10 shrink-0">
                  {sortedActiveKarats.map(k => (
                    <button key={k} onClick={() => setActiveKarat(k)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all border whitespace-nowrap ${activeKarat === k ? 'bg-gray-800 dark:bg-gold-500 text-white border-gray-800 dark:border-gold-500 shadow-md' : 'bg-transparent text-gray-500 dark:text-slate-400 border-transparent hover:text-gray-900 dark:hover:text-slate-200 hover:bg-gray-50 dark:hover:bg-navy-800'}`}>{k}</button>
                  ))}
                </div>
                <button onClick={() => setIsPurityModalOpen(true)} className="p-2.5 bg-white dark:bg-navy-900 border border-gray-200 dark:border-white/10 rounded-lg text-gray-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm group shrink-0" title="View Purity Standards"><Info size={16} className="group-hover:scale-110 transition-transform" /></button>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    <div className="bg-white dark:bg-navy-900 rounded-lg border border-gray-200 dark:border-white/10 p-1 flex items-center gap-1 shadow-sm">
                        <button onClick={() => handleZoom('out')} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-navy-800 ${gridZoom === 0 ? 'text-gray-300 dark:text-slate-600' : 'text-gray-500 dark:text-slate-400'}`} disabled={gridZoom===0}><ZoomOut size={14}/></button>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 w-4 text-center">{gridZoom === 0 ? 'S' : (gridZoom === 1 ? 'M' : 'L')}</span>
                        <button onClick={() => handleZoom('in')} className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-navy-800 ${gridZoom === 2 ? 'text-gray-300 dark:text-slate-600' : 'text-gray-500 dark:text-slate-400'}`} disabled={gridZoom===2}><ZoomIn size={14}/></button>
                    </div>

                    <button onClick={() => setIsCalibrationOpen(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-navy-900 border border-gray-300 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-navy-800 shadow-sm transition-colors whitespace-nowrap shrink-0"><Sliders size={14} /> Calibrate Grams</button>
                    
                    {activeTab !== 'marketplace' && (
                        <>
                            <div className="h-6 w-px bg-gray-300 dark:bg-white/10 mx-2 hidden md:block"></div>
                            <div className={`inline-flex rounded-lg p-1 shadow-sm border shrink-0 ${activeTab === 'monitor' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-navy-900 border-gray-200 dark:border-white/10'}`}>
                                {(['price', 'profit', 'cost'] as const).map(mode => (
                                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${viewMode === mode ? (activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-blue-600 dark:bg-gold-500 text-white shadow-sm') : (activeTab === 'monitor' ? 'text-emerald-700/60 dark:text-emerald-400/60 hover:text-emerald-800 dark:hover:text-emerald-300' : 'text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-300')}`}>{mode}</button>
                                ))}
                            </div>
                        </>
                    )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <SummaryCard title="Lowest Profit" value={gridData.stats.min.val} subtext={gridData.stats.min.label} type="min" />
               <SummaryCard title="Average Profit" value={gridData.stats.avg.val} subtext="Across all sizes" type="avg" />
               <SummaryCard title="Highest Profit" value={gridData.stats.max.val} subtext={gridData.stats.max.label} type="max" />
               <div className="bg-white dark:bg-navy-900 p-4 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm flex items-start gap-3">
                   <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
                        <TrendingUp size={24} />
                   </div>
                   <div>
                        <p className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Break-Even Gap</p>
                        <p className="text-xl font-bold text-gray-800 dark:text-white my-0.5">
                            {gridData.stats.breakEven.val > 0 ? `+${formatCurrency(gridData.stats.breakEven.val)}` : 'Safe'}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                            {gridData.stats.breakEven.val > 0 ? `Worst case: ${gridData.stats.breakEven.label}` : 'All items profitable'}
                        </p>
                   </div>
               </div>
            </div>
          </div>
          
          {/* ... (Grid Render logic same as before) ... */}
          {/* Re-use existing grid rendering logic from previous version */}
          {settings.productType === 'EARRING' ? (
              <div className="space-y-4">
                  {sortedActiveKarats.map(karat => (
                      <div key={karat} className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                          <div className="bg-gray-50 dark:bg-navy-800 border-b border-gray-100 dark:border-white/5 px-4 py-2 flex items-center justify-between"><span className="font-bold text-gray-700 dark:text-slate-200 text-sm">{karat} Gold</span></div>
                          <div className="p-0">
                             <div className="grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, 1fr)` }}>
                                 {settings.widths.map(width => {
                                     if (karat !== activeKarat) return null;
                                     const cellData = gridData.cells.find(c => c.width === width && c.karat === activeKarat);
                                     if (!cellData) return <div key={width} className="p-4 text-xs text-gray-400 dark:text-slate-600">N/A</div>;
                                     const cellId = `${karat}-${width}-${cellData.size}`;
                                     return (
                                         <div key={width} className="flex flex-col border-r border-gray-100 dark:border-white/5 last:border-0">
                                             <div className="bg-gray-50/50 dark:bg-navy-800/50 p-2 text-center text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase border-b border-gray-100 dark:border-white/5">Style/Type {width}</div>
                                             <GridCell 
                                                data={cellData} 
                                                viewMode={viewMode} 
                                                thresholds={settings.colorThresholds} 
                                                activeMode={activeTab} 
                                                onOverride={handlePriceOverride} 
                                                activeTooltipId={tooltipState.id} 
                                                onHover={handleCellHover} 
                                                cellId={cellId}
                                                zoomLevel={gridZoom}
                                             />
                                         </div>
                                     );
                                 })}
                             </div>
                          </div>
                      </div>
                  ))}
              </div>
          ) : (
              <div className="bg-white dark:bg-navy-900 rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden relative">
                <div className="overflow-x-auto min-h-[300px] max-h-[600px] w-full">
                    <div className="inline-block min-w-full align-middle">
                    <div className="border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-navy-800 flex sticky top-0 z-30 shadow-sm min-w-max">
                        <div className="w-16 flex-shrink-0 p-3 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-r border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-navy-800 sticky left-0 z-40 flex items-center justify-center shadow-[1px_0_0_0_rgba(229,231,235,1)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.1)]">{productConfig.sizeLabel.includes("Length") ? "Length" : productConfig.sizeLabel.replace("Size", "")}</div>
                        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, minmax(80px, 1fr))` }}>
                            {settings.widths.map((w, idx) => {
                                const isHighlighted = highlightedCoords?.c === idx;
                                return (
                                    <div key={w} className={`p-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider border-l border-gray-200 dark:border-white/10 first:border-l-0 min-w-[80px] transition-colors ${isHighlighted ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-gray-50 dark:bg-navy-800'}`}>
                                        {w}mm
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                    <div className="min-w-max">
                        {rowSizes.map((size, rIdx) => {
                            const isHighlightedRow = highlightedCoords?.r === rIdx;
                            return (
                                <div key={size} className={`flex border-b border-gray-100 dark:border-white/5 transition-colors group ${isHighlightedRow ? 'bg-blue-50/30 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-navy-800'}`}>
                                    <div className={`w-16 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600 dark:text-slate-400 border-r border-gray-200 dark:border-white/10 sticky left-0 z-20 shadow-[1px_0_0_0_rgba(229,231,235,1)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.1)] transition-colors ${isHighlightedRow ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-navy-800 group-hover:bg-gray-100 dark:group-hover:bg-navy-700'}`}>
                                        {size.toFixed(2)}
                                    </div>
                                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, minmax(80px, 1fr))` }}>
                                        {settings.widths.map((width, cIdx) => {
                                            const cellData = gridData.cells.find(c => c.size === size && c.width === width);
                                            if (!cellData) return <div key={width} className="bg-gray-100 dark:bg-navy-950 min-w-[80px]" />;
                                            const cellId = `${activeKarat}-${width}-${size}`;
                                            const isHighlightedCol = highlightedCoords?.c === cIdx;
                                            const isCellHighlighted = isHighlightedRow || isHighlightedCol;
                                            
                                            return (
                                                <div key={width} className="min-w-[80px]">
                                                    <GridCell 
                                                        data={cellData} 
                                                        viewMode={viewMode} 
                                                        thresholds={settings.colorThresholds} 
                                                        activeMode={activeTab} 
                                                        onOverride={handlePriceOverride} 
                                                        activeTooltipId={tooltipState.id} 
                                                        onHover={handleCellHover} 
                                                        cellId={cellId}
                                                        isHighlighted={isCellHighlighted}
                                                        zoomLevel={gridZoom}
                                                        onClick={() => handleCellClick(rIdx, cIdx)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    </div>
                </div>
            </div>
          )}
        </main>
      </div>
      
      {!settings.isSetupComplete && (
          <SetupWizard 
              project={settings} 
              onUpdate={setSettings} 
              onClose={onBack} 
          />
      )}

      {tooltipState.id && tooltipState.data && tooltipState.rect && <Tooltip data={tooltipState.data} targetRect={tooltipState.rect} />}
      
      {showDebug && activeTab === 'monitor' && <DebugOverlay data={tooltipState.data || null} />}

      <CalibrationModal isOpen={isCalibrationOpen} onClose={handleCalibrationClose} settings={settings} updateSettings={setSettings} activeKarat={activeKarat} />
      
      {/* Purity Modal is now Read Only via effective settings */}
      <PurityModal 
          isOpen={isPurityModalOpen} 
          onClose={() => setIsPurityModalOpen(false)} 
          purities={settings.purities} // Uses global purities from effectiveProject
          onSave={(newP) => setSettings({ ...settings, purities: newP })} 
          readOnly={true} // Enforce global management
      />
    </div>
  );
};
