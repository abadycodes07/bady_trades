
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTradeData } from '@/contexts/TradeDataContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, Plus, History, Cloud, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';
import Papa from 'papaparse';
import { format, parse, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { type CsvTradeData } from '@/app/(app)/dashboard/page';

export function AddTradeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'choose_method' | 'upload_file' | 'select_account'>('choose_method');
  const [method, setMethod] = useState<'csv' | 'html' | 'sync' | null>(null);
  const [pendingTrades, setPendingTrades] = useState<CsvTradeData[] | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [newAccountName, setNewAccountName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  const { accounts, createAccount, addTradesToAccount, setSelectedAccountId: globalSetSelectedAccount } = useTradeData();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleOpen = () => {
      setOpen(true);
      setStep('choose_method');
      setMethod(null);
      setPendingTrades(null);
    };
    window.addEventListener('open-add-trade-dialog', handleOpen);
    return () => window.removeEventListener('open-add-trade-dialog', handleOpen);
  }, []);

  const handleCsvParse = async (file: File) => {
    return new Promise<CsvTradeData[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            const normalized = results.data.map((row: any, index: number) => {
              // Map MT-specific headers to internal labels
              const getRowVal = (key: string) => row[Object.keys(row).find(k => k.trim().toLowerCase() === key) || ''] || '';
              const ticket = getRowVal('ticket') || getRowVal('Ticket');
              
              const newRow: any = { 
                ...row,
                id: ticket || `csv-trade-${Date.now()}-${index}`,
                ticket: ticket 
              };

              const rawDate = getRowVal('closing_time_utc') || getRowVal('time');
              if (rawDate) {
                 try {
                    let p;
                    const fmts = ['MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'yyyy.MM.dd'];
                    for (const f of fmts) {
                        p = parse(rawDate.split(' ')[0], f, new Date());
                        if (isValid(p)) break;
                    }
                    newRow.Date = isValid(p) ? format(p!, 'yyyy-MM-dd') : rawDate;
                    newRow.exec_time = rawDate;
                 } catch (e) { newRow.Date = rawDate; }
              }

              newRow.Qty = getRowVal('lots') || getRowVal('volume') || '0';
              newRow.Symbol = getRowVal('symbol') || '';
              newRow.Side = getRowVal('type') || '';
              newRow.Price = getRowVal('closing_price') || '0';
              
              const profit = parseFloat(getRowVal('profit') || '0');
              const comm = parseFloat(getRowVal('commission') || '0');
              const swap = parseFloat(getRowVal('swap') || '0');
              
              newRow.GrossPnl = profit.toString();
              newRow.NetPnL = (profit + comm + swap).toString();
              return newRow;
            });
            resolve(normalized as CsvTradeData[]);
          } else {
            resolve([]);
          }
        },
        error: (err) => reject(err)
      });
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const trades = await handleCsvParse(file);
      if (trades.length > 0) {
        setPendingTrades(trades);
        const realAccounts = accounts.filter(a => a.id !== 'demo-account');
        setSelectedAccountId(realAccounts.length > 0 ? realAccounts[0].id : '__new__');
        setStep('select_account');
      } else {
        toast({ title: 'No trades found', description: 'The file appears to be empty or in an unsupported format.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirm = async () => {
    let targetId = selectedAccountId;
    let finalName = newAccountName.trim();
    
    if (selectedAccountId === '__new__') {
      if (!finalName) {
        toast({ title: 'Name Required', description: 'Please enter a name for the new account.', variant: 'destructive' });
        return;
      }
      const newAcc = await createAccount(finalName);
      if (!newAcc) return;
      targetId = newAcc.id;
    } else {
        finalName = accounts.find(a => a.id === targetId)?.name || 'Account';
    }

    if (pendingTrades) {
      const result = await addTradesToAccount(pendingTrades, targetId);
      globalSetSelectedAccount(targetId);
      // Detailed messaging is now handled inside addTradesToAccount (Toast)
      // but we can add a summary here if needed.
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md bg-background/80 backdrop-blur-xl border-white/10 p-0 overflow-hidden rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-8 pt-10 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none" />
            <DialogTitle className="text-3xl font-black text-white uppercase tracking-tighter relative z-10">Add Trades</DialogTitle>
            <DialogDescription className="text-white/80 text-sm mt-2 relative z-10 font-medium">BadyTrades Import Center</DialogDescription>
        </div>

        <div className="p-8">
          {step === 'choose_method' && (
            <div className="grid gap-4">
              <button 
                onClick={() => { setMethod('csv'); setStep('upload_file'); }}
                className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-foreground uppercase text-xs tracking-[0.2em]">Upload CSV</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 opacity-80 uppercase font-bold tracking-tight">MetaTrader & Prop Firms</p>
                </div>
              </button>

              <button 
                onClick={() => { setMethod('html'); setStep('upload_file'); }}
                className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-blue-500/10 transition-all text-left group"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-black text-foreground uppercase text-xs tracking-[0.2em]">Upload HTML</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5 opacity-80 uppercase font-bold tracking-tight">Detailed Account History</p>
                </div>
              </button>

              <button 
                disabled
                className="flex items-center gap-5 p-5 rounded-2xl bg-white/5 border border-white/10 opacity-40 cursor-not-allowed text-left grayscale hover:bg-red-500/5 transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Cloud className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-black text-foreground uppercase text-xs tracking-[0.2em]">Auto Sync</p>
                    <span className="text-[8px] bg-indigo-600 text-white px-2 py-0.5 rounded-full font-black tracking-widest">SOON</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 opacity-80 uppercase font-bold tracking-tight">MT4/MT5 Direct Sync</p>
                </div>
              </button>
            </div>
          )}

          {step === 'upload_file' && (
            <div className="flex flex-col items-center py-10 gap-8">
                <div className="h-24 w-24 rounded-[2rem] bg-indigo-500/5 border-2 border-dashed border-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse transition-all">
                    <Upload className="h-12 w-12" />
                </div>
                <div className="text-center">
                    <p className="font-black text-foreground uppercase tracking-[0.3em] text-sm">Target {method?.toUpperCase()} File</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-3 font-black uppercase tracking-widest">Select your export from MT4/MT5</p>
                </div>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept={method === 'csv' ? '.csv' : '.htm,.html'} 
                    onChange={handleFileChange} 
                />
                <Button 
                    variant="default" 
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-12 rounded-xl font-black uppercase tracking-widest" 
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? 'Analyzing...' : 'Open File Browser'}
                </Button>
                <button onClick={() => setStep('choose_method')} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-[0.2em] font-black">Cancel & Go Back</button>
            </div>
          )}

          {step === 'select_account' && (
            <div className="space-y-8 py-4">
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Analysis Complete</p>
                        <p className="text-xs text-foreground/80 font-bold mt-0.5">{pendingTrades?.length} Records Located</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[1.5px]">Select Destination Account</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl h-12">
                                <SelectValue placeholder="Where should we add these?" />
                            </SelectTrigger>
                            <SelectContent className="bg-background/95 backdrop-blur-xl border-border rounded-xl">
                                {accounts.filter(a => a.id !== 'demo-account').map(acc => (
                                    <SelectItem key={acc.id} value={acc.id} className="focus:bg-indigo-600 focus:text-white rounded-lg">{acc.name}</SelectItem>
                                ))}
                                <SelectItem value="__new__" className="text-indigo-400 font-bold focus:bg-indigo-600 focus:text-white rounded-lg tracking-tight">+ Setup New Account</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAccountId === '__new__' && (
                        <div className="space-y-3 animate-in slide-in-from-top-4 duration-500">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground/60 tracking-[1.5px]">Account Name</Label>
                            <Input 
                                placeholder="e.g. MetaTrader Real (Exness)" 
                                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-indigo-500/50"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white h-14 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02]" onClick={handleConfirm}>
                    Import Now
                </Button>
                
                <button onClick={() => setStep('upload_file')} className="w-full text-center text-[10px] text-muted-foreground/40 hover:text-foreground transition-colors uppercase tracking-[0.3em] font-black">Restart Import</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
