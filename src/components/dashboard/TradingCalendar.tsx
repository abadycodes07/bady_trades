
// src/components/dashboard/TradingCalendar.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { ChevronLeft, ChevronRight, Info, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import type { CsvTradeData, CsvCommissionData, BalanceOperation } from '@/app/(app)/dashboard/page';
import { isMarketHoliday, getHoliday, isWeekend as isWeekendDay, detectAsset, getAssetEmoji, type AssetClass } from '@/lib/market-holidays';

interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode;
    rate: number;
}

interface CalendarDayData {
    grossProfitloss: number; // Sum of GrossPnl from trade CSV
    profitloss: number;      // Sum of NetPnL from trade CSV
    netCash: number;         // Sum of NetCash from trade CSV
    trades: number;
    rValue: number;
    commission: number;      // Sum of TotalCommission from commission CSV
    totalSECFee: number;     // Sum of TotalSECFee from trade CSV
    totalFee1: number;
    totalFee2: number;
    totalFee3: number;
    totalFee4: number;
    totalFee5: number;
}

interface WeeklySummaryData {
    grossProfitlossFromTrades: number;
    netProfitLossFromTrades: number;
    totalNetCash: number;
    uploadedCommissions: number; // Aggregated daily 'commission' (from commission CSV)
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
            if (!dateStr) {
                console.warn(`Calendar Trade ${index + 1}: Skipping trade due to missing 'Date' field:`, trade);
                return;
            }
            let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yy', new Date());
            if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
            if (!isValid(parsedDate)) {
                   console.warn(`Calendar Trade ${index + 1}: Skipping invalid trade due to unparseable date. Original 'Date': '${dateStr}'. Trade:`, trade);
                   return;
            }

            const netPnlStr = trade.NetPnL;
            const grossPnlStr = trade.GrossPnl;
            const netCashStr = trade.NetCash;
            const totalSECFeeStr = trade.TotalSECFee;
            const totalFee1Str = trade.TotalFee1;
            const totalFee2Str = trade.TotalFee2;
            const totalFee3Str = trade.TotalFee3;
            const totalFee4Str = trade.TotalFee4;
            const totalFee5Str = trade.TotalFee5;


            if (netPnlStr === undefined || netPnlStr === null) {
                console.warn(`Calendar Trade ${index + 1}: Skipping trade due to missing 'NetPnL' field. Trade:`, trade);
                return;
            }
            const netPnl = parseFloat(netPnlStr);
            const grossPnlVal = (grossPnlStr !== undefined && grossPnlStr !== null && !isNaN(parseFloat(grossPnlStr)))
                             ? parseFloat(grossPnlStr)
                             : netPnl; // Fallback to netPnl if grossPnl is not available/valid
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
            if (isNaN(netPnl) || isNaN(grossPnlVal)) {
                console.warn(`Calendar Trade ${index + 1}: Skipping invalid trade due to invalid PnL parse. Gross: '${grossPnlStr}', Net: '${netPnlStr}'. Trade:`, trade);
                return;
            }

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            if (!dailySummaries[dateKey]) {
                dailySummaries[dateKey] = { grossProfitloss: 0, profitloss: 0, netCash: 0, trades: 0, rValue: 0, commission: 0, totalSECFee: 0, totalFee1: 0, totalFee2: 0, totalFee3: 0, totalFee4: 0, totalFee5: 0 };
            }
            dailySummaries[dateKey].grossProfitloss += grossPnlVal;
            dailySummaries[dateKey].profitloss += netPnl;
            dailySummaries[dateKey].netCash += netCashVal;
            dailySummaries[dateKey].trades += 1;
            dailySummaries[dateKey].rValue += rValue;
            dailySummaries[dateKey].totalSECFee += totalSECFeeVal;
            dailySummaries[dateKey].totalFee1 += totalFee1Val;
            dailySummaries[dateKey].totalFee2 += totalFee2Val;
            dailySummaries[dateKey].totalFee3 += totalFee3Val;
            dailySummaries[dateKey].totalFee4 += totalFee4Val;
            dailySummaries[dateKey].totalFee5 += totalFee5Val;
        } catch (e) {
            console.warn(`Calendar Trade ${index + 1}: Error processing trade for calendar summary:`, trade, e);
        }
    });

    commissionData.forEach((commissionEntry, index) => {
        try {
            const dateStr = commissionEntry.Date; // Assumes 'Date' field from processed commission CSV (yyyy-MM-dd)
            if (!dateStr) return;
            let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
            if (!isValid(parsedDate)) return; // Already expected to be 'yyyy-MM-dd' from dashboard parsing

            const commissionAmount = parseFloat(commissionEntry.Commission || '0'); // 'Commission' from CsvCommissionData
            if (isNaN(commissionAmount)) return;

            const dateKey = format(parsedDate, 'yyyy-MM-dd');
            if (!dailySummaries[dateKey]) {
                // If no trades on this day, but there's a commission entry
                dailySummaries[dateKey] = { grossProfitloss: 0, profitloss: 0, netCash: 0, trades: 0, rValue: 0, commission: 0, totalSECFee: 0, totalFee1: 0, totalFee2: 0, totalFee3: 0, totalFee4: 0, totalFee5: 0 };
            }
            dailySummaries[dateKey].commission += commissionAmount;
        } catch (e) {
            console.warn(`Calendar Commission ${index+1}: Error processing commission entry:`, commissionEntry, e);
        }
    });
    return dailySummaries;
};

