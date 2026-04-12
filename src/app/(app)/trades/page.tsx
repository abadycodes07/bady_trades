'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, FileText, Calendar as CalendarIcon, Settings, Filter } from 'lucide-react';
import { format, parse, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradeData } from '@/contexts/TradeDataContext';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import { Calendar } from '@/components/ui/calendar';

interface DaySummary {
    date: Date;
    dateKey: string;
    trades: any[];
    netPnl: number;
    grossPnl: number;
    wins: number;
    losses: number;
    commissions: number;
    volume: number;
}

export default function DayViewPage() {
    const { tradeData, isLoading } = useTradeData();
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

    const { daySummaries, totalPnl } = useMemo(() => {
        if (!tradeData || tradeData.length === 0) return { daySummaries: [], totalPnl: 0 };

        const groups: Record<string, DaySummary> = {};
        let tPnl = 0;

        tradeData.forEach(trade => {
            const rawDate = trade.Date || trade['T/D'];
            if (!rawDate) return;

            let parsedDate: Date | undefined;
            const dateFormatsToTry = ['yyyy-MM-dd', 'MM/dd/yy', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
            for (const fmt of dateFormatsToTry) {
                const attempt = parse(rawDate, fmt, new Date());
                if (isValid(attempt)) {
                    parsedDate = attempt;
                    break;
                }
            }

            if (!parsedDate || !isValid(parsedDate)) return;

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            const netPnl = parseFloat(trade.NetPnL || trade['Net Proceeds'] || '0');
            const grossPnl = parseFloat(trade.GrossPnl || trade['Gross Proceeds'] || trade.NetPnL || '0');
            const comm = parseFloat(trade.Commissions || trade.Comm || '0');
            const vol = parseFloat(trade.Volume || trade.Qty || '0');
            const isWin = netPnl > 0;
            const isLoss = netPnl < 0;

            if (!groups[dateKey]) {
                groups[dateKey] = {
                    date: parsedDate,
                    dateKey,
                    trades: [],
                    netPnl: 0,
                    grossPnl: 0,
                    wins: 0,
                    losses: 0,
                    commissions: 0,
                    volume: 0
                };
            }

            groups[dateKey].trades.push({
                ...trade,
                net_pnl: netPnl,
                open_time: trade.OpenTime || `${format(parsedDate, 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
                close_time: trade.CloseTime || `${format(parsedDate, 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
            });
            groups[dateKey].netPnl += netPnl;
            groups[dateKey].grossPnl += grossPnl;
            groups[dateKey].commissions += !isNaN(comm) ? comm : 0;
            groups[dateKey].volume += !isNaN(vol) ? vol : 0;
            if (isWin) groups[dateKey].wins++;
            if (isLoss) groups[dateKey].losses++;
            
            tPnl += netPnl;
        });

        const sorted = Object.values(groups).sort((a, b) => compareDesc(a.date, b.date));
        return { daySummaries: sorted, totalPnl: tPnl };
    }, [tradeData]);

    if (isLoading) {
        return <div className="container mx-auto p-6 text-center text-white/50">Loading day view...</div>;
    }

    return (
        <div className="container mx-auto max-w-[1500px] pt-4 pb-20 px-6 font-sans">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-white tracking-tight">Day View</h1>
                    <div className="flex bg-[#121212] rounded-md p-1 border border-white/[0.05]">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-[4px] h-6 px-3 text-[11px] font-medium transition-none">Day</Button>
                        <Button size="sm" variant="ghost" className="text-white/50 hover:text-white rounded-[4px] h-6 px-3 text-[11px] font-medium transition-none">Week</Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-8 text-[11px] rounded-md">
                        <Filter className="h-3 w-3 text-white/50" /> Filters
                    </Button>
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-8 text-[11px] rounded-md">
                        <CalendarIcon className="h-3 w-3 text-white/50" /> Date range
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-8 ml-2 rounded-md gap-2 text-[11px]">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                        </span>
                        Start my day
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/5 rounded-md text-white/40 hover:text-white ml-2">
                        <Settings className="h-3 w-3" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-start">
                {/* Main Days Accumulator */}
                <div className="flex flex-col gap-4 flex-1 w-full min-w-0">
                    {daySummaries.length === 0 && (
                        <div className="text-center py-20 bg-[#121212] rounded-xl">
                            <p className="text-white/40 text-sm">No structured day data available.</p>
                        </div>
                    )}

                    {daySummaries.map((day) => {
                        const isWin = day.netPnl >= 0;
                        const winRate = day.trades.length > 0 ? (day.wins / day.trades.length) * 100 : 0;
                        
                        const grossWins = day.trades.filter(t => t.net_pnl > 0).reduce((s, t) => s + t.net_pnl, 0);
                        const grossLosses = Math.abs(day.trades.filter(t => t.net_pnl < 0).reduce((s, t) => s + t.net_pnl, 0));
                        const profitFactor = grossLosses === 0 ? (grossWins > 0 ? '∞' : '0.00') : (grossWins / grossLosses).toFixed(2);

                        return (
                            <div key={day.dateKey} className="bg-[#121212] rounded-xl overflow-hidden shadow-none border border-transparent hover:border-white/[0.04]">
                                {/* Day Header Wrapper (Non-collapsible) */}
                                <div className="px-5 py-4 flex items-center justify-between border-b border-white/[0.04] bg-[#141414]">
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-[14px] font-bold text-white tracking-tight">{format(day.date, 'E, MMM dd, yyyy')}</h3>
                                            <span className="text-white/30 text-[10px] mx-1">•</span>
                                            <span className={cn(
                                                "text-xs font-bold tracking-tight",
                                                isWin ? "text-[#0F8A5D]" : "text-[#D73A49]"
                                            )}>
                                                Net P&L {isWin ? '+' : '-'}${Math.abs(day.netPnl).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded-md text-white/80 text-[10px] font-bold tracking-wider transition-none">
                                            <PlayCircle className="h-3 w-3 text-indigo-400" /> Replay
                                        </button>
                                        <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded-md text-white/80 text-[10px] font-bold tracking-wider transition-none">
                                            <FileText className="h-3 w-3 text-white/50" /> Add Note
                                        </button>
                                        <button className="h-7 w-7 rounded-md bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center ml-2">
                                            <BadyTradesMarkLogo className="h-3 w-3 text-indigo-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Full Body */}
                                <div className="px-5 pt-3 pb-5 flex flex-col md:flex-row gap-8 bg-[#121212]">
                                    {/* Left Side: Chart */}
                                    <div className="flex-[1.5] w-full min-w-0">
                                        <RunningPnLChart trades={day.trades} className="h-[160px] mt-2 mb-1" />
                                    </div>
                                    
                                    {/* Right Side: Stats */}
                                    <div className="flex-1 min-w-[280px] grid grid-cols-2 gap-y-7 gap-x-4 pt-4 shrink-0">
                                        <div className="flex flex-col gap-1.5">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Total Trades ({day.trades.length})</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                           {day.trades.map((t, idx) => (
                                              <button key={idx} onClick={() => window.location.href = `/trades/${t.id}`} className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded-md text-white/80 text-[10px] font-bold tracking-wider transition-none">
                                                  <PlayCircle className="h-3 w-3 text-indigo-400" /> {t.Symbol}
                                              </button>
                                           ))}
                                        </div>
                                    </div>
                                        <div className="flex flex-col gap-1.5">
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Gross P&L</p>
                                            <p className={cn("text-[16px] font-bold tracking-tight", day.grossPnl >= 0 ? "text-white" : "text-white")}>
                                                {day.grossPnl >= 0 ? '' : '-'}${Math.abs(day.grossPnl).toFixed(2)}
                                            </p>
                                            <div className="mt-3 flex flex-col gap-1">
                                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Volume</p>
                                                 <p className="text-[12px] font-bold text-white">{day.volume > 0 ? day.volume : '0.00'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Winners / Losers</p>
                                            <p className="text-[16px] font-bold text-white tracking-tight">{day.wins} / {day.losses}</p>
                                            <div className="mt-3 flex flex-col gap-1">
                                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Profit Factor</p>
                                                 <p className="text-[12px] font-bold text-white">{profitFactor}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Commissions</p>
                                            <p className="text-[16px] font-bold text-white tracking-tight">${day.commissions.toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Right Sticky Calendar */}
                <div className="w-[300px] shrink-0 sticky top-6 hidden lg:block">
                    <div className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden shadow-2xl p-4">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            className="w-full bg-transparent max-w-full font-sans"
                            classNames={{
                                months: "w-full",
                                month: "w-full space-y-4",
                                caption: "flex justify-center pt-1 relative items-center mb-4 text-white font-bold",
                                caption_label: "text-sm",
                                nav: "space-x-1 flex items-center bg-white/5 rounded-md",
                                nav_button: "h-7 w-7 bg-transparent hover:bg-white/10 text-white p-0 opacity-100 flex items-center justify-center rounded-md transition-none",
                                nav_button_previous: "absolute left-1",
                                nav_button_next: "absolute right-1",
                                table: "w-full border-collapse space-y-1 mb-2",
                                head_row: "flex w-full mb-2",
                                head_cell: "text-white/40 rounded-md w-9 font-bold text-[10px] uppercase tracking-wider",
                                row: "flex w-full mt-2",
                                cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 w-9",
                                day: "h-8 w-8 p-0 font-medium aria-selected:opacity-100 hover:bg-white/10 rounded-sm text-white/80 transition-none",
                                day_range_start: "day-range-start",
                                day_range_end: "day-range-end",
                                day_selected: "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white focus:bg-indigo-600 focus:text-white",
                                day_today: "bg-white/10 text-white font-bold",
                                day_outside: "text-white/20 opacity-50",
                                day_disabled: "text-muted-foreground opacity-50",
                                day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                                day_hidden: "invisible",
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
