
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectSettings, ProductType, ExportPayload, Store } from '../types';
import { Plus, Search, Check, X, Filter, ArrowUpDown, Archive, Trash2, Copy, Eye, FolderOpen, RefreshCw, Download, Upload, CheckSquare, Square, TrendingDown, Activity, AlertCircle, ChevronDown, Coins, Building2, ListFilter, Settings, UserCircle2, Clock, MinusSquare, Image as ImageIcon, Camera, Loader2, BookOpen, MoreVertical, Edit2, CheckCircle, Radio, Layers, LogOut, Sun, Moon } from 'lucide-react';
import { calculateProjectHealth, formatCurrency, formatNumber } from '../utils/calculations';
import { PRODUCT_STYLES, PRODUCT_CONFIGS, DEFAULT_MARKETPLACE_RATES } from '../constants';
import { CURRENT_SCHEMA_VERSION } from '../utils/migrations';
import { api } from '../utils/api';
import { Theme, getInitialTheme, applyTheme } from '../utils/theme';

const ActionMenu = ({ 
  isOpen, 
  onClose, 
  onAction,
  isArchived,
  direction = 'down'
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onAction: (action: string) => void;
  isArchived?: boolean;
  direction?: 'up' | 'down';
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const itemClass = "w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-navy-800 flex items-center gap-2.5 transition-colors";
  const positionClass = direction === 'up' 
    ? "bottom-full mb-2 origin-bottom-right" 
    : "top-full mt-1 origin-top-right";

  return (
    <div ref={ref} className={`absolute right-0 w-48 bg-white dark:bg-navy-900 rounded-xl shadow-xl py-1.5 z-50 border border-gray-100 dark:border-white/10 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 ${positionClass}`}>
      <button onClick={() => onAction('open')} className={itemClass}><Eye size={16} className="text-gray-400 dark:text-slate-500" /> Open</button>
      <button onClick={() => onAction('duplicate')} className={itemClass}><Copy size={16} className="text-gray-400 dark:text-slate-500" /> Duplicate</button>
      <button onClick={() => onAction('edit')} className={itemClass}><Edit2 size={16} className="text-gray-400 dark:text-slate-500" /> Edit Variations</button>
      <button onClick={() => onAction('upload_image')} className={itemClass}><Camera size={16} className="text-gray-400 dark:text-slate-500" /> Change Photo</button>
      <button onClick={() => onAction('archive')} className={itemClass}>
        {isArchived ? <RefreshCw size={16} className="text-green-500" /> : <Archive size={16} className="text-gray-400 dark:text-slate-500" />}
        {isArchived ? 'Set Active' : 'Archive'}
      </button>
      <div className="border-t border-gray-100 dark:border-white/10 my-1"></div>
      <button onClick={() => onAction('delete')} className={`${itemClass} text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700`}><Trash2 size={16} /> Delete</button>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
            checked ? 'bg-red-500' : 'bg-gray-200 dark:bg-white/20'
        }`}
    >
        <span
            className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                checked ? 'translate-x-4' : 'translate-x-0'
            }`}
        />
    </button>
);

const ActiveFilterTag = ({ label, onClear }: { label: string, onClear: () => void }) => (
    <div className="flex items-center gap-1 bg-white dark:bg-navy-800 text-blue-900 dark:text-blue-100 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-100 dark:border-blue-800 shadow-sm animate-in fade-in zoom-in-95">
        <span>{label}</span>
        <button onClick={onClear} className="hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-blue-50 dark:hover:bg-navy-700">
            <X size={10} />
        </button>
    </div>
);

