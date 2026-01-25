
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ProjectSettings, ProductType, ExportPayload, MarketplaceType, Store } from '../types';
import { Plus, Search, Calendar, MoreVertical, Edit2, Check, X, Filter, ArrowUpDown, ShieldCheck, Archive, Trash2, Copy, Eye, FolderOpen, RefreshCw, RefreshCcw, Download, Upload, CheckSquare, Square, DollarSign, TrendingDown, Activity, AlertTriangle, AlertCircle, ChevronDown, Coins, Tag, Globe, Settings2, Info, Percent, Store as StoreIcon, Building2, ShoppingBag, ListFilter, Settings } from 'lucide-react';
import { formatDate, calculateProjectHealth, formatCurrency, formatNumber } from '../utils/calculations';
import { PRODUCT_STYLES, PRODUCT_CONFIGS, DEFAULT_MARKETPLACE_RATES } from '../constants';
import { CURRENT_SCHEMA_VERSION } from '../utils/migrations';

interface ProjectListProps {
  projects: ProjectSettings[];
  stores: Store[];
  activeStoreId: string | null;
  onSelectStore: (id: string) => void;
  onCreateStore: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onEdit: (project: ProjectSettings) => void;
  onRename: (id: string, newName: string) => void;
  onArchive: (id: string, archive: boolean) => void;
  onNew: () => void;
  onGlobalSettings: () => void;
  onImport: (jsonString: string) => void;
  globalGoldPrice: number; // This is now activeStore.goldPrice24k
  onUpdateGlobalGold: (val: number) => void;
  onBatchUpdate?: (ids: string[], updates: Partial<ProjectSettings>) => void;
}

// --- ICONS & HELPERS ---

const ModernRing = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 3L14.5 6H9.5L12 3Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M9.5 6L12 9L14.5 6" />
        <circle cx="12" cy="14" r="7" />
        <path d="M12 11C14 11 15.5 12.5 15.5 14" strokeOpacity="0.5" />
        <path d="M9 12C9 12 10 11 12 11" strokeOpacity="0.5" />
    </svg>
);

const ModernNecklace = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M6 4C6 4 6 14 12 14C18 14 18 4 18 4" />
        <path d="M12 14L10 17L12 20L14 17L12 14Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 15L13 17" strokeOpacity="0.5" />
    </svg>
);

const ModernBracelet = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <ellipse cx="12" cy="12" rx="8" ry="6" />
        <circle cx="12" cy="18" r="1.5" fill="currentColor" fillOpacity="0.2" />
        <circle cx="6" cy="14" r="1" />
        <circle cx="18" cy="14" r="1" />
        <circle cx="8" cy="7.5" r="1" />
        <circle cx="16" cy="7.5" r="1" />
        <path d="M14 6.5C16 7 18 9 18 12" strokeOpacity="0.3" />
    </svg>
);

const ModernEarring = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="14" r="5" />
        <circle cx="12" cy="14" r="2.5" fill="currentColor" fillOpacity="0.2" />
        <path d="M12 9V4" />
        <path d="M10 4H14" />
        <path d="M14 12L15 13" strokeOpacity="0.5" />
    </svg>
);

const getProductIcon = (type: ProductType, className: string) => {
    switch(type) {
        case 'NECKLACE': return <ModernNecklace className={className} />;
        case 'BRACELET': return <ModernBracelet className={className} />;
        case 'EARRING': return <ModernEarring className={className} />;
        case 'RING': 
        default: return <ModernRing className={className} />;
    }
}

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

  const itemClass = "w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors";
  const positionClass = direction === 'up' 
    ? "bottom-full mb-2 origin-bottom-right" 
    : "top-full mt-1 origin-top-right";

  return (
    <div ref={ref} className={`absolute right-0 w-48 bg-white rounded-xl shadow-xl py-1.5 z-50 border border-gray-100 ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100 ${positionClass}`}>
      <button onClick={() => onAction('open')} className={itemClass}><Eye size={16} className="text-gray-400" /> Open</button>
      <button onClick={() => onAction('duplicate')} className={itemClass}><Copy size={16} className="text-gray-400" /> Duplicate</button>
      <button onClick={() => onAction('edit')} className={itemClass}><Edit2 size={16} className="text-gray-400" /> Edit Variations</button>
      <button onClick={() => onAction('archive')} className={itemClass}>
        {isArchived ? <RefreshCw size={16} className="text-green-500" /> : <Archive size={16} className="text-gray-400" />}
        {isArchived ? 'Set Active' : 'Archive'}
      </button>
      <div className="border-t border-gray-100 my-1"></div>
      <button onClick={() => onAction('delete')} className={`${itemClass} text-red-600 hover:bg-red-50 hover:text-red-700`}><Trash2 size={16} /> Delete</button>
    </div>
  );
};

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none shrink-0 ${
            checked ? 'bg-red-500' : 'bg-gray-200'
        }`}
    >
        <span
            className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ease-in-out ${
                checked ? 'translate-x-4' : 'translate-x-0'
            }`}
        />
    </button>
);

