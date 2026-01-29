
import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { ProjectSettings, CalculationResult, ManualOverridePolicy } from '../types';
import { Edit2, Lock, Star } from 'lucide-react';

interface GridCellProps {
  data: CalculationResult;
  viewMode: 'price' | 'profit' | 'cost';
  thresholds: ProjectSettings['colorThresholds'];
  activeMode?: 'builder' | 'monitor' | 'marketplace';
  onOverride?: (cellData: CalculationResult, newPrice: number) => void;
  activeTooltipId?: string | null;
  onHover?: (id: string | null, data?: CalculationResult, rect?: DOMRect) => void;
  cellId?: string;
  isHighlighted?: boolean;
  zoomLevel?: number; // 0: Compact, 1: Normal, 2: Large
  onClick?: (rect: DOMRect) => void;
  overridePolicy?: ManualOverridePolicy;
  isPinned?: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ 
    data, 
    viewMode, 
    thresholds, 
    activeMode = 'builder', 
    onOverride,
    onHover,
    cellId,
    isHighlighted = false,
    zoomLevel = 1,
    onClick,
    overridePolicy = 'ASK',
    isPinned = false
}) => {
  const [interactionState, setInteractionState] = useState<'idle' | 'selected' | 'editing'>('idle');
  const [editValue, setEditValue] = useState(data.salePrice.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      setEditValue(data.salePrice.toString());
  }, [data.salePrice]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
              if (interactionState === 'selected') {
                  setInteractionState('idle');
              }
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [interactionState]);

  const getBackgroundColor = (profit: number) => {
    if (profit <= thresholds.darkRed) return 'bg-red-800 text-white border-red-900';
    if (profit < thresholds.lightRed) return 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100 border-red-300 dark:border-red-800';
    if (profit < thresholds.lightGreen) return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 border-green-200 dark:border-green-800';
    if (profit < thresholds.darkGreen) return 'bg-green-300 dark:bg-green-800 text-green-900 dark:text-green-50 border-green-400 dark:border-green-700';
    return 'bg-green-600 dark:bg-green-700 text-white border-green-700 dark:border-green-600';
  };

  const colorClass = getBackgroundColor(data.profitUSD);

  const handleClick = (e: React.MouseEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect && onClick) {
          onClick(rect);
      }

      if (activeMode === 'builder' && onOverride) {
          e.stopPropagation(); 
          if (interactionState === 'idle') {
              setInteractionState('selected');
              if (onHover) onHover(null); 
          } else if (interactionState === 'selected') {
              setInteractionState('editing');
          }
      }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
      if (onHover && cellId && interactionState === 'idle') {
          const rect = e.currentTarget.getBoundingClientRect();
          onHover(cellId, data, rect);
      }
  };

  const handleMouseLeave = () => {
      if (onHover) {
          onHover(null);
      }
  };

  const handleSaveEdit = () => {
      const val = parseFloat(editValue);
      if (!isNaN(val) && onOverride && val !== data.salePrice) {
          onOverride(data, val);
      }
      setInteractionState('idle');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSaveEdit();
      if (e.key === 'Escape') {
          setEditValue(data.salePrice.toString());
          setInteractionState('idle');
      }
  };

  const getZoomStyles = () => {
      switch(zoomLevel) {
          case 0: return { height: 'h-8', text: 'text-[10px]', padding: 'px-1' }; 
          case 2: return { height: 'h-16', text: 'text-sm', padding: 'px-3' }; 
          case 1: default: return { height: 'h-12', text: 'text-xs', padding: 'px-2' }; 
      }
  };
  const zoomStyles = getZoomStyles();

  const renderContent = () => {
    if (interactionState === 'editing') {
        return (
            <input 
                ref={inputRef}
                autoFocus
                className={`w-full h-full text-center bg-white dark:bg-navy-950 text-gray-900 dark:text-white font-bold outline-none ${zoomStyles.text}`}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
            />
        );
    }

    if (activeMode === 'marketplace') {
        return (
            <span className="font-mono font-bold">{formatCurrency(data.marketplaceSalePrice)}</span>
        );
    }

    switch(viewMode) {
      case 'price': 
        return (
            <div className="flex items-center gap-1 relative z-10 justify-center">
                {formatCurrency(data.salePrice)}
                {data.isOverridden && (
                    <div className="ml-0.5" title={overridePolicy === 'KEEP_ALL' ? "Manual override (kept by session policy)" : "Manual override exists"}>
                        {overridePolicy === 'KEEP_ALL' ? (
                            <Lock size={10} className="text-gold-600 dark:text-gold-300 opacity-80" />
                        ) : (
                            <Star size={10} className="text-gold-600 dark:text-gold-300 opacity-80" fill="currentColor" />
                        )}
                    </div>
                )}
            </div>
        );
      case 'cost': return formatCurrency(data.totalCost);
      case 'profit': 
      default:
        return (
          <div className="flex flex-col leading-tight items-center relative z-10 w-full">
            <span className="font-bold">{formatCurrency(data.profitUSD)}</span>
            {(zoomLevel > 0 || window.innerWidth > 640) && (
                <span className={`opacity-80 font-normal ${zoomLevel === 0 ? 'text-[8px]' : 'text-[10px]'}`}>{formatNumber(data.profitPercent, 0)}%</span>
            )}
            {data.isOverridden && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/50" />}
          </div>
        );
    }
  };

  const cellClass = activeMode === 'marketplace' 
      ? `bg-indigo-50 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100 border-indigo-100 dark:border-indigo-800` 
      : colorClass; 
  
  const cursorClass = (activeMode === 'builder' && interactionState !== 'editing') ? 'cursor-pointer' : 'cursor-default';
  const isSelected = interactionState === 'selected';

  const highlightOverlay = isHighlighted && !isSelected ? (
      <div className="absolute inset-0 bg-white/20 dark:bg-white/5 pointer-events-none z-20 mix-blend-overlay"></div>
  ) : null;

  // Persistent Pin Highlight
  const pinOverlay = isPinned && !isSelected ? (
      <div className="absolute inset-0 ring-2 ring-inset ring-gold-500/60 dark:ring-gold-400/60 pointer-events-none z-20"></div>
  ) : null;

  return (
    <div 
      ref={containerRef}
      className={`relative ${zoomStyles.height} ${zoomStyles.padding} ${zoomStyles.text} flex items-center justify-center font-medium border border-white/10 transition-all ${cellClass} ${cursorClass} ${isSelected ? 'ring-2 ring-inset ring-blue-400 dark:ring-gold-400 z-30' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={activeMode === 'builder' ? 'Click to Select/Pin Details' : undefined}
    >
      {highlightOverlay}
      {pinOverlay}
      {renderContent()}
      {isSelected && (
          <div className="absolute inset-0 bg-blue-600/90 dark:bg-gold-600/90 flex items-center justify-center text-white backdrop-blur-[1px] animate-in fade-in duration-100 cursor-pointer z-40">
              <Edit2 size={16} />
          </div>
      )}
    </div>
  );
};