const calculateWeeklySummaries = (startDate: Date, dailyData: Record<string, CalendarDayData>): Record<string, WeeklySummaryData> => {
    const summaries: Record<string, WeeklySummaryData> = {};
    const numWeeks = 5; // Display 5 weeks
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
}

const formatCalendarCurrency = (value: number | undefined, currency: Currency, showSignForPositive = false): React.ReactNode => {
    if (value === undefined || value === 0) return null; // Return null for zero values to hide them
    const convertedValue = value * currency.rate;
    const sign = convertedValue < 0 ? '-' : (showSignForPositive && convertedValue > 0 ? '+' : '');
    const displaySymbol = typeof currency.symbol === 'string' ? currency.symbol : currency.symbol;

    let minimumFractionDigits = 0;
    const absVal = Math.abs(convertedValue);
    if (absVal % 1 !== 0) { // if not a whole number
        minimumFractionDigits = (Math.abs(absVal * 10) % 1 !== 0 && Math.abs(absVal * 100) % 1 !==0) ? 2 : 1;
    }

    const formattedAmount = Math.abs(convertedValue).toLocaleString('en-US', {
         minimumFractionDigits: minimumFractionDigits,
         maximumFractionDigits: 2
    });
    return <>{sign}{displaySymbol}{formattedAmount}</>;
};

const formatTotalCurrency = (value: number, currency: Currency): React.ReactNode => {
    const convertedValue = value * currency.rate;
    const sign = convertedValue >= 0 ? (value === 0 ? '' : '+') : '-';
    const displaySymbol = typeof currency.symbol === 'string' ? currency.symbol : currency.symbol;
    const formattedAmount = Math.abs(convertedValue).toLocaleString('en-US', {
        maximumFractionDigits: 2, // Allow up to 2 decimal places for totals
        minimumFractionDigits: (value % 1 !== 0 && value !== 0) ? 2 : 0, // Show decimals if not whole number and not zero
    });
    return <span className="flex items-center">{sign}{displaySymbol}{formattedAmount}</span>;
};

