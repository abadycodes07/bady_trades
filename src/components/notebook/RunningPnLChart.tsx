// src/components/notebook/RunningPnLChart.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, DotProps } from 'recharts';
import type { CsvTradeData } from '@/app/(app)/dashboard/page'; 
import { format, parse, isValid, compareAsc } from 'date-fns';

interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode;
    rate: number;
}

interface RunningPnLChartProps {
  trade: CsvTradeData; // The specific trade being viewed
  allTrades: CsvTradeData[]; // All trades from the context
  selectedCurrency: Currency;
}

interface ChartDataPoint {
  time: string; // Formatted HH:mm
  pnl: number;  // Cumulative P&L
  originalTime?: Date; // For identifying specific markers
}

const formatYAxis = (tickItem: number, currencySymbol: string | React.ReactNode) => {
  const symbol = typeof currencySymbol === 'string' ? currencySymbol : '$'; 
  if (tickItem === 0) return `${symbol}0.00`;
  return `${symbol}${tickItem.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

interface CustomDotProps extends DotProps {
  payload?: ChartDataPoint;
  isStart?: boolean;
  isEnd?: boolean;
}

const CustomDot: React.FC<CustomDotProps> = (props) => {
  const { cx, cy, payload, isStart, isEnd, ...restDotProps } = props; 

  // Only render dots for start or end points
  if (isStart || isEnd) { 
    let fillColor = 'hsl(var(--background))';
    let strokeColor = 'hsl(var(--primary))'; 
    
    if (payload) {
      if (isEnd) { 
        strokeColor = payload.pnl >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--chart-negative-stroke))'; 
      } else if (isStart) { 
        strokeColor = payload.pnl === 0 ? 'hsl(var(--muted-foreground))' : 
                      (payload.pnl > 0 ? 'hsl(var(--primary))' : 'hsl(var(--chart-negative-stroke))');
      }
    }

    return (
      <svg x={cx && cx - 6} y={cy && cy - 6} width="12" height="12" fill="none" viewBox="0 0 12 12" {...restDotProps} >
        <circle cx="6" cy="6" r="5" fill={fillColor} stroke={strokeColor} strokeWidth="2"/>
      </svg>
    );
  }
  return null;
};


export function RunningPnLChart({ trade, allTrades, selectedCurrency }: RunningPnLChartProps) {
  const gradientId = useMemo(() => `runningPnlFill-${String(trade.id || 'default').replace(/[^a-zA-Z0-9]/g, '')}`, [trade.id]);

  const { chartData, dataMinPnl, dataMaxPnl, fillType, offsetForZero } = useMemo(() => {
    if (!trade || !allTrades || allTrades.length === 0) {
      return { chartData: [], dataMinPnl: 0, dataMaxPnl: 0, fillType: 'neutral', offsetForZero: 50 };
    }

    const tradesForSymbolOnDate = allTrades.filter(t => 
        t.Symbol === trade.Symbol && 
        t.Date === trade.Date && 
        t['Exec Time'] && 
        t.NetPnL !== undefined && t.NetPnL !== null
    ).map(t => {
        let execTimeParsed;
        const timeStr = t['Exec Time']!;
        execTimeParsed = parse(timeStr, 'HH:mm:ss', new Date());
        if (!isValid(execTimeParsed)) {
            execTimeParsed = parse(timeStr, 'HH:mm', new Date());
        }
         if (!isValid(execTimeParsed)) {
            execTimeParsed = parse(timeStr, 'H:mm', new Date());
        }
        if (!isValid(execTimeParsed)) {
            console.warn(`Could not parse exec time: ${timeStr} for trade:`, t);
            return null; 
        }
        const pnlValue = parseFloat(t.NetPnL!);
        if (isNaN(pnlValue)) {
            console.warn(`Could not parse PnL value: ${t.NetPnL!} for trade:`, t);
            return null;
        }
        return { ...t, execTimeParsed, pnlValue };
    }).filter(t => t !== null) as (CsvTradeData & { execTimeParsed: Date; pnlValue: number })[];

    if (tradesForSymbolOnDate.length === 0) {
      return { chartData: [], dataMinPnl: 0, dataMaxPnl: 0, fillType: 'neutral', offsetForZero: 50 };
    }

    tradesForSymbolOnDate.sort((a, b) => compareAsc(a.execTimeParsed, b.execTimeParsed));

    let runningPnl = 0;
    const dataPoints: ChartDataPoint[] = tradesForSymbolOnDate.map(t => {
        runningPnl += t.pnlValue;
        return {
            time: format(t.execTimeParsed, 'HH:mm'),
            pnl: runningPnl,
            originalTime: t.execTimeParsed
        };
    });

    const pnlValues = dataPoints.map(d => d.pnl);
    const minPnl = Math.min(0, ...pnlValues); 
    const maxPnl = Math.max(0, ...pnlValues); 

    let determinedFillType: 'allPositive' | 'allNegative' | 'mixed' | 'neutral' = 'neutral';
    if (minPnl >= 0 && maxPnl > 0) determinedFillType = 'allPositive';
    else if (maxPnl <= 0 && minPnl < 0) determinedFillType = 'allNegative';
    else if (minPnl < 0 && maxPnl > 0) determinedFillType = 'mixed';
    else if (minPnl === 0 && maxPnl === 0 && dataPoints.length > 0) determinedFillType = 'neutral';


    const calculatedOffset = (maxPnl === minPnl) ? 50 : (maxPnl / (maxPnl - minPnl)) * 100;
    
    return { chartData: dataPoints, dataMinPnl: minPnl, dataMaxPnl: maxPnl, fillType: determinedFillType, offsetForZero: calculatedOffset };
  }, [trade, allTrades]);

  if (chartData.length === 0) {
      return (
          <Card className="h-[350px] flex flex-col items-center justify-center hover-effect">
              <CardHeader><CardTitle className="text-lg">Running P&amp;L</CardTitle></CardHeader>
              <CardContent><p className="text-muted-foreground">No execution data for this trade on this day.</p></CardContent>
          </Card>
      );
  }

  const yDomain = [dataMinPnl - Math.abs(dataMinPnl * 0.1) - 10, dataMaxPnl + Math.abs(dataMaxPnl * 0.1) + 10];
  
  const overallPnl = chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;
  
  let areaStrokeColor = 'hsl(var(--primary))';
  if (fillType === 'allPositive') {
    areaStrokeColor = 'hsl(var(--chart-positive-stroke))';
  } else if (fillType === 'allNegative') {
    areaStrokeColor = 'hsl(var(--chart-negative-stroke))';
  } else { 
    areaStrokeColor = overallPnl >= 0 ? 'hsl(var(--chart-positive-stroke))' : 'hsl(var(--chart-negative-stroke))';
  }


  const startDataPoint = chartData[0];
  const endDataPoint = chartData[chartData.length - 1];
  
  let tradeExecTimeParsed;
  if (trade['Exec Time']) {
    tradeExecTimeParsed = parse(trade['Exec Time'], 'HH:mm:ss', new Date());
    if (!isValid(tradeExecTimeParsed)) {
        tradeExecTimeParsed = parse(trade['Exec Time'], 'HH:mm', new Date());
    }
    if (!isValid(tradeExecTimeParsed)) {
        tradeExecTimeParsed = parse(trade['Exec Time'], 'H:mm', new Date());
    }
  }

  return (
    <Card className="h-[350px] flex flex-col hover-effect">
      <CardHeader className="py-3 px-4 border-b">
        <CardTitle className="text-lg">Running P&amp;L for {trade.Symbol} on {trade.Date}</CardTitle>
      </CardHeader>
      <CardContent className="flex-grow p-2 pr-4 pb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 0, left: -15, bottom: 0 }}
          >
            <defs>
              {fillType === 'allPositive' && (
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-positive))" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-positive))" stopOpacity={0.1}/>
                </linearGradient>
              )}
              {fillType === 'allNegative' && (
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-negative))" stopOpacity={0.6}/>
                  <stop offset="95%" stopColor="hsl(var(--chart-negative))" stopOpacity={0.1}/>
                </linearGradient>
              )}
              {fillType === 'mixed' && (
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--chart-positive))" stopOpacity={0.6} /> 
                  <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--chart-positive))" stopOpacity={0.1} />
                  <stop offset={`${offsetForZero}%`} stopColor="hsl(var(--chart-negative))" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="hsl(var(--chart-negative))" stopOpacity={0.6} />
                </linearGradient>
              )}
              {(fillType === 'neutral' || chartData.length <=1 ) && (
                 <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--muted))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--muted))" stopOpacity={0.1}/>
                 </linearGradient>
              )}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.3)" vertical={false} />
            <XAxis
              dataKey="time"
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd" 
              ticks={chartData.filter((_, index) => index % Math.max(1, Math.floor(chartData.length / 6)) === 0 || index === chartData.length -1 ).map(d => d.time)}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => formatYAxis(value, selectedCurrency.symbol)}
              domain={yDomain}
              allowDataOverflow={true}
              tickCount={5} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                borderColor: 'hsl(var(--border))',
                borderRadius: 'var(--radius)',
                fontSize: '12px',
                boxShadow: 'var(--shadow-lg)',
              }}
              itemStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [formatYAxis(value, selectedCurrency.symbol), "P&L"]}
            />
            <Area
              type="monotone"
              dataKey="pnl"
              stroke={areaStrokeColor} 
              fill={`url(#${gradientId})`}
              strokeWidth={2}
              dot={false}
              activeDot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

