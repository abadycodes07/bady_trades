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
    const tradesPerPage = 50;

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
        <div className="container mx-auto max-w-[1500px] pt-4 pb-20 px-6 font-sans">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hidden md:flex"><ChevronLeft className="h-4 w-4" /></Button>
                    <h1 className="text-xl font-bold text-white tracking-tight">Trade View</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs">
                        <Filter className="h-3 w-3 text-white/50" /> Filters
                    </Button>
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs">
                        <CalendarIcon className="h-3 w-3 text-white/50" /> Date range
                    </Button>
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs">
                       All accounts
                    </Button>
                </div>
            </div>

            {/* Top 4 Metrics Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Net Cumulative P&L */}
                <div className="bg-[#121212] rounded-xl flex flex-col justify-between p-5 h-32">
                    <p className="text-[11px] font-medium text-white/50 mb-2">Net cumulative P&L <Info className="inline h-3 w-3 ml-1 opacity-40" /></p>
                    <div className="flex items-end justify-between gap-4 h-full">
                        <h2 className={cn("text-2xl font-bold tracking-tight mb-1", stats?.totalPnl && stats.totalPnl >= 0 ? "text-white" : "text-white")}>
                            ${Math.abs(stats?.totalPnl || 0).toFixed(2)}
                        </h2>
                        <div className="flex-1 max-w-[120px] -mb-2">
                             <RunningPnLChart trades={sortedTrades} className="h-12 mt-0 mx-0 opacity-80" />
                        </div>
                    </div>
                </div>

                {/* 2. Profit Factor */}
                <div className="bg-[#121212] rounded-xl flex flex-col justify-between p-5 h-32">
                     <p className="text-[11px] font-medium text-white/50 mb-2">Profit factor <Info className="inline h-3 w-3 ml-1 opacity-40" /></p>
                     <div className="flex items-center justify-between h-full">
                         <h2 className="text-3xl font-bold text-white tracking-tight mb-1">{stats?.profitFactor.toFixed(2) || '0.00'}</h2>
                         <div className="h-10 w-10 mr-2 rounded-full border-[3px] border-[#0F8A5D] border-l-[#D73A49] border-b-[#0F8A5D] border-r-[#D73A49] rotate-45 opacity-80"></div>
                     </div>
                </div>

                {/* 3. Trade Win % */}
                <div className="bg-[#121212] rounded-xl flex flex-col justify-between p-5 h-32">
                     <div className="flex items-center justify-between mb-2">
                         <p className="text-[11px] font-medium text-white/50">Trade win % <Info className="inline h-3 w-3 ml-1 opacity-40" /></p>
                     </div>
                     <div className="flex items-end justify-between relative mt-2 h-full">
                         <h2 className="text-3xl font-bold text-white tracking-tight mb-1">{stats?.winRate.toFixed(2) || '0.00'}%</h2>
                         
                         <div className="absolute right-0 bottom-0 w-16 flex flex-col items-center">
                             <div className="w-14 h-7 overflow-hidden relative">
                                 <div className="absolute top-0 left-0 w-14 h-14 rounded-full border-[4px] border-[#0F8A5D]"></div>
                             </div>
                             <div className="flex gap-2 text-[9px] font-bold mt-1">
                                <span className="text-[#0F8A5D]">{stats?.winCount || 0}</span>
                                <span className="text-[#0F8A5D]/20">|</span>
                                <span className="text-[#D73A49]">{stats?.lossCount || 0}</span>
                             </div>
                         </div>
                     </div>
                </div>

                {/* 4. Avg Win/Loss Trade */}
                <div className="bg-[#121212] rounded-xl flex flex-col justify-between p-5 h-32">
                     <p className="text-[11px] font-medium text-white/50">Avg win/loss trade <Info className="inline h-3 w-3 ml-1 opacity-40" /></p>
                     <div className="mt-auto w-full">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">{stats?.rewardToRisk.toFixed(2) || '0.00'}</h2>
                            <div className="flex gap-3 text-[11px] font-bold">
                                <span className="text-[#0F8A5D]">${stats?.avgWin.toFixed(1) || '0.0'}</span>
                                <span className="text-[#D73A49]">-${stats?.avgLoss.toFixed(1) || '0.0'}</span>
                            </div>
                        </div>
                        {/* Thin Bi-directional Bar */}
                        <div className="w-full h-1 flex rounded-full overflow-hidden bg-white/5">
                            <div className="h-full bg-[#0F8A5D]" style={{ width: `${Math.min(100, Math.max(10, (stats?.avgWin || 0) / (stats?.avgWin || 1 + (stats?.avgLoss || 1)) * 100))}%` }}></div>
                            <div className="h-full bg-[#D73A49]" style={{ width: `${Math.min(100, Math.max(10, (stats?.avgLoss || 0) / (stats?.avgLoss || 1 + (stats?.avgWin || 1)) * 100))}%` }}></div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Main Trades Table Card */}
            <div className="bg-[#121212] rounded-xl flex flex-col overflow-hidden pb-4">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white rounded-full bg-white/5"><Settings className="h-3 w-3" /></Button>
                    </div>
                    <Button className="bg-[#1a1a1a] hover:bg-[#222] text-white/80 h-7 text-[11px] font-medium px-4 rounded-md">
                        Bulk actions <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                    </Button>
                </div>
                
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/[0.04] hover:bg-transparent">
                                <TableHead className="w-12 text-center pl-4"><input type="checkbox" className="rounded-sm bg-white/5 border-white/10" /></TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider">Open date</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider">Symbol</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-center">Status</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider">Close date</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-center">Entry price</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-center">Exit price</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-right">Net P&L</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-right">Net ROI</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-center">Zella Insights</TableHead>
                                <TableHead className="text-[9px] font-black uppercase text-white/40 tracking-wider text-center">Zella Scale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTrades.map((trade, i) => {
                                const isWin = trade.net_pnl > 0;
                                const isLoss = trade.net_pnl < 0;
                                const status = isWin ? 'WIN' : (isLoss ? 'LOSS' : 'BE');
                                
                                return (
                                    <TableRow key={trade.id || i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors border-transparent cursor-pointer">
                                        <TableCell className="text-center pl-4"><input type="checkbox" className="rounded-sm bg-white/5 border-white/10" /></TableCell>
                                        <TableCell className="text-[11px] font-mono text-white/60 pt-4 pb-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-bold text-white pt-4 pb-4">{trade.Symbol || 'N/A'}</TableCell>
                                        <TableCell className="text-center pt-4 pb-4">
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] inline-block min-w-[45px]",
                                                isWin ? "bg-[#0F8A5D]/10 text-[#0F8A5D]" : 
                                                isLoss ? "bg-[#D73A49]/10 text-[#D73A49]" : 
                                                "bg-white/5 text-white/50"
                                            )}>{status}</span>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-mono text-white/60 pt-4 pb-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-white/60 text-center pt-4 pb-4">{trade.Price ? `$${parseFloat(trade.Price).toString()}` : '-'}</TableCell>
                                        <TableCell className="text-[11px] font-medium text-white/60 text-center pt-4 pb-4">{trade.ClosePrice ? `$${parseFloat(trade.ClosePrice).toString()}` : '-'}</TableCell>
                                        <TableCell className={cn("text-[11px] font-bold text-right pt-4 pb-4", isWin ? "text-[#0F8A5D]" : "text-[#D73A49]")}>
                                            {isWin ? '+' : ''}${Math.abs(trade.net_pnl).toFixed(2)}
                                        </TableCell>
                                        <TableCell className={cn("text-[11px] font-medium text-right pt-4 pb-4", isWin ? "text-[#0F8A5D]/80" : "text-[#D73A49]/80")}>
                                            {trade.ROI ? `${parseFloat(trade.ROI) > 0 ? '+' : ''}${parseFloat(trade.ROI).toFixed(2)}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center pt-4 pb-4 text-[11px] text-white/20">-</TableCell>
                                        <TableCell className="text-center pt-4 pb-4 text-[11px] text-white/20">-</TableCell>
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
                <div className="flex items-center justify-between px-6 pt-6 pb-2 text-[11px] font-medium text-white/40">
                    <div className="flex items-center gap-3">
                        <span>Trades per page</span>
                        <div className="bg-[#1a1a1a] py-1 px-2 rounded-md flex items-center gap-1.5 text-white/80 cursor-pointer">
                            {tradesPerPage} <ChevronDown className="h-3 w-3 opacity-50" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span>1 - {Math.min(tradesPerPage, sortedTrades.length)} of {sortedTrades.length} trades</span>
                        <div className="flex items-center gap-1">
                            <span className="px-2">1 of {totalPages} pages</span>
                            <div className="flex gap-0.5 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 bg-white/5 text-white/50 rounded-sm hover:text-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
