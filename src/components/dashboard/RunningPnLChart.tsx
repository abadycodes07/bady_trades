
'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Dot
} from 'recharts';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface TradePoint {
  time: string;
  pnl: number;
}

interface RunningPnLChartProps {
  trades: any[];
  className?: string;
}

export function RunningPnLChart({ trades, className }: RunningPnLChartProps) {
  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    // Sort trades by open time
    const sortedTrades = [...trades].sort((a, b) => {
      const timeA = new Date(a.open_time || a.openTime || 0).getTime();
      const timeB = new Date(b.open_time || b.openTime || 0).getTime();
      return timeA - timeB;
    });

    const points: TradePoint[] = [];
    let currentCumulativePnL = 0;

    // Start at 0 before the first trade
    if (sortedTrades.length > 0) {
        const firstTime = new Date(sortedTrades[0].open_time || sortedTrades[0].openTime || Date.now());
        const startTime = new Date(firstTime.getTime() - 1000 * 60 * 5); // 5 mins before
        points.push({
            time: format(startTime, 'HH:mm:ss'),
            pnl: 0
        });
    }

    sortedTrades.forEach((trade) => {
      const pnl = parseFloat(trade.net_pnl || trade.netPnl || '0');
      const openTime = new Date(trade.open_time || trade.openTime || Date.now());
      const closeTime = new Date(trade.close_time || trade.closeTime || Date.now());

      // Add point for trade open (at current cumulative)
      points.push({
        time: format(openTime, 'HH:mm:ss'),
        pnl: currentCumulativePnL
      });

      // Add some intermediate "movement" points if the trade lasted longer than a minute
      // This is a high-fidelity simulation of price action for visual impact as requested
      const durationMs = closeTime.getTime() - openTime.getTime();
      if (durationMs > 60000) {
          const midTime = new Date(openTime.getTime() + durationMs / 2);
          // Simulate some volatility: go 20% further or pull back
          const volatility = pnl > 0 ? pnl * 1.2 : pnl * 0.8; 
          points.push({
              time: format(midTime, 'HH:mm:ss'),
              pnl: currentCumulativePnL + volatility
          });
      }

      currentCumulativePnL += pnl;

      // Add point for trade close (at new cumulative)
      points.push({
        time: format(closeTime, 'HH:mm:ss'),
        pnl: currentCumulativePnL
      });
    });

    // End point
    if (sortedTrades.length > 0) {
        const lastTime = new Date(sortedTrades[sortedTrades.length - 1].close_time || sortedTrades[sortedTrades.length - 1].closeTime || Date.now());
        const endTime = new Date(lastTime.getTime() + 1000 * 60 * 5); // 5 mins after
        points.push({
            time: format(endTime, 'HH:mm:ss'),
            pnl: currentCumulativePnL
        });
    }

    return points;
  }, [trades]);

  const minPnL = chartData.length > 0 ? Math.min(...chartData.map(d => d.pnl)) : 0;
  const maxPnL = chartData.length > 0 ? Math.max(...chartData.map(d => d.pnl)) : 0;
  
  // ensure we have at least SOME vertical space so margin isn't 0
  const adjustedMin = Math.min(minPnL, minPnL > 0 ? 0 : -10);
  const adjustedMax = Math.max(maxPnL, maxPnL < 0 ? 0 : 10);
  const margin = (adjustedMax - adjustedMin) * 0.2;

  const domainMin = adjustedMin - margin;
  const domainMax = adjustedMax + margin;

  const off = useMemo(() => {
    if (domainMax <= 0) return 0;
    if (domainMin >= 0) return 100; // using percentages for standard CSS

    return (domainMax / (domainMax - domainMin)) * 100;
  }, [domainMax, domainMin]);

  let determinedFillType: 'allPositive' | 'allNegative' | 'mixed' | 'neutral' = 'neutral';
  if (minPnL >= 0 && maxPnL > 0) determinedFillType = 'allPositive';
  else if (maxPnL <= 0 && minPnL < 0) determinedFillType = 'allNegative';
  else if (minPnL < 0 && maxPnL > 0) determinedFillType = 'mixed';
  else if (minPnL === 0 && maxPnL === 0) determinedFillType = 'neutral';

  if (chartData.length === 0) return null;

  return (
    <div className={cn("w-full h-[200px] mt-4", className)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Running P&L</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
              {determinedFillType === 'allPositive' && (
                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
              )}
              {determinedFillType === 'allNegative' && (
                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                </linearGradient>
              )}
              {determinedFillType === 'mixed' && (
                <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.6} /> 
                  <stop offset={`${off}%`} stopColor="#10b981" stopOpacity={0.1} />
                  <stop offset={`${off}%`} stopColor="#ef4444" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
              )}
              {(determinedFillType === 'neutral') && (
                 <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--muted))" stopOpacity={0.1}/>
                 </linearGradient>
               )}
            
            <linearGradient id="lineColor" x1="0" y1="0" x2="0" y2="1">
                {(determinedFillType === 'allPositive' || determinedFillType === 'neutral') && (
                  <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                )}
                {determinedFillType === 'allNegative' && (
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                )}
                {determinedFillType === 'mixed' && (
                  <>
                    <stop offset={`${Math.max(0, off - 0.1)}%`} stopColor="#10b981" stopOpacity={1} />
                    <stop offset={`${Math.min(100, off + 0.1)}%`} stopColor="#ef4444" stopOpacity={1} />
                  </>
                )}
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="currentColor" className="text-border/30" />
          <XAxis 
            dataKey="time" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: 'currentColor' }}
            className="text-muted-foreground/40"
            minTickGap={30}
          />
          <YAxis 
            hide={false}
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 9, fontWeight: 700, fill: 'currentColor' }} 
            className="text-muted-foreground/40"
            tickFormatter={(value) => `$${value}`}
            domain={[domainMin, domainMax]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--background))', borderRadius: '12px', border: '1px solid hsl(var(--border))', fontSize: '12px', fontWeight: 'bold' }}
            itemStyle={{ color: 'hsl(var(--foreground))' }}
            labelClassName="text-muted-foreground text-[10px] uppercase font-black"
            formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']}
          />
          <ReferenceLine y={0} stroke="currentColor" className="text-border/50" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="pnl"
            stroke="url(#lineColor)"
            strokeWidth={3}
            fill="url(#splitColor)"
            animationDuration={1500}
            baseValue={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
