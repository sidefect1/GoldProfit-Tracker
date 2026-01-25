
import React, { useState, useEffect } from 'react';
import { ProjectSettings } from '../types';
import { X, AlertTriangle, FileJson, ArrowRight, Copy, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { formatDate } from '../utils/calculations';

export type ImportResolution = 'DUPLICATE' | 'REPLACE' | 'SKIP';

interface ImportCandidate {
  project: ProjectSettings;
  status: 'NEW' | 'CONFLICT';
  resolution: ImportResolution;
  validationError?: string;
}

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  importData: any;
  existingProjects: ProjectSettings[];
  onConfirm: (candidates: ImportCandidate[]) => void;
}

export const ImportReviewModal: React.FC<ImportReviewModalProps> = ({ isOpen, onClose, importData, existingProjects, onConfirm }) => {
  const [candidates, setCandidates] = useState<ImportCandidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !importData) return;

    // 1. Validation
    let rawProjects: any[] = [];
    
    // Support legacy array format or new Object format
    if (Array.isArray(importData)) {
       rawProjects = importData;
    } else if (importData.payloadType === 'gold-profit-export' && Array.isArray(importData.projects)) {
       rawProjects = importData.projects;
    } else {
       setError("Invalid file format. Expected a GoldProfit export file.");
       return;
    }

    if (rawProjects.length === 0) {
        setError("No projects found in this file.");
        return;
    }

    // 2. Process Candidates
    const processed: ImportCandidate[] = rawProjects.map((p: any) => {
        // Basic Validation
        if (!p.id || !p.name) {
            return {
                project: p,
                status: 'NEW', // Treat as new/broken
                resolution: 'SKIP',
                validationError: 'Missing ID or Name'
            } as ImportCandidate;
        }

        const existing = existingProjects.find(ex => ex.id === p.id);
        
        return {
            project: p,
            status: existing ? 'CONFLICT' : 'NEW',
            resolution: existing ? 'DUPLICATE' : 'DUPLICATE', // Default to Duplicate/Create New
        };
    });

    setCandidates(processed);
    setError(null);
  }, [importData, existingProjects, isOpen]);

  const handleResolutionChange = (index: number, res: ImportResolution) => {
     const next = [...candidates];
     next[index].resolution = res;
     setCandidates(next);
  };

  const handleConfirm = () => {
     onConfirm(candidates);
     onClose();
  };

  if (!isOpen) return null;

  const validCount = candidates.filter(c => !c.validationError).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
               <FileJson className="text-blue-600" /> Import Projects
            </h3>
            <p className="text-gray-500 text-sm mt-1">Review changes before importing.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
           
           {error ? (
               <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-800">
                   <AlertTriangle size={24} />
                   <span className="font-medium">{error}</span>
               </div>
           ) : (
               <div className="space-y-4">
                   {candidates.map((c, idx) => (
                       <div key={idx} className={`bg-white border rounded-xl p-4 shadow-sm transition-all ${c.status === 'CONFLICT' ? 'border-amber-200 ring-1 ring-amber-50' : 'border-gray-200'}`}>
                           
                           {/* Project Info */}
                           <div className="flex justify-between items-start mb-3">
                               <div>
                                   <div className="flex items-center gap-2">
                                       <h4 className="font-bold text-gray-800">{c.project.name || 'Unknown Project'}</h4>
                                       {c.validationError ? (
                                           <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">INVALID</span>
                                       ) : c.status === 'CONFLICT' ? (
                                           <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                               <ShieldAlert size={10} /> ID Conflict
                                           </span>
                                       ) : (
                                           <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">NEW</span>
                                       )}
                                   </div>
                                   <div className="text-xs text-gray-400 mt-1 flex gap-3">
                                       <span>Last Mod: {formatDate(c.project.lastModified)}</span>
                                       <span>{c.project.activeKarats?.length || 0} Karats</span>
                                   </div>
                               </div>
                           </div>

                           {/* Resolution Controls */}
                           {!c.validationError && (
                               <div className="bg-gray-50 rounded-lg p-2 flex flex-col sm:flex-row gap-2">
                                   
                                   {c.status === 'CONFLICT' ? (
                                       <>
                                        <button 
                                            onClick={() => handleResolutionChange(idx, 'DUPLICATE')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold border transition-all ${
                                                c.resolution === 'DUPLICATE' 
                                                ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                                            }`}
                                        >
                                            <Copy size={14} /> Duplicate (Safe)
                                        </button>
                                        <button 
                                            onClick={() => handleResolutionChange(idx, 'REPLACE')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-xs font-bold border transition-all ${
                                                c.resolution === 'REPLACE' 
                                                ? 'bg-red-600 text-white border-red-600 shadow-sm' 
                                                : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'
                                            }`}
                                        >
                                            <RefreshCw size={14} /> Replace (Overwrite)
                                        </button>
                                       </>
                                   ) : (
                                       <div className="w-full flex items-center gap-2 text-xs font-medium text-green-700 px-2">
                                           <CheckCircle size={14} /> Will be created as new project
                                       </div>
                                   )}
                               </div>
                           )}
                       </div>
                   ))}
               </div>
           )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t bg-white flex justify-between items-center">
            <div className="text-xs text-gray-500">
                Found <strong>{candidates.length}</strong> project(s).
            </div>
            <div className="flex gap-3">
                <button 
                    onClick={onClose}
                    className="px-5 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={!validCount || !!error}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95 transition-all"
                >
                    <ArrowRight size={18} /> Import {validCount > 0 ? `(${validCount})` : ''}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
