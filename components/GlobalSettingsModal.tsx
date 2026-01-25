
import React, { useState, useEffect } from 'react';
import { KaratEnum, MarketplaceRates } from '../types';
import { X, Save, ShieldCheck, Scale, ShoppingBag, Globe, Tag } from 'lucide-react';
import { KARATS } from '../constants';

interface GlobalSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  purities: Record<KaratEnum, number>;
  onSave: (newPurities: Record<KaratEnum, number>) => void;
  marketplaceRates: MarketplaceRates;
  onSaveMarketplaceRates: (rates: MarketplaceRates) => void;
}

export const GlobalSettingsModal: React.FC<GlobalSettingsModalProps> = ({ isOpen, onClose, purities, onSave, marketplaceRates, onSaveMarketplaceRates }) => {
  const [localPurities, setLocalPurities] = useState<Record<KaratEnum, number>>(purities);
  const [localRates, setLocalRates] = useState<MarketplaceRates>(marketplaceRates);

  useEffect(() => {
    setLocalPurities(purities);
    setLocalRates(marketplaceRates);
  }, [purities, marketplaceRates, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localPurities);
    onSaveMarketplaceRates(localRates);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col border border-gray-100 overflow-hidden transform transition-all scale-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 text-gold-400 mb-1">
                <ShieldCheck size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">System Configuration</span>
            </div>
            <h3 className="text-xl font-bold text-white">
                Global Settings
            </h3>
            <p className="text-gray-400 text-xs mt-1">Configure standards for new projects.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors bg-white/10 p-1.5 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 bg-gray-50 space-y-6 overflow-y-auto">
          
          {/* Section: Marketplace Rates */}
          <div>
             <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-500" />
                Default Fees & Rates (%)
             </h4>
             <div className="grid grid-cols-2 gap-4">
                 <div className="bg-white p-3 rounded-xl border border-orange-200 shadow-sm flex flex-col">
                     <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wide mb-1">Etsy Fee</span>
                     <div className="flex items-center">
                         <input 
                            type="number"
                            step="0.1"
                            className="w-full text-lg font-bold text-gray-900 outline-none border-b border-gray-200 focus:border-orange-500 bg-transparent transition-colors"
                            value={localRates.etsy}
                            onChange={(e) => setLocalRates({...localRates, etsy: parseFloat(e.target.value) || 0})}
                         />
                         <span className="text-sm font-bold text-gray-400">%</span>
                     </div>
                 </div>
                 <div className="bg-white p-3 rounded-xl border border-green-200 shadow-sm flex flex-col">
                     <span className="text-[10px] font-bold text-green-600 uppercase tracking-wide mb-1">Shopify Fee</span>
                     <div className="flex items-center">
                         <input 
                            type="number"
                            step="0.1"
                            className="w-full text-lg font-bold text-gray-900 outline-none border-b border-gray-200 focus:border-green-500 bg-transparent transition-colors"
                            value={localRates.shopify}
                            onChange={(e) => setLocalRates({...localRates, shopify: parseFloat(e.target.value) || 0})}
                         />
                         <span className="text-sm font-bold text-gray-400">%</span>
                     </div>
                 </div>
             </div>
             
             {/* Note: Offsite Ads & Coupon Code rates are now project-specific and managed via the Marketplace Tools on the dashboard */}
          </div>

          <hr className="border-gray-200" />

          {/* Section: Purities */}
          <div>
             <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Scale size={16} className="text-gold-500" />
                Gold Purity Standards (Base 1.0)
             </h4>
             <div className="space-y-3">
                {KARATS.map(karat => (
                    <div key={karat} className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                {karat}
                            </div>
                            <span className="text-xs font-bold text-gray-500 uppercase">Factor</span>
                        </div>
                        
                        <div className="relative w-24">
                            <input 
                                type="number"
                                step="0.0001"
                                className="w-full text-right font-mono font-bold text-gray-900 bg-transparent border-0 border-b-2 border-gray-100 focus:border-blue-500 focus:ring-0 px-1 py-0.5 transition-colors"
                                value={localPurities[karat]}
                                onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    setLocalPurities(prev => ({ ...prev, [karat]: isNaN(val) ? 0 : val }));
                                }}
                            />
                        </div>
                    </div>
                ))}
             </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex gap-3">
             <div className="text-blue-500 mt-0.5"><ShieldCheck size={18} /></div>
             <p className="text-xs text-blue-800 leading-relaxed">
                Changes here will define the default values for <strong>new projects</strong> only. Existing projects retain their historical settings.
             </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-white flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-gray-600 font-medium hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-black font-bold shadow-lg shadow-gray-200 transition-all transform active:scale-95"
          >
            <Save size={18} /> Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
