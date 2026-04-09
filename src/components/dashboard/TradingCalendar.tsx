
// src/components/dashboard/TradingCalendar.tsx
'use client';

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  format,
  startOfMonth,
  addMonths,
  subMonths,
  addDays,
  isSameMonth,
  isSameDay,
  getDay,
  parse,
  getISOWeek,
  isValid,
  compareAsc,
  startOfWeek,
} from 'date-fns';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ChevronLeft, ChevronRight, Info, UploadCloud, TrendingUp, TrendingDown, X, Camera, Settings, RefreshCw, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CsvTradeData, CsvCommissionData, BalanceOperation } from '@/app/(app)/dashboard/page';
import { isMarketHoliday, getHoliday, isWeekend as isWeekendDay, detectAsset, getAssetEmoji, type AssetClass } from '@/lib/market-holidays';
import { useLanguage } from '@/contexts/LanguageContext';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode;
    rate: number;
}

interface CalendarDayData {
    grossProfitloss: number;
    profitloss: number;
    netCash: number;
    trades: number;
    rValue: number;
    commission: number;
    totalSECFee: number;
    totalFee1: number;
    totalFee2: number;
    totalFee3: number;
    totalFee4: number;
    totalFee5: number;
    winningTrades: number;
    losingTrades: number;
    tradeList: Array<{ 
        symbol: string; 
        side: string; 
        netPnl: number; 
        grossPnl: number; 
        execTime: string;
        roi?: string;
        rMultiple?: string;
        strategy?: string;
        volume?: string;
        ticks?: string;
        pips?: string;
    }>;
}

interface WeeklySummaryData {
    grossProfitlossFromTrades: number;
    netProfitLossFromTrades: number;
    totalNetCash: number;
    uploadedCommissions: number;
    totalSECFee: number;
    totalFee1: number;
    totalFee2: number;
    totalFee3: number;
    totalFee4: number;
    totalFee5: number;
    daysTraded: number;
    totalTrades: number;
}

const getWeekKey = (date: Date) => {
    return `${format(date, 'yyyy')}-W${getISOWeek(date).toString().padStart(2, '0')}`;
}

