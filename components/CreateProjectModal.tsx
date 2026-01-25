
import React, { useState } from 'react';
import { X, Plus, FolderPlus } from 'lucide-react';
import { ProjectSettings } from '../types';
import { DEFAULT_PROJECT } from '../constants';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (project: ProjectSettings) => void;
  defaultPurities: any;
  existingProjects: ProjectSettings[];
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose, onCreate, defaultPurities, existingProjects }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset on open
  React.useEffect(() => {
      if (isOpen) {
          setName('');
          setError(null);
      }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
      if (!name.trim()) {
          setError('Project name is required.');
          return;
      }

      // Check duplicate (Loose check since marketplace isn't selected yet)
      const exists = existingProjects.some(p => p.name.toLowerCase() === name.trim().toLowerCase());
      if (exists) {
          // Warning but allow proceed as they might choose diff marketplace in wizard
      }

      const newProject: ProjectSettings = {
          ...DEFAULT_PROJECT,
          id: crypto.randomUUID(),
          name: name.trim(),
          productType: 'RING', // Default, will be set in Wizard
          marketplace: 'etsy', // Default, will be set in Wizard
          createdAt: Date.now(),
          lastModified: Date.now(),
          purities: defaultPurities,
          isSetupComplete: false, // Critical: Triggers Wizard on open
          widths: [], 
          sizes: [],
          activeKarats: ['10K', '14K', '18K'],
          anchors: { '10K': {}, '14K': {}, '18K': {}, '22K': {} },
      };

      onCreate(newProject);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FolderPlus size={20} className="text-blue-600" />
              New Project
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
            <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Project Name</label>
                <input 
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium transition-all"
                    placeholder="e.g. Wedding Bands Collection"
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value);
                        setError(null);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    autoFocus
                />
            </div>

            {error && (
                <div className="text-red-500 text-xs font-bold px-1">{error}</div>
            )}
        </div>

        <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-gray-500 font-bold hover:text-gray-900 transition-colors text-sm">
                Cancel
            </button>
            <button 
                onClick={handleSubmit}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center gap-2 text-sm"
            >
                Start Setup <Plus size={16} />
            </button>
        </div>
      </div>
    </div>
  );
};
