
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
  chartId?: string;
}

export function RunningPnLChart({ trades, className, chartId }: RunningPnLChartProps) {
  const containerId = useMemo(() => chartId || `chart-${Math.random().toString(36).substr(2, 9)}`, [chartId]);
  
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
      const durationMs = closeTime.getTime() - openTime.getTime();
      if (durationMs > 60000) {
          const midTime = new Date(openTime.getTime() + durationMs / 2);
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

  const minPnLValue = chartData.length > 0 ? Math.min(...chartData.map(d => d.pnl)) : 0;
  const maxPnLValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.pnl)) : 0;
  
  // Adjusted baseline for the zero line
  const adjustedMin = Math.min(minPnLValue, 0);
  const adjustedMax = Math.max(maxPnLValue, 0);
  
  // Domain with padding
  const vMargin = Math.max((adjustedMax - adjustedMin) * 0.1, 10);
  const domainMin = adjustedMin - vMargin;
  const domainMax = adjustedMax + vMargin;

  // offset for the zero line (inverse for SVG coordinates)
  const off = useMemo(() => {
    const totalRange = domainMax - domainMin;
    if (totalRange <= 0) return 0.5;
    return (domainMax / totalRange) * 100;
  }, [domainMax, domainMin]);

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;

  // Determine fill strategy
  let fillType: 'positive' | 'negative' | 'mixed' = 'mixed';
  if (minPnLValue >= 0 && maxPnLValue > 0) fillType = 'positive';
  else if (maxPnLValue <= 0 && minPnLValue < 0) fillType = 'negative';
  else if (minPnLValue < 0 && maxPnLValue > 0) fillType = 'mixed';

  if (chartData.length === 0) return null;

  return (
    <div className={cn("w-full h-[200px] mt-4", className)}>
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 mb-2">Running P&L</p>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <defs>
            {/* Split Gradient based on the zero line offset */}
            <linearGradient id={`${containerId}-splitColor`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#10b981" stopOpacity={0.4} />
              <stop offset={`${off}%`} stopColor="#10b981" stopOpacity={0.05} />
              <stop offset={`${off}%`} stopColor="#ef4444" stopOpacity={0.05} />
              <stop offset={1} stopColor="#ef4444" stopOpacity={0.4} />
            </linearGradient>
            
            <linearGradient id={`${containerId}-lineColor`} x1="0" y1="0" x2="0" y2="1">
              <stop offset={0} stopColor="#10b981" stopOpacity={1} />
              <stop offset={`${off}%`} stopColor="#10b981" stopOpacity={1} />
              <stop offset={`${off}%`} stopColor="#ef4444" stopOpacity={1} />
              <stop offset={1} stopColor="#ef4444" stopOpacity={1} />
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
            stroke={`url(#${containerId}-lineColor)`}
            strokeWidth={3}
            fill={`url(#${containerId}-splitColor)`}
            animationDuration={1500}
            baseValue={0}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
