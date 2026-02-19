
import React, { useState, useEffect } from 'react';
import { ProjectList } from './components/ProjectList';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { EditProjectModal } from './components/EditProjectModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { ImportReviewModal, ImportResolution } from './components/ImportReviewModal';
import { StoreModal } from './components/StoreModal';
import { DeleteStoreModal } from './components/DeleteStoreModal';
import { Login } from './components/Login';
import { ProjectSettings, KaratEnum, MarketplaceRates, Store } from './types';
import { DEFAULT_PURITIES, DEFAULT_MARKETPLACE_RATES, DEFAULT_PROJECT } from './constants';
import { migrateProject } from './utils/migrations';
import { api } from './utils/api';
import { supabase } from './utils/supabaseClient';
import { Cloud, CloudOff, CheckCircle } from 'lucide-react';
import { Session } from '@supabase/supabase-js';

const ACTIVE_STORE_ID_KEY = 'gold-profit-active-store-id';
const STORES_KEY = 'gold-profit-stores';
const PROJECTS_KEY = 'gold-profit-projects-v2';
const GLOBAL_SETTINGS_KEY = 'gold-profit-global-settings';
const GLOBAL_RATES_KEY = 'gold-profit-global-rates';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Data State
  const [projects, setProjects] = useState<ProjectSettings[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handle Auth Session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load Data on Session
  useEffect(() => {
    const initData = async () => {
      if (!session) return;
      setIsLoading(true);

      // 1. Check Backend
      const online = await api.checkStatus();
      setIsBackendConnected(online);

      // 2. Load Data from Supabase
      const loadedStores = await api.getStores();
      const loadedProjects = await api.getProjects();
      const migratedProjects = loadedProjects.map(migrateProject);

      setStores(loadedStores);
      setProjects(migratedProjects);

      // 3. Restore Active Store
      const savedActiveId = localStorage.getItem(ACTIVE_STORE_ID_KEY);
      if (savedActiveId && loadedStores.find(s => s.id === savedActiveId)) {
          setActiveStoreId(savedActiveId);
      } else if (loadedStores.length > 0) {
          setActiveStoreId(loadedStores[0].id);
      }

      setIsLoading(false);
    };

    if (session) {
      initData();
    }
  }, [session]);

  // Persist Active Store ID
  useEffect(() => {
    if (activeStoreId) {
      localStorage.setItem(ACTIVE_STORE_ID_KEY, activeStoreId);
    } else {
      localStorage.removeItem(ACTIVE_STORE_ID_KEY);
    }
  }, [activeStoreId]);

  const activeStore = stores.find(s => s.id === activeStoreId);
  
  // Derived Global Settings from Active Store (Fallback to Constants)
  const storePurities = activeStore?.purities ?? DEFAULT_PURITIES;
  const storeRates = activeStore?.marketplaceRates ?? DEFAULT_MARKETPLACE_RATES;
  const storeCoupon = activeStore?.defaultCouponPercent ?? 30;
  const storeOffsite = activeStore?.defaultOffsiteAdsPercent ?? 15;

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  const [importData, setImportData] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<ProjectSettings | null>(null);
  const [storeToDelete, setStoreToDelete] = useState<Store | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (toast) {
        const timer = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(timer);
    }
  }, [toast]);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const displayProjects = projects.filter(p => p.storeId === activeStoreId);

  // --- CRUD HANDLERS (Single Item Updates) ---

  const handleUpdateProject = async (updated: ProjectSettings) => {
    const withTime = { ...updated, lastModified: Date.now() };
    
    // Optimistic Update
    setProjects(prev => prev.map(p => p.id === updated.id ? withTime : p));
    
    // Single Item Save
    if (session) {
        await api.saveProject(withTime, session);
    }
  };

  const handleCreateNewProject = async () => {
    if (!activeStoreId || !session) return; 

    const newProject: ProjectSettings = {
        ...DEFAULT_PROJECT,
        id: crypto.randomUUID(),
        storeId: activeStoreId,
        name: "", 
        productType: 'RING', 
        marketplace: 'etsy',
        createdAt: Date.now(),
        lastModified: Date.now(),
        purities: storePurities, // Inherit from Store Defaults
        couponDiscountPercent: storeCoupon,
        offsiteAdsPercent: storeOffsite,
        isSetupComplete: false, 
        widths: [], 
        sizes: [],
        activeKarats: ['10K', '14K', '18K'],
        anchors: { '10K': {}, '14K': {}, '18K': {}, '22K': {} },
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);

    // Save New Project
    await api.saveProject(newProject, session);
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
      
      // Explicit Delete
      await api.deleteProject(id);
    }
  };

  const handleDuplicateProject = async (id: string) => {
    const original = projects.find(p => p.id === id);
    if (original && session) {
      const copy: ProjectSettings = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (Copy)`,
        lastModified: Date.now(),
        createdAt: Date.now(),
        priceBooks: [], 
        isArchived: false,
        activePriceBookId: undefined,
        storeId: activeStoreId || original.storeId 
      };
      setProjects(prev => [copy, ...prev]);
      await api.saveProject(copy, session);
    }
  };

  // --- STORE HANDLERS ---

  const handleCreateStore = async (name: string) => {
      if (!session) return;
      const newStore: Store = {
          id: crypto.randomUUID(),
          name,
          goldPrice24k: 85.00, 
          createdAt: Date.now(),
          updatedAt: Date.now(),
          // Initialize defaults
          purities: DEFAULT_PURITIES,
          marketplaceRates: DEFAULT_MARKETPLACE_RATES,
          defaultCouponPercent: 30,
          defaultOffsiteAdsPercent: 15
      };
      setStores(prev => [...prev, newStore]);
      setActiveStoreId(newStore.id);
      await api.saveStore(newStore, session);
  };

  const handleUpdateStoreGold = async (val: number) => {
      if (!activeStoreId || !session) return;
      
      let updatedStore: Store | null = null;
      setStores(prev => prev.map(s => {
          if (s.id === activeStoreId) {
             updatedStore = { ...s, goldPrice24k: val, updatedAt: Date.now() };
             return updatedStore;
          }
          return s;
      }));

      if (updatedStore) {
          await api.saveStore(updatedStore, session);
      }
  };

  const handleSaveGlobalSettings = async (
      newPurities: Record<KaratEnum, number>,
      newRates: MarketplaceRates,
      newCoupon: number,
      newOffsite: number
  ) => {
      if (!activeStore || !session) return;

      const updatedStore: Store = {
          ...activeStore,
          purities: newPurities,
          marketplaceRates: newRates,
          defaultCouponPercent: newCoupon,
          defaultOffsiteAdsPercent: newOffsite,
          updatedAt: Date.now()
      };

      setStores(prev => prev.map(s => s.id === updatedStore.id ? updatedStore : s));
      await api.saveStore(updatedStore, session);
      setToast({ message: `Global settings saved for ${activeStore.name}`, type: 'success' });
  };

  const handleConfirmDeleteStore = async (storeId: string) => {
      const storeName = stores.find(s => s.id === storeId)?.name || 'Store';
      const affectedProjectsCount = projects.filter(p => p.storeId === storeId).length;

      // Snapshots for Rollback
      const snapshotStores = [...stores];
      const snapshotProjects = [...projects];
      const snapshotActiveStoreId = activeStoreId;
      const snapshotActiveProjectId = activeProjectId;
      const shouldCloseWorkspace = activeProjectId && projects.find(p => p.id === activeProjectId)?.storeId === storeId;

      try {
          // Optimistic UI Updates
          setStores(prev => {
              const next = prev.filter(s => s.id !== storeId);
              if (activeStoreId === storeId) {
                  setActiveStoreId(next.length > 0 ? next[0].id : null);
              }
              return next;
          });
          setProjects(prev => prev.filter(p => p.storeId !== storeId));

          if (shouldCloseWorkspace) {
              setActiveProjectId(null);
          }

          // API Delete
          await api.deleteStore(storeId);

          setToast({ 
              message: `Deleted "${storeName}" and ${affectedProjectsCount} projects.`, 
              type: 'success' 
          });
          setStoreToDelete(null);

      } catch (error) {
          console.error("Store deletion failed, rolling back.", error);
          // Rollback
          setStores(snapshotStores);
          setProjects(snapshotProjects);
          setActiveStoreId(snapshotActiveStoreId);
          setActiveProjectId(snapshotActiveProjectId);
          throw error; 
      }
  };

  // --- OTHERS ---

  const handleRenameProject = async (id: string, newName: string) => {
    let updated: ProjectSettings | null = null;
    setProjects(prev => prev.map(p => {
        if (p.id === id) {
            updated = { ...p, name: newName, lastModified: Date.now() };
            return updated;
        }
        return p;
    }));

    if (updated && session) await api.saveProject(updated, session);
  };

  const handleArchiveProject = async (id: string, archive: boolean) => {
     let updated: ProjectSettings | null = null;
     setProjects(prev => prev.map(p => {
         if (p.id === id) {
             updated = { ...p, isArchived: archive };
             return updated;
         }
         return p;
     }));

     if (updated && session) await api.saveProject(updated, session);
  };

  const handleBatchUpdateProjects = async (ids: string[], updates: Partial<ProjectSettings>) => {
      const now = Date.now();
      const projectsToSave: ProjectSettings[] = [];
      
      setProjects(prev => prev.map(p => {
          if (ids.includes(p.id)) {
              const u = { ...p, ...updates, lastModified: now };
              projectsToSave.push(u);
              return u;
          }
          return p;
      }));

      // Save each modified project
      if (session) {
          for (const p of projectsToSave) {
              await api.saveProject(p, session);
          }
      }
  };

  const handleFinalizeImport = async (candidates: { project: ProjectSettings, resolution: ImportResolution }[]) => {
      if (!session) return;
      
      const toAdd: ProjectSettings[] = [];
      
      // Process Candidates
      for (const c of candidates) {
          if (c.resolution === 'SKIP') continue;
          
          let p = migrateProject(c.project);
          
          if (!p.storeId && activeStoreId) p.storeId = activeStoreId;
          
          if (c.resolution === 'DUPLICATE') {
              p.id = crypto.randomUUID();
              p.name = `${p.name} (Imported)`;
              p.createdAt = Date.now();
          }

          p.lastModified = Date.now();
          toAdd.push(p);
          
          // Save individually
          await api.saveProject(p, session);
      }

      setProjects(prev => {
          const newIds = new Set(toAdd.map(x => x.id));
          const filtered = prev.filter(x => !newIds.has(x.id));
          return [...toAdd, ...filtered];
      });

      alert(`Imported ${toAdd.length} projects.`);
  };

  const handleEditSave = async (updated: ProjectSettings) => {
      setEditingProject(null);
      await handleUpdateProject(updated);
  };

  // FULL LOGOUT & RESET
  const handleLogout = async () => {
      // 1. Sign out of Supabase
      await supabase.auth.signOut();
      
      // 2. Clear Local Cache completely
      localStorage.removeItem(GLOBAL_SETTINGS_KEY);
      localStorage.removeItem(GLOBAL_RATES_KEY);
      localStorage.removeItem(ACTIVE_STORE_ID_KEY);
      localStorage.removeItem(STORES_KEY);
      localStorage.removeItem(PROJECTS_KEY);
      
      // 3. Reset State
      setSession(null);
      setStores([]);
      setProjects([]);
      setActiveStoreId(null);
      
      // 4. Force Reload to ensure clean slate
      window.location.reload();
  };

  const ConnectionStatus = () => (
      <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-colors ${isBackendConnected ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-navy-800 dark:text-slate-400'}`}>
          {isBackendConnected ? <Cloud size={14} /> : <CloudOff size={14} />}
          {isBackendConnected ? 'Cloud Sync Active' : 'Offline Mode'}
      </div>
  );

  // --- RENDER CONTENT ---
  const renderContent = () => {
    if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div></div>;

    if (!session) {
      return <Login />;
    }

    if (!isLoading && !activeStoreId) {
        return (
            <StoreModal 
                stores={stores} 
                isOpen={true} 
                onSelect={setActiveStoreId} 
                onCreate={handleCreateStore}
            />
        );
    }

    if (activeProject) {
      return (
        <ProjectWorkspace 
            project={activeProject} 
            onUpdate={handleUpdateProject} 
            onBack={() => setActiveProjectId(null)}
            globalGoldPrice={activeStore?.goldPrice24k || 85}
            marketplaceRates={storeRates}
            // Pass derived global settings to Workspace
            storePurities={storePurities}
            storeCoupon={storeCoupon}
            storeOffsite={storeOffsite}
        />
      );
    }

    return (
      <ProjectList 
        projects={displayProjects}
        stores={stores}
        activeStoreId={activeStoreId}
        onSelectStore={setActiveStoreId}
        onCreateStore={() => setActiveStoreId(null)}
        onDeleteStore={(id) => setStoreToDelete(stores.find(s => s.id === id) || null)}
        onOpen={setActiveProjectId} 
        onDelete={handleDeleteProject}
        onDuplicate={handleDuplicateProject}
        onEdit={setEditingProject}
        onRename={handleRenameProject}
        onArchive={handleArchiveProject}
        onNew={handleCreateNewProject}
        onGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        onImport={(str) => {
             try { setImportData(JSON.parse(str)); } catch(e) { alert("Invalid JSON"); }
        }}
        globalGoldPrice={activeStore?.goldPrice24k || 85}
        onUpdateGlobalGold={handleUpdateStoreGold}
        onBatchUpdate={handleBatchUpdateProjects}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 dark:bg-navy-950 dark:text-slate-100 transition-colors duration-300">
      
      {renderContent()}

      {/* Modals & Overlays */}
      {session && (
        <>
          <EditProjectModal 
            isOpen={!!editingProject}
            onClose={() => setEditingProject(null)}
            project={editingProject}
            onUpdate={handleEditSave}
          />

          <GlobalSettingsModal 
            isOpen={isGlobalSettingsOpen}
            onClose={() => setIsGlobalSettingsOpen(false)}
            storeName={activeStore?.name}
            purities={storePurities}
            marketplaceRates={storeRates}
            defaultCoupon={storeCoupon}
            defaultOffsite={storeOffsite}
            onSave={handleSaveGlobalSettings}
          />

          <ImportReviewModal 
            isOpen={!!importData}
            onClose={() => setImportData(null)}
            importData={importData}
            existingProjects={projects}
            onConfirm={handleFinalizeImport}
          />

          <DeleteStoreModal 
            isOpen={!!storeToDelete}
            store={storeToDelete}
            onClose={() => setStoreToDelete(null)}
            onConfirm={handleConfirmDeleteStore}
          />

          {toast && (
              <div className={`fixed bottom-16 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 text-xs font-bold animate-in slide-in-from-bottom-5 fade-in ${toast.type === 'success' ? 'bg-gray-900 text-white dark:bg-gold-600' : 'bg-red-600 text-white'}`}>
                  <CheckCircle size={14} />
                  {toast.message}
              </div>
          )}

          <ConnectionStatus />
        </>
      )}
    </div>
  );
}
