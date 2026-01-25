
import React, { useState, useEffect } from 'react';
import { ProjectSettings, ProductType, MarketplaceType, KaratEnum } from '../types';
import { ChevronRight, ChevronLeft, Check, Package, Layers, DollarSign, Ruler, X, Coins } from 'lucide-react';
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
        <div className="relative">
            {prefix && (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none">
                    {prefix}
                </div>
            )}
            <input 
                type="text"
                inputMode="decimal"
                className={`w-full border border-gray-200 rounded-xl py-3 text-sm font-bold text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${prefix ? 'pl-8' : 'px-3'} ${suffix ? 'pr-8' : 'px-3'} ${className}`}
                value={localStr}
                onChange={handleChange}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
            />
            {suffix && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 pointer-events-none">
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
      // Step 1 Validation: Must have at least 1 karat
      if (step === 1 && localProject.activeKarats.length === 0) {
          return; // Block next
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

  const renderStep1Basics = () => (
      <div className="space-y-6">
          {/* Project Name */}
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project Name</label>
              <input 
                  className="w-full text-lg font-bold border-b-2 border-gray-200 py-2 focus:border-blue-500 outline-none bg-transparent"
                  value={localProject.name}
                  onChange={(e) => handleUpdate({ name: e.target.value })}
                  placeholder="Project Name"
                  autoFocus
              />
          </div>

          {/* Gold Price (Full Width) */}
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Gold Price (24K)</label>
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Marketplace</label>
              <div className="grid grid-cols-2 gap-4">
                  {(['etsy', 'shopify'] as const).map(m => (
                      <button
                          key={m}
                          onClick={() => handleUpdate({ marketplace: m })}
                          className={`flex items-center gap-3 px-4 py-3 border rounded-xl font-bold text-sm transition-all text-left justify-center ${
                              localProject.marketplace === m 
                              ? (m === 'etsy' ? 'bg-orange-50 border-orange-500 text-orange-700' : 'bg-emerald-50 border-emerald-500 text-emerald-700')
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                      >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${localProject.marketplace === m ? 'border-current bg-current' : 'border-gray-300'}`}>
                              {localProject.marketplace === m && <Check size={10} className="text-white" strokeWidth={4} />}
                          </div>
                          {m === 'etsy' ? 'Etsy' : 'Shopify'}
                      </button>
                  ))}
              </div>
          </div>

          {/* Product Type */}
          <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Product Type</label>
              <div className="grid grid-cols-2 gap-2">
                  {(['RING', 'NECKLACE', 'BRACELET', 'EARRING'] as const).map(type => (
                      <button
                          key={type}
                          onClick={() => changeProductType(type)}
                          className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                              localProject.productType === type 
                              ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-sm'
                              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                          }`}
                      >
                          <span className="text-base">
                            {type === 'RING' && '💍'}
                            {type === 'NECKLACE' && '📿'}
                            {type === 'BRACELET' && '💫'}
                            {type === 'EARRING' && '👂'}
                          </span>
                          {PRODUCT_CONFIGS[type].label}
                      </button>
                  ))}
              </div>
          </div>

          {/* Active Karats (Expanded Grid) */}
          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Active Karats</label>
             <div className="grid grid-cols-4 gap-2">
               {KARATS.map(k => (
                 <button
                    key={k}
                    onClick={() => toggleKarat(k)}
                    className={`w-full py-2.5 rounded-lg border transition-all text-sm font-bold flex justify-center items-center ${
                      localProject.activeKarats.includes(k) 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}
                 >
                    {k}
                 </button>
               ))}
             </div>
             {localProject.activeKarats.length === 0 && (
                 <p className="text-[10px] text-red-500 font-bold mt-1">Select at least one karat.</p>
             )}
          </div>
      </div>
  );

  const renderStep2Variations = () => {
      const type = localProject.productType;
      const config = PRODUCT_CONFIGS[type];
      const isNecklaceOrBracelet = type === 'NECKLACE' || type === 'BRACELET';

      return (
          <div className="space-y-6">
              {/* Widths/Styles */}
              <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
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
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                      : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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
                                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 bg-white"
                                  placeholder="Add value (e.g. 1.5)"
                                  value={customWidthInput}
                                  onChange={e => setCustomWidthInput(e.target.value)}
                                  onKeyDown={e => e.key === 'Enter' && addCustomWidth()}
                              />
                              <button onClick={addCustomWidth} className="bg-gray-100 px-4 py-2 rounded-lg text-sm font-bold">Add</button>
                          </div>
                          {localProject.widths.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                  {localProject.widths.map(w => (
                                      <span key={w} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs font-bold border border-blue-100">
                                          {w}mm <button onClick={() => toggleWidth(w)}><X size={12} /></button>
                                      </span>
                                  ))}
                              </div>
                          ) : (
                              <div className="text-xs text-gray-400 italic">No {config.widthLabel.toLowerCase()}s added yet.</div>
                          )}
                      </div>
                  )}
              </div>

              {/* Lengths - STRICT MODE for Necklace/Bracelet */}
              {isNecklaceOrBracelet && (
                  <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {config.sizeLabel}s (Select to Enable)
                        </label>
                        {localProject.sizes.length === 0 && (
                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded">Selection Required</span>
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
                                          : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
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
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Labor Model (Milyem)</label>
              <select 
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  value={localProject.laborModel}
                  onChange={(e) => handleUpdate({ laborModel: e.target.value as any })}
              >
                  <option value="MILYEM_PER_ITEM">Per Item (Milyem)</option>
                  <option value="MILYEM_PER_GRAM">Per Gram (Milyem)</option>
              </select>
          </div>

          <div>
              <div className="flex justify-between">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Labor (Milyem)</label>
                  <span className="text-[10px] text-gray-400 font-medium">100 milyem = %10 of 24K Price</span>
              </div>
              <WizardNumberInput 
                  value={localProject.laborMilyem}
                  onChange={(val) => handleUpdate({ laborMilyem: Math.min(1000, Math.max(0, val)) })}
              />
          </div>

          <div className="grid grid-cols-3 gap-3">
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Shipping</label>
                  <WizardNumberInput 
                      value={localProject.shippingCost}
                      onChange={(val) => handleUpdate({ shippingCost: val })}
                  />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Packaging</label>
                  <WizardNumberInput 
                      value={localProject.packagingCost}
                      onChange={(val) => handleUpdate({ packagingCost: val })}
                  />
              </div>
              <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Overhead</label>
                  <WizardNumberInput 
                      value={localProject.overheadCost}
                      onChange={(val) => handleUpdate({ overheadCost: val })}
                  />
              </div>
          </div>
      </div>
  );

  const canContinue = () => {
      if (step === 1) return localProject.activeKarats.length > 0;
      if (step === 2 && (localProject.productType === 'NECKLACE' || localProject.productType === 'BRACELET')) {
          return localProject.sizes.length > 0;
      }
      return true;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Project Setup</h2>
                    <p className="text-sm text-gray-500">Configure your project base settings.</p>
                </div>
                {/* Stepper Dots */}
                <div className="flex gap-2">
                    {STEPS.map(s => (
                        <div key={s.id} className={`w-2.5 h-2.5 rounded-full transition-all ${step >= s.id ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg">
                        {step}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800">{STEPS[step - 1].label}</h3>
                </div>
                
                <div className="pl-2">
                    {step === 1 && renderStep1Basics()}
                    {step === 2 && renderStep2Variations()}
                    {step === 3 && renderStep3Costs()}
                </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                {step > 1 ? (
                    <button onClick={prevStep} className="flex items-center gap-2 px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors">
                        <ChevronLeft size={18} /> Back
                    </button>
                ) : (
                    <button onClick={onClose} className="px-4 py-2 text-gray-400 font-bold hover:text-gray-600">Close</button>
                )}

                <button 
                    onClick={step === 3 ? handleFinish : nextStep}
                    disabled={!canContinue()}
                    className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg transition-all active:scale-95 ${
                        canContinue() 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
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
