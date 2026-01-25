
import React, { useState } from 'react';
import { Store } from '../types';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteStoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (storeId: string) => Promise<void>;
  store: Store | null;
}

export function DeleteStoreModal({ isOpen, onClose, onConfirm, store }: DeleteStoreModalProps) {
  const [inputValue, setInputValue] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !store) return null;

  // Helper for Turkish-aware normalization
  const normalize = (str: string) => str.trim().toLocaleLowerCase('tr-TR');
  
  const isMatch = normalize(inputValue) === normalize(store.name);

  const handleConfirm = async () => {
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    try {
      await onConfirm(store.id);
      setInputValue(''); // Reset on success
      setIsDeleting(false);
      onClose();
    } catch (error) {
      console.error("Deletion error:", error);
      alert("Failed to delete store. Please try again.");
      setIsDeleting(false);
      // Do not close modal on error to allow retry
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-red-50 p-4 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-700 font-bold">
            <AlertTriangle size={20} />
            <span>Confirm Store Deletion</span>
          </div>
          <button 
            onClick={onClose} 
            disabled={isDeleting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-4 text-sm leading-relaxed">
            You are about to delete <strong className="text-gray-900 font-bold">"{store.name}"</strong> and all projects within it. This action cannot be undone.
          </p>
          
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Type the store name to confirm:
          </label>
          <input
            type="text"
            className="w-full p-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition-colors mb-6 text-sm font-bold text-gray-900 placeholder:text-gray-300 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            placeholder={store.name}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isDeleting}
            autoFocus
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isMatch || isDeleting}
              className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all text-sm shadow-sm flex items-center justify-center gap-2 ${
                isMatch 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200' 
                : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {isDeleting ? (
                <>
                   <Loader2 size={16} className="animate-spin" /> Siliniyor...
                </>
              ) : (
                'Delete Store'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
