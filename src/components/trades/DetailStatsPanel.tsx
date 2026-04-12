'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Settings, Info, Star } from 'lucide-react';
import { CsvTradeData } from '@/app/(app)/dashboard/page';

interface DetailStatsPanelProps {
  trade: CsvTradeData;
  className?: string;
}

const StatRow = ({ 
  label, 
  value, 
  color, 
  isActionable = false,
  onClick
}: { 
  label: string; 
  value: React.ReactNode; 
  color?: string;
  isActionable?: boolean;
  onClick?: () => void;
}) => (
  <div className="flex items-center justify-between py-1.5 group/row">
    <span className="text-[11px] font-bold text-muted-foreground/60 uppercase tracking-tight">{label}</span>
    <span 
      onClick={onClick}
      className={cn(
        "text-[11px] font-extrabold tracking-tight transition-colors",
        color || "text-white/80",
        isActionable && "text-indigo-400 hover:text-indigo-300 cursor-pointer underline underline-offset-4 decoration-indigo-500/30"
      )}
    >
      {value}
    </span>
  </div>
);

export const DetailStatsPanel: React.FC<DetailStatsPanelProps> = ({ trade, className }) => {
  const isWin = parseFloat(trade.NetPnL || '0') > 0;
  const pips = parseFloat(trade.Pips || '0');
  
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Header Stat: Net P&L */}
      <div className="flex flex-col gap-1 px-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Net P&L</span>
          <Settings className="h-4 w-4 text-muted-foreground/30 hover:text-white/80 cursor-pointer transition-colors" />
        </div>
        <div className={cn(
          "text-4xl font-black tracking-tighter",
          isWin ? "text-[#10B981]" : "text-[#EF4444]"
        )}>
          {isWin ? '+' : '-'}${Math.abs(parseFloat(trade.NetPnL)).toFixed(2)}
        </div>
      </div>

      {/* Core Stats List */}
      <div className="flex flex-col gap-1 pt-2 border-t border-white/[0.04]">
        <StatRow label="Side" value={trade.Side?.toUpperCase()} color={trade.Side?.toLowerCase() === 'buy' ? 'text-[#10B981]' : 'text-[#EF4444]'} />
        <StatRow label="Account" value={trade.Account || 'MT5 Private'} />
        <StatRow label="Forex traded" value={trade.Qty || '0.00'} />
        <StatRow label="Pips" value={pips > 0 ? `+${pips.toFixed(1)}` : pips.toFixed(1)} color={pips > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'} />
        <StatRow label="Return Per Pip" value={`$${(Math.abs(parseFloat(trade.NetPnL)) / (Math.abs(pips) || 1)).toFixed(2)}`} />
        <StatRow label="Commissions & Fees" value={`$${parseFloat(trade.Commissions || '0') + parseFloat(trade.Fees || '0')}`} />
        <StatRow label="Total Swap" value="$0" />
        <StatRow label="Net ROI" value={`(${trade.ROI || '0.00'}%)`} color="text-muted-foreground/40" />
        <StatRow label="Gross P&L" value={`$${parseFloat(trade.GrossPnl || '0').toFixed(2)}`} />
        <StatRow label="Adjusted Cost" value={`$${(parseFloat(trade.Price || '0') * parseFloat(trade.Qty || '0')).toLocaleString()}`} />
        <StatRow label="Strategy" value={trade.Strategy || 'Select Strategy'} isActionable={true} />
      </div>

      {/* Zella Scale (Bady Scale) */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Zella Scale</span>
        </div>
        <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden flex">
          <div className="h-full bg-gradient-to-r from-red-500 via-orange-500 to-green-500" style={{ width: '65%' }} />
          <div className="h-full bg-emerald-900/40 flex-1" />
        </div>
      </div>

      {/* Price MAE / MFE */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Price MAE / MFE</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded text-[11px] font-bold text-red-400 text-center">
                $4,759.218
            </div>
            <div className="flex-1 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded text-[11px] font-bold text-green-400 text-center">
                $4,756.045
            </div>
        </div>
      </div>

      {/* Running P&L Mini Sparkline */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Running P&L</span>
        </div>
        <div className="h-8 w-full relative">
           {/* SVG Path for P&L flow */}
           <svg className="w-full h-full" viewBox="0 0 100 20" preserveAspectRatio="none">
              <path 
                d="M0 5 Q 25 2, 50 8 T 100 18" 
                fill="none" 
                stroke="url(#sparkline-grad)" 
                strokeWidth="2" 
                strokeLinecap="round" 
              />
              <defs>
                <linearGradient id="sparkline-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4F46E5" />
                  <stop offset="100%" stopColor="#EF4444" />
                </linearGradient>
              </defs>
           </svg>
        </div>
      </div>

      {/* Trade Rating */}
      <div className="flex flex-col gap-2 pt-4 border-t border-white/[0.04]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Trade Rating</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="h-4 w-4 text-white/10 hover:text-yellow-500 cursor-pointer transition-colors" />
          ))}
        </div>
      </div>
    </div>
  );
};
