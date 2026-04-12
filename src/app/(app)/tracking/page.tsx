'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, ChevronLeft, ChevronDown, Info, Settings, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, parse, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradeData } from '@/contexts/TradeDataContext';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';

// Helper for drawing arcs in the half-circle "Rainbow" Win % Gauge
function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 180) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number){
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    const d = [
        "M", start.x, start.y, 
        "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;       
}

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

             const netPnl = parseFloat((trade.NetPnL || (trade as any)['Net Proceeds']) || '0');
             const grossPnl = parseFloat((trade.GrossPnl || trade.NetPnL) || '0');
             const rAmount = parseFloat((trade.ROI) || '0');
             const closePrice = trade.ClosePrice || (trade as any)['Exit Price'] || (trade as any)['Close Price'];
             const entryPrice = trade.Price || (trade as any)['Entry Price'];
             
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
                 roi_safe: rAmount,
                 close_price_safe: closePrice,
                 entry_price_safe: entryPrice,
                 open_time: trade.OpenTime || `${format(parsedDate || new Date(), 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
                 close_time: trade.CloseTime || `${format(parsedDate || new Date(), 'yyyy-MM-dd')} ${trade['Exec Time'] || '00:00:00'}`,
             }
        });

        const sorted = normalizedTrades.sort((a, b) => compareDesc(a.parsedDate, b.parsedDate));
        
        const totalTrades = winCount + lossCount;
        const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
        const profitFactor = grossLosses === 0 ? (grossWins > 0 ? 99.99 : 0) : (grossWins / grossLosses);
        const avgWin = winCount > 0 ? (totalWinAmount / winCount) : 0;
        const avgLoss = lossCount > 0 ? (totalLossAmount / lossCount) : 0;
        const rewardToRisk = avgLoss === 0 ? (avgWin > 0 ? 99.99 : 0) : (avgWin / avgLoss);

        return { 
            sortedTrades: sorted, 
            stats: { totalPnl, winRate, profitFactor, avgWin, avgLoss, rewardToRisk, winCount, lossCount, totalTrades } 
        };
    }, [tradeData]);

    const totalPages = Math.ceil(sortedTrades.length / tradesPerPage);
    const paginatedTrades = sortedTrades.slice((currentPage - 1) * tradesPerPage, currentPage * tradesPerPage);

    // Donut Math for Profit Factor (bounded at 3 for scale limit)
    const pfScale = Math.min((stats?.profitFactor || 0) / 3 * 100, 100);
    const pfStrokeDasharray = `${pfScale} ${100 - pfScale}`;

    // Arc Math for Win Rate 
    const winRateVal = stats?.winRate || 0;
    const arcEndDegrees = (winRateVal / 100) * 180;

    if (isLoading) {
        return <div className="container mx-auto p-6 text-center text-white/50">Loading trade view...</div>;
    }

    return (
        <div className="container mx-auto max-w-[1500px] pt-4 pb-20 px-6 font-sans">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hidden md:flex hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></Button>
                    <h1 className="text-xl font-bold text-white tracking-tight">Trade View</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs">
                        <Filter className="h-3 w-3 text-white/50" /> Filters
                    </Button>
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs">
                        <CalendarIcon className="h-3 w-3 text-white/50" /> Date range
                    </Button>
                    <Button variant="outline" className="bg-[#121212] border-white/5 hover:bg-[#1a1a1a] text-white/80 hidden md:flex items-center gap-2 h-9 text-xs flex-1 sm:flex-initial justify-between">
                       All accounts
                    </Button>
                </div>
            </div>

            {/* Top 4 Metrics Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Net Cumulative P&L */}
                <div className="bg-[#121212] rounded-[10px] flex flex-col justify-between p-5 h-[120px]">
                    <div className="flex items-center text-white/50">
                        <p className="text-[11px] font-bold tracking-wide">Net cumulative P&L</p>
                        <Info className="h-3 w-3 ml-2 opacity-50" />
                    </div>
                    <div className="flex items-end justify-between gap-4 h-full">
                        <h2 className={cn("text-[26px] font-bold tracking-tight mb-1", stats?.totalPnl && stats.totalPnl >= 0 ? "text-white" : "text-white")}>
                            {stats?.totalPnl && stats.totalPnl < 0 ? '-' : ''}${Math.abs(stats?.totalPnl || 0).toFixed(2)}
                        </h2>
                        <div className="flex-1 max-w-[120px] -mb-2">
                             <RunningPnLChart trades={sortedTrades} className="h-10 mt-0 mx-0 opacity-100" />
                        </div>
                    </div>
                </div>

                {/* 2. Profit Factor */}
                <div className="bg-[#121212] rounded-[10px] flex flex-col justify-between p-5 h-[120px]">
                     <div className="flex items-center text-white/50">
                         <p className="text-[11px] font-bold tracking-wide">Profit factor</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="flex items-end justify-between h-full pt-1">
                         <h2 className="text-[26px] font-bold text-white tracking-tight mb-0.5">{stats?.profitFactor.toFixed(2) || '0.00'}</h2>
                         <div className="relative w-12 h-12 mb-0.5 pointer-events-none">
                             <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                 {/* Background Ring Red */}
                                 <path
                                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                     fill="none"
                                     stroke="#D73A49"
                                     strokeWidth="3.5"
                                 />
                                 {/* Foreground Ring Green */}
                                 <path
                                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                     fill="none"
                                     stroke="#0F8A5D"
                                     strokeWidth="3.5"
                                     strokeDasharray={pfStrokeDasharray}
                                 />
                             </svg>
                         </div>
                     </div>
                </div>

                {/* 3. Trade Win % */}
                <div className="bg-[#121212] rounded-[10px] flex flex-col justify-between p-5 h-[120px]">
                     <div className="flex items-center text-white/50 mb-1">
                         <p className="text-[11px] font-bold tracking-wide">Trade win %</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="flex items-end justify-between relative mt-auto h-full">
                         <h2 className="text-[26px] font-bold text-white tracking-tight mb-0.5">{stats?.winRate.toFixed(2) || '0.00'}%</h2>
                         
                         {/* Half Circle Gauge */}
                         <div className="absolute right-0 bottom-0.5 w-[72px] flex flex-col items-center">
                             <svg viewBox="0 0 100 50" className="w-[60px] h-[30px] overflow-visible">
                                 {/* Background Rail */}
                                 <path d={describeArc(50, 45, 45, 0, 180)} fill="none" stroke="#D73A49" strokeWidth="10" strokeLinecap="round" opacity="0.3"/>
                                 {/* Foreground Arc */}
                                 <path d={describeArc(50, 45, 45, 0, arcEndDegrees)} fill="none" stroke="#0F8A5D" strokeWidth="10" strokeLinecap="round" />
                             </svg>
                             <div className="flex w-[60px] justify-between text-[8px] font-bold mt-2">
                                <div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#0F8A5D]"></span><span className="text-[#0F8A5D]">{stats?.winCount || 0}</span></div>
                                <div className="text-white/20">{stats?.totalTrades || 0}</div>
                                <div className="flex items-center gap-1.5 text-[#D73A49]"><span className="text-[#D73A49]">{stats?.lossCount || 0}</span><span className="w-1.5 h-1.5 rounded-full bg-[#D73A49]"></span></div>
                             </div>
                         </div>
                     </div>
                </div>

                {/* 4. Avg Win/Loss Trade */}
                <div className="bg-[#121212] rounded-[10px] flex flex-col justify-between pt-5 px-5 pb-[22px] h-[120px]">
                     <div className="flex items-center text-white/50">
                         <p className="text-[11px] font-bold tracking-wide">Avg win/loss trade</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="mt-auto w-full">
                        <div className="flex items-baseline justify-between mb-2">
                            <h2 className="text-[26px] font-bold text-white tracking-tight leading-none">{stats?.rewardToRisk.toFixed(2) || '0.00'}</h2>
                            <div className="flex gap-4 text-[10px] font-bold">
                                <span className="text-[#0F8A5D]">${Math.abs(stats?.avgWin || 0).toFixed(1)}</span>
                                <span className="text-[#D73A49]">-${Math.abs(stats?.avgLoss || 0).toFixed(1)}</span>
                            </div>
                        </div>
                        {/* Thin Bi-directional Bar */}
                        <div className="w-full h-[3px] flex rounded-full overflow-hidden bg-white/5 relative">
                            {/* Visual Middle Divider */}
                            <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-[#121212] z-10"></div>
                            
                            {/* Win Ratio - Maps to left side */}
                            <div className="h-full flex-1 flex justify-end">
                                <div className="h-full bg-[#0F8A5D] transition-all" style={{ width: `${Math.min(100, Math.max(0, (stats?.avgWin || 0) / (stats?.avgWin || 1 + (stats?.avgLoss || 1)) * 100))}%` }}></div>
                            </div>
                            
                            {/* Loss Ratio - Maps to right side */}
                            <div className="h-full flex-1 flex justify-start">
                                <div className="h-full bg-[#D73A49] transition-all" style={{ width: `${Math.min(100, Math.max(0, (stats?.avgLoss || 0) / (stats?.avgLoss || 1 + (stats?.avgWin || 1)) * 100))}%` }}></div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Main Trades Table Card */}
            <div className="bg-[#121212] rounded-xl flex flex-col overflow-hidden pb-4">
                <div className="flex items-center justify-between p-5 border-b border-white/[0.04]">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:text-white rounded-[4px] bg-white/5 hover:bg-white/10"><Settings className="h-3.5 w-3.5" /></Button>
                    </div>
                    <Button className="bg-[#1a1a1a] hover:bg-[#222] text-white/80 h-7 text-[11px] font-medium px-4 rounded-[4px] transition-none">
                        Bulk actions <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                    </Button>
                </div>
                
                <div className="overflow-x-auto min-h-[500px]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-white/[0.04] hover:bg-transparent">
                                <TableHead className="w-12 text-center pl-4"><input type="checkbox" className="rounded-sm bg-white/5 border-white/10" /></TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide">Open date</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide">Symbol</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-center">Status</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide">Close date</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-center">Entry price</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-center">Exit price</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-right">Net P&L</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-right">Net ROI</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-center">Bady Insights</TableHead>
                                <TableHead className="text-[10px] font-bold text-white/50 tracking-wide text-center">Bady Scale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTrades.map((trade, i) => {
                                const isWin = trade.net_pnl > 0;
                                const isLoss = trade.net_pnl < 0;
                                const status = isWin ? 'WIN' : (isLoss ? 'LOSS' : 'BE');
                                
                                return (
                                    <TableRow key={trade.id || i} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors border-transparent cursor-pointer">
                                        <TableCell className="text-center pl-4 pt-4 pb-4"><input type="checkbox" className="rounded-[4px] bg-white/5 border-white/10 accent-indigo-600 w-3.5 h-3.5 appearance-none checked:bg-indigo-600 relative overflow-hidden" /></TableCell>
                                        <TableCell className="text-[11px] font-mono text-white/60 pt-4 pb-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-bold text-white pt-4 pb-4">{trade.Symbol || 'N/A'}</TableCell>
                                        <TableCell className="text-center pt-4 pb-4">
                                            <span className={cn(
                                                "text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] inline-block min-w-[45px]",
                                                isWin ? "text-[#0F8A5D]" : 
                                                isLoss ? "text-[#D73A49]" : 
                                                "text-white/50"
                                            )}>{status}</span>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-mono text-white/60 pt-4 pb-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-medium text-white/60 text-center pt-4 pb-4">{trade.entry_price_safe ? `$${parseFloat(trade.entry_price_safe).toString()}` : '-'}</TableCell>
                                        <TableCell className="text-[11px] font-medium text-white/60 text-center pt-4 pb-4">{trade.close_price_safe ? `$${parseFloat(trade.close_price_safe).toString()}` : '-'}</TableCell>
                                        <TableCell className={cn("text-[11px] font-bold text-right pt-4 pb-4", isWin ? "text-[#0F8A5D]" : "text-[#D73A49]")}>
                                            {isWin ? '+' : ''}${Math.abs(trade.net_pnl).toFixed(2)}
                                        </TableCell>
                                        <TableCell className={cn("text-[11px] font-medium text-right pt-4 pb-4", isWin ? "text-[#0F8A5D]/80" : "text-[#D73A49]/80")}>
                                            {typeof trade.roi_safe === 'number' ? `${trade.roi_safe > 0 ? '+' : ''}${trade.roi_safe.toFixed(2)}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center pt-4 pb-4 text-[11px] text-white/20">-</TableCell>
                                        <TableCell className="text-center pt-4 pb-4 text-[11px] text-white/20">-</TableCell>
                                    </TableRow>
                                )
                            })}
                            {paginatedTrades.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={11} className="text-center py-24 text-white/30 text-sm border-b-0">
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
                        <div className="bg-[#1a1a1a] py-1 px-2 rounded-sm flex items-center gap-1.5 text-white/80 cursor-pointer">
                            {tradesPerPage} <ChevronDown className="h-3 w-3 opacity-50" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <span>{Math.min(1 + (currentPage - 1) * tradesPerPage, sortedTrades.length)} – {Math.min(currentPage * tradesPerPage, sortedTrades.length)} of {sortedTrades.length} trades</span>
                        <div className="flex items-center gap-2">
                            <span className="px-2">{currentPage} of {totalPages || 1} pages</span>
                            <div className="flex gap-1 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6 bg-[#1a1a1a] hover:bg-[#222] text-white/50 rounded-sm hover:text-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
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
