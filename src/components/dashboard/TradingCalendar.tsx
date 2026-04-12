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
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, ChevronRight, Info, UploadCloud, TrendingUp, TrendingDown, X, Camera, Settings, RefreshCw, Plus, Check, FileText, PlayCircle } from 'lucide-react';
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
// AI Coach panel component
function AiCoachPanel({ trades, date, onClose }: { 
  trades: CalendarDayData['tradeList']; 
  date: Date; 
  onClose: () => void; 
}) {
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<{
    assessment: string;
    tips: string[];
    warnings: string[];
    score: number | null;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const analyze = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: format(date, 'MMMM d, yyyy'),
          trades: trades.map(t => ({
            symbol: t.symbol,
            side: t.side,
            netPnl: t.netPnl,
            grossPnl: t.grossPnl,
            execTime: t.execTime,
            rMultiple: t.rMultiple,
            strategy: t.strategy,
          })),
        }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError('Failed to connect to AI coach.');
    } finally {
      setLoading(false);
    }
  }, [trades, date]);

  React.useEffect(() => {
    analyze();
  }, [analyze]);

  return (
    <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md z-10 flex flex-col rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <BadyTradesMarkLogo className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-xs font-black text-white uppercase tracking-[0.15em]">AI Coach</p>
            <p className="text-[9px] text-indigo-400/70 font-bold uppercase tracking-widest">{format(date, 'MMM d, yyyy')} Analysis</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="h-12 w-12 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400/60 animate-pulse">Analyzing your trades...</p>
          </div>
        )}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-rose-400">{error}</p>
            <button onClick={analyze} className="mt-2 text-[10px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300">Retry</button>
          </div>
        )}
        {result && !loading && (
          <>
            {/* Score */}
            {result.score !== null && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">Discipline Score</p>
                <div className="flex items-center justify-center gap-2">
                  <span className={cn(
                    "text-4xl font-black",
                    result.score >= 70 ? "text-emerald-400" : result.score >= 50 ? "text-amber-400" : "text-rose-400"
                  )}>{result.score}</span>
                  <span className="text-lg font-black text-white/30">/100</span>
                </div>
              </div>
            )}

            {/* Assessment */}
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/60 mb-2">Assessment</p>
              <p className="text-sm font-semibold text-white/90 leading-relaxed">{result.assessment}</p>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-400/60 px-1">⚠ Alerts</p>
                {result.warnings.map((w, i) => (
                  <div key={i} className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-rose-400 text-sm mt-0.5">!</span>
                    <p className="text-xs font-medium text-rose-300/80">{w}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Tips */}
            {result.tips.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400/60 px-1">Coaching Tips</p>
                {result.tips.map((tip, i) => (
                  <div key={i} className="bg-white/3 border border-white/5 rounded-xl p-3 flex items-start gap-3">
                    <span className="h-5 w-5 rounded-full bg-indigo-600/30 text-indigo-400 text-[9px] font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <p className="text-xs font-medium text-white/70">{tip}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// High-Fidelity Day Detail Popup — Tradezilla Style
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
    const [showAiCoach, setShowAiCoach] = React.useState(false);
    const [aiViewed, setAiViewed] = React.useState(false);

    const pnlForDay = showFeesInPnl
        ? data.profitloss - data.commission - data.totalSECFee
        : data.grossProfitloss;
    const winRate = data.trades > 0 ? (data.winningTrades / data.trades) * 100 : 0;
    const isLosingDay = pnlForDay < 0;

    // Calculate per-trade Gross P&L
    const grossPnlTotal = data.tradeList.reduce((s, t) => s + t.grossPnl, 0);

    // Calculate profit factor
    const grossWins = data.tradeList.filter(t => t.grossPnl > 0).reduce((s, t) => s + t.grossPnl, 0);
    const grossLosses = Math.abs(data.tradeList.filter(t => t.grossPnl < 0).reduce((s, t) => s + t.grossPnl, 0));
    const profitFactor = grossLosses === 0 ? (grossWins > 0 ? '∞' : '0.00') : (grossWins / grossLosses).toFixed(2);

    // Avg loss for R-Multiple calculation
    const losingTrades = data.tradeList.filter(t => t.netPnl < 0);
    const avgLoss = losingTrades.length > 0
        ? Math.abs(losingTrades.reduce((s, t) => s + t.netPnl, 0) / losingTrades.length)
        : null;

    const calcRMultiple = (netPnl: number, rMultipleFromCsv?: string): string => {
        if (rMultipleFromCsv && !isNaN(parseFloat(rMultipleFromCsv))) {
            const r = parseFloat(rMultipleFromCsv);
            return (r >= 0 ? '+' : '') + r.toFixed(2) + 'R';
        }
        if (avgLoss && avgLoss > 0) {
            const r = netPnl / avgLoss;
            return (r >= 0 ? '+' : '') + r.toFixed(2) + 'R';
        }
        return '—';
    };

    const handleAiClick = () => {
        setShowAiCoach(true);
        setAiViewed(true);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-[600px] w-full p-0 gap-0 bg-zinc-950 border-white/10 rounded-3xl overflow-hidden flex flex-col shadow-[0_40px_80px_rgba(0,0,0,0.8)] z-[100]">
                
                {/* Visual Header Banner */}
                <div className={cn(
                    "p-5 pb-6 flex flex-col relative overflow-hidden",
                    isLosingDay ? "bg-gradient-to-br from-rose-600 to-rose-900" : "bg-gradient-to-br from-emerald-500 to-emerald-800"
                )}>
                    {/* Noise texture overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/noise.png')] pointer-events-none" />
                    
                    {/* Top row: Logo + Date + Buttons */}
                    <div className="flex items-start justify-between mb-3 relative z-10">
                        <div className="flex items-center gap-2">
                            <BadyTradesMarkLogo className="h-6 w-6 text-white/80" />
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Replay button */}
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all">
                                <PlayCircle className="h-3 w-3" />
                                Replay
                            </button>
                            {/* Add Note button */}
                            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full text-white text-[10px] font-black uppercase tracking-widest transition-all">
                                <FileText className="h-3 w-3" />
                                Add Note
                            </button>
                            {/* AI Coach button */}
                            <button
                                onClick={handleAiClick}
                                className="relative flex items-center justify-center h-8 w-8 bg-white/20 hover:bg-indigo-500 rounded-full transition-all group"
                                title="AI Coach Analysis"
                            >
                                <BadyTradesMarkLogo className="h-4 w-4 text-white" />
                                {!aiViewed && (
                                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-rose-400 border border-white animate-pulse" />
                                )}
                            </button>
                            {/* Close */}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 text-white border-0"
                                onClick={onClose}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Date + P&L */}
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70 mb-1">{format(date, 'EEEE, MMMM d, yyyy')}</p>
                        <h2 className="text-3xl font-black text-white tracking-tight">
                            {pnlForDay >= 0 ? '+' : ''}{formatTotalCurrency(pnlForDay, currency)}
                        </h2>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-4 gap-2 mt-4 relative z-10">
                        {[
                            { label: 'Total Trades', value: data.trades.toString() },
                            { label: 'Gross P&L', value: `${grossPnlTotal >= 0 ? '+' : ''}$${grossPnlTotal.toFixed(2)}` },
                            { label: 'Winners / Losers', value: `${data.winningTrades} / ${data.losingTrades}` },
                            { label: 'Commission', value: `$${data.commission.toFixed(2)}` },
                        ].map((s) => (
                            <div key={s.label} className="bg-black/20 backdrop-blur-sm rounded-xl p-2 text-center">
                                <p className="text-[7px] font-black uppercase tracking-widest text-white/50 mb-0.5">{s.label}</p>
                                <p className="text-xs font-black text-white">{s.value}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 relative z-10">
                        {[
                            { label: 'Win Rate', value: `${winRate.toFixed(1)}%` },
                            { label: 'Profit Factor', value: profitFactor.toString() },
                        ].map((s) => (
                            <div key={s.label} className="bg-black/20 backdrop-blur-sm rounded-xl p-2 text-center">
                                <p className="text-[7px] font-black uppercase tracking-widest text-white/50 mb-0.5">{s.label}</p>
                                <p className="text-xs font-black text-white">{s.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto max-h-[55vh] relative">
                    {/* AI Coach Overlay */}
                    {showAiCoach && (
                        <AiCoachPanel
                            trades={data.tradeList}
                            date={date}
                            onClose={() => setShowAiCoach(false)}
                        />
                    )}

                    {/* Running P&L Chart */}
                    <div className="px-4 pt-4">
                        <RunningPnLChart trades={data.tradeList} className="mb-1" />
                    </div>

                    {/* Trade Table */}
                    <div className="px-4 pb-4">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-3">Trades</p>
                        
                        {/* Table Header */}
                        <div className="grid text-[8px] font-black uppercase tracking-widest text-white/30 pb-2 border-b border-white/5 mb-1" 
                             style={{ gridTemplateColumns: '80px 90px 55px 75px 75px 60px 90px 80px 40px' }}>
                            <span>Open Time</span>
                            <span>Ticker</span>
                            <span>Side</span>
                            <span>Instrument</span>
                            <span>Net P&L</span>
                            <span>Net ROI</span>
                            <span>R-Multiple</span>
                            <span>Strategy</span>
                            <span>Replay</span>
                        </div>

                        {/* Trade Rows */}
                        <div className="space-y-1">
                            {data.tradeList.map((trade, i) => {
                                const isWin = trade.netPnl >= 0;
                                const rMultiple = calcRMultiple(trade.netPnl, trade.rMultiple);
                                const roi = trade.roi ? `${parseFloat(trade.roi) >= 0 ? '+' : ''}${parseFloat(trade.roi).toFixed(2)}%` : '—';
                                const instrument = trade.symbol || 'N/A';
                                // Parse time
                                let timeDisplay = '—';
                                if (trade.execTime) {
                                    const timePart = trade.execTime.includes(' ') ? trade.execTime.split(' ')[1] : trade.execTime;
                                    timeDisplay = timePart?.substring(0, 8) || trade.execTime;
                                }
                                
                                return (
                                    <div
                                        key={i}
                                        className="grid items-center py-2 border-b border-white/5 hover:bg-white/3 transition-colors rounded-lg px-1"
                                        style={{ gridTemplateColumns: '80px 90px 55px 75px 75px 60px 90px 80px 40px' }}
                                    >
                                        {/* Open Time */}
                                        <span className="text-[10px] font-mono text-white/50">{timeDisplay}</span>
                                        
                                        {/* Ticker badge */}
                                        <div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-[9px] font-black tracking-wide">
                                                {trade.symbol || 'N/A'}
                                            </span>
                                        </div>
                                        
                                        {/* Side */}
                                        <span className={cn("text-[10px] font-black uppercase", isWin ? "text-white/70" : "text-white/70")}>
                                            {trade.side?.toUpperCase() === 'BUY' ? 'LONG' : 
                                             trade.side?.toUpperCase() === 'SELL' ? 'SHORT' : 
                                             trade.side?.toUpperCase() || '—'}
                                        </span>
                                        
                                        {/* Instrument */}
                                        <span className="text-[10px] text-white/50 truncate">{instrument}</span>
                                        
                                        {/* Net P&L */}
                                        <span className={cn("text-[11px] font-black", isWin ? "text-emerald-400" : "text-rose-400")}>
                                            {isWin ? '+' : ''}{formatTotalCurrency(trade.netPnl, currency)}
                                        </span>
                                        
                                        {/* Net ROI */}
                                        <span className={cn("text-[10px] font-bold", isWin ? "text-emerald-400/70" : "text-rose-400/70")}>{roi}</span>
                                        
                                        {/* R-Multiple */}
                                        <span className={cn("text-[10px] font-bold", 
                                            rMultiple === '—' ? "text-white/30" :
                                            rMultiple.startsWith('+') ? "text-emerald-400/70" : "text-rose-400/70"
                                        )}>{rMultiple}</span>
                                        
                                        {/* Strategy */}
                                        <span className="text-[9px] text-white/30 truncate">{trade.strategy || '—'}</span>
                                        
                                        {/* Replay */}
                                        <button className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-all">
                                            <PlayCircle className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {data.tradeList.length === 0 && (
                            <p className="text-center text-white/30 text-xs py-6">No trades to display</p>
                        )}
                    </div>

                    {/* Footer buttons */}
                    <div className="flex items-center justify-between px-4 pb-4 pt-2 border-t border-white/5">
                        <Button variant="ghost" onClick={onClose} className="text-white/50 hover:text-white font-bold text-sm">
                            Cancel
                        </Button>
                        <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest px-6 rounded-xl">
                            View Details
                        </Button>
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
    const calendarRef = React.useRef<HTMLDivElement>(null);

    const handleCaptureScreenshot = async () => {
        if (!calendarRef.current) return;
        
        try {
            toast({ title: "Capturing...", description: "Preparing your trading calendar snapshot." });
            
            const canvas = await html2canvas(calendarRef.current, {
                backgroundColor: null,
                scale: 2, // High quality
                logging: false,
                useCORS: true,
            });
            
            const fileName = `BadyTrades-Calendar-${format(currentMonthDate, 'MMM-yyyy')}.png`;
            canvas.toBlob((blob) => {
                if (blob) {
                    saveAs(blob, fileName);
                    toast({ title: "Snapshot Taken", description: "The calendar view has been saved to your downloads." });
                }
            });
        } catch (error) {
            console.error("Screenshot capture failed:", error);
            toast({ title: "Capture Failed", description: "Could not generate screenshot.", variant: "destructive" });
        }
    };

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
        <Card ref={calendarRef} className="h-full flex flex-col border-border shadow-2xl bg-card overflow-hidden rounded-[32px]">
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
                                onClick={handleCaptureScreenshot}
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
