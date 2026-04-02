
'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { parse, format, getDay, startOfMonth, addDays, getDaysInMonth } from 'date-fns';

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
    const [currentDisplayDate, setCurrentDisplayDate] = React.useState(new Date());

    const dailyPnlMap: Record<string, number> = React.useMemo(() => {
        const map: Record<string, number> = {};
        data.forEach(trade => {
            if (trade.Date && trade.NetPnL) { 
                try {
                    // Expect trade.Date to be 'yyyy-MM-dd'
                    const date = parse(trade.Date, 'yyyy-MM-dd', new Date());
                    const pnl = parseFloat(trade.NetPnL);
                    if (!isNaN(date.getTime()) && !isNaN(pnl)) {
                        const dateKey = format(date, 'yyyy-MM-dd'); // Keep as yyyy-MM-dd
                        map[dateKey] = (map[dateKey] || 0) + pnl;
                    } else {
                         console.warn(`Heatmap: Skipping trade due to invalid date/pnl. Date: ${trade.Date}, PnL: ${trade.NetPnL}`);
                    }
                } catch (e) {
                    console.warn("Error parsing trade for heatmap:", trade, e);
                }
            }
        });
        return map;
    }, [data]);

    const monthStart = startOfMonth(currentDisplayDate);
    const daysInMonth = getDaysInMonth(currentDisplayDate);
    const firstDayOfMonth = getDay(monthStart); // 0 (Sun) - 6 (Sat)

    const cells = Array.from({ length: firstDayOfMonth }, (_, i) => (
        <div key={`empty-start-${i}`} className="h-3 w-3 rounded-sm bg-transparent" />
    ));

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentDisplayDate.getFullYear(), currentDisplayDate.getMonth(), day);
        const dateKey = format(date, 'yyyy-MM-dd');
        const pnl = dailyPnlMap[dateKey];
        cells.push(
            <div
                key={`day-${day}`}
                className={cn(
                    "h-3 w-3 rounded-sm",
                    getColorClass(pnl),
                    "hover:ring-1 hover:ring-primary"
                )}
                title={`${format(date, 'MMM dd')}: ${pnl !== undefined ? pnl.toFixed(2) : 'No trades'}`}
            />
        );
    }
    
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7; 
     for (let i = 0; i < remainingCells; i++) {
        cells.push(
            <div key={`empty-end-${i}`} className="h-3 w-3 rounded-sm bg-transparent" />
        );
    }

    const getTodaysScore = () => {
        const todayKey = format(new Date(), 'yyyy-MM-dd');
        const todaysPnl = dailyPnlMap[todayKey];
        if (todaysPnl === undefined) return "0/5";
        if (todaysPnl > 0) return "5/5";
        if (todaysPnl < 0) return "1/5";
        return "3/5";
    };


    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Activity Heatmap (Daily P&L)
                    <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                </CardTitle>
                 <CardDescription className="text-xs">{format(currentDisplayDate, 'MMMM yyyy')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col justify-between pt-0 pb-3">
                 <div className="grid grid-cols-7 gap-1 my-2">
                     {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((dayChar, index) => (
                         <div key={`${dayChar}-${index}`} className="text-[10px] text-muted-foreground text-center font-medium">{dayChar}</div>
                     ))}
                     {cells}
                 </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                     <span>Less Active</span>
                     <div className="flex gap-0.5">
                        <div className={cn("h-3 w-3 rounded-sm", getColorClass(undefined))}></div>
                        <div className={cn("h-3 w-3 rounded-sm", getColorClass(-1))}></div>
                        <div className={cn("h-3 w-3 rounded-sm", getColorClass(0))}></div>
                        <div className={cn("h-3 w-3 rounded-sm", getColorClass(1))}></div>
                    </div>
                     <span>More Active / Profit</span>
                 </div>
                 <div className="mt-2 text-center">
                     <span className="text-xs font-medium">TODAY'S ACTIVITY</span>
                     <Info className="h-3 w-3 inline-block ml-1 text-muted-foreground cursor-pointer" />
                     <p className="text-lg font-semibold text-foreground">{getTodaysScore()}</p>
                 </div>
            </CardContent>
        </Card>
    );
}
