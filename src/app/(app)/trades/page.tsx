'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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

    const expandedAll = () => {
        const all: Record<string, boolean> = {};
        daySummaries.forEach(s => all[s.dateKey] = true);
        setExpandedDays(all);
    }

    const { daySummaries, totalPnl } = useMemo(() => {
        if (!tradeData || tradeData.length === 0) return { daySummaries: [], totalPnl: 0 };

        const groups: Record<string, DaySummary> = {};
        let tPnl = 0;

        tradeData.forEach(trade => {
            const rawDate = trade.Date || trade['T/D'];
            if (!rawDate) return;

            // Attempt to parse Date robustly
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

        // Sort days descending
        const sorted = Object.values(groups).sort((a, b) => compareDesc(a.date, b.date));
        return { daySummaries: sorted, totalPnl: tPnl };
    }, [tradeData]);

    if (isLoading) {
        return <div className="container mx-auto p-6 text-center text-white/50">Loading day view...</div>;
    }

    return (
        <div className="container mx-auto max-w-7xl pt-4 pb-20 px-6">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">Day View</h1>
                    <div className="flex bg-zinc-900 rounded-lg p-1">
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-md h-7 px-4">Day</Button>
                        <Button size="sm" variant="ghost" className="text-white/50 hover:text-white rounded-md h-7 px-4">Week</Button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-zinc-900 border-white/5 hover:bg-zinc-800 hidden md:flex items-center gap-2 h-9">
                        <Filter className="h-4 w-4 text-white/50" /> Filters
                    </Button>
                    <Button variant="outline" className="bg-zinc-900 border-white/5 hover:bg-zinc-800 hidden md:flex items-center gap-2 h-9">
                        <CalendarIcon className="h-4 w-4 text-white/50" /> Date range
                    </Button>
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-9 ml-2 rounded-lg gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-40"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                        </span>
                        Start my day
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 bg-zinc-900 border border-white/5 rounded-lg text-white/50 hover:text-white ml-1">
                        <Settings className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Content: List of Days */}
                <div className="flex-1 space-y-4">
                    {daySummaries.length === 0 && (
                        <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-white/5 border-dashed">
                            <p className="text-white/40">No structured day data available.</p>
                        </div>
                    )}

                    {daySummaries.map((day) => {
                        const isExpanded = expandedDays[day.dateKey];
                        const isWin = day.netPnl >= 0;
                        const winRate = day.trades.length > 0 ? (day.wins / day.trades.length) * 100 : 0;
                        
                        // calc profit factor for day
                        const grossWins = day.trades.filter(t => t.net_pnl > 0).reduce((s, t) => s + t.net_pnl, 0);
                        const grossLosses = Math.abs(day.trades.filter(t => t.net_pnl < 0).reduce((s, t) => s + t.net_pnl, 0));
                        const profitFactor = grossLosses === 0 ? (grossWins > 0 ? '∞' : '0.00') : (grossWins / grossLosses).toFixed(2);

                        return (
                            <Card key={day.dateKey} className="overflow-hidden border-white/5 bg-zinc-950 shadow-lg">
                                {/* Day Header (Clickable) */}
                                <div 
                                    className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors border-b border-transparent data-[state=open]:border-white/5"
                                    data-state={isExpanded ? 'open' : 'closed'}
                                    onClick={() => toggleDay(day.dateKey)}
                                >
                                    <div className="flex items-center gap-3">
                                        {isExpanded ? <ChevronDown className="h-4 w-4 text-white/50" /> : <ChevronRight className="h-4 w-4 text-white/50" />}
                                        <div className="flex items-baseline gap-2">
                                            <h3 className="text-base font-bold text-white">{format(day.date, 'E, MMM dd, yyyy')}</h3>
                                            <span className="text-white/50 text-sm">•</span>
                                            <span className={cn(
                                                "text-sm font-bold tracking-tight",
                                                isWin ? "text-emerald-400" : "text-rose-400"
                                            )}>
                                                Net P&L {isWin ? '+' : '-'}${Math.abs(day.netPnl).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-full text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                                            <PlayCircle className="h-3 w-3 text-indigo-400" /> Replay
                                        </button>
                                        <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 border border-white/5 hover:bg-zinc-800 rounded-full text-white text-[10px] font-bold uppercase tracking-widest transition-all">
                                            <FileText className="h-3 w-3 text-white/50" /> Add Note
                                        </button>
                                        <button className="h-7 w-7 rounded-full bg-indigo-600/20 flex items-center justify-center hover:bg-indigo-600/40 border border-indigo-500/20 ml-2">
                                            <BadyTradesMarkLogo className="h-3.5 w-3.5 text-indigo-400" />
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Body */}
                                {isExpanded && (
                                    <div className="p-5 flex flex-col md:flex-row gap-8 bg-black/20">
                                        {/* Left Side: Chart */}
                                        <div className="flex-1 min-w-[300px]">
                                            <RunningPnLChart trades={day.trades} className="h-[120px] mt-0" />
                                        </div>
                                        
                                        {/* Right Side: Stats */}
                                        <div className="flex-[1.5] grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4 pt-2">
                                            <div>
                                                <p className="text-[10px] font-medium text-white/50 mb-1">Total Trades</p>
                                                <p className="text-lg font-bold text-white">{day.trades.length}</p>
                                                <p className="text-xs font-medium text-white/30 mt-1">Win Rate {winRate.toFixed(2)}%</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium text-white/50 mb-1">Gross P&L</p>
                                                <p className="text-lg font-bold text-white">${day.grossPnl.toFixed(2)}</p>
                                                <p className="text-xs font-medium text-white/30 mt-1">Volume {day.volume > 0 ? day.volume : 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium text-white/50 mb-1">Winners / Losers</p>
                                                <p className="text-lg font-bold text-white">{day.wins} / {day.losses}</p>
                                                <p className="text-xs font-medium text-white/30 mt-1">Profit Factor {profitFactor}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-medium text-white/50 mb-1">Commissions</p>
                                                <p className="text-lg font-bold text-white">${day.commissions.toFixed(2)}</p>
                                                <p className="text-xs font-medium text-transparent mt-1">-</p> {/* Spacer */}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })}
                </div>

                {/* Right Column: Mini Calendar Placeholder */}
                <div className="w-[300px] hidden lg:block shrink-0">
                    <Card className="bg-zinc-950 border-white/5 sticky top-6 shadow-xl">
                        <div className="p-4 flex items-center justify-between border-b border-white/5">
                            <h3 className="font-bold text-white">{format(new Date(), 'MMMM yyyy')}</h3>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="h-4 w-4 rotate-180" /></Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6"><ChevronRight className="h-4 w-4" /></Button>
                            </div>
                        </div>
                        <div className="p-4 flex flex-col items-center py-10 text-center space-y-4">
                            <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center">
                                <CalendarIcon className="h-5 w-5 text-white/30" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-white mb-1">Filter by Date</p>
                                <p className="text-xs text-white/50 max-w-[200px]">Interactive mini calendar syncing with your day view will go here.</p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
