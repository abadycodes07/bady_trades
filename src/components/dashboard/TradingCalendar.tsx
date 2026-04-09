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
import { BadyLogo } from './BadyLogo';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Info, UploadCloud, TrendingUp, TrendingDown, X, Camera, Settings, RefreshCw, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { CsvTradeData, CsvCommissionData, BalanceOperation } from '@/app/(app)/dashboard/page';
import { isMarketHoliday, getHoliday, isWeekend as isWeekendDay } from '@/lib/market-holidays';
import { useLanguage } from '@/contexts/LanguageContext';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import { RunningPnLChart } from './RunningPnLChart';

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
    daysTraded: number;
    totalTrades: number;
}

const getWeekKey = (date: Date) => {
    return `${format(date, 'yyyy')}-W${getISOWeek(date).toString().padStart(2, '0')}`;
}

const calculateDailySummaries = (tradeData: CsvTradeData[], commissionData: CsvCommissionData[]): Record<string, CalendarDayData> => {
    const dailySummaries: Record<string, CalendarDayData> = {};

    tradeData.forEach((trade) => {
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

            if (netPnlStr === undefined || netPnlStr === null) return;
            const netPnl = parseFloat(netPnlStr);
            const grossPnlVal = (grossPnlStr !== undefined && grossPnlStr !== null && !isNaN(parseFloat(grossPnlStr)))
                             ? parseFloat(grossPnlStr)
                             : netPnl;
            const netCashVal = netCashStr !== undefined && netCashStr !== null && !isNaN(parseFloat(netCashStr)) ? parseFloat(netCashStr) : 0;

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            if (!dailySummaries[dateKey]) {
                dailySummaries[dateKey] = {
                    grossProfitloss: 0, profitloss: 0, netCash: 0, trades: 0, rValue: 0,
                    commission: 0, totalSECFee: 0, winningTrades: 0, losingTrades: 0, tradeList: []
                };
            }
            dailySummaries[dateKey].grossProfitloss += grossPnlVal;
            dailySummaries[dateKey].profitloss += netPnl;
            dailySummaries[dateKey].netCash += netCashVal;
            dailySummaries[dateKey].trades += 1;
            if (netPnl > 0) dailySummaries[dateKey].winningTrades += 1;
            if (netPnl < 0) dailySummaries[dateKey].losingTrades += 1;
            
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
                    commission: 0, totalSECFee: 0, winningTrades: 0, losingTrades: 0, tradeList: []
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
            uploadedCommissions: 0, daysTraded: 0, totalTrades: 0
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

const formatTotalCurrency = (value: number, currency: Currency): React.ReactNode => {
    const convertedValue = value * currency.rate;
    const sign = convertedValue >= 0 ? (value === 0 ? '' : '+') : '-';
    const displaySymbol = typeof currency.symbol === 'string' ? currency.symbol : currency.symbol;
    const formattedAmount = Math.abs(convertedValue).toLocaleString('en-US', {
        maximumFractionDigits: 2,
    });
    return <span className="inline-flex items-center" dir="ltr">{sign}{displaySymbol}{formattedAmount}</span>;
}
// High-Fidelity Day Detail Popup
function DayDetailPopup({
    date,
    data,
    currency,
    showFeesInPnl,
    onClose,
    initialBalance,
    cumulativePnlUpToDay,
    open
}: {
    date: Date;
    data: CalendarDayData;
    currency: Currency;
    showFeesInPnl: boolean;
    onClose: () => void;
    initialBalance?: number;
    cumulativePnlUpToDay?: number;
    open: boolean;
}) {
    const { t } = useLanguage();
    const pnlForDay = showFeesInPnl
        ? data.profitloss - data.commission - data.totalSECFee 
        : data.grossProfitloss;
    const winRate = data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;

    const runningBalance = initialBalance !== undefined && cumulativePnlUpToDay !== undefined
        ? initialBalance + cumulativePnlUpToDay
        : null;

    const isLosingDay = pnlForDay < 0;

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-[450px] w-full p-0 gap-0 bg-background border-border rounded-3xl overflow-hidden flex flex-col shadow-2xl z-[100]">
                {/* Visual Header Banner */}
                <div className={cn(
                    "p-6 pt-10 flex flex-col items-center text-center relative overflow-hidden",
                    isLosingDay ? "bg-rose-500/90" : "bg-emerald-500/90"
                )}>
                    {/* Logo in left corner as requested */}
                    <div className="absolute top-4 left-4">
                        <BadyTradesMarkLogo className={cn("h-7 w-7 opacity-80", isLosingDay ? "text-white" : "text-white")} />
                    </div>

                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-4 right-4 h-8 w-8 rounded-full bg-muted/30 hover:bg-muted/50 text-white" 
                        onClick={onClose}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">{format(date, 'EEEE, MMMM d, yyyy')}</p>
                    <h2 className="text-4xl font-black text-white tracking-tighter drop-shadow-md">
                        {formatTotalCurrency(pnlForDay, currency)}
                    </h2>
                </div>

                <div className="p-4 space-y-4 overflow-y-auto max-h-[70vh]">
                    {/* Visual Chart - Added per request */}
                    <RunningPnLChart trades={data.tradeList} className="mb-2" />
                    {/* Primary Stats Grid */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'ROI', value: data.tradeList[0]?.roi ? `${data.tradeList[0].roi}%` : '0.0%', color: 'emerald' },
                            { label: 'R-MULTIPLE', value: data.tradeList[0]?.rMultiple || '0.00' },
                            { label: 'VOLUME', value: data.tradeList[0]?.volume || '0' },
                            { label: 'STRATEGY', value: data.tradeList[0]?.strategy || '---' }
                        ].map((s, i) => (
                            <div key={i} className="bg-muted/10 rounded-xl p-2 border border-border/50 text-center">
                                <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-tighter leading-tight mb-1">{s.label}</p>
                                <p className={cn("text-xs font-black truncate", s.color === 'emerald' ? "text-emerald-400" : "text-foreground")}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Trade Success Stats */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-muted/10 rounded-xl p-3 border border-border/50 text-center">
                            <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">TRADES</p>
                            <p className="text-lg font-black">{data.trades}</p>
                        </div>
                        <div className="bg-muted/5 rounded-xl p-3 border border-border/50 text-center">
                            <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">WINS</p>
                            <p className="text-lg font-black text-emerald-400">{data.winningTrades}</p>
                        </div>
                        <div className="bg-rose-500/5 rounded-xl p-3 border border-border/50 text-center">
                            <p className="text-[8px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">LOSSES</p>
                            <p className="text-lg font-black text-rose-500">{data.losingTrades}</p>
                        </div>
                    </div>

                    {/* Win Rate Progress Bar */}
                    <div className="bg-muted/10 rounded-xl p-4 border border-border/50">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">WIN RATE</p>
                            <p className="text-sm font-black text-foreground">{winRate.toFixed(1)}%</p>
                        </div>
                        <div className="h-2 w-full bg-muted/30 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" 
                                style={{ width: `${winRate}%` }} 
                            />
                        </div>
                    </div>

                    {/* Best Trade & Balance Section */}
                    <div className="space-y-2">
                         <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">BEST TRADE</p>
                            </div>
                            <p className="text-sm font-black text-emerald-400">
                                {formatTotalCurrency(Math.max(...data.tradeList.map(t => t.netPnl), 0), currency)}
                            </p>
                         </div>

                         <div className="bg-muted/10 rounded-2xl p-4 border border-border/50">
                            <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-widest mb-1">ACCOUNT BALANCE</p>
                            <p className="text-2xl font-black text-foreground">
                                {runningBalance ? formatTotalCurrency(runningBalance, currency) : "N/A"}
                            </p>
                            <p className="text-[8px] text-muted-foreground/40 mt-1 uppercase font-bold tracking-widest">Initial balance + cumulative P&L</p>
                         </div>
                    </div>

                    {/* Detailed Trade List */}
                    <div className="space-y-2 pb-2">
                        <p className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] mb-3">TRADE BREAKDOWN</p>
                        {data.tradeList.map((trade, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/5 border border-border/30">
                                <div className="flex items-center gap-3">
                                    <Badge className={cn(
                                        "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 min-w-[36px] justify-center", 
                                        trade.side === 'Buy' ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-500"
                                    )}>
                                        {trade.side.toUpperCase()}
                                    </Badge>
                                    <div>
                                        <p className="text-xs font-black text-foreground leading-none mb-1">{trade.symbol}</p>
                                        <p className="text-[8px] font-bold text-muted-foreground/40">{trade.strategy || 'N/A'}</p>
                                    </div>
                                </div>
                                <p className={cn("text-xs font-black", trade.netPnl >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                    {formatTotalCurrency(trade.netPnl, currency)}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function TradingCalendar({selectedCurrency, tradeData, commissionData, balanceOperations = [], onUploadCommissionsClick, showFeesInPnl, onShowFeesToggle, onSetInitialBalance, initialBalance}: TradingCalendarProps) {
    const { isArabic, t } = useLanguage();
    const { toast } = useToast();
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfMonth(new Date()));
    const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
    const [selectedDayForBalance, setSelectedDayForBalance] = useState<Date | null>(null);
    const [balanceInput, setBalanceInput] = useState<string>("");
    const [selectedDayForDetail, setSelectedDayForDetail] = useState<{ date: Date; data: CalendarDayData } | null>(null);

    const dayData = useMemo(() => calculateDailySummaries(tradeData, commissionData), [tradeData, commissionData]);

    const handlePrevMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
    const handleNextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));

    const startDate = startOfWeek(currentMonthDate);
    const weeklySummaries = useMemo(() => calculateWeeklySummaries(startDate, dayData), [startDate, dayData]);

    const cumulativePnlMap = useMemo(() => {
        const result: Record<string, number> = {};
        const sortedDateKeys = Object.keys(dayData).sort();
        let cumPnl = 0;
        for (const dateKey of sortedDateKeys) {
            const data = dayData[dateKey];
            const pnl = showFeesInPnl ? data.profitloss - data.commission : data.grossProfitloss;
            cumPnl += pnl;
            result[dateKey] = cumPnl;
        }
        return result;
    }, [dayData, showFeesInPnl]);

    const handleOpenBalanceDialog = (date: Date) => {
        setSelectedDayForBalance(date);
        setBalanceInput("10000.00");
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

    const dayLabels = isArabic ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const monthlyStats = useMemo(() => {
        let net = 0;
        let days = 0;
        for (const key in dayData) {
            const date = parse(key, 'yyyy-MM-dd', new Date());
            if (isSameMonth(date, currentMonthDate)) {
                net += showFeesInPnl ? dayData[key].profitloss - dayData[key].commission : dayData[key].grossProfitloss;
                if (dayData[key].trades > 0) days++;
            }
        }
        return { net, days };
    }, [dayData, currentMonthDate, showFeesInPnl]);

    return (
        <Card className="h-full flex flex-col border-border shadow-2xl bg-card overflow-hidden rounded-[32px]">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 border-b border-border bg-card z-20">
                 <div className="flex items-center gap-12">
                     <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-muted/10 border-border hover:bg-muted/20" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5 text-muted-foreground/50"/></Button>
                        <span className="text-lg font-black w-48 text-center uppercase tracking-[0.2em] text-foreground">{format(currentMonthDate, 'MMMM yyyy')}</span>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-full bg-muted/10 border-border hover:bg-muted/20" onClick={handleNextMonth}><ChevronRight className="h-5 w-5 text-muted-foreground/50"/></Button>
                     </div>

                     <div className="hidden md:flex items-center gap-8 border-l border-border pl-8">
                         <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">MONTHLY P&L</p>
                                 <p className={cn("text-xl font-black tabular-nums leading-none", monthlyStats.net >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                     {formatTotalCurrency(monthlyStats.net, selectedCurrency)}
                                 </p>
                             </div>
                         </div>
                         <div className="flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
                             <div>
                                 <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-0.5">TRADED DAYS</p>
                                 <p className="text-xl font-black text-foreground tabular-nums leading-none">{monthlyStats.days}</p>
                             </div>
                         </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="flex items-center gap-4 px-4 py-2 bg-muted/10 border border-border rounded-full">
                         <div className="flex items-center gap-2">
                            <Switch id="fees-toggle" checked={showFeesInPnl} onCheckedChange={onShowFeesToggle} className="scale-75 data-[state=checked]:bg-indigo-500"/>
                            <Label htmlFor="fees-toggle" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{t('FEES')}</Label>
                         </div>
                         <Separator orientation="vertical" className="h-4 bg-border" />
                         <div className="flex items-center gap-3">
                             <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-4 w-4 p-0 text-muted-foreground/40 hover:text-foreground transition-colors"
                                onClick={() => toast({ title: "Snapshot Taken", description: "The calendar view has been saved to your downloads." })}
                             >
                                <Camera className="h-4 w-4" />
                             </Button>
                             <Info className="h-4 w-4 text-muted-foreground/40 hover:text-foreground cursor-pointer transition-colors" />
                             <Popover>
                                 <PopoverTrigger asChild>
                                     <Settings className="h-4 w-4 text-muted-foreground/40 hover:text-foreground cursor-pointer transition-colors" />
                                 </PopoverTrigger>
                                 <PopoverContent className="w-64 p-4 bg-popover border-border rounded-2xl shadow-2xl" align="end">

                                     <div className="space-y-4">
                                         <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">DISPLAY STATS</h4>
                                         <div className="space-y-1">
                                             {[
                                                 { id: 'r-multiple', label: 'R Multiple' },
                                                 { id: 'daily-pnl', label: 'Daily P/L', checked: true },
                                                 { id: 'ticks', label: 'Ticks' },
                                                 { id: 'pips', label: 'Pips' },
                                                 { id: 'winrate', label: 'Day winrate', checked: true }
                                             ].map((stat) => (
                                                 <div key={stat.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/10 transition-colors cursor-pointer group">
                                                     <span className="text-xs font-bold text-muted-foreground group-hover:text-white">{stat.label}</span>
                                                     <div className={cn("w-4 h-4 rounded border-2 border-border flex items-center justify-center transition-all", stat.checked ? "bg-indigo-500 border-indigo-500" : "bg-transparent")}>
                                                         {stat.checked && <Check className="h-2.5 w-2.5 text-white" />}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>

                                         <div className="pt-4 border-t border-border">
                                             <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 mb-2">ECONOMIC EVENTS</h4>
                                             <div className="flex items-center justify-between p-2 rounded-lg bg-muted/5 border border-border mb-3">
                                                 <span className="text-xs font-bold text-white">Display events</span>
                                                 <Switch className="scale-75 data-[state=checked]:bg-indigo-500" defaultChecked />
                                             </div>
                                             
                                             <div className="space-y-3 px-1">
                                                 <div className="flex items-center justify-between">
                                                     <span className="text-[10px] font-black text-muted-foreground/60">COUNTRY</span>
                                                     <Badge variant="outline" className="bg-muted/10 border-indigo-500/30 text-indigo-400 text-[9px] font-black">
                                                         UNITED STATES <X className="h-2 w-2 ml-1 opacity-50" />
                                                     </Badge>
                                                 </div>
                                                 <div className="space-y-2">
                                                     <p className="text-[10px] font-black text-muted-foreground/60 uppercase">IMPACT</p>
                                                     {[
                                                         { label: 'High', color: 'bg-rose-500' },
                                                         { label: 'Medium', color: 'bg-amber-500' },
                                                         { label: 'Low', color: 'bg-emerald-500' }
                                                     ].map((impact, i) => (
                                                         <div key={impact.label} className="flex items-center gap-3">
                                                             <div className={cn("w-3.5 h-3.5 rounded-md border border-border flex items-center justify-center", i === 0 ? "bg-indigo-500 border-indigo-500" : "bg-muted/10")}>
                                   {i === 0 && <Check className="h-2 w-2 text-white" />}
                               </div>
                                                             <div className={cn("w-1.5 h-1.5 rounded-full", impact.color)} />
                                                             <span className="text-xs font-bold text-muted-foreground/80">{impact.label}</span>
                                                         </div>
                                                     ))}
                                                 </div>
                                             </div>
                                         </div>
                                     </div>
                                 </PopoverContent>
                             </Popover>
                         </div>
                     </div>
                 </div>
            </CardHeader>

            <CardContent className="flex-grow p-0 overflow-hidden flex bg-card">
                <div className="flex flex-col flex-grow">
                     <div className="grid grid-cols-7 border-b border-border bg-muted/5">
                        {dayLabels.map((dayLabel, idx) => (
                            <div key={idx} className="py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border-r border-border last:border-r-0">
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
                            const pnlForCellDisplay = showFeesInPnl ? (data?.profitloss || 0) : (data?.grossProfitloss || 0);
                            const isProfit = pnlForCellDisplay > 0 && isCurrentMonth;
                            const isLoss = pnlForCellDisplay < 0 && isCurrentMonth;
                            const hasData = data && data.trades > 0;
                            const winRate = data && data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;

                            let bgStyle: React.CSSProperties = {};
                            if (!isCurrentMonth) {
                                bgStyle = { backgroundColor: 'rgba(255,255,255,0.01)' };
                            } else if (isProfit) {
                                bgStyle = { backgroundColor: 'rgba(16, 185, 129, 0.08)', borderTop: '3px solid rgba(16, 185, 129, 0.5)' };
                            } else if (isLoss) {
                                bgStyle = { backgroundColor: 'rgba(239, 68, 68, 0.08)', borderBottom: '3px solid rgba(239, 68, 68, 0.5)' };
                            }

                            return (
                                <ContextMenu key={dateKey}>
                                    <ContextMenuTrigger asChild>
                                        <div
                                            className={cn(
                                                "min-h-[140px] p-4 border-b border-r border-border flex flex-col transition-all relative h-full",
                                                !isCurrentMonth && "opacity-20",
                                                hasData && "cursor-pointer hover:bg-muted/30",
                                            )}
                                            onClick={() => handleDayClick(dayItem, data)}
                                            style={bgStyle}
                                        >
                                            <div className="flex justify-end items-start mb-1 opacity-20">
                                                <span className={cn("text-[10px] font-black tabular-nums", isToday && "text-indigo-400 opacity-100")}>{format(dayItem, 'd')}</span>
                                            </div>

                                            <div className="flex-grow flex flex-col justify-center items-center py-2">
                                                {pnlForCellDisplay !== 0 && isCurrentMonth && (
                                                    <div className="flex flex-col items-center">
                                                        <span className={cn(
                                                            "text-xl font-black tracking-tighter drop-shadow-xl tabular-nums",
                                                            isProfit ? "text-emerald-400" : "text-rose-500"
                                                        )}>
                                                            {formatTotalCurrency(pnlForCellDisplay, selectedCurrency)}
                                                        </span>
                                                        <div className="flex items-center gap-2 mt-1 px-2 py-0.5 bg-muted/10 rounded-full border border-border">
                                                            <span className="text-[8px] font-black uppercase text-muted-foreground/60">{data?.trades} TRADES</span>
                                                            <span className={cn("text-[8px] font-black", winRate >= 50 ? "text-emerald-500/60" : "text-rose-500/60")}>{winRate.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {hasData && (
                                                <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1">
                                                    {Array.from({ length: Math.min(data.trades, 3) }).map((_, i) => (
                                                        <div key={i} className={cn("w-1 h-1 rounded-full", isProfit ? "bg-emerald-500" : "bg-rose-500")}></div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </ContextMenuTrigger>
                                     <ContextMenuContent className="w-56 bg-popover border-border">
                                         <ContextMenuItem onSelect={() => handleOpenBalanceDialog(dayItem)} className="text-xs font-bold text-muted-foreground focus:text-white">
                                             <UploadCloud className="h-3.5 w-3.5 mr-2" /> {t('Set Initial Balance')}
                                         </ContextMenuItem>
                                     </ContextMenuContent>
                                 </ContextMenu>
                            );
                        })}
                    </div>
                </div>

                <div className="w-[120px] flex flex-col border-l border-border bg-muted/5">
                      <div className="py-2 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 border-b border-border bg-card">WEEKLY</div>
                      {Array.from({ length: 5 }).map((_, weekIndex) => {
                           const weekStartDate = addDays(startDate, weekIndex * 7);
                           const weekKey = getWeekKey(weekStartDate);
                           const summary = weeklySummaries[weekKey];
                           const pnl = summary ? (showFeesInPnl ? summary.netProfitLossFromTrades - summary.uploadedCommissions : summary.grossProfitlossFromTrades) : 0;
                           return (
                               <div key={weekKey} className="flex-1 p-4 flex flex-col items-center justify-center text-center border-b border-border last:border-b-0">
                                    <span className={cn("text-sm font-black tracking-tighter tabular-nums", pnl >= 0 ? "text-emerald-400" : "text-rose-500")}>
                                        {formatTotalCurrency(pnl, selectedCurrency)}
                                    </span>
                                    <span className="text-[8px] font-black text-muted-foreground/30 mt-1">W{format(weekStartDate, 'w')}</span>
                               </div>
                           );
                      })}
                </div>
            </CardContent>

            <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
                <DialogContent className="bg-card border-border rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-foreground font-black uppercase tracking-widest">{t('Initial Balance')}</DialogTitle>
                        <DialogDescription className="text-muted-foreground/60 text-xs">
                            {t('Set your balance for')} {selectedDayForBalance ? format(selectedDayForBalance, 'PPP') : ''}.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                         <div className="space-y-2">
                             <Label htmlFor="balance" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Amount</Label>
                             <Input
                                 id="balance"
                                 type="number"
                                 value={balanceInput}
                                 onChange={(e) => setBalanceInput(e.target.value)}
                                 className="bg-muted/10 border-border text-foreground font-black tracking-tighter h-12 text-lg rounded-xl"
                             />
                         </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" className="text-muted-foreground font-bold" onClick={() => setIsBalanceDialogOpen(false)}>{t('Cancel')}</Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-8 rounded-xl" onClick={handleSetBalance}>{t('Save')}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {selectedDayForDetail && (
                <DayDetailPopup
                    open={!!selectedDayForDetail}
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

const Separator = ({ className, orientation = 'horizontal' }: { className?: string, orientation?: 'horizontal' | 'vertical' }) => (
    <div className={cn(
        "bg-border shrink-0", 
        orientation === 'horizontal' ? "h-[1px] w-full" : "w-[1px] h-full",
        className
    )} />
);
