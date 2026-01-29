
import React, { useState, useEffect, useRef } from 'react';
import { ProjectSettings, KaratEnum } from '../types';
import { X, Lock, Grid, Calculator, Trash2, Info } from 'lucide-react';
import { PRODUCT_CONFIGS, KARATS, getSizesForProduct } from '../constants';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: (autoFilledCount?: number) => void;
  settings: ProjectSettings;
  updateSettings: (s: ProjectSettings) => void;
  activeKarat: KaratEnum; 
}

const TableInput = ({ 
  value, 
  isAutoFilled,
  autoMethod,
  onChange,
  onBlur 
}: { 
  value: number; 
  isAutoFilled?: boolean;
  autoMethod?: 'row' | 'col' | 'avg';
  onChange: (val: string) => void;
  onBlur?: () => void;
}) => {
  const [localStr, setLocalStr] = useState(value === 0 ? '' : value.toString());
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
     if (!isFocused) {
        setLocalStr(value === 0 ? '' : value.toString());
     }
  }, [value, isFocused]);

  // Simplified label for Horizontal-Only mode, though legacy 'avg'/'col' might still exist in old data
  const methodLabel = autoMethod === 'avg' ? 'Avg Estimate' : (autoMethod === 'col' ? 'Vertical Estimate' : 'Row Estimate');

  return (
      <div className="relative group min-w-[60px]">
          <input 
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            className={`w-full text-center border rounded-md outline-none transition-all py-1.5 text-xs font-bold ${
                isAutoFilled 
                ? 'text-gray-400 dark:text-slate-500 italic bg-transparent border-transparent' 
                : 'text-gray-900 dark:text-white bg-white dark:bg-navy-950 border-gray-200 dark:border-white/20 shadow-sm focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-gold-500/20 focus:border-blue-500 dark:focus:border-gold-500'
            }`}
            value={localStr}
            onChange={(e) => {
                setLocalStr(e.target.value);
                onChange(e.target.value);
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => {
                setIsFocused(false);
                if (onBlur) onBlur();
            }}
            title={isAutoFilled ? `Auto-filled: ${methodLabel}` : undefined}
          />
      </div>
  );
};

