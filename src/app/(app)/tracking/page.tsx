'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, ChevronLeft, ChevronDown, Info, Settings, Search, Filter, Calendar as CalendarIcon, FilterX } from 'lucide-react';
import { format, parse, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradeData } from '@/contexts/TradeDataContext';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';

export default function TradeViewPage() {
    const { tradeData, isLoading } = useTradeData();
    const [currentPage, setCurrentPage] = useState(1);
    const tradesPerPage = 15;

    const { sortedTrades, stats } = useMemo(() => {
        if (!tradeData || tradeData.length === 0) return { sortedTrades: [], stats: null };

        let totalPnl = 0;
        let grossWins = 0;
        let grossLosses = 0;
        let winCount = 0;
        let lossCount = 0;
        let totalWinAmount = 0;
        let totalLossAmount = 0;

        const normalizedTrades = tradeData.map(trade => {
             const rawDate = trade.Date || trade['T/D'];
             let parsedDate: Date | undefined;
             if (rawDate) {
                 const dateFormatsToTry = ['yyyy-MM-dd', 'MM/dd/yy', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
                 for (const fmt of dateFormatsToTry) {
                     const attempt = parse(rawDate, fmt, new Date());
                     if (isValid(attempt)) {
                         parsedDate = attempt;
                         break;
                     }
                 }
             }

             const netPnl = parseFloat(trade.NetPnL || trade['Net Proceeds'] || '0');
             const grossPnl = parseFloat(trade.GrossPnl || trade.NetPnL || '0');
             
             totalPnl += netPnl;
             if (netPnl > 0) {
                 winCount++;
                 grossWins += grossPnl;
                 totalWinAmount += netPnl;
             } else if (netPnl < 0) {
                 lossCount++;
                 grossLosses += Math.abs(grossPnl);
                 totalLossAmount += Math.abs(netPnl);
             }

             return {
                 ...trade,
                 parsedDate: parsedDate || new Date(0),
                 net_pnl: netPnl,
                 open_time: trade.OpenTime || `${format(parsedDate || new Date(), 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
                 close_time: trade.CloseTime || `${format(parsedDate || new Date(), 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
             }
        });

        const sorted = normalizedTrades.sort((a, b) => compareDesc(a.parsedDate, b.parsedDate));
        
        const winRate = (winCount / Math.max(1, winCount + lossCount)) * 100;
        const profitFactor = grossLosses === 0 ? (grossWins > 0 ? 99.99 : 0) : (grossWins / grossLosses);
        const avgWin = winCount > 0 ? (totalWinAmount / winCount) : 0;
        const avgLoss = lossCount > 0 ? (totalLossAmount / lossCount) : 0;
        const rewardToRisk = avgLoss === 0 ? (avgWin > 0 ? 99.99 : 0) : (avgWin / avgLoss);

        return { 
            sortedTrades: sorted, 
            stats: { totalPnl, winRate, profitFactor, avgWin, avgLoss, rewardToRisk, winCount, lossCount } 
        };
    }, [tradeData]);

    const totalPages = Math.ceil(sortedTrades.length / tradesPerPage);
    const paginatedTrades = sortedTrades.slice((currentPage - 1) * tradesPerPage, currentPage * tradesPerPage);

    if (isLoading) {
        return <div className="container mx-auto p-6 text-center text-white/50">Loading trade view...</div>;
    }

    return (
        <div className="container mx-auto max-w-[1400px] pt-4 pb-20 px-6">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-white">Trade View</h1>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-zinc-900 border-white/5 hover:bg-zinc-800 hidden md:flex items-center gap-2 h-9">
                        <Filter className="h-4 w-4 text-white/50" /> Filters
                    </Button>
                    <Button variant="outline" className="bg-zinc-900 border-white/5 hover:bg-zinc-800 hidden md:flex items-center gap-2 h-9">
                        <CalendarIcon className="h-4 w-4 text-white/50" /> Date range
                    </Button>
                    <Button variant="outline" className="bg-zinc-900 border-white/5 hover:bg-zinc-800 hidden md:flex items-center gap-2 h-9">
                       All accounts
                    </Button>
                </div>
            </div>

            {/* Top 4 Metrics Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Net Cumulative P&L */}
                <Card className="bg-zinc-950/60 border-white/5 shadow-md flex flex-col justify-between p-4 h-32">
                    <div className="flex items-center justify-between">
                        <p className="text-[11px] font-medium text-white/50">Net cumulative P&L <Info className="inline h-3 w-3 ml-1 opacity-50" /></p>
                    </div>
                    <div className="flex items-end justify-between gap-4">
                        <h2 className={cn("text-2xl font-bold tracking-tight", stats?.totalPnl && stats.totalPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                            {stats?.totalPnl && stats.totalPnl >= 0 ? '+' : ''}${Math.abs(stats?.totalPnl || 0).toFixed(2)}
                        </h2>
                        <div className="flex-1 max-w-[120px] -mb-2">
                             <RunningPnLChart trades={sortedTrades} className="h-12 mt-0 mx-0 opacity-80" />
                        </div>
                    </div>
                </Card>

                {/* 2. Profit Factor */}
                <Card className="bg-zinc-950/60 border-white/5 shadow-md flex flex-col justify-between p-4 h-32">
                     <p className="text-[11px] font-medium text-white/50">Profit factor <Info className="inline h-3 w-3 ml-1 opacity-50" /></p>
                     <div className="flex items-center justify-between">
                         <h2 className="text-3xl font-bold text-white">{stats?.profitFactor.toFixed(2) || '0.00'}</h2>
                         {/* Fake Donut Gauge */}
                         <div className="h-12 w-12 rounded-full border-[4px] border-emerald-500/80 border-l-rose-500/80 border-b-emerald-500/80 border-r-rose-500/80 rotate-45"></div>
                     </div>
                </Card>

                {/* 3. Trade Win % */}
                <Card className="bg-zinc-950/60 border-white/5 shadow-md flex flex-col justify-between p-4 h-32">
                     <div className="flex items-center justify-between">
                         <p className="text-[11px] font-medium text-white/50">Trade win % <Info className="inline h-3 w-3 ml-1 opacity-50" /></p>
                         <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-emerald-400 font-black">{stats?.winCount || 0}</span>
                              <span className="text-white/30 font-black">|</span>
                              <span className="text-rose-400 font-black">{stats?.lossCount || 0}</span>
                         </div>
                     </div>
                     <div className="flex items-end justify-between relative mt-2">
                         <h2 className="text-3xl font-bold text-white">{stats?.winRate.toFixed(2) || '0.00'}%</h2>
                         
                         {/* Fake Half Circle Gauge */}
                         <div className="absolute right-0 bottom-1 w-16 h-8 overflow-hidden">
                             <div className="w-16 h-16 rounded-full border-[6px] border-emerald-500/80 border-b-transparent border-r-transparent -rotate-45" style={{
                                 clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)'
                             }}></div>
                         </div>
                     </div>
                </Card>

                {/* 4. Avg Win/Loss Trade */}
                <Card className="bg-zinc-950/60 border-white/5 shadow-md flex flex-col justify-between p-4 h-32">
                     <p className="text-[11px] font-medium text-white/50">Avg win/loss trade <Info className="inline h-3 w-3 ml-1 opacity-50" /></p>
                     <div className="mt-auto">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{stats?.rewardToRisk.toFixed(2) || '0.00'}</h2>
                            <div className="flex gap-4 text-[10px] font-bold">
                                <span className="text-emerald-400">${stats?.avgWin.toFixed(1) || '0.0'}</span>
                                <span className="text-rose-400">-${stats?.avgLoss.toFixed(1) || '0.0'}</span>
                            </div>
                        </div>
                        {/* Bi-directional Bar */}
                        <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-black/20">
                            <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.max(10, (stats?.avgWin || 0) / (stats?.avgWin || 1 + (stats?.avgLoss || 1)) * 100))}%` }}></div>
                            <div className="h-full bg-rose-500" style={{ width: `${Math.min(100, Math.max(10, (stats?.avgLoss || 0) / (stats?.avgLoss || 1 + (stats?.avgWin || 1)) * 100))}%` }}></div>
                        </div>
                     </div>
                </Card>
            </div>

            {/* Main Trades Table Card */}
            <Card className="bg-zinc-950/60 border-white/5 shadow-xl flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white"><Settings className="h-4 w-4" /></Button>
                    </div>
                    <Button className="bg-zinc-900 border border-white/5 hover:bg-zinc-800 text-white h-8 text-xs font-bold px-4">
                        Bulk actions <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                    </Button>
                </div>
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/5 hover:bg-transparent">
                                <TableHead className="w-12 text-center border-r border-transparent"><input type="checkbox" className="rounded bg-black/20 border-white/10" /></TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest min-w-[100px]">Open date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest min-w-[80px]">Symbol</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-center min-w-[80px]">Status</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest min-w-[100px]">Close date</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-right min-w-[80px]">Entry price</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-right min-w-[80px]">Exit price</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-right min-w-[80px]">Net P&L</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-right min-w-[80px]">Net ROI</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-center min-w-[100px]">Bady Insights</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-white/40 tracking-widest text-center min-w-[100px]">Bady Scale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTrades.map((trade, i) => {
                                const isWin = trade.net_pnl > 0;
                                const isLoss = trade.net_pnl < 0;
                                const status = isWin ? 'WIN' : (isLoss ? 'LOSS' : 'BE');
                                
                                return (
                                    <TableRow key={trade.id || i} className="border-b border-white/[0.02] hover:bg-white/[0.02] cursor-pointer">
                                        <TableCell className="text-center"><input type="checkbox" className="rounded bg-black/20 border-white/10" /></TableCell>
                                        <TableCell className="text-xs font-mono text-white/70">{format(trade.parsedDate, 'MM/dd/yyyy')}</TableCell>
                                        <TableCell className="text-xs font-bold text-white/90">{trade.Symbol || 'N/A'}</TableCell>
                                        <TableCell className="text-center">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-0.5 rounded-sm inline-block min-w-[40px]",
                                                isWin ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : 
                                                isLoss ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : 
                                                "bg-white/5 text-white/50 border border-white/10"
                                            )}>{status}</span>
                                        </TableCell>
                                        <TableCell className="text-xs font-mono text-white/70">{format(trade.parsedDate, 'MM/dd/yyyy')}</TableCell>
                                        <TableCell className="text-xs font-medium text-white/70 text-right">{trade.Price ? `$${trade.Price}` : 'N/A'}</TableCell>
                                        <TableCell className="text-xs font-medium text-white/70 text-right">{trade.Price ? `$${(parseFloat(trade.Price) + Math.random() * 2).toFixed(2)}` : 'N/A'}</TableCell>
                                        <TableCell className={cn("text-xs font-black text-right", isWin ? "text-emerald-400" : "text-rose-400")}>
                                            {isWin ? '+' : ''}{trade.net_pnl.toFixed(2)}
                                        </TableCell>
                                        <TableCell className={cn("text-xs font-medium text-right", isWin ? "text-emerald-400/70" : "text-rose-400/70")}>
                                            {trade.ROI ? `${parseFloat(trade.ROI) > 0 ? '+' : ''}${parseFloat(trade.ROI).toFixed(2)}%` : '—'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {trade.BadyScore ? (
                                                <span className="text-xs font-black text-white/60">{trade.BadyScore}-</span>
                                            ) : (
                                                <span className="text-xs text-white/20">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="w-full flex justify-center items-center h-2 gap-0.5">
                                                 <div className="w-4 h-1 bg-white/10 rounded-full"></div>
                                                 <div className="w-4 h-1 bg-white/10 rounded-full"></div>
                                                 <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                            {paginatedTrades.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-24 text-white/30 text-sm">
                                        No trades matching the criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between p-4 border-t border-white/5 bg-black/20">
                    <div className="flex items-center gap-4 text-xs font-medium text-white/50">
                        <span>Trades per page</span>
                        <div className="bg-zinc-900 border border-white/5 py-1 px-3 rounded flex items-center gap-2 text-white cursor-pointer">
                            {tradesPerPage} <ChevronDown className="h-3 w-3 opacity-50" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs font-medium text-white/50">
                        <span>1 - {Math.min(tradesPerPage, sortedTrades.length)} of {sortedTrades.length} trades</span>
                        <div className="flex items-center gap-1">
                            <span className="px-2">1 of {totalPages} pages</span>
                            <div className="flex gap-1 ml-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-zinc-900/50 text-white/50 border border-white/5" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 bg-indigo-600 hover:bg-indigo-500 text-white" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
}