const calculateDailySummaries = (tradeData: CsvTradeData[], commissionData: CsvCommissionData[]): Record<string, CalendarDayData> => {
    const dailySummaries: Record<string, CalendarDayData> = {};

    tradeData.forEach((trade, index) => {
        try {
            const dateStr = trade.Date;
            if (!dateStr) return;
            let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yy', new Date());
            if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
            if (!isValid(parsedDate)) return;

            const netPnlStr = trade.NetPnL;
            const grossPnlStr = trade.GrossPnl;
            const netCashStr = trade.NetCash;
            const totalSECFeeStr = trade.TotalSECFee;
            const totalFee1Str = trade.TotalFee1;
            const totalFee2Str = trade.TotalFee2;
            const totalFee3Str = trade.TotalFee3;
            const totalFee4Str = trade.TotalFee4;
            const totalFee5Str = trade.TotalFee5;

            if (netPnlStr === undefined || netPnlStr === null) return;
            const netPnl = parseFloat(netPnlStr);
            const grossPnlVal = (grossPnlStr !== undefined && grossPnlStr !== null && !isNaN(parseFloat(grossPnlStr)))
                             ? parseFloat(grossPnlStr)
                             : netPnl;
            const netCashVal = netCashStr !== undefined && netCashStr !== null && !isNaN(parseFloat(netCashStr)) ? parseFloat(netCashStr) : 0;
            const totalSECFeeVal = totalSECFeeStr !== undefined && totalSECFeeStr !== null && !isNaN(parseFloat(totalSECFeeStr)) ? parseFloat(totalSECFeeStr) : 0;
            const totalFee1Val = totalFee1Str !== undefined && totalFee1Str !== null && !isNaN(parseFloat(totalFee1Str)) ? parseFloat(totalFee1Str) : 0;
            const totalFee2Val = totalFee2Str !== undefined && totalFee2Str !== null && !isNaN(parseFloat(totalFee2Str)) ? parseFloat(totalFee2Str) : 0;
            const totalFee3Val = totalFee3Str !== undefined && totalFee3Str !== null && !isNaN(parseFloat(totalFee3Str)) ? parseFloat(totalFee3Str) : 0;
            const totalFee4Val = totalFee4Str !== undefined && totalFee4Str !== null && !isNaN(parseFloat(totalFee4Str)) ? parseFloat(totalFee4Str) : 0;
            const totalFee5Val = totalFee5Str !== undefined && totalFee5Str !== null && !isNaN(parseFloat(totalFee5Str)) ? parseFloat(totalFee5Str) : 0;

            let rValue = 0;
            const noteStr = trade.Note;
            if (noteStr) {
                const rMatch = noteStr.match(/R:?(-?\d+(\.\d+)?)/i);
                if (rMatch && rMatch[1]) rValue = parseFloat(rMatch[1]);
                else if (!isNaN(parseFloat(noteStr))) rValue = parseFloat(noteStr);
            }
            if (isNaN(netPnl) || isNaN(grossPnlVal)) return;

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            if (!dailySummaries[dateKey]) {
                dailySummaries[dateKey] = {
                    grossProfitloss: 0, profitloss: 0, netCash: 0, trades: 0, rValue: 0,
                    commission: 0, totalSECFee: 0, totalFee1: 0, totalFee2: 0, totalFee3: 0,
                    totalFee4: 0, totalFee5: 0, winningTrades: 0, losingTrades: 0, tradeList: []
                };
            }
            dailySummaries[dateKey].grossProfitloss += grossPnlVal;
            dailySummaries[dateKey].profitloss += netPnl;
            dailySummaries[dateKey].netCash += netCashVal;
            dailySummaries[dateKey].trades += 1;
            if (netPnl > 0) dailySummaries[dateKey].winningTrades += 1;
            if (netPnl < 0) dailySummaries[dateKey].losingTrades += 1;
            dailySummaries[dateKey].rValue += rValue;
            dailySummaries[dateKey].totalSECFee += totalSECFeeVal;
            dailySummaries[dateKey].totalFee1 += totalFee1Val;
            dailySummaries[dateKey].totalFee2 += totalFee2Val;
            dailySummaries[dateKey].totalFee3 += totalFee3Val;
            dailySummaries[dateKey].totalFee4 += totalFee4Val;
            dailySummaries[dateKey].totalFee5 += totalFee5Val;
            dailySummaries[dateKey].tradeList.push({
                symbol: trade.Symbol || 'N/A',
                side: trade.Side || 'N/A',
                netPnl,
                grossPnl: grossPnlVal,
                execTime: trade['Exec Time'] || '',
                roi: trade.ROI,
                rMultiple: trade.RMultiple,
                strategy: trade.Strategy,
                volume: trade.Volume,
                ticks: trade.Ticks,
                pips: trade.Pips,
            });
        } catch (e) {
            console.warn(`Calendar Trade processing error:`, e);
        }
    });

    commissionData.forEach((commissionEntry) => {
        try {
            const dateStr = commissionEntry.Date;
            if (!dateStr) return;
            let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedDate)) return;

            const commissionAmount = parseFloat(commissionEntry.Commission || '0');
            if (isNaN(commissionAmount)) return;

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            if (!dailySummaries[dateKey]) {
                dailySummaries[dateKey] = {
                    grossProfitloss: 0, profitloss: 0, netCash: 0, trades: 0, rValue: 0,
                    commission: 0, totalSECFee: 0, totalFee1: 0, totalFee2: 0, totalFee3: 0,
                    totalFee4: 0, totalFee5: 0, winningTrades: 0, losingTrades: 0, tradeList: []
                };
            }
            dailySummaries[dateKey].commission += commissionAmount;
        } catch (e) {
            console.warn(`Calendar Commission processing error:`, e);
        }
    });
    return dailySummaries;
};

