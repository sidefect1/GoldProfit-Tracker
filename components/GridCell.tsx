
import React, { useState, useRef, useEffect } from 'react';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { ProjectSettings, CalculationResult } from '../types';
import { Edit2 } from 'lucide-react';

interface GridCellProps {
  data: CalculationResult;
  viewMode: 'price' | 'profit' | 'cost';
  thresholds: ProjectSettings['colorThresholds'];
  activeMode?: 'builder' | 'monitor' | 'marketplace';
  onOverride?: (cellData: CalculationResult, newPrice: number) => void;
  activeTooltipId?: string | null;
  onHover?: (id: string | null, data?: CalculationResult, rect?: DOMRect) => void;
  cellId?: string;
  // New props for enhanced UX
  isHighlighted?: boolean;
  zoomLevel?: number; // 0: Compact, 1: Normal, 2: Large
  onClick?: () => void;
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
    onClick
}) => {
  const [interactionState, setInteractionState] = useState<'idle' | 'selected' | 'editing'>('idle');
  const [editValue, setEditValue] = useState(data.salePrice.toString());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state if data changes externally
  useEffect(() => {
      setEditValue(data.salePrice.toString());
  }, [data.salePrice]);

  // Click Outside Listener to reset 'selected' state
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

  // Heatmap Logic
  const getBackgroundColor = (profit: number) => {
    if (profit <= thresholds.darkRed) return 'bg-red-800 text-white border-red-900';
    if (profit < thresholds.lightRed) return 'bg-red-200 text-red-900 border-red-300';
    if (profit < thresholds.lightGreen) return 'bg-green-100 text-green-800 border-green-200';
    if (profit < thresholds.darkGreen) return 'bg-green-300 text-green-900 border-green-400';
    return 'bg-green-600 text-white border-green-700'; // Super profit
  };

  const colorClass = getBackgroundColor(data.profitUSD);

  // Interaction Handlers
  const handleClick = (e: React.MouseEvent) => {
      // Trigger parent click for highlighting
      if (onClick) onClick();

      // Only allow edit in Builder mode when in Price View (or generic override allowed)
      if (activeMode === 'builder' && onOverride) {
          e.stopPropagation(); 
          if (interactionState === 'idle') {
              setInteractionState('selected');
              if (onHover) onHover(null); // Hide tooltip when selected
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
      // Only save if number is valid AND different from original
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

  // Zoom Level Styling
  const getZoomStyles = () => {
      switch(zoomLevel) {
          case 0: return { height: 'h-8', text: 'text-[10px]', padding: 'px-1' }; // Compact
          case 2: return { height: 'h-16', text: 'text-sm', padding: 'px-3' }; // Large
          case 1: default: return { height: 'h-12', text: 'text-xs', padding: 'px-2' }; // Normal
      }
  };
  const zoomStyles = getZoomStyles();

  // Render Content
  const renderContent = () => {
    if (interactionState === 'editing') {
        return (
            <input 
                ref={inputRef}
                autoFocus
                className={`w-full h-full text-center bg-white text-gray-900 font-bold outline-none ${zoomStyles.text}`}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={handleSaveEdit}
                onKeyDown={handleKeyDown}
                onClick={e => e.stopPropagation()}
            />
        );
    }

    // If Marketplace mode, override viewMode and show the List Price
    if (activeMode === 'marketplace') {
        return (
            <span className="font-mono font-bold">{formatCurrency(data.marketplaceSalePrice)}</span>
        );
    }

    switch(viewMode) {
      case 'price': 
        return (
            <div className="flex items-center gap-1 relative z-10 justify-center">
                {/* Manual Override Indicator */}
                {data.isOverridden && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60 shadow-sm" title="Manually Set" />
                )}
                {formatCurrency(data.salePrice)}
            </div>
        );
      case 'cost': return formatCurrency(data.totalCost);
      case 'profit': 
      default:
        return (
          <div className="flex flex-col leading-tight items-center relative z-10 w-full">
            <span className="font-bold">{formatCurrency(data.profitUSD)}</span>
            {/* Hide % on compact mobile view unless zoom level is high */}
            {(zoomLevel > 0 || window.innerWidth > 640) && (
                <span className={`opacity-80 font-normal ${zoomLevel === 0 ? 'text-[8px]' : 'text-[10px]'}`}>{formatNumber(data.profitPercent, 0)}%</span>
            )}
            {data.isOverridden && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/50" />}
          </div>
        );
    }
  };

  // Custom styling
  const cellClass = activeMode === 'marketplace' 
      ? `bg-indigo-50 text-indigo-900 border-indigo-100` 
      : colorClass; 
  
  const cursorClass = (activeMode === 'builder' && interactionState !== 'editing') ? 'cursor-pointer' : 'cursor-default';

  // Selection Overlay (The "Pencil" state)
  const isSelected = interactionState === 'selected';

  // Highlight Overlay (Row/Col hover)
  const highlightOverlay = isHighlighted && !isSelected ? (
      <div className="absolute inset-0 bg-white/20 pointer-events-none z-20 mix-blend-overlay"></div>
  ) : null;

  return (
    <div 
      ref={containerRef}
      className={`relative ${zoomStyles.height} ${zoomStyles.padding} ${zoomStyles.text} flex items-center justify-center font-medium border border-white/10 transition-all ${cellClass} ${cursorClass} ${isSelected ? 'ring-2 ring-inset ring-blue-400 z-30' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      title={activeMode === 'builder' ? 'Click to Select, Click again to Edit' : undefined}
    >
      {highlightOverlay}
      
      {/* Content */}
      {renderContent()}
      
      {/* Edit Overlay (Pencil) */}
      {isSelected && (
          <div className="absolute inset-0 bg-blue-600/90 flex items-center justify-center text-white backdrop-blur-[1px] animate-in fade-in duration-100 cursor-pointer z-40">
              <Edit2 size={16} />
          </div>
      )}
    </div>
  );
};
