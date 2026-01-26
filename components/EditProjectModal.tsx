
import React, { useState, useEffect } from 'react';
import { X, Save, Plus } from 'lucide-react';
import { ProjectSettings, KaratEnum } from '../types';
import { KARATS, PRODUCT_CONFIGS, generateDefaultAnchors, AVAILABLE_NECKLACE_LENGTHS, AVAILABLE_BRACELET_LENGTHS } from '../constants';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectSettings | null;
  onUpdate: (updatedProject: ProjectSettings) => void;
}

const AVAILABLE_RING_WIDTHS = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 9, 10, 11, 12];

export const EditProjectModal: React.FC<EditProjectModalProps> = ({ isOpen, onClose, project, onUpdate }) => {
  const [name, setName] = useState('');
  const [selectedKarats, setSelectedKarats] = useState<KaratEnum[]>([]);
  const [selectedWidths, setSelectedWidths] = useState<number[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<number[]>([]);
  const [customWidthInput, setCustomWidthInput] = useState('');

  useEffect(() => {
    if (project) {
        setName(project.name);
        setSelectedKarats(project.activeKarats || []);
        setSelectedWidths(project.widths || []);
        setSelectedSizes(project.sizes || []);
    }
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const productType = project.productType;

  const toggleKarat = (k: KaratEnum) => {
    setSelectedKarats(prev => 
      prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
    );
  };

  const toggleWidth = (w: number) => {
    setSelectedWidths(prev => 
      prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w].sort((a,b) => a-b)
    );
  };

  const toggleSize = (s: number) => {
      setSelectedSizes(prev => 
        prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s].sort((a,b) => a-b)
      );
  };

  const addCustomWidth = () => {
    const val = parseFloat(customWidthInput.replace(',', '.'));
    if (!isNaN(val) && val > 0 && !selectedWidths.includes(val)) {
        setSelectedWidths(prev => [...prev, val].sort((a,b) => a-b));
        setCustomWidthInput('');
    }
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    if (selectedKarats.length === 0) return;
    if (selectedWidths.length === 0) return;
    // Don't strictly validate empty sizes for Ring/Earring here as they might use defaults if array is empty,
    // but better safe for Necklace/Bracelet
    if ((productType === 'NECKLACE' || productType === 'BRACELET') && selectedSizes.length === 0) return;


    // We need to merge existing anchors with potentially new ones if new widths/karats were added
    // If a width was removed, we don't strictly need to delete the anchor data, 
    // but we should ensure new widths have defaults generated.
    
    const updatedAnchors = { ...project.anchors };
    
    // Check for missing karats in anchor object
    KARATS.forEach(k => {
        if (!updatedAnchors[k]) {
            updatedAnchors[k] = {};
        }
    });

    // Ensure all selected widths have anchors for all selected karats
    selectedKarats.forEach(k => {
        selectedWidths.forEach(w => {
            if (!updatedAnchors[k][w]) {
                // Generate default for this specific width/karat combo
                const defaults = generateDefaultAnchors([w], productType);
                updatedAnchors[k][w] = defaults[w];
            }
        });
    });

    const updatedProject: ProjectSettings = {
      ...project,
      name,
      activeKarats: selectedKarats,
      widths: selectedWidths,
      sizes: selectedSizes,
      anchors: updatedAnchors,
      lastModified: Date.now()
    };

    onUpdate(updatedProject);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-navy-900 rounded-lg shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] border border-gray-100 dark:border-white/10">
        <div className="flex justify-between items-center p-5 border-b border-gray-100 dark:border-white/10">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Edit Project</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-navy-800 rounded-full text-gray-500 dark:text-slate-400">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Project Name</label>
            <input 
              className="w-full border border-gray-300 dark:border-white/20 rounded px-3 py-2 focus:ring-2 focus:ring-gold-500 outline-none bg-white dark:bg-navy-950 text-gray-900 dark:text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Product Type (Read Only) */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-1">Product Type</label>
            <div className="bg-gray-100 dark:bg-navy-800 text-gray-500 dark:text-slate-400 px-3 py-2 rounded text-sm font-medium border border-gray-200 dark:border-white/5">
               {PRODUCT_CONFIGS[productType].label} (Cannot be changed)
            </div>
          </div>

          {/* Karats */}
          <div>
             <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Active Karats</label>
             <div className="flex gap-2">
               {KARATS.map(k => (
                 <button
                    key={k}
                    onClick={() => toggleKarat(k)}
                    className={`px-4 py-2 rounded border transition-all text-sm font-medium ${
                      selectedKarats.includes(k) 
                      ? 'bg-white dark:bg-navy-800 text-blue-600 dark:text-gold-400 border-blue-600 dark:border-gold-500 ring-1 ring-blue-600 dark:ring-gold-500 shadow-sm' 
                      : 'bg-white dark:bg-navy-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                    }`}
                 >
                    {k}
                 </button>
               ))}
             </div>
          </div>

          {/* Lengths (Necklace/Bracelet Only) */}
          {(productType === 'NECKLACE' || productType === 'BRACELET') && (
              <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                      {PRODUCT_CONFIGS[productType].sizeLabel} Variations (Exact)
                  </label>
                  
                  {/* Fixed Option Grid - No Custom Inputs */}
                  <div className="flex flex-wrap gap-2">
                      {(productType === 'NECKLACE' ? AVAILABLE_NECKLACE_LENGTHS : AVAILABLE_BRACELET_LENGTHS).map(s => {
                          const isSel = selectedSizes.includes(s);
                          return (
                              <button
                                key={s}
                                onClick={() => toggleSize(s)}
                                className={`px-2 py-1 rounded border text-xs font-bold transition-all ${
                                    isSel
                                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white border-emerald-600 dark:border-emerald-700 shadow-sm' 
                                    : 'bg-white dark:bg-navy-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-navy-800 hover:border-gray-300'
                                }`}
                              >
                                  {s}"
                              </button>
                          );
                      })}
                  </div>
              </div>
          )}

          {/* Widths / Thicknesses */}
          {productType !== 'EARRING' && (
              <div>
                 <label className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">
                    {PRODUCT_CONFIGS[productType].widthLabel}
                 </label>
                 
                 {productType === 'RING' ? (
                     <div className="grid grid-cols-6 gap-2 mb-2">
                        {AVAILABLE_RING_WIDTHS.map(w => (
                            <button
                                key={w}
                                onClick={() => toggleWidth(w)}
                                className={`px-1 py-2 rounded border transition-all text-xs font-medium ${
                                selectedWidths.includes(w) 
                                ? 'bg-white dark:bg-navy-800 text-gold-600 dark:text-gold-400 border-gold-500 dark:border-gold-500 ring-1 ring-gold-500 dark:ring-gold-500 shadow-sm' 
                                : 'bg-white dark:bg-navy-900 text-gray-500 dark:text-slate-400 border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30'
                                }`}
                            >
                                {w}mm
                            </button>
                        ))}
                     </div>
                 ) : (
                    <div className="mb-2">
                         <div className="flex gap-2 mb-2">
                            <input 
                                type="number"
                                className="border border-gray-300 dark:border-white/20 rounded px-2 py-1 text-sm flex-1 bg-white dark:bg-navy-950 text-gray-900 dark:text-white"
                                placeholder="Add value (e.g. 1.5)"
                                value={customWidthInput}
                                onChange={e => setCustomWidthInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addCustomWidth()}
                            />
                            <button 
                                onClick={addCustomWidth}
                                className="bg-gray-100 dark:bg-navy-800 px-3 py-1 rounded text-sm hover:bg-gray-200 dark:hover:bg-navy-700 text-gray-700 dark:text-slate-300"
                            >
                                Add
                            </button>
                         </div>
                    </div>
                 )}

                 {/* Selected Tag List */}
                 {productType !== 'RING' && (
                     <div className="flex flex-wrap gap-2">
                        {selectedWidths.map(w => (
                            <span key={w} className="inline-flex items-center gap-1 bg-gold-50 dark:bg-gold-900/30 text-gold-700 dark:text-gold-300 px-2 py-1 rounded-full text-xs font-bold border border-gold-200 dark:border-gold-800">
                                {w}mm
                                <button onClick={() => toggleWidth(w)} className="hover:text-red-600 dark:hover:text-red-400"><X size={12} /></button>
                            </span>
                        ))}
                     </div>
                 )}
              </div>
          )}
        </div>

        <div className="p-5 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-navy-800 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-gray-600 dark:text-slate-400 font-medium hover:text-gray-900 dark:hover:text-white"
           >
             Cancel
           </button>
           <button 
             onClick={handleSubmit}
             disabled={!name.trim() || selectedKarats.length === 0 || (productType !== 'EARRING' && selectedWidths.length === 0)}
             className="flex items-center gap-2 px-6 py-2 bg-blue-600 dark:bg-gold-500 text-white rounded hover:bg-blue-700 dark:hover:bg-gold-600 font-bold shadow-sm"
           >
             <Save size={18} /> Save Changes
           </button>
        </div>
      </div>
    </div>
  );
};
