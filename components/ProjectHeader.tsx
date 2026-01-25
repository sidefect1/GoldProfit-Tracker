
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
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-30">
            <div className="flex items-center gap-4">
                <button 
                  onClick={onBack}
                  className="p-2 -ml-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                >
                   <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-gold-500 rounded-lg flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-xl">GP</span>
                </div>
                <div>
                    <h1 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Project</h1>
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                            <input 
                                className="border border-gray-300 rounded px-2 py-0.5 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-gold-500 outline-none bg-white"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                            <button onClick={handleSave} className="text-green-600 hover:text-green-700">
                                <Check size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                            <span className="text-xl font-bold text-gray-800">{settings.name}</span>
                            <Edit2 size={14} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                        </div>
                    )}
                </div>

                {/* Marketplace Badge */}
                <div className="h-8 w-px bg-gray-200 mx-2"></div>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${
                    isShopify 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-orange-50 text-orange-700 border-orange-100'
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
            
            <div className="text-sm text-gray-400">
                Auto-saved
            </div>
        </header>
    );
};
