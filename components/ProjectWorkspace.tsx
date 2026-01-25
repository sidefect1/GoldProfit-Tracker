
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
import { Sliders, Info, Calculator, TrendingUp, BookOpen, ShoppingBag, CheckCircle, RefreshCcw, Save, Play, AlertTriangle, Lock, ChevronDown, Check, Tag, Globe, ZoomIn, ZoomOut, Pause, Bug } from 'lucide-react';

interface ProjectWorkspaceProps {
  project: ProjectSettings;
  onUpdate: (updatedProject: ProjectSettings) => void;
  onBack: () => void;
  globalGoldPrice: number;
  marketplaceRates: MarketplaceRates;
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
             {/* Backdrop */}
             <div className="fixed inset-0 bg-black/5 cursor-default backdrop-blur-[1px]" onClick={onClose} />
             
             {/* Menu */}
             <div 
                className={`fixed bg-white shadow-2xl border border-gray-100 p-2 animate-in duration-200 ${
                    isMobile 
                    ? 'bottom-0 left-0 right-0 rounded-t-2xl border-b-0 slide-in-from-bottom-10 fade-in' 
                    : 'rounded-xl w-72 zoom-in-95 fade-in origin-top-left'
                }`}
                style={!isMobile ? style : { bottom: 0, left: 0, right: 0, zIndex: 10000 }}
             >
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2 flex justify-between items-center">
                    Select Profit Mode
                    {isMobile && <button onClick={onClose} className="p-1 bg-gray-100 rounded-full"><ChevronDown size={14}/></button>}
                </div>
                
