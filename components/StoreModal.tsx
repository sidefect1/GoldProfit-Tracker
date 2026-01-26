
import React, { useState, useEffect } from 'react';
import { Store } from '../types';
import { Store as StoreIcon, Plus, Check } from 'lucide-react';

interface StoreModalProps {
  stores: Store[];
  isOpen: boolean;
  onSelect: (storeId: string) => void;
  onCreate: (name: string) => void;
}

export const StoreModal: React.FC<StoreModalProps> = ({ stores, isOpen, onSelect, onCreate }) => {
  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [newStoreName, setNewStoreName] = useState('');

  // If no stores, force create mode
  useEffect(() => {
    if (stores.length === 0) {
        setMode('create');
    } else {
        setMode('select');
    }
  }, [stores.length, isOpen]);

  if (!isOpen) return null;

  const handleCreate = () => {
      if (newStoreName.trim()) {
          onCreate(newStoreName.trim());
          setNewStoreName('');
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-transparent dark:border-white/10">
        
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-navy-950 dark:to-navy-900 p-8 text-center">
            <h1 className="text-2xl font-black text-white tracking-widest mb-6 opacity-90">WELCOME</h1>
            
            <div className="mx-auto w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4 text-gold-400">
                <StoreIcon size={32} />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
                {mode === 'create' ? 'Setup Your Store' : 'Select Store'}
            </h2>
            <p className="text-gray-400 text-xs mt-2">
                {mode === 'create' ? 'Create a store profile to manage your pricing.' : 'Choose a store to manage.'}
            </p>
        </div>

        <div className="p-8">
            {mode === 'select' ? (
                <div className="space-y-3">
                    {stores.map(store => (
                        <button
                            key={store.id}
                            onClick={() => onSelect(store.id)}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-white/10 hover:border-blue-500 dark:hover:border-gold-500 hover:bg-blue-50 dark:hover:bg-navy-800 hover:shadow-md transition-all group text-left"
                        >
                            <div>
                                <div className="font-bold text-gray-800 dark:text-white group-hover:text-blue-700 dark:group-hover:text-gold-400">{store.name}</div>
                                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Gold: ${store.goldPrice24k}/g</div>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-white dark:bg-navy-950 border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-300 dark:text-slate-600 group-hover:border-blue-200 dark:group-hover:border-gold-500/30 group-hover:text-blue-500 dark:group-hover:text-gold-500">
                                <Check size={16} />
                            </div>
                        </button>
                    ))}
                    
                    <button 
                        onClick={() => setMode('create')}
                        className="w-full py-3 mt-4 text-xs font-bold text-gray-500 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200 flex items-center justify-center gap-1 transition-colors"
                    >
                        <Plus size={14} /> Create New Store
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Store Name</label>
                        <input 
                            className="w-full border border-gray-300 dark:border-white/20 rounded-xl px-4 py-4 text-base font-bold bg-white dark:bg-navy-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-gold-500 focus:border-gold-500 outline-none transition-all shadow-sm placeholder:text-gray-300 dark:placeholder:text-slate-600"
                            placeholder="e.g. Downtown Jewelry"
                            value={newStoreName}
                            onChange={(e) => setNewStoreName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                            autoFocus
                        />
                    </div>
                    <div className="flex gap-3">
                        {stores.length > 0 && (
                            <button 
                                onClick={() => setMode('select')}
                                className="px-5 py-3 rounded-xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-slate-300 font-bold text-xs hover:bg-gray-50 dark:hover:bg-navy-800 transition-colors"
                            >
                                Back
                            </button>
                        )}
                        <button 
                            onClick={handleCreate}
                            disabled={!newStoreName.trim()}
                            className="flex-1 bg-gold-500 text-white rounded-xl py-3 font-bold text-sm shadow-lg shadow-gold-200 dark:shadow-none hover:bg-gold-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Create Store
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
