'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Info } from 'lucide-react';

interface CsvTradeData {
  Date?: string;
  NetPnL?: string;
}

interface DrawdownChartProps {
  data: CsvTradeData[];
  initialBalance: number;
}

export function DrawdownChart({ data, initialBalance }: DrawdownChartProps) {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const dailyPnL: Record<string, number> = {};
    data.forEach(trade => {
      const date = trade.Date;
      const pnl = parseFloat(trade.NetPnL || '0');
      if (date && !isNaN(pnl)) {
        dailyPnL[date] = (dailyPnL[date] || 0) + pnl;
      }
    });

    const sortedDates = Object.keys(dailyPnL).sort();
    let currentBalance = initialBalance;
    let peak = initialBalance;
    
    return sortedDates.map(date => {
      currentBalance += dailyPnL[date];
      if (currentBalance > peak) peak = currentBalance;
      const drawdownValue = currentBalance - peak;
      const drawdownPercent = peak > 0 ? (drawdownValue / peak) * 100 : 0;
      
      return {
        date,
        drawdown: drawdownValue,
        drawdownPercent: drawdownPercent.toFixed(2),
        displayDate: date
      };
    });
  }, [data, initialBalance]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const pct = payload[0].payload.drawdownPercent;
      const date = payload[0].payload.displayDate;
      return (
        <div className="bg-popover/90 backdrop-blur-xl border border-border p-3 rounded-xl shadow-2xl">
          <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">{date}</p>
          <p className="text-sm font-black text-red-400">
            {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col bg-card border-border shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 blur-3xl rounded-full" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-between">
          Relative Drawdown
          <Info className="h-3 w-3 opacity-30 cursor-pointer" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow pt-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="drawdownFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted-foreground/5" />
            <XAxis dataKey="date" hide />
            <YAxis 
               tick={{ fill: 'currentColor', fontSize: 9, fontWeight: 700, className: 'text-muted-foreground/40' }}
               axisLine={false}
               tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
               type="monotone" 
               dataKey="drawdown" 
               stroke="#ef4444" 
               strokeWidth={2} 
               fillOpacity={1} 
               fill="url(#drawdownFill)"
               isAnimationActive={true}
               animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
