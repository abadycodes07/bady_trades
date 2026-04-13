
// src/app/(app)/dashboard/page.tsx
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Edit, GripVertical, Info, Filter, CalendarDays, Bell, Sparkles, Upload, ChevronDown, Plus, Check, AlertCircle, X, Settings } from 'lucide-react';
import { TradingCalendar } from '@/components/dashboard/TradingCalendar';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { CumulativePnLChart, type CumulativeDataPoint } from '@/components/dashboard/CumulativePnLChart';
import { BadyScoreChart } from '@/components/dashboard/BadyScoreChart';
import { ProgressTrackerHeatmap } from '@/components/dashboard/ProgressTrackerHeatmap';
import { NetDailyPnLChart } from '@/components/dashboard/NetDailyPnLChart';
import { AccountBalanceChart } from '@/components/dashboard/AccountBalanceChart';
import { DrawdownChart } from '@/components/dashboard/DrawdownChart';
import { RecentTradesTable, type CsvTradeData as RecentTradesCsvTradeData } from '@/components/dashboard/RecentTradesTable';
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { BadyTradesLogo } from '@/components/icons/badytrades-logo';
import { SaudiRiyalSymbol } from '@/components/icons/SaudiRiyalSymbol';
import Papa from 'papaparse';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTradeData } from '@/contexts/TradeDataContext';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ResponsiveGridLayout = WidthProvider(Responsive as any) as any;

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
  Date?: string;
  NetPnL?: string;
  GrossPnl?: string;
  NetCash?: string;
  TotalSECFee?: string;
  TotalFee1?: string;
  TotalFee2?: string;
  TotalFee3?: string;
  TotalFee4?: string;
  TotalFee5?: string;
  id?: string | number;
  
  // Advanced Analytics Fields
  ROI?: string;
  RMultiple?: string;
  Strategy?: string;
  Volume?: string;
  Ticks?: string;
  Pips?: string;
  Commissions?: string;
  Fees?: string;
  OpenTime?: string;
  CloseTime?: string;
  Instrument?: string;
  Tags?: string[];
  Mistakes?: string[];
  Setups?: string[];
  BadyScore?: number;
  ticket?: string | number;
  exec_time?: string;
}

export interface CsvCommissionData {
  DateAsOf?: string;
  Date?: string;
  TotalCommission?: string;
  Commission?: string;
  id?: string;
}

export interface BalanceOperation {
  id: string;
  date: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'credit';
  comment?: string;
  isInitialCapital?: boolean;
}

const initialLayouts = {
  lg: [
    { i: 'balance-card',   x: 0, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'net-pnl',        x: 2, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'profit-factor',  x: 4, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'trade-win',      x: 6, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'avg-win-loss',   x: 8, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'max-drawdown',   x: 10, y: 0, w: 2, h: 3, isResizable: true, isDraggable: true, static: false },
    { i: 'cumulative-pnl', x: 0, y: 3, w: 6, h: 9, isResizable: true, isDraggable: true, static: false },
    { i: 'bady-score',     x: 6, y: 3, w: 6, h: 9, isResizable: true, isDraggable: true, static: false },
    { i: 'trading-calendar', x: 0, y: 12, w: 12, h: 20, isResizable: true, isDraggable: true, static: false },
    { i: 'daily-pnl-chart', x: 0, y: 32, w: 4, h: 8, isResizable: true, isDraggable: true, static: false },
    { i: 'balance-chart', x: 4, y: 32, w: 4, h: 8, isResizable: true, isDraggable: true, static: false },
    { i: 'drawdown-chart', x: 8, y: 32, w: 4, h: 8, isResizable: true, isDraggable: true, static: false },
    { i: 'progress-tracker', x: 0, y: 40, w: 4, h: 8,  isResizable: true, isDraggable: true, static: false },
    { i: 'recent-trades',    x: 4, y: 40, w: 8, h: 8,  isResizable: true, isDraggable: true, static: false },
  ],
};

const WIDGET_KEYS = [
    'balance-card', 'net-pnl', 'profit-factor', 'trade-win', 'avg-win-loss', 'max-drawdown',
    'cumulative-pnl', 'bady-score', 'trading-calendar', 'daily-pnl-chart', 
    'balance-chart', 'drawdown-chart', 'progress-tracker', 'recent-trades'
];

