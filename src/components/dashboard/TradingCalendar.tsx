
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
import { ChevronLeft, ChevronRight, Info, UploadCloud, TrendingUp, TrendingDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CsvTradeData, CsvCommissionData, BalanceOperation } from '@/app/(app)/dashboard/page';
import { isMarketHoliday, getHoliday, isWeekend as isWeekendDay, detectAsset, getAssetEmoji, type AssetClass } from '@/lib/market-holidays';
import { useLanguage } from '@/contexts/LanguageContext';

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
    tradeList: Array<{ symbol: string; side: string; netPnl: number; grossPnl: number; execTime: string }>;
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
        ? data.profitloss - data.commission - data.netCash
        : data.grossProfitloss;
    const winRate = data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;
    const bestTrade = data.tradeList.length > 0 ? Math.max(...data.tradeList.map(t => t.netPnl)) : null;
    const worstTrade = data.tradeList.length > 0 ? Math.min(...data.tradeList.map(t => t.netPnl)) : null;

    // Calculate running balance if initial balance is available
    const runningBalance = initialBalance !== undefined && cumulativePnlUpToDay !== undefined
        ? initialBalance + cumulativePnlUpToDay
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-[420px] max-w-[95vw] max-h-[90vh] overflow-y-auto"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={cn(
                    "p-4 rounded-t-2xl flex items-center justify-between",
                    pnlForDay > 0 ? "bg-green-500/20 border-b border-green-500/30" : pnlForDay < 0 ? "bg-red-500/20 border-b border-red-500/30" : "bg-muted/30 border-b border-border"
                )}>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium">{format(date, 'EEEE, MMMM d, yyyy')}</p>
                        <p className={cn(
                            "text-2xl font-black mt-0.5",
                            pnlForDay > 0 ? "text-green-500" : pnlForDay < 0 ? "text-red-500" : "text-foreground"
                        )}>
                            {pnlForDay > 0 ? '+' : ''}{formatTotalCurrency(pnlForDay, currency)}
                        </p>
                    </div>
                    <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted/50 transition-colors">
                        <X className="h-4 w-4 text-muted-foreground" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-muted/30 rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{t('Trades')}</p>
                            <p className="text-xl font-black mt-1">{data.trades}</p>
                        </div>
                        <div className="bg-green-500/10 rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-green-600 dark:text-green-400 font-bold">{t('Wins')}</p>
                            <p className="text-xl font-black text-green-600 dark:text-green-400 mt-1">{data.winningTrades}</p>
                        </div>
                        <div className="bg-red-500/10 rounded-xl p-3 text-center">
                            <p className="text-[10px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold">{t('Losses')}</p>
                            <p className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{data.losingTrades}</p>
                        </div>
                    </div>

                    {/* Win Rate */}
                    <div className="bg-muted/20 rounded-xl p-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('Win Rate')}</p>
                            <p className="text-sm font-black">{winRate.toFixed(1)}%</p>
                        </div>
                        <div className="h-2 bg-muted/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                                style={{ width: `${winRate}%` }}
                            />
                        </div>
                    </div>

                    {/* Best / Worst */}
                    {(bestTrade !== null || worstTrade !== null) && (
                        <div className="grid grid-cols-2 gap-3">
                            {bestTrade !== null && bestTrade > 0 && (
                                <div className="bg-green-500/10 rounded-xl p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-green-600 dark:text-green-400 font-bold flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" /> {t('Best Trade')}
                                    </p>
                                    <p className="text-sm font-black text-green-600 dark:text-green-400 mt-1" dir="ltr">
                                        +{formatTotalCurrency(bestTrade, currency)}
                                    </p>
                                </div>
                            )}
                            {worstTrade !== null && worstTrade < 0 && (
                                <div className="bg-red-500/10 rounded-xl p-3">
                                    <p className="text-[10px] uppercase tracking-widest text-red-600 dark:text-red-400 font-bold flex items-center gap-1">
                                        <TrendingDown className="h-3 w-3" /> {t('Worst Trade')}
                                    </p>
                                    <p className="text-sm font-black text-red-600 dark:text-red-400 mt-1" dir="ltr">
                                        {formatTotalCurrency(worstTrade, currency)}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Running Balance */}
                    {runningBalance !== null && (
                        <div className="bg-primary/10 rounded-xl p-3 border border-primary/20">
                            <p className="text-[10px] uppercase tracking-widest text-primary font-bold">{t('Account Balance')}</p>
                            <p className="text-lg font-black text-primary mt-1" dir="ltr">
                                {formatTotalCurrency(runningBalance, currency)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{t('Initial balance + cumulative P&L')}</p>
                        </div>
                    )}

                    {/* Trade List */}
                    {data.tradeList.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('Trade Breakdown')}</p>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {data.tradeList
                                    .sort((a, b) => b.netPnl - a.netPnl)
                                    .map((trade, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-[9px] font-black px-1.5 py-0.5 rounded uppercase",
                                                trade.side?.toLowerCase().includes('buy') || trade.side?.toLowerCase() === 'long'
                                                    ? "bg-green-500/20 text-green-500"
                                                    : "bg-red-500/20 text-red-500"
                                            )}>
                                                {trade.side || 'N/A'}
                                            </span>
                                            <span className="text-xs font-bold">{trade.symbol}</span>
                                        </div>
                                        <span className={cn(
                                            "text-xs font-black",
                                            trade.netPnl > 0 ? "text-green-500" : "text-red-500"
                                        )} dir="ltr">
                                            {trade.netPnl > 0 ? '+' : ''}{formatTotalCurrency(trade.netPnl, currency)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Commissions */}
                    {data.commission > 0 && (
                        <div className="bg-muted/20 rounded-xl p-3 flex items-center justify-between">
                            <p className="text-xs font-bold text-muted-foreground">{t('Commissions')}</p>
                            <p className="text-xs font-black text-red-500/80" dir="ltr">-{formatTotalCurrency(data.commission, currency)}</p>
                        </div>
                    )}
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

    return (
        <Card className="h-full flex flex-col border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 border-b bg-card/30 backdrop-blur-md">
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5">
                        <Button variant="outline" size="icon" className="h-7 w-7 hover-effect" onClick={handlePrevMonth}><ChevronLeft className="h-4 w-4"/></Button>
                        <span className="text-sm font-bold w-32 text-center uppercase tracking-widest">{format(currentMonthDate, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7 hover-effect" onClick={handleNextMonth}><ChevronRight className="h-4 w-4"/></Button>
                     </div>
                 </div>

                 <div className="flex items-center gap-3">
                     <div className="flex items-center space-x-2">
                        <Switch id="fees-toggle" checked={showFeesInPnl} onCheckedChange={onShowFeesToggle} className="hover-effect"/>
                        <Label htmlFor="fees-toggle" className="text-xs">{t('Include fees')}</Label>
                     </div>

                     <Button onClick={onUploadCommissionsClick} variant="outline" size="sm" className="h-7 px-2 text-xs hover-effect"><UploadCloud className="mr-1.5 h-3 w-3"/>{t('Commissions')}</Button>
                     <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
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
                                bgStyle = { backgroundColor: 'rgba(34, 197, 94, 0.15)' };
                            } else if (isLoss) {
                                bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.15)' };
                            }

                            if (isToday) {
                                bgStyle = { ...bgStyle, boxShadow: 'inset 0 0 0 2px rgba(147,51,234,0.3)' };
                            }

                            return (
                                <ContextMenu key={dateKey}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "min-h-[110px] p-2 border-b border-r last:border-r-0 flex flex-col transition-all relative group h-full",
                                                !isCurrentMonth && "opacity-30",
                                                hasData && "cursor-pointer hover:brightness-110",
                                                !hasData && "cursor-default"
                                            )}
                                            style={bgStyle}
                                            onClick={() => handleDayClick(dayItem, data)}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className={cn(
                                                    "text-[11px] font-bold opacity-60 px-1.5 py-0.5 rounded",
                                                    isToday && "bg-primary text-primary-foreground opacity-100 ring-2 ring-primary/20"
                                                )}>{format(dayItem, 'd')}</span>

                                                <div className="flex items-center gap-1">
                                                    {isHoliday && (
                                                        <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-500 border border-orange-500/30 leading-none">
                                                            {holiday.shortName}
                                                        </span>
                                                    )}
                                                    {hasData && (
                                                        <div className="p-1 bg-background/50 rounded-md backdrop-blur-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Info className="h-3 w-3 text-muted-foreground/50" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {isCurrentMonth && isHoliday && !hasData && (
                                                <div className="flex-grow flex items-center justify-center">
                                                    <span className="text-[9px] font-medium text-orange-500/70 text-center px-1">{t('Market Closed')}</span>
                                                </div>
                                            )}

                                            <div className="flex-grow flex flex-col justify-center items-center py-1">
                                                {pnlForCellDisplay !== 0 && isCurrentMonth && (
                                                    <div className="flex flex-col items-center gap-0.5">
                                                        <span className={cn(
                                                            "text-base font-black tracking-tight drop-shadow-sm",
                                                            isProfit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                        )}>
                                                            {formatTotalCurrency(pnlForCellDisplay, selectedCurrency)}
                                                        </span>
                                                        <div className="flex flex-col items-center gap-0 opacity-70">
                                                            <span className="text-[9px] font-bold uppercase tracking-tighter">
                                                                {data?.trades} {t(data?.trades === 1 ? 'trade' : 'trades')}
                                                            </span>
                                                            <span className={cn(
                                                                "text-[9px] font-black",
                                                                winRate >= 50 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                                            )}>
                                                                {winRate.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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

                <div className="w-[80px] flex flex-col border-l border-muted/50 bg-muted/5">
                      <div className="py-2 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b bg-muted/20">
                          {t('Week')}
                      </div>
                      {Array.from({ length: 5 }).map((_, weekIndex) => {
                           const weekStartDate = addDays(startDate, weekIndex * 7);
                           const weekKey = getWeekKey(weekStartDate);
                           const summary = weeklySummaries[weekKey];
                           const weekDaysTraded = summary?.daysTraded || 0;
                           const weekTotalTrades = summary?.totalTrades || 0;

                           const pnlForWeekCellDisplay = summary ? (showFeesInPnl ? (summary.netProfitLossFromTrades - summary.uploadedCommissions - summary.totalNetCash) : summary.grossProfitlossFromTrades) : 0;
                           const weekPnlColor = pnlForWeekCellDisplay >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-400';

                           // Running balance at end of week
                           const weekEndDate = addDays(weekStartDate, 6);
                           const weekEndKey = format(weekEndDate, 'yyyy-MM-dd');
                           const balanceAtWeekEnd = initialBalance !== undefined && cumulativePnlMap[weekEndKey] !== undefined
                               ? initialBalance + cumulativePnlMap[weekEndKey]
                               : null;

                           return (
                               <div key={weekKey} className={cn("flex-1 px-1 py-3 flex flex-col items-center justify-center text-center border-b last:border-b-0", "bg-muted/30")}>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-40 mb-1">{t('Week')} {getISOWeek(weekStartDate)}</span>
                                    <span className={cn("text-[11px] font-black tracking-tighter leading-none", weekPnlColor)}>{formatTotalCurrency(pnlForWeekCellDisplay, selectedCurrency)}</span>
                                    {weekDaysTraded > 0 && <span className="text-[8px] font-medium opacity-50 mt-1">{weekDaysTraded} {t('days')}</span>}
                                    {balanceAtWeekEnd !== null && (
                                        <span className="text-[8px] font-bold text-primary/70 mt-1" dir="ltr">
                                            {formatTotalCurrency(balanceAtWeekEnd, selectedCurrency)}
                                        </span>
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