interface ProjectListProps {
  projects: ProjectSettings[];
  stores: Store[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onCreateStore: () => void;
  onDeleteStore?: (id: string) => void; 
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (project: ProjectSettings) => void;
  onRename: (id: string, newName: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onNew: () => void;
  onGlobalSettings: () => void;
  onImport: (jsonString: string) => void;
  globalGoldPrice: number; 
  onUpdateGlobalGold: (val: number) => void;
  onBatchUpdate?: (ids: string[], updates: Partial<ProjectSettings>) => void;
  onLogout: () => void;
}

export const ProjectList: React.FC<ProjectListProps> = ({ projects, stores, activeStoreId, onSelectStore, onCreateStore, onDeleteStore, onOpen, onDelete, onDuplicate, onEdit, onRename, onArchive, onNew, onGlobalSettings, onImport, globalGoldPrice, onUpdateGlobalGold, onBatchUpdate, onLogout }) => {
  const [filterType, setFilterType] = useState<'ALL' | ProductType>('ALL');
  const [marketplaceFilter, setMarketplaceFilter] = useState<{ etsy: boolean; shopify: boolean }>({ etsy: false, shopify: false });
  const [isMarketplacePopoverOpen, setIsMarketplacePopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'LOSS' | 'OK' | 'SETUP'>('ALL');
  const [showLossesOnly, setShowLossesOnly] = useState(false);
  const [profitThreshold, setProfitThreshold] = useState<number>(0);
  const [sortType, setSortType] = useState<'DATE_DESC' | 'DATE_ASC' | 'NAME_ASC' | 'PROFIT_ASC'>('DATE_DESC');
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [isGoldModalOpen, setIsGoldModalOpen] = useState(false);
  const [modalGoldPrice, setModalGoldPrice] = useState(globalGoldPrice.toString());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [storeFocusIdx, setStoreFocusIdx] = useState(-1);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(getInitialTheme);

  // LIVE GOLD STATE
  const [liveGoldPrice, setLiveGoldPrice] = useState<number | null>(null);
  const [isFetchingGold, setIsFetchingGold] = useState(false);

  const marketplaceTriggerRef = useRef<HTMLDivElement>(null);
  const storeTriggerRef = useRef<HTMLDivElement>(null);
  const storePopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const pendingUploadIdRef = useRef<string | null>(null);

  const activeStore = stores.find(s => s.id === activeStoreId);
  
  // Apply Theme on Mount/Change
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // FETCH LIVE GOLD ON MOUNT
  useEffect(() => {
      const fetchGold = async () => {
          setIsFetchingGold(true);
          const data = await api.getLiveGoldPrice();
          if (!data.error && data.price > 0) {
              setLiveGoldPrice(data.price);
          }
          setIsFetchingGold(false);
      };
      fetchGold();
  }, []);

  const storeProjectCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      projects.forEach(p => { if (p.storeId) counts[p.storeId] = (counts[p.storeId] || 0) + 1; });
      return counts;
  }, [projects]);

  const filteredStores = useMemo(() => {
      let result = stores;
      if (storeSearch.trim()) {
          result = result.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()));
      }
      return [...result].sort((a, b) => {
          if (a.id === activeStoreId) return -1;
          if (b.id === activeStoreId) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [stores, storeSearch, activeStoreId]);

  const activeTechFilterCount = (healthFilter !== 'ALL' ? 1 : 0) + (showLossesOnly ? 1 : 0) + (profitThreshold > 0 ? 1 : 0);
  const hasActiveFilters = activeTechFilterCount > 0 || filterType !== 'ALL' || searchQuery || marketplaceFilter.etsy || marketplaceFilter.shopify;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketplaceTriggerRef.current && !marketplaceTriggerRef.current.contains(event.target as Node)) {
        setIsMarketplacePopoverOpen(false);
      }
      if (window.innerWidth >= 768) {
          if (storePopoverRef.current && !storePopoverRef.current.contains(event.target as Node) && 
              storeTriggerRef.current && !storeTriggerRef.current.contains(event.target as Node)) {
            setIsStorePopoverOpen(false);
            setStoreSearch('');
          }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
      if (isStorePopoverOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
      }
  }, [isStorePopoverOpen]);

  useEffect(() => {
    setModalGoldPrice(globalGoldPrice.toString());
  }, [globalGoldPrice]);

