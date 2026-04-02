
'use client';

import React from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
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
    const processedTrades = React.useMemo(() => {
        return data
            .map((trade, index) => {
                try {
                    const dateStr = trade.Date;
                    if (!dateStr) {
                        console.warn(`RecentTradesTable: Skipping trade (recent) due to missing Date. Trade:`, trade);
                        return null;
                    }

                    let originalDate;
                    // Try yyyy-MM-dd first (Dashboard's standard)
                    originalDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                    if (!isValid(originalDate)) {
                        // Fallback to MM/dd/yy
                        originalDate = parse(dateStr, 'MM/dd/yy', new Date());
                    }
                     if (!isValid(originalDate)) {
                        // Fallback to MM/dd/yyyy
                        originalDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                    }

                    if (!isValid(originalDate)) {
                        console.warn(`RecentTradesTable: Skipping trade (recent) due to invalid date parse. Original: '${dateStr}'. Trade:`, trade);
                        return null;
                    }

                    const pnlStr = trade.NetPnL;
                     if (pnlStr === undefined || pnlStr === null) {
                        console.warn(`RecentTradesTable: Skipping trade (recent) due to missing NetPnL. Trade:`, trade);
                        return null;
                    }
                    const pnlValue = parseFloat(pnlStr);
                     if (isNaN(pnlValue)) {
                        console.warn(`RecentTradesTable: Skipping trade (recent) due to invalid PnL parse. Original: '${trade.NetPnL}'. Trade:`, trade);
                        return null;
                    }

                    return {
                        ...trade, 
                        id: trade.id || `trade-${Date.now()}-${index}-${trade.Symbol || 'unknown'}`, // Ensure ID exists
                        originalDate,
                        netPnLValue: pnlValue,
                    };
                } catch (e) {
                    console.warn("Error processing trade for recent trades table (recent):", trade, e);
                    return null;
                }
            })
            .filter((trade): trade is CsvTradeData & { id: string | number; originalDate: Date; netPnLValue: number } => trade !== null)
            .sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
    }, [data]);

    const processedOpenPositions = React.useMemo(() => {
        return data
            .filter(trade => {
                // Example: A trade is "open" if it has 'UPNLCost' or if 'S/D' (Settlement Date) is missing/empty.
                // This logic needs to be adapted based on how open positions are identified in your CSV.
                // For now, we'll use a placeholder: if S/D is empty, consider it open.
                return !trade['S/D'] || trade['S/D']?.trim() === '';
            })
            .map((trade, index) => {
                let originalDate: Date | undefined;
                const dateStr = trade.Date; // This should be T/D (Trade Date)
                if (dateStr) {
                    try {
                        originalDate = parse(dateStr, 'yyyy-MM-dd', new Date());
                        if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yy', new Date());
                        if (!isValid(originalDate)) originalDate = parse(dateStr, 'MM/dd/yyyy', new Date());
                        if (!isValid(originalDate)) originalDate = undefined;
                    } catch { originalDate = undefined; }
                }
                
                const netPnlStr = trade.NetPnL; // Assuming NetPnL for open positions means unrealized PnL
                const unrealizedPnl = netPnlStr !== undefined && netPnlStr !== null ? parseFloat(netPnlStr) : undefined;

                return {
                    id: trade.id || `open-${Date.now()}-${index}-${trade.Symbol || 'unknown'}`, // Ensure ID exists
                    openDate: originalDate ? format(originalDate, 'MM/dd/yyyy') : trade.Date || 'N/A',
                    symbol: trade.Symbol || 'N/A',
                    quantity: trade.Qty ? parseFloat(trade.Qty) : undefined, 
                    entry: trade.Price ? parseFloat(trade.Price) : undefined, 
                    currentPrice: undefined, // Current price would typically come from a live data feed or another CSV column
                    unrealizedPnL: unrealizedPnl !== undefined && !isNaN(unrealizedPnl) ? unrealizedPnl : undefined,
                };
            })
            .sort((a, b) => { 
                if (a.openDate && b.openDate && a.openDate !== 'N/A' && b.openDate !== 'N/A') {
                    try {
                        const dateA = parse(a.openDate, 'MM/dd/yyyy', new Date());
                        const dateB = parse(b.openDate, 'MM/dd/yyyy', new Date());
                        if (isValid(dateA) && isValid(dateB)) {
                           return dateB.getTime() - dateA.getTime();
                        }
                        return 0;
                    } catch { return 0; }
                }
                return 0;
            });
    }, [data]);


    const formatPnL = (pnl: number | undefined): React.ReactNode => {
        if (pnl === undefined || pnl === null) {
             return <span className="flex items-center justify-end">
                 {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}0.00
             </span>;
        }
        const convertedPnl = pnl * selectedCurrency.rate;
        const sign = convertedPnl >= 0 ? '+' : '-';
        const formattedAmount = Math.abs(convertedPnl).toFixed(2);
        return (
             <span className="flex items-center justify-end">
                 {sign}
                 {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}
                 {formattedAmount}
             </span>
         );
    };

     const formatSimpleCurrency = (value: number | undefined): React.ReactNode => {
        if (value === undefined) return 'N/A';
        const convertedValue = value * selectedCurrency.rate;
        return (
            <span className="flex items-center justify-end">
                {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}
                {convertedValue.toFixed(2)}
            </span>
        );
     }

    return (
        <Card className="h-full flex flex-col overflow-hidden">
            <Tabs defaultValue="recent" className="flex flex-col h-full">
                <CardHeader className="p-0 flex-shrink-0">
                    <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/30 rounded-t-lg rounded-b-none px-2 pt-1">
                        <TabsTrigger value="recent" className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground h-8">RECENT TRADES</TabsTrigger>
                        <TabsTrigger value="open" className="text-xs data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none data-[state=inactive]:text-muted-foreground h-8">OPEN POSITIONS</TabsTrigger>
                    </TabsList>
                </CardHeader>

                 <div className="flex-grow overflow-hidden p-2">
                     <TabsContent value="recent" className="mt-0 h-full">
                         <ScrollArea className="h-full">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-muted/50 sticky top-0 bg-card z-10">
                                        <TableHead className="h-8 px-3 text-[10px] text-muted-foreground font-medium rounded-tl-md">Close Date</TableHead>
                                        <TableHead className="h-8 px-3 text-[10px] text-muted-foreground font-medium">Symbol</TableHead>
                                        <TableHead className="h-8 px-3 text-[10px] text-muted-foreground font-medium text-right rounded-tr-md">Net P&amp;L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedTrades.length === 0 && (
                                        <TableRow className="h-8 border-b border-muted/20">
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">No trades found. Upload a CSV.</TableCell>
                                        </TableRow>
                                    )}
                                    {processedTrades.map((trade) => (
                                        <TableRow key={trade.id} className="hover:bg-muted/50 h-8 border-b border-muted/20">
                                            <TableCell className="px-3 py-1 text-[11px]">{trade.originalDate ? format(trade.originalDate, 'MM/dd/yyyy') : 'N/A'}</TableCell>
                                            <TableCell className="px-3 py-1 text-[11px]">{trade.Symbol ?? 'N/A'}</TableCell>
                                            <TableCell className={cn(
                                                "px-3 py-1 text-right font-medium text-[11px]",
                                                trade.netPnLValue === undefined ? '' : trade.netPnLValue >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                            )}>
                                                {formatPnL(trade.netPnLValue)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    </TabsContent>

                    <TabsContent value="open" className="mt-0 h-full">
                        <ScrollArea className="h-full">
                            <Table className="text-xs">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b border-muted/50 sticky top-0 bg-card z-10">
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium rounded-tl-md">Open Date</TableHead>
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium">Symbol</TableHead>
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium text-right">Qty</TableHead>
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium text-right">Entry</TableHead>
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium text-right">Current</TableHead>
                                        <TableHead className="h-8 px-2 text-[10px] text-muted-foreground font-medium text-right rounded-tr-md">Unrealized P/L</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedOpenPositions.map((pos) => (
                                        <TableRow key={pos.id} className="hover:bg-muted/50 h-8 border-b border-muted/20">
                                            <TableCell className="px-2 py-1 text-[11px]">{pos.openDate}</TableCell>
                                            <TableCell className="px-2 py-1 text-[11px]">{pos.symbol}</TableCell>
                                            <TableCell className={cn("px-2 py-1 text-[11px] text-right")}>{pos.quantity ?? 'N/A'}</TableCell>
                                            <TableCell className="px-2 py-1 text-[11px] text-right">{pos.entry ? formatSimpleCurrency(pos.entry) : 'N/A'}</TableCell>
                                            <TableCell className="px-2 py-1 text-[11px] text-right">{pos.currentPrice ? formatSimpleCurrency(pos.currentPrice) : 'N/A'}</TableCell>
                                            <TableCell className={cn(
                                                "px-2 py-1 text-right font-medium text-[11px]",
                                                pos.unrealizedPnL === undefined ? '' : pos.unrealizedPnL >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
                                            )}>
                                                {formatPnL(pos.unrealizedPnL)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {processedOpenPositions.length === 0 && (
                                        <TableRow className="h-8 border-b border-muted/20">
                                            <TableCell colSpan={6} className="text-center text-muted-foreground py-4">No open positions found.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                         </ScrollArea>
                    </TabsContent>
                 </div>
            </Tabs>
        </Card>
    );
}