interface Currency {
  code: string;
  name: string;
  symbol: string | React.ReactNode;
  rate: number;
}

const sarSymbol = <SaudiRiyalSymbol className="h-3 w-3 inline-block" style={{ fill: 'currentColor' }} />;

const currencies: Currency[] = [
    { code: 'USD', name: 'US Dollar',          symbol: '$',    rate: 1 },
    { code: 'EUR', name: 'Euro',               symbol: '€',    rate: 0.93 },
    { code: 'GBP', name: 'British Pound',      symbol: '£',    rate: 0.79 },
    { code: 'SAR', name: 'Saudi Riyal',        symbol: sarSymbol, rate: 3.75 },
    { code: 'JPY', name: 'Japanese Yen',       symbol: '¥',    rate: 158.47 },
    { code: 'CAD', name: 'Canadian Dollar',    symbol: 'CA$',  rate: 1.37 },
    { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$',   rate: 1.50 },
    { code: 'CHF', name: 'Swiss Franc',        symbol: 'Fr',   rate: 0.88 },
    { code: 'CNY', name: 'Chinese Yuan',       symbol: 'CN¥',  rate: 7.25 },
    { code: 'SEK', name: 'Swedish Krona',      symbol: 'kr',   rate: 10.78 },
    { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$',  rate: 1.63 },
    { code: 'MXN', name: 'Mexican Peso',       symbol: 'Mex$', rate: 17.64 },
    { code: 'SGD', name: 'Singapore Dollar',   symbol: 'S$',   rate: 1.35 },
    { code: 'HKD', name: 'Hong Kong Dollar',   symbol: 'HK$',  rate: 7.81 },
    { code: 'NOK', name: 'Norwegian Krone',    symbol: 'kr',   rate: 10.67 },
    { code: 'KRW', name: 'South Korean Won',   symbol: '₩',    rate: 1345.50 },
    { code: 'TRY', name: 'Turkish Lira',       symbol: '₺',    rate: 32.30 },
    { code: 'RUB', name: 'Russian Ruble',      symbol: '₽',    rate: 89.45 },
    { code: 'INR', name: 'Indian Rupee',       symbol: '₹',    rate: 83.44 },
    { code: 'BRL', name: 'Brazilian Real',     symbol: 'R$',   rate: 5.04 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R',    rate: 18.22 },
];


export default function DashboardPage() {
  const { isArabic, t } = useLanguage();
  const router = useRouter();
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [layouts, setLayouts] = useState<ResponsiveLayout | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    tradeData,
    selectedAccountId,
    accounts,
    setSelectedAccountId,
    createAccount,
    updateAccountInitialBalance,
    addTrades,
    addTradesToAccount,
    isLoading: tradeDataLoading,
    setIsLoading: setTradeDataLoading,
    isDemoMode,
  } = useTradeData();
  const [commissionData, setCommissionData] = useState<CsvCommissionData[]>([]);
  const [balanceOperations, setBalanceOperations] = useState<BalanceOperation[]>([]);
  const commissionFileInputRef = useRef<HTMLInputElement>(null);
  const [showFeesInPnl, setShowFeesInPnl] = useState(false);

  // CSV Upload → Account Dialog
  const [pendingCsvTrades, setPendingCsvTrades] = useState<CsvTradeData[] | null>(null);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [selectedTargetAccountId, setSelectedTargetAccountId] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    const savedLayouts = localStorage.getItem('dashboardLayouts');
    try {
      const parsedLayouts = savedLayouts ? JSON.parse(savedLayouts) : initialLayouts;
       Object.keys(initialLayouts).forEach(bp => {
            const currentBpKey = bp as keyof typeof initialLayouts;
            const loadedBpLayout = parsedLayouts[bp as keyof typeof parsedLayouts] || [];
            const initialBpLayout = initialLayouts[currentBpKey];

            if (!initialBpLayout) {
                if (loadedBpLayout.length > 0) {
                     parsedLayouts[currentBpKey] = loadedBpLayout.map((l: Layout) => ({
                         ...l, isDraggable: isEditingLayout, isResizable: isEditingLayout, static: !isEditingLayout,
                     }));
                } else {
                    parsedLayouts[currentBpKey] = [];
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
           <span className="inline-flex items-center" dir="ltr">
               {convertedAmount < 0 && '-'}
               {typeof selectedCurrency.symbol === 'string' ? selectedCurrency.symbol : selectedCurrency.symbol}
               {formattedAmount}
           </span>
       );
   }, [selectedCurrency]);

   // Parse CSV trades from file
   const parseCsvFile = (file: File): Promise<CsvTradeData[]> => {
     return new Promise((resolve, reject) => {
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
             reject(new Error("Unrecognized CSV format. Please use Standard format (requires 'T/D', 'Net Proceeds', 'Gross Proceeds') or MetaTrader format."));
             return;
           }

           if (results.data.length > 0) {
             const normalizedData = results.data.map((row, index) => {
                const getRowVal = (key: string) => row[Object.keys(row).find(k => k.trim().toLowerCase() === key) || ''] || '';
                const ticket = getRowVal('ticket') || getRowVal('Ticket');
                const newRow: Partial<CsvTradeData> = { 
                  id: ticket || `csv-trade-${Date.now()}-${index}`,
                  ticket: ticket
                };

               if (isMT4Format) {
                 const getRowVal = (key: string) => row[Object.keys(row).find(k => k.trim().toLowerCase() === key) || ''] || '';
                 const rawDate = getRowVal('closing_time_utc') || getRowVal('time');
                 newRow['T/D'] = rawDate ? rawDate.split(' ')[0].replace('T', ' ') : '';
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
               }

               const rawTradeDate = newRow['T/D'];
               if (rawTradeDate && rawTradeDate.trim() !== '') {
                 try {
                   let parsedDateAttempt;
                   const dateFormatsToTry = ['MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'yyyy.MM.dd', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'];
                   for (const fmt of dateFormatsToTry) {
                     parsedDateAttempt = parse(rawTradeDate.split(' ')[0], fmt, new Date());
                     if (isValid(parsedDateAttempt)) break;
                   }
                   if (parsedDateAttempt && isValid(parsedDateAttempt)) {
                     newRow.Date = format(parsedDateAttempt as Date, 'yyyy-MM-dd');
                   } else {
                     newRow.Date = rawTradeDate;
                   }
                 } catch (e) {
                   newRow.Date = rawTradeDate;
                 }
               } else {
                 newRow.Date = '';
               }

               newRow.NetPnL = newRow['Net Proceeds'] || '0';
               newRow.GrossPnl = newRow['Gross Proceeds'] || '0';
               return newRow as CsvTradeData;
             });
             resolve(normalizedData);
           } else {
             resolve([]);
           }
         },
         error: (error) => reject(error),
       });
     });
   };

   const handleTradeFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
       const file = event.target.files?.[0];
       if (!file) return;

       try {
           const parsedTrades = await parseCsvFile(file);
           if (parsedTrades.length > 0) {
               // Always show account dialog to let user choose/create account
               setPendingCsvTrades(parsedTrades);
               const realAccounts = accounts.filter(a => a.id !== 'demo-account');
               setSelectedTargetAccountId(realAccounts.length > 0 ? realAccounts[0].id : '__new__');
               setNewAccountName('');
               setIsAccountDialogOpen(true);
           }
       } catch (err: any) {
           toast({ title: 'CSV Format Error', description: err.message, variant: 'destructive', duration: 7000 });
       }

       if (fileInputRef.current) fileInputRef.current.value = '';
   };

   const handleAccountDialogConfirm = async () => {
       if (!pendingCsvTrades) return;
       setIsAccountDialogOpen(false);

       let targetAccountId = selectedTargetAccountId;

       if (selectedTargetAccountId === '__new__') {
           if (!newAccountName.trim()) {
               toast({ title: 'Account Name Required', description: 'Please enter a name for the new account.', variant: 'destructive' });
               setIsAccountDialogOpen(true);
               return;
           }
           const newAcc = await createAccount(newAccountName.trim());
           if (!newAcc) return;
           targetAccountId = newAcc.id;
       }

       await addTradesToAccount(pendingCsvTrades, targetAccountId);
       setSelectedAccountId(targetAccountId);
       setPendingCsvTrades(null);
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
                         toast({ title: 'Commission CSV Error', description: "CSV must contain a 'DateAsOf' column.", variant: 'destructive' });
                         return;
                     }
                     if (!hasCommissionColumn) {
                         toast({ title: 'Commission CSV Error', description: "CSV must contain a 'TotalCommission' column.", variant: 'destructive' });
                         return;
                     }

                     if (results.data.length > 0) {
                         const normalizedCommissions = results.data.map((row, index) => {
                             const newRow: Partial<CsvCommissionData> = { id: `csv-comm-${Date.now()}-${index}` };
                             const headerMap: { [csvHeader: string]: keyof CsvCommissionData } = {
                                 'dateasof': 'DateAsOf',
                                 'totalcommission': 'TotalCommission',
                             };

                             for (const rawCsvHeader in row) {
                                 const csvHeader = rawCsvHeader.trim().toLowerCase();
                                 const targetKey = headerMap[csvHeader];
                                 if (targetKey) newRow[targetKey] = row[rawCsvHeader];
                             }
                             newRow.Commission = newRow.TotalCommission;

                             const rawDate = newRow.DateAsOf;
                             if (rawDate && rawDate.trim() !== '') {
                                 try {
                                     let parsedDateAttempt;
                                     const dateFormatsToTry = [
                                         'MMddyy', 'yyyyMMdd', 'MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'M/d/yy', 'M/dd/yyyy', 'MM/d/yyyy'
                                     ];

                                     for (const fmt of dateFormatsToTry) {
                                         parsedDateAttempt = parse(rawDate, fmt, new Date());
                                         if (isValid(parsedDateAttempt)) break;
                                     }

                                     if (parsedDateAttempt && isValid(parsedDateAttempt)) {
                                         newRow.Date = format(parsedDateAttempt as Date, 'yyyy-MM-dd');
                                     } else {
                                         newRow.Date = rawDate;
                                     }
                                 } catch (e) {
                                     newRow.Date = rawDate;
                                 }
                             } else {
                                 newRow.Date = '';
                             }
                             return newRow as CsvCommissionData;
                         }).filter(comm => comm.Date && comm.Commission);

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
             if (commissionFileInputRef.current) commissionFileInputRef.current.value = '';
         }
     };

    const triggerCommissionFileInput = () => {
         commissionFileInputRef.current?.click();
    };

    const handleSetInitialBalance = useCallback(async (date: Date, amount: number) => {
        if (!selectedAccountId) {
            toast({ title: 'No Account Selected', description: 'Please select an account to set an initial balance.', variant: 'destructive' });
            return;
        }
        await updateAccountInitialBalance(selectedAccountId, amount);
    }, [selectedAccountId, updateAccountInitialBalance, toast]);

    // Get current account's initial balance
    const currentAccount = accounts.find(a => a.id === selectedAccountId);
    const initialBalance = currentAccount?.initial_balance || undefined;

    const handleDashboardAiCoach = async () => {
        if (isAnalyzing || tradeData.length === 0) return;
        setIsAnalyzing(true);
        toast({ title: t('Bady AI is thinking...'), description: t('Analyzing your recent performance across all accounts.') });
        
        try {
            const response = await fetch('/api/ai-coach', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date: format(new Date(), 'yyyy-MM-dd'),
                    trades: tradeData.slice(0, 20).map(t => ({
                        symbol: t.Symbol,
                        side: t.Side,
                        netPnl: t.NetPnL,
                        rMultiple: t.RMultiple,
                        strategy: t.Strategy,
                    })),
                }),
            });
            const data = await response.json();
            if (data.assessment) {
               toast({ 
                   title: t('Bady AI Analysis'), 
                   description: data.assessment, 
                   duration: 10000 
               });
            }
        } catch (error) {
            console.error('Dashboard AI Coach failed:', error);
            toast({ title: t('AI Analysis Failed'), description: t('Could not connect to the Bady AI engine.'), variant: 'destructive' });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const renderWidget = useCallback((key: string) => {
      let netPnlCardValue = 0;
      const totalUploadedCommissions = commissionData.reduce((sum, comm) => sum + parseFloat(comm.Commission || '0'), 0);
      const totalNetCashValues = tradeData.reduce((sum, trade) => sum + parseFloat(trade.NetCash || '0'), 0);
      const totalNetPnlFromTrades = tradeData.reduce((sum, trade) => sum + parseFloat(trade.NetPnL || '0'), 0);
      const totalGrossPnlFromTrades = tradeData.reduce((sum, trade) => sum + parseFloat(trade.GrossPnl || '0'), 0);

      if (showFeesInPnl) {
          // If explicitly toggled, include extra manual commissions/cash
          netPnlCardValue = totalNetPnlFromTrades - totalUploadedCommissions - totalNetCashValues;
      } else {
          // Default to Total Net Pnl which usually has all native fees included
          netPnlCardValue = totalNetPnlFromTrades;
      }

      const actualBalance = (initialBalance || 0) + netPnlCardValue;

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
                 let dateB = parse(b.Date, 'yyyy-MM-dd', new Date());
                 if (!isValid(dateB)) dateB = parse(b.Date, 'MM/dd/yy', new Date());
                 if (!isValid(dateA) || !isValid(dateB)) return 0;
                 return dateA.getTime() - dateB.getTime();
              } catch { return 0; }
          });

          const dailyPnlMap: Record<string, number> = {};
          sortedData.forEach(trade => {
              const dateKey = trade.Date!;
              const pnl = includeAllFees ? parseFloat(trade.NetPnL || '0') : parseFloat(trade.GrossPnl || '0');
              dailyPnlMap[dateKey] = (dailyPnlMap[dateKey] || 0) + pnl;
          });

          const uniqueSortedDates = Object.keys(dailyPnlMap).sort();
          uniqueSortedDates.forEach(dateKey => {
              cumulativePnl += dailyPnlMap[dateKey];
              if (cumulativePnl > peak) peak = cumulativePnl;
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
      const dailyCommissionsMap: Record<string, number> = {};
      commissionData.forEach(comm => {
         if(comm.Date && comm.Commission) dailyCommissionsMap[comm.Date] = (dailyCommissionsMap[comm.Date] || 0) + parseFloat(comm.Commission);
      });
      const dailyNetCashMapAgg: Record<string, number> = {};
      tradeData.forEach(trade => {
         if (trade.Date && trade.NetCash) dailyNetCashMapAgg[trade.Date] = (dailyNetCashMapAgg[trade.Date] || 0) + parseFloat(trade.NetCash);
      });
      const maxDrawdownData = calculateMaxDrawdown(tradeData, showFeesInPnl, dailyCommissionsMap, dailyNetCashMapAgg);

      const maxDrawdownScore = Math.max(0, 1 - (Math.abs(maxDrawdownData.value) / 5000));
      const badyScoreComponents = [
         winRate / 100,
         Math.min(1, (isFinite(Number(profitFactor)) ? Number(profitFactor) : 0) / 3),
         Math.min(1, (isFinite(Number(avgWinLossData.ratio)) ? Number(avgWinLossData.ratio) : 0) / 3),
         maxDrawdownScore
      ].filter(score => isFinite(score) && !isNaN(score));
      const badyScore = (badyScoreComponents.reduce((a, b) => a + b, 0) / badyScoreComponents.length) * 100;

      switch (key) {
        case 'balance-card': return <MetricCard title={t("Current Balance")} value={convertCurrency(actualBalance)} color={actualBalance >= (initialBalance || 0) ? 'green' : 'red'} iconType="info" className="h-full border-border/20 shadow-xl"/>;
        case 'net-pnl': return <MetricCard title={t("Total Net P&L")} value={convertCurrency(netPnlCardValue)} color={netPnlCardValue >= 0 ? 'green' : 'red'} iconType="info" className="h-full"/>;
        case 'profit-factor': return <MetricCard title={t("Profit Factor")} value={isFinite(Number(profitFactor)) ? Number(profitFactor).toFixed(2) : '0.00'} iconType="progressCircle" progressValue={Math.min(100, (isFinite(Number(profitFactor)) ? Number(profitFactor) : 0) / 3 * 100)} color={Number(profitFactor) >= 1 ? 'green' : 'red'} className="h-full"/>;
        case 'trade-win': return <MetricCard title={t("Trade Win %")} value={`${winRate.toFixed(1)}%`} iconType="gauge" gaugeData={{ wins: tradeData.filter(t => parseFloat(t.NetPnL || '0') > 0).length, losses: tradeData.filter(t => parseFloat(t.NetPnL || '0') < 0).length, breakeven: tradeData.filter(t => parseFloat(t.NetPnL || '0') === 0).length }} color={winRate >= 50 ? 'green' : 'red'} className="h-full"/>;
        case 'avg-win-loss': return <MetricCard title={t("Avg win/loss trade")} value={avgWinLossData.ratio} iconType="bar" barData={avgWinLossData} color={Number(avgWinLossData.ratio) >= 1 ? 'green' : 'red'} selectedCurrency={selectedCurrency} className="h-full"/>;
        case 'max-drawdown':
          let formattedDrawdownDate = '';
          if (maxDrawdownData.date) {
            try {
              let parsedDate = parse(maxDrawdownData.date, 'yyyy-MM-dd', new Date());
              if (!isValid(parsedDate)) parsedDate = parse(maxDrawdownData.date, 'MM/dd/yy', new Date());
              if (isValid(parsedDate)) formattedDrawdownDate = format(parsedDate, 'MMM dd, yyyy');
              else formattedDrawdownDate = maxDrawdownData.date;
            } catch { formattedDrawdownDate = maxDrawdownData.date; }
          }
          return <MetricCard title={t("Max Drawdown")} value={convertCurrency(maxDrawdownData.value)} metric={formattedDrawdownDate} color="red" className="h-full"/>;
        case 'cumulative-pnl': return <CumulativePnLChart selectedCurrency={selectedCurrency} data={tradeData} commissionData={commissionData} showFeesInPnl={showFeesInPnl}/>;
        case 'bady-score': return <BadyScoreChart data={tradeData} overallScore={badyScore} />;
        case 'daily-pnl-chart': return <NetDailyPnLChart data={tradeData} selectedCurrency={selectedCurrency} />;
        case 'balance-chart': return <AccountBalanceChart data={tradeData} initialBalance={initialBalance || 0} selectedCurrency={selectedCurrency} />;
        case 'drawdown-chart': return <DrawdownChart data={tradeData} initialBalance={initialBalance || 0} />;
        case 'trading-calendar': return <TradingCalendar
            selectedCurrency={selectedCurrency}
            tradeData={tradeData}
            commissionData={commissionData}
            balanceOperations={balanceOperations}
            onUploadCommissionsClick={triggerCommissionFileInput}
            showFeesInPnl={showFeesInPnl}
            onShowFeesToggle={setShowFeesInPnl}
            onSetInitialBalance={handleSetInitialBalance}
            initialBalance={initialBalance}
        />;
        case 'progress-tracker': return <ProgressTrackerHeatmap data={tradeData} />;
        case 'recent-trades': return <RecentTradesTable selectedCurrency={selectedCurrency} data={tradeData as RecentTradesCsvTradeData[]}/>;
        default: return <Card className="h-full flex items-center justify-center p-4 text-center text-muted-foreground bg-white/5 border-dashed"><CardContent>Widget: {key}</CardContent></Card>;
      }
    }, [selectedCurrency, convertCurrency, tradeData, commissionData, isEditingLayout, triggerCommissionFileInput, showFeesInPnl, setShowFeesInPnl, handleSetInitialBalance, t, initialBalance, balanceOperations]);

    const resetLayout = useCallback(() => {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('dashboardLayouts');
            setLayouts(initialLayouts);
            toast({
                title: t('Layout Reset'),
                description: t('Dashboard layout has been restored to default.'),
            });
        }
    }, [toast, t]);


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

    const realAccounts = accounts.filter(a => a.id !== 'demo-account');

  return (
    <div className="flex flex-col gap-4 md:gap-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {/* Account Switcher */}
          <DropdownMenu>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" className="hover-effect h-9 gap-1.5 max-w-[200px]" asChild>
                  <DropdownMenuTrigger>
                    {isDemoMode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    )}
                    {!isDemoMode && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                    )}
                    <span className="truncate text-sm">
                      {currentAccount?.name ? t(currentAccount.name) : t('Select Account')}
                    </span>
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </DropdownMenuTrigger>
                </Button>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 hover-effect text-muted-foreground hover:text-foreground"
                    onClick={() => router.push('/settings')}
                    title={t('Account Settings')}
                >
                    <Settings className="h-4 w-4" />
                </Button>
              </div>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t('Switch Account')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {accounts.map((account) => (
                <DropdownMenuItem
                  key={account.id}
                  onClick={() => setSelectedAccountId(account.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    account.id === 'demo-account' ? "bg-amber-500" : "bg-green-500"
                  )} />
                  <span className="truncate flex-1">{t(account.name)}</span>
                  {account.id === 'demo-account' && (
                    <span className="text-[9px] px-1 py-0.5 bg-amber-500/20 text-amber-500 rounded font-bold">DEMO</span>
                  )}
                  {selectedAccountId === account.id && <Check className="ml-auto h-3.5 w-3.5 text-primary" />}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSelectedTargetAccountId('__new__');
                  setNewAccountName('');
                  setPendingCsvTrades(null);
                  setIsAccountDialogOpen(true);
                }}
                className="cursor-pointer text-primary"
              >
                <Plus className="mr-2 h-4 w-4" />
                {t('Add Account')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <span className="text-sm text-muted-foreground">{t('Total trades loaded')}: {tradeData.length}</span>
          {isDemoMode && (
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500 bg-amber-500/10">
              {t('Demo Data')}
            </Badge>
          )}
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
                    <SelectValue placeholder={t("Filters")} />
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
                    {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>{t("Date range")}</span>)}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    initialFocus mode="range" defaultMonth={dateRange?.from}
                    selected={dateRange} onSelect={setDateRange} numberOfMonths={2}
                />
                </PopoverContent>
            </Popover>
            <Input
                type="file"
                ref={commissionFileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleCommissionFileUpload}
                id="commission-csv-upload"
            />
            <Button 
                size="sm" 
                className="hover-effect bg-[var(--win-green)]/10 text-[var(--win-green)] hover:bg-[var(--win-green)]/20 h-9 font-black uppercase tracking-widest text-[10px] border border-[var(--win-green)]/20"
                onClick={handleDashboardAiCoach}
                disabled={isAnalyzing}
            >
                <Sparkles className="mr-2 h-4 w-4" /> {isAnalyzing ? t("Thinking...") : t("Ask Bady AI")}
            </Button>
            <Button variant="outline" onClick={toggleEditLayout} size="sm" className="h-9 hover-effect">
                <Edit className="mr-2 h-4 w-4" />
                {isEditingLayout ? t('Save Layout') : t('Edit Layout')}
            </Button>
            {isEditingLayout && (
                <Button variant="ghost" onClick={resetLayout} size="sm" className="h-9 hover-effect text-red-500 hover:text-red-400 hover:bg-red-500/10">
                    <X className="mr-2 h-4 w-4" /> {t('Reset Layout')}
                </Button>
            )}
        </div>
      </div>

       <ResponsiveGridLayout
          className={cn("layout", isEditingLayout ? "editing" : "")}
          layouts={layouts ?? { lg: [] }}
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
                 {renderWidget(i)}
             </div>
        ))}
       </ResponsiveGridLayout>

      {/* CSV → Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{pendingCsvTrades ? t('Import Trades') : t('Add Account')}</DialogTitle>
            <DialogDescription>
              {pendingCsvTrades
                ? `${pendingCsvTrades.length} ${t('trades ready to import. Select or create an account.')}`
                : t('Create a new trading account to organize your trades.')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {realAccounts.length > 0 && pendingCsvTrades && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('Existing Accounts')}</Label>
                <div className="space-y-1.5">
                  {realAccounts.map(acc => (
                    <button
                      key={acc.id}
                      onClick={() => setSelectedTargetAccountId(acc.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all",
                        selectedTargetAccountId === acc.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      )}
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="flex-1 text-left font-medium">{t(acc.name)}</span>
                      {selectedTargetAccountId === acc.id && <Check className="h-4 w-4" />}
                    </button>
                  ))}
                  <button
                    onClick={() => setSelectedTargetAccountId('__new__')}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm transition-all",
                      selectedTargetAccountId === '__new__'
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-dashed border-border hover:border-primary/40"
                    )}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t('Create New Account')}</span>
                    {selectedTargetAccountId === '__new__' && <Check className="h-4 w-4 ml-auto" />}
                  </button>
                </div>
              </div>
            )}

            {(selectedTargetAccountId === '__new__' || realAccounts.length === 0) && (
              <div className="space-y-2">
                <Label htmlFor="account-name" className="text-sm font-medium">
                  {t('Account Name')}
                </Label>
                <Input
                  id="account-name"
                  placeholder={t('e.g. My Gold Account, MetaTrader Live...')}
                  value={newAccountName}
                  onChange={e => setNewAccountName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAccountDialogConfirm()}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAccountDialogOpen(false); setPendingCsvTrades(null); }}>
              {t('Cancel')}
            </Button>
            <Button onClick={handleAccountDialogConfirm}>
              {pendingCsvTrades ? t('Import Trades') : t('Create Account')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
