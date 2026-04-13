'use client';

import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronRight, ChevronLeft, ChevronDown, Info, Settings, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { format, parse, isValid, compareDesc } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTradeData } from '@/contexts/TradeDataContext';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';
import { useLanguage } from '@/contexts/LanguageContext';

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
    const { t } = useLanguage();
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

             const netPnl = parseFloat((trade.NetPnL || trade['Net Proceeds'] || trade['P&L']) || '0');
             const grossPnl = parseFloat((trade.GrossPnl || trade.NetPnL) || '0');
             const roi = parseFloat((trade.ROI || trade['ROI %']) || '0');
             const rMultiple = parseFloat((trade.RMultiple || trade['R-Multiple'] || trade['R']) || '0');
             const closePrice = trade.ClosePrice || trade['Exit Price'] || trade['Close Price'];
             const entryPrice = trade.Price || trade['Entry Price'];
             
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
                 roi_safe: roi,
                 r_multiple: rMultiple,
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
        return <div className="container mx-auto p-6 text-center text-muted-foreground transition-all">{t('Loading Portfolio...')}</div>;
    }

    return (
        <div className="container mx-auto max-w-[1500px] pt-4 pb-20 px-6 font-sans">
            {/* Header Area */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:bg-[var(--stats-card-hover)]"><ChevronLeft className="h-4 w-4" /></Button>
                    <h1 className="text-xl font-bold text-[var(--foreground)] tracking-tight">{t('Trade View')}</h1>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="bg-[var(--stats-card)] border-[var(--stats-card-border)] hover:bg-[var(--stats-card-hover)] text-[var(--foreground)]/80 flex items-center gap-2 h-9 text-xs">
                        <Filter className="h-3 w-3 text-muted-foreground" /> {t('Filters')}
                    </Button>
                    <Button variant="outline" className="bg-[var(--stats-card)] border-[var(--stats-card-border)] hover:bg-[var(--stats-card-hover)] text-[var(--foreground)]/80 flex items-center gap-2 h-9 text-xs">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" /> {t('Date range')}
                    </Button>
                    <Button variant="outline" className="bg-[var(--stats-card)] border-[var(--stats-card-border)] hover:bg-[var(--stats-card-hover)] text-[var(--foreground)]/80 flex items-center gap-2 h-9 text-xs">
                       {t('All accounts')}
                    </Button>
                </div>
            </div>

            {/* Top 4 Metrics Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* 1. Net Cumulative P&L */}
                <div className="bg-[var(--stats-card)] border border-[var(--stats-card-border)] rounded-[10px] flex flex-col justify-between p-5 h-[130px] shadow-sm group hover:border-[var(--win-green)]/30 transition-all overflow-hidden relative">
                    <div className="flex items-center text-muted-foreground relative z-10">
                        <p className="text-[11px] font-bold tracking-wide">{t('Net cumulative P&L')}</p>
                        <Info className="h-3 w-3 ml-2 opacity-50" />
                    </div>
                    <div className="flex items-center justify-between gap-4 h-full relative z-10">
                        <h2 className={cn("text-[26px] font-bold tracking-tight mb-1", (stats?.totalPnl || 0) >= 0 ? "text-win-green" : "text-loss-red")}>
                            {(stats?.totalPnl || 0) < 0 ? '-' : ''}${Math.abs(stats?.totalPnl || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h2>
                        <div className="flex-1 max-w-[140px] h-12">
                             <RunningPnLChart trades={sortedTrades} className="h-full w-full opacity-60" />
                        </div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-win-green/10 to-transparent"></div>
                </div>

                {/* 2. Profit Factor */}
                <div className="bg-[var(--stats-card)] border border-[var(--stats-card-border)] rounded-[10px] flex flex-col justify-between p-5 h-[130px] shadow-sm hover:border-[var(--win-green)]/30 transition-all">
                     <div className="flex items-center text-muted-foreground">
                         <p className="text-[11px] font-bold tracking-wide">{t('Profit factor')}</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="flex items-center justify-between h-full pt-1">
                         <h2 className="text-[26px] font-bold text-[var(--foreground)] tracking-tight">{stats?.profitFactor.toFixed(2) || '0.00'}</h2>
                         <div className="relative w-14 h-14 mb-0.5">
                             <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                                 <path
                                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                     fill="none"
                                     stroke="var(--loss-red)"
                                     strokeWidth="3.5"
                                     opacity="0.1"
                                 />
                                 <path
                                     d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                     fill="none"
                                     stroke="var(--win-green)"
                                     strokeWidth="3.5"
                                     strokeDasharray={pfStrokeDasharray}
                                     strokeLinecap="round"
                                     className="transition-all duration-1000 ease-out"
                                 />
                             </svg>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-1.5 h-1.5 rounded-full bg-win-green/40 shadow-[0_0_8px_hsl(var(--win-green))]"></div>
                             </div>
                         </div>
                     </div>
                </div>

                {/* 3. Trade Win % */}
                <div className="bg-[var(--stats-card)] border border-[var(--stats-card-border)] rounded-[10px] flex flex-col justify-between p-5 h-[130px] shadow-sm hover:border-[var(--win-green)]/30 transition-all">
                     <div className="flex items-center text-muted-foreground mb-1">
                          <p className="text-[11px] font-bold tracking-wide">{t('Trade win %')}</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="flex items-center justify-between relative mt-auto h-full">
                         <h2 className="text-[26px] font-bold text-[var(--foreground)] tracking-tight mb-0.5">{stats?.winRate.toFixed(1) || '0.0'}%</h2>
                         
                         <div className="absolute right-0 bottom-2 w-[80px] flex flex-col items-center">
                             <svg viewBox="0 0 100 50" className="w-[70px] h-[35px] overflow-visible">
                                 <path d={describeArc(50, 45, 42, 0, 180)} fill="none" stroke="var(--foreground)" strokeWidth="8" strokeLinecap="round" opacity="0.05"/>
                                 <path d={describeArc(50, 45, 42, 0, arcEndDegrees)} fill="none" stroke="var(--win-green)" strokeWidth="8" strokeLinecap="round" className="transition-all duration-1000 ease-out" />
                             </svg>
                             <div className="flex w-full justify-between text-[8px] font-black mt-2 px-1">
                                <span className="text-win-green font-black">{stats?.winCount || 0}</span>
                                <span className="text-muted-foreground/30">{stats?.totalTrades || 0}</span>
                                <span className="text-loss-red font-black">{stats?.lossCount || 0}</span>
                             </div>
                         </div>
                     </div>
                </div>

                {/* 4. Avg Win/Loss Trade */}
                <div className="bg-[var(--stats-card)] border border-[var(--stats-card-border)] rounded-[10px] flex flex-col justify-between pt-5 px-5 pb-5 h-[130px] shadow-sm hover:border-[var(--win-green)]/30 transition-all">
                     <div className="flex items-center text-muted-foreground">
                          <p className="text-[11px] font-bold tracking-wide">{t('Avg win/loss trade')}</p>
                         <Info className="h-3 w-3 ml-2 opacity-50" />
                     </div>
                     <div className="mt-auto w-full">
                        <div className="flex items-baseline justify-between mb-3">
                            <h2 className="text-[26px] font-bold text-[var(--foreground)] tracking-tight leading-none">{stats?.rewardToRisk.toFixed(2) || '0.00'}</h2>
                            <div className="flex gap-4 text-[9px] font-black uppercase tracking-tighter">
                                <span className="text-[var(--win-green)]">${Math.abs(stats?.avgWin || 0).toFixed(0)}</span>
                                <span className="text-[var(--loss-red)]">-${Math.abs(stats?.avgLoss || 0).toFixed(0)}</span>
                            </div>
                        </div>
                        <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-muted/10 relative border border-border/10">
                            <div className="absolute left-[50%] top-0 bottom-0 w-[1px] bg-[var(--background)] z-10"></div>
                            <div className="h-full flex-1 flex justify-end">
                                <div className="h-full bg-win-green transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(0, (stats?.avgWin || 0) / ((stats?.avgWin || 1) + (stats?.avgLoss || 1)) * 100))}%` }}></div>
                            </div>
                            <div className="h-full flex-1 flex justify-start">
                                <div className="h-full bg-loss-red transition-all duration-1000" style={{ width: `${Math.min(100, Math.max(0, (stats?.avgLoss || 0) / ((stats?.avgLoss || 1) + (stats?.avgWin || 1)) * 100))}%` }}></div>
                            </div>
                        </div>
                     </div>
                </div>
            </div>

            {/* Main Trades Table Card */}
            <div className="bg-[var(--stats-card)] border border-[var(--stats-card-border)] rounded-xl flex flex-col overflow-hidden pb-4 shadow-xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--stats-card-border)] bg-muted/5">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-[var(--foreground)] rounded-md bg-[var(--stats-card-hover)]/40"><Settings className="h-4 w-4" /></Button>
                        <div className="h-4 w-[1px] bg-[var(--stats-card-border)] mx-1"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/50">{t('Trades Journal')}</p>
                    </div>
                    <Button variant="outline" className="bg-[var(--stats-card-hover)] hover:brightness-110 text-[var(--foreground)]/60 h-8 text-[11px] font-black uppercase tracking-widest px-4 rounded-md border-[var(--stats-card-border)] transition-all">
                        {t('Bulk actions')} <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                    </Button>
                </div>
                
                <div className="overflow-x-auto min-h-[600px]">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b border-[var(--stats-card-border)] hover:bg-transparent bg-muted/10">
                                <TableHead className="w-12 text-center pl-4"><input type="checkbox" className="rounded-sm bg-[var(--stats-card-hover)] border-[var(--stats-card-border)]" /></TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4">{t('Open date')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4">{t('Symbol')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-center">{t('Status')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4">{t('Close date')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-center">{t('Entry price')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-center">{t('Exit price')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-right">{t('Net P&L')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-right">{t('Net ROI')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-center">{t('Bady Insights')}</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 py-4 text-center">{t('Bady Scale')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedTrades.map((trade, i) => {
                                const isWin = trade.net_pnl > 0;
                                const isLoss = trade.net_pnl < 0;
                                const status = isWin ? 'WIN' : (isLoss ? 'LOSS' : 'BE');
                                
                                // Bady Scale Math 
                                const pnlRatio = Math.min(100, Math.max(0, (trade.net_pnl / (stats?.avgWin || 1)) * 50 + 50));

                                return (
                                    <TableRow 
                                        key={trade.id || i} 
                                        className="group border-b border-[var(--stats-card-border)] hover:bg-[var(--stats-card-hover)] transition-all cursor-pointer"
                                        onClick={() => window.location.href = `/trades/${trade.id}`}
                                    >
                                        <TableCell className="text-center pl-4 py-4"><input type="checkbox" className="rounded-sm bg-[var(--stats-card-hover)] border-[var(--stats-card-border)] accent-[var(--win-green)]" /></TableCell>
                                        <TableCell className="text-[11px] font-mono text-[var(--foreground)]/60 py-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[12px] font-black text-[var(--foreground)] py-4 tracking-tight">{trade.Symbol || 'N/A'}</TableCell>
                                        <TableCell className="text-center py-4">
                                            <span className={cn(
                                                "text-[9px] font-black uppercase px-2 py-1 rounded-[4px] border inline-block min-w-[50px] tracking-widest",
                                                isWin ? "text-win-green border-win-green/20 bg-win-green/5" : 
                                                isLoss ? "text-loss-red border-loss-red/20 bg-loss-red/5" : 
                                                "text-muted-foreground border-border/20 bg-muted/10"
                                            )}>{t(status)}</span>
                                        </TableCell>
                                        <TableCell className="text-[11px] font-mono text-[var(--foreground)]/60 py-4">
                                            {format(trade.parsedDate, 'MM/dd/yyyy')}
                                        </TableCell>
                                        <TableCell className="text-[11px] font-bold text-[var(--foreground)]/50 text-center py-4">{trade.entry_price_safe ? `$${parseFloat(trade.entry_price_safe).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '-'}</TableCell>
                                        <TableCell className="text-[11px] font-bold text-[var(--foreground)]/50 text-center py-4">{trade.close_price_safe ? `$${parseFloat(trade.close_price_safe).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}` : '-'}</TableCell>
                                        <TableCell className={cn("text-[12px] font-black text-right py-4", isWin ? "text-[var(--win-green)]" : "text-[var(--loss-red)]")}>
                                            {isWin ? '+' : ''}${Math.abs(trade.net_pnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className={cn("text-[11px] font-black text-right py-4 px-2", isWin ? "text-[var(--win-green)]/70" : "text-[var(--loss-red)]/70")}>
                                            {typeof trade.roi_safe === 'number' ? `${trade.roi_safe > 0 ? '+' : ''}${trade.roi_safe.toFixed(2)}%` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center py-4 text-[11px] font-black text-[var(--foreground)]/60">
                                            {trade.r_multiple ? `${trade.r_multiple} R` : '-'}
                                        </TableCell>
                                        <TableCell className="text-center py-4 px-6 min-w-[120px]">
                                            <div className="w-full h-1 bg-muted/20 rounded-full overflow-hidden relative group-hover:bg-muted/40 transition-all">
                                                <div 
                                                    className={cn("h-full transition-all duration-700", isWin ? "bg-win-green" : "bg-loss-red")} 
                                                    style={{ width: `${pnlRatio}%` }}
                                                />
                                                <div className="absolute left-[50%] top-0 h-full w-[1px] bg-background"></div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination Footer */}
                <div className="flex items-center justify-between px-6 pt-6 pb-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/40">
                    <div className="flex items-center gap-4">
                        <span>{t('Trades per page')}:</span>
                        <div className="bg-[var(--stats-card-hover)] border border-[var(--stats-card-border)] py-1.5 px-3 rounded-md flex items-center gap-3 text-[var(--foreground)]/80 cursor-pointer hover:bg-muted/20 transition-all">
                            {tradesPerPage} <ChevronDown className="h-3 w-3 opacity-50 ml-2" />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <span>{Math.min(1 + (currentPage - 1) * tradesPerPage, sortedTrades.length)} – {Math.min(currentPage * tradesPerPage, sortedTrades.length)} {t('of')} {sortedTrades.length}</span>
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-muted/10 hover:bg-muted/20 text-muted-foreground rounded-md transition-all" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 bg-[var(--win-green)]/10 hover:bg-[var(--win-green)]/20 text-[var(--win-green)] rounded-md transition-all shadow-sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
