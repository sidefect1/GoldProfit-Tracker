
import React, { useLayoutEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { CalculationResult } from '../types';
import { X, ArrowRight } from 'lucide-react';

interface TooltipProps {
  data: CalculationResult;
  targetRect: DOMRect;
  mode: 'hover' | 'pinned';
  onClose?: () => void;
}

interface Position {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
  arrowLeft?: number;
  arrowTop?: number;
}

const TOOLTIP_OFFSET_HOVER = 10;
const TOOLTIP_OFFSET_PINNED = 12;
const VIEWPORT_PADDING = 8;

export const Tooltip: React.FC<TooltipProps> = ({ data, targetRect, mode, onClose }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position | null>(null);

  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;

    const el = tooltipRef.current;
    const { width: tw, height: th } = el.getBoundingClientRect();
    const { top: rt, left: rl, width: rw, height: rh } = targetRect;
    
    // Viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const offset = mode === 'hover' ? TOOLTIP_OFFSET_HOVER : TOOLTIP_OFFSET_PINNED;

    // Candidates
    const candidates: { p: 'right' | 'left' | 'top' | 'bottom'; top: number; left: number }[] = [
        // Right-Start
        { p: 'right', top: rt, left: rl + rw + offset },
        // Left-Start
        { p: 'left', top: rt, left: rl - tw - offset },
        // Top-Center (Mobile/Fallback)
        { p: 'top', top: rt - th - offset, left: rl + (rw/2) - (tw/2) },
        // Bottom-Center
        { p: 'bottom', top: rt + rh + offset, left: rl + (rw/2) - (tw/2) }
    ];

    let bestPos = candidates[0];
    let found = false;

    // Find first fitting position
    for (const cand of candidates) {
        // Check Horizontal
        if (cand.left >= VIEWPORT_PADDING && cand.left + tw <= vw - VIEWPORT_PADDING) {
             // Check Vertical
             if (cand.top >= VIEWPORT_PADDING && cand.top + th <= vh - VIEWPORT_PADDING) {
                 bestPos = cand;
                 found = true;
                 break;
             }
        }
    }

    // If no perfect fit, fallback logic:
    if (!found) {
        // Prefer Top/Bottom on mobile widths
        if (vw < 640) {
             const topCand = candidates[2];
             const botCand = candidates[3];
             // Pick whichever has more vertical space
             if (rt > vh / 2) bestPos = topCand; 
             else bestPos = botCand;
        } else {
             // Desktop: Stick to Right/Left logic if possible
             // Fallback: If right doesn't fit, try left. If left doesn't fit, try top.
             const leftCand = candidates[1];
             if (leftCand.left >= VIEWPORT_PADDING && leftCand.left + tw <= vw) {
                 bestPos = leftCand;
             } else {
                 bestPos = candidates[2]; // Fallback to Top
             }
        }
    }

    // Clamp to viewport to ensure it's never off-screen
    let finalLeft = Math.max(VIEWPORT_PADDING, Math.min(bestPos.left, vw - tw - VIEWPORT_PADDING));
    let finalTop = Math.max(VIEWPORT_PADDING, Math.min(bestPos.top, vh - th - VIEWPORT_PADDING));

    // Calculate Arrow Position relative to tooltip box
    let arrowLeft: number | undefined;
    let arrowTop: number | undefined;

    if (bestPos.p === 'left' || bestPos.p === 'right') {
        // Arrow vertically centered to the *target* center, clamped to tooltip height
        const targetCenterY = rt + rh / 2;
        const relativeY = targetCenterY - finalTop;
        arrowTop = Math.max(10, Math.min(relativeY, th - 10)); // Keep arrow within radius
    } else {
        // Arrow horizontally centered to *target* center
        const targetCenterX = rl + rw / 2;
        const relativeX = targetCenterX - finalLeft;
        arrowLeft = Math.max(10, Math.min(relativeX, tw - 10));
    }

    setPosition({
        top: finalTop,
        left: finalLeft,
        placement: bestPos.p,
        arrowLeft,
        arrowTop
    });

  }, [targetRect, mode]);

  // --- CONTENT RENDERING ---

  const renderHoverContent = () => (
      <div className="space-y-2 min-w-[140px]">
          <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-slate-400">Net Profit</span>
              <span className={`font-bold ${data.profitUSD >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatCurrency(data.profitUSD)}
              </span>
          </div>
          <div className="flex justify-between items-center text-xs">
              <span className="text-gray-500 dark:text-slate-400">Margin</span>
              <span className={`font-bold ${data.profitPercent >= 20 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-700 dark:text-slate-200'}`}>
                  {formatNumber(data.profitPercent, 1)}%
              </span>
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-[10px]">
              <span className="text-gray-400 dark:text-slate-500">Total Fees</span>
              <span className="text-gray-600 dark:text-slate-300 font-medium">{formatCurrency(data.commissionCost)}</span>
          </div>
      </div>
  );

  const renderPinnedContent = () => (
      <div className="min-w-[260px] max-w-[300px]">
          <div className="flex items-start justify-between mb-3 border-b border-gray-100 dark:border-white/10 pb-2">
              <div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                      {data.karat} Gold <ArrowRight size={12} className="text-gray-400"/> {data.width}mm
                  </h4>
                  <div className="text-[10px] text-gray-500 dark:text-slate-400 mt-0.5">Size {data.size} • {formatNumber(data.estimatedGram, 2)}g</div>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                  <X size={14} />
              </button>
          </div>

          <div className="space-y-1.5 text-xs max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
              <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Metal Cost (24K Basis)</span>
                  <span className="font-mono text-gray-700 dark:text-slate-200">{formatCurrency(data.metalCost)}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Labor</span>
                  <span className="font-mono text-gray-700 dark:text-slate-200">{formatCurrency(data.laborCost)}</span>
              </div>
              <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Shipping/Pack/Ads</span>
                  <span className="font-mono text-gray-700 dark:text-slate-200">{formatCurrency(data.otherCosts)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-dashed border-gray-200 dark:border-white/10 mt-1">
                  <span className="font-bold text-gray-700 dark:text-slate-300">Base Cost</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{formatCurrency(data.baseCost)}</span>
              </div>
              
              <div className="py-2"></div>

              <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-slate-400">Marketplace Fee</span>
                  <span className="font-mono text-gray-700 dark:text-slate-200">{formatCurrency(data.commissionCost)}</span>
              </div>
              <div className="flex justify-between bg-blue-50 dark:bg-blue-900/20 p-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30">
                  <span className="font-bold text-blue-800 dark:text-blue-300">Sale Price</span>
                  <span className="font-mono font-bold text-blue-900 dark:text-blue-100">{formatCurrency(data.salePrice)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${data.profitUSD >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                      <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 mb-0.5">Profit $</span>
                      <span className={`font-bold ${data.profitUSD >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{formatCurrency(data.profitUSD)}</span>
                  </div>
                  <div className={`p-2 rounded-lg border flex flex-col items-center justify-center ${data.profitUSD >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30' : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30'}`}>
                      <span className="text-[10px] uppercase font-bold text-gray-500 dark:text-slate-400 mb-0.5">Margin %</span>
                      <span className={`font-bold ${data.profitUSD >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>{formatNumber(data.profitPercent, 1)}%</span>
                  </div>
              </div>
          </div>
      </div>
  );

  // Arrow Styles
  const arrowClass = "absolute w-3 h-3 bg-white dark:bg-navy-900 border border-gray-200 dark:border-white/10 rotate-45 z-0";
  let arrowStyle: React.CSSProperties = {};
  
  if (position) {
      if (position.placement === 'right') {
          arrowStyle = { left: -6, top: position.arrowTop, borderRight: 'none', borderTop: 'none' };
      } else if (position.placement === 'left') {
          arrowStyle = { right: -6, top: position.arrowTop, borderLeft: 'none', borderBottom: 'none' };
      } else if (position.placement === 'top') {
          arrowStyle = { bottom: -6, left: position.arrowLeft, borderLeft: 'none', borderTop: 'none' };
      } else { // bottom
          arrowStyle = { top: -6, left: position.arrowLeft, borderRight: 'none', borderBottom: 'none' };
      }
  }

  // Render via Portal to ensure it breaks out of overflow containers
  return createPortal(
    <div 
        ref={tooltipRef}
        className={`fixed z-[9999] bg-white dark:bg-navy-900 border border-gray-200 dark:border-white/10 shadow-2xl rounded-xl text-left transition-opacity duration-150 ${mode === 'hover' ? 'pointer-events-none p-3' : 'p-4'} ${position ? 'opacity-100' : 'opacity-0'}`}
        style={{ 
            top: position?.top ?? 0, 
            left: position?.left ?? 0,
            visibility: position ? 'visible' : 'hidden'
        }}
    >
        {position && <div className={arrowClass} style={arrowStyle} />}
        <div className="relative z-10">
            {mode === 'hover' ? renderHoverContent() : renderPinnedContent()}
        </div>
    </div>,
    document.body
  );
};
