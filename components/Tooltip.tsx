
import React, { useRef, useLayoutEffect, useState } from 'react';
import { formatCurrency, formatNumber } from '../utils/calculations';
import { CalculationResult } from '../types';

interface TooltipProps {
  data: CalculationResult;
  targetRect?: DOMRect;
  placement?: 'top' | 'bottom';
  align?: 'left' | 'center' | 'right';
}

const TooltipRow = ({ label, value, isCurrency = true, highlight = false, subLabel }: { label: string, value: string | number, isCurrency?: boolean, highlight?: boolean, subLabel?: string }) => (
  <div className={`flex justify-between text-xs ${highlight ? 'font-bold text-gray-900 mt-1 pt-1 border-t border-gray-200' : 'text-gray-600'}`}>
    <div className="flex flex-col">
       <span>{label}</span>
       {subLabel && <span className="text-[9px] text-gray-400 font-normal">{subLabel}</span>}
    </div>
    <span className="font-mono">{isCurrency && typeof value === 'number' ? formatCurrency(value) : value}</span>
  </div>
);

export const Tooltip: React.FC<TooltipProps> = ({ data, targetRect, placement: initialPlacement = 'top' }) => {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 });

  useLayoutEffect(() => {
    if (!targetRect || !tooltipRef.current) return;
    const tooltip = tooltipRef.current;
    const { width: tipWidth, height: tipHeight } = tooltip.getBoundingClientRect();
    const gap = 8;
    let top = 0;
    let left = targetRect.left + (targetRect.width / 2) - (tipWidth / 2);

    if (left < 10) left = 10;
    if (left + tipWidth > window.innerWidth - 10) left = window.innerWidth - tipWidth - 10;

    const spaceAbove = targetRect.top;
    const computedPlacement = spaceAbove < tipHeight + 20 ? 'bottom' : 'top';

    if (computedPlacement === 'top') {
        top = targetRect.top - tipHeight - gap;
    } else {
        top = targetRect.bottom + gap;
    }

    setStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
        pointerEvents: 'none',
        zIndex: 9999
    });
  }, [targetRect, initialPlacement]);

  if (!targetRect) return null;

  return (
    <div 
        ref={tooltipRef}
        style={style}
        className="bg-white border border-gray-200 shadow-2xl rounded-lg w-72 text-left transition-opacity duration-75 p-3"
    >
      <div className="mb-2 font-semibold text-gray-800 text-sm border-b pb-1">
        {data.karat} | {data.width}mm | Size {data.size}
      </div>
      
      <div className="space-y-1">
        <TooltipRow label="Weight" value={`${formatNumber(data.estimatedGram, 2)}g`} isCurrency={false} />
        
        {/* METAL COST - ARTIK SADECE GRAMAJ x ALTIN FIYATI */}
        <TooltipRow 
            label={`Metal Cost (${formatNumber(data.estimatedGram, 2)}g × $${formatNumber(data.goldPriceUsed, 2)})`}
            subLabel={`24K Pure Gold Basis`}
            value={data.metalCost} 
        />
        
        <TooltipRow label="Labor Cost" value={data.laborCost} />
        <TooltipRow label="Ship/Pack/Ads" value={data.otherCosts} />
        <TooltipRow label="Platform Fee" value={data.commissionCost} />
        <TooltipRow label="Total Cost" value={data.totalCost} highlight />
        <TooltipRow label="Sale Price" value={data.salePrice} />
        <div className={`flex justify-between text-xs font-bold mt-2 pt-2 border-t border-gray-300 ${data.profitUSD < 0 ? 'text-red-600' : 'text-green-600'}`}>
          <span>Net Profit</span>
          <span className="font-mono">
            {formatCurrency(data.profitUSD)} ({formatNumber(data.profitPercent, 1)}%)
          </span>
        </div>
      </div>
    </div>
  );
};
