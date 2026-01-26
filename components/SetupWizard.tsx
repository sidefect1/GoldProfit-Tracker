
import React, { useState, useEffect } from 'react';
import { ProjectSettings, ProductType, MarketplaceType, KaratEnum } from '../types';
import { ChevronRight, ChevronLeft, Check, Package, Layers, DollarSign, Ruler, X, Coins, Gem, Link2, Link, Sparkles } from 'lucide-react';
import { PRODUCT_CONFIGS, AVAILABLE_NECKLACE_LENGTHS, AVAILABLE_BRACELET_LENGTHS, getSizesForProduct, generateDefaultAnchors, KARATS } from '../constants';

interface SetupWizardProps {
  project: ProjectSettings;
  onUpdate: (project: ProjectSettings) => void;
  onClose?: () => void; // Optional escape hatch
}

// 3 Steps now: Basics (Name, Market, Type, Gold), Variations, Costs
const STEPS = [
    { id: 1, label: 'Basics & Type', icon: Package },
    { id: 2, label: 'Variations', icon: Layers },
    { id: 3, label: 'Costs', icon: DollarSign }
];

const AVAILABLE_RING_WIDTHS = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];

// Helper Input Component to prevent cursor jumping and handle decimals
const WizardNumberInput = ({ 
    value, 
    onChange, 
    prefix, 
    suffix,
    className = ""
}: { 
    value: number; 
    onChange: (val: number) => void; 
    prefix?: React.ReactNode; 
    suffix?: React.ReactNode;
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
        
        // Handle empty/partial inputs
        if (raw === '' || raw === '.' || raw === ',') return;

        const normalized = raw.replace(',', '.');
        const parsed = parseFloat(normalized);
        if (!isNaN(parsed)) {
            onChange(parsed);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        setLocalStr(value.toString());
    };

    return (
        <div className="relative group">
            {prefix && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400 font-bold pointer-events-none transition-colors">
                    {prefix}
                </div>
            )}
            <input 
                type="text"
                inputMode="decimal"
                className={`w-full border border-gray-200 dark:border-white/20 rounded-xl py-3 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-navy-950 focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-gold-500 dark:focus:border-gold-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-slate-400 ${prefix ? 'pl-8' : 'px-3'} ${suffix ? 'pr-8' : 'px-3'} ${className}`}
                value={localStr}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
            />
            {suffix && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-slate-400 pointer-events-none transition-colors">
                    {suffix}
                </div>
            )}
        </div>
    );
};

