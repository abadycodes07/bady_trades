'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format, parse, isValid, compareAsc } from 'date-fns';
import { Info } from 'lucide-react';

interface CsvTradeData {
  Date?: string;
  NetPnL?: string;
}

interface AccountBalanceChartProps {
  data: CsvTradeData[];
  initialBalance: number;
  selectedCurrency?: { symbol: string | React.ReactNode; rate: number };
}

export function AccountBalanceChart({ data, initialBalance, selectedCurrency }: AccountBalanceChartProps) {
  const chartData = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [{ date: 'Initial', balance: initialBalance }];
    }

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
    const points = sortedDates.map(date => {
      currentBalance += dailyPnL[date];
      return {
        date,
        balance: currentBalance * (selectedCurrency?.rate || 1),
        displayDate: date
      };
    });

    return [{ date: 'Start', balance: initialBalance * (selectedCurrency?.rate || 1), displayDate: 'Initial' }, ...points];
  }, [data, initialBalance, selectedCurrency]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const val = payload[0].value;
      const date = payload[0].payload.displayDate;
      return (
        <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl">
          <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">{date}</p>
          <p className="text-sm font-black text-white">
            {val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="h-full flex flex-col bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-between">
          Account Balance
          <Info className="h-3 w-3 opacity-30 cursor-pointer" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow pt-0 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" hide />
            <YAxis 
               tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700 }}
               axisLine={false}
               tickLine={false}
               domain={['dataMin - 100', 'dataMax + 100']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
               type="monotone" 
               dataKey="balance" 
               stroke="hsl(var(--primary))" 
               strokeWidth={2.5} 
               fillOpacity={1} 
               fill="url(#balanceFill)"
               isAnimationActive={true}
               animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
