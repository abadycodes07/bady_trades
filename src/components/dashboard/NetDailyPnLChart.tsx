'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { format, parse, isValid } from 'date-fns';
import { Info } from 'lucide-react';

interface CsvTradeData {
  Date?: string;
  NetPnL?: string;
}

interface NetDailyPnLChartProps {
  data: CsvTradeData[];
  selectedCurrency?: { symbol: string | React.ReactNode; rate: number };
}

export function NetDailyPnLChart({ data, selectedCurrency }: NetDailyPnLChartProps) {
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

    return Object.entries(dailyPnL)
      .map(([date, pnl]) => ({
        date,
        pnl: pnl * (selectedCurrency?.rate || 1),
        formattedDate: date,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30); // Show last 30 days
  }, [data, selectedCurrency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const date = payload[0].payload.date;
      return (
        <div className="bg-popover/90 backdrop-blur-xl border border-border p-3 rounded-xl shadow-2xl">
          <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest mb-1">{date}</p>
          <p className={val >= 0 ? "text-emerald-400 font-black" : "text-red-400 font-black"}>
            {val >= 0 ? '+' : ''}{val.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col bg-card border-border shadow-2xl relative overflow-hidden group">
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-between">
          Net Daily P&L
          <Info className="h-3 w-3 opacity-30 cursor-pointer" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow pt-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-muted-foreground/5" />
            <XAxis 
              dataKey="date" 
              hide 
            />
            <YAxis 
              tick={{ fill: 'currentColor', fontSize: 9, fontWeight: 700, className: 'text-muted-foreground/40' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(128,128,128,0.05)' }} />
            <ReferenceLine y={0} stroke="currentColor" className="text-border" strokeWidth={1} />
            <Bar dataKey="pnl" radius={[4, 4, 4, 4]}>
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} 
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
