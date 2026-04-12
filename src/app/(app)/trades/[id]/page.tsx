'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  CheckCircle, 
  PlayCircle, 
  Share, 
  Settings, 
  MoreHorizontal, 
  ChevronDown,
  ChevronRight,
  Star,
  Info,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTradeData } from '@/contexts/TradeDataContext';
import TradingViewWidget from '@/components/notebook/TradingViewWidget';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function SingleTradeView() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { tradeData, isLoading, accounts, selectedAccountId, setSelectedAccountId, updateTrade } = useTradeData();
    const [activeRightTab, setActiveRightTab] = useState('chart');
    
    // Annotation States (Local for immediate feedback)
    const [localNote, setLocalNote] = useState('');
    
    // AI Coach State
    const [showAiResults, setShowAiResults] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<{
        assessment: string;
        tips: string[];
        warnings: string[];
        score: number | null;
    } | null>(null);

    const trade = useMemo(() => {
        const found = tradeData.find(t => t.id?.toString() === id || t.ticket?.toString() === id || t.Ticket?.toString() === id);
        return found;
    }, [tradeData, id]);

    // Update local states when trade loads/changes
    React.useEffect(() => {
        if (trade) {
            setLocalNote(trade.Note || '');
        }
    }, [trade]);

    const handleNoteBlur = () => {
        if (trade && localNote !== (trade.Note || '')) {
            updateTrade(id, { Note: localNote });
        }
    };

    const toggleMistake = (mistake: string) => {
        if (!trade) return;
        const currentM = trade.Mistakes || [];
        const nextM = currentM.includes(mistake) 
            ? currentM.filter(m => m !== mistake) 
            : [...currentM, mistake];
        updateTrade(id, { Mistakes: nextM });
    };

    const toggleTag = (tag: string) => {
        if (!trade) return;
        const currentT = trade.Tags || [];
        const nextT = currentT.includes(tag) 
            ? currentT.filter(t => t !== tag) 
            : [...currentT, tag];
        updateTrade(id, { Tags: nextT });
    };

    const handleAiCoach = async () => {
        if (!trade || isAnalyzing) return;
        
        setIsAnalyzing(true);
        setShowAiResults(true);
        
        try {
            const response = await fetch('/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: trade.Date || trade['T/D'] || 'N/A',
                    trades: [trade].map(t => ({
                        symbol: t.Symbol || t.symbol,
                        side: t.Side || t.type,
                        netPnl: t.NetPnL || t.profit,
                        grossPnl: t.GrossPnl || t.profit,
                        execTime: t['Exec Time'] || t.opening_time_utc,
                        rMultiple: t.RMultiple || t.r_multiple,
                        strategy: t.Strategy || t.strategy,
                    })),
                }),
            });
            
            const data = await response.json();
            setAiAnalysis(data);
        } catch (error) {
            console.error('AI Analysis failed:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const currentAccount = useMemo(() => {
        return accounts.find(a => a.id === selectedAccountId);
    }, [accounts, selectedAccountId]);

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center text-white/50 bg-[#0A0A0A] font-sans">Loading high-fidelity data...</div>;
    }

    if (!trade) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center text-white/50 bg-[#0A0A0A] font-sans">
                <AlertCircle className="h-10 w-10 text-white/10 mb-4" />
                <p className="text-sm font-medium">Trade {id} not found in the current CSV dataset.</p>
                <Button variant="outline" className="mt-4 border-white/10 hover:bg-white/5" onClick={() => router.push('/tracking')}>Return to Tracking</Button>
            </div>
        );
    }

    // --- DATA MAPPING & CALCULATIONS ---
    const netPnl = parseFloat(trade.NetPnL || trade['Net Proceeds'] || trade.profit ||'0');
    const grossPnl = parseFloat(trade.GrossPnl || trade['Gross Proceeds'] || trade.profit || '0');
    const side = (trade.Side || trade.type || '').toUpperCase();
    const isWin = netPnl > 0;
    const isLong = side.includes('BUY') || side.includes('LONG');
    
    const symbol = trade.Symbol || trade.symbol || 'UNKNOWN';
    const volume = trade.Qty || trade.lots || '0.00';
    const comm = parseFloat(trade.Commissions || trade.Comm || trade.commission || '0');
    const swap = parseFloat(trade.Swap || trade.swap || '0');
    const roi = trade.ROI || '0.00';
    const entryPrice = parseFloat(trade.Price || trade['Entry Price'] || trade.opening_price || '0');
    const exitPrice = parseFloat(trade.ClosePrice || trade['Exit Price'] || trade.closing_price || '0');
    const stopLoss = parseFloat(trade.stop_loss || trade.StopLoss || '0');
    const takeProfit = parseFloat(trade.take_profit || trade.TakeProfit || '0');
    
    // Date formatting
    const rawDate = trade.Date || trade['T/D'] || trade.opening_time_utc || trade.closing_time_utc;
    let mainDisplayDate = 'N/A';
    if (rawDate) {
        try {
            const d = new Date(rawDate);
            if (isValid(d)) mainDisplayDate = format(d, 'E, MMM dd, yyyy');
        } catch(e) {}
    }

    // Derived Stats
    const pips = trade.Pips || ((Math.abs(exitPrice - entryPrice) * (symbol.includes('JPY') || symbol.includes('XAU') ? 100 : 10000)).toFixed(1));
    const tradeRisk = stopLoss > 0 ? (Math.abs(entryPrice - stopLoss) * parseFloat(volume.toString()) * (symbol.includes('XAU') ? 100 : 1)).toFixed(2) : '0.00';
    const initialTarget = takeProfit > 0 ? (Math.abs(entryPrice - takeProfit) * parseFloat(volume.toString()) * (symbol.includes('XAU') ? 100 : 1)).toFixed(2) : '0.00';
    const plannedR = parseFloat(tradeRisk) > 0 ? (parseFloat(initialTarget) / parseFloat(tradeRisk)).toFixed(2) : '0.00';
    const realizedR = parseFloat(tradeRisk) > 0 ? (netPnl / parseFloat(tradeRisk)).toFixed(2) : (netPnl > 0 ? '1.00' : '-1.00');

    // Constants for Selectors
    const MISTAKE_OPTIONS = [
        "FOMO Entry", "Revenge Trade", "Oversized Lot", "Moved Stop Loss", "Early Exit", "Counter-Trend", "Missing Setup", "News Event"
    ];
    const TAG_OPTIONS = [
        "A+ Setup", "Risk Off", "Trend Alignment", "High Volume", "Breakout", "Retest", "Support/Resistance", "Institutional Flow"
    ];

    const isReviewed = trade.BadyScore === 100 || trade.Note?.includes("[REVIEWED]");

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-[#0A0A0A] font-sans text-white overflow-hidden p-0 m-0 relative">
            {/* --- AI Analysis Overlay --- */}
            {showAiResults && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500" onClick={() => setShowAiResults(false)} />
                    <div className="bg-[#0D0D0D] border border-white/10 rounded-[32px] w-full max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col relative z-10 shadow-[0_40px_100px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-500">
                        {/* Title Bar */}
                        <div className="flex items-center justify-between p-8 border-b border-white/[0.04]">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                                    <BadyTradesMarkLogo className="h-6 w-6 text-indigo-400" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-black text-white tracking-[0.2em] uppercase">AI Baadi Coach</h2>
                                    <p className="text-[10px] text-white/30 font-bold tracking-widest uppercase mt-0.5">Deep Execution Analysis</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/20 hover:text-white hover:bg-white/5 rounded-full" onClick={() => setShowAiResults(false)}>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Analysis Content */}
                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-6">
                                    <div className="h-16 w-16 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
                                    <div className="text-center animate-pulse">
                                        <p className="text-[11px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Analyzing Execution...</p>
                                        <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest">Running through standard zella metrics</p>
                                    </div>
                                </div>
                            ) : aiAnalysis ? (
                                <>
                                    {/* Score Module */}
                                    <div className="flex flex-col items-center justify-center bg-white/[0.02] border border-white/[0.04] rounded-3xl p-8 gap-1">
                                        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-white/20">Trade Quality Score</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-6xl font-black tracking-tighter",
                                                (aiAnalysis.score || 0) >= 70 ? "text-green-500" : (aiAnalysis.score || 0) >= 40 ? "text-amber-500" : "text-red-500"
                                            )}>{aiAnalysis.score || '—'}</span>
                                            <span className="text-xl font-black text-white/10">/100</span>
                                        </div>
                                    </div>

                                    {/* Assessment Card */}
                                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-6">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400/60 mb-3">Coach Assessment</h4>
                                        <p className="text-sm font-bold text-white/90 leading-relaxed italic">"{aiAnalysis.assessment}"</p>
                                    </div>

                                    {/* Warnings Section */}
                                    {aiAnalysis.warnings.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/60 flex items-center gap-2 px-1">Alerts & Mistakes</h4>
                                            {aiAnalysis.warnings.map((w, i) => (
                                                <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-xl p-4 flex items-start gap-4">
                                                    <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                                                    <p className="text-[11px] font-bold text-red-100/60 leading-relaxed">{w}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Tips Section */}
                                    <div className="space-y-4">
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-green-500/60 px-1">Coaching Tips</h4>
                                        <div className="grid gap-3">
                                            {aiAnalysis.tips.map((tip, i) => (
                                                <div key={i} className="bg-white/[0.03] border border-white/[0.03] rounded-xl p-4 flex items-start gap-4">
                                                    <div className="h-6 w-6 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">{i+1}</div>
                                                    <p className="text-[11px] font-bold text-white/60 leading-relaxed">{tip}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="p-8 border-t border-white/[0.04] bg-white/[0.01]">
                             <Button onClick={() => setShowAiResults(false)} className="w-full h-12 bg-white text-black hover:bg-white/90 font-black uppercase tracking-[0.2em] text-[10px] rounded-xl shadow-2xl">Return to Analysis</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PRIMARY HEADER --- */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-white/[0.04] bg-[#0C0C0C] shrink-0">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 hover:bg-white/5 text-white/40 hover:text-white rounded-md transition-none">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 gap-2 bg-[#1A1A1A] border-white/5 hover:bg-[#222] transition-none text-white/90 text-[11px] font-bold tracking-tight rounded-md px-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                    {currentAccount?.name || 'All accounts'}
                                    <ChevronDown className="h-3 w-3 opacity-40 ml-1" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-[#161616] border-white/10 text-white">
                                {accounts.map(acc => (
                                    <DropdownMenuItem key={acc.id} onClick={() => setSelectedAccountId(acc.id)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5 py-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                            <span className="text-xs font-medium">{acc.name}</span>
                                        </div>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="h-8 w-[1px] bg-white/[0.04]" />

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <h1 className="text-sm font-black text-white tracking-widest uppercase">{symbol}</h1>
                            <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">{mainDisplayDate}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-1.5">
                    <Button 
                        variant="outline" 
                        className={cn(
                            "h-9 bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.06] text-white/80 text-[10px] font-black uppercase tracking-widest rounded-md px-4 transition-none shadow-none",
                            isReviewed && "bg-indigo-600/20 border-indigo-500/30 text-indigo-400"
                        )}
                        onClick={() => updateTrade(id, { BadyScore: isReviewed ? 0 : 100 })}
                    >
                        <CheckCircle className={cn("h-3 w-3 mr-2", isReviewed ? "text-indigo-400" : "text-white/20")} /> 
                        {isReviewed ? 'Reviewed' : 'Mark as reviewed'}
                    </Button>
                    <div className="w-[1px] h-6 bg-white/[0.04] mx-2" />
                    <Button 
                        variant="outline" 
                        className={cn(
                            "h-9 bg-indigo-600/10 border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-md px-4 transition-none group relative overflow-hidden",
                            isAnalyzing && "animate-pulse"
                        )}
                        onClick={handleAiCoach}
                    >
                        <BadyTradesMarkLogo className="h-3.5 w-3.5 mr-2" />
                        Ask Bady AI
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:bg-white/5 hover:text-white rounded-md transition-none"><PlayCircle className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:bg-white/5 hover:text-white rounded-md transition-none"><Share className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:bg-white/5 hover:text-white rounded-md transition-none"><Settings className="h-4 w-4" /></Button>
                </div>
            </div>


            {/* --- MAIN CONTENT AREA --- */}
            <div className="flex flex-1 overflow-hidden">
                {/* --- LEFT PANEL: STATS SYSTEM --- */}
                <div className="w-[380px] shrink-0 border-r border-white/[0.04] flex flex-col bg-[#0B0B0B] overflow-hidden">
                    <Tabs defaultValue="stats" className="w-full flex-1 flex flex-col">
                        <TabsList className="w-full h-11 bg-transparent justify-start px-2 border-b border-white/[0.04] rounded-none shrink-0 gap-0">
                            <TabsTrigger value="stats" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[10px] px-5 font-black uppercase tracking-widest text-white/30 data-[state=active]:text-white">Stats</TabsTrigger>
                            <TabsTrigger value="strategy" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[10px] px-5 font-black uppercase tracking-widest text-white/30 data-[state=active]:text-white">Strategy</TabsTrigger>
                            <TabsTrigger value="executions" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[10px] px-5 font-black uppercase tracking-widest text-white/30 data-[state=active]:text-white">Executions</TabsTrigger>
                            <TabsTrigger value="attachments" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[10px] px-5 font-black uppercase tracking-widest text-white/30 data-[state=active]:text-white">Attachments</TabsTrigger>
                        </TabsList>
                        
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                            <TabsContent value="stats" className="m-0 p-6 flex flex-col gap-8 outline-none animate-in fade-in duration-300">
                                {/* P&L Hero */}
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col relative pl-5">
                                        <div className={cn("absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full", isWin ? "bg-[#10b981]" : "bg-[#ef4444]")}></div>
                                        <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">Net P&L <Info className="h-3 w-3 opacity-20" /></p>
                                        <h2 className={cn("text-4xl font-black tracking-tighter", isWin ? "text-[#10b981]" : "text-[#ef4444]")}>
                                            {isWin ? '+' : ''}${Math.abs(netPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </h2>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 bg-white/[0.03] border border-white/[0.05] text-white/40 hover:bg-white/10 hover:text-white rounded-md mt-1 transition-none"><Settings className="h-4 w-4" /></Button>
                                </div>

                                {/* Primary Grid Data */}
                                <div className="flex flex-col gap-4 text-[11px] font-bold tracking-tight">
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Side</span><span className={cn("px-2 py-0.5 rounded-[4px] font-black tracking-widest text-[10px]", isLong ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500")}>{side}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Account</span><span className="text-white/80">{currentAccount?.name || 'MASTER'}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Lots/Volume</span><span className="text-white/80">{volume}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Pips</span><span className={cn("text-white/90", parseFloat(pips.toString()) >= 0 ? "text-green-500" : "text-red-500")}>{pips}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Return Per Pip</span><span className="text-white/80">${(netPnl / parseFloat(pips.toString() || '1')).toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Commissions & Fees</span><span className="text-white/80">${comm.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Total Swap</span><span className="text-white/80">${swap.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Net ROI</span><span className={cn(parseFloat(roi.toString()) >= 0 ? "text-green-500" : "text-red-500")}>{roi}%</span></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Gross P&L</span><span className="text-white/80">${grossPnl.toFixed(2)}</span></div>
                                    <div className="flex justify-between items-center group cursor-pointer" onClick={() => updateTrade(id, { Strategy: 'New Strategy' })}><span className="text-white/30 uppercase tracking-widest text-[9px]">Strategy</span><span className="text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">{trade.Strategy || 'Select Strategy'} <ChevronRight className="h-3 w-3" /></span></div>
                                    
                                    {/* Bady Scale replica */}
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Bady Scale</span><span className="text-white/60 text-[10px]">{isWin ? '8.4' : '3.1'} / 10</span></div>
                                        <div className="w-full h-1.5 rounded-full bg-white/[0.04] relative overflow-hidden flex">
                                            <div className={cn("h-full transition-all duration-1000", isWin ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)] w-[84%]" : "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)] w-[31%]")}></div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="h-[1px] w-full bg-white/[0.04]" />

                                {/* Sub Grid Data */}
                                <div className="flex flex-col gap-4 text-[11px] font-bold tracking-tight">
                                    <div className="flex justify-between items-center">
                                        <span className="text-white/30 uppercase tracking-widest text-[9px]">Price MAE / MFE</span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-red-500/80">${(entryPrice * 0.999).toFixed(2)}</span>
                                            <div className="w-12 h-4 overflow-hidden"><div className="w-full h-full bg-gradient-to-r from-red-500/20 via-indigo-500/20 to-green-500/20 rounded-sm" /></div>
                                            <span className="text-green-500/80">${(exitPrice * 1.001).toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Running P&L Spark</span><div className="w-20 h-5 bg-indigo-500/5 rounded p-0.5"><div className="w-full h-full border-t border-indigo-500/40" /></div></div>
                                    <div className="flex justify-between items-center"><span className="text-white/30 uppercase tracking-widest text-[9px]">Trade Rating</span><div className="flex items-center gap-0.5"><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /><Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" /><Star className="h-3.5 w-3.5 text-white/10" /><Star className="h-3.5 w-3.5 text-white/10" /></div></div>
                                </div>

                                <div className="h-[1px] w-full bg-white/[0.04]" />

                                {/* Targets & Risk */}
                                <div className="flex flex-col gap-6">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2"><h4 className="text-[10px] font-black uppercase text-green-500 tracking-[0.2em]">Profit Target</h4><Info className="h-3 w-3 text-white/10" /></div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-[#1A1A1A] border border-white/[0.05] rounded-md h-10 px-3 flex items-center justify-between group">
                                                <span className="text-[11px] text-white/60 font-bold">Price: ${takeProfit || '-'}</span>
                                                <ChevronDown className="h-3 w-3 text-white/20 group-hover:text-white/50" />
                                            </div>
                                            <div className="w-20 bg-[#1A1A1A] border border-white/[0.05] rounded-md h-10 px-3 flex items-center justify-center font-black text-[11px] text-white/40">{volume}</div>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 bg-white/[0.02] border border-white/[0.05] text-white/20 rounded-md transition-none shadow-none text-lg"> + </Button>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-2"><h4 className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em]">Stop Loss</h4><Info className="h-3 w-3 text-white/10" /></div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-[#1A1A1A] border border-white/[0.05] rounded-md h-10 px-3 flex items-center justify-between group">
                                                <span className="text-[11px] text-white/60 font-bold">Price: ${stopLoss || '-'}</span>
                                                <ChevronDown className="h-3 w-3 text-white/20 group-hover:text-white/50" />
                                            </div>
                                            <div className="w-20 bg-[#1A1A1A] border border-white/[0.05] rounded-md h-10 px-3 flex items-center justify-center font-black text-[11px] text-white/40">{volume}</div>
                                            <Button variant="ghost" size="icon" className="h-10 w-10 bg-white/[0.02] border border-white/[0.05] text-white/20 rounded-md transition-none shadow-none text-lg"> - </Button>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-[11px] font-bold tracking-tight mt-2">
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Initial Target</span><span className="text-green-500/80">${initialTarget}</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Trade Risk</span><span className="text-red-500/80">-${Math.abs(parseFloat(tradeRisk)).toFixed(2)}</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Planned R-Mult</span><span className="text-green-500/80">{plannedR}R</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Realized R-Mult</span><span className={cn(parseFloat(realizedR) >= 0 ? "text-green-500/80" : "text-red-500/80")}>{realizedR}R</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Average Entry</span><span className="text-white/80">${entryPrice.toFixed(3)}</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Average Exit</span><span className="text-white/80">${exitPrice.toFixed(3)}</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Entry Time</span><span className="text-white/80 font-mono text-[10px]">{format(new Date(trade.opening_time_utc || Date.now()), 'HH:mm:ss')}</span></div>
                                    <div className="flex flex-col gap-1"><span className="text-white/20 uppercase tracking-widest text-[8px]">Exit Time</span><span className="text-white/80 font-mono text-[10px]">{format(new Date(trade.closing_time_utc || Date.now()), 'HH:mm:ss')}</span></div>
                                </div>

                                <div className="h-[1px] w-full bg-white/[0.04]" />

                                {/* Tags & Mistakes section */}
                                <div className="flex flex-col gap-5 pb-8">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-1.5 h-3 bg-amber-500 rounded-full" /><h4 className="text-[10px] font-black uppercase text-amber-500 tracking-[0.2em]">Mistakes</h4></div><MoreHorizontal className="h-3 w-3 text-white/10" /></div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <div className="bg-[#161616] border border-white/[0.03] hover:border-white/[0.08] rounded-md h-10 px-4 flex items-center justify-between cursor-pointer transition-colors group">
                                                    <span className={cn("text-[11px] font-bold truncate pr-4", (trade.Mistakes?.length || 0) > 0 ? "text-amber-500" : "text-white/20")}>
                                                        {(trade.Mistakes?.length || 0) > 0 ? trade.Mistakes?.join(", ") : "Select mistake..."}
                                                    </span>
                                                    <ChevronDown className="h-3 w-3 text-white/10 group-hover:text-white/30 shrink-0" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-[#161616] border-white/10 text-white">
                                                {MISTAKE_OPTIONS.map(m => (
                                                    <DropdownMenuItem key={m} onClick={() => toggleMistake(m)} className="flex items-center gap-2 cursor-pointer">
                                                        <div className={cn("w-2 h-2 rounded-full", trade.Mistakes?.includes(m) ? "bg-amber-500" : "bg-white/10")} />
                                                        <span className="text-xs">{m}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-1.5 h-3 bg-green-500 rounded-full" /><h4 className="text-[10px] font-black uppercase text-green-500 tracking-[0.2em]">Custom Tags</h4></div><MoreHorizontal className="h-3 w-3 text-white/10" /></div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <div className="bg-[#161616] border border-white/[0.03] hover:border-white/[0.08] rounded-md h-10 px-4 flex items-center justify-between cursor-pointer transition-colors group">
                                                    <span className={cn("text-[11px] font-bold truncate pr-4", (trade.Tags?.length || 0) > 0 ? "text-green-500" : "text-white/20")}>
                                                        {(trade.Tags?.length || 0) > 0 ? trade.Tags?.join(", ") : "Select tag..."}
                                                    </span>
                                                    <ChevronDown className="h-3 w-3 text-white/10 group-hover:text-white/30 shrink-0" />
                                                </div>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent className="w-64 bg-[#161616] border-white/10 text-white">
                                                {TAG_OPTIONS.map(t => (
                                                    <DropdownMenuItem key={t} onClick={() => toggleTag(t)} className="flex items-center gap-2 cursor-pointer">
                                                        <div className={cn("w-2 h-2 rounded-full", trade.Tags?.includes(t) ? "bg-green-500" : "bg-white/10")} />
                                                        <span className="text-xs">{t}</span>
                                                    </DropdownMenuItem>
                                                ))}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>

                {/* --- RIGHT PANEL: INTERACTIVE CONTENT --- */}
                <div className="flex-1 flex flex-col min-w-0 bg-[#080808]">
                    {/* Inner Tabs for the multi-view system */}
                    <div className="h-12 bg-[#0C0C0C] border-b border-white/[0.04] flex items-center px-6 shrink-0 gap-6">
                        <button 
                            onClick={() => setActiveRightTab('chart')} 
                            className={cn("h-full px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeRightTab === 'chart' ? "border-indigo-500 text-white" : "border-transparent text-white/20 hover:text-white/40")}
                        >
                            Chart
                        </button>
                        <button 
                            onClick={() => setActiveRightTab('notes')} 
                            className={cn("h-full px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeRightTab === 'notes' ? "border-indigo-500 text-white" : "border-transparent text-white/20 hover:text-white/40")}
                        >
                            Notes
                        </button>
                        <button 
                            onClick={() => setActiveRightTab('running')} 
                            className={cn("h-full px-2 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all", activeRightTab === 'running' ? "border-indigo-500 text-white" : "border-transparent text-white/20 hover:text-white/40")}
                        >
                            Running P&L
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeRightTab === 'chart' && (
                            <div className="flex flex-col w-full h-full animate-in fade-in zoom-in-95 duration-500">
                                {/* Chart Section (approx 60% viewport height) */}
                                <div className="h-[calc(100vh-450px)] min-h-[400px] w-full relative">
                                    <TradingViewWidget symbol={`FX:${symbol.replace('m', '')}`} theme="dark" />
                                </div>

                                {/* Scrollable Lower Content */}
                                <div className="flex flex-col gap-12 p-8 bg-[#080808]">
                                    <div className="flex flex-col gap-6">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2">Notes <Info className="h-3 w-3 opacity-10" /></h3>
                                            <Button variant="ghost" size="sm" className="text-[10px] font-bold text-indigo-400 hover:bg-indigo-500/10">Manage Templates</Button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" className="h-7 bg-indigo-600/10 border-indigo-500/20 text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded px-3">Trade note</Button>
                                            <Button variant="outline" className="h-7 bg-white/[0.02] border-white/[0.05] text-white/30 hover:text-white/50 text-[9px] font-black uppercase tracking-widest rounded px-3">Daily Journal</Button>
                                        </div>
                                        <textarea 
                                            className="w-full min-h-[150px] bg-[#0A0A0A] border border-white/[0.04] rounded-xl text-sm text-white/80 placeholder:text-white/10 focus:ring-1 focus:ring-indigo-500/50 resize-none font-medium p-6 transition-all"
                                            placeholder="Write your trade analysis, psychology notes, or reasoning here..."
                                            value={localNote}
                                            onChange={(e) => setLocalNote(e.target.value)}
                                            onBlur={handleNoteBlur}
                                        />
                                    </div>

                                    <div className="flex flex-col gap-8 pb-12">
                                        <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/20 flex items-center gap-2 pt-8 border-t border-white/[0.04]">Running P&L Visualization</h3>
                                        <div className="w-full h-[300px] bg-[#0A0A0A] rounded-2xl border border-white/[0.04] p-6 relative group overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />
                                            <RunningPnLChart trades={[trade]} className="h-full" chartId={`detail-${id}`} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeRightTab === 'notes' && (
                            <div className="p-12 h-screen flex flex-col gap-10 bg-[#080808] animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3"><div className="w-2 h-6 bg-indigo-600 rounded-full" /><h2 className="text-3xl font-black tracking-tight">Trade Analysis Notebook</h2></div>
                                <textarea 
                                    className="flex-1 w-full bg-[#0A0A0A] border border-white/[0.04] rounded-2xl text-lg text-white/90 placeholder:text-white/10 focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium p-10 leading-relaxed shadow-2xl"
                                    placeholder="Go deep into your analysis here..."
                                    value={localNote}
                                    onChange={(e) => setLocalNote(e.target.value)}
                                    onBlur={handleNoteBlur}
                                />
                            </div>
                        )}

                        {activeRightTab === 'running' && (
                            <div className="p-12 h-screen flex flex-col gap-12 bg-[#080808] animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-black tracking-tight">Execution Analytics</h2>
                                    <div className="flex items-center gap-2 bg-[#121212] p-1 rounded-lg border border-white/5"><Button size="sm" className="h-7 text-[10px] font-bold bg-indigo-600 text-white rounded">Chart View</Button><Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold text-white/30">Table View</Button></div>
                                </div>
                                <div className="flex-1 w-full bg-[#0A0A0A] border border-white/[0.04] rounded-3xl p-10 flex items-center justify-center shadow-inner">
                                    <RunningPnLChart trades={[trade]} className="w-full h-full max-h-[500px]" chartId={`fullview-${id}`} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
