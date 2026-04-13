
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parse, format, getDay, startOfMonth, addDays, getDaysInMonth } from 'date-fns';

import { useLanguage } from '@/contexts/LanguageContext';

// Match CsvTradeData from dashboard
interface CsvTradeData {
  Date?: string; // Expect 'yyyy-MM-dd' from dashboard processing
  NetPnL?: string; 
  // ... other fields if needed by this component
}

interface ProgressTrackerHeatmapProps {
    data: CsvTradeData[];
}

// Determine color based on P&L value for the day
const getColorClass = (pnl: number | undefined) => {
    if (pnl === undefined) return 'bg-muted/30'; // No data
    if (pnl > 0) return 'bg-green-600 opacity-70'; // Profit (adjust opacity for intensity)
    if (pnl < 0) return 'bg-red-600 opacity-70';   // Loss
    return 'bg-yellow-500 opacity-50'; // Breakeven or zero P&L
};

export function ProgressTrackerHeatmap({ data }: ProgressTrackerHeatmapProps) {
    const { t } = useLanguage();
    const [currentDisplayDate] = React.useState(new Date());

    const dailyPnlMap: Record<string, number> = React.useMemo(() => {
        const map: Record<string, number> = {};
        data.forEach(trade => {
            if (trade.Date && trade.NetPnL) { 
                const pnl = parseFloat(trade.NetPnL);
                if (!isNaN(pnl)) {
                    map[trade.Date] = (map[trade.Date] || 0) + pnl;
                }
            }
        });
        return map;
    }, [data]);

    const monthStart = startOfMonth(currentDisplayDate);
    const daysInMonth = getDaysInMonth(currentDisplayDate);
    const firstDayOfMonth = getDay(monthStart);

    const cells = Array.from({ length: firstDayOfMonth }, (_, i) => (
        <div key={`empty-start-${i}`} className="h-2.5 w-2.5 rounded-sm bg-transparent" />
    ));

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), day);
        const dateKey = format(date, 'yyyy-MM-dd');
        const pnl = dailyPnlMap[dateKey];
        
        let colorClass = 'bg-white/5';
        if (pnl !== undefined) {
            if (pnl > 0) colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]';
            else if (pnl < 0) colorClass = 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]';
            else colorClass = 'bg-white/10';
        }

        cells.push(
            <div
                key={`day-${day}`}
                className={cn(
                    "h-2.5 w-2.5 rounded-sm transition-all duration-300",
                    colorClass,
                    "hover:scale-125 hover:z-10 cursor-help"
                )}
                title={pnl !== undefined ? `${t(format(date, 'MMM'))} ${day}: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}` : `${t(format(date, 'MMM'))} ${day}: ${t('No trades')}`}
            />
        );
    }

    return (
        <Card className="h-full flex flex-col bg-white/5 backdrop-blur-xl border-white/10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl rounded-full" />
            
            <CardHeader className="pb-1 text-center">
                <CardTitle className="text-[9px] uppercase tracking-[0.2em] font-black text-muted-foreground/40 flex items-center justify-center gap-1.5">
                    {t('Activity Heatmap')}
                    <Info className="h-2.5 w-2.5 opacity-30 cursor-pointer" />
                </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-grow flex flex-col justify-center pt-0 pb-4 px-4">
                 <div className="grid grid-cols-7 gap-1.5 my-2 justify-center content-center mx-auto">
                     {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayKey) => (
                         <div key={dayKey} className="text-[8px] text-muted-foreground/30 text-center font-black uppercase tracking-tighter">{t(dayKey)}</div>
                     ))}
                     {cells}
                 </div>
                 
                 <div className="mt-4 flex items-center justify-center gap-6">
                    <div className="text-center">
                       <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest block mb-0.5">{t('Today')}</span>
                       <span className="text-sm font-black text-foreground drop-shadow-sm">4/5</span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/5" />
                    <div className="text-center">
                       <span className="text-[8px] font-black text-muted-foreground/40 uppercase tracking-widest block mb-0.5">{t('Streak')}</span>
                       <span className="text-sm font-black text-emerald-500 drop-shadow-sm">12 {t('Days')}</span>
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
}