  const handleStoreKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setStoreFocusIdx(prev => (prev + 1) % filteredStores.length);
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setStoreFocusIdx(prev => (prev - 1 + filteredStores.length) % filteredStores.length);
      } else if (e.key === 'Enter') {
          if (storeFocusIdx >= 0 && storeFocusIdx < filteredStores.length) {
              onSelectStore(filteredStores[storeFocusIdx].id);
              setIsStorePopoverOpen(false);
              setStoreSearch('');
          }
      } else if (e.key === 'Escape') {
          setIsStorePopoverOpen(false);
          setStoreSearch('');
      }
  };

  const handleSaveGold = () => {
    const val = parseFloat(modalGoldPrice);
    if (!isNaN(val) && val > 0) {
        onUpdateGlobalGold(val);
        setIsGoldModalOpen(false);
    }
  };

  const clearAllFilters = () => {
      setHealthFilter('ALL');
      setShowLossesOnly(false);
      setProfitThreshold(0);
      setFilterType('ALL');
      setSearchQuery('');
      setMarketplaceFilter({ etsy: false, shopify: false });
  };

  const filteredAndSortedProjects = useMemo(() => {
    let result = projects.map(p => {
        const health = calculateProjectHealth(p, globalGoldPrice, profitThreshold, DEFAULT_MARKETPLACE_RATES);
        return { ...p, _health: health };
    });

    if (!showArchived) result = result.filter(p => !p.isArchived);
    else result = result.filter(p => p.isArchived);

    if (filterType !== 'ALL') result = result.filter(p => p.productType === filterType);

    const { etsy, shopify } = marketplaceFilter;
    if (etsy !== shopify) {
        if (etsy) result = result.filter(p => p.marketplace === 'etsy');
        if (shopify) result = result.filter(p => p.marketplace === 'shopify');
    }

    if (showLossesOnly) result = result.filter(p => p._health.status === 'LOSS');
    else if (healthFilter !== 'ALL') result = result.filter(p => p._health.status === healthFilter);

    if (searchQuery.trim()) {
        const lowerQ = searchQuery.toLowerCase();
        result = result.filter(p => p.name.toLowerCase().includes(lowerQ));
    }

    result.sort((a, b) => {
        if (sortType === 'DATE_DESC') return (b.lastModified || 0) - (a.lastModified || 0);
        if (sortType === 'DATE_ASC') return (a.lastModified || 0) - (b.lastModified || 0);
        if (sortType === 'NAME_ASC') return a.name.localeCompare(b.name);
        if (sortType === 'PROFIT_ASC') {
             const aVal = a._health.status === 'SETUP' ? 999999 : a._health.minProfit;
             const bVal = b._health.status === 'SETUP' ? 999999 : b._health.minProfit;
             return aVal - bVal;
        }
        return 0;
    });

    return result;
  }, [projects, filterType, marketplaceFilter, sortType, searchQuery, showArchived, healthFilter, showLossesOnly, profitThreshold, globalGoldPrice]);

  const toggleSelect = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const newSet = new Set(selectedIds);
      if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
      setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
      const visibleIds = filteredAndSortedProjects.map(p => p.id);
      const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.has(id));
      
      const newSet = new Set(selectedIds);
      if (allSelected) {
          visibleIds.forEach(id => newSet.delete(id));
      } else {
          visibleIds.forEach(id => newSet.add(id));
      }
      setSelectedIds(newSet);
  };

  const visibleSelectedCount = filteredAndSortedProjects.filter(p => selectedIds.has(p.id)).length;
  const isAllSelected = filteredAndSortedProjects.length > 0 && visibleSelectedCount === filteredAndSortedProjects.length;
  const isIndeterminate = visibleSelectedCount > 0 && !isAllSelected;

  const handleExport = () => {
      if (selectedIds.size === 0) return;
      const toExport = projects.filter(p => selectedIds.has(p.id));
      const payload: ExportPayload = {
          payloadType: 'gold-profit-export',
          schemaVersion: CURRENT_SCHEMA_VERSION,
          exportedAt: Date.now(),
          stores: stores,
          projects: toExport
      };
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
      const link = document.createElement('a');
      link.setAttribute("href", dataStr);
      link.setAttribute("download", `GoldProfit_Export_${toExport.length}_projects.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSelectedIds(new Set()); 
  };

  const handleImportClick = () => fileInputRef.current?.click();
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (ev.target?.result) onImport(ev.target.result as string);
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const handleMenuAction = (action: string, project: ProjectSettings) => {
      setOpenMenuId(null);
      switch(action) {
          case 'open': onOpen(project.id); break;
          case 'duplicate': onDuplicate(project.id); break;
          case 'edit': onEdit(project); break;
          case 'upload_image': handleImageUploadClick(project.id); break;
          case 'archive': onArchive(project.id, !project.isArchived); break;
          case 'delete': onDelete(project.id); break;
      }
  };

  const getAvatarColor = (name: string) => {
      const colors = ['bg-blue-600', 'bg-emerald-600', 'bg-indigo-600', 'bg-rose-600', 'bg-amber-600', 'bg-purple-600', 'bg-cyan-600'];
      let hash = 0;
      for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
      return colors[Math.abs(hash) % colors.length];
  };

  const handleImageUploadClick = (projectId: string) => {
      pendingUploadIdRef.current = projectId; 
      setUploadingImageId(projectId); 
      imageInputRef.current?.click();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      const projectId = pendingUploadIdRef.current;
      
      if (file && projectId && onBatchUpdate) {
          try {
              const url = await api.uploadProjectImage(file, projectId);
              onBatchUpdate([projectId], { imageUrl: url });
              setFailedImages(prev => {
                  const next = new Set(prev);
                  next.delete(projectId);
                  return next;
              });
          } catch (error: any) {
              console.error("Upload failed", error);
              alert(`Upload failed: ${error.message}`);
          }
      }
      
      setUploadingImageId(null);
      pendingUploadIdRef.current = null;
      if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleImageError = (projectId: string) => {
      setFailedImages(prev => new Set(prev).add(projectId));
  };

  const displayPrice = liveGoldPrice || globalGoldPrice;
  const isUsingLivePrice = !!liveGoldPrice;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f111a] font-sans transition-colors duration-300">
      <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
      <input type="file" ref={imageInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleImageFileChange} />

      {/* FULL WIDTH HEADER */}
      <div className="bg-white dark:bg-[#1e2330] border-b border-gray-200 dark:border-white/5 px-6 py-4 flex items-center justify-between sticky top-0 z-50 shadow-md transition-colors duration-300">
          <div className="flex items-center gap-6 w-full">
              
              {/* 1. Left: Isolated Gold Widget */}
              <div className="flex items-center gap-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 shadow-sm shrink-0 transition-colors">
                  <div className="bg-amber-100 dark:bg-amber-700/40 p-2 rounded-lg text-amber-600 dark:text-amber-500">
                      <Layers size={20} fill="currentColor" />
                  </div>
                  <div className="flex flex-col leading-none">
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mb-1">Live Gold Price</span>
                      <div className="flex items-center gap-2">
                          <span className={`text-xl font-bold text-gray-900 dark:text-white ${isFetchingGold ? 'animate-pulse' : ''}`}>
                              ${formatNumber(displayPrice, 2)}
                          </span>
                          {/* Live Indicator Mock */}
                          {isUsingLivePrice && (
                              <span className="flex items-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                                  ▲ Live
                              </span>
                          )}
                      </div>
                  </div>
              </div>

              {/* 2. Center & Right: Action Controls */}
              <div className="flex-1 flex items-center gap-4 ml-auto">
                  
                  {/* Search Bar - Expanded */}
                  <div className="relative group flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={16} />
                      <input 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-gray-100 dark:bg-[#151922] border border-gray-200 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-amber-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600"
                          placeholder="Search projects..."
                      />
                  </div>

                  {/* Marketplace Dropdown */}
                  <div className="relative shrink-0" ref={marketplaceTriggerRef}>
                        <button
                            onClick={() => setIsMarketplacePopoverOpen(!isMarketplacePopoverOpen)}
                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${
                                marketplaceFilter.etsy || marketplaceFilter.shopify
                                ? 'bg-white dark:bg-[#1e2330] border-amber-500/50 text-amber-600 dark:text-amber-400 shadow-sm'
                                : 'bg-transparent border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-white/5'
                            }`}
                        >
                            <span>
                                {marketplaceFilter.etsy && marketplaceFilter.shopify ? 'All Markets' : (marketplaceFilter.etsy ? 'Etsy Only' : (marketplaceFilter.shopify ? 'Shopify Only' : 'Marketplace'))}
                            </span>
                            <ChevronDown size={14} className="opacity-50" />
                        </button>
                        {isMarketplacePopoverOpen && (
                            <div className="absolute top-full mt-2 left-0 w-48 bg-white dark:bg-[#1e2330] rounded-xl shadow-xl border border-gray-100 dark:border-white/10 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter by Marketplace</h4>
                                <div className="space-y-1">
                                    <button onClick={() => setMarketplaceFilter(p => ({...p, etsy: !p.etsy}))} className="flex items-center w-full gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-sm text-slate-700 dark:text-slate-200"><div className={`w-4 h-4 rounded border flex items-center justify-center ${marketplaceFilter.etsy ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 dark:border-white/20 bg-transparent'}`}>{marketplaceFilter.etsy && <Check size={10} strokeWidth={4} />}</div> Etsy</button>
                                    <button onClick={() => setMarketplaceFilter(p => ({...p, shopify: !p.shopify}))} className="flex items-center w-full gap-3 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg text-sm text-slate-700 dark:text-slate-200"><div className={`w-4 h-4 rounded border flex items-center justify-center ${marketplaceFilter.shopify ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 dark:border-white/20 bg-transparent'}`}>{marketplaceFilter.shopify && <Check size={10} strokeWidth={4} />}</div> Shopify</button>
                                </div>
                            </div>
                        )}
                  </div>

                  {/* Global Settings */}
                  <button 
                        onClick={onGlobalSettings}
                        className="flex items-center gap-2 bg-transparent border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-sm font-medium whitespace-nowrap shrink-0"
                    >
                        <Settings size={18} />
                        <span className="hidden xl:inline">Global Settings</span>
                  </button>

                  <div className="h-8 w-px bg-gray-200 dark:bg-white/10 mx-1 shrink-0"></div>

                  {/* Store Selector */}
                  <div className="relative shrink-0" ref={storeTriggerRef}>
                      <button onClick={() => setIsStorePopoverOpen(!isStorePopoverOpen)} className="flex items-center gap-2 bg-slate-800 dark:bg-[#2a3143] border border-slate-700 dark:border-white/10 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:border-amber-500/30 transition-all whitespace-nowrap">
                          <Building2 size={16} className="text-slate-300" />
                          <span>{activeStore?.name || 'Select Store'}</span>
                          <ChevronDown size={14} className="text-slate-400" />
                      </button>
                      {isStorePopoverOpen && (
                                <div ref={storePopoverRef} className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-[#1e2330] rounded-xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden flex flex-col z-[60] animate-in fade-in zoom-in-95 origin-top-right">
                                     <div className="px-4 py-3 border-b border-gray-100 dark:border-white/10 shrink-0"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" /><input ref={searchInputRef} className="w-full pl-9 pr-3 py-2.5 bg-gray-50 dark:bg-[#151922] border border-gray-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-800 dark:text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500" placeholder="Search store..." value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} onKeyDown={handleStoreKeyDown} /></div></div>
                                     <div className="overflow-y-auto scrollbar-thin p-2 space-y-1 max-h-[200px]">{filteredStores.map((store, idx) => (<button key={store.id} onClick={() => { onSelectStore(store.id); setIsStorePopoverOpen(false); }} className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-left group border ${store.id === activeStoreId ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 shadow-sm' : (idx === storeFocusIdx ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10' : 'bg-transparent border-transparent hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10')}`}><div className="flex items-center gap-3 min-w-0"><div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm shrink-0 ${getAvatarColor(store.name)}`}>{store.name.substring(0,2).toUpperCase()}</div><div className="min-w-0"><div className={`text-sm font-bold truncate ${store.id === activeStoreId ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>{store.name}</div></div></div><div className="flex items-center gap-2">{store.id === activeStoreId && <Check size={14} className="text-amber-600 dark:text-amber-400" />}{onDeleteStore && <div role="button" onClick={(e) => { e.stopPropagation(); onDeleteStore(store.id); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"><Trash2 size={14} /></div>}</div></button>))}</div>
                                     <div className="p-3 border-t border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-[#151922] shrink-0"><button onClick={() => { onCreateStore(); setIsStorePopoverOpen(false); }} className="w-full py-2.5 rounded-xl bg-amber-500 text-[#1e2330] font-bold text-xs hover:bg-amber-400 shadow-lg transition-all flex items-center justify-center gap-2"><Plus size={16} /> Create New Store</button></div>
                                </div>
                            )}
                  </div>

                  {/* Manual Gold Rate Button */}
                  <button 
                      onClick={() => setIsGoldModalOpen(true)}
                      className="flex items-center gap-2 bg-slate-800 dark:bg-[#2a3143] border border-slate-700 dark:border-white/10 text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:border-amber-500/30 transition-all whitespace-nowrap shrink-0"
                  >
                      <Coins size={16} className="text-amber-500" />
                      <span>Gold ${formatNumber(globalGoldPrice, 0)}</span>
                  </button>

                  {/* Theme Toggle */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
                    title="Toggle Theme"
                  >
                    {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  {/* Logout Button */}
                  <button 
                      onClick={onLogout}
                      className="p-2 rounded-lg bg-gray-100 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 border border-gray-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                      title="Log Out"
                  >
                      <LogOut size={20} />
                  </button>

                  {/* Primary Action */}
                  <button 
                      onClick={onNew}
                      className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-[#1e2330] font-bold px-5 py-2.5 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.4)] hover:shadow-[0_0_20px_rgba(245,158,11,0.6)] hover:scale-[1.02] active:scale-95 transition-all text-sm whitespace-nowrap shrink-0"
                  >
                      <Plus size={18} strokeWidth={2.5} />
                      <span>New Project</span>
                  </button>
              </div>
          </div>
      </div>

      {/* Gold Modal */}
      {isGoldModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-navy-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100 dark:border-white/10">
                    <div className={`bg-gradient-to-b ${isUsingLivePrice ? 'from-red-500 to-red-600 dark:from-red-600 dark:to-red-700' : 'from-orange-400 to-orange-500 dark:from-gold-600 dark:to-gold-700'} p-8 text-white text-center`}>
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            {isUsingLivePrice ? <Radio size={24} className="animate-pulse" /> : <Coins size={24} />}
                        </div>
                        <h3 className="text-xl font-bold">Store Gold Rate</h3>
                        <p className="text-white/80 text-sm mt-1">{isUsingLivePrice ? 'Viewing LIVE Market Data' : 'Updates calculations for this store.'}</p>
                    </div>
                    <div className="p-8">
                        {isUsingLivePrice && (
                            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-300 p-3 rounded-lg text-xs font-medium border border-red-100 dark:border-red-800 flex items-start gap-2">
                                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                <span>
                                    Displaying live data from Nadir Döviz ({formatNumber(displayPrice, 2)}/g). 
                                    Click <strong>Update Rate</strong> to apply this as your store standard.
                                </span>
                            </div>
                        )}
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Price per Gram (24K)</label>
                            <div className="relative"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span><input type="number" className="w-full pl-9 pr-4 py-4 text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-navy-950 border border-gray-200 dark:border-white/20 rounded-xl focus:ring-4 focus:ring-orange-100 dark:focus:ring-gold-500/20 focus:border-orange-500 dark:focus:border-gold-500 outline-none transition-all shadow-sm" value={modalGoldPrice} onChange={(e) => setModalGoldPrice(e.target.value)} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleSaveGold()} /></div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={() => setIsGoldModalOpen(false)} className="text-gray-500 dark:text-slate-400 font-bold hover:text-gray-800 dark:hover:text-slate-200 px-4 transition-colors">Cancel</button>
                            <button onClick={handleSaveGold} className="flex-1 bg-gradient-to-b from-orange-400 to-orange-500 dark:from-gold-500 dark:to-gold-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-200 dark:shadow-none hover:scale-105 transition-transform">Update Rate</button>
                        </div>
                    </div>
                </div>
            </div>
      )}

      <div className="w-full relative p-4 md:p-6 lg:p-8">
        {/* Active Filters Display */}
        {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 px-1 mb-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Active:</span>
                {healthFilter !== 'ALL' && <ActiveFilterTag label={`Status: ${healthFilter}`} onClear={() => setHealthFilter('ALL')} />}
                {showLossesOnly && <ActiveFilterTag label="Losses Only" onClear={() => setShowLossesOnly(false)} />}
                {profitThreshold > 0 && <ActiveFilterTag label={`Min Loss: $${profitThreshold}`} onClear={() => setProfitThreshold(0)} />}
                {filterType !== 'ALL' && <ActiveFilterTag label={`Type: ${PRODUCT_CONFIGS[filterType].label}`} onClear={() => setFilterType('ALL')} />}
                {searchQuery && <ActiveFilterTag label={`Search: "${searchQuery}"`} onClear={() => setSearchQuery('')} />}
                <button onClick={clearAllFilters} className="text-[10px] font-bold text-amber-500 hover:text-amber-400 underline ml-2">Clear All</button>
            </div>
        )}

        {/* Project Grid */}
        {filteredAndSortedProjects.length === 0 ? (
           <div className="bg-white dark:bg-navy-900 rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-8 md:p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 dark:bg-navy-800 text-gray-400 dark:text-slate-500 rounded-full mb-4"><FolderOpen size={32} /></div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-slate-200 mb-2">No projects found</h3>
              <p className="text-gray-500 dark:text-slate-400 mb-6">{searchQuery ? 'Try adjusting your search.' : (showLossesOnly ? 'No projects with loss found.' : 'Create a new project to get started.')}</p>
              <button onClick={onNew} className="text-blue-600 dark:text-gold-400 font-bold hover:underline">Create New Project</button>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedProjects.map(p => {
                 const isSelected = selectedIds.has(p.id);
                 const mType = p.marketplace || 'etsy';
                 const isUploading = uploadingImageId === p.id;
                 const hasImageError = failedImages.has(p.id);
                 
                 const profit = p._health.avgProfit;
                 const isProfitable = profit >= 0;
                 const isSetup = p._health.status === 'SETUP';

                 // Dynamic Hologram Styles
                 const hologramBg = isProfitable 
                    ? "bg-gradient-to-r from-emerald-100 dark:from-emerald-900/40 via-emerald-50 dark:via-emerald-600/20 to-transparent dark:to-slate-800/20"
                    : "bg-gradient-to-r from-rose-100 dark:from-rose-900/40 via-rose-50 dark:via-rose-600/20 to-transparent dark:to-slate-800/20";
        
                 const textGlow = isProfitable
                    ? "text-emerald-600 dark:text-emerald-400 dark:[text-shadow:0_0_10px_rgba(52,211,153,0.6),_0_0_20px_rgba(52,211,153,0.3)]"
                    : "text-rose-600 dark:text-rose-400 dark:[text-shadow:0_0_10px_rgba(244,63,94,0.6),_0_0_20px_rgba(244,63,94,0.3)]";
                    
                 const profitContainerStyle = isProfitable
                    ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/10"
                    : "border-rose-500 bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/10";

                 const marginBadgeStyle = isProfitable
                    ? "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300 dark:shadow-[0_0_15px_-3px_rgba(16,185,129,0.3)]"
                    : "bg-rose-100 dark:bg-rose-500/20 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 dark:shadow-[0_0_15px_-3px_rgba(244,63,94,0.3)]";

                 return (
                    <div key={p.id} className="relative w-full group/card" onClick={() => onOpen(p.id)}>
                        {/* Outer Glow */}
                        <div className={`absolute -inset-1 rounded-2xl blur opacity-0 dark:opacity-60 group-hover/card:opacity-40 dark:group-hover/card:opacity-80 transition duration-700 ${!isSetup ? hologramBg : 'bg-gray-200 dark:bg-gray-800/50'}`}></div>
                        
                        <div className="relative flex bg-white dark:bg-[#1e293b] rounded-2xl shadow-xl dark:shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5 min-h-[300px]">
                            
                            {/* Left Image Section (1/3 width) */}
                            <div className="relative w-1/3 max-w-[240px] border-r border-gray-100 dark:border-white/5 overflow-hidden group/image shrink-0 bg-gray-100 dark:bg-black">
                                <div className="relative w-full h-full">
                                    {p.imageUrl && !hasImageError ? (
                                        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover/image:scale-105" style={{ backgroundImage: `url(${p.imageUrl})` }}></div>
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-slate-700 bg-gray-50 dark:bg-slate-900"><ImageIcon size={48} className="opacity-20" /></div>
                                    )}
                                    {/* Upload button removed from hover overlay, moved to menu */}
                                </div>
                            </div>

                            {/* Right Content Section */}
                            <div className="flex-1 flex flex-col p-6 relative">
                                {/* Header: Select & Tags */}
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex gap-2">
                                        <span className="px-2 py-1 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">{PRODUCT_CONFIGS[p.productType].label}</span>
                                        <span className={`px-2 py-1 border rounded text-[10px] uppercase font-bold ${mType === 'shopify' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-400'}`}>{mType}</span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); toggleSelect(e, p.id); }} 
                                            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-xs font-bold transition-all uppercase tracking-widest shadow-sm hover:shadow-md ${isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-gray-200 dark:border-white/10 hover:text-slate-900 dark:hover:text-white'}`}
                                        >
                                            {isSelected && <CheckCircle size={14} />}
                                            {isSelected ? 'Selected' : 'Select'}
                                        </button>
                                        <div className="relative">
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setOpenMenuId(openMenuId === p.id ? null : p.id); 
                                                }} 
                                                onMouseDown={(e) => e.stopPropagation()}
                                                className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                            >
                                                {isUploading ? <Loader2 size={16} className="animate-spin text-gold-500" /> : <MoreVertical size={16} />}
                                            </button>
                                            <ActionMenu isOpen={openMenuId === p.id} onClose={() => setOpenMenuId(null)} onAction={(action) => handleMenuAction(action, p)} isArchived={!!p.isArchived} direction="down" />
                                        </div>
                                    </div>
                                </div>

                                {/* Main Body */}
                                <div className="flex-1 flex flex-col justify-center mb-6">
                                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight break-words pr-4 mb-6 leading-tight">{p.name}</h2>
                                    
                                    {/* Profit Block */}
                                    {!isSetup ? (
                                        <div className="relative group/profit">
                                            <div className={`absolute -inset-4 rounded-xl blur-md opacity-0 dark:opacity-30 ${isProfitable ? 'bg-emerald-500/20' : 'bg-rose-500/20'} border ${isProfitable ? 'border-emerald-500/10' : 'border-rose-500/10'}`}></div>
                                            <div className={`relative flex flex-col pl-4 border-l-4 py-2 ${profitContainerStyle}`}>
                                                <span className={`text-[11px] uppercase tracking-[0.2em] font-bold mb-1 ${isProfitable ? 'text-emerald-600/80 dark:text-emerald-400/80' : 'text-rose-600/80 dark:text-rose-400/80'}`}>Estimated Net Profit</span>
                                                <div className="flex items-baseline gap-4">
                                                    <span className={`text-4xl font-bold ${textGlow}`}>{formatCurrency(profit)}</span>
                                                    <div className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-wider ${marginBadgeStyle}`}>
                                                        {isProfitable ? 'HEALTHY' : 'LOSS RISK'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-center">
                                            <span className="text-xs text-slate-400 uppercase tracking-widest font-bold">Setup Incomplete</span>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="mt-auto pt-4 flex items-end justify-between border-t border-gray-100 dark:border-white/5">
                                    <div className="flex-1"></div> {/* Spacer where Edit Details used to be */}

                                    <div className="flex flex-col items-end gap-1 text-right pl-4">
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider">{p.lastEditorName || 'User'}</span>
                                                <span className="text-[10px] text-slate-400 dark:text-slate-500">Edited {p.lastModified ? new Date(p.lastModified).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '—'}</span>
                                            </div>
                                            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden border border-gray-200 dark:border-white/10 ring-2 ring-transparent group-hover/card:ring-emerald-500/20 transition-all flex items-center justify-center text-slate-400">
                                                <UserCircle2 size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                 );
              })}
           </div>
        )}
      </div>
    </div>
  );
};
