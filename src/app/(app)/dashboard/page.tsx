
// src/app/(app)/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, GripVertical, Info, Filter, CalendarDays, Bell, Sparkles, Upload } from 'lucide-react';
import { TradingCalendar } from '@/components/dashboard/TradingCalendar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CumulativePnLChart, type CumulativeDataPoint } from '@/components/dashboard/CumulativePnLChart';
import { BadyScoreChart } from '@/components/dashboard/BadyScoreChart';
import { ProgressTrackerHeatmap } from '@/components/dashboard/ProgressTrackerHeatmap';
import { RecentTradesTable, type CsvTradeData as RecentTradesCsvTradeData } from '@/components/dashboard/RecentTradesTable'; // Use specific type for clarity
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, parse, isValid, compareAsc } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Responsive, WidthProvider, type ResponsiveLayout } from 'react-grid-layout';
import type { Layout } from 'react-grid-layout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { useTradeData } from '@/contexts/TradeDataContext';
import { Skeleton } from '@/components/ui/skeleton';


const ResponsiveGridLayout = WidthProvider(Responsive);

export interface CsvTradeData {
  Account?: string;
  'T/D'?: string;
  'S/D'?: string;
  Currency?: string;
  Type?: string;
  Side?: string;
  Symbol?: string;
  Qty?: string;
  Price?: string;
  'Exec Time'?: string;
  Comm?: string;
  SEC?: string;
  TAF?: string;
  NSCC?: string;
  Nasdaq?: string;
  'ECN Remove'?: string;
  'ECN Add'?: string;
  'Gross Proceeds'?: string;
  'Net Proceeds'?: string;
  'Clr Broker'?: string;
  Liq?: string;
  Note?: string;
  Date?: string; // Standardized date YYYY-MM-DD
  NetPnL?: string; // Standardized Net P&L from Net Proceeds
  GrossPnl?: string; // Standardized Gross P&L from Gross Proceeds
  NetCash?: string;
  TotalSECFee?: string;
  TotalFee1?: string;
  TotalFee2?: string;
  TotalFee3?: string;
  TotalFee4?: string;
  TotalFee5?: string;
  id?: string | number;
}

export interface CsvCommissionData {
  DateAsOf?: string; // Original date string from commission CSV
  Date?: string; // Standardized date YYYY-MM-DD
  TotalCommission?: string; // Original commission string
  Commission?: string; // Standardized commission value as string
  id?: string;
}


const initialLayouts = {
  lg: [
    { i: 'net-pnl', x: 0, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'profit-factor', x: 2, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'trade-win', x: 4, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'avg-win-loss', x: 6, y: 0, w: 3, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'max-drawdown', x: 9, y: 0, w: 3, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'cumulative-pnl', x: 0, y: 3, w: 6, h: 8, isResizable: true, isDraggable: true, static: false },
    { i: 'bady-score', x: 6, y: 3, w: 6, h: 8, isResizable: true, isDraggable: true, static: false },
    { i: 'trading-calendar', x: 0, y: 11, w: 9, h: 15, isResizable: true, isDraggable: true, static: false },
    { i: 'progress-tracker', x: 9, y: 11, w: 3, h: 7, isResizable: true, isDraggable: true, static: false },
    { i: 'recent-trades', x: 9, y: 18, w: 3, h: 7, isResizable: true, isDraggable: true, static: false },
  ],
};

const WIDGET_KEYS = [
    'net-pnl', 'profit-factor', 'trade-win', 'avg-win-loss', 'max-drawdown',
    'cumulative-pnl', 'bady-score', 'trading-calendar', 'progress-tracker', 'recent-trades'
];

interface Currency {
  code: string;
  name: string;
  symbol: string | React.ReactNode;
  rate: number;
}

