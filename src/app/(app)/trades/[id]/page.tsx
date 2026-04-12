'use client';

import React, { useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, CheckCircle, PlayCircle, Share, Settings, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTradeData } from '@/contexts/TradeDataContext';
import TradingViewWidget from '@/components/notebook/TradingViewWidget';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { RunningPnLChart } from '@/components/dashboard/RunningPnLChart';

export default function SingleTradeView() {
    const { id } = useParams() as { id: string };
    const router = useRouter();
    const { tradeData, isLoading } = useTradeData();

    const trade = useMemo(() => {
        return tradeData.find(t => t.id?.toString() === id || t.Ticket?.toString() === id);
    }, [tradeData, id]);

    if (isLoading) {
        return <div className="h-screen w-full flex items-center justify-center text-white/50 bg-[#121212]">Loading trade details...</div>;
    }

    if (!trade) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center text-white/50 bg-[#121212]">
                <p>Trade not found in current context (Ticket: {id})</p>
                <Button variant="outline" className="mt-4 border-white/10" onClick={() => router.push('/tracking')}>Return to Tracking</Button>
            </div>
        );
    }

    // Process variables safely
    const rawDate = trade.Date || trade['T/D'];
    let parsedDate = new Date();
    if (rawDate) {
        const attempt1 = parse(rawDate, 'yyyy-MM-dd', new Date());
        const attempt2 = parse(rawDate, 'MM/dd/yyyy', new Date());
        if (isValid(attempt1)) parsedDate = attempt1;
        else if (isValid(attempt2)) parsedDate = attempt2;
    }

    const netPnl = parseFloat(trade.NetPnL || trade['Net Proceeds'] || '0');
    const grossPnl = parseFloat(trade.GrossPnl || trade.NetPnL || '0');
    const isWin = netPnl > 0;
    const isLoss = netPnl < 0;
    
    const side = (trade.Side || '').toUpperCase();
    const isLong = side === 'BUY' || side === 'LONG';
    const isShort = side === 'SELL' || side === 'SHORT';

    const account = trade.Account || '-';
    const pips = trade.Pips || '0.00';
    const commissions = parseFloat(trade.Commissions || trade.Comm || trade.Fees || '0');
    const roi = trade.ROI || '0.00';
    const entryPrice = trade.Price || trade['Entry Price'] || '0';
    const exitPrice = trade.ClosePrice || trade['Exit Price'] || trade['Close Price'] || '0';
    const openTime = trade.OpenTime || trade['Exec Time'] || '-';
    const closeTime = trade.CloseTime || '-';

    return (
        <div className="flex flex-col h-[calc(100vh-60px)] bg-[#101010] font-sans text-white overflow-hidden pb-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04] bg-[#121212] shrink-0">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 hover:bg-white/5 text-white/50 hover:text-white rounded-[4px] -ml-2">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-bold text-white tracking-wide">{trade.Symbol || 'UNKNOWN'}</h1>
                        <span className="text-[11px] font-mono text-white/40">{format(parsedDate, 'E, MMM dd, yyyy')}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 text-white/80 text-[11px] font-bold tracking-wide rounded-[4px] px-3 transition-none"><CheckCircle className="h-3 w-3 mr-2 opacity-50" /> Mark as reviewed</Button>
                    <Button variant="outline" className="h-8 bg-indigo-600/10 border-indigo-500/20 hover:bg-indigo-600/20 text-indigo-400 text-[11px] font-bold tracking-wide rounded-[4px] px-3 gap-2 transition-none">
                        <PlayCircle className="h-3 w-3" /> Replay
                    </Button>
                    <Button variant="outline" className="h-8 bg-white/5 border-white/10 hover:bg-white/10 text-white/80 text-[11px] font-bold tracking-wide rounded-[4px] px-3 gap-2 transition-none"><Share className="h-3 w-3" /> Share</Button>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left Panel: Statistics & Details */}
                <div className="w-[340px] shrink-0 border-r border-white/[0.04] flex flex-col bg-[#121212] overflow-y-auto custom-scrollbar">
                    <Tabs defaultValue="stats" className="w-full flex-1 flex flex-col">
                        <TabsList className="w-full h-12 bg-transparent justify-start px-2 border-b border-white/[0.04] rounded-none shrink-0 gap-1">
                            <TabsTrigger value="stats" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[11px] font-bold tracking-wide text-white/50 data-[state=active]:text-white">Stats</TabsTrigger>
                            <TabsTrigger value="strategy" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[11px] font-bold tracking-wide text-white/50 data-[state=active]:text-white">Strategy</TabsTrigger>
                            <TabsTrigger value="executions" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[11px] font-bold tracking-wide text-white/50 data-[state=active]:text-white">Executions</TabsTrigger>
                            <TabsTrigger value="attachments" className="h-full rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-indigo-500 text-[11px] font-bold tracking-wide text-white/50 data-[state=active]:text-white">Attachments</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="stats" className="flex-1 m-0 p-6 flex flex-col gap-6 outline-none">
                            {/* P&L Block */}
                            <div className="flex justify-between items-start">
                                <div className="flex flex-col relative pl-4">
                                    <div className={cn("absolute left-0 top-0.5 bottom-0.5 w-[2px] rounded-full", isWin ? "bg-[#0F8A5D]" : "bg-[#D73A49]")}></div>
                                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest mb-1">Net P&L</p>
                                    <h2 className={cn("text-3xl font-black tracking-tight", isWin ? "text-[#0F8A5D]" : "text-[#D73A49]")}>
                                        {isWin ? '+' : '-'}${Math.abs(netPnl).toFixed(2)}
                                    </h2>
                                </div>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-white/40 hover:bg-white/5 hover:text-white rounded-[4px] -mt-1 -mr-2"><Settings className="h-3.5 w-3.5" /></Button>
                            </div>

                            {/* Property List Rows */}
                            <div className="flex flex-col gap-3.5 text-[11px] font-bold tracking-wide">
                                <div className="flex justify-between"><span className="text-white/40">Side</span><span className={cn(isLong ? "text-[#0F8A5D]" : "text-[#D73A49]")}>{side}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Account</span><span className="text-white/80">{account}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Pips</span><span className={cn(parseFloat(pips.toString()) >= 0 ? "text-[#0F8A5D]" : "text-[#D73A49]")}>{pips}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Commissions & Fees</span><span className="text-white/80">${Math.abs(commissions).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Net ROI</span><span className={cn(parseFloat(roi.toString()) >= 0 ? "text-[#0F8A5D]" : "text-[#D73A49]")}>{roi}%</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Gross P&L</span><span className={cn(grossPnl >= 0 ? "text-white/80" : "text-white/80")}>{grossPnl >= 0 ? '' : '-'}${Math.abs(grossPnl).toFixed(2)}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Strategy</span><span className="text-indigo-400 font-medium">Select Strategy</span></div>
                                
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-white/40">Bady Scale</span>
                                    <div className="w-[120px] h-[5px] rounded-full bg-white/10 relative overflow-hidden flex">
                                        {/* Simplistic mock bar matching UI */}
                                        <div className={cn("h-full w-[80%] rounded-l-full", isWin ? "bg-[#0F8A5D]" : "bg-[#D73A49]")}></div>
                                        <div className="h-full w-[20%] rounded-r-full bg-[#10b981]/20"></div>
                                    </div>
                                </div>
                            </div>
                            
                            <hr className="border-white/[0.04]" />

                            <div className="flex flex-col gap-3.5 text-[11px] font-bold tracking-wide">
                                <div className="flex justify-between"><span className="text-white/40">Average Entry</span><span className="text-white/80">${parseFloat(entryPrice.toString()).toFixed(3)}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Average Exit</span><span className="text-white/80">${parseFloat(exitPrice.toString()).toFixed(3)}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Entry Time</span><span className="text-white/80">{openTime}</span></div>
                                <div className="flex justify-between"><span className="text-white/40">Exit Time</span><span className="text-white/80">{closeTime}</span></div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>

                {/* Right Panel: TradingView & Notes */}
                <div className="flex-1 flex flex-col min-w-0">
                    <Tabs defaultValue="chart" className="w-full flex-1 flex flex-col">
                        {/* Right Panel Tabs */}
                        <div className="h-12 bg-[#121212] border-b border-white/[0.04] flex items-center px-4 shrink-0">
                            <TabsList className="h-full bg-transparent p-0 gap-4">
                                <TabsTrigger value="chart" className="h-9 px-3 rounded-[6px] bg-transparent data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-[11px] font-bold tracking-wide text-white/50 transition-colors">Chart</TabsTrigger>
                                <TabsTrigger value="notes" className="h-9 px-3 rounded-[6px] bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white text-[11px] font-bold tracking-wide text-white/50 transition-colors">Notes</TabsTrigger>
                                <TabsTrigger value="running" className="h-9 px-3 rounded-[6px] bg-transparent data-[state=active]:bg-white/10 data-[state=active]:text-white text-[11px] font-bold tracking-wide text-white/50 transition-colors">Running P&L</TabsTrigger>
                            </TabsList>
                        </div>
                        
                        <div className="flex flex-col flex-1 relative overflow-hidden bg-[#0A0A0A]">
                            {/* Primary Chart Area (Top 60%) */}
                            <TabsContent value="chart" className="m-0 h-full w-full data-[state=inactive]:hidden flex flex-col outline-none">
                                <div className="flex-1 w-full h-full relative">
                                    <TradingViewWidget symbol={trade.Symbol || 'OANDA:XAUUSD'} theme="dark" />
                                </div>
                                {/* Resizable Splitter visual (static) */}
                                <div className="h-1 bg-white/[0.02] hover:bg-indigo-500/50 cursor-ns-resize shrink-0 flex items-center justify-center">
                                    <div className="w-8 h-[2px] bg-white/20 rounded-full pointer-events-none"></div>
                                </div>
                                {/* Lower Panel: Notes embedded */}
                                <div className="h-[300px] shrink-0 bg-[#0A0A0A] flex flex-col p-4 border-t border-white/[0.02] border-dashed">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2"><h3 className="text-xs font-bold text-white/60 tracking-wider uppercase">Notes</h3></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 bg-white/5 hover:bg-white/10 hover:text-white rounded-[4px]"><MoreHorizontal className="h-3 w-3" /></Button>
                                    </div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Button variant="outline" className="h-7 bg-indigo-600/10 border-indigo-500/20 text-indigo-400 text-[10px] font-bold rounded-[4px] px-3 shadow-none">Trade note</Button>
                                        <Button variant="outline" className="h-7 bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:text-white text-[10px] font-bold rounded-[4px] px-3 shadow-none">Daily Journal</Button>
                                        <span className="text-[10px] text-white/30 ml-4 font-medium flex items-center">Recently used templates <Button variant="ghost" size="sm" className="h-5 px-1 ml-1 text-indigo-400 font-bold hover:bg-transparent hover:text-indigo-300 pointer-events-none">+ Add template</Button></span>
                                    </div>
                                    <textarea 
                                        className="w-full flex-1 bg-transparent border-none text-[13px] text-white placeholder:text-white/20 focus:ring-0 resize-none font-medium p-4 appearance-none rounded-xl hover:bg-white/[0.01] transition-colors"
                                        placeholder="Add notes, context, templates, or images here..."
                                        defaultValue={trade.Note || ""}
                                        readOnly
                                    />
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="notes" className="m-0 h-full w-full p-6 outline-none bg-[#101010]">
                                 <textarea 
                                    className="w-full h-full bg-[#121212] border border-white/[0.05] rounded-xl text-sm text-white placeholder:text-white/30 focus:ring-1 focus:ring-indigo-500 resize-none font-medium p-6"
                                    placeholder="Add full-screen notes or context here..."
                                    defaultValue={trade.Note || ""}
                                    readOnly
                                />
                            </TabsContent>

                            <TabsContent value="running" className="m-0 h-full w-full p-6 outline-none flex items-center justify-center bg-[#101010]">
                                 <div className="w-full h-full max-h-[500px]">
                                     <RunningPnLChart trades={[trade]} className="h-full" />
                                 </div>
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}
