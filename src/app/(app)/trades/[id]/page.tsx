'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  CheckCircle, 
  Share, 
  Settings, 
  Star,
  Info,
  AlertCircle,
  CheckCircle2,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTradeData } from '@/contexts/TradeDataContext';
import TradingViewWidget from '@/components/notebook/TradingViewWidget';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { BadyTradesMarkLogo } from '@/components/icons/badytrades-mark-logo';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// High-Fidelity Components
import { ExecutionChart } from '@/components/trades/ExecutionChart';
import { RichNoteEditor } from '@/components/trades/RichNoteEditor';
import { DetailStatsPanel } from '@/components/trades/DetailStatsPanel';

export default function SingleTradeView() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { tradeData, isLoading, accounts, selectedAccountId, setSelectedAccountId, updateTrade } = useTradeData();
    const [activeView, setActiveView] = useState<'replay' | 'analysis' | 'notes' | 'analytics'>('replay');
    
    // AI Coach State
    const [showAiResults, setShowAiResults] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState<{
        insights: { icon: string; title: string; description: string }[];
        score: number | null;
    } | null>(null);

    const trade = useMemo(() => {
        return tradeData.find(t => t.id?.toString() === id || t.ticket?.toString() === id || t.Ticket?.toString() === id);
    }, [tradeData, id]);

    const handleAiCoach = async () => {
        if (!trade || isAnalyzing) return;
        setIsAnalyzing(true);
        setShowAiResults(true);
        setAiAnalysis(null);
        try {
            const response = await fetch('/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mode: 'trade',
                    date: trade.Date || 'N/A',
                    trades: [{
                        symbol: trade.Symbol,
                        side: trade.Side,
                        netPnl: trade.NetPnL,
                        roi: trade.ROI,
                        rMultiple: trade.RMultiple,
                        strategy: trade.Strategy,
                        entryTime: trade['Exec Time'] || trade.Date,
                        exitTime: trade.CloseTime,
                        holdTime: trade.HoldTime,
                    }],
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
        return <div className="h-screen w-full flex items-center justify-center text-foreground/50 bg-background font-sans">Loading high-fidelity data...</div>;
    }

    if (!trade) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center text-foreground/50 bg-background font-sans">
                <AlertCircle className="h-10 w-10 opacity-10 mb-4" />
                <p className="text-sm font-medium">Trade {id} not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/tracking')}>Return to Tracking</Button>
            </div>
        );
    }

    const isReviewed = trade.BadyScore === 100;

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-background font-sans text-foreground overflow-hidden p-0 m-0 relative">
            {/* --- AI Trade Insight Overlay (TradeZilla Style) --- */}
            {showAiResults && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setShowAiResults(false)} />
                    <div className="bg-card border border-border/80 shadow-2xl rounded-2xl w-full max-w-[460px] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
                            <div className="flex items-center gap-3">
                                <BadyTradesMarkLogo className="h-6 w-6 text-primary" />
                                <div>
                                    <h2 className="text-xs font-black tracking-widest uppercase">Bady AI Insights</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                        {trade.Symbol} · {trade.Date ? format(new Date(trade.Date), 'MMM d, yyyy') : ''} · Net P&L <span className={cn(parseFloat(trade.NetPnL || '0') >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]')}>{parseFloat(trade.NetPnL || '0') >= 0 ? '+' : ''}${parseFloat(trade.NetPnL || '0').toFixed(2)}</span>
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowAiResults(false)} className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-accent transition-colors">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Analyzing Execution...</p>
                                </div>
                            ) : aiAnalysis && (
                                <>
                                    {/* Score badge */}
                                    {aiAnalysis.score !== null && (
                                        <div className="flex items-center gap-3 px-1 pb-2">
                                            <div className={cn(
                                                "text-3xl font-black tabular-nums",
                                                (aiAnalysis.score) >= 70 ? "text-[#22c55e]" : (aiAnalysis.score) >= 40 ? "text-amber-400" : "text-[#ef4444]"
                                            )}>{aiAnalysis.score}</div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Trade Quality</p>
                                                <div className="h-1.5 w-24 rounded-full bg-border mt-1 overflow-hidden">
                                                    <div className={cn("h-full rounded-full", (aiAnalysis.score) >= 70 ? 'bg-[#22c55e]' : (aiAnalysis.score) >= 40 ? 'bg-amber-400' : 'bg-[#ef4444]')} style={{ width: `${aiAnalysis.score}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Insight Cards */}
                                    {aiAnalysis.insights.map((insight, i) => (
                                        <div key={i} className={cn(
                                            "rounded-xl p-4 border flex gap-3 items-start",
                                            insight.icon === 'alert' && 'bg-red-500/5 border-red-500/15',
                                            insight.icon === 'success' && 'bg-green-500/5 border-green-500/15',
                                            insight.icon === 'info' && 'bg-blue-500/5 border-blue-500/15',
                                        )}>
                                            <div className={cn(
                                                "shrink-0 h-5 w-5 rounded-full flex items-center justify-center mt-0.5",
                                                insight.icon === 'alert' && 'bg-red-500/10',
                                                insight.icon === 'success' && 'bg-green-500/10',
                                                insight.icon === 'info' && 'bg-blue-500/10',
                                            )}>
                                                {insight.icon === 'alert' && <AlertCircle className="h-3 w-3 text-red-400" />}
                                                {insight.icon === 'success' && <CheckCircle2 className="h-3 w-3 text-green-400" />}
                                                {insight.icon === 'info' && <Info className="h-3 w-3 text-blue-400" />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-black text-foreground/90">{insight.title}</p>
                                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{insight.description}</p>
                                            </div>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- TOP HEADER --- */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card shrink-0">
                <div className="flex items-center gap-6">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 border border-border/50 hover:bg-accent rounded-lg transition-all">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-col">
                        <h1 className="text-sm font-black tracking-widest uppercase">{trade.Symbol}</h1>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-60">
                            {trade.Date ? format(new Date(trade.Date), 'EEEE, MMM dd, yyyy') : 'No Date'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        className={cn(
                            "h-9 px-4 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                            isReviewed ? "bg-primary/10 border-primary/20 text-primary" : "text-muted-foreground"
                        )}
                        onClick={() => updateTrade(id, { BadyScore: isReviewed ? 0 : 100 })}
                    >
                        <CheckCircle className={cn("h-3.5 w-3.5 mr-2", isReviewed ? "text-primary" : "opacity-20")} /> 
                        {isReviewed ? 'Reviewed' : 'Mark as reviewed'}
                    </Button>
                    <div className="w-[1px] h-6 bg-border mx-2" />
                    <Button 
                        className="h-9 px-4 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-primary/10"
                        onClick={handleAiCoach}
                        disabled={isAnalyzing}
                    >
                        <BadyTradesMarkLogo className="h-4 w-4 mr-2" />
                        {isAnalyzing ? "Analyzing..." : "Ask Bady AI"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-accent rounded-lg"><Share className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:bg-accent rounded-lg"><Settings className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* --- MAIN PAGE LAYOUT --- */}
            <div className="flex flex-1 overflow-hidden">
                {/* --- LEFT SIDEBAR: STATS (FIGURE 1 PARITY) --- */}
                <div className="w-[340px] shrink-0 border-r border-border bg-card/30 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                        <DetailStatsPanel trade={trade} />
                    </div>
                </div>

                {/* --- RIGHT CONTENT: VIEW SWITCHER --- */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* View Switcher Tabs (TradeZilla Style) */}
                    <div className="h-12 border-b border-border bg-card/10 flex items-center px-6 gap-8 shrink-0">
                        {[
                            { id: 'replay', label: 'Replay Chart' },
                            { id: 'analysis', label: 'Advanced Analysis' },
                            { id: 'notes', label: 'Notes' },
                            { id: 'analytics', label: 'Trade Analytics' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveView(tab.id as any)}
                                className={cn(
                                    "h-full px-1 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all relative",
                                    activeView === tab.id 
                                        ? "border-primary text-foreground" 
                                        : "border-transparent text-muted-foreground hover:text-foreground/60"
                                )}
                            >
                                {tab.label}
                                {activeView === tab.id && <div className="absolute -bottom-[2px] left-0 right-0 h-[2px] bg-primary blur-[2px]" />}
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-background/50">
                        {/* 1. Annotated Replay Chart (The "Execution" View) */}
                        {activeView === 'replay' && (
                            <div className="p-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex flex-col gap-8 h-full">
                                    <div className="flex-1 bg-card/40 border border-border rounded-2xl overflow-hidden shadow-2xl">
                                        <ExecutionChart 
                                            symbol={trade.Symbol}
                                            side={trade.Side}
                                            entryPrice={parseFloat(trade.Price || '0')}
                                            exitPrice={parseFloat(trade.ClosePrice || '0')}
                                            entryTime={trade.Date || new Date().toISOString()}
                                            exitTime={trade.CloseTime || new Date().toISOString()}
                                            netPnl={parseFloat(trade.NetPnL || '0')}
                                        />
                                    </div>
                                    <div className="h-[200px] shrink-0">
                                         <h3 className="text-[10px] font-black uppercase tracking-widest opacity-30 mb-4 flex items-center gap-2">Quick Reflections <Star className="h-3 w-3" /></h3>
                                         <RichNoteEditor 
                                            content={trade.Note || ""}
                                            onChange={(html) => updateTrade(id, { Note: html })}
                                            placeholder="Quick thoughts on this execution..."
                                            className="h-full border-dashed"
                                         />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 2. Full TradingView Analysis Widget */}
                        {activeView === 'analysis' && (
                            <div className="h-full animate-in fade-in duration-300">
                                <TradingViewWidget symbol={`FX:${trade.Symbol.replace('m', '')}`} theme="dark" />
                            </div>
                        )}

                        {/* 3. Dedicated Rich Notes Section */}
                        {activeView === 'notes' && (
                            <div className="p-12 max-w-4xl mx-auto h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="flex flex-col gap-8 h-full">
                                    <h2 className="text-3xl font-black tracking-tighter">Trade Journaling</h2>
                                    <RichNoteEditor 
                                        content={trade.Note || ""}
                                        onChange={(html) => updateTrade(id, { Note: html })}
                                        className="flex-1 shadow-2xl bg-card border-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* 4. Advanced Trade Analytics */}
                        {activeView === 'analytics' && (
                            <div className="p-12 animate-in fade-in duration-300">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                     <div className="bg-card border border-border p-8 rounded-3xl h-[400px]">
                                         <h4 className="text-[11px] font-black uppercase tracking-[0.3em] opacity-30 mb-8 font-mono">Running P&L Algorithmic Flow</h4>
                                         {/* Running P&L Visualizer can go here */}
                                         <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-xl text-[10px] uppercase font-black opacity-20">Analytics Engine Active</div>
                                     </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
