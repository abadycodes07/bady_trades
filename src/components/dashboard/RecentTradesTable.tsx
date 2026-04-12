
'use client';

import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { CsvTradeData as DashboardCsvTradeData } from '@/app/(app)/dashboard/page'; // Import from dashboard

interface Currency {
    code: string;
    name: string;
    symbol: string | React.ReactNode;
    rate: number;
}

// Use CsvTradeData from dashboard page.
export interface CsvTradeData extends DashboardCsvTradeData { 
  // `Date` field is expected to be 'yyyy-MM-dd' string from DashboardCsvTradeData, or raw from CSV
  id: string | number; // For key prop - ensure this is always present
  originalDate?: Date; // Parsed Date object
  netPnLValue?: number; // Parsed numeric NetPnL
}


interface RecentTradesTableProps {
  selectedCurrency: Currency;
  data: CsvTradeData[]; 
}

export function RecentTradesTable({ selectedCurrency, data }: RecentTradesTableProps) {
    const router = useRouter();
    const processedTrades = React.useMemo(() => {
        return data
            .map((trade, index) => {
                const dateStr = trade.Date;
                if (!dateStr) return null;

                let originalDate;
                originalDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yy', new Date());
                if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yyyy', new Date());

                if (!isValid(originalDate)) return null;

                const pnlStr = trade.NetPnL;
                if (pnlStr === undefined || pnlStr === null) return null;
                const pnlValue = parseFloat(pnlStr);
                if (isNaN(pnlValue)) return null;

                return {
                    ...trade, 
                    id: trade.id || `trade-${Date.now()}-${index}-${trade.Symbol || 'unknown'}`,
                    originalDate,
                    netPnLValue: pnlValue,
                };
            })
            .filter((trade): trade is CsvTradeData & { id: string | number; originalDate: Date; netPnLValue: number } => trade !== null)
            .sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime())
            .slice(0, 50);
    }, [data]);

    const processedOpenPositions = React.useMemo(() => {
        return data
            .filter(trade => !trade['S/D'] || trade['S/D']?.trim() === '')
            .map((trade, index) => {
                let originalDate: Date | undefined;
                const dateStr = trade.Date;
                if (dateStr) {
                    originalDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                    if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yy', new Date());
                    if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                }
                
                const netPnlStr = trade.NetPnL;
                const unrealizedPnl = netPnlStr !== undefined ? parseFloat(netPnlStr) : undefined;

                return {
                    id: trade.id || `open-${Date.now()}-${index}-${trade.Symbol || 'unknown'}`,
                    openDate: originalDate ? format(originalDate, 'MM/dd/yyyy') : trade.Date || 'N/A',
                    symbol: trade.Symbol || 'N/A',
                    quantity: trade.Qty ? parseFloat(trade.Qty) : undefined, 
                    entry: trade.Price ? parseFloat(trade.Price) : undefined, 
                    unrealizedPnL: unrealizedPnl && !isNaN(unrealizedPnl) ? unrealizedPnl : undefined,
                };
            })
            .sort((a, b) => { 
                if (a.openDate && b.openDate && a.openDate !== 'N/A' && b.openDate !== 'N/A') {
                    const dateA = parse(a.openDate, 'MM/dd/yyyy', new Date());
                    const dateB = parse(b.openDate, 'MM/dd/yyyy', new Date());
                    if (isValid(dateA) && isValid(dateB)) return dateB.getTime() - dateA.getTime();
                }
                return 0;
            });
    }, [data]);

    const formatPnL = (pnl: number | undefined): React.ReactNode => {
        if (pnl === undefined) return <span className="text-muted-foreground/40 font-black">---</span>;
        const convertedPnl = pnl * selectedCurrency.rate;
        const sign = convertedPnl >= 0 ? '+' : '';
        return (
             <span className={cn("font-black tabular-nums tracking-tighter", convertedPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                 {sign}{convertedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
             </span>
         );
    };

    return (
        <Card className="h-full flex flex-col bg-card border-border shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-primary/5 blur-3xl rounded-full" />
            
            <Tabs defaultValue="recent" className="flex flex-col h-full z-10">
                <CardHeader className="p-0 flex-shrink-0 bg-muted/10 border-b border-border">
                    <TabsList className="grid w-full grid-cols-2 h-12 bg-transparent rounded-none p-1">
                        <TabsTrigger value="recent" className="text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-muted/20 data-[state=active]:text-primary transition-all duration-300">RECENT TRADES</TabsTrigger>
                        <TabsTrigger value="open" className="text-[10px] font-black uppercase tracking-[0.2em] data-[state=active]:bg-muted/20 data-[state=active]:text-primary transition-all duration-300">OPEN POSITIONS</TabsTrigger>
                    </TabsList>
                </CardHeader>

                 <div className="flex-grow overflow-hidden">
                     <TabsContent value="recent" className="mt-0 h-full data-[state=active]:flex flex-col">
                         <ScrollArea className="flex-grow">
                            <Table>
                                <TableHeader className="bg-muted/20 backdrop-blur-md sticky top-0 z-20">
                                    <TableRow className="hover:bg-transparent border-border">
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Date</TableHead>
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Symbol</TableHead>
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 text-right">Net P&L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedTrades.length === 0 && (
                                        <TableRow className="border-transparent">
                                            <TableCell colSpan={3} className="text-center text-[10px] font-black text-muted-foreground/20 py-12 uppercase tracking-widest">No history found</TableCell>
                                        </TableRow>
                                    )}
                                    {processedTrades.map((trade) => (
                                        <TableRow 
                                            key={trade.id} 
                                            className="hover:bg-muted/5 border-border transition-colors duration-200 cursor-pointer active:scale-[0.99] transition-transform"
                                            onClick={() => router.push(`/trades/${trade.id}`)}
                                        >
                                            <TableCell className="px-4 py-3 text-[11px] font-black text-muted-foreground/60">{format(trade.originalDate, 'MMM dd, yyyy')}</TableCell>
                                            <TableCell className="px-4 py-3 text-[11px] font-black text-foreground">{trade.Symbol}</TableCell>
                                            <TableCell className="px-4 py-3 text-right">{formatPnL(trade.netPnLValue)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    </TabsContent>

                    <TabsContent value="open" className="mt-0 h-full data-[state=active]:flex flex-col">
                        <ScrollArea className="flex-grow">
                            <Table>
                                <TableHeader className="bg-muted/20 backdrop-blur-md sticky top-0 z-20">
                                    <TableRow className="hover:bg-transparent border-border">
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Date</TableHead>
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">Symbol</TableHead>
                                        <TableHead className="h-10 px-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 text-right">P/L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedOpenPositions.length === 0 && (
                                        <TableRow className="border-transparent">
                                            <TableCell colSpan={3} className="text-center text-[10px] font-black text-muted-foreground/20 py-12 uppercase tracking-widest">No open positions</TableCell>
                                        </TableRow>
                                    )}
                                    {processedOpenPositions.map((pos) => (
                                        <TableRow key={pos.id} className="hover:bg-muted/5 border-border transition-colors duration-200">
                                            <TableCell className="px-4 py-3 text-[11px] font-black text-muted-foreground/60">{pos.openDate}</TableCell>
                                            <TableCell className="px-4 py-3 text-[11px] font-black text-foreground">{pos.symbol}</TableCell>
                                            <TableCell className="px-4 py-3 text-right">{formatPnL(pos.unrealizedPnL)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    </TabsContent>
                 </div>
            </Tabs>
        </Card>
    );
}