                <div className="space-y-1">
                    <button onClick={() => onSelect('standard')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'standard' ? 'bg-emerald-50' : 'hover:bg-gray-50'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'standard' ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-100 text-gray-500'}`}><TrendingUp size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Standard Monitor</div>
                            <div className="text-[10px] text-gray-500">Standard view based on active price book.</div>
                        </div>
                        {currentMode === 'standard' && <Check size={16} className="text-emerald-600 mt-1" />}
                    </button>

                    <button onClick={() => onSelect('coupon')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'coupon' ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'coupon' ? 'bg-indigo-200 text-indigo-800' : 'bg-gray-100 text-gray-500'}`}><Tag size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Coupon Code</div>
                            <div className="text-[10px] text-gray-500">Simulate profit after applying a coupon.</div>
                        </div>
                        {currentMode === 'coupon' && <Check size={16} className="text-indigo-600 mt-1" />}
                    </button>

                    <button onClick={() => onSelect('offsite')} className={`w-full text-left px-3 py-3 rounded-lg flex items-start gap-3 transition-colors ${currentMode === 'offsite' ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                        <div className={`mt-0.5 p-1.5 rounded-md ${currentMode === 'offsite' ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-500'}`}><Globe size={16} /></div>
                        <div className="flex-1">
                            <div className="text-sm font-bold text-gray-800">Offsite Ads</div>
                            <div className="text-[10px] text-gray-500">Simulate profit with offsite ads fee.</div>
                        </div>
                        {currentMode === 'offsite' && <Check size={16} className="text-amber-600 mt-1" />}
                    </button>
                </div>
             </div>
        </div>
    );

    return createPortal(content, document.body);
};

// --- DEBUG OVERLAY COMPONENT ---
const DebugOverlay = ({ data }: { data: CalculationResult | null }) => {
    if (!data || !data._debug) return null;

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white rounded-lg p-4 shadow-2xl z-50 text-xs font-mono max-w-xs animate-in slide-in-from-bottom-2">
            <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
                <span className="font-bold text-green-400">Calculation Debug</span>
                <span className="text-gray-500">{data.karat} | {data.width}mm | #{data.size}</span>
            </div>
            <div className="space-y-1">
                <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="font-bold">{data._debug.source}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Base Cost:</span>
                    <span>${data.baseCost.toFixed(2)}</span>
                </div>
                 <div className="flex justify-between">
                    <span className="text-gray-400">Locked/Sale Price:</span>
                    <span className="text-yellow-400">${data.salePrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Base Fee Rate:</span>
                    <span>{data._debug.baseFeeRate}%</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Total Fee Rate:</span>
                    <span>{data._debug.totalFeeRate}%</span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-1 mt-1">
                    <span className="text-gray-400">Raw Net Rev:</span>
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

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({ project: settings, onUpdate: setSettings, onBack, globalGoldPrice, marketplaceRates }) => {
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
  
  // MONITOR SUB-MODES (Etsy Only)
  const [monitorSubMode, setMonitorSubMode] = useState<'standard' | 'coupon' | 'offsite'>('standard');
  const [isMonitorMenuOpen, setIsMonitorMenuOpen] = useState(false);
  const monitorMenuRef = useRef<HTMLButtonElement>(null);

  // SIMULATION TOGGLE & ZOOM
  const [showSimulation, setShowSimulation] = useState(false);
  const [gridZoom, setGridZoom] = useState(1); // 0: Compact, 1: Normal, 2: Large
  const [highlightedCoords, setHighlightedCoords] = useState<{r: number, c: number} | null>(null);
  
  // Simulation Values
  const [simulationPct, setSimulationPct] = useState<number>(0); // Percentage increase (0-100)
  
  // Debug Toggle
  const [showDebug, setShowDebug] = useState(false);

  // Reset sub-mode if marketplace changes to shopify
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
      // Reset simulation when switching tabs
      if (activeTab !== 'monitor') {
          setSimulationPct(0);
          setShowSimulation(false);
      }
  }, [activeTab, settings.activePriceBookId, selectedBookId]);

  useEffect(() => {
    if (!sortedActiveKarats.includes(activeKarat) && sortedActiveKarats.length > 0) {
      setActiveKarat(sortedActiveKarats[0]);
    }
  }, [sortedActiveKarats, activeKarat]);

  const gridData = useMemo(() => {
    const data: CalculationResult[] = [];
    let minP = Infinity, maxP = -Infinity, totalP = 0, count = 0;
    let minLabel = '', maxLabel = '';
    
    // Break-even Stats
    let maxBreakEvenDelta = 0;
    let maxBreakEvenLabel = '';
    let totalBreakEvenDelta = 0;

    let lockedBook: PriceBook | undefined;
    // CRITICAL FIX: Use Locked Book for Marketplace as well as Monitor
    if ((activeTab === 'monitor' || activeTab === 'marketplace') && selectedBookId) {
       lockedBook = settings.priceBooks.find(b => b.id === selectedBookId);
    }

    const sizesToIterate = settings.productType === 'EARRING' ? [1] : rowSizes;
    const totalSteps = sizesToIterate.length * settings.widths.length;
    let stepIndex = 0;

    sizesToIterate.forEach(size => {
      settings.widths.forEach(width => {
        
        let targetPercent = 0;
        // Retrieve scoped strategy to calculate variable percent step
        const profitConfig = settings.profitStrategyByKarat?.[activeKarat]; // Use ACTIVE KARAT config for the grid being calculated
        
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
               // Apply Simulation Percentage ONLY in Monitor mode if active
               let simulatedPrice = originalPrice;
               if (activeTab === 'monitor' && simulationPct > 0) {
                   simulatedPrice = originalPrice * (1 + (simulationPct / 100));
               }
               lockedPrice = simulatedPrice;
           }
        }

        const overrideGold = activeTab === 'monitor' ? globalGoldPrice : undefined;
        
        // Pass snapshot if in monitor/marketplace mode and book is locked
        let snapshot = (activeTab === 'monitor' || activeTab === 'marketplace') && lockedBook ? lockedBook.snapshot : undefined;
        
        // CRITICAL: Force 'standard' mode if we are viewing the Marketplace tab.
        // Marketplace tab should ALWAYS show the List Prices derived from Standard Base Price.
        // It should NOT be affected by Coupon or Offsite simulations active in Monitor tab.
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
            profitModeToUse // Pass explicitly determined profit mode
        );
        data.push(row);

        if (row.profitUSD < minP) {
          minP = row.profitUSD;
          minLabel = settings.productType === 'EARRING' 
            ? `${width} (Style)`
            : `${width}mm / ${size}`;
        }
        if (row.profitUSD > maxP) {
          maxP = row.profitUSD;
          maxLabel = settings.productType === 'EARRING' 
            ? `${width} (Style)`
            : `${width}mm / ${size}`;
        }
        
        // Track Worst Break-even gap
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
  }, [settings, activeKarat, activeTab, selectedBookId, rowSizes, globalGoldPrice, marketplaceRates, simulationPct, monitorSubMode]);

  // Derived Book Info
  const activeBook = settings.priceBooks.find(b => b.id === selectedBookId);

  const handleSaveBook = (nameOrId: string) => {
    // Determine snapshot data from current settings
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
        marketplaceDiscount: settings.marketplaceDiscount // Snapshot the discount used for list prices
    };

    const prices: Record<string, number> = {};
    const sizes = settings.productType === 'EARRING' ? [1] : rowSizes;
    const totalSteps = sizes.length * settings.widths.length;

    sortedActiveKarats.forEach(karat => {
      // Loop for EACH karat to use correct scoped settings
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

      const newName = `${baseBook.name} (+${simulationPct}%)`;
      const newPrices: Record<string, number> = {};
      
      Object.entries(baseBook.prices).forEach(([key, price]) => {
          newPrices[key] = Number(price) * (1 + (Number(simulationPct) / 100));
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
          activePriceBookId: newBook.id 
      });
      setSelectedBookId(newBook.id);
      setSimulationPct(0); 
  };

  const handleOverwriteBook = () => {
      if (!settings.activePriceBookId) return;
      
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
        marketplaceDiscount: settings.marketplaceDiscount // Snapshot the discount used for list prices
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
      <div className="flex items-center gap-2 text-[10px] bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm ml-auto shrink-0">
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-200"></div>
              <span className="text-gray-500 hidden sm:inline">Loss</span>
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-100"></div>
              <span className="text-gray-500 hidden sm:inline">0-${settings.colorThresholds.darkGreen}</span>
          </div>
          <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-300"></div>
              <span className="text-gray-500 hidden sm:inline">{'>'}${settings.colorThresholds.darkGreen}</span>
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

  // Zoom Levels: 0=Compact, 1=Normal, 2=Comfortable
  const handleZoom = (direction: 'in' | 'out') => {
      setGridZoom(prev => {
          if (direction === 'in') return Math.min(2, prev + 1);
          return Math.max(0, prev - 1);
      });
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      <Sidebar 
        settings={settings} 
        updateSettings={setSettings} 
        onExport={handleExport} 
        activeTab={activeTab} 
        onSaveBook={(name) => handleSaveBook(name)} 
        onOverwriteBook={handleOverwriteBook}
        globalGoldPrice={globalGoldPrice} 
        marketplaceRates={marketplaceRates} 
        selectedKarat={activeKarat} // PASS ACTIVE KARAT FOR SCOPED EDITING
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <ProjectHeader settings={settings} updateSettings={setSettings} onBack={onBack} marketplaceRates={marketplaceRates} />

        {/* --- MAIN TOOLBAR & TABS --- */}
        <div className={`border-b border-gray-200 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm z-20 transition-colors duration-300 ${activeTab === 'monitor' ? 'bg-emerald-50/50' : (activeTab === 'marketplace' ? 'bg-indigo-50/50' : 'bg-white')}`}>
            
            <div className="flex items-center gap-4 overflow-visible">
                {/* Tab Switcher */}
                <div className="bg-gray-100/80 p-1 rounded-xl flex shadow-inner shrink-0">
                    <button onClick={() => setActiveTab('builder')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'builder' ? 'bg-white text-gray-900 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}>
                        <Calculator size={14} /> Build Prices
                    </button>
                    
                    {/* Monitor Dropdown Tab */}
                    {settings.marketplace === 'etsy' ? (
                        <>
                            <button 
                                ref={monitorMenuRef}
                                onClick={() => {
                                    if (activeTab === 'monitor') setIsMonitorMenuOpen(!isMonitorMenuOpen);
                                    else setActiveTab('monitor');
                                }} 
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-100/50'}`}>
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
                        <button onClick={() => setActiveTab('monitor')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200' : 'text-gray-500 hover:text-emerald-700 hover:bg-emerald-100/50'}`}>
                            <TrendingUp size={14} /> Monitor Profit
                        </button>
                    )}

                    <button onClick={() => setActiveTab('marketplace')} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'marketplace' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-gray-500 hover:text-indigo-700 hover:bg-indigo-100/50'}`}>
                        <ShoppingBag size={14} /> Market
                    </button>
                </div>

                {/* Active Book Header (Replaces dropdown visual) */}
                {(activeTab === 'monitor' || activeTab === 'marketplace') && (
                    <div className="hidden md:flex flex-col ml-2 border-l border-emerald-200 pl-4 h-9 justify-center">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-800/60 leading-none mb-1">
                            <Lock size={10} /> Active Price Book
                        </div>
                        <div className="flex items-center gap-2 leading-none">
                             <div className="relative group">
                                 <select 
                                    className="appearance-none bg-transparent font-bold text-emerald-900 text-xs pr-4 cursor-pointer focus:outline-none"
                                    value={selectedBookId || ''} 
                                    onChange={(e) => setSelectedBookId(e.target.value)}
                                 >
                                    <option value="" disabled>Select Book</option>
                                    {settings.priceBooks.map(b => <option key={b.id} value={b.id}>{b.name} {b.id === settings.activePriceBookId ? '(Active)' : ''}</option>)}
                                 </select>
                                 <ChevronDown size={10} className="absolute right-0 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
                             </div>
                             {activeBook?.snapshot && (
                                 <span className="text-[9px] text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
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
            
            {/* Simulation & Debug Toggle Button */}
            <div className="flex items-center gap-2">
                {activeTab === 'monitor' && (
                    <>
                        <button 
                            onClick={() => setShowSimulation(!showSimulation)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showSimulation ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
                        >
                            {showSimulation ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                            {showSimulation ? 'Simulation ON' : 'Simulation'}
                        </button>
                        
                        {/* Debug Toggle - Monitor Mode Only */}
                        <button 
                            onClick={() => setShowDebug(!showDebug)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${showDebug ? 'bg-gray-800 text-green-400 border-gray-700' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                            title="Toggle Calc Debug"
                        >
                            <Bug size={12} />
                        </button>
                    </>
                )}
            </div>
            
            {activeTab !== 'monitor' && <HeatmapLegend />}
        </div>

        {/* --- SIMULATION TOOLBAR (Collapsible) --- */}
        {activeTab === 'monitor' && showSimulation && (
            <div className="bg-amber-50/50 border-b border-amber-100 px-4 py-3 animate-in slide-in-from-top-2">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Controls Cluster */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-amber-800">Price Increase</span>
                             <div className="flex items-center gap-1 bg-white border border-amber-200 rounded-lg px-2 py-1">
                                <input 
                                    type="number"
                                    className="w-12 bg-transparent text-center text-sm font-bold text-amber-900 outline-none"
                                    value={simulationPct}
                                    min="0"
                                    max="100"
                                    onChange={(e) => setSimulationPct(parseFloat(e.target.value) || 0)}
                                />
                                <span className="text-xs font-bold text-amber-400">%</span>
                             </div>
                        </div>

                        {simulationPct > 0 && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                                Base +{simulationPct}%
                            </span>
                        )}
                        
                        <div className="h-4 w-px bg-amber-200 mx-2"></div>
                        
                        <div className="flex items-center gap-1 text-[10px] text-amber-700">
                           <Info size={12} />
                           {monitorSubMode === 'standard' && <span>Viewing Standard Profit</span>}
                           {monitorSubMode === 'coupon' && <span>Simulating {settings.couponDiscountPercent ?? 30}% Coupon Discount on List Prices</span>}
                           {monitorSubMode === 'offsite' && <span>Simulating {settings.offsiteAdsPercent ?? 15}% Ads Fee</span>}
                        </div>
                    </div>

                    {/* Actions Cluster */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        {simulationPct !== 0 && (
                            <button 
                                onClick={() => setSimulationPct(0)}
                                className="px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-1.5 ml-auto md:ml-0"
                            >
                                <RefreshCcw size={14} />
                            </button>
                        )}
                        <button 
                            onClick={handleSaveSimulation}
                            disabled={!selectedBookId}
                            className="flex-1 md:flex-none px-4 py-2 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Save size={14} /> Save New
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Marketplace Source Banner */}
        {activeTab === 'marketplace' && selectedBookId && (
            <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 flex items-center justify-center gap-2 text-xs text-indigo-800 font-medium">
                <Lock size={12} className="text-indigo-500" />
                <span>Using <strong>Standard Base Price (Active Price Book)</strong> as base for Marketplace List Prices.</span>
            </div>
        )}

        <main className={`flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth ${activeTab === 'monitor' ? 'bg-emerald-50/20' : (activeTab === 'marketplace' ? 'bg-indigo-50/20' : 'bg-gray-50/50')}`}>
          {/* ... existing content ... */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 shrink-0">
                  {sortedActiveKarats.map(k => (
                    <button key={k} onClick={() => setActiveKarat(k)} className={`px-4 py-2 rounded-md text-sm font-bold transition-all border whitespace-nowrap ${activeKarat === k ? 'bg-gray-800 text-white border-gray-800 shadow-md' : 'bg-transparent text-gray-500 border-transparent hover:text-gray-900 hover:bg-gray-50'}`}>{k}</button>
                  ))}
                </div>
                <button onClick={() => setIsPurityModalOpen(true)} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-blue-600 hover:border-blue-300 transition-all shadow-sm group shrink-0" title="View Purity Standards"><Info size={16} className="group-hover:scale-110 transition-transform" /></button>
              </div>

              {/* Toolbar Actions: Zoom, Calibrate, View Mode (Save Removed) */}
              <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 md:pb-0">
                    
                    {/* View Controls Group */}
                    <div className="bg-white rounded-lg border border-gray-200 p-1 flex items-center gap-1 shadow-sm">
                        <button onClick={() => handleZoom('out')} className={`p-1.5 rounded hover:bg-gray-100 ${gridZoom === 0 ? 'text-gray-300' : 'text-gray-500'}`} disabled={gridZoom===0}><ZoomOut size={14}/></button>
                        <span className="text-[10px] font-bold text-gray-400 w-4 text-center">{gridZoom === 0 ? 'S' : (gridZoom === 1 ? 'M' : 'L')}</span>
                        <button onClick={() => handleZoom('in')} className={`p-1.5 rounded hover:bg-gray-100 ${gridZoom === 2 ? 'text-gray-300' : 'text-gray-500'}`} disabled={gridZoom===2}><ZoomIn size={14}/></button>
                    </div>

                    <button onClick={() => setIsCalibrationOpen(true)} className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-colors whitespace-nowrap shrink-0"><Sliders size={14} /> Calibrate Grams</button>
                    
                    {activeTab !== 'marketplace' && (
                        <>
                            <div className="h-6 w-px bg-gray-300 mx-2 hidden md:block"></div>
                            <div className={`inline-flex rounded-lg p-1 shadow-sm border shrink-0 ${activeTab === 'monitor' ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}>
                                {(['price', 'profit', 'cost'] as const).map(mode => (
                                    <button key={mode} onClick={() => setViewMode(mode)} className={`px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-all ${viewMode === mode ? (activeTab === 'monitor' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-blue-600 text-white shadow-sm') : (activeTab === 'monitor' ? 'text-emerald-700/60 hover:text-emerald-800' : 'text-gray-400 hover:text-gray-700')}`}>{mode}</button>
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
               
               {/* Break-Even Card */}
               <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3">
                   <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                        <TrendingUp size={24} />
                   </div>
                   <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Break-Even Gap</p>
                        <p className="text-xl font-bold text-gray-800 my-0.5">
                            {gridData.stats.breakEven.val > 0 ? `+${formatCurrency(gridData.stats.breakEven.val)}` : 'Safe'}
                        </p>
                        <p className="text-xs text-gray-400">
                            {gridData.stats.breakEven.val > 0 ? `Worst case: ${gridData.stats.breakEven.label}` : 'All items profitable'}
                        </p>
                   </div>
               </div>
            </div>
          </div>

          {settings.productType === 'EARRING' ? (
              <div className="space-y-4">
                  {sortedActiveKarats.map(karat => (
                      <div key={karat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between"><span className="font-bold text-gray-700 text-sm">{karat} Gold</span></div>
                          <div className="p-0">
                             <div className="grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, 1fr)` }}>
                                 {settings.widths.map(width => {
                                     if (karat !== activeKarat) return null;
                                     const cellData = gridData.cells.find(c => c.width === width && c.karat === activeKarat);
                                     if (!cellData) return <div key={width} className="p-4 text-xs text-gray-400">N/A</div>;
                                     const cellId = `${karat}-${width}-${cellData.size}`;
                                     return (
                                         <div key={width} className="flex flex-col border-r border-gray-100 last:border-0">
                                             <div className="bg-gray-50/50 p-2 text-center text-[10px] font-bold text-gray-500 uppercase border-b border-gray-100">Style/Type {width}</div>
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
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
                <div className="overflow-x-auto min-h-[300px] max-h-[600px] w-full">
                    <div className="inline-block min-w-full align-middle">
                    <div className="border-b border-gray-200 bg-gray-50 flex sticky top-0 z-30 shadow-sm min-w-max">
                        <div className="w-16 flex-shrink-0 p-3 text-xs font-bold text-gray-500 uppercase tracking-wider border-r border-gray-200 bg-gray-50 sticky left-0 z-40 flex items-center justify-center shadow-[1px_0_0_0_rgba(229,231,235,1)]">{productConfig.sizeLabel.includes("Length") ? "Length" : productConfig.sizeLabel.replace("Size", "")}</div>
                        <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, minmax(80px, 1fr))` }}>
                            {settings.widths.map((w, idx) => {
                                const isHighlighted = highlightedCoords?.c === idx;
                                return (
                                    <div key={w} className={`p-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider border-l border-gray-200 first:border-l-0 min-w-[80px] transition-colors ${isHighlighted ? 'bg-blue-50 text-blue-600' : 'bg-gray-50'}`}>
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
                                <div key={size} className={`flex border-b border-gray-100 transition-colors group ${isHighlightedRow ? 'bg-blue-50/30' : 'hover:bg-gray-50'}`}>
                                    <div className={`w-16 flex-shrink-0 flex items-center justify-center text-xs font-semibold text-gray-600 border-r border-gray-200 sticky left-0 z-20 shadow-[1px_0_0_0_rgba(229,231,235,1)] transition-colors ${isHighlightedRow ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
                                        {size.toFixed(2)}
                                    </div>
                                    <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${settings.widths.length}, minmax(80px, 1fr))` }}>
                                        {settings.widths.map((width, cIdx) => {
                                            const cellData = gridData.cells.find(c => c.size === size && c.width === width);
                                            if (!cellData) return <div key={width} className="bg-gray-100 min-w-[80px]" />;
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
      
      {/* SETUP WIZARD (AUTO TRIGGERED IF INCOMPLETE) */}
      {!settings.isSetupComplete && (
          <SetupWizard 
              project={settings} 
              onUpdate={setSettings} 
              onClose={onBack} // If they cancel wizard, go back to list
          />
      )}

      {tooltipState.id && tooltipState.data && tooltipState.rect && <Tooltip data={tooltipState.data} targetRect={tooltipState.rect} />}
      
      {/* DEBUG OVERLAY */}
      {showDebug && activeTab === 'monitor' && <DebugOverlay data={tooltipState.data || null} />}

      <CalibrationModal isOpen={isCalibrationOpen} onClose={handleCalibrationClose} settings={settings} updateSettings={setSettings} activeKarat={activeKarat} />
    </div>
  );
};
