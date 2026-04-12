'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ChevronLeft, 
  CheckCircle, 
  PlayCircle, 
  Share, 
  Settings, 
  MoreHorizontal, 
  ChevronDown,
  Star,
  Info,
  AlertCircle
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
        assessment: string;
        tips: string[];
        warnings: string[];
        score: number | null;
    } | null>(null);

    const trade = useMemo(() => {
        return tradeData.find(t => t.id?.toString() === id || t.ticket?.toString() === id || t.Ticket?.toString() === id);
    }, [tradeData, id]);

    const handleAiCoach = async () => {
        if (!trade || isAnalyzing) return;
        setIsAnalyzing(true);
        setShowAiResults(true);
        try {
            const response = await fetch('/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: trade.Date || 'N/A',
                    trades: [trade].map(t => ({
                        symbol: t.Symbol,
                        side: t.Side,
                        netPnl: t.NetPnL,
                        execTime: t['Exec Time'],
                        rMultiple: t.RMultiple,
                        strategy: t.Strategy,
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
            {/* --- AI Analysis Overlay (Preserved Logic) --- */}
            {showAiResults && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 sm:p-20">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowAiResults(false)} />
                    <div className="bg-card border border-border shadow-2xl rounded-[32px] w-full max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col relative z-10 animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-8 border-b border-border/50">
                            <div className="flex items-center gap-4">
                                <BadyTradesMarkLogo className="h-8 w-8 text-primary" />
                                <div>
                                    <h2 className="text-sm font-black tracking-widest uppercase">AI Baadi Coach</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Deep Analysis</p>
                                </div>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setShowAiResults(false)}><MoreHorizontal className="h-4 w-4" /></Button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-10 space-y-8">
                            {isAnalyzing ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-6">
                                    <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                    <p className="text-[11px] font-black uppercase tracking-widest text-primary">Analyzing Execution...</p>
                                </div>
                            ) : aiAnalysis && (
                                <>
                                    <div className="flex flex-col items-center justify-center bg-accent/10 border border-border rounded-3xl p-8 gap-1">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Trade Quality Score</p>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "text-6xl font-black tracking-tighter",
                                                (aiAnalysis.score || 0) >= 70 ? "text-win-green" : "text-loss-red"
                                            )}>{aiAnalysis.score || '—'}</span>
                                            <span className="text-xl font-black opacity-10">/100</span>
                                        </div>
                                    </div>
                                    <div className="bg-primary/5 border border-primary/10 rounded-2xl p-6">
                                        <p className="text-sm font-bold leading-relaxed italic">"{aiAnalysis.assessment}"</p>
                                    </div>
                                    {aiAnalysis.warnings.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-[9px] font-black uppercase tracking-widest text-loss-red/60 px-1">Alerts & Mistakes</h4>
                                            {aiAnalysis.warnings.map((w, i) => (
                                                <div key={i} className="bg-destructive/5 border border-destructive/10 rounded-xl p-4 flex gap-4 text-[11px] font-bold opacity-70">{w}</div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="p-8 border-t border-border/50">
                             <Button onClick={() => setShowAiResults(false)} className="w-full h-12 bg-primary text-primary-foreground font-black uppercase tracking-widest text-[10px] rounded-xl">Close Baadi Analysis</Button>
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
