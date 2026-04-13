
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
  const containerId = useMemo(() => {
    const baseId = chartId || `chart-${Math.random().toString(36).substr(2, 9)}`;
    return baseId.replace(/[^a-zA-Z0-9]/g, '');
  }, [chartId]);

  const chartData = useMemo(() => {
    if (!trades || trades.length === 0) return [];

    const sortedTrades = [...trades].sort((a, b) => {
      const timeA = new Date(a.open_time || a.openTime || a.execTime || 0).getTime();
      const timeB = new Date(b.open_time || b.openTime || b.execTime || 0).getTime();
      return timeA - timeB;
    });

    const points: TradePoint[] = [];
    let cumPnL = 0;

    // Start at 0
    const firstTrade = sortedTrades[0];
    const firstTime = new Date(firstTrade.open_time || firstTrade.openTime || firstTrade.execTime || Date.now());
    const startTime = new Date(firstTime.getTime() - 1000 * 60 * 5);
    points.push({ time: format(startTime, 'HH:mm'), pnl: 0 });

    sortedTrades.forEach((trade) => {
      const pnl = parseFloat(trade.net_pnl || trade.netPnl || '0');
      const openTime = new Date(trade.open_time || trade.openTime || trade.execTime || Date.now());
      const closeTime = new Date(trade.close_time || trade.closeTime || Date.now());

      points.push({ time: format(openTime, 'HH:mm'), pnl: cumPnL });
      cumPnL += pnl;
      points.push({ time: format(closeTime, 'HH:mm'), pnl: cumPnL });
    });

    // Final trailing point
    if (sortedTrades.length > 0) {
      const lastTrade = sortedTrades[sortedTrades.length - 1];
      const lastTime = new Date(lastTrade.close_time || lastTrade.closeTime || Date.now());
      const endTime = new Date(lastTime.getTime() + 1000 * 60 * 5);
      points.push({ time: format(endTime, 'HH:mm'), pnl: cumPnL });
    }

    return points;
  }, [trades]);

  const allPnL = chartData.map(d => d.pnl);
  const minPnL = chartData.length > 0 ? Math.min(...allPnL) : 0;
  const maxPnL = chartData.length > 0 ? Math.max(...allPnL) : 0;

  const adjustedMin = Math.min(minPnL, 0);
  const adjustedMax = Math.max(maxPnL, 0);
  const vMargin = Math.max((adjustedMax - adjustedMin) * 0.12, 10);
  const domainMin = adjustedMin - vMargin;
  const domainMax = adjustedMax + vMargin;

  // `off` = percentage from top (0%) where the zero line sits in the chart.
  // y=0 in chart space → rendered at (domainMax / totalRange) from the TOP.
  const off = useMemo(() => {
    const totalRange = domainMax - domainMin;
    if (totalRange <= 0) return 0.5;
    // From the TOP: 0 = very top, 1 = very bottom.
    return (domainMax / totalRange);
  }, [domainMax, domainMin]);

  const lastValue = chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;

  if (chartData.length === 0) return null;

  const WIN = '#22c55e';
  const LOSS = '#ef4444';
  const offPct = `${(off * 100).toFixed(2)}%`;

  return (
    <div className={cn('w-full mt-2', className)}>
      <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Running P&L</p>
      <div className="h-[160px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <defs>
              {/* Fill gradient: green above zero line, red below */}
              <linearGradient id={`${containerId}-fill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WIN} stopOpacity={0.35} />
                <stop offset={offPct} stopColor={WIN} stopOpacity={0.04} />
                <stop offset={offPct} stopColor={LOSS} stopOpacity={0.04} />
                <stop offset="100%" stopColor={LOSS} stopOpacity={0.35} />
              </linearGradient>
              {/* Stroke gradient: green above, red below */}
              <linearGradient id={`${containerId}-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WIN} stopOpacity={1} />
                <stop offset={offPct} stopColor={WIN} stopOpacity={1} />
                <stop offset={offPct} stopColor={LOSS} stopOpacity={1} />
                <stop offset="100%" stopColor={LOSS} stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }}
              minTickGap={40}
            />
            <YAxis
              hide
              domain={[domainMin, domainMax]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '11px',
                fontWeight: 700,
              }}
              itemStyle={{ color: lastValue >= 0 ? WIN : LOSS }}
              labelStyle={{ color: 'rgba(255,255,255,0.4)', fontSize: '9px' }}
              formatter={(value: number) => [`${value >= 0 ? '+' : ''}$${value.toFixed(2)}`, 'P&L']}
            />
            {/* Zero reference line — solid neutral gray */}
            <ReferenceLine y={0} stroke="rgba(156,163,175,0.6)" strokeWidth={1.5} />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={`url(#${containerId}-stroke)`}
              strokeWidth={2}
              fill={`url(#${containerId}-fill)`}
              baseValue={0}
              animationDuration={1200}
              dot={false}
              activeDot={{ r: 4, fill: lastValue >= 0 ? WIN : LOSS, stroke: '#000', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
