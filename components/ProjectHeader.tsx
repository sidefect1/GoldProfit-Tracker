
import React, { useState } from 'react';
import { ProjectSettings, MarketplaceRates } from '../types';
import { Edit2, Check, ArrowLeft } from 'lucide-react';

interface ProjectHeaderProps {
    settings: ProjectSettings;
    updateSettings: (s: ProjectSettings) => void;
    onBack: () => void;
    marketplaceRates: MarketplaceRates;
}

export const ProjectHeader: React.FC<ProjectHeaderProps> = ({ settings, updateSettings, onBack, marketplaceRates }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(settings.name);

    const handleSave = () => {
        updateSettings({...settings, name });
        setIsEditing(false);
    };

    const isShopify = settings.marketplace === 'shopify';
    const fee = isShopify ? marketplaceRates.shopify : marketplaceRates.etsy;

    return (
        <header className="bg-white dark:bg-navy-900 border-b border-gray-200 dark:border-white/10 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30 transition-colors duration-300">
            <div className="flex items-center gap-4">
                <button 
                  onClick={onBack}
                  className="p-2 -ml-2 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-navy-800 rounded-full transition-colors"
                >
                   <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xl">GP</span>
                </div>
                <div>
                    <h1 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Project</h1>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input 
                                className="border border-gray-300 dark:border-white/20 rounded px-2 py-0.5 text-lg font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-gold-500 outline-none bg-white dark:bg-navy-950"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={handleSave} className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                                <Check size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                            <span className="text-xl font-bold text-gray-800 dark:text-white">{settings.name}</span>
                            <Edit2 size={14} className="text-gray-400 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-gold-400 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                    )}
                </div>

                {/* Marketplace Badge */}
                <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-2"></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                    isShopify 
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800' 
                    : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800'
                }`}>
                    <div className={`w-4 h-4 rounded flex items-center justify-center text-[9px] text-white font-black ${
                        isShopify ? 'bg-emerald-600' : 'bg-orange-600'
                    }`}>
                        {isShopify ? 'S' : 'E'}
                    </div>
                    <span>{isShopify ? 'Shopify' : 'Etsy'}</span>
                    <span className="opacity-60 text-[10px] ml-1 normal-case border-l border-current pl-2">{fee}% Fee</span>
                </div>
            </div>
            
            <div className="text-sm text-gray-400 dark:text-slate-500">
                Auto-saved
            </div>
        </header>
    );
};
