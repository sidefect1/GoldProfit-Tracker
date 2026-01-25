
import React, { useState, useEffect } from 'react';
import { KaratEnum } from '../types';
import { X, Lock, Info, Save } from 'lucide-react';
import { KARATS } from '../constants';

interface PurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  purities: Record<KaratEnum, number>;
  onSave?: (newPurities: Record<KaratEnum, number>) => void;
  readOnly?: boolean;
}

// Input that handles commas as dots for decimals
const SmartNumberInput = ({ 
  value, 
  onChange, 
  disabled = false
}: { 
  value: number; 
  onChange: (val: number) => void; 
  disabled?: boolean;
}) => {
  const [localStr, setLocalStr] = useState<string>(value.toString());

  // Sync when prop changes externally
  useEffect(() => {
    if (parseFloat(localStr.replace(',', '.')) !== value) {
      setLocalStr(value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalStr(raw);
    const normalized = raw.replace(',', '.');
    // Allow empty string for better typing experience, default to 0 on parse if needed or handle upstream
    const parsed = parseFloat(normalized);
    if (!isNaN(parsed)) {
       onChange(parsed);
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      disabled={disabled}
      className={`w-full border rounded-md shadow-sm px-3 py-2 text-right font-mono transition-colors ${
        disabled 
        ? 'bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed' 
        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900'
      }`}
      value={localStr}
      onChange={handleChange}
    />
  );
};

export const PurityModal: React.FC<PurityModalProps> = ({ isOpen, onClose, purities, onSave, readOnly = false }) => {
  const [localPurities, setLocalPurities] = useState<Record<KaratEnum, number>>(purities);

  useEffect(() => {
    if (isOpen) {
      setLocalPurities(purities);
    }
  }, [purities, isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (karat: KaratEnum, val: number) => {
    setLocalPurities(prev => ({ ...prev, [karat]: val }));
  };

  const handleSave = () => {
    if (onSave) {
      onSave(localPurities);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            {readOnly ? <Lock size={18} className="text-gray-400" /> : null}
            Gold Purity Settings
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full text-gray-500">
            <X size={24} />
          </button>
        </div>
        
        {readOnly ? (
            <div className="p-4 bg-gray-50 text-gray-600 text-xs leading-relaxed border-b border-gray-100 flex gap-2">
               <Info size={16} className="shrink-0 text-blue-500" />
               These are the fixed purity standards for this project. To change standards, create a new project with updated global settings.
            </div>
        ) : (
            <div className="p-4 bg-yellow-50 text-yellow-800 text-xs leading-relaxed border-b border-yellow-100">
                Adjust the gold content factor used for cost calculation. Changes affect all calculations immediately.
            </div>
        )}

        <div className="p-6 space-y-4">
          {KARATS.map(karat => (
            <div key={karat} className="flex items-center justify-between group">
              <label className="font-bold text-gray-700 w-12">{karat}</label>
              <div className="flex-1 ml-4 relative">
                 <SmartNumberInput
                    value={localPurities[karat]}
                    onChange={(val) => handleUpdate(karat, val)}
                    disabled={readOnly}
                 />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          {!readOnly && (
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-bold shadow-sm transition-colors"
            >
                <Save size={16} /> Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
