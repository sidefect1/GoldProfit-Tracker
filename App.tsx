import React, { useState, useEffect } from 'react';
import { ProjectList } from './components/ProjectList';
import { ProjectWorkspace } from './components/ProjectWorkspace';
import { EditProjectModal } from './components/EditProjectModal';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { ImportReviewModal, ImportResolution } from './components/ImportReviewModal';
import { StoreModal } from './components/StoreModal';
import { ProjectSettings, KaratEnum, MarketplaceRates, Store } from './types';
import { DEFAULT_PURITIES, DEFAULT_MARKETPLACE_RATES, DEFAULT_PROJECT } from './constants';
import { migrateProject } from './utils/migrations';
import { api } from './utils/api';
import { Cloud, CloudOff } from 'lucide-react';

const GLOBAL_SETTINGS_KEY = 'gold-profit-global-settings';
const GLOBAL_RATES_KEY = 'gold-profit-global-rates';
// New Keys
const STORES_KEY = 'gold-profit-stores';
const ACTIVE_STORE_ID_KEY = 'gold-profit-active-store-id';
const LEGACY_GOLD_KEY = 'gold-profit-global-gold-price'; // Retained for migration only

export default function App() {
  const [projects, setProjects] = useState<ProjectSettings[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Data (Stores, Projects, Migration)
  useEffect(() => {
    const initData = async () => {
      // 1. Check Backend
      const online = await api.checkStatus();
      setIsBackendConnected(online);

      // 2. Load Projects & Stores
      const loadedProjects = await api.getProjects();
      const migratedProjects = loadedProjects.map(migrateProject);
      
      const savedStores = localStorage.getItem(STORES_KEY);
      let loadedStores: Store[] = savedStores ? JSON.parse(savedStores) : [];

      // 3. LEGACY MIGRATION: If no stores exist, check for legacy data
      if (loadedStores.length === 0) {
          const legacyGold = localStorage.getItem(LEGACY_GOLD_KEY);
          // If we have projects or legacy gold, create a default store
          if (migratedProjects.length > 0 || legacyGold) {
              const defaultStore: Store = {
                  id: crypto.randomUUID(),
                  name: 'Default Store',
                  goldPrice24k: legacyGold ? parseFloat(legacyGold) : 85.00,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
              };
              loadedStores = [defaultStore];
              
              // Assign all legacy projects to default store
              migratedProjects.forEach(p => {
                  if (!p.storeId) p.storeId = defaultStore.id;
              });
          }
      }

      setStores(loadedStores);
      setProjects(migratedProjects);

      // Restore active store or default
      const savedActiveId = localStorage.getItem(ACTIVE_STORE_ID_KEY);
      if (savedActiveId && loadedStores.find(s => s.id === savedActiveId)) {
          setActiveStoreId(savedActiveId);
      } else if (loadedStores.length > 0) {
          setActiveStoreId(loadedStores[0].id);
      }

      setIsLoading(false);
    };

    initData();
  }, []);

  // Persist Stores
  useEffect(() => {
      if (!isLoading) {
          localStorage.setItem(STORES_KEY, JSON.stringify(stores));
      }
  }, [stores, isLoading]);

  // Persist Active Store Selection
  useEffect(() => {
      if (activeStoreId) {
          localStorage.setItem(ACTIVE_STORE_ID_KEY, activeStoreId);
      }
  }, [activeStoreId]);

  // Save Projects on Change
  useEffect(() => {
    if (!isLoading) {
      api.saveProjects(projects);
    }
  }, [projects, isLoading]);

  // Global Settings State: Purities
  const [globalPurities, setGlobalPurities] = useState<Record<KaratEnum, number>>(() => {
     const saved = localStorage.getItem(GLOBAL_SETTINGS_KEY);
     return saved ? JSON.parse(saved) : DEFAULT_PURITIES;
  });

  // Global Settings State: Marketplace Rates
  const [globalRates, setGlobalRates] = useState<MarketplaceRates>(() => {
    const saved = localStorage.getItem(GLOBAL_RATES_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_MARKETPLACE_RATES;
  });

  // Track the ID of the currently open project
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isGlobalSettingsOpen, setIsGlobalSettingsOpen] = useState(false);
  
  // Import Flow State
  const [importData, setImportData] = useState<any>(null);
  
  // State for editing an existing project (Variations/Name)
  const [editingProject, setEditingProject] = useState<ProjectSettings | null>(null);

  useEffect(() => {
    localStorage.setItem(GLOBAL_SETTINGS_KEY, JSON.stringify(globalPurities));
  }, [globalPurities]);

  useEffect(() => {
    localStorage.setItem(GLOBAL_RATES_KEY, JSON.stringify(globalRates));
  }, [globalRates]);

  // Derived: Current Active Project
  const activeProject = projects.find(p => p.id === activeProjectId);
  
  // Derived: Current Active Store
  const activeStore = stores.find(s => s.id === activeStoreId);

  // Derived: Filtered Projects for List
  const displayProjects = projects.filter(p => p.storeId === activeStoreId);

  const handleUpdateProject = (updated: ProjectSettings) => {
    const withTime = { ...updated, lastModified: Date.now() };
    setProjects(prev => prev.map(p => p.id === updated.id ? withTime : p));
  };

  const handleRenameProject = (id: string, newName: string) => {
    setProjects(prev => prev.map(p => 
        p.id === id ? { ...p, name: newName, lastModified: Date.now() } : p
    ));
  };

  const handleBatchUpdateProjects = (ids: string[], updates: Partial<ProjectSettings>) => {
      const now = Date.now();
      setProjects(prev => prev.map(p => {
          if (ids.includes(p.id)) {
              return { ...p, ...updates, lastModified: now };
          }
          return p;
      }));
  };

  const handleCreateNewProject = () => {
    if (!activeStoreId) return; // Should be blocked by UI, but safe guard

    const newProject: ProjectSettings = {
        ...DEFAULT_PROJECT,
        id: crypto.randomUUID(),
        storeId: activeStoreId, // Assign to active store
        name: "", // Intentionally empty so Wizard prompts for it
        productType: 'RING', // Default
        marketplace: 'etsy', // Default
        createdAt: Date.now(),
        lastModified: Date.now(),
        purities: globalPurities,
        isSetupComplete: false, // Critical: Triggers Wizard on open
        widths: [], 
        sizes: [],
        activeKarats: ['10K', '14K', '18K'],
        anchors: { '10K': {}, '14K': {}, '18K': {}, '22K': {} },
    };

    setProjects(prev => [newProject, ...prev]);
    setActiveProjectId(newProject.id);
  };

  const handleDeleteProject = (id: string) => {
    if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
      setProjects(prev => prev.filter(p => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    }
  };

  const handleArchiveProject = (id: string, archive: boolean) => {
     setProjects(prev => prev.map(p => p.id === id ? { ...p, isArchived: archive } : p));
  };

  const handleDuplicateProject = (id: string) => {
    const original = projects.find(p => p.id === id);
    if (original) {
      const copy: ProjectSettings = {
        ...original,
        id: crypto.randomUUID(),
        name: `${original.name} (Copy)`,
        lastModified: Date.now(),
        createdAt: Date.now(),
        priceBooks: [], // Reset price books on duplicate
        isArchived: false,
        activePriceBookId: undefined,
        storeId: activeStoreId || original.storeId // Duplicate into current store
      };
      setProjects(prev => [copy, ...prev]);
    }
  };

  // STORE MANAGEMENT
  const handleCreateStore = (name: string) => {
      const newStore: Store = {
          id: crypto.randomUUID(),
          name,
          goldPrice24k: 85.00, // Default start
          createdAt: Date.now(),
          updatedAt: Date.now()
      };
      setStores(prev => [...prev, newStore]);
      setActiveStoreId(newStore.id);
  };

  const handleUpdateStoreGold = (val: number) => {
      if (!activeStoreId) return;
      setStores(prev => prev.map(s => 
          s.id === activeStoreId ? { ...s, goldPrice24k: val, updatedAt: Date.now() } : s
      ));
  };

  // Triggered by ProjectList file input
  const handleImportFile = (jsonString: string) => {
      try {
          const json = JSON.parse(jsonString);
          setImportData(json);
      } catch (e) {
          alert("Failed to parse JSON file.");
      }
  };

  const handleFinalizeImport = (candidates: { project: ProjectSettings, resolution: ImportResolution }[]) => {
      const toAdd: ProjectSettings[] = [];
      const idsToRemove = new Set<string>();
      
      // Import Stores if available in payload
      if (importData && Array.isArray(importData.stores)) {
          const incomingStores = importData.stores as Store[];
          // Merge stores avoiding duplicates by ID
          setStores(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const newStores = incomingStores.filter(s => !existingIds.has(s.id));
              if (newStores.length > 0 && !activeStoreId) {
                  // If we had no stores and imported some, activate the first one
                  setActiveStoreId(newStores[0].id);
              }
              return [...prev, ...newStores];
          });
      } else {
          // Legacy Import: No stores in file.
          // Assign imported projects to ACTIVE store or create default if needed
          let targetStoreId = activeStoreId;
          if (!targetStoreId) {
              const defStoreId = crypto.randomUUID();
              const defStore = { id: defStoreId, name: 'Default Store', goldPrice24k: 85, createdAt: Date.now(), updatedAt: Date.now() };
              setStores([defStore]);
              setActiveStoreId(defStoreId);
              targetStoreId = defStoreId;
          }
          
          // Force candidates to use this targetStoreId if they don't have one
          candidates.forEach(c => {
              if (!c.project.storeId) c.project.storeId = targetStoreId!;
          });
      }

      candidates.forEach(c => {
          if (c.resolution === 'SKIP') return;

          // Ensure project is migrated/valid structure
          const migrated = migrateProject(c.project);

          if (c.resolution === 'REPLACE') {
              idsToRemove.add(migrated.id);
              toAdd.push(migrated);
          } else if (c.resolution === 'DUPLICATE') {
              migrated.id = crypto.randomUUID();
              migrated.name = `${migrated.name} (Imported)`;
              migrated.createdAt = Date.now();
              migrated.lastModified = Date.now();
              toAdd.push(migrated);
          }
      });

      if (toAdd.length > 0) {
          setProjects(prev => {
              const filtered = prev.filter(p => !idsToRemove.has(p.id));
              return [...toAdd, ...filtered];
          });
          alert(`Successfully imported ${toAdd.length} project(s).`);
      }
  };

  const openEditModal = (project: ProjectSettings) => {
      setEditingProject(project);
  };

  const handleEditSave = (updated: ProjectSettings) => {
      handleUpdateProject(updated);
      setEditingProject(null);
  };

  // Connection Indicator
  const ConnectionStatus = () => (
      <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold shadow-md transition-colors ${isBackendConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {isBackendConnected ? <Cloud size={14} /> : <CloudOff size={14} />}
          {isBackendConnected ? 'Cloud Sync Active' : 'Offline Mode'}
      </div>
  );

  // If no store is active, show modal (blocks main UI)
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
      <>
        <ProjectWorkspace 
            project={activeProject} 
            onUpdate={handleUpdateProject} 
            onBack={() => setActiveProjectId(null)}
            globalGoldPrice={activeStore?.goldPrice24k || 85}
            marketplaceRates={globalRates}
        />
        <ConnectionStatus />
      </>
    );
  }

  return (
    <>
      <ProjectList 
        projects={displayProjects} // Pass only active store projects
        stores={stores}
        activeStoreId={activeStoreId}
        onSelectStore={setActiveStoreId}
        onCreateStore={() => setActiveStoreId(null)}
        onOpen={setActiveProjectId} 
        onDelete={handleDeleteProject}
        onDuplicate={handleDuplicateProject}
        onEdit={openEditModal}
        onRename={handleRenameProject}
        onArchive={handleArchiveProject}
        onNew={handleCreateNewProject}
        onGlobalSettings={() => setIsGlobalSettingsOpen(true)}
        onImport={handleImportFile}
        globalGoldPrice={activeStore?.goldPrice24k || 85} // Pass store specific gold
        onUpdateGlobalGold={handleUpdateStoreGold} // Updates store specific gold
        onBatchUpdate={handleBatchUpdateProjects}
      />
      
      <EditProjectModal 
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        project={editingProject}
        onUpdate={handleEditSave}
      />

      <GlobalSettingsModal 
        isOpen={isGlobalSettingsOpen}
        onClose={() => setIsGlobalSettingsOpen(false)}
        purities={globalPurities}
        onSave={setGlobalPurities}
        marketplaceRates={globalRates}
        onSaveMarketplaceRates={setGlobalRates}
      />

      <ImportReviewModal 
        isOpen={!!importData}
        onClose={() => setImportData(null)}
        importData={importData}
        existingProjects={projects}
        onConfirm={handleFinalizeImport}
      />

      <ConnectionStatus />
    </>
  );
}