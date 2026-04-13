
// src/components/dashboard/CumulativePnLChart.tsx
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Info } from 'lucide-react';
import { parse, compareAsc, format, isValid } from 'date-fns';
import type { CsvTradeData, CsvCommissionData } from '@/app/(app)/dashboard/page';

import { useLanguage } from '@/contexts/LanguageContext';

interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode;
    rate: number;
}

export interface CumulativeDataPoint {
  date: string; 
  pnl: number;  
  originalDate: Date; 
}

const formatYAxis = (tickItem: number, selectedCurrency: Currency) => {
  const convertedValue = tickItem * selectedCurrency.rate;
  const symbolString = typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.code;
  const displayValue = (convertedValue / 1000);
  if (!isFinite(displayValue)) {
      return `${symbolString}0k`;
  }
  return `${symbolString}${displayValue.toFixed(0)}k`;
};

const CustomTooltip = ({ active, payload, label, selectedCurrency, t }: any) => {
  if (active && payload && payload.length && selectedCurrency) {
    const rate = selectedCurrency.rate || 1;
    const symbol = selectedCurrency.symbol || '$';
    const dateLabel = payload[0]?.payload?.originalDate ? format(payload[0].payload.originalDate, 'PP') : label;

    return (
      <div className="rounded-lg border bg-background p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('Date')}
            </span>
            <span className="font-bold text-muted-foreground">
              {dateLabel}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[0.70rem] uppercase text-muted-foreground">
              {t('Cumulative P&L')}
            </span>
            <span className="font-bold flex items-center">
               {typeof symbol === 'string' ? symbol : symbol}
              {(payload[0].value * rate).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};


interface CumulativePnLChartProps {
  selectedCurrency: Currency;
  data: CsvTradeData[];
  commissionData: CsvCommissionData[];
  showFeesInPnl: boolean;
}

export function CumulativePnLChart({ selectedCurrency, data, commissionData, showFeesInPnl }: CumulativePnLChartProps) {
  const { t } = useLanguage();
  const { chartData, dataMinPnl, dataMaxPnl, fillType, offsetForZero } = React.useMemo(() => {
    if (!data || data.length === 0) {
        return { chartData: [{ date: format(new Date(), 'MM/dd/yy'), pnl: 0, originalDate: new Date() }], dataMinPnl: 0, dataMaxPnl: 0, fillType: 'neutral', offsetForZero: 50 };
    }

    const dailyCommissions: Record<string, number> = {};
    commissionData.forEach(comm => {
        if (comm.Date && comm.Commission) {
            dailyCommissions[comm.Date] = (dailyCommissions[comm.Date] || 0) + parseFloat(comm.Commission);
        }
    });
    
    const dailyAggregatedPnl: Record<string, number> = {};
    data.forEach(item => {
        const dateStr = item.Date;
        if (!dateStr) return;
        let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
        if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yy', new Date());
        if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
        if (!isValid(parsedDate)) return;

        const dateKey = format(parsedDate, 'yyyy-MM-dd');
        let pnlForDay = 0;
        if (showFeesInPnl) {
            pnlForDay = parseFloat(item.NetPnL || '0');
            // Daily commissions are subtracted after summing up all trades for the day
        } else {
            pnlForDay = parseFloat(item.GrossPnl || item.NetPnL || '0'); // Use GrossPnl, fallback to NetPnL
        }
        if (isNaN(pnlForDay)) return;
        dailyAggregatedPnl[dateKey] = (dailyAggregatedPnl[dateKey] || 0) + pnlForDay;
    });

    // Adjust for commissions if toggle is ON
    if (showFeesInPnl) {
        for (const dateKey in dailyAggregatedPnl) {
            dailyAggregatedPnl[dateKey] -= (dailyCommissions[dateKey] || 0);
        }
    }

    const sortedDailyTotals = Object.entries(dailyAggregatedPnl)
        .map(([dateKey, dailyPnl]) => ({
            originalDate: parse(dateKey, 'yyyy-MM-dd', new Date()), 
            dailyPnl,
        }))
        .sort((a, b) => compareAsc(a.originalDate, b.originalDate));
    
    if (sortedDailyTotals.length === 0) { 
        return { chartData: [{ date: format(new Date(), 'MM/dd/yy'), pnl: 0, originalDate: new Date() }], dataMinPnl: 0, dataMaxPnl: 0, fillType: 'neutral', offsetForZero: 50 };
    }

    let cumulativePnl = 0;
    const cumulativeDataPoints = sortedDailyTotals.map(dayTotal => {
        cumulativePnl += dayTotal.dailyPnl;
        return {
            date: format(dayTotal.originalDate, 'MM/dd/yy'), 
            pnl: cumulativePnl, 
            originalDate: dayTotal.originalDate, 
        };
    });

    const pnlValues = cumulativeDataPoints.map(d => d.pnl);
    const minPnl = Math.min(0, ...pnlValues);
    const maxPnl = Math.max(0, ...pnlValues);
    
    let determinedFillType: 'allPositive' | 'allNegative' | 'mixed' | 'neutral' = 'neutral';
    if (minPnl >= 0 && maxPnl > 0) determinedFillType = 'allPositive';
    else if (maxPnl <= 0 && minPnl < 0) determinedFillType = 'allNegative';
    else if (minPnl < 0 && maxPnl > 0) determinedFillType = 'mixed';
    else if (minPnl === 0 && maxPnl === 0 && cumulativeDataPoints.length > 1) determinedFillType = 'neutral';
    else if (cumulativeDataPoints.length === 1 && cumulativeDataPoints[0].pnl === 0) determinedFillType = 'neutral';
    
    const calculatedOffset = (maxPnl === minPnl) ? 50 : (maxPnl / (maxPnl - minPnl)) * 100;

    return { chartData: cumulativeDataPoints, dataMinPnl: minPnl, dataMaxPnl: maxPnl, fillType: determinedFillType, offsetForZero: calculatedOffset };
  }, [data, commissionData, showFeesInPnl]);

  const areaStrokeColor = `url(#pnlLineGradient)`; 

  return (
    <Card className="h-full flex flex-col bg-card border-border shadow-2xl relative overflow-hidden group">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
        <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center gap-1">
          {t('Daily Net Cumulative P&L')} {showFeesInPnl ? t('(Fees Included)') : t('(Fees Excluded)')}
          <Info className="h-3 w-3 opacity-30 cursor-pointer" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 pb-4 pl-1 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
            isAnimationActive={true}
            animationDuration={800}
            animationEasing="ease-out"
          >
            <defs>
              <linearGradient id="pnlAreaFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--win-green))" stopOpacity={0.5} />
                <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--win-green))" stopOpacity={0.05} />
                <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--loss-red))" stopOpacity={0.05} />
                <stop offset="100%" stopColor="hsl(var(--loss-red))" stopOpacity={0.5} />
              </linearGradient>
              <linearGradient id="pnlLineGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--win-green))" stopOpacity={1} />
                <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--win-green))" stopOpacity={1} />
                <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--loss-red))" stopOpacity={1} />
                <stop offset="100%" stopColor="hsl(var(--loss-red))" stopOpacity={1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.5)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(tickItem) => formatYAxis(tickItem, selectedCurrency)}
              domain={['auto', 'auto']}
              isAnimationActive={true}
              animationDuration={800}
              allowDataOverflow={true}
              padding={{ top: 20, bottom: 20 }}
            />
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={<CustomTooltip selectedCurrency={selectedCurrency} t={t} />}
            />
            <Area
                type="monotone"
                dataKey="pnl"
                stroke={areaStrokeColor}
                fillOpacity={1}
                fill="url(#pnlAreaFill)"
                strokeWidth={3}
                dot={false}
                isAnimationActive={true}
                animationDuration={800}
             />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