const currencies: Currency[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
    { code: 'EUR', name: 'Euro', symbol: '€', rate: 0.93 },
    { code: 'GBP', name: 'British Pound', symbol: '£', rate: 0.79 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', rate: 158.47 },
    { code: 'SAR', name: 'Saudi Riyal', symbol: <span className="sar" style={{ fontSize: '1.1em', lineHeight: '1' }}>$</span>, rate: 3.75 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$', rate: 1.37 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', rate: 1.50 },
    { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', rate: 0.88 },
    { code: 'CNY', name: 'Chinese Yuan', symbol: 'CN¥', rate: 7.25 },
    { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', rate: 10.78 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.63 },
    { code: 'MXN', name: 'Mexican Peso', symbol: 'Mex$', rate: 17.64 },
    { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', rate: 1.35 },
    { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.81 },
    { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', rate: 10.67 },
    { code: 'KRW', name: 'South Korean Won', symbol: '₩', rate: 1345.50 },
    { code: 'TRY', name: 'Turkish Lira', symbol: '₺', rate: 32.30 },
    { code: 'RUB', name: 'Russian Ruble', symbol: '₽', rate: 89.45 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', rate: 83.44 },
    { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', rate: 5.04 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', rate: 18.22 },
];


export default function DashboardPage() {
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [layouts, setLayouts] = useState<ResponsiveLayout | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { tradeData, addTrades, isLoading: tradeDataLoading, setIsLoading: setTradeDataLoading } = useTradeData();
  const [commissionData, setCommissionData] = useState<CsvCommissionData[]>([]);
  const commissionFileInputRef = useRef<HTMLInputElement>(null);
  const [showFeesInPnl, setShowFeesInPnl] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const savedLayouts = localStorage.getItem('dashboardLayouts');
    try {
      const parsedLayouts = savedLayouts ? JSON.parse(savedLayouts) : initialLayouts;
       Object.keys(initialLayouts).forEach(bp => {
            const currentBpKey = bp as keyof typeof initialLayouts;
            const loadedBpLayout = parsedLayouts[bp as keyof typeof parsedLayouts] || [];
            const initialBpLayout = initialLayouts[currentBpKey];

            if (!initialBpLayout) { // Handle case where initialBpLayout might be undefined
                console.warn(`DashboardPage: Initial layout for breakpoint ${bp} is undefined. Skipping validation.`);
                if (loadedBpLayout.length > 0) { // If loaded layout exists, use it but set to static
                     parsedLayouts[currentBpKey] = loadedBpLayout.map((l: Layout) => ({
                         ...l, isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
                     }));
                } else {
                    parsedLayouts[currentBpKey] = []; // Default to empty array if no layout defined
                }
                return;
            }

            const initialLayoutKeys = new Set(initialBpLayout.map(l => l.i));
            const loadedLayoutKeys = new Set(loadedBpLayout.map((l: Layout) => l.i));

            let layoutNeedsReset = false;
            if (initialLayoutKeys.size !== loadedLayoutKeys.size || ![...initialLayoutKeys].every(key => loadedLayoutKeys.has(key))) {
                layoutNeedsReset = true;
            }

             if (layoutNeedsReset) {
                 parsedLayouts[currentBpKey] = initialBpLayout.map((l: Layout) => ({
                     ...l, isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
                 }));
             } else {
                 parsedLayouts[currentBpKey] = loadedBpLayout.map((l: Layout) => {
                     const initialL = initialBpLayout.find(il => il.i === l.i);
                     return {
                         ...l, isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
                         h: initialL?.h ?? l.h, w: initialL?.w ?? l.w
                     };
                 });
             }
       });
      setLayouts(parsedLayouts);
    } catch (error) {
      console.error("Failed to parse layouts from local storage:", error);
       Object.keys(initialLayouts).forEach(bp => {
            const currentBpKey = bp as keyof typeof initialLayouts;
            const initialBpLayout = initialLayouts[currentBpKey];
            if (initialBpLayout) {
                initialLayouts[currentBpKey] = initialBpLayout.map((l: Layout) => ({
                   ...l, isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
                }));
            }
       });
      setLayouts(initialLayouts);
    }
  }, [isEditingLayout]);

  const handleLayoutChange = useCallback((newLayout: Layout[], newLayouts: ResponsiveLayout) => {
    if (isEditingLayout) {
        const updatedLayouts = JSON.parse(JSON.stringify(newLayouts));
        Object.keys(updatedLayouts).forEach(bp => {
            const currentBpKey = bp as keyof ResponsiveLayout;
            updatedLayouts[currentBpKey] = (updatedLayouts[currentBpKey] || []).map((l: Layout) => ({
               ...l, isDraggable: true, isResizable: true, static: false,
            }));
       });
       setLayouts(updatedLayouts);
       if (typeof window !== 'undefined') {
            localStorage.setItem('dashboardLayouts', JSON.stringify(updatedLayouts));
       }
    }
  }, [isEditingLayout]);

  const toggleEditLayout = useCallback(() => {
    const newState = !isEditingLayout;
    setIsEditingLayout(newState);

    setLayouts(prevLayouts => {
        const currentLayouts = prevLayouts ? JSON.parse(JSON.stringify(prevLayouts)) : initialLayouts;
        Object.keys(currentLayouts).forEach(bp => {
            const currentBpKey = bp as keyof typeof currentLayouts;
            const initialBpLayout = initialLayouts[bp as keyof typeof initialLayouts];
            currentLayouts[currentBpKey] = (currentLayouts[currentBpKey] || []).map((l: Layout) => {
                 const initialL = initialBpLayout?.find(il => il.i === l.i);
                 const shouldResetDimensions = !newState && initialL;
                 return {
                    ...l,
                    isDraggable: newState, isResizable: newState, static: !newState,
                    ...(shouldResetDimensions ? { w: initialL.w, h: initialL.h } : {})
                 };
             });
        });

        if (!newState && typeof window !== 'undefined') {
           localStorage.setItem('dashboardLayouts', JSON.stringify(currentLayouts));
        }
        return currentLayouts;
    });
  }, [isEditingLayout]);

   const convertCurrency = useCallback((amount: number): React.ReactNode => {
       const convertedAmount = amount * selectedCurrency.rate;
       const formattedAmount = Math.abs(convertedAmount).toLocaleString('en-US', {
           minimumFractionDigits: 2, maximumFractionDigits: 2,
       });
       return (
           <>
               {convertedAmount < 0 && '-'}
               {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}
               {formattedAmount}
           </>
       );
   }, [selectedCurrency]);

   const handleTradeFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (file) {
           Papa.parse<Record<string, string>>(file, {
               header: true,
               skipEmptyLines: true,
               complete: (results) => {
                   const csvHeaders = results.meta.fields?.map(h => h.trim().toLowerCase()) || [];

                   const hasTradeDateColumn = csvHeaders.includes('t/d');
                   const hasNetProceedsColumn = csvHeaders.includes('net proceeds');
                   const hasGrossProceedsColumn = csvHeaders.includes('gross proceeds');
                   
                   const isStandardFormat = hasTradeDateColumn && hasNetProceedsColumn && hasGrossProceedsColumn;
                   const isMT4Format = csvHeaders.includes('ticket') && csvHeaders.includes('closing_time_utc') && csvHeaders.includes('profit');

                   if (!isStandardFormat && !isMT4Format) {
                       toast({
                           title: 'CSV Format Error',
                           description: "Unrecognized CSV format. Please use Standard format (requires 'T/D', 'Net Proceeds', 'Gross Proceeds') or MetaTrader format.",
                           variant: 'destructive',
                           duration: 7000,
                       });
                       return;
                   }


                   if (results.data.length > 0 && (isStandardFormat || isMT4Format)) {
                       const normalizedData = results.data.map((row, index) => {
                           const newRow: Partial<CsvTradeData> = { id: `csv-trade-${Date.now()}-${index}` };

                           if (isMT4Format) {
                               const getRowVal = (key: string) => row[Object.keys(row).find(k => k.trim().toLowerCase() === key) || ''] || '';
                               
                               const rawDate = getRowVal('closing_time_utc') || getRowVal('time');
                               newRow['T/D'] = rawDate ? rawDate.split(' ')[0].split('T')[0] : '';
                               newRow['Symbol'] = getRowVal('symbol');
                               newRow['Side'] = getRowVal('type');
                               newRow['Qty'] = getRowVal('lots') || getRowVal('volume');
                               newRow['Price'] = getRowVal('closing_price') || getRowVal('price');
                               newRow['Exec Time'] = rawDate;
                               
                               const profit = parseFloat(getRowVal('profit') || '0');
                               const comm = parseFloat(getRowVal('commission') || '0');
                               const swap = parseFloat(getRowVal('swap') || '0');
                               
                               newRow['Gross Proceeds'] = profit.toString();
                               newRow['Net Proceeds'] = (profit + comm + swap).toString();
                               newRow['Comm'] = comm.toString();
                               newRow['Account'] = 'MetaTrader';
                           } else {
                               const headerMap: { [csvHeader: string]: keyof CsvTradeData } = {
                                   'account': 'Account', 't/d': 'T/D', 's/d': 'S/D',
                                   'currency': 'Currency', 'type': 'Type', 'side': 'Side',
                                   'symbol': 'Symbol', 'qty': 'Qty', 'price': 'Price',
                                   'exec time': 'Exec Time', 'comm': 'Comm', 'sec': 'SEC',
                                   'taf': 'TAF', 'nscc': 'NSCC', 'nasdaq': 'Nasdaq',
                                   'ecn remove': 'ECN Remove', 'ecn add': 'ECN Add',
                                   'gross proceeds': 'Gross Proceeds', 'net proceeds': 'Net Proceeds',
                                   'clr broker': 'Clr Broker', 'liq': 'Liq', 'note': 'Note',
                                   'netcash': 'NetCash',
                                   'totalsecfee': 'TotalSECFee',
                                   'totalfee1': 'TotalFee1',
                                   'totalfee2': 'TotalFee2',
                                   'totalfee3': 'TotalFee3',
                                   'totalfee4': 'TotalFee4',
                                   'totalfee5': 'TotalFee5',
                               };
    
                               for (const rawCsvHeader in row) {
                                   const csvHeader = rawCsvHeader.trim().toLowerCase();
                                   const targetKey = headerMap[csvHeader];
                                   if (targetKey) {
                                       newRow[targetKey] = row[rawCsvHeader];
                                   }
                               }
                           }

                           const rawTradeDate = newRow['T/D'];
                            if (rawTradeDate && rawTradeDate.trim() !== '') {
                               try {
                                   let parsedDateAttempt;
                                   const dateFormatsToTry = ['MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
                                   for (const fmt of dateFormatsToTry) {
                                       parsedDateAttempt = parse(rawTradeDate, fmt, new Date());
                                       if (isValid(parsedDateAttempt)) break;
                                   }

                                   if (isValid(parsedDateAttempt)) {
                                       newRow.Date = format(parsedDateAttempt, 'yyyy-MM-dd');
                                   } else {
                                       newRow.Date = rawTradeDate; // Fallback for unparseable but existing date
                                       console.warn(`Trade Upload Row ${index + 1}: Could not parse trade date: ${rawTradeDate}. Stored as is.`);
                                       toast({ title: `Date Warning (Row ${index + 2})`, description: `Could not parse trade date '${rawTradeDate}'. Charts might not display correctly. Ensure format is like MM/dd/yy, yyyy-MM-dd, etc.`, variant: 'default', duration: 7000});
                                   }
                               } catch (e) {
                                   newRow.Date = rawTradeDate; // Fallback on error
                                   console.error(`Trade Upload Row ${index + 1}: Error parsing trade date ${rawTradeDate}:`, e);
                                   toast({ title: `Date Error (Row ${index + 2})`, description: `Error parsing trade date '${rawTradeDate}'.`, variant: 'destructive', duration: 5000});
                               }
                           } else {
                               newRow.Date = ''; // Handle missing or empty T/D value
                               console.warn(`Trade Upload Row ${index + 1}: Missing or empty 'T/D' value for trade. Setting Date to empty string.`);
                               toast({ title: `Date Missing (Row ${index + 2})`, description: `Missing or empty 'T/D' value for trade. This trade might be ignored or cause issues.`, variant: 'destructive', duration: 7000});
                           }


                           newRow.NetPnL = newRow['Net Proceeds'] || '0';
                           newRow.GrossPnl = newRow['Gross Proceeds'] || '0';


                           return newRow as CsvTradeData;
                       });

                       addTrades(normalizedData);
                   } else if (results.data.length > 0 && (!isStandardFormat && !isMT4Format)) {
                       // Specific error messages handled above
                   } else if (results.data.length === 0) {
                        toast({
                            title: 'Empty CSV',
                            description: 'The uploaded CSV file contains no trade data.',
                            variant: 'default',
                        });
                   }
               },
               error: (error) => {
                   console.error('CSV parsing error:', error.message);
                   toast({
                       title: 'CSV Parsing Failed',
                       description: error.message,
                       variant: 'destructive',
                   });
                   setTradeDataLoading(false);
               },
           });
           if (fileInputRef.current) {
               fileInputRef.current.value = '';
           }
       }
   };

   const triggerTradeFileInput = () => {
       fileInputRef.current?.click();
   };

   const handleCommissionFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            Papa.parse<Record<string, string>>(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const csvHeaders = results.meta.fields?.map(h => h.trim().toLowerCase()) || [];
                    const hasDateColumn = csvHeaders.includes('dateasof');
                    const hasCommissionColumn = csvHeaders.includes('totalcommission');

                    if (!hasDateColumn) {
                        toast({ title: 'Commission CSV Error', description: "CSV must contain a 'DateAsOf' column (case-insensitive).", variant: 'destructive' });
                        return;
                    }
                    if (!hasCommissionColumn) {
                        toast({ title: 'Commission CSV Error', description: "CSV must contain a 'TotalCommission' column (case-insensitive).", variant: 'destructive' });
                        return;
                    }

                    if (results.data.length > 0) {
                        const normalizedCommissions = results.data.map((row, index) => {
                            const newRow: Partial<CsvCommissionData> = { id: `csv-comm-${Date.now()}-${index}` };
                            const headerMap: { [csvHeader: string]: keyof CsvCommissionData } = {
                                'dateasof': 'DateAsOf',
                                'totalcommission': 'TotalCommission', // Map to TotalCommission first
                            };

                            for (const rawCsvHeader in row) {
                                const csvHeader = rawCsvHeader.trim().toLowerCase();
                                const targetKey = headerMap[csvHeader];
                                if (targetKey) {
                                    newRow[targetKey] = row[rawCsvHeader];
                                }
                            }
                            newRow.Commission = newRow.TotalCommission; // Then assign to standardized 'Commission'

                            const rawDate = newRow.DateAsOf;
                            if (rawDate && rawDate.trim() !== '') {
                                try {
                                    let parsedDateAttempt;
                                    const dateFormatsToTry = [
                                        'MMddyy', 'yyyyMMdd', // No slash
                                        'MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', // With slash/dash
                                        'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'     // Single digit month/day
                                    ];

                                    for (const fmt of dateFormatsToTry) {
                                        parsedDateAttempt = parse(rawDate, fmt, new Date());
                                        if (isValid(parsedDateAttempt)) break;
                                    }

                                    if (isValid(parsedDateAttempt)) {
                                        newRow.Date = format(parsedDateAttempt, 'yyyy-MM-dd');
                                    } else {
                                        newRow.Date = rawDate;
                                        console.warn(`Commission Upload Row ${index+2}: Could not parse date '${rawDate}'. Stored as is.`);
                                        toast({ title: `Commission Date Warning (Row ${index+2})`, description: `Could not parse date '${rawDate}'. Expected formats like MMddyy, yyyyMMdd, MM/dd/yy, etc. Stored as is.`, variant: 'default', duration: 7000 });
                                    }
                                } catch (e) {
                                    newRow.Date = rawDate;
                                    console.error(`Commission Upload Row ${index+2}: Error parsing date '${rawDate}':`, e);
                                    toast({ title: `Commission Date Error (Row ${index+2})`, description: `Error parsing date '${rawDate}'.`, variant: 'destructive', duration: 5000 });
                                }
                            } else {
                                newRow.Date = '';
                                console.warn(`Commission Upload Row ${index+2}: Missing or empty 'DateAsOf'.`);
                                toast({ title: `Commission Date Missing (Row ${index+2})`, description: `Missing or empty 'DateAsOf'. This entry might be ignored.`, variant: 'destructive', duration: 7000 });
                            }
                            return newRow as CsvCommissionData;
                        }).filter(comm => comm.Date && comm.Commission); // Filter out entries without valid date or commission amount

                        setCommissionData(prev => {
                            const updatedCommissions = [...prev];
                            normalizedCommissions.forEach(newComm => {
                                const existingIndex = updatedCommissions.findIndex(ec => ec.Date === newComm.Date);
                                if (existingIndex > -1) {
                                    updatedCommissions[existingIndex] = newComm;
                                } else {
                                    updatedCommissions.push(newComm);
                                }
                            });
                            return updatedCommissions.sort((a, b) => compareAsc(parse(a.Date!, 'yyyy-MM-dd', new Date()), parse(b.Date!, 'yyyy-MM-dd', new Date())));
                        });
                        toast({ title: 'Commissions Uploaded', description: `${normalizedCommissions.length} commission entries processed.` });
                    } else {
                        toast({ title: 'Empty Commission CSV', description: 'The uploaded CSV file contains no commission data.' });
                    }
                },
                error: (error) => {
                    toast({ title: 'Commission CSV Parsing Failed', description: error.message, variant: 'destructive' });
                }
            });
            if (commissionFileInputRef.current) {
                commissionFileInputRef.current.value = '';
            }
        }
    };

   const triggerCommissionFileInput = () => {
        commissionFileInputRef.current?.click();
   };


   const renderWidget = useCallback((key: string) => {
     let netPnlCardValue = 0;
     const totalUploadedCommissions = commissionData.reduce((sum, comm) => sum + parseFloat(comm.Commission || '0'), 0);
     const totalNetCashValues = tradeData.reduce((sum, trade) => sum + parseFloat(trade.NetCash || '0'), 0);
     const totalNetPnlFromTrades = tradeData.reduce((sum, trade) => sum + parseFloat(trade.NetPnL || '0'), 0);
     const totalGrossPnlFromTrades = tradeData.reduce((sum, trade) => sum + parseFloat(trade.GrossPnl || '0'), 0);

     if (showFeesInPnl) {
         // If "Include Fees" is ON, Net P&L Card shows: (Sum of NetPnL from trades) - (Sum of uploaded commissions) - (Sum of NetCash from trades)
         netPnlCardValue = totalNetPnlFromTrades - totalUploadedCommissions - totalNetCashValues;
     } else {
         // If "Include Fees" is OFF, Net P&L Card shows: (Sum of GrossPnl from trades)
         netPnlCardValue = totalGrossPnlFromTrades;
     }

     const calculateProfitFactor = (data: CsvTradeData[]): number | string => {
         const grossProfit = data.reduce((sum, trade) => sum + Math.max(0, parseFloat(trade.GrossPnl || '0')), 0);
         const grossLoss = Math.abs(data.reduce((sum, trade) => sum + Math.min(0, parseFloat(trade.GrossPnl || '0')), 0));
         if (grossLoss === 0) return grossProfit === 0 ? 0 : Infinity;
         return (grossProfit / grossLoss);
     };

     const calculateWinRate = (data: CsvTradeData[]): number => {
         const totalTrades = data.length;
         if (totalTrades === 0) return 0;
         const winningTrades = data.filter(trade => parseFloat(trade.NetPnL || '0') > 0).length;
         return (winningTrades / totalTrades) * 100;
     };

      const calculateAvgWinLoss = (data: CsvTradeData[]): { win: number; loss: number; ratio: number | string } => {
          const winningTrades = data.filter(trade => parseFloat(trade.NetPnL || '0') > 0);
          const losingTrades = data.filter(trade => parseFloat(trade.NetPnL || '0') < 0);

          const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, trade) => sum + parseFloat(trade.NetPnL || '0'), 0) / winningTrades.length : 0;
          const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, trade) => sum + parseFloat(trade.NetPnL || '0'), 0) / losingTrades.length : 0;

           const ratio = avgLoss === 0 ? (avgWin === 0 ? 0 : Infinity) : Math.abs(avgWin / avgLoss);
          return { win: avgWin, loss: avgLoss, ratio: isFinite(Number(ratio)) ? Number(ratio).toFixed(2) : '∞' };
      };

      const calculateMaxDrawdown = (data: CsvTradeData[], includeAllFees: boolean, dailyCommissions: Record<string, number>, dailyNetCashMap: Record<string, number>): { value: number; date: string | null } => {
         let peak = 0;
         let maxDrawdownValue = 0;
         let drawdownDate: string | null = null;
         let cumulativePnl = 0;

         const sortedData = [...data].sort((a, b) => {
             if (!a.Date || !b.Date) return 0;
             try {
                let dateA = parse(a.Date, 'yyyy-MM-dd', new Date());
                if (!isValid(dateA)) dateA = parse(a.Date, 'MM/dd/yy', new Date());
                if (!isValid(dateA)) dateA = parse(a.Date, 'MM/dd/yyyy', new Date());

                let dateB = parse(b.Date, 'yyyy-MM-dd', new Date());
                if (!isValid(dateB)) dateB = parse(b.Date, 'MM/dd/yy', new Date());
                if (!isValid(dateB)) dateB = parse(b.Date, 'MM/dd/yyyy', new Date());

                if (!isValid(dateA) || !isValid(dateB)) return 0;
                return dateA.getTime() - dateB.getTime();
             } catch (e) {
                 console.warn("Error sorting data for max drawdown calculation:", e);
                 return 0;
             }
         });

         const dailyPnlMap: Record<string, number> = {};
         sortedData.forEach(trade => {
             const dateKey = trade.Date!;
             const pnl = includeAllFees ? parseFloat(trade.NetPnL || '0') : parseFloat(trade.GrossPnl || '0');
             dailyPnlMap[dateKey] = (dailyPnlMap[dateKey] || 0) + pnl;
         });

         if (includeAllFees) {
             for(const dateKey in dailyPnlMap) {
                 dailyPnlMap[dateKey] -= (dailyCommissions[dateKey] || 0);
                 dailyPnlMap[dateKey] -= (dailyNetCashMap[dateKey] || 0);
             }
             // Ensure commissions and net cash from days without trades are also accounted for
             for(const dateKey in dailyCommissions) {
                 if (!dailyPnlMap[dateKey]) dailyPnlMap[dateKey] = 0; // Initialize if no trade on this day
                 dailyPnlMap[dateKey] -= (dailyCommissions[dateKey] || 0);
             }
              for(const dateKey in dailyNetCashMap) {
                 if (!dailyPnlMap[dateKey]) dailyPnlMap[dateKey] = 0; // Initialize if no trade on this day
                 dailyPnlMap[dateKey] -= (dailyNetCashMap[dateKey] || 0);
             }
         }

         const uniqueSortedDates = Object.keys(dailyPnlMap).sort((a, b) => {
            try {
                const dateA = parse(a, 'yyyy-MM-dd', new Date());
                const dateB = parse(b, 'yyyy-MM-dd', new Date());
                return dateA.getTime() - dateB.getTime();
            } catch { return 0; }
         });


         uniqueSortedDates.forEach(dateKey => {
             cumulativePnl += dailyPnlMap[dateKey];
             if (cumulativePnl > peak) {
                 peak = cumulativePnl;
             }
             const drawdown = peak - cumulativePnl;
             if (drawdown > maxDrawdownValue) {
                 maxDrawdownValue = drawdown;
                 drawdownDate = dateKey;
             }
         });
         return { value: -maxDrawdownValue, date: drawdownDate };
      };

     const profitFactor = calculateProfitFactor(tradeData);
     const winRate = calculateWinRate(tradeData);
     const avgWinLossData = calculateAvgWinLoss(tradeData);

     const dailyCommissionsMap: Record<string,number> = {};
     commissionData.forEach(comm => {
        if(comm.Date && comm.Commission) {
            dailyCommissionsMap[comm.Date] = (dailyCommissionsMap[comm.Date] || 0) + parseFloat(comm.Commission);
        }
     });

     const dailyNetCashMapAgg: Record<string, number> = {};
     tradeData.forEach(trade => {
        if (trade.Date && trade.NetCash) {
            dailyNetCashMapAgg[trade.Date] = (dailyNetCashMapAgg[trade.Date] || 0) + parseFloat(trade.NetCash);
        }
     });

     const maxDrawdownData = calculateMaxDrawdown(tradeData, showFeesInPnl, dailyCommissionsMap, dailyNetCashMapAgg);


     const badyScoreComponents = [
        winRate / 100,
        Math.min(1, (isFinite(Number(profitFactor)) ? Number(profitFactor) : 0) / 3),
        Math.min(1, (isFinite(Number(avgWinLossData.ratio)) ? Number(avgWinLossData.ratio) : 0) / 3),
     ].filter(score => isFinite(score) && !isNaN(score));
     const badyScore = badyScoreComponents.length > 0
        ? (badyScoreComponents.reduce((a, b) => a + b, 0) / badyScoreComponents.length) * 100
        : 0;


     switch (key) {
       case 'net-pnl': return <MetricCard title="Net P&L" value={<span className={netPnlCardValue >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}>{convertCurrency(netPnlCardValue)}</span>} metric={<span>{/* % change could be vs previous period */}</span>} iconType="info" className="h-full"/>;
       case 'profit-factor': return <MetricCard title="Profit Factor" value={isFinite(Number(profitFactor)) ? Number(profitFactor).toFixed(2) : '∞'} iconType="progressCircle" progressValue={Math.min(100, (isFinite(Number(profitFactor)) ? Number(profitFactor) : 0) / 3 * 100)} color={Number(profitFactor) >= 1.5 ? 'green' : 'red'} className="h-full"/>;
       case 'trade-win': return <MetricCard title="Trade Win %" value={`${winRate.toFixed(1)}%`} iconType="gauge" gaugeData={{ wins: tradeData.filter(t => parseFloat(t.NetPnL || '0') > 0).length, losses: tradeData.filter(t => parseFloat(t.NetPnL || '0') < 0).length, breakeven: tradeData.filter(t => parseFloat(t.NetPnL || '0') === 0).length }} color={winRate >= 50 ? 'green' : 'red'} className="h-full"/>;
       case 'avg-win-loss': return <MetricCard title="Avg win/loss trade" value={avgWinLossData.ratio} iconType="bar" barData={avgWinLossData} color="neutral" selectedCurrency={selectedCurrency} className="h-full"/>;
       case 'max-drawdown':
         let formattedDrawdownDate = '';
         if (maxDrawdownData.date) {
           try {
             let parsedDate = parse(maxDrawdownData.date, 'yyyy-MM-dd', new Date());
             if (!isValid(parsedDate)) parsedDate = parse(maxDrawdownData.date, 'MM/dd/yy', new Date());
             if (!isValid(parsedDate)) parsedDate = parse(maxDrawdownData.date, 'MM/dd/yyyy', new Date());

             if (isValid(parsedDate)) {
               formattedDrawdownDate = format(parsedDate, 'MMM dd, yyyy');
             } else {
                console.warn(`Max Drawdown: Could not parse date '${maxDrawdownData.date}'. Stored as is: ${maxDrawdownData.date}`);
                formattedDrawdownDate = maxDrawdownData.date;
             }
           } catch (e) {
             console.error("Error parsing max drawdown date:", maxDrawdownData.date, e);
             formattedDrawdownDate = maxDrawdownData.date;
           }
         }
         return <MetricCard title="Max Drawdown" value={<span className="text-red-600 dark:text-red-500">{convertCurrency(maxDrawdownData.value)}</span>} metric={formattedDrawdownDate} color="red" className="h-full"/>;
       case 'cumulative-pnl': return <CumulativePnLChart selectedCurrency={selectedCurrency} data={tradeData} commissionData={commissionData} showFeesInPnl={showFeesInPnl}/>;
       case 'bady-score': return <BadyScoreChart data={tradeData} overallScore={badyScore} />;
       case 'trading-calendar': return <TradingCalendar selectedCurrency={selectedCurrency} tradeData={tradeData} commissionData={commissionData} onUploadCommissionsClick={triggerCommissionFileInput} showFeesInPnl={showFeesInPnl} onShowFeesToggle={setShowFeesInPnl}/>;
       case 'progress-tracker': return <ProgressTrackerHeatmap data={tradeData} />;
       case 'recent-trades': return <RecentTradesTable selectedCurrency={selectedCurrency} data={tradeData as RecentTradesCsvTradeData[]}/>;
       default: return <Card className="h-full flex items-center justify-center"><CardContent>Unknown Widget: {key}</CardContent></Card>;
     }
   }, [selectedCurrency, convertCurrency, tradeData, commissionData, isEditingLayout, triggerCommissionFileInput, showFeesInPnl, setShowFeesInPnl]);


  if (!isClient || tradeDataLoading) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
             <BadyTradesLogo className="h-12 w-auto animate-pulse" />
        </div>
    );
  }

   const currentBreakpointLayout = layouts?.lg || initialLayouts.lg || [];
   const rglLayout = currentBreakpointLayout.map(l => ({
     ...l,
     isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
   }));


  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Total trades loaded: {tradeData.length}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hover-effect h-9 w-auto px-3">
                      <span className="mr-2 flex items-center justify-center w-5">
                        {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}
                      </span>
                      {selectedCurrency.code}
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                {currencies.map((currency) => (
                  <DropdownMenuItem key={currency.code} onClick={() => setSelectedCurrency(currency)}>
                       <span className="w-5 mr-2 flex items-center justify-center">
                         {typeof currency.symbol === 'string' ? currency.symbol : currency.symbol}
                       </span>
                      {currency.name} ({currency.code})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Select>
                <SelectTrigger className="w-[120px] h-9 text-sm hover-effect">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Filters" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="filter1">Filter 1</SelectItem>
                    <SelectItem value="filter2">Filter 2</SelectItem>
                </SelectContent>
            </Select>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"} size="sm"
                    className={cn("w-[240px] justify-start text-left font-normal h-9 text-sm hover-effect", !dateRange && "text-muted-foreground")}
                >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Date range</span>)}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus mode="range" defaultMonth={dateRange?.from}
                    selected={dateRange} onSelect={setDateRange} numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="hover-effect h-9" onClick={triggerTradeFileInput} disabled={tradeDataLoading}>
                <Upload className="mr-2 h-4 w-4" /> {tradeDataLoading ? 'Processing...' : 'Upload Trades CSV'}
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleTradeFileUpload}
                id="trade-csv-upload"
            />
            <Input
                type="file"
                ref={commissionFileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleCommissionFileUpload}
                id="commission-csv-upload"
            />
            <Button size="sm" className="hover-effect bg-accent text-accent-foreground hover:bg-accent/90 h-9">
                <Sparkles className="mr-2 h-4 w-4" /> Ask Bady AI
            </Button>
            <Button variant="outline" onClick={toggleEditLayout} size="sm" className="h-9 hover-effect">
                <Edit className="mr-2 h-4 w-4" />
                {isEditingLayout ? 'Save Layout' : 'Edit Layout'}
            </Button>
        </div>
      </div>

       <ResponsiveGridLayout
         className={cn("layout", isEditingLayout ? "editing" : "")}
         layouts={layouts ?? { lg: [] }} // Ensure layouts is not null
         breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
         cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
         rowHeight={30}
         onLayoutChange={handleLayoutChange}
         draggableHandle=".drag-handle"
         margin={[16, 16]}
         containerPadding={[0, 0]}
         isDraggable={isEditingLayout}
         isResizable={isEditingLayout}
         key={isEditingLayout ? 'editing' : 'static'}
         measureBeforeMount={false}
      >
        {rglLayout.map(({ i }) => (
             <div key={i} className={cn(
                 "bg-card rounded-lg border shadow-sm overflow-hidden transition-all duration-200",
                 isEditingLayout ? "border-primary/50 border-dashed" : ""
             )}>
                 {isEditingLayout && (
                     <div className="drag-handle absolute top-1 right-1 bg-background/50 backdrop-blur-sm rounded p-0.5 z-10 cursor-grab hover:bg-background/80 active:cursor-grabbing">
                         <GripVertical className="h-4 w-4 text-muted-foreground" />
                     </div>
                 )}
                 <div className={cn("h-full w-full")}>
                     {renderWidget(i)}
                 </div>
             </div>
        ))}
      </ResponsiveGridLayout>


      {isEditingLayout && (
        <p className="text-xs text-muted-foreground italic text-center mt-4">
          Drag handles (<GripVertical className="inline h-3 w-3" />) to move, drag corners to resize. Click 'Save Layout' when done.
        </p>
      )}
    </div>
  );
}

