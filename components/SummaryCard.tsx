import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface SummaryCardProps {
    title: string;
    value: number;
    subtext: string;
    type: 'min' | 'max' | 'avg';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, subtext, type }) => {
    const getIcon = () => {
        if (type === 'max') return <ArrowUpRight className="text-green-500" />;
        if (type === 'min') return <ArrowDownRight className="text-red-500" />;
        return <Minus className="text-blue-500" />;
    };

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-start gap-3">
            <div className={`p-2 rounded-lg bg-gray-50`}>
                {getIcon()}
            </div>
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-gray-800 my-0.5">{formatCurrency(value)}</p>
                <p className="text-xs text-gray-400">{subtext}</p>
            </div>
        </div>
    );
};