export const CalibrationModal: React.FC<CalibrationModalProps> = ({ isOpen, onClose, settings, updateSettings }) => {
  const [localWeights, setLocalWeights] = useState<Record<string, number>>({});
  const [localSources, setLocalSources] = useState<Record<string, 'manual' | 'auto'>>({});
  const [localMethods, setLocalMethods] = useState<Record<string, 'row' | 'col' | 'avg'>>({});
  const [localRingAnchors, setLocalRingAnchors] = useState<Record<number, any>>({});
  
  // Clear Confirmation State
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  // Using ReturnType<typeof setTimeout> to avoid NodeJS namespace dependency in browser environment
  const clearTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
        setLocalWeights({ ...(settings.referenceExactWeights || {}) });
        setLocalSources({ ...(settings.referenceExactWeightSources || {}) });
        setLocalMethods({ ...(settings.referenceExactWeightMethods || {}) });
        setLocalRingAnchors({ ...(settings.referenceAnchors || {}) });
        setIsConfirmingClear(false);
    }
  }, [isOpen, settings]);
  
  if (!isOpen) return null;

  const config = PRODUCT_CONFIGS[settings.productType];
  const isRing = settings.productType === 'RING';
  const sizes = settings.sizes && settings.sizes.length > 0 
                ? [...settings.sizes].sort((a,b) => a-b) 
                : getSizesForProduct(settings.productType);

  const handleRingChange = (width: number, key: 'p1' | 'p2' | 'p3', value: string) => {
    const val = parseFloat(value.replace(',', '.'));
    const next = { ...localRingAnchors };
    if (!next[width]) next[width] = { p1: 0, p2: 0, p3: 0 };
    next[width][key] = isNaN(val) ? 0 : val;
    setLocalRingAnchors(next);
  };

  const handleExactChange = (width: number, size: number, value: string) => {
    const key = `${width}:${size}`;
    const normalized = value.replace(',', '.');
    const val = parseFloat(normalized);
    const nextWeights = { ...localWeights };
    const nextSources = { ...localSources };
    const nextMethods = { ...localMethods };
    
    if (isNaN(val) || normalized === '') {
        nextWeights[key] = 0;
        delete nextSources[key];
        delete nextMethods[key];
    } else {
        nextWeights[key] = val;
        nextSources[key] = 'manual';
        delete nextMethods[key];
    }
    
    setLocalWeights(nextWeights);
    setLocalSources(nextSources);
    setLocalMethods(nextMethods);
  };

  const handleClearAuto = () => {
    if (!isConfirmingClear) {
        setIsConfirmingClear(true);
        if (clearTimerRef.current) clearTimeout(clearTimerRef.current);
        clearTimerRef.current = setTimeout(() => setIsConfirmingClear(false), 3000);
        return;
    }

    const nextWeights = { ...localWeights };
    const nextSources = { ...localSources };
    const nextMethods = { ...localMethods };
    Object.keys(nextSources).forEach(key => {
        if (nextSources[key] === 'auto') {
            delete nextWeights[key];
            delete nextSources[key];
            delete nextMethods[key];
        }
    });
    setLocalWeights(nextWeights);
    setLocalSources(nextSources);
    setLocalMethods(nextMethods);
    setIsConfirmingClear(false);
  };

  const estimateValue = (targetX: number, points: { x: number, val: number }[]): number | null => {
      if (points.length < 2) return null;
      const sorted = [...points].sort((a, b) => a.x - b.x);
      const left = sorted.filter(p => p.x < targetX);
      const right = sorted.filter(p => p.x > targetX);

      if (left.length > 0 && right.length > 0) {
          const p1 = left[left.length - 1];
          const p2 = right[0];
          const mReal = (p2.val - p1.val) / (p2.x - p1.x);
          return p1.val + mReal * (targetX - p1.x);
      } else if (left.length === 0) {
          const p1 = sorted[0];
          const p2 = sorted[1];
          const m = (p2.val - p1.val) / (p2.x - p1.x);
          return p1.val + m * (targetX - p1.x);
      } else {
          const p1 = sorted[sorted.length - 2];
          const p2 = sorted[sorted.length - 1];
          const m = (p2.val - p1.val) / (p2.x - p1.x);
          return p2.val + m * (targetX - p2.x);
      }
  };

  const calculateAutoFill = () => {
    const finalWeights = { ...localWeights };
    const finalSources = { ...localSources };
    const finalMethods = { ...localMethods };
    let filledCount = 0;

    // HORIZONTAL ONLY LOGIC (Row-based)
    // Iterate through each Width (Row) independently
    settings.widths.forEach(width => {
        
        // Gather manual points for this specific width/row
        const rowManualPoints = sizes
            .map(s => ({ x: s, val: localWeights[`${width}:${s}`] || 0, src: localSources[`${width}:${s}`] }))
            .filter(p => p.src === 'manual' && p.val > 0);

        // We need at least 2 manual points in a row to extrapolate/interpolate within that row
        if (rowManualPoints.length < 2) return;

        sizes.forEach(size => {
            const key = `${width}:${size}`;
            
            // Skip if manually set
            if (finalSources[key] === 'manual') return;

            // Calculate estimate purely based on row data
            const rowEstimate = estimateValue(size, rowManualPoints);

            if (rowEstimate !== null && rowEstimate > 0) {
                finalWeights[key] = parseFloat(rowEstimate.toFixed(2));
                finalSources[key] = 'auto';
                finalMethods[key] = 'row'; // Always 'row' in this mode
                filledCount++;
            }
        });
    });

    return { finalWeights, finalSources, finalMethods, filledCount };
  };

  const handleDone = () => {
    let finalRefWeights = localWeights;
    let finalRefSources = localSources;
    let finalRefMethods = localMethods;
    let finalRefAnchors = localRingAnchors;
    let autoFilledCount = 0;

    if (!isRing) {
        const fillResult = calculateAutoFill();
        finalRefWeights = fillResult.finalWeights;
        finalRefSources = fillResult.finalSources;
        finalRefMethods = fillResult.finalMethods;
        autoFilledCount = fillResult.filledCount;
    }

    const newExactWeights: Record<string, number> = {};
    const newAnchors = { ...settings.anchors };

    Object.entries(finalRefWeights).forEach(([wsKey, weight24k]: [string, any]) => {
        KARATS.forEach(karat => {
            const ratio = settings.purities[karat];
            newExactWeights[`${karat}:${wsKey}`] = parseFloat((weight24k * ratio).toFixed(2));
        });
    });

    if (isRing) {
        Object.entries(finalRefAnchors).forEach(([wKey, anchor24k]: [any, any]) => {
            KARATS.forEach(karat => {
                const ratio = settings.purities[karat];
                if (!newAnchors[karat]) newAnchors[karat] = {};
                newAnchors[karat][wKey] = {
                    p1: parseFloat((anchor24k.p1 * ratio).toFixed(2)),
                    p2: parseFloat((anchor24k.p2 * ratio).toFixed(2)),
                    p3: parseFloat((anchor24k.p3 * ratio).toFixed(2))
                };
            });
        });
    }

    updateSettings({
        ...settings,
        referenceExactWeights: finalRefWeights,
        referenceExactWeightSources: finalRefSources,
        referenceExactWeightMethods: finalRefMethods,
        exactWeights: newExactWeights,
        referenceAnchors: finalRefAnchors,
        anchors: newAnchors,
        lastModified: Date.now()
    });

    onClose(autoFilledCount);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
        
        {/* Centered Header Section */}
        <div className="px-6 py-8 flex flex-col items-center text-center border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-navy-800/50 shrink-0">
          <div className="flex items-center gap-3 mb-2">
            {isRing ? <Calculator size={28} className="text-blue-500 dark:text-blue-400" /> : <Grid size={28} className="text-emerald-500 dark:text-emerald-400" />}
            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Gram Calibration: {config.label}
            </h3>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 max-w-lg leading-relaxed">
            Enter at least 2 weights per row to auto-fill the rest.
          </p>
          
          <button 
            onClick={() => onClose()} 
            className="absolute top-6 right-6 p-2 hover:bg-gray-200 dark:hover:bg-navy-700 rounded-full text-gray-400 dark:text-slate-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Info Badge (Floating Style) */}
        <div className="px-6 py-3 flex justify-end bg-white dark:bg-navy-900 shrink-0">
             <div className="flex items-center gap-2 text-amber-700/60 dark:text-amber-400/80 text-[10px] font-bold uppercase tracking-widest bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30 shadow-sm">
                 <Lock size={12} /> Auto-syncs to all Karats
             </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isRing ? (
            <table className="min-w-full text-sm text-left border-separate border-spacing-y-2">
                <thead className="text-gray-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-widest sticky top-0 bg-white dark:bg-navy-900 z-10">
                <tr>
                    <th className="px-4 py-2">{config.widthLabel}</th>
                    <th className="px-4 py-2 text-center">Size {config.anchors[0]} (24K)</th>
                    <th className="px-4 py-2 text-center">Size {config.anchors[1]} (24K)</th>
                    <th className="px-4 py-2 text-center">Size {config.anchors[2]} (24K)</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                {settings.widths.map(width => {
                    const anchor = localRingAnchors[width] || { p1: 0, p2: 0, p3: 0 };
                    return (
                        <tr key={width} className="bg-white dark:bg-navy-950 hover:bg-gray-50 dark:hover:bg-navy-900 transition-colors rounded-lg overflow-hidden">
                            <td className="px-4 py-3 font-bold text-gray-700 dark:text-slate-300">{width}mm</td>
                            <td className="px-4 py-3"><TableInput value={anchor.p1} onChange={(v) => handleRingChange(width, 'p1', v)} /></td>
                            <td className="px-4 py-3"><TableInput value={anchor.p2} onChange={(v) => handleRingChange(width, 'p2', v)} /></td>
                            <td className="px-4 py-3"><TableInput value={anchor.p3} onChange={(v) => handleRingChange(width, 'p3', v)} /></td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
          ) : (
            <div className="relative border border-gray-100 dark:border-white/10 rounded-xl shadow-inner bg-gray-50/30 dark:bg-navy-900/30 flex flex-col overflow-hidden">
                <div className="overflow-x-auto max-w-full [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300 dark:[&::-webkit-scrollbar-thumb]:bg-navy-600 [&::-webkit-scrollbar-track]:bg-transparent">
                    <table className="min-w-max w-full text-sm text-left border-collapse">
                        <thead className="bg-white dark:bg-navy-900 text-gray-400 dark:text-slate-500 font-bold uppercase text-[9px] tracking-widest sticky top-0 z-20 border-b border-gray-100 dark:border-white/10 shadow-sm">
                            <tr>
                                <th className="px-3 py-4 bg-white dark:bg-navy-900 sticky left-0 z-30 min-w-[100px] border-r border-gray-100 dark:border-white/10 border-b border-gray-100 dark:border-white/10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                    {config.widthLabel}
                                </th>
                                {sizes.map(s => (
                                    <th key={s} className="px-3 py-4 text-center min-w-[90px] bg-white dark:bg-navy-900 border-b border-gray-100 dark:border-white/10">
                                        {config.sizeLabel.includes('Size') ? `Size ${s}` : `${s}"`}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                            {settings.widths.map(width => (
                                <tr key={width} className="hover:bg-white dark:hover:bg-navy-800 transition-colors group">
                                    <td className="px-3 py-3 font-bold text-gray-700 dark:text-slate-300 sticky left-0 bg-white dark:bg-navy-900 group-hover:bg-white dark:group-hover:bg-navy-900 z-10 border-r border-gray-50 dark:border-white/5 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                        {settings.productType === 'EARRING' ? 'Standard' : `${width}mm`}
                                    </td>
                                    {sizes.map(size => {
                                        const key = `${width}:${size}`;
                                        const val = localWeights[key] || 0;
                                        const source = localSources[key];
                                        const method = localMethods[key];
                                        return (
                                            <td key={size} className="px-1 py-1">
                                                <TableInput 
                                                    value={val}
                                                    isAutoFilled={source === 'auto'}
                                                    autoMethod={method}
                                                    onChange={(v) => handleExactChange(width, size, v)}
                                                />
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          )}
        </div>

        {/* Refined Footer Actions */}
        <div className="p-6 border-t border-gray-200 dark:border-white/10 bg-gray-50/80 dark:bg-navy-800/80 flex items-center justify-between shrink-0">
          
          {/* Left: Simplified Legend / Info Icon */}
          <div className="flex items-center gap-2 group relative">
             <div className="p-2 text-gray-400 dark:text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors cursor-help bg-white dark:bg-navy-900 rounded-full shadow-sm border border-gray-200 dark:border-white/10">
                <Info size={18} />
             </div>
             <div className="absolute left-0 bottom-full mb-3 hidden group-hover:block w-64 p-3 bg-gray-900 dark:bg-navy-950 text-white text-[11px] rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200 z-50 leading-relaxed font-medium border border-gray-800 dark:border-white/10">
                <div className="mb-1 text-blue-400 font-bold uppercase tracking-wider">How auto-fill works:</div>
                Auto-fill calculates missing values horizontally (within same row).
                <div className="mt-2 text-gray-400 italic">Enter at least 2 values per row to enable estimation.</div>
                <div className="absolute -bottom-1 left-4 w-2 h-2 bg-gray-900 dark:bg-navy-950 rotate-45"></div>
             </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={handleClearAuto}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                    isConfirmingClear 
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200 dark:shadow-red-900/20 animate-pulse' 
                    : 'text-gray-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                }`}
             >
                 {isConfirmingClear ? 'Confirm Clear?' : 'Clear Auto-filled'}
                 <Trash2 size={16} />
             </button>

             <button 
                onClick={handleDone}
                className="px-10 py-3 bg-blue-600 dark:bg-gold-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-200 dark:shadow-none hover:bg-blue-700 dark:hover:bg-gold-600 transform active:scale-95 transition-all"
             >
                Done
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
