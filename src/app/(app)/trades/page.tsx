
// src/app/(app)/trades/page.tsx
'use client';

import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import { useTradeData } from '@/contexts/TradeDataContext';

export default function TradesPage() {
  const { tradeData, addTrades, isLoading: tradeDataLoading, setIsLoading: setTradeDataLoading } = useTradeData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const csvHeaders = results.meta.fields?.map(h => h.trim().toLowerCase()) || [];
          const hasTradeDateColumn = csvHeaders.includes('t/d');
          const hasNetProceedsColumn = csvHeaders.includes('net proceeds');
          // Add check for Gross Proceeds as well for consistency with dashboard
          const hasGrossProceedsColumn = csvHeaders.includes('gross proceeds');


          if (!hasTradeDateColumn) {
            toast({
              title: 'CSV Format Error',
              description: "The CSV file must contain a 'T/D' column (Trade Date).",
              variant: 'destructive',
            });
          }
           if (!hasNetProceedsColumn) {
            toast({
              title: 'CSV Format Error',
              description: "The CSV file must contain a 'Net Proceeds' column for P&L.",
              variant: 'destructive',
            });
          }
           if (!hasGrossProceedsColumn) {
             toast({
               title: 'CSV Format Error',
               description: "The CSV file must contain a 'Gross Proceeds' column.",
               variant: 'destructive',
             });
           }


          if (results.data.length > 0 && hasTradeDateColumn && hasNetProceedsColumn && hasGrossProceedsColumn) {
            const normalizedData = results.data.map((row, index) => {
              const newRow: Partial<CsvTradeData> = { id: `trade-hist-${Date.now()}-${index}` };
               const headerMap: { [csvHeader: string]: keyof CsvTradeData } = {
                'account': 'Account', 't/d': 'T/D', 's/d': 'S/D',
                'currency': 'Currency', 'type': 'Type', 'side': 'Side',
                'symbol': 'Symbol', 'qty': 'Qty', 'price': 'Price',
                'exec time': 'Exec Time', 'comm': 'Comm', 'sec': 'SEC',
                'taf': 'TAF', 'nscc': 'NSCC', 'nasdaq': 'Nasdaq',
                'ecn remove': 'ECN Remove', 'ecn add': 'ECN Add',
                'gross proceeds': 'Gross Proceeds', 'net proceeds': 'Net Proceeds',
                'clr broker': 'Clr Broker', 'liq': 'Liq', 'note': 'Note',
                'netcash': 'NetCash', 'totalsecfee': 'TotalSECFee',
                'totalfee1': 'TotalFee1', 'totalfee2': 'TotalFee2',
                'totalfee3': 'TotalFee3', 'totalfee4': 'TotalFee4',
                'totalfee5': 'TotalFee5',
                'roi': 'ROI', 'r-multiple': 'RMultiple', 'r multiple': 'RMultiple',
                'strategy': 'Strategy', 'volume': 'Volume', 'ticks': 'Ticks',
                'pips': 'Pips', 'instrument': 'Instrument'
              };

              for (const rawCsvHeader in row) {
                const csvHeader = rawCsvHeader.trim().toLowerCase();
                const targetKey = headerMap[csvHeader];
                if (targetKey) {
                  // @ts-ignore
                  newRow[targetKey] = row[rawCsvHeader];
                }
              }
              
              const rawTradeDate = newRow['T/D'];
              if (rawTradeDate && rawTradeDate.trim() !== '') {
                try {
                    let parsedDateAttempt: Date | undefined;
                    const dateFormatsToTry = ['MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
                    for (const fmt of dateFormatsToTry) {
                        const attempt = parse(rawTradeDate, fmt, new Date());
                        if (isValid(attempt)) {
                            parsedDateAttempt = attempt;
                            break;
                        }
                    }

                    if (parsedDateAttempt && isValid(parsedDateAttempt)) {
                        newRow.Date = format(parsedDateAttempt as Date, 'yyyy-MM-dd');
                    } else {
                        newRow.Date = rawTradeDate; // Fallback
                        console.warn(`TradesPage Row ${index + 1}: Could not parse date: ${rawTradeDate}. Stored as is.`);
                        toast({ title: `Date Warning (Row ${index + 2})`, description: `Could not parse date '${rawTradeDate}'. Expected MM/dd/yy, yyyy-MM-dd, etc.`, variant: 'default', duration: 7000});
                    }
                } catch (e) {
                    newRow.Date = rawTradeDate; // Fallback
                    console.error(`TradesPage Row ${index + 1}: Error parsing date ${rawTradeDate}:`, e);
                    toast({ title: `Date Error (Row ${index + 2})`, description: `Error parsing date '${rawTradeDate}'.`, variant: 'destructive', duration: 5000});
                }
              } else {
                newRow.Date = '';
                console.warn(`TradesPage Row ${index + 1}: Missing or empty 'T/D' value.`)
                toast({ title: `Date Missing (Row ${index + 2})`, description: `Missing or empty 'T/D' value. This trade might be ignored.`, variant: 'destructive', duration: 7000});
              }

              newRow.NetPnL = newRow['Net Proceeds'] || '0';
              newRow.GrossPnl = newRow['Gross Proceeds'] || '0'; // Also standardize GrossPnl
              return newRow as CsvTradeData;
            });

            addTrades(normalizedData);
          } else if (results.data.length === 0) {
            toast({ title: 'Empty CSV', description: 'The uploaded CSV file has no data.' });
          } else if (results.data.length > 0 && (!hasTradeDateColumn || !hasNetProceedsColumn || !hasGrossProceedsColumn)) {
            // Specific error toasts are handled above
          }
        },
        error: (error) => {
          console.error('CSV parsing error:', error.message);
          toast({ title: 'CSV Parsing Failed', description: error.message, variant: 'destructive' });
          setTradeDataLoading(false);
        },
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Trade History</h1>
        <Button onClick={triggerFileInput} variant="outline" className="hover-effect" disabled={tradeDataLoading}>
          <Upload className="mr-2 h-4 w-4" /> {tradeDataLoading ? 'Processing...' : 'Upload Trades CSV'}
        </Button>
        <Input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".csv"
          onChange={handleFileUpload}
        />
      </div>
      <Card className="hover-effect">
        <CardHeader>
          <CardTitle>All Trades</CardTitle>
          <CardDescription>
            Displaying {tradeData.length} trade{tradeData.length !== 1 ? 's' : ''}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date (T/D)</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Side</TableHead>
                <TableHead className="text-right">Net P&amp;L</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tradeDataLoading && (
                 <TableRow>
                   <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                     Loading trades...
                   </TableCell>
                 </TableRow>
              )}
              {!tradeDataLoading && tradeData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                    No trades to display. Upload a CSV file.
                  </TableCell>
                </TableRow>
              )}
              {!tradeDataLoading && tradeData.map((trade) => {
                const netPnl = parseFloat(trade.NetPnL || '0');
                let displayDate = trade.Date || trade['T/D'] || 'N/A';
                try {
                    let parsedDateAttempt: Date | undefined;
                    if (displayDate !== 'N/A' && displayDate.trim() !== '') {
                        const dateFormatsToTry = ['yyyy-MM-dd', 'MM/dd/yy', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
                        for (const fmt of dateFormatsToTry) {
                            const attempt = parse(displayDate, fmt, new Date());
                            if (isValid(attempt)) {
                                parsedDateAttempt = attempt;
                                break;
                            }
                        }
                        if (parsedDateAttempt && isValid(parsedDateAttempt)){
                            displayDate = format(parsedDateAttempt as Date, 'MM/dd/yyyy');
                        }
                    }
                } catch { /* Keep displayDate as is if parsing fails */ }


                return (
                  <TableRow key={trade.id} className="hover:bg-muted/50 cursor-pointer hover-effect">
                    <TableCell>{displayDate}</TableCell>
                    <TableCell>{trade.Symbol || 'N/A'}</TableCell>
                    <TableCell className="text-right">{trade.Qty || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      {trade.Price ? `$${parseFloat(trade.Price).toFixed(2)}` : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">{trade.Side || 'N/A'}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        netPnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}
                    >
                      {netPnl >= 0 ? `+$${netPnl.toFixed(2)}` : `-$${Math.abs(netPnl).toFixed(2)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

