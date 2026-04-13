
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
  // Clipped values for split rendering
  pos: number | null; // pnl when >= 0, else null
  neg: number | null; // pnl when <= 0, else null
}

interface RunningPnLChartProps {
  trades: any[];
  className?: string;
  chartId?: string;
}

export function RunningPnLChart({ trades, className, chartId }: RunningPnLChartProps) {
  const uid = useMemo(() => {
    const base = chartId || `rp-${Math.random().toString(36).substr(2, 9)}`;
    return base.replace(/[^a-zA-Z0-9]/g, '');
  }, [chartId]);

  const chartData = useMemo((): TradePoint[] => {
    if (!trades || trades.length === 0) return [];

    const sorted = [...trades].sort((a, b) => {
      const tA = new Date(a.open_time || a.openTime || a.execTime || 0).getTime();
      const tB = new Date(b.open_time || b.openTime || b.execTime || 0).getTime();
      return tA - tB;
    });

    const pts: { time: string; pnl: number }[] = [];
    let cum = 0;

    const first = sorted[0];
    const firstTime = new Date(first.open_time || first.openTime || first.execTime || Date.now());
    pts.push({ time: format(new Date(firstTime.getTime() - 5 * 60000), 'HH:mm'), pnl: 0 });

    sorted.forEach(trade => {
      const pnl = parseFloat(trade.net_pnl || trade.netPnl || '0');
      const openTime = new Date(trade.open_time || trade.openTime || trade.execTime || Date.now());
      const closeTime = new Date(trade.close_time || trade.closeTime || Date.now());

      pts.push({ time: format(openTime, 'HH:mm'), pnl: cum });
      cum += pnl;
      pts.push({ time: format(closeTime, 'HH:mm'), pnl: cum });
    });

    const last = sorted[sorted.length - 1];
    const lastTime = new Date(last.close_time || last.closeTime || Date.now());
    pts.push({ time: format(new Date(lastTime.getTime() + 5 * 60000), 'HH:mm'), pnl: cum });

    return pts.map(p => ({
      ...p,
      pos: p.pnl >= 0 ? p.pnl : 0,
      neg: p.pnl <= 0 ? p.pnl : 0,
    }));
  }, [trades]);

  const allVals = chartData.map(d => d.pnl);
  const minV = chartData.length > 0 ? Math.min(...allVals) : 0;
  const maxV = chartData.length > 0 ? Math.max(...allVals) : 0;

  const adjMin = Math.min(minV, 0);
  const adjMax = Math.max(maxV, 0);
  const margin = Math.max((adjMax - adjMin) * 0.12, 5);
  const domMin = adjMin - margin;
  const domMax = adjMax + margin;

  // Fraction from TOP where the zero-line sits (SVG Y goes top→bottom)
  // zero_frac = domMax / (domMax - domMin)
  const zeroFrac = useMemo(() => {
    const span = domMax - domMin;
    if (span <= 0) return 0.5;
    return domMax / span;
  }, [domMax, domMin]);

  const zPct = `${(zeroFrac * 100).toFixed(1)}%`;

  const lastVal = chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;

  if (chartData.length === 0) return null;

  const WIN = '#22c55e';
  const LOSS = '#ef4444';

  return (
    <div className={cn('w-full', className)}>
      <p className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">Running P&L</p>
      <div className="h-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, left: 0, bottom: 0 }}>
            <defs>
              {/* GREEN zone fill: from top down to zero-line */}
              <linearGradient id={`${uid}-gfill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WIN} stopOpacity={0.25} />
                <stop offset={zPct} stopColor={WIN} stopOpacity={0.04} />
                <stop offset={zPct} stopColor={WIN} stopOpacity={0} />
                <stop offset="100%" stopColor={WIN} stopOpacity={0} />
              </linearGradient>

              {/* RED zone fill: from zero-line down */}
              <linearGradient id={`${uid}-rfill`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LOSS} stopOpacity={0} />
                <stop offset={zPct} stopColor={LOSS} stopOpacity={0.04} />
                <stop offset={zPct} stopColor={LOSS} stopOpacity={0.25} />
                <stop offset="100%" stopColor={LOSS} stopOpacity={0.25} />
              </linearGradient>

              {/* Stroke gradient: green above zero, red below */}
              <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={WIN} stopOpacity={1} />
                <stop offset={zPct} stopColor={WIN} stopOpacity={1} />
                <stop offset={zPct} stopColor={LOSS} stopOpacity={1} />
                <stop offset="100%" stopColor={LOSS} stopOpacity={1} />
              </linearGradient>
            </defs>

            <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="rgba(255,255,255,0.04)" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.22)' }}
              minTickGap={40}
            />
            <YAxis hide domain={[domMin, domMax]} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#18181b',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.08)',
                fontSize: '11px',
                fontWeight: 700,
                padding: '6px 10px',
              }}
              itemStyle={{ color: lastVal >= 0 ? WIN : LOSS }}
              labelStyle={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px', marginBottom: 2 }}
              formatter={(value: number) => [`${value >= 0 ? '+' : ''}$${value.toFixed(2)}`, 'P&L']}
            />
            {/* Zero reference line */}
            <ReferenceLine y={0} stroke="rgba(160,160,180,0.5)" strokeWidth={1.5} />

            {/* GREEN area — positive zone */}
            <Area
              type="monotone"
              dataKey="pos"
              stroke="none"
              fill={`url(#${uid}-gfill)`}
              baseValue={0}
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />

            {/* RED area — negative zone */}
            <Area
              type="monotone"
              dataKey="neg"
              stroke="none"
              fill={`url(#${uid}-rfill)`}
              baseValue={0}
              isAnimationActive={false}
              dot={false}
              activeDot={false}
            />

            {/* Main line — color changes at zero */}
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={`url(#${uid}-stroke)`}
              strokeWidth={2}
              fill="none"
              baseValue={0}
              animationDuration={900}
              dot={false}
              activeDot={{ r: 4, fill: lastVal >= 0 ? WIN : LOSS, stroke: '#111', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