const calculateWeeklySummaries = (startDate: Date, dailyData: Record<string, CalendarDayData>): Record<string, WeeklySummaryData> => {
    const summaries: Record<string, WeeklySummaryData> = {};
    const numWeeks = 5;
    for (let i = 0; i < numWeeks; i++) {
        const weekStartDate = addDays(startDate, i * 7);
        const weekKey = getWeekKey(weekStartDate);
        summaries[weekKey] = {
            grossProfitlossFromTrades: 0, netProfitLossFromTrades: 0, totalNetCash: 0,
            uploadedCommissions: 0, totalSECFee: 0, totalFee1: 0, totalFee2: 0,
            totalFee3: 0, totalFee4: 0, totalFee5: 0,
            daysTraded: 0, totalTrades: 0
        };
        let currentDayInWeek = weekStartDate;
        for (let j = 0; j < 7; j++) {
            const dateKey = format(currentDayInWeek, 'yyyy-MM-dd');
            const data = dailyData[dateKey];
            if (data) {
                summaries[weekKey].grossProfitlossFromTrades += data.grossProfitloss || 0;
                summaries[weekKey].netProfitLossFromTrades += data.profitloss || 0;
                summaries[weekKey].totalNetCash += data.netCash || 0;
                summaries[weekKey].uploadedCommissions += data.commission || 0;
                summaries[weekKey].totalSECFee += data.totalSECFee || 0;
                summaries[weekKey].totalFee1 += data.totalFee1 || 0;
                summaries[weekKey].totalFee2 += data.totalFee2 || 0;
                summaries[weekKey].totalFee3 += data.totalFee3 || 0;
                summaries[weekKey].totalFee4 += data.totalFee4 || 0;
                summaries[weekKey].totalFee5 += data.totalFee5 || 0;
                summaries[weekKey].totalTrades += data.trades || 0;
                if ((data.trades || 0) > 0) {
                    summaries[weekKey].daysTraded += 1;
                }
            }
            currentDayInWeek = addDays(currentDayInWeek, 1);
        }
    }
    return summaries;
};

interface TradingCalendarProps {
    selectedCurrency: Currency;
    tradeData: CsvTradeData[];
    commissionData: CsvCommissionData[];
    balanceOperations?: BalanceOperation[];
    onUploadCommissionsClick: () => void;
    showFeesInPnl: boolean;
    onShowFeesToggle: (checked: boolean) => void;
    onSetInitialBalance?: (date: Date, amount: number) => void;
    initialBalance?: number;
}

const formatCalendarCurrency = (value: number | undefined, currency: Currency, showSignForPositive = false): React.ReactNode => {
    if (value === undefined || value === 0) return null;
    const convertedValue = value * currency.rate;
    const sign = convertedValue < 0 ? '-' : (showSignForPositive && convertedValue > 0 ? '+' : '');
    const displaySymbol = typeof currency.symbol === 'string' ? currency.symbol : currency.symbol;

    let minimumFractionDigits = 0;
    const absVal = Math.abs(convertedValue);
    if (absVal % 1 !== 0) {
        minimumFractionDigits = (Math.abs(absVal * 10) % 1 !== 0 && Math.abs(absVal * 100) % 1 !==0) ? 2 : 1;
    }

    const formattedAmount = Math.abs(convertedValue).toLocaleString('en-US', {
         minimumFractionDigits: minimumFractionDigits,
         maximumFractionDigits: 2
    });
    return <span className="inline-flex items-center" dir="ltr">{sign}{displaySymbol}{formattedAmount}</span>;
};

const formatTotalCurrency = (value: number, currency: Currency): React.ReactNode => {
    const convertedValue = value * currency.rate;
    const sign = convertedValue >= 0 ? (value === 0 ? '' : '+') : '-';
    const displaySymbol = typeof currency.symbol === 'string' ? currency.symbol : currency.symbol;
    const formattedAmount = Math.abs(convertedValue).toLocaleString('en-US', {
        maximumFractionDigits: 2,
    });
    return <span className="inline-flex items-center" dir="ltr">{sign}{displaySymbol}{formattedAmount}</span>;
}

