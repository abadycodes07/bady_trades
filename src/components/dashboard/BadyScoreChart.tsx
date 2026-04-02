'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

// Match CsvTradeData from dashboard
interface CsvTradeData {
  Date?: string; // This is the internal 'Date' field parsed from 'T/D'
  NetPnL?: string; // This is the internal 'NetPnL' field parsed from 'Net Proceeds'
  GrossPnl?: string; // This is the internal 'GrossPnl' field parsed from 'Gross Proceeds'
  // ... other fields from the CSV header image if needed by this component specifically
}

interface BadyScoreChartProps {
    data: CsvTradeData[];
    overallScore: number; // Pass the calculated overall score
}

// Default data if no CSV is loaded or calculations fail
const defaultBadyScoreData = [
  { metric: 'Win %', score: 0, fullMark: 100 },
  { metric: 'Profit factor', score: 0, fullMark: 100 },
  { metric: 'Avg win/loss', score: 0, fullMark: 100 },
  { metric: 'Recovery factor', score: 0, fullMark: 100 }, // Placeholder
  { metric: 'Max drawdown', score: 0, fullMark: 100 }, // Placeholder
  { metric: 'Consistency', score: 0, fullMark: 100 },   // Placeholder
];


const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-background p-2 shadow-sm text-xs">
           <p className="font-bold">{`${label} : ${payload[0].value.toFixed(1)}`}</p>
        </div>
      );
    }
    return null;
};

export function BadyScoreChart({ data, overallScore }: BadyScoreChartProps) {

  const badyScoreChartData = React.useMemo(() => {
    if (!data || data.length === 0) return defaultBadyScoreData;

    const netPnLValues = data.map(t => parseFloat(t.NetPnL || '0')).filter(pnl => !isNaN(pnl));
    const grossPnLValues = data.map(t => parseFloat(t.GrossPnl || '0')).filter(pnl => !isNaN(pnl));

    // Win %
    const winningTrades = netPnLValues.filter(pnl => pnl > 0).length;
    const totalTrades = netPnLValues.length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    // Profit Factor
    const grossProfit = grossPnLValues.filter(pnl => pnl > 0).reduce((sum, pnl) => sum + pnl, 0);
    const grossLoss = Math.abs(grossPnLValues.filter(pnl => pnl < 0).reduce((sum, pnl) => sum + pnl, 0));
    const profitFactor = grossLoss === 0 ? (grossProfit === 0 ? 0 : Infinity) : (grossProfit / grossLoss);
    const profitFactorScore = Math.min(100, (isFinite(profitFactor) ? profitFactor : 0) / 3 * 100); // Normalize (e.g., PF of 3 is 100%)

    // Avg Win/Loss Ratio
    const wins = netPnLValues.filter(pnl => pnl > 0);
    const losses = netPnLValues.filter(pnl => pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const avgWinLossRatio = avgLoss === 0 ? (avgWin === 0 ? 0 : Infinity) : avgWin / avgLoss;
    const avgWinLossScore = Math.min(100, (isFinite(avgWinLossRatio) ? avgWinLossRatio : 0) / 3 * 100); // Normalize

    // Max Drawdown Score (simplified - 100 if no drawdown, 0 if large drawdown)
    let cumulativePnl = 0;
    let peak = 0;
    let maxDdValue = 0;
    netPnLValues.forEach(pnl => {
        cumulativePnl += pnl;
        if (cumulativePnl > peak) peak = cumulativePnl;
        const drawdown = peak - cumulativePnl;
        if (drawdown > maxDdValue) maxDdValue = drawdown;
    });
    const netPnlSum = netPnLValues.reduce((s, p) => s + p, 0);
    // Avoid division by zero or negative sum if P&L is overall negative
    const drawdownDenominator = netPnlSum > 0 ? netPnlSum : (peak > 0 ? peak : 10000);
    const maxDrawdownScore = maxDdValue === 0 ? 100 : Math.max(0, 100 - (maxDdValue / drawdownDenominator) * 100);


    return [
      { metric: 'Win %', score: winRate, fullMark: 100 },
      { metric: 'Profit factor', score: profitFactorScore, fullMark: 100 },
      { metric: 'Avg win/loss', score: avgWinLossScore, fullMark: 100 },
      { metric: 'Recovery factor', score: 50, fullMark: 100 }, // Placeholder
      { metric: 'Max drawdown', score: maxDrawdownScore, fullMark: 100 },
      { metric: 'Consistency', score: 60, fullMark: 100 }, // Placeholder
    ];
  }, [data]);


  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium flex items-center gap-1">
          Bady Score
          <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col items-center justify-between pt-0 pb-3">
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={badyScoreChartData} isAnimationActive={true} animationDuration={800}>
            <defs>
                <radialGradient id="radarFillGradientBady">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.1} />
                </radialGradient>
                 <linearGradient id="radarStrokeGradientBady">
                     <stop offset="0%" stopColor="hsl(var(--primary))" />
                     <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                 </linearGradient>
            </defs>
            <PolarGrid gridType="polygon" stroke="hsl(var(--border)/0.5)" />
            <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
             />
            <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
            <Radar
                name="Bady Score"
                dataKey="score"
                stroke="url(#radarStrokeGradientBady)"
                fill="url(#radarFillGradientBady)"
                fillOpacity={0.6}
                strokeWidth={2}
                isAnimationActive={true}
                animationDuration={800}
             />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsla(var(--primary)/0.1)' }}/>
          </RadarChart>
        </ResponsiveContainer>
         <div className="w-full px-4 mt-2">
             <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-semibold text-foreground">BADY SCORE</span>
                <span className="text-lg font-bold text-foreground">{overallScore.toFixed(2)}</span>
             </div>
             <Progress value={overallScore} className="h-2 bady-score-progress" />
         </div>
      </CardContent>
    </Card>
  );
}
