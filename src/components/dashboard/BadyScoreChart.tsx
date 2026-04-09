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
    const profitFactorScore = Math.min(100, (isFinite(profitFactor) ? profitFactor : 0) / 3 * 100); 

    // Avg Win/Loss Ratio
    const wins = netPnLValues.filter(pnl => pnl > 0);
    const losses = netPnLValues.filter(pnl => pnl < 0);
    const avgWin = wins.length > 0 ? wins.reduce((s, p) => s + p, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, p) => s + p, 0) / losses.length) : 0;
    const avgWinLossRatio = avgLoss === 0 ? (avgWin === 0 ? 0 : Infinity) : avgWin / avgLoss;
    const avgWinLossScore = Math.min(100, (isFinite(avgWinLossRatio) ? avgWinLossRatio : 0) / 2 * 100); 

    // Max Drawdown Score
    let cumulativePnl = 0;
    let peak = 0;
    let maxDdValue = 0;
    netPnLValues.forEach(pnl => {
        cumulativePnl += pnl;
        if (cumulativePnl > peak) peak = cumulativePnl;
        const drawdown = peak - cumulativePnl;
        if (drawdown > maxDdValue) maxDdValue = drawdown;
    });
    const maxDrawdownScore = maxDdValue === 0 ? 100 : Math.max(0, 100 - (maxDdValue / 5000) * 100); // 100 if DD < 5k

    return [
      { metric: 'Win %', score: winRate, fullMark: 100 },
      { metric: 'Profit factor', score: profitFactorScore, fullMark: 100 },
      { metric: 'Avg win/loss', score: avgWinLossScore, fullMark: 100 },
      { metric: 'Recovery factor', score: 65, fullMark: 100 }, 
      { metric: 'Max drawdown', score: maxDrawdownScore, fullMark: 100 },
      { metric: 'Consistency', score: 72, fullMark: 100 }, 
    ];
  }, [data]);


  return (
    <Card className="h-full flex flex-col bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[60px] rounded-full group-hover:bg-primary/20 transition-all duration-700" />
      
      <CardHeader className="pb-1">
        <CardTitle className="text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-center gap-1.5">
          Overall Zella Score
          <Info className="h-3 w-3 opacity-30 cursor-pointer" />
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-grow flex flex-col items-center justify-between pt-0 pb-6 px-2">
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={badyScoreChartData}>
            <defs>
                <radialGradient id="radarFillGradient">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                </radialGradient>
                 <linearGradient id="radarStrokeGradient" x1="0" y1="0" x2="1" y2="1">
                     <stop offset="0%" stopColor="hsl(var(--primary))" />
                     <stop offset="100%" stopColor="#fff" stopOpacity={0.8}/>
                 </linearGradient>
            </defs>
            <PolarGrid gridType="polygon" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} />
            <PolarAngleAxis
                dataKey="metric"
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700 }}
             />
            <PolarRadiusAxis angle={30} domain={[0, 100]} axisLine={false} tick={false} />
            <Radar
                name="Performance Score"
                dataKey="score"
                stroke="url(#radarStrokeGradient)"
                fill="url(#radarFillGradient)"
                fillOpacity={0.7}
                strokeWidth={2.5}
                isAnimationActive={true}
                animationDuration={1000}
             />
            <Tooltip 
              contentStyle={{ background: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
              itemStyle={{ color: '#fff', fontSize: '10px', fontWeight: 900 }}
            />
          </RadarChart>
        </ResponsiveContainer>
        
         <div className="w-full px-6 mt-2 relative z-10">
             <div className="flex justify-between items-end mb-2">
                <div>
                   <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest block mb-1">Current Rating</span>
                   <span className="text-3xl font-black text-foreground tracking-tighter drop-shadow-md">
                     {overallScore.toFixed(0)}<span className="text-sm font-medium opacity-40 ml-1">/100</span>
                   </span>
                </div>
                <div className="text-right">
                   <span className="text-[9px] font-black text-emerald-500 uppercase bg-emerald-500/10 px-2 py-1 rounded-full border border-emerald-500/20">Elite Trader</span>
                </div>
             </div>
             <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                   className="h-full bg-gradient-to-r from-primary to-[#fff] transition-all duration-1000 ease-out"
                   style={{ width: `${overallScore}%` }}
                />
             </div>
         </div>
      </CardContent>
    </Card>
  );
}
