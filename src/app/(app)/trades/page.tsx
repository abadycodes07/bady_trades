'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, FileText, ChevronRight, ChevronDown, Calendar as CalendarIcon, Settings, Filter } from 'lucide-react';
import { format, parse, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradeData } from '@/contexts/TradeDataContext';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';

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
    const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

    const toggleDay = (dateKey: string) => {
        setExpandedDays(prev => ({ ...prev, [dateKey]: !prev[dateKey] }));
    };

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
        <div className="container mx-auto max-w-7xl pt-4 pb-20 px-6 font-sans">
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

            <div className="flex flex-col gap-3">
                {daySummaries.length === 0 && (
                    <div className="text-center py-20 bg-[#121212] rounded-xl">
                        <p className="text-white/40 text-sm">No structured day data available.</p>
                    </div>
                )}

                {daySummaries.map((day) => {
                    const isExpanded = expandedDays[day.dateKey];
                    const isWin = day.netPnl >= 0;
                    const winRate = day.trades.length > 0 ? (day.wins / day.trades.length) * 100 : 0;
                    
                    const grossWins = day.trades.filter(t => t.net_pnl > 0).reduce((s, t) => s + t.net_pnl, 0);
                    const grossLosses = Math.abs(day.trades.filter(t => t.net_pnl < 0).reduce((s, t) => s + t.net_pnl, 0));
                    const profitFactor = grossLosses === 0 ? (grossWins > 0 ? '∞' : '0.00') : (grossWins / grossLosses).toFixed(2);

                    return (
                        <div key={day.dateKey} className="bg-[#101010] rounded-xl overflow-hidden shadow-none border-b border-r border-[#1a1a1a]">
                            {/* Day Header (Clickable) */}
                            <div 
                                className={cn("px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-[#141414] transition-none border-b border-transparent", isExpanded ? "border-[#1a1a1a] border-b" : "")}
                                onClick={() => toggleDay(day.dateKey)}
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
                                    <div className="flex items-baseline gap-2">
                                        <h3 className="text-sm font-bold text-white tracking-tight">{format(day.date, 'E, MMM dd, yyyy')}</h3>
                                        <span className="text-white/30 text-[10px] mx-1">•</span>
                                        <span className={cn(
                                            "text-xs font-bold tracking-tight",
                                            isWin ? "text-[#0F8A5D]" : "text-[#D73A49]"
                                        )}>
                                            Net P&L {isWin ? '+' : '-'}${Math.abs(day.netPnl).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a]  hover:bg-[#222] rounded-md text-white/80 text-[9px] font-bold uppercase tracking-wider transition-none">
                                        <PlayCircle className="h-3 w-3 text-indigo-400" /> Replay
                                    </button>
                                    <button className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] hover:bg-[#222] rounded-md text-white/80 text-[9px] font-bold uppercase tracking-wider transition-none">
                                        <FileText className="h-3 w-3 text-white/50" /> Add Note
                                    </button>
                                    <button className="h-7 w-7 rounded-sm bg-[#1a1a1a] hover:bg-[#222] flex items-center justify-center ml-2">
                                        <BadyTradesMarkLogo className="h-3 w-3 text-indigo-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Expandable Body */}
                            {isExpanded && (
                                <div className="px-5 pt-3 pb-5 flex flex-col md:flex-row gap-8 bg-[#101010]">
                                    {/* Left Side: Chart */}
                                    <div className="flex-1 min-w-[300px]">
                                        <RunningPnLChart trades={day.trades} className="h-[140px] mt-0" />
                                    </div>
                                    
                                    {/* Right Side: Stats */}
                                    <div className="flex-[1.5] grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 pt-4 shrink-0 max-w-[600px] mr-auto">
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-bold text-white/40 tracking-wider">TOTAL TRADES</p>
                                            <p className="text-[15px] font-bold text-white">{day.trades.length}</p>
                                            <div className="mt-2 flex flex-col gap-0.5">
                                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Win Rate</p>
                                                 <p className="text-[11px] font-bold text-white">{winRate.toFixed(2)}%</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-bold text-white/40 tracking-wider">GROSS P&L</p>
                                            <p className={cn("text-[15px] font-bold", day.grossPnl >= 0 ? "text-white" : "text-white")}>
                                                ${day.grossPnl.toFixed(2)}
                                            </p>
                                            <div className="mt-2 flex flex-col gap-0.5">
                                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Volume</p>
                                                 <p className="text-[11px] font-bold text-white">{day.volume > 0 ? day.volume : '0.00'}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-bold text-white/40 tracking-wider">WINNERS / LOSERS</p>
                                            <p className="text-[15px] font-bold text-white">{day.wins} / {day.losses}</p>
                                            <div className="mt-2 flex flex-col gap-0.5">
                                                 <p className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Profit Factor</p>
                                                 <p className="text-[11px] font-bold text-white">{profitFactor}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] font-bold text-white/40 tracking-wider">COMMISSIONS</p>
                                            <p className="text-[15px] font-bold text-white">${day.commissions.toFixed(2)}</p>
                                            <div className="mt-2 flex flex-col gap-0.5">
                                                {/* empty spacing block */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
