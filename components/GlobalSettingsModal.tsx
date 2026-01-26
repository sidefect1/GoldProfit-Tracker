
import React, { useState, useEffect } from 'react';
import { KaratEnum, MarketplaceRates } from '../types';
import { X, Save, ShieldCheck, ShoppingBag, Tag, Globe, Scale } from 'lucide-react';
import { KARATS } from '../constants';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeName?: string;
  purities: Record<KaratEnum, number>;
  marketplaceRates: MarketplaceRates;
  defaultCoupon: number;
  defaultOffsite: number;
  onSave: (
      purities: Record<KaratEnum, number>, 
      rates: MarketplaceRates,
      coupon: number,
      offsite: number
  ) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ 
    isOpen, 
    onClose, 
    storeName,
    purities, 
    marketplaceRates, 
    defaultCoupon,
    defaultOffsite,
    onSave 
}) => {
  const [localPurities, setLocalPurities] = useState<Record<KaratEnum, number>>(purities);
  const [localRates, setLocalRates] = useState<MarketplaceRates>(marketplaceRates);
  const [localCoupon, setLocalCoupon] = useState(defaultCoupon);
  const [localOffsite, setLocalOffsite] = useState(defaultOffsite);

  useEffect(() => {
    if (isOpen) {
        setLocalPurities(purities);
        setLocalRates(marketplaceRates);
        setLocalCoupon(defaultCoupon);
        setLocalOffsite(defaultOffsite);
    }
  }, [purities, marketplaceRates, defaultCoupon, defaultOffsite, isOpen]);

  if (!isOpen) return null;

  const handlePurityChange = (karat: KaratEnum, value: string) => {
      const normalized = value.replace(',', '.');
      const val = parseFloat(normalized);
      if (!isNaN(val)) {
          setLocalPurities(prev => ({ ...prev, [karat]: val }));
      }
  };

  const handleSave = () => {
    onSave(localPurities, localRates, localCoupon, localOffsite);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-gray-100 dark:border-white/10 overflow-hidden transform transition-all scale-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-navy-950 dark:to-navy-900 p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 text-gold-400 mb-1">
                <ShieldCheck size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Global Standards</span>
            </div>
            <h3 className="text-xl font-bold text-white">
                Store Settings
            </h3>
            <p className="text-gray-400 text-xs mt-1">Defaults for new projects in <strong>{storeName || 'Active Store'}</strong>.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 bg-gray-50 dark:bg-navy-950 space-y-6 overflow-y-auto">
          
          {/* Section 1: Karat Multipliers */}
          <div>
             <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <Scale size={16} className="text-blue-600 dark:text-gold-500" />
                Karat Multipliers (Purity)
             </h4>
             <div className="grid grid-cols-2 gap-4">
                 {KARATS.map(karat => (
                     <div key={karat} className="flex justify-between items-center bg-white dark:bg-navy-900 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                         <span className="text-xs font-bold text-gray-500 dark:text-slate-400">{karat}</span>
                         <input 
                            type="text"
                            inputMode="decimal"
                            className="w-20 text-right font-mono font-bold text-gray-900 dark:text-white bg-transparent outline-none border-b border-gray-200 dark:border-white/10 focus:border-blue-500 dark:focus:border-gold-500 transition-colors"
                            value={localPurities[karat]}
                            onChange={(e) => handlePurityChange(karat, e.target.value)}
                         />
                     </div>
                 ))}
             </div>
             <p className="text-[10px] text-gray-400 dark:text-slate-500 mt-2">
                 Defines gold content factor (e.g. 0.585 for 14K). Affects cost calculations.
             </p>
          </div>

          {/* Section 2: Marketplace Fees */}
          <div>
             <h4 className="text-sm font-bold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-500 dark:text-indigo-400" />
                Platform Fees
             </h4>
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white dark:bg-navy-900 p-3 rounded-xl border border-orange-200 dark:border-orange-900/50 shadow-sm flex flex-col">
                     <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1">Etsy Fee</span>
                     <div className="flex items-center">
                         <input 
                            type="number"
                            step="0.1"
                            className="w-full text-lg font-bold text-gray-900 dark:text-white outline-none border-b border-gray-200 dark:border-white/10 focus:border-orange-500 dark:focus:border-orange-500 bg-transparent transition-colors"
                            value={localRates.etsy}
                            onChange={(e) => setLocalRates({...localRates, etsy: parseFloat(e.target.value) || 0})}
                         />
                         <span className="text-sm font-bold text-gray-400 dark:text-slate-500">%</span>
                     </div>
                 </div>
                 <div className="bg-white dark:bg-navy-900 p-3 rounded-xl border border-green-200 dark:border-green-900/50 shadow-sm flex flex-col">
                     <span className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase tracking-wide mb-1">Shopify Fee</span>
                     <div className="flex items-center">
                         <input 
                            type="number"
                            step="0.1"
                            className="w-full text-lg font-bold text-gray-900 dark:text-white outline-none border-b border-gray-200 dark:border-white/10 focus:border-green-500 dark:focus:border-green-500 bg-transparent transition-colors"
                            value={localRates.shopify}
                            onChange={(e) => setLocalRates({...localRates, shopify: parseFloat(e.target.value) || 0})}
                         />
                         <span className="text-sm font-bold text-gray-400 dark:text-slate-500">%</span>
                     </div>
                 </div>
             </div>
          </div>

          {/* Section 3: Etsy Specifics */}
          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-100 dark:border-orange-900/30">
             <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-bold text-orange-800 dark:text-orange-300 flex items-center gap-2">
                    <Tag size={16} />
                    Etsy Simulation Defaults
                </h4>
                <span className="text-[10px] font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded">Etsy Only</span>
             </div>
             
             <div className="space-y-3">
                 <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-gray-600 dark:text-slate-400">Coupon Discount</label>
                     <div className="flex items-center bg-white dark:bg-navy-900 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1">
                         <input 
                            type="number" 
                            className="w-12 text-right font-bold text-gray-800 dark:text-white bg-transparent outline-none"
                            value={localCoupon}
                            onChange={(e) => setLocalCoupon(parseFloat(e.target.value) || 0)}
                         />
                         <span className="text-xs font-bold text-gray-400 ml-1">%</span>
                     </div>
                 </div>
                 <div className="flex items-center justify-between">
                     <label className="text-xs font-bold text-gray-600 dark:text-slate-400 flex items-center gap-1"><Globe size={12}/> Offsite Ads Fee</label>
                     <div className="flex items-center bg-white dark:bg-navy-900 border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1">
                         <input 
                            type="number" 
                            className="w-12 text-right font-bold text-gray-800 dark:text-white bg-transparent outline-none"
                            value={localOffsite}
                            onChange={(e) => setLocalOffsite(parseFloat(e.target.value) || 0)}
                         />
                         <span className="text-xs font-bold text-gray-400 ml-1">%</span>
                     </div>
                 </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-navy-900 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3 shrink-0">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 text-gray-500 dark:text-slate-400 font-bold hover:text-gray-900 dark:hover:text-white transition-colors text-sm"
            >
                Cancel
            </button>
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 dark:bg-gold-500 text-white rounded-xl font-bold shadow-lg hover:bg-black dark:hover:bg-gold-600 transition-all text-sm"
            >
                <Save size={16} /> Save Settings
            </button>
        </div>

      </div>
    </div>
  );
};