export const SetupWizard: React.FC<SetupWizardProps> = ({ project, onUpdate, onClose }) => {
  const [step, setStep] = useState(1);
  const [localProject, setLocalProject] = useState<ProjectSettings>({ ...project });
  
  // Local state for validations & inputs
  const [customWidthInput, setCustomWidthInput] = useState('');
  const [nameTouched, setNameTouched] = useState(false);

  // Auto-init variations if empty based on type (only once on load)
  useEffect(() => {
      // If variations are empty, pre-fill defaults for convenience
      // Note: For Necklace/Bracelet we intentionally keep them empty now per user request, so checking if defaultWidths has length is important
      if (localProject.widths.length === 0) {
          const defaults = PRODUCT_CONFIGS[localProject.productType].defaultWidths;
          if (defaults.length > 0) {
              setLocalProject(p => ({ ...p, widths: defaults }));
          }
      }
      if (localProject.sizes.length === 0) {
          // getSizesForProduct now returns strict default sets for non-rings (empty for Necklace/Bracelet)
          const sizes = getSizesForProduct(localProject.productType);
          setLocalProject(p => ({ ...p, sizes }));
      }
      // Ensure activeKarats initialized if missing
      if (!localProject.activeKarats || localProject.activeKarats.length === 0) {
          setLocalProject(p => ({ ...p, activeKarats: ['10K', '14K', '18K', '22K'] }));
      }
  }, []);

  const handleUpdate = (updates: Partial<ProjectSettings>) => {
      setLocalProject(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
      // Step 1 Validation
      if (step === 1) {
          setNameTouched(true);
          const hasName = localProject.name.trim().length > 0;
          const hasKarats = localProject.activeKarats.length > 0;
          if (!hasName || !hasKarats) return; // Block
      }
      
      // Step 2 Validation: Must have at least 1 size for Necklace/Bracelet
      if (step === 2 && (localProject.productType === 'NECKLACE' || localProject.productType === 'BRACELET')) {
          if (localProject.sizes.length === 0) {
              return; // Block next
          }
      }
      setStep(s => Math.min(3, s + 1));
  };
  
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleFinish = () => {
      // Ensure anchors exist for selected widths
      const newAnchors = { ...localProject.anchors };
      KARATS.forEach(k => {
          if (!newAnchors[k]) newAnchors[k] = {};
          localProject.widths.forEach(w => {
              if (!newAnchors[k][w]) {
                  const defaults = generateDefaultAnchors([w], localProject.productType);
                  newAnchors[k][w] = defaults[w];
              }
          });
      });

      onUpdate({ 
          ...localProject, 
          anchors: newAnchors,
          isSetupComplete: true 
      });
  };

  const toggleWidth = (w: number) => {
      const current = localProject.widths;
      const next = current.includes(w) ? current.filter(x => x !== w) : [...current, w].sort((a,b) => a-b);
      handleUpdate({ widths: next });
  };

  const addCustomWidth = () => {
      const val = parseFloat(customWidthInput.replace(',', '.'));
      if (!isNaN(val) && val > 0 && !localProject.widths.includes(val)) {
          handleUpdate({ widths: [...localProject.widths, val].sort((a,b) => a-b) });
          setCustomWidthInput('');
      }
  };

  const toggleSize = (s: number) => {
      const current = localProject.sizes;
      const next = current.includes(s) ? current.filter(x => x !== s) : [...current, s].sort((a,b) => a-b);
      handleUpdate({ sizes: next });
  };

  const toggleKarat = (k: KaratEnum) => {
      const current = localProject.activeKarats || [];
      const next = current.includes(k) ? current.filter(x => x !== k) : [...current, k];
      handleUpdate({ activeKarats: next });
  };

  const changeProductType = (type: ProductType) => {
      // When changing type, RESET sizes and widths to avoid carrying over Ring sizes to Necklace etc.
      // This fixes the calibration modal showing wrong sizes.
      const config = PRODUCT_CONFIGS[type];
      const newSizes = getSizesForProduct(type);
      const newWidths = config.defaultWidths; 
      
      handleUpdate({ 
          productType: type,
          widths: newWidths,
          sizes: newSizes
      });
  };

  const canContinue = () => {
      if (step === 1) return localProject.name.trim().length > 0 && localProject.activeKarats.length > 0;
      if (step === 2 && (localProject.productType === 'NECKLACE' || localProject.productType === 'BRACELET')) {
          return localProject.sizes.length > 0;
      }
      return true;
  };

  const getProductTypeIcon = (type: ProductType) => {
      switch(type) {
          case 'RING': return <Gem size={18} />;
          case 'NECKLACE': return <Link2 size={18} />;
          case 'BRACELET': return <Link size={18} />;
          case 'EARRING': return <Sparkles size={18} />;
          default: return <Package size={18} />;
      }
  };

  const renderStep1Basics = () => {
      const isNameInvalid = nameTouched && localProject.name.trim().length === 0;

      return (
      <div className="space-y-6">
          {/* Project Name */}
          <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Project Name</label>
              <input 
                  className={`w-full text-lg font-bold border-b-2 py-2 outline-none bg-transparent transition-colors ${
                      isNameInvalid 
                      ? 'border-red-500 text-red-600 dark:text-red-400 placeholder:text-red-300' 
                      : 'border-gray-200 dark:border-white/10 focus:border-gold-500 dark:focus:border-gold-500 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500'
                  }`}
                  value={localProject.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  onBlur={() => setNameTouched(true)}
                  placeholder="Project Name"
                  autoFocus
              />
              {isNameInvalid && (
                  <p className="text-xs font-bold text-red-500 mt-1 animate-in slide-in-from-top-1 fade-in">Project name is required.</p>
              )}
          </div>

          {/* Gold Price (Full Width) */}
          <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Gold Price (24K)</label>
              <WizardNumberInput 
                  prefix="$"
                  suffix="/g"
                  value={localProject.goldPricePerGram}
                  onChange={(val) => handleUpdate({ goldPricePerGram: val })}
                  className="text-lg"
              />
          </div>

          {/* Marketplace (Side by Side) */}
          <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Marketplace</label>
              <div className="grid grid-cols-2 gap-4">
                  {(['etsy', 'shopify'] as const).map(m => (
                      <button
                          key={m}
                          onClick={() => handleUpdate({ marketplace: m })}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-xl font-bold text-sm transition-all text-left justify-center ${
                              localProject.marketplace === m 
                              ? (m === 'etsy' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 text-orange-700 dark:text-orange-400' : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500 text-emerald-700 dark:text-emerald-400')
                              : 'bg-white dark:bg-navy-950 border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-white/30'
                          }`}
                      >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${localProject.marketplace === m ? 'border-current bg-current' : 'border-gray-300 dark:border-slate-500'}`}>
                              {localProject.marketplace === m && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          {m === 'etsy' ? 'Etsy' : 'Shopify'}
                      </button>
                  ))}
              </div>
          </div>

          {/* Product Type */}
          <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Product Type</label>
              <div className="grid grid-cols-2 gap-2">
                  {(['RING', 'NECKLACE', 'BRACELET', 'EARRING'] as const).map(type => {
                      const isSelected = localProject.productType === type;
                      return (
                      <button
                          key={type}
                          onClick={() => changeProductType(type)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-3 ${
                              isSelected
                              ? 'bg-gold-50 dark:bg-gold-900/20 border-gold-500 text-gold-700 dark:text-gold-400 shadow-sm'
                              : 'bg-white dark:bg-navy-950 border-gray-200 dark:border-white/10 text-gray-500 dark:text-slate-400 hover:border-gray-300 dark:hover:border-white/30 hover:text-gray-700 dark:hover:text-slate-200'
                          }`}
                      >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200 ${isSelected ? 'bg-white dark:bg-navy-900 text-gold-500' : 'bg-gray-100 dark:bg-navy-800 text-gray-400 dark:text-slate-500'}`}>
                              {getProductTypeIcon(type)}
                          </div>
                          <span className="uppercase tracking-wide">{PRODUCT_CONFIGS[type].label}</span>
                      </button>
                  )})}
              </div>
          </div>

          {/* Active Karats (Expanded Grid) */}
          <div>
             <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Active Karats</label>
             <div className="grid grid-cols-4 gap-2">
               {KARATS.map(k => (
                 <button
                    key={k}
                    onClick={() => toggleKarat(k)}
                    className={`w-full py-2.5 rounded-lg border transition-all text-sm font-bold flex justify-center items-center ${
                      localProject.activeKarats.includes(k) 
                      ? 'bg-gold-500 text-white border-gold-500 shadow-md shadow-gold-500/20' 
                      : 'bg-white dark:bg-navy-950 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                    }`}
                 >
                    {k}
                 </button>
               ))}
             </div>
             {localProject.activeKarats.length === 0 && (
                 <p className="text-[10px] text-red-500 font-bold mt-1 animate-pulse">Select at least one karat.</p>
             )}
          </div>
      </div>
      );
  };

  const renderStep2Variations = () => {
      const type = localProject.productType;
      const config = PRODUCT_CONFIGS[type];
      const isNecklaceOrBracelet = type === 'NECKLACE' || type === 'BRACELET';

      return (
          <div className="space-y-6">
              {/* Widths/Styles */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-3">
                      {config.widthLabel}s
                  </label>
                  
                  {type === 'RING' ? (
                      <div className="flex flex-wrap gap-2">
                          {AVAILABLE_RING_WIDTHS.map(w => (
                              <button
                                  key={w}
                                  onClick={() => toggleWidth(w)}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                      localProject.widths.includes(w) 
                                      ? 'bg-gold-500 text-white border-gold-500 shadow-md' 
                                      : 'bg-white dark:bg-navy-950 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30'
                                  }`}
                              >
                                  {w}mm
                              </button>
                          ))}
                      </div>
                  ) : (
                      <div className="space-y-3">
                          <div className="flex gap-2">
                              <input 
                                  type="number"
                                  className="border border-gray-300 dark:border-white/20 rounded-lg px-3 py-2 text-sm flex-1 bg-white dark:bg-navy-950 text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none"
                                  placeholder="Add value (e.g. 1.5)"
                                  value={customWidthInput}
                                  onChange={e => setCustomWidthInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && addCustomWidth()}
                              />
                              <button onClick={addCustomWidth} className="bg-gray-100 dark:bg-navy-800 px-4 py-2 rounded-lg text-sm font-bold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-navy-700">Add</button>
                          </div>
                          {localProject.widths.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                  {localProject.widths.map(w => (
                                      <span key={w} className="inline-flex items-center gap-1 bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 px-2 py-1 rounded-full text-xs font-bold border border-gold-200 dark:border-gold-800/50">
                                          {w}mm <button onClick={() => toggleWidth(w)}><X size={12} /></button>
                                      </span>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-xs text-gray-400 dark:text-slate-500 italic">No {config.widthLabel.toLowerCase()}s added yet.</div>
                          )}
                      </div>
                  )}
              </div>

              {/* Lengths - STRICT MODE for Necklace/Bracelet */}
              {isNecklaceOrBracelet && (
                  <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider">
                            {config.sizeLabel}s (Select to Enable)
                        </label>
                        {localProject.sizes.length === 0 && (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded border border-red-100 dark:border-red-900">Selection Required</span>
                        )}
                      </div>
                      
                      {/* Fixed Option Grid - No Custom Inputs */}
                      <div className="flex flex-wrap gap-2">
                          {(type === 'NECKLACE' ? AVAILABLE_NECKLACE_LENGTHS : AVAILABLE_BRACELET_LENGTHS).map(s => {
                              const isSel = localProject.sizes.includes(s);
                              return (
                                  <button
                                      key={s}
                                      onClick={() => toggleSize(s)}
                                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                                          isSel 
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                                          : 'bg-white dark:bg-navy-950 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30'
                                      }`}
                                  >
                                      {s}"
                                  </button>
                              );
                          })}
                      </div>
                  </div>
              )}
          </div>
      );
  };

  const renderStep3Costs = () => (
      <div className="space-y-6">
          <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-300 uppercase tracking-wider mb-2">Labor Model (Milyem)</label>
              <select 
                  className="w-full border border-gray-200 dark:border-white/20 rounded-lg px-3 py-2 text-sm bg-white dark:bg-navy-950 text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-gold-500 dark:focus:ring-gold-500 focus:border-gold-500 dark:focus:border-gold-500 outline-none"
                  value={localProject.laborModel}
                  onChange={(e) => handleUpdate({ laborModel: e.target.value as any })}
              >
                  <option value="MILYEM_PER_ITEM">Per Item (Milyem)</option>
                  <option value="MILYEM_PER_GRAM">Per Gram (Milyem)</option>
              </select>
          </div>

          <div>
              <div className="flex justify-between">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Labor (Milyem)</label>
                  <span className="text-[10px] text-gray-400 dark:text-slate-500 font-medium">100 milyem = %10 of 24K Price</span>
              </div>
              <WizardNumberInput 
                  value={localProject.laborMilyem}
                  onChange={(val) => handleUpdate({ laborMilyem: Math.min(1000, Math.max(0, val)) })}
              />
          </div>

          <div className="grid grid-cols-3 gap-3">
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Shipping</label>
                  <WizardNumberInput 
                      value={localProject.shippingCost}
                      onChange={(val) => handleUpdate({ shippingCost: val })}
                  />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Packaging</label>
                  <WizardNumberInput 
                      value={localProject.packagingCost}
                      onChange={(val) => handleUpdate({ packagingCost: val })}
                  />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase mb-1">Overhead</label>
                  <WizardNumberInput 
                      value={localProject.overheadCost}
                      onChange={(val) => handleUpdate({ overheadCost: val })}
                  />
              </div>
          </div>
      </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black/20 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-colors duration-200">
        <div className="bg-white dark:bg-navy-900 border border-gray-100 dark:border-white/5 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden transition-colors duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-navy-800/50">
                <div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-slate-100">Project Setup</h2>
                    <p className="text-sm text-gray-500 dark:text-slate-300">Configure your project base settings.</p>
                </div>
                {/* Stepper Dots */}
                <div className="flex gap-2">
                    {STEPS.map(s => (
                        <div key={s.id} className={`w-2.5 h-2.5 rounded-full transition-all ${step >= s.id ? 'bg-gold-500' : 'bg-gray-200 dark:bg-white/10'}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-600 dark:text-gold-400 flex items-center justify-center font-bold text-lg">
                        {step}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-slate-200">{STEPS[step - 1].label}</h3>
                </div>
                
                <div className="pl-2">
                    {step === 1 && renderStep1Basics()}
                    {step === 2 && renderStep2Variations()}
                    {step === 3 && renderStep3Costs()}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-navy-900 flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={prevStep} className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-slate-300 font-bold hover:bg-gray-200 dark:hover:bg-navy-800 rounded-lg transition-colors">
                        <ChevronLeft size={18} /> Back
                    </button>
                ) : (
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 dark:text-slate-500 font-bold hover:text-gray-600 dark:hover:text-slate-300">Close</button>
                )}

                <button 
                    onClick={step === 3 ? handleFinish : nextStep}
                    disabled={!canContinue()}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                        canContinue() 
                        ? 'bg-gold-500 text-white hover:bg-gold-600' 
                        : 'bg-gray-300 dark:bg-navy-800 text-gray-500 dark:text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                >
                    {step === 3 ? 'Finish Setup' : 'Next'} 
                    {step === 3 ? <Check size={18} /> : <ChevronRight size={18} />}
                </button>
            </div>
        </div>
    </div>
  );
};