export function TradingCalendar({selectedCurrency, tradeData, commissionData, balanceOperations = [], onUploadCommissionsClick, showFeesInPnl, onShowFeesToggle}: TradingCalendarProps) {
    const [currentMonthDate, setCurrentMonthDate] = useState(startOfMonth(new Date()));
    const [showWeekends, setShowWeekends] = useState(true);

    // Detect which asset classes appear in uploaded trades (for icons)
    const tradedAssets = useMemo((): Set<AssetClass> => {
        const assets = new Set<AssetClass>();
        tradeData.forEach(t => {
            if (t.Symbol) assets.add(detectAsset(t.Symbol));
        });
        return assets;
    }, [tradeData]);

    // Build a map of dateKey -> unique assets traded that day
    const dailyAssets = useMemo((): Record<string, AssetClass[]> => {
        const map: Record<string, Set<AssetClass>> = {};
        tradeData.forEach(t => {
            if (!t.Date || !t.Symbol) return;
            if (!map[t.Date]) map[t.Date] = new Set();
            map[t.Date].add(detectAsset(t.Symbol));
        });
        const result: Record<string, AssetClass[]> = {};
        Object.entries(map).forEach(([k, v]) => { result[k] = Array.from(v); });
        return result;
    }, [tradeData]);

    // Build daily balance operations map
    const dailyBalanceOps = useMemo((): Record<string, BalanceOperation[]> => {
        const map: Record<string, BalanceOperation[]> = {};
        balanceOperations.forEach(op => {
            if (!map[op.date]) map[op.date] = [];
            map[op.date].push(op);
        });
        return map;
    }, [balanceOperations]);

    // Compute running account balance per trading day
    // Balance on day D = initial capital + all P&L before D + all balance ops before/on D
    const dailyRunningBalance = useMemo((): Record<string, number> => {
        if (balanceOperations.length === 0) return {};

        // Sort all balance ops and trades by date
        const sortedOps = [...balanceOperations].sort((a, b) => a.date.localeCompare(b.date));
        
        // Collect all unique dates with any activity
        const allDateKeys = new Set<string>();
        tradeData.forEach(t => { if (t.Date) allDateKeys.add(t.Date); });
        balanceOperations.forEach(op => allDateKeys.add(op.date));
        const sortedDates = Array.from(allDateKeys).sort();

        // Build cumulative balance for each date
        let runningBalance = 0;
        // Start with initial capital (first deposit)
        const firstDeposit = sortedOps.find(op => op.isInitialCapital);  
        if (firstDeposit) runningBalance = firstDeposit.amount;

        const result: Record<string, number> = {};
        
        sortedDates.forEach(dateKey => {
            // Add balance ops on this date
            (dailyBalanceOps[dateKey] ?? []).forEach(op => {
                if (!op.isInitialCapital) runningBalance += op.amount;
            });
            // Add trade P&L from this date
            tradeData
                .filter(t => t.Date === dateKey)
                .forEach(t => { runningBalance += parseFloat(t.NetPnL || '0'); });
            result[dateKey] = runningBalance;
        });

        return result;
    }, [balanceOperations, tradeData, dailyBalanceOps]);

    const dayData = useMemo(() => calculateDailySummaries(tradeData, commissionData), [tradeData, commissionData]);

    useEffect(() => {
        if (tradeData && tradeData.length > 0) {
            const validDates = tradeData
                .map(t => {
                    try {
                         const dateStr = t.Date; if (!dateStr) return null;
                         let parsedDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                         if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yy', new Date());
                         if (!isValid(parsedDate)) parsedDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                         return isValid(parsedDate) ? parsedDate : null;
                    } catch { return null; }
                })
                .filter((d): d is Date => d !== null);
            if (validDates.length > 0) {
                validDates.sort(compareAsc);
                setCurrentMonthDate(startOfMonth(validDates[validDates.length - 1]));
            } else { setCurrentMonthDate(startOfMonth(new Date())); }
        } else { setCurrentMonthDate(startOfMonth(new Date())); }
    }, [tradeData]);

    const monthStart = startOfMonth(currentMonthDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });

    // Column indices: if showWeekends=false, hide Sun(0) and Sat(6)
    const visibleDayIndices = showWeekends ? [0,1,2,3,4,5,6] : [1,2,3,4,5];
    const numCols = visibleDayIndices.length;

    // Build 5 full weeks, then filter only visible days
    const allDays: Date[] = Array.from({ length: 35 }, (_, i) => addDays(startDate, i));
    const days = allDays.filter(d => visibleDayIndices.includes(getDay(d)));

    // Day labels matching visible columns
    const allDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayLabels = visibleDayIndices.map(i => allDayLabels[i]);

    const weeklySummaryData = useMemo(() => calculateWeeklySummaries(startDate, dayData), [startDate, dayData]);

    const handlePrevMonth = () => setCurrentMonthDate(subMonths(currentMonthDate, 1));
    const handleNextMonth = () => setCurrentMonthDate(addMonths(currentMonthDate, 1));
    const handleToday = () => setCurrentMonthDate(startOfMonth(new Date()));

    const { monthlyGrossPnlFromTrades, monthlyNetPnlFromTrades, monthlyUploadedCommissions, monthlyDaysTraded } = useMemo(() => {
        let grossPnl = 0, netPnl = 0, uploadedComm = 0, daysTraded = 0;
        Object.entries(dayData)
            .filter(([dateKey]) => isSameMonth(parse(dateKey, 'yyyy-MM-dd', new Date()), currentMonthDate))
            .forEach(([, data]) => {
                grossPnl += data.grossProfitloss || 0;
                netPnl += data.profitloss || 0;
                uploadedComm += data.commission || 0;
                if ((data.trades || 0) > 0) daysTraded++;
            });
        return { monthlyGrossPnlFromTrades: grossPnl, monthlyNetPnlFromTrades: netPnl, monthlyUploadedCommissions: uploadedComm, monthlyDaysTraded: daysTraded };
    }, [dayData, currentMonthDate]);

    const pnlForMonthlyHeader = showFeesInPnl
        ? monthlyNetPnlFromTrades // If toggle ON, show Net P&L (from trades)
        : monthlyGrossPnlFromTrades; // If toggle OFF, show Gross P&L (from trades)

    const cellMinHeight = "min-h-[70px]";
    const headerHeight = "h-8";

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
                 <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" onClick={handlePrevMonth}><ChevronLeft className="h-5 w-5" /></Button>
                    <span className="text-sm font-semibold">{format(currentMonthDate, 'MMMM yyyy')}</span>
                    <Button variant="ghost" size="icon" className="h-7 w-7 hover-effect" onClick={handleNextMonth}><ChevronRight className="h-5 w-5" /></Button>
                    <Button variant="outline" size="sm" className="h-7 px-2 text-xs hover-effect" onClick={handleToday}>This month</Button>
                </div>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                     <span>Monthly stats:</span>
                     <Badge variant={pnlForMonthlyHeader >= 0 ? "default" : "destructive"} className={cn("font-semibold", pnlForMonthlyHeader >= 0 ? "bg-green-600/20 text-green-700 dark:bg-green-800/30 dark:text-green-400 border-green-600/30" : "bg-red-600/20 text-red-700 dark:bg-red-800/30 dark:text-red-400 border-red-600/30")}>
                          P&L: {formatTotalCurrency(pnlForMonthlyHeader, selectedCurrency)}
                     </Badge>
                     {showFeesInPnl && monthlyUploadedCommissions !== 0 && (
                        <Badge variant="secondary" className="font-semibold">
                            Fees: {formatTotalCurrency(monthlyUploadedCommissions, selectedCurrency)}
                        </Badge>
                     )}
                     <Badge variant="secondary">Trades: {monthlyDaysTraded} day{monthlyDaysTraded !== 1 ? 's' : ''}</Badge>

                     {/* Assets being traded */}
                     {tradedAssets.size > 0 && (
                         <div className="flex items-center gap-1">
                             {Array.from(tradedAssets).map(asset => (
                                 <span key={asset} title={asset} className="text-base" style={{ lineHeight: 1 }}>{getAssetEmoji(asset)}</span>
                             ))}
                         </div>
                     )}

                     <div className="flex items-center space-x-2">
                        <Switch id="fees-toggle" checked={showFeesInPnl} onCheckedChange={onShowFeesToggle} className="hover-effect"/>
                        <Label htmlFor="fees-toggle" className="text-xs">Include Fees</Label>
                     </div>

                     {/* Weekend toggle */}
                     <div className="flex items-center space-x-2">
                        <Switch id="weekend-toggle" checked={showWeekends} onCheckedChange={setShowWeekends} className="hover-effect"/>
                        <Label htmlFor="weekend-toggle" className="text-xs">Weekends</Label>
                     </div>

                     <Button onClick={onUploadCommissionsClick} variant="outline" size="sm" className="h-7 px-2 text-xs hover-effect"><UploadCloud className="mr-1.5 h-3 w-3"/>Commissions</Button>
                     <Info className="h-3 w-3 text-muted-foreground cursor-pointer" />
                 </div>
            </CardHeader>
            <CardContent className="flex-grow p-0 overflow-hidden flex">
                <div className="flex flex-col flex-grow">
                     <div className={cn("grid gap-0", `grid-cols-${numCols}` )}>
                        {dayLabels.map((dayLabel, index) => (
                            <div key={`${dayLabel}-${index}`} className={cn("text-center text-xs font-medium text-muted-foreground p-1 border-b", headerHeight, "flex items-center justify-center", index < numCols - 1 && "border-r")}>{dayLabel}</div>
                        ))}
                    </div>
                    <div className={cn("grid gap-0 flex-grow", `grid-cols-${numCols}`, `grid-rows-5`)}>
                        {days.map((dayItem, index) => {
                            const dateKey = format(dayItem, 'yyyy-MM-dd');
                            const summary = dayData[dateKey];
                            const isCurrentMonthDay = isSameMonth(dayItem, currentMonthDate);
                            const isTodayDate = isSameDay(dayItem, new Date());
                            const holiday = getHoliday(dayItem);
                            const isHoliday = !!holiday;
                            const isWknd = isWeekendDay(dayItem);
                            const assetsOnDay = dailyAssets[dateKey] ?? [];

                            const pnlForCellDisplay = showFeesInPnl
                                ? (summary?.profitloss || 0)
                                : (summary?.grossProfitloss || 0);

                            const trades = summary?.trades;
                            const rValue = summary?.rValue;
                            const dailyNetCash = summary?.netCash || 0;
                            const dailyUploadedCommissions = summary?.commission || 0;
                            const dailyTotalSECFee = summary?.totalSECFee || 0;
                            const dailyTotalFee1 = summary?.totalFee1 || 0;
                            const dailyTotalFee2 = summary?.totalFee2 || 0;
                            const dailyTotalFee3 = summary?.totalFee3 || 0;
                            const dailyTotalFee4 = summary?.totalFee4 || 0;
                            const dailyTotalFee5 = summary?.totalFee5 || 0;

                            const otherFeesForPopover = dailyUploadedCommissions + dailyTotalSECFee + dailyTotalFee1 + dailyTotalFee2 + dailyTotalFee3 + dailyTotalFee4 + dailyTotalFee5 + dailyNetCash;

                            // Balance ops for this day
                            const dayBalOps = dailyBalanceOps[dateKey] ?? [];
                            const dayDeposits = dayBalOps.filter(op => op.type === 'deposit' || op.type === 'credit').reduce((s, op) => s + op.amount, 0);
                            const dayWithdrawals = Math.abs(dayBalOps.filter(op => op.type === 'withdrawal').reduce((s, op) => s + op.amount, 0));
                            const dayRunningBalance = dailyRunningBalance[dateKey];
                            const hasBalanceData = dayBalOps.length > 0 || dayRunningBalance !== undefined;

                            const pnlColor = pnlForCellDisplay === 0 ? 'text-muted-foreground' : pnlForCellDisplay > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400';
                            const dayBgColor = isHoliday ? 'bg-purple-500/10 dark:bg-purple-900/20' : isWknd && isCurrentMonthDay ? 'bg-muted/60' : pnlForCellDisplay === 0 ? '' : pnlForCellDisplay > 0 ? 'bg-green-500/10 dark:bg-green-900/30' : 'bg-red-500/10 dark:bg-red-900/30';

                            // Determine column position in visible set for border logic
                            const dayOfWeek = getDay(dayItem);
                            const colPosition = visibleDayIndices.indexOf(dayOfWeek);
                            const isLastCol = colPosition === numCols - 1;

                            // Row: based on index in filtered days array
                            const rowNum = Math.floor(index / numCols);
                            const isLastRow = rowNum === 4;

                            const formattedDisplayedPnl = formatCalendarCurrency(pnlForCellDisplay, selectedCurrency, true);
                            const formattedGrossPnlForPopover = formatCalendarCurrency(summary?.grossProfitloss, selectedCurrency, true);
                            const formattedNetPnlFromTradesForPopover = formatCalendarCurrency(summary?.profitloss, selectedCurrency, true);
                            const formattedOtherFeesForPopover = formatCalendarCurrency(otherFeesForPopover, selectedCurrency);
                            const finalPnlInPopover = (summary?.profitloss || 0);
                            const formattedFinalPnlInPopover = formatCalendarCurrency(finalPnlInPopover, selectedCurrency, true);

                            const cellContent = (
                                <div className={cn("p-1.5 text-xs flex flex-col justify-start items-start relative transition-colors duration-150 flex-grow h-full", !isLastRow && "border-b", !isLastCol && "border-r", cellMinHeight, isCurrentMonthDay ? 'text-foreground hover:shadow-inner hover:bg-accent/50 cursor-default' : 'text-muted-foreground/50 bg-muted/20 pointer-events-none', isTodayDate && 'bg-blue-500/10 ring-1 ring-blue-500', dayBgColor)} aria-label={`Data for ${format(dayItem, 'PPP')}`}>
                                    {/* Day number */}
                                    <span className={cn("font-medium mb-0.5", isTodayDate ? "text-blue-600 dark:text-blue-400 font-bold" : "", !isCurrentMonthDay ? "text-muted-foreground/30" : "")}>{format(dayItem, 'd')}</span>

                                    {/* Market closed badges */}
                                    {isCurrentMonthDay && isHoliday && (
                                        <span className="text-[9px] font-medium text-purple-600 dark:text-purple-400 leading-tight">
                                            🚫 {holiday!.shortName}
                                        </span>
                                    )}
                                    {isCurrentMonthDay && isWknd && !isHoliday && !showWeekends && (
                                        <span className="text-[9px] text-muted-foreground">🌙 Weekend</span>
                                    )}

                                    {/* P&L */}
                                    {isCurrentMonthDay && formattedDisplayedPnl && (<span className={cn("font-bold text-sm mt-0.5 flex items-center", pnlColor)}>{formattedDisplayedPnl}</span>)}
                                    {isCurrentMonthDay && (trades || 0) > 0 && (<span className="text-[10px] text-muted-foreground mt-0.5">{trades} trade{trades !== 1 ? 's' : ''}</span>)}
                                    {isCurrentMonthDay && (rValue || 0) !== 0 && (trades || 0) > 0 && (<span className="text-[10px] text-muted-foreground mt-0.5">{rValue?.toFixed(1)}R</span>)}

                                    {/* Asset icons - bottom right corner */}
                                    {isCurrentMonthDay && assetsOnDay.length > 0 && (
                                        <div className="absolute bottom-0.5 right-0.5 flex gap-0.5">
                                            {assetsOnDay.slice(0, 3).map(a => (
                                                <span key={a} title={a} className="text-[10px]" style={{ lineHeight: 1 }}>{getAssetEmoji(a)}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );

                            const hasPopoverData = isCurrentMonthDay && (
                                hasBalanceData || 
                                (summary && (summary.grossProfitloss || summary.profitloss || otherFeesForPopover || summary.trades))
                            );
                            if (hasPopoverData) {
                                return (
                                    <Popover key={dateKey}><PopoverTrigger asChild>{cellContent}</PopoverTrigger>
                                        <PopoverContent className="w-56 p-3 text-xs" side="top" align="center">
                                            <div className="space-y-1.5">
                                                <p className="font-semibold text-sm border-b pb-1">{format(dayItem, 'MMM dd, yyyy')}</p>
                                                {isHoliday && <p className="text-purple-600 dark:text-purple-400">🚫 {holiday!.name}</p>}

                                                {/* Account balance section */}
                                                {dayRunningBalance !== undefined && (
                                                    <div className="flex justify-between items-center bg-muted/30 rounded px-1.5 py-0.5">
                                                        <span className="text-muted-foreground">Account Balance:</span>
                                                        <span className="font-bold text-blue-600 dark:text-blue-400">{selectedCurrency.symbol}{(dayRunningBalance * selectedCurrency.rate).toLocaleString('en-US', {maximumFractionDigits: 2})}</span>
                                                    </div>
                                                )}

                                                {/* Deposits */}
                                                {dayDeposits > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-blue-500">💰 Deposit:</span>
                                                        <span className="font-medium text-blue-500">+{selectedCurrency.symbol}{(dayDeposits * selectedCurrency.rate).toLocaleString('en-US', {maximumFractionDigits: 2})}</span>
                                                    </div>
                                                )}

                                                {/* Withdrawals */}
                                                {dayWithdrawals > 0 && (
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-orange-500">🏧 Withdrawal:</span>
                                                        <span className="font-medium text-orange-500">-{selectedCurrency.symbol}{(dayWithdrawals * selectedCurrency.rate).toLocaleString('en-US', {maximumFractionDigits: 2})}</span>
                                                    </div>
                                                )}

                                                {/* PnL section */}
                                                {(formattedGrossPnlForPopover || formattedNetPnlFromTradesForPopover) && <div className="border-t pt-1 mt-1"/>}
                                                {formattedGrossPnlForPopover && <div className="flex justify-between"><span>Gross P&L:</span><span className={cn("font-medium", (summary?.grossProfitloss || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formattedGrossPnlForPopover}</span></div>}
                                                {formattedNetPnlFromTradesForPopover && <div className="flex justify-between"><span>Net P&L:</span><span className={cn("font-medium", (summary?.profitloss || 0) >= 0 ? 'text-green-600' : 'text-red-600')}>{formattedNetPnlFromTradesForPopover}</span></div>}
                                                {formattedOtherFeesForPopover && <div className="flex justify-between"><span>Other Fees:</span><span className="font-medium text-muted-foreground">{formattedOtherFeesForPopover}</span></div>}
                                                {(trades || 0) > 0 && <div className="flex justify-between"><span>Trades:</span><span className="font-medium">{trades}</span></div>}
                                                {assetsOnDay.length > 0 && <div className="flex justify-between"><span>Instruments:</span><span className="font-medium">{assetsOnDay.map(a => getAssetEmoji(a)).join(' ')}</span></div>}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                );
                            }
                            return <div key={dateKey} className="flex flex-col h-full">{cellContent}</div>;
                        })}
                    </div>
                </div>
                <div className="w-28 flex-shrink-0 border-l bg-muted/20 flex flex-col">
                     <div className={cn("text-center text-xs font-medium text-muted-foreground p-1 border-b", headerHeight, "flex items-center justify-center flex-shrink-0")}>Week</div>
                      {Array.from({ length: 5 }).map((_, weekIndex) => {
                           const weekStartDate = addDays(startDate, weekIndex * 7);
                           const weekKey = getWeekKey(weekStartDate);
                           const summary = weeklySummaryData[weekKey];

                           const pnlForWeekCellDisplay = showFeesInPnl
                               ? (summary?.netProfitLossFromTrades || 0) // If toggle ON, show Net P&L from trades
                               : (summary?.grossProfitlossFromTrades || 0); // If toggle OFF, show Gross P&L from trades

                           const weekDaysTraded = summary?.daysTraded || 0;
                           const weekUploadedCommissions = summary?.uploadedCommissions || 0;
                           const weekTotalSECFee = summary?.totalSECFee || 0;
                           const weekTotalFee1 = summary?.totalFee1 || 0;
                           const weekTotalFee2 = summary?.totalFee2 || 0;
                           const weekTotalFee3 = summary?.totalFee3 || 0;
                           const weekTotalFee4 = summary?.totalFee4 || 0;
                           const weekTotalFee5 = summary?.totalFee5 || 0;
                           const weekTotalNetCash = summary?.totalNetCash || 0;
                           const weekTotalTrades = summary?.totalTrades || 0;

                           const weekOtherFeesForPopover = weekTotalNetCash + weekUploadedCommissions + weekTotalSECFee + weekTotalFee1 + weekTotalFee2 + weekTotalFee3 + weekTotalFee4 + weekTotalFee5;
                           const weekFinalPnlInPopover = (summary?.netProfitLossFromTrades || 0);

                           const weekPnlColor = pnlForWeekCellDisplay >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-400';
                           const isLastRow = weekIndex === 4;
                           const weeklyCellContainerClasses = cn("flex-1", cellMinHeight, !isLastRow && "border-b", "bg-muted/30");

                           const weeklyCellContent = (
                               <div className={cn("p-1.5 flex flex-col justify-center items-center text-center h-full w-full cursor-pointer hover:bg-accent/50 hover-effect")}>
                                    <span className="text-[10px] font-medium text-muted-foreground">Week {getISOWeek(weekStartDate)}</span>
                                     {(summary && (pnlForWeekCellDisplay !== 0 || weekDaysTraded > 0 || weekTotalTrades > 0 )) ? (
                                         <>
                                            <span className={cn("text-sm font-bold flex items-center", weekPnlColor)}>{formatTotalCurrency(pnlForWeekCellDisplay, selectedCurrency)}</span>
                                            {weekDaysTraded > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1 mt-0.5">{weekDaysTraded} day{weekDaysTraded !== 1 ? 's' : ''}</Badge>}
                                            {weekTotalTrades > 0 && weekTotalTrades !== weekDaysTraded && <Badge variant="outline" className="text-[9px] h-4 px-1 mt-0.5">{weekTotalTrades} trade{weekTotalTrades !== 1 ? 's' : ''}</Badge>}
                                         </>
                                     ) : (<span className="text-sm font-bold text-muted-foreground flex items-center">{formatTotalCurrency(0, selectedCurrency)}</span>)}
                               </div>
                           );

                           const hasWeeklyPopoverData = summary && ( summary.grossProfitlossFromTrades || summary.netProfitLossFromTrades || weekOtherFeesForPopover || weekTotalTrades);
                           if (hasWeeklyPopoverData) {
                               return (
                                   <div key={weekKey} className={weeklyCellContainerClasses}>
                                       <Popover><PopoverTrigger asChild>{weeklyCellContent}</PopoverTrigger>
                                           <PopoverContent className="w-auto p-3 text-xs" side="left" align="center">
                                               <div className="space-y-1">
                                                   <p className="font-semibold text-sm">Week {getISOWeek(weekStartDate)} Summary</p>
                                                   {formatCalendarCurrency(summary.grossProfitlossFromTrades, selectedCurrency, true) && <div className="flex justify-between"><span>Total Gross P&L:</span><span className={cn("font-medium",(summary?.grossProfitlossFromTrades||0) >= 0 ? 'text-green-600':'text-red-600')}>{formatCalendarCurrency(summary.grossProfitlossFromTrades, selectedCurrency, true)}</span></div>}
                                                   {formatCalendarCurrency(summary.netProfitLossFromTrades, selectedCurrency, true) && <div className="flex justify-between"><span>Total Net P&L (Trades):</span><span className={cn("font-medium",(summary?.netProfitLossFromTrades||0) >= 0 ? 'text-green-600':'text-red-600')}>{formatCalendarCurrency(summary.netProfitLossFromTrades, selectedCurrency, true)}</span></div>}
                                                   {formatCalendarCurrency(weekFinalPnlInPopover, selectedCurrency, true) && <div className="flex justify-between border-t pt-1 mt-1"><span>Total Final P&L:</span><span className={cn("font-medium", weekFinalPnlInPopover >= 0 ? 'text-green-600' : 'text-red-600')}>{formatCalendarCurrency(weekFinalPnlInPopover, selectedCurrency, true)}</span></div>}
                                                   {formatCalendarCurrency(weekOtherFeesForPopover, selectedCurrency) && <div className="flex justify-between"><span>Total Other Fees:</span><span className="font-medium text-muted-foreground">{formatCalendarCurrency(weekOtherFeesForPopover, selectedCurrency)}</span></div>}
                                                   {weekTotalTrades > 0 && <div className="flex justify-between"><span>Total Trades:</span><span className="font-medium">{weekTotalTrades}</span></div>}
                                               </div>
                                           </PopoverContent>
                                       </Popover>
                                   </div>
                               );
                           }
                           return (<div key={weekKey} className={weeklyCellContainerClasses}>{weeklyCellContent}</div>);
                      })}
                </div>
            </CardContent>
        </Card>
    );
}

