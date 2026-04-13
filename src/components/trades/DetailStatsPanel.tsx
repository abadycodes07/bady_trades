'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Settings, Star, ChevronDown, Plus, Info } from 'lucide-react';
import { CsvTradeData } from '@/app/(app)/dashboard/page';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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
    <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-tight">{label}</span>
    <span 
      onClick={onClick}
      className={cn(
        "text-[10px] font-black tracking-tight transition-colors",
        color || "text-foreground/90",
        isActionable && "text-indigo-400 hover:text-indigo-300 cursor-pointer underline underline-offset-4 decoration-indigo-500/30"
      )}
    >
      {value}
    </span>
  </div>
);

const MetricBox = ({ label, value, colorClass }: { label: string; value: string; colorClass: string }) => (
    <div className={cn("flex-1 p-2 rounded-lg border bg-[var(--stats-card-hover)]/30", colorClass)}>
        <p className="text-[8px] font-black uppercase opacity-40 mb-1">{label}</p>
        <p className="text-[10px] font-black tracking-tight">{value}</p>
    </div>
);

export const DetailStatsPanel: React.FC<DetailStatsPanelProps> = ({ trade, className }) => {
  const isWin = parseFloat(trade.NetPnL || '0') > 0;
  const pips = parseFloat(trade.Pips || '0');
  
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      {/* 1. Header Stat: Net P&L */}
      <div className="flex flex-col gap-0.5 px-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Net P&L</span>
          <Settings className="h-4 w-4 text-muted-foreground/30 hover:text-foreground cursor-pointer transition-colors" />
        </div>
        <div
          className="text-3xl font-black tracking-tighter leading-none"
          style={{ color: isWin ? '#22c55e' : '#ef4444' }}
        >
          {isWin ? '+' : ''}${Math.abs(parseFloat(trade.NetPnL || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      {/* 2. Primary Stats List */}
      <div className="flex flex-col gap-0.5 py-3 border-y border-border/40">
        <StatRow label="Side" value={trade.Side?.toUpperCase()} color={trade.Side?.toLowerCase() === 'buy' ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatRow label="Account" value={trade.Account || 'Live Account'} />
        <StatRow label="Forex traded" value={trade.Qty || '0.10'} />
        <StatRow label="Pips" value={pips > 0 ? `+${pips.toFixed(1)}` : pips.toFixed(1)} color={pips > 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatRow label="Return Per Pip" value={`$${(Math.abs(parseFloat(trade.NetPnL || '0')) / (Math.abs(pips) || 1)).toFixed(2)}`} />
        <StatRow label="Commissions & Fees" value={`$${(parseFloat(trade.Commissions || '0') + parseFloat(trade.Fees || '0')).toFixed(2)}`} />
        <StatRow label="Total Swap" value="$0.00" />
        <StatRow label="Net ROI" value={`${trade.ROI || '0.00'}%`} color="text-muted-foreground/60" />
        <StatRow label="Gross P&L" value={`${parseFloat(trade.GrossPnl||'0') >= 0 ? '+' : ''}$${parseFloat(trade.GrossPnl || '0').toFixed(2)}`} color={parseFloat(trade.GrossPnl||'0') >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'} />
        <StatRow label="Strategy" value={trade.Strategy || '—'} isActionable={true} />
      </div>

      {/* 3. Baddie Scale */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Baddie Scale</span>
          <Info className="h-3 w-3 opacity-20" />
        </div>
        <div className="h-1.5 w-full bg-border/20 rounded-full overflow-hidden flex">
          <div className="h-full bg-gradient-to-r from-[var(--loss-red)] via-orange-500 to-[var(--win-green)] shadow-[0_0_10px_rgba(34,197,94,0.2)]" style={{ width: '72%' }} />
        </div>
      </div>

      {/* 4. Price MAE / MFE */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Price MAE / MFE</span>
        </div>
        <div className="flex items-center gap-2">
            <MetricBox label="MAE" value="$4,759.21" colorClass="border-[var(--loss-red)]/20 text-[var(--loss-red)]" />
            <MetricBox label="MFE" value="$4,756.04" colorClass="border-[var(--win-green)]/20 text-[var(--win-green)]" />
        </div>
      </div>

      {/* 5. Target & Risk Settings */}
      <div className="flex flex-col gap-4 py-4 border-y border-border/40">
          <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Profit Target</span>
                  <div className="flex gap-2">
                      <Select defaultValue="price">
                          <SelectTrigger className="h-8 text-[10px] font-bold bg-[var(--stats-card-hover)]/30 border-border/40 flex-1">
                              <SelectValue placeholder="Price Type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="price">Target in Price</SelectItem>
                              <SelectItem value="pips">Target in Pips</SelectItem>
                              <SelectItem value="perc">Target in %</SelectItem>
                          </SelectContent>
                      </Select>
                      <Input placeholder="0.00" className="h-8 w-20 text-[10px] font-black bg-[var(--stats-card-hover)]/30 border-border/40" />
                  </div>
              </div>

              <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Stop Loss</span>
                  <div className="flex gap-2">
                      <Select defaultValue="pips">
                          <SelectTrigger className="h-8 text-[10px] font-bold bg-[var(--stats-card-hover)]/30 border-border/40 flex-1">
                              <SelectValue placeholder="Type" />
                          </SelectTrigger>
                          <SelectContent>
                              <SelectItem value="pips">Stop in Pips</SelectItem>
                              <SelectItem value="price">Stop in Price</SelectItem>
                          </SelectContent>
                      </Select>
                      <Input placeholder="0.00" className="h-8 w-20 text-[10px] font-black bg-[var(--stats-card-hover)]/30 border-border/40" />
                  </div>
              </div>
          </div>
      </div>

      {/* 6. Secondary Metrics List */}
      <div className="flex flex-col gap-1.5">
          <StatRow label="Initial Target" value="$250.00" />
          <StatRow label="Trade Risk" value="-$100.00" color="text-[var(--loss-red)]" />
          <StatRow label="Planned R-Multiple" value="2.50R" />
          <StatRow label="Realized R-Multiple" value={`${trade.RMultiple || '1.8'}R`} color="text-indigo-400" />
          <StatRow label="Average Entry" value={`$${parseFloat(trade.Price || '0').toFixed(5)}`} />
          <StatRow label="Average Exit" value={`$${parseFloat(trade.ClosePrice || '0').toFixed(5)}`} />
          <StatRow label="Entry Time" value={trade['Exec Time'] || '10:45:12'} />
          <StatRow label="Exit Time" value={trade.CloseTime?.split(' ')[1] || '11:12:05'} />
      </div>

      {/* 7. Trade Rating */}
      <div className="flex flex-col gap-2 pt-4 border-t border-border/40">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Trade Rating</span>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className={cn("h-4 w-4 cursor-pointer transition-all", s <= 4 ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground/20")} />
          ))}
        </div>
      </div>

      {/* 8. Tags & Mistakes */}
      <div className="flex flex-col gap-4 pt-4 border-t border-border/40">
          <div className="space-y-3">
              <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Mistakes</span>
                  <Select>
                      <SelectTrigger className="h-9 text-[11px] font-extrabold bg-destructive/5 border-destructive/10 text-destructive">
                          <SelectValue placeholder="Select Mistakes" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="fomo">FOMO Entry</SelectItem>
                          <SelectItem value="revenge">Revenge Trading</SelectItem>
                          <SelectItem value="sl">Moved Stop Loss</SelectItem>
                      </SelectContent>
                  </Select>
              </div>

              <div className="space-y-1.5">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Custom Tags</span>
                  <Select>
                      <SelectTrigger className="h-9 text-[11px] font-extrabold bg-indigo-500/5 border-indigo-500/10 text-indigo-400">
                          <SelectValue placeholder="Add Tags" />
                      </SelectTrigger>
                      <SelectContent>
                          <SelectItem value="trend">Trendline Break</SelectItem>
                          <SelectItem value="hithink">High Conviction</SelectItem>
                          <SelectItem value="news">News Event</SelectItem>
                      </SelectContent>
                  </Select>
              </div>
          </div>

          <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-8 text-[9px] font-black uppercase tracking-tighter bg-[var(--stats-card-hover)]/30 border-border/40">
                  <Plus className="h-3 w-3 mr-1" /> Add Category
              </Button>
              <Button variant="outline" className="flex-1 h-8 text-[9px] font-black uppercase tracking-tighter bg-[var(--stats-card-hover)]/30 border-border/40">
                  <Settings className="h-3 w-3 mr-1" /> Manage Tags
              </Button>
          </div>
      </div>
    </div>
  );
};