// Day Detail Popup component
function DayDetailPopup({
    date,
    data,
    currency,
    showFeesInPnl,
    onClose,
    initialBalance,
    cumulativePnlUpToDay,
}: {
    date: Date;
    data: CalendarDayData;
    currency: Currency;
    showFeesInPnl: boolean;
    onClose: () => void;
    initialBalance?: number;
    cumulativePnlUpToDay?: number;
}) {
    const { t } = useLanguage();
    const pnlForDay = showFeesInPnl
        ? data.profitloss - data.commission - data.totalSECFee // Simplified for mockup
        : data.grossProfitloss;
    const winRate = data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;
    
    // Prepare chart data
    const chartData = useMemo(() => {
        let running = 0;
        return data.tradeList.map((t, i) => {
            running += t.netPnl;
            return { name: i, pnl: running };
        });
    }, [data.tradeList]);

    // Calculate running balance if initial balance is available
    const runningBalance = initialBalance !== undefined && cumulativePnlUpToDay !== undefined
        ? initialBalance + cumulativePnlUpToDay
        : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300 animate-in fade-in" onClick={onClose}>
            <div
                className="bg-zinc-900 border border-white/10 rounded-[32px] shadow-2xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col scale-in-center"
                onClick={e => e.stopPropagation()}
            >
                {/* Header Section */}
                <div className="p-8 pb-4 flex items-start justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <span className="text-2xl font-black text-white">B</span>
                        </div>
                        <div>
                            <h2 className="text-zinc-400 text-sm font-bold uppercase tracking-[0.2em]">{format(date, 'EEEE, MMMM d, yyyy')}</h2>
                            <div className="flex items-baseline gap-4 mt-1">
                                <span className={cn("text-5xl font-black tracking-tighter", pnlForDay >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                    {formatTotalCurrency(pnlForDay, currency)}
                                </span>
                                <Badge variant="outline" className={cn("px-4 py-1 text-xs font-black uppercase tracking-widest border-2", pnlForDay >= 0 ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                                    {pnlForDay >= 0 ? 'Profitable' : 'Losing Day'}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-xs font-black uppercase tracking-widest gap-2">
                             <RefreshCw className="h-3.5 w-3.5" /> Replay
                        </Button>
                        <Button variant="outline" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10 text-xs font-black uppercase tracking-widest gap-2">
                             <Plus className="h-3.5 w-3.5" /> Add Note
                        </Button>
                        <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors ml-4">
                            <X className="h-5 w-5 text-zinc-400" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col flex-grow overflow-hidden px-8 pb-8 gap-6">
                    {/* Top Row: Sparkline and Quick Info */}
                    <div className="grid grid-cols-12 gap-6 h-48">
                        <div className="col-span-8 bg-zinc-800/50 rounded-3xl border border-white/5 p-4 relative overflow-hidden group">
                           <div className="absolute top-4 left-4 z-10">
                               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Intraday Performance</p>
                           </div>
                           <ResponsiveContainer width="100%" height="100%">
                               <AreaChart data={chartData}>
                                   <defs>
                                       <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                                           <stop offset="5%" stopColor={pnlForDay >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                                           <stop offset="95%" stopColor={pnlForDay >= 0 ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                                       </linearGradient>
                                   </defs>
                                   <Area 
                                        type="monotone" 
                                        dataKey="pnl" 
                                        stroke={pnlForDay >= 0 ? "#10b981" : "#ef4444"} 
                                        strokeWidth={4} 
                                        fillOpacity={1} 
                                        fill="url(#pnlGradient)" 
                                        animationDuration={1500}
                                   />
                                   <Tooltip content={() => null} />
                               </AreaChart>
                           </ResponsiveContainer>
                        </div>
                        <div className="col-span-4 grid grid-cols-2 gap-3">
                             <div className="bg-zinc-800/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-center items-center text-center">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Trades</p>
                                 <p className="text-4xl font-black text-white">{data.trades}</p>
                             </div>
                             <div className="bg-zinc-800/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-center items-center text-center">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Win Rate</p>
                                 <p className="text-2xl font-black text-emerald-400">{winRate.toFixed(1)}%</p>
                             </div>
                             <div className="bg-zinc-800/50 rounded-2xl border border-white/5 p-4 flex flex-col justify-center items-center text-center col-span-2">
                                 <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">Cumulative P&L</p>
                                 <p className="text-2xl font-black text-indigo-400">
                                     {runningBalance ? formatTotalCurrency(runningBalance, currency) : "N/A"}
                                 </p>
                             </div>
                        </div>
                    </div>

                    {/* Secondary Metrics Grid */}
                    <div className="grid grid-cols-5 gap-4">
                        {[
                            { label: 'ROI', value: data.tradeList[0]?.roi ? `${data.tradeList[0].roi}%` : '0.0%', color: 'emerald' },
                            { label: 'R-Multiple', value: data.tradeList[0]?.rMultiple || '0.00', color: 'indigo' },
                            { label: 'Shares', value: data.tradeList[0]?.volume || '0', color: 'zinc' },
                            { label: 'Expectancy', value: ((pnlForDay / data.trades) * currency.rate).toFixed(2), color: 'purple' },
                            { label: 'Portfolio', value: 'Manual', color: 'zinc' }
                        ].map((metric, i) => (
                            <div key={i} className="bg-zinc-800/30 rounded-2xl border border-white/5 p-4 py-3">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">{metric.label}</p>
                                <p className={cn("text-lg font-black", `text-${metric.color}-400`)}>{metric.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Trade Breadown Table */}
                    <div className="flex-grow bg-zinc-800/20 rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-inner">
                        <div className="grid grid-cols-7 px-6 py-4 bg-white/5 text-[10px] font-black uppercase tracking-widest text-zinc-500 border-b border-white/5">
                            <div className="col-span-1">Open Time</div>
                            <div className="col-span-1">Ticker</div>
                            <div className="col-span-1">Side</div>
                            <div className="col-span-1">Qty</div>
                            <div className="col-span-1">Price</div>
                            <div className="col-span-1">Strategy</div>
                            <div className="col-span-1 text-right">Net P&L</div>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                             {data.tradeList.map((trade, i) => (
                                 <div key={i} className="grid grid-cols-7 px-6 py-4 border-b border-white/5 hover:bg-white/5 transition-colors items-center group">
                                     <div className="text-[11px] font-bold text-zinc-400">{trade.execTime.split(' ')[1] || '---'}</div>
                                     <div className="text-xs font-black text-white">{trade.symbol}</div>
                                     <div>
                                         <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", trade.side === 'Buy' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20")}>
                                             {trade.side}
                                         </Badge>
                                     </div>
                                     <div className="text-[11px] font-bold text-zinc-400">{trade.volume || '0'}</div>
                                     <div className="text-[11px] font-bold text-zinc-400">{trade.execTime.split(' ')[0]}</div>
                                     <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{trade.strategy || 'Trend'}</div>
                                     <div className={cn("text-xs font-black text-right", trade.netPnl >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                         {formatTotalCurrency(trade.netPnl, currency)}
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function TradingCalendar({selectedCurrency, tradeData, commissionData, balanceOperations = [], onUploadCommissionsClick, showFeesInPnl, onShowFeesToggle, onSetInitialBalance, initialBalance}: TradingCalendarProps) {
    const { isArabic, t } = useLanguage();
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfMonth(new Date()));

    // Balance Dialog State
    const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
    const [selectedDayForBalance, setSelectedDayForBalance] = useState<Date | null>(null);
    const [balanceInput, setBalanceInput] = useState<string>("");

    // Day Detail Popup State
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<{ date: Date; data: CalendarDayData } | null>(null);

    const dayData = useMemo(() => calculateDailySummaries(tradeData, commissionData), [tradeData, commissionData]);

    const handlePrevMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
    const handleNextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));

    const startDate = startOfWeek(currentMonthDate);
    const weeklySummaries = useMemo(() => calculateWeeklySummaries(startDate, dayData), [startDate, dayData]);

    // Calculate cumulative P&L up to each day for running balance
    const cumulativePnlMap = useMemo(() => {
        const result: Record<string, number> = {};
        const sortedDateKeys = Object.keys(dayData).sort();
        let cumPnl = 0;
        for (const dateKey of sortedDateKeys) {
            const data = dayData[dateKey];
            const pnl = showFeesInPnl
                ? (data.profitloss - data.commission - data.netCash)
                : data.grossProfitloss;
            cumPnl += pnl;
            result[dateKey] = cumPnl;
        }
        return result;
    }, [dayData, showFeesInPnl]);

    const handleOpenBalanceDialog = (date: Date) => {
        setSelectedDayForBalance(date);
        setBalanceInput("500.00");
        setIsBalanceDialogOpen(true);
    };

    const handleSetBalance = () => {
        if (selectedDayForBalance && onSetInitialBalance) {
            onSetInitialBalance(selectedDayForBalance, parseFloat(balanceInput));
        }
        setIsBalanceDialogOpen(false);
    };

    const handleDayClick = useCallback((date: Date, data: CalendarDayData | undefined) => {
        if (data && data.trades > 0) {
            setSelectedDayForDetail({ date, data });
        }
    }, []);

    const dayLabels = isArabic
        ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Calculate monthly stats for header
    const monthlyStats = useMemo(() => {
        let net = 0;
        let days = 0;
        for (const key in dayData) {
            const date = parse(key, 'yyyy-MM-dd', new Date());
            if (isSameMonth(date, currentMonthDate)) {
                net += showFeesInPnl 
                    ? dayData[key].profitloss - dayData[key].commission - dayData[key].totalSECFee
                    : dayData[key].grossProfitloss;
                if (dayData[key].trades > 0) days++;
            }
        }
        return { net, days };
    }, [dayData, currentMonthDate, showFeesInPnl]);

    return (
        <Card className="h-full flex flex-col border-none shadow-2xl bg-zinc-900 overflow-hidden rounded-[32px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 border-b border-white/5 bg-zinc-900/50 backdrop-blur-xl z-20">
                 <div className="flex items-center gap-12">
                     <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5"/></Button>
                        <span className="text-lg font-black w-48 text-center uppercase tracking-[0.2em] text-white">{format(currentMonthDate, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10" onClick={handleNextMonth}><ChevronRight className="h-5 w-5"/></Button>
                     </div>

                     <div className="hidden md:flex items-center gap-8 border-l border-white/10 pl-8">
                         <div>
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Monthly P&L</p>
                             <p className={cn("text-xl font-black tabular-nums", monthlyStats.net >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                 {formatTotalCurrency(monthlyStats.net, selectedCurrency)}
                             </p>
                         </div>
                         <div>
                             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Days Traded</p>
                             <p className="text-xl font-black text-zinc-300 tabular-nums">{monthlyStats.days}</p>
                         </div>
                     </div>
                 </div>

                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 bg-white/5 p-1 px-3 rounded-full border border-white/10">
                        <Switch id="fees-toggle" checked={showFeesInPnl} onCheckedChange={onShowFeesToggle} className="scale-75"/>
                        <Label htmlFor="fees-toggle" className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{t('Fees')}</Label>
                     </div>

                     <div className="flex items-center gap-2">
                         <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"><Camera className="h-4 w-4 text-zinc-400"/></Button>
                         <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"><Info className="h-4 w-4 text-zinc-400"/></Button>
                         <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-white/5 border-white/10 hover:bg-white/10"><Settings className="h-4 w-4 text-zinc-400"/></Button>
                     </div>
                 </div>
            </CardHeader>
            <CardContent className="flex-grow p-0 overflow-hidden flex">
                <div className="flex flex-col flex-grow">
                     <div className={cn("grid gap-0", "grid-cols-7")}>
                        {(isArabic ? [...dayLabels].reverse() : dayLabels).map((dayLabel, idx) => (
                            <div key={idx} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-r last:border-r-0 bg-muted/20">
                                {dayLabel}
                            </div>
                        ))}
                    </div>

                    <div className="flex-grow grid grid-cols-7 gap-0">
                        {Array.from({ length: 35 }).map((_, i) => {
                            const dayItem = addDays(startDate, i);
                            const dateKey = format(dayItem, 'yyyy-MM-dd');
                            const data = dayData[dateKey];
                            const isCurrentMonth = isSameMonth(dayItem, currentMonthDate);
                            const isToday = isSameDay(dayItem, new Date());
                            const isWeekend = isWeekendDay(dayItem);
                            const holiday = getHoliday(dayItem);
                            const isHoliday = !!holiday && isCurrentMonth;

                            const pnlForCellDisplay = showFeesInPnl
                                ? (data?.profitloss || 0) - (data?.commission || 0) - (data?.netCash || 0)
                                : (data?.grossProfitloss || 0);
                            const winRate = data && data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;
                            const isProfit = pnlForCellDisplay > 0 && isCurrentMonth;
                            const isLoss = pnlForCellDisplay < 0 && isCurrentMonth;
                            const hasData = data && data.trades > 0;

                            // Build inline style for background
                            let bgStyle: React.CSSProperties = {};
                            if (!isCurrentMonth) {
                                bgStyle = { backgroundColor: 'rgba(128,128,128,0.05)' };
                            } else if (isHoliday) {
                                bgStyle = { backgroundColor: 'rgba(251, 146, 60, 0.12)' }; // orange for holidays
                            } else if (isWeekend) {
                                bgStyle = { backgroundColor: 'rgba(128,128,128,0.08)' };
                            } else if (isProfit) {
                                bgStyle = { backgroundColor: '#10b981', color: 'white' };
                            } else if (isLoss) {
                                bgStyle = { backgroundColor: '#ef4444', color: 'white' };
                            }

                            if (isToday) {
                                bgStyle = { ...bgStyle, boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.4)', zIndex: 10 };
                            }

                            return (
                                <ContextMenu key={dateKey}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "min-h-[140px] p-4 border-b border-r border-white/5 flex flex-col transition-all relative group h-full overflow-hidden",
                                                !isCurrentMonth && "bg-white/[0.02] opacity-20",
                                                hasData && "cursor-pointer hover:bg-white/[0.05]",
                                                !hasData && "cursor-default"
                                            )}
                                            onClick={() => handleDayClick(dayItem, data)}
                                        >
                                            <div className="flex justify-end items-start mb-1 z-10">
                                                <span className={cn(
                                                    "text-[10px] font-black opacity-30 px-1.5 py-0.5 rounded tracking-widest",
                                                    isToday && "bg-indigo-500 text-white opacity-100 ring-4 ring-indigo-500/20"
                                                )}>{format(dayItem, 'd')}</span>
                                            </div>

                                            <div className="flex-grow flex flex-col justify-center items-center py-1 z-10">
                                                {pnlForCellDisplay !== 0 && isCurrentMonth && (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={cn(
                                                            "text-xl font-black tracking-tighter drop-shadow-2xl tabular-nums",
                                                            isProfit ? "text-emerald-400" : isLoss ? "text-rose-500" : "text-white"
                                                        )}>
                                                            {formatTotalCurrency(pnlForCellDisplay, selectedCurrency)}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1 px-3 py-1 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                                                {data?.trades} {t(data?.trades === 1 ? 'trade' : 'trades')}
                                                            </span>
                                                            <div className="w-1 h-1 rounded-full bg-zinc-700"></div>
                                                            <span className={cn(
                                                                "text-[9px] font-black tracking-widest",
                                                                winRate >= 50 ? "text-emerald-500/70" : "text-rose-500/70"
                                                            )}>
                                                                {winRate.toFixed(0)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Status Dots */}
                                            {hasData && (
                                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1 z-10">
                                                    {Array.from({ length: Math.min(data.trades, 3) }).map((_, i) => (
                                                        <div key={i} className={cn("w-1 h-1 rounded-full shadow-lg", isProfit ? "bg-emerald-500" : "bg-rose-500")}></div>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Subtle Glow Background */}
                                            {isProfit && <div className="absolute inset-0 bg-emerald-500/5 blur-[40px] rounded-full pointer-events-none"></div>}
                                            {isLoss && <div className="absolute inset-0 bg-rose-500/5 blur-[40px] rounded-full pointer-events-none"></div>}
                                        </div>
                                    </ContextMenuTrigger>
                                     <ContextMenuContent className="w-56">
                                         <ContextMenuItem onSelect={() => handleOpenBalanceDialog(dayItem)} className="gap-2">
                                             <UploadCloud className="h-4 w-4" />
                                             {t('Set Initial Balance')}
                                         </ContextMenuItem>
                                     </ContextMenuContent>
                                 </ContextMenu>
                            );
                        })}
                    </div>
                </div>

                <div className="w-[120px] flex flex-col border-l border-white/5 bg-white/[0.02]">
                      <div className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 border-b border-white/5 bg-white/5">
                          {t('Stats')}
                      </div>
                      {Array.from({ length: 5 }).map((_, weekIndex) => {
                           const weekStartDate = addDays(startDate, weekIndex * 7);
                           const weekKey = getWeekKey(weekStartDate);
                           const summary = weeklySummaries[weekKey];
                           const weekDaysTraded = summary?.daysTraded || 0;
                           const weekTotalTrades = summary?.totalTrades || 0;

                           const pnlForWeekCellDisplay = summary ? (showFeesInPnl ? (summary.netProfitLossFromTrades - summary.uploadedCommissions - summary.totalNetCash) : summary.grossProfitlossFromTrades) : 0;
                           const weekPnlColor = pnlForWeekCellDisplay >= 0 ? 'text-emerald-400' : 'text-rose-500';

                           return (
                               <div key={weekKey} className={cn("flex-1 px-4 py-3 flex flex-col items-center justify-center text-center border-b border-white/5 last:border-b-0 relative group overflow-hidden")}>
                                    <div className="absolute top-2 left-2 text-[8px] font-black text-white/20 uppercase tracking-widest">{format(weekStartDate, 'w')}</div>
                                    <span className={cn("text-xs font-black tracking-tighter leading-none mb-1 tabular-nums", weekPnlColor)}>
                                        {formatTotalCurrency(pnlForWeekCellDisplay, selectedCurrency)}
                                    </span>
                                    {weekDaysTraded > 0 && (
                                        <div className="flex flex-col items-center gap-0.5 opacity-50">
                                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400">{weekDaysTraded} {t('days')}</span>
                                            <span className="text-[8px] font-black text-zinc-500">{weekTotalTrades} {t('trades')}</span>
                                        </div>
                                    )}
                               </div>
                           );
                      })}
                </div>
            </CardContent>

            {/* Balance Dialog */}
            <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('Set Initial Balance')}</DialogTitle>
                        <DialogDescription>
                            {t('Enter the account balance before any trades took place on')} {selectedDayForBalance ? format(selectedDayForBalance, 'PPP') : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="balance" className="text-right">
                                {t('Balance')}
                            </Label>
                            <Input
                                id="balance"
                                type="number"
                                placeholder="500.00"
                                value={balanceInput}
                                onChange={(e) => setBalanceInput(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBalanceDialogOpen(false)}>{t('Cancel')}</Button>
                        <Button onClick={handleSetBalance}>{t('Save Balance')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Day Detail Popup */}
            {selectedDayForDetail && (
                <DayDetailPopup
                    date={selectedDayForDetail.date}
                    data={selectedDayForDetail.data}
                    currency={selectedCurrency}
                    showFeesInPnl={showFeesInPnl}
                    onClose={() => setSelectedDayForDetail(null)}
                    initialBalance={initialBalance}
                    cumulativePnlUpToDay={cumulativePnlMap[format(selectedDayForDetail.date, 'yyyy-MM-dd')]}
                />
            )}
        </Card>
    );
}