const FilterChip = ({ label, value, current, onClick }: { label: string, value: string, current: string, onClick: (v:string) => void }) => (
    <button 
      onClick={() => onClick(value)}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${
          current === value 
          ? 'bg-gray-900 text-white shadow-md border-gray-900' 
          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
      }`}
    >
        {label}
    </button>
);

const ActiveFilterTag = ({ label, onClear }: { label: string, onClear: () => void }) => (
    <div className="flex items-center gap-1 bg-white text-blue-900 px-2.5 py-1 rounded-full text-[10px] font-bold border border-blue-100 shadow-sm animate-in fade-in zoom-in-95">
        <span>{label}</span>
        <button onClick={onClear} className="hover:text-red-500 transition-colors p-0.5 rounded-full hover:bg-blue-50">
            <X size={10} />
        </button>
    </div>
);

export const ProjectList: React.FC<ProjectListProps> = ({ projects, stores, activeStoreId, onSelectStore, onCreateStore, onOpen, onDelete, onDuplicate, onEdit, onRename, onArchive, onNew, onGlobalSettings, onImport, globalGoldPrice, onUpdateGlobalGold, onBatchUpdate }) => {
  const [filterType, setFilterType] = useState<'ALL' | ProductType>('ALL');
  
  // Filters
  const [marketplaceFilter, setMarketplaceFilter] = useState<{ etsy: boolean; shopify: boolean }>({ etsy: false, shopify: false });
  const [isMarketplacePopoverOpen, setIsMarketplacePopoverOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  // Advanced Filters
  const [healthFilter, setHealthFilter] = useState<'ALL' | 'LOSS' | 'OK' | 'SETUP'>('ALL');
  const [showLossesOnly, setShowLossesOnly] = useState(false);
  const [profitThreshold, setProfitThreshold] = useState<number>(0);

  // Sorting
  const [sortType, setSortType] = useState<'DATE_DESC' | 'DATE_ASC' | 'NAME_ASC' | 'PROFIT_ASC'>('DATE_DESC');

  // UI State
  const [isStorePopoverOpen, setIsStorePopoverOpen] = useState(false);
  const [storeSearch, setStoreSearch] = useState('');
  const [isGoldModalOpen, setIsGoldModalOpen] = useState(false);
  const [modalGoldPrice, setModalGoldPrice] = useState(globalGoldPrice.toString());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [storeFocusIdx, setStoreFocusIdx] = useState(-1);

  // Refs
  const marketplaceTriggerRef = useRef<HTMLDivElement>(null);
  const storeTriggerRef = useRef<HTMLDivElement>(null);
  const storePopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const activeStore = stores.find(s => s.id === activeStoreId);
  
  const storeProjectCounts = useMemo(() => {
      const counts: Record<string, number> = {};
      projects.forEach(p => { if (p.storeId) counts[p.storeId] = (counts[p.storeId] || 0) + 1; });
      return counts;
  }, [projects]);

  const filteredStores = useMemo(() => {
      // 1. Search Filter
      let result = stores;
      if (storeSearch.trim()) {
          result = result.filter(s => s.name.toLowerCase().includes(storeSearch.toLowerCase()));
      }
      
      // 2. Smart Sort: Active Store First, then Alpha
      return [...result].sort((a, b) => {
          if (a.id === activeStoreId) return -1;
          if (b.id === activeStoreId) return 1;
          return a.name.localeCompare(b.name);
      });
  }, [stores, storeSearch, activeStoreId]);

  const activeTechFilterCount = (healthFilter !== 'ALL' ? 1 : 0) + (showLossesOnly ? 1 : 0) + (profitThreshold > 0 ? 1 : 0);
  const hasActiveFilters = activeTechFilterCount > 0 || filterType !== 'ALL' || searchQuery || marketplaceFilter.etsy || marketplaceFilter.shopify;

  // Effects
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (marketplaceTriggerRef.current && !marketplaceTriggerRef.current.contains(event.target as Node)) {
        setIsMarketplacePopoverOpen(false);
      }
      // Only close if clicking outside BOTH trigger and desktop popover (ignore mobile drawer overlay click here as it has its own handler)
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

  // Focus Search input when store popover opens
  useEffect(() => {
      if (isStorePopoverOpen) {
          setTimeout(() => searchInputRef.current?.focus(), 100);
      }
  }, [isStorePopoverOpen]);

  useEffect(() => {
    setModalGoldPrice(globalGoldPrice.toString());
  }, [globalGoldPrice]);

  // Handlers
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
      setIsFilterPanelOpen(false);
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
      if (selectedIds.size === filteredAndSortedProjects.length && filteredAndSortedProjects.length > 0) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(filteredAndSortedProjects.map(p => p.id)));
      }
  };

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

  const startRenaming = (e: React.MouseEvent, project: ProjectSettings) => {
      e.stopPropagation();
      setEditingNameId(project.id);
      setTempName(project.name);
  };

  const saveRenaming = (e: React.SyntheticEvent, id: string) => {
      e.stopPropagation();
      if (tempName.trim()) onRename(id, tempName);
      setEditingNameId(null);
  };

  const handleMenuAction = (action: string, project: ProjectSettings) => {
      setOpenMenuId(null);
      switch(action) {
          case 'open': onOpen(project.id); break;
          case 'duplicate': onDuplicate(project.id); break;
          case 'edit': onEdit(project); break;
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

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />

        {/* --- HEADER GRID --- */}
        <div className="flex flex-col gap-4 mb-6">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                
                {/* MOBILE TOP ROW: Store & Action (Order 1 on mobile) */}
                <div className="flex md:hidden justify-between items-center col-span-1 order-1">
                    {/* Unified Context Block (Mobile) */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1">
                        <button onClick={() => setIsStorePopoverOpen(true)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                            <Building2 size={16} className="text-gray-400" />
                            <span className="text-xs font-bold text-gray-800 max-w-[80px] truncate">{activeStore?.name || 'Store'}</span>
                        </button>
                        <div className="w-px h-5 bg-gray-200 mx-1"></div>
                        <button onClick={() => setIsGoldModalOpen(true)} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-600"><Coins size={12} /></div>
                            <span className="text-xs font-black text-gray-800">${formatNumber(globalGoldPrice, 0)}</span>
                        </button>
                    </div>
                    
                    {/* Compact New Project Button */}
                    <button onClick={onNew} className="bg-blue-600 text-white p-2.5 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                        <Plus size={20} />
                    </button>
                </div>

                {/* SEARCH ZONE (Order 2 on mobile, Order 1 on Desktop/Tablet) */}
                <div className="col-span-1 md:col-span-7 xl:col-span-6 order-2 md:order-1 flex gap-2 w-full">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-gray-200 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none text-sm font-medium text-gray-700 placeholder:text-gray-400 shadow-sm"
                            placeholder="Search projects..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    
                    {/* Marketplace Filter */}
                    <div className="relative" ref={marketplaceTriggerRef}>
                        <button
                            onClick={() => setIsMarketplacePopoverOpen(!isMarketplacePopoverOpen)}
                            className={`h-full px-3 md:px-4 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${
                                marketplaceFilter.etsy || marketplaceFilter.shopify
                                ? 'bg-white border-blue-300 text-blue-800 shadow-sm ring-1 ring-blue-100'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                        >
                            <span className="hidden md:inline">
                                {marketplaceFilter.etsy && marketplaceFilter.shopify ? 'All Markets' : (marketplaceFilter.etsy ? 'Etsy Only' : (marketplaceFilter.shopify ? 'Shopify Only' : 'Marketplace'))}
                            </span>
                            <span className="md:hidden">Mkt</span>
                            <ChevronDown size={14} className="opacity-50" />
                        </button>
                        {/* Popover content remains same */}
                        {isMarketplacePopoverOpen && (
                            <div className="absolute top-full mt-2 left-0 w-48 bg-white rounded-xl shadow-xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Filter by Marketplace</h4>
                                <div className="space-y-1">
                                    <button onClick={() => setMarketplaceFilter(p => ({...p, etsy: !p.etsy}))} className="flex items-center w-full gap-3 p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className={`w-4 h-4 rounded border flex items-center justify-center ${marketplaceFilter.etsy ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'}`}>{marketplaceFilter.etsy && <Check size={10} strokeWidth={4} />}</div> Etsy</button>
                                    <button onClick={() => setMarketplaceFilter(p => ({...p, shopify: !p.shopify}))} className="flex items-center w-full gap-3 p-2 hover:bg-gray-50 rounded-lg text-sm text-gray-700"><div className={`w-4 h-4 rounded border flex items-center justify-center ${marketplaceFilter.shopify ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>{marketplaceFilter.shopify && <Check size={10} strokeWidth={4} />}</div> Shopify</button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Filter Toggle Button (Updated Design) */}
                    <button 
                        onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                        className={`h-full min-h-[42px] aspect-square md:aspect-auto md:px-6 rounded-full border flex items-center justify-center gap-2 transition-all duration-200 ${isFilterPanelOpen || activeTechFilterCount > 0 ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'}`}
                    >
                        <ListFilter size={18} strokeWidth={2.5} />
                        <span className="hidden md:inline text-sm font-semibold">Filters</span>
                        {activeTechFilterCount > 0 && (
                            <span className={`flex items-center justify-center h-5 min-w-[20px] px-1.5 text-[10px] font-bold rounded-full ${isFilterPanelOpen ? 'bg-white text-gray-900' : 'bg-red-500 text-white'}`}>
                                {activeTechFilterCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* CONTEXT ZONE (Hidden Mobile, Visible Tablet/Desktop) */}
                <div className="hidden md:flex col-span-5 xl:col-span-6 order-3 justify-end items-center gap-3">
                    {/* Unified Context Block */}
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl shadow-sm p-1 h-11">
                        <div className="relative" ref={storeTriggerRef}>
                            {/* NEW STORE TRIGGER BUTTON */}
                            <button
                                onClick={() => setIsStorePopoverOpen(!isStorePopoverOpen)}
                                className="group hover:bg-gray-50 rounded-lg px-2 py-1.5 flex items-center transition-colors h-full"
                                title={activeStore ? `Active Store: ${activeStore.name}` : 'Select Store'}
                            >
                                <div className="flex items-center gap-2 max-w-[140px]">
                                    <div className="p-1 rounded-md text-gray-400 group-hover:text-blue-500 transition-colors">
                                        <Building2 size={18} />
                                    </div>
                                    <span className="truncate text-sm font-bold text-gray-700 leading-tight">
                                        {activeStore?.name || 'Select Store'}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-2 pl-3 ml-2 border-l border-gray-200 h-6">
                                    <span className="bg-gray-100 text-gray-500 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        {storeProjectCounts[activeStoreId || ''] || 0}
                                    </span>
                                    <ChevronDown size={14} className="text-gray-400" />
                                </div>
                            </button>

                            {/* HYBRID POPOVER/DRAWER */}
                            {isStorePopoverOpen && (
                                <>
                                    {/* Mobile Backdrop */}
                                    <div 
                                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[99] md:hidden animate-in fade-in"
                                        onClick={() => setIsStorePopoverOpen(false)}
                                    ></div>

                                    <div 
                                        ref={storePopoverRef} 
                                        className="fixed inset-x-0 bottom-0 z-[100] md:absolute md:inset-auto md:top-full md:right-0 md:mt-2 w-full md:w-96 bg-white md:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[80vh] md:max-h-[500px] animate-in slide-in-from-bottom-10 md:slide-in-from-top-2 md:fade-in origin-top-right"
                                    >
                                        {/* Mobile Pull Indicator */}
                                        <div className="w-full flex justify-center pt-3 pb-1 md:hidden">
                                            <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                                        </div>

                                        {/* Panel Header */}
                                        <div className="px-4 py-3 border-b border-gray-100 shrink-0">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Store</h4>
                                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{stores.length} Found</span>
                                            </div>
                                            <div className="relative">
                                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input 
                                                    ref={searchInputRef}
                                                    className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-transparent rounded-xl text-sm font-medium text-gray-900 focus:bg-white focus:border-blue-300 focus:ring-4 focus:ring-blue-50 outline-none transition-all placeholder:text-gray-400"
                                                    placeholder="Search store..."
                                                    value={storeSearch}
                                                    onChange={(e) => setStoreSearch(e.target.value)}
                                                    onKeyDown={handleStoreKeyDown}
                                                />
                                            </div>
                                        </div>

                                        {/* Store List */}
                                        <div className="overflow-y-auto scrollbar-thin p-2 space-y-1 min-h-[150px]">
                                            {filteredStores.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center py-10 text-center">
                                                    <StoreIcon size={32} className="text-gray-200 mb-2" />
                                                    <p className="text-sm font-bold text-gray-500">No stores found</p>
                                                    <button onClick={() => { onCreateStore(); setIsStorePopoverOpen(false); }} className="mt-3 text-blue-600 text-xs font-bold hover:underline">
                                                        Create "{storeSearch}"?
                                                    </button>
                                                </div>
                                            ) : (
                                                filteredStores.map((store, idx) => (
                                                    <button
                                                        key={store.id}
                                                        onClick={() => {
                                                            onSelectStore(store.id);
                                                            setIsStorePopoverOpen(false);
                                                            setStoreSearch('');
                                                        }}
                                                        className={`w-full flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all text-left group border ${store.id === activeStoreId ? 'bg-blue-50 border-blue-200 shadow-sm' : (idx === storeFocusIdx ? 'bg-gray-50 border-gray-200' : 'bg-white border-transparent hover:bg-gray-50 hover:border-gray-100')}`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            {/* Avatar */}
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0 ${getAvatarColor(store.name)}`}>
                                                                {store.name.substring(0,2).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className={`text-sm font-bold truncate ${store.id === activeStoreId ? 'text-blue-900' : 'text-gray-800'}`}>
                                                                    {store.name}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <span className="text-[10px] font-medium text-gray-500 bg-white/50 px-1.5 py-0.5 rounded border border-gray-100/50">
                                                                        {storeProjectCounts[store.id] || 0} Listings
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Selection Indicator & Hover Actions */}
                                                        <div className="flex items-center gap-2">
                                                            {store.id === activeStoreId ? (
                                                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm shrink-0">
                                                                    <Check size={14} strokeWidth={3} />
                                                                </div>
                                                            ) : (
                                                                <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-gray-300 shrink-0"></div>
                                                            )}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>

                                        {/* Footer Action */}
                                        <div className="p-3 border-t border-gray-100 bg-gray-50 shrink-0 sticky bottom-0">
                                            <button 
                                                onClick={() => { onCreateStore(); setIsStorePopoverOpen(false); }} 
                                                className="w-full py-3 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                                            >
                                                <Plus size={16} /> Create New Store
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="w-px h-6 bg-gray-200 mx-1"></div>

                        <button
                            onClick={() => setIsGoldModalOpen(true)}
                            className="hover:bg-gray-50 rounded-lg px-3 py-2 flex items-center gap-2 text-sm font-bold text-gray-700 transition-colors group h-full"
                            title={`Update Store Gold Price: $${formatNumber(globalGoldPrice, 2)}`}
                        >
                            <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200 group-hover:text-amber-700 transition-colors">
                                <Coins size={14} />
                            </div>
                            <div className="flex flex-col items-start leading-none">
                                <span className="text-[9px] font-bold text-gray-400 uppercase">Gold</span>
                                <span className="font-black">${formatNumber(globalGoldPrice, 0)}</span>
                            </div>
                        </button>
                    </div>

                    <button onClick={onNew} className="h-11 px-5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all font-bold text-sm flex items-center gap-2 whitespace-nowrap">
                        <Plus size={18} /> <span className="hidden xl:inline">New Project</span> <span className="xl:hidden">New</span>
                    </button>
                </div>
            </div>

            {/* COLLAPSIBLE TECHNICAL FILTERS ROW */}
            {isFilterPanelOpen && (
                <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row gap-4 items-center animate-in slide-in-from-top-2 fade-in">
                    {/* Status */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase w-16 md:w-auto">Status:</span>
                        <select 
                            className="bg-gray-50 text-xs font-bold text-gray-700 border border-gray-200 rounded-lg py-1.5 px-2 cursor-pointer hover:border-gray-300 focus:outline-none flex-1 md:flex-none"
                            value={healthFilter}
                            onChange={(e) => setHealthFilter(e.target.value as any)}
                            disabled={showLossesOnly}
                        >
                            <option value="ALL">Show All</option>
                            <option value="LOSS">Loss Risks</option>
                            <option value="OK">Healthy</option>
                            <option value="SETUP">Needs Setup</option>
                        </select>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-gray-100"></div>

                    {/* Losses Only Toggle */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase w-16 md:w-auto">Only Risks:</span>
                        <div className="flex items-center gap-2">
                            <ToggleSwitch checked={showLossesOnly} onChange={setShowLossesOnly} />
                            <span className={`text-xs font-bold ${showLossesOnly ? 'text-red-600' : 'text-gray-400'}`}>{showLossesOnly ? 'ON' : 'OFF'}</span>
                        </div>
                    </div>

                    <div className="hidden md:block w-px h-6 bg-gray-100"></div>

                    {/* Loss Limit */}
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-[10px] font-bold text-gray-400 uppercase w-16 md:w-auto">Min Loss:</span>
                        <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 flex-1 md:flex-none">
                            <span className="text-xs font-bold text-gray-400 mr-1">$</span>
                            <input 
                                type="number"
                                className="w-16 text-xs font-bold text-gray-900 bg-transparent outline-none placeholder:text-gray-300"
                                placeholder="Any"
                                value={profitThreshold === 0 ? '' : profitThreshold}
                                onChange={(e) => setProfitThreshold(parseFloat(e.target.value) || 0)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ACTIVE FILTERS BREADCRUMBS */}
            {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-2 px-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Active:</span>
                    {healthFilter !== 'ALL' && <ActiveFilterTag label={`Status: ${healthFilter}`} onClear={() => setHealthFilter('ALL')} />}
                    {showLossesOnly && <ActiveFilterTag label="Losses Only" onClear={() => setShowLossesOnly(false)} />}
                    {profitThreshold > 0 && <ActiveFilterTag label={`Min Loss: $${profitThreshold}`} onClear={() => setProfitThreshold(0)} />}
                    {filterType !== 'ALL' && <ActiveFilterTag label={`Type: ${PRODUCT_CONFIGS[filterType].label}`} onClear={() => setFilterType('ALL')} />}
                    {searchQuery && <ActiveFilterTag label={`Search: "${searchQuery}"`} onClear={() => setSearchQuery('')} />}
                    {marketplaceFilter.etsy && <ActiveFilterTag label="Etsy Only" onClear={() => setMarketplaceFilter(p => ({...p, etsy: false}))} />}
                    {marketplaceFilter.shopify && <ActiveFilterTag label="Shopify Only" onClear={() => setMarketplaceFilter(p => ({...p, shopify: false}))} />}
                    <button onClick={clearAllFilters} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline ml-2">Clear All</button>
                </div>
            )}

            {/* CATEGORY CHIPS ROW (Scrollable on Mobile) */}
            <div className="flex items-center gap-4 border-t border-gray-100 pt-4 overflow-x-auto no-scrollbar md:overflow-visible">
                <div className="flex gap-2 min-w-max px-1">
                    <FilterChip label="All Types" value="ALL" current={filterType} onClick={(v) => setFilterType(v as any)} />
                    <FilterChip label="Rings" value="RING" current={filterType} onClick={(v) => setFilterType(v as any)} />
                    <FilterChip label="Necklaces" value="NECKLACE" current={filterType} onClick={(v) => setFilterType(v as any)} />
                    <FilterChip label="Bracelets" value="BRACELET" current={filterType} onClick={(v) => setFilterType(v as any)} />
                    <FilterChip label="Piercings" value="EARRING" current={filterType} onClick={(v) => setFilterType(v as any)} />
                </div>
                
                {/* Secondary Actions (Right Aligned on Desktop) */}
                <div className="flex-1"></div>
                <div className="hidden md:flex items-center gap-2">
                    <div className="flex items-center bg-white rounded-lg p-0.5 border border-gray-200 shadow-sm">
                        <button onClick={handleImportClick} className="p-1.5 hover:bg-gray-50 rounded-md text-gray-500 hover:text-gray-800 transition-all" title="Import"><Upload size={14}/></button>
                        <div className="w-px h-3 bg-gray-200 mx-0.5"></div>
                        <button onClick={handleExport} disabled={selectedIds.size === 0} className={`p-1.5 rounded-md transition-all ${selectedIds.size > 0 ? 'hover:bg-gray-50 text-blue-600' : 'text-gray-300 cursor-not-allowed'}`} title="Export"><Download size={14}/></button>
                    </div>
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                        <ArrowUpDown size={14} className="text-gray-400" />
                        <select className="text-xs font-bold bg-transparent border-none p-0 focus:ring-0 text-gray-600 cursor-pointer w-28 outline-none" value={sortType} onChange={(e) => setSortType(e.target.value as any)}>
                            <option value="DATE_DESC">Newest</option>
                            <option value="DATE_ASC">Oldest</option>
                            <option value="NAME_ASC">Name A-Z</option>
                            <option value="PROFIT_ASC">Lowest Profit</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        {/* Global Gold Price Modal */}
        {isGoldModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-gradient-to-b from-orange-400 to-orange-500 p-8 text-white text-center">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
                            <Coins size={24} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold">Store Gold Rate</h3>
                        <p className="text-orange-100 text-sm mt-1">Updates calculations for this store.</p>
                    </div>
                    <div className="p-8">
                        <div className="mb-6">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Price per Gram (24K)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-lg">$</span>
                                <input 
                                    type="number" 
                                    className="w-full pl-9 pr-4 py-4 text-2xl font-bold text-gray-900 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-100 focus:border-orange-500 outline-none transition-all shadow-sm"
                                    value={modalGoldPrice}
                                    onChange={(e) => setModalGoldPrice(e.target.value)}
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveGold()}
                                />
                            </div>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <button 
                                onClick={() => setIsGoldModalOpen(false)}
                                className="text-gray-500 font-bold hover:text-gray-800 px-4 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveGold}
                                className="flex-1 bg-gradient-to-b from-orange-400 to-orange-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-orange-200 hover:scale-105 transition-transform"
                            >
                                Update Rate
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* Project Grid (Unchanged Content Logic) */}
        {filteredAndSortedProjects.length === 0 ? (
           <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 md:p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-50 text-gray-400 rounded-full mb-4">
                 <FolderOpen size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">No projects found</h3>
              <p className="text-gray-500 mb-6">
                  {searchQuery ? 'Try adjusting your search.' : (showLossesOnly ? 'No projects with loss found.' : 'Create a new project to get started.')}
              </p>
              <button onClick={onNew} className="text-blue-600 font-bold hover:underline">Create New Project</button>
           </div>
        ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedProjects.map(p => {
                 const style = PRODUCT_STYLES[p.productType];
                 const isSelected = selectedIds.has(p.id);
                 const mType = p.marketplace || 'etsy';
                 let cardBorder = 'border-gray-200 hover:border-blue-200';
                 let cardBg = 'bg-white';
                 let healthBadge = null;

                 if (p._health.status === 'LOSS') {
                     cardBg = 'bg-gradient-to-br from-white via-white to-red-50';
                     cardBorder = 'border-red-200 ring-1 ring-red-50';
                     healthBadge = (<div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-red-200"><TrendingDown size={12} /> Loss Risk</div>);
                 } else if (p._health.status === 'OK') {
                     cardBg = 'bg-gradient-to-br from-white via-white to-emerald-50';
                     cardBorder = 'border-green-200 ring-1 ring-green-50';
                     healthBadge = (<div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border border-green-200"><Activity size={12} /> Healthy</div>);
                 } else {
                     cardBg = 'bg-gray-50';
                     cardBorder = 'border-gray-200';
                     healthBadge = (<div className="flex items-center gap-1 bg-gray-200 text-gray-600 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase"><AlertCircle size={12} /> Needs Setup</div>);
                 }

                 if (isSelected) { cardBorder = 'ring-2 ring-blue-500 border-blue-500'; cardBg = 'bg-white'; }

                 return (
                    <div key={p.id} onClick={() => onOpen(p.id)} className={`${cardBg} rounded-2xl border shadow-sm hover:shadow-xl transition-all duration-200 flex flex-col group relative overflow-hidden ${cardBorder}`}>
                        <div className={`absolute left-0 top-0 bottom-0 w-10 flex flex-col items-center justify-center z-10 ${mType === 'shopify' ? 'bg-emerald-500' : 'bg-orange-500'}`}>
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-black text-white shadow-sm ring-1 ring-white/20 ${mType === 'shopify' ? 'bg-emerald-700' : 'bg-orange-700'}`}>{mType === 'shopify' ? 'S' : 'E'}</div>
                        </div>
                        <div className="absolute top-4 right-4 z-20">
                            <button onClick={(e) => toggleSelect(e, p.id)} className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border-2 border-gray-200 text-transparent hover:border-blue-400'}`}><Check size={14} strokeWidth={4} /></button>
                        </div>
                        <div className="p-5 pl-14 flex flex-col h-full">
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 ${style.colorBg} rounded-2xl flex items-center justify-center ${style.colorText} shadow-sm shrink-0 group-hover:scale-105 transition-transform duration-200`}>{getProductIcon(p.productType, "w-8 h-8")}</div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1 min-w-0 mr-8" onClick={e => e.stopPropagation()}>
                                            {editingNameId === p.id ? (
                                                <div className="flex items-center gap-1 w-full relative z-20"><input className="w-full border border-blue-400 rounded-lg px-2 py-1 text-base font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 outline-none bg-white shadow-sm" value={tempName} onChange={e => setTempName(e.target.value)} autoFocus onClick={e => e.stopPropagation()} onKeyDown={e => e.key === 'Enter' && saveRenaming(e, p.id)}/><button onClick={e => saveRenaming(e, p.id)} className="bg-green-100 text-green-700 p-1.5 rounded-md hover:bg-green-200 transition-colors"><Check size={14}/></button><button onClick={(e) => { e.stopPropagation(); setEditingNameId(null); }} className="bg-red-100 text-red-700 p-1.5 rounded-md hover:bg-red-200 transition-colors"><X size={14}/></button></div>
                                            ) : (
                                                <div className="group/name flex items-center gap-2"><h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">{p.name}</h3><button onClick={(e) => startRenaming(e, p)} className="text-gray-300 hover:text-blue-500 opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hidden md:block"><Edit2 size={14} /></button></div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-y-2 gap-x-2 mt-1.5 text-xs">
                                        <div className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${style.colorBg} ${style.colorText} bg-opacity-50`}><span className="uppercase tracking-wider text-[10px]">{PRODUCT_CONFIGS[p.productType].label}</span></div>
                                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-tight ${mType === 'shopify' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-100'}`}><span className="text-[9px]">{mType === 'shopify' ? 'Shopify' : 'Etsy'}</span></div>
                                        <span className="text-gray-400 text-[10px] flex items-center gap-1 ml-auto sm:ml-0"><Calendar size={10} /> {formatDate(p.lastModified)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 min-h-[1rem]"></div>
                            {p._health.status !== 'SETUP' && (
                                <div className="mb-2">
                                    <div className="flex items-center justify-between text-xs mb-1"><span className="text-gray-500 font-medium">Est. Min Profit</span><span className={`font-mono font-bold ${p._health.status === 'LOSS' ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(p._health.minProfit)}</span></div>
                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${p._health.status === 'LOSS' ? 'bg-red-500 w-full' : 'bg-green-500 w-3/4'}`}></div></div>
                                </div>
                            )}
                            <div className="mt-2 pt-3 border-t border-gray-100/50 flex items-center justify-between text-xs text-gray-500 relative">
                                <div className="flex items-center gap-2">{healthBadge}{p.activePriceBookId && (<span className="inline-block text-[10px] bg-gray-50 border border-gray-100 px-1.5 py-0.5 rounded truncate max-w-[80px]">{p.priceBooks.find(b => b.id === p.activePriceBookId)?.name || 'Book'}</span>)}</div>
                                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                     <div className="relative"><button onClick={() => setOpenMenuId(openMenuId === p.id ? null : p.id)} className={`p-1.5 rounded-md transition-colors ${openMenuId === p.id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}><MoreVertical size={16} /></button><ActionMenu isOpen={openMenuId === p.id} onClose={() => setOpenMenuId(null)} onAction={(action) => handleMenuAction(action, p)} isArchived={!!p.isArchived} direction="up" /></div>
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
