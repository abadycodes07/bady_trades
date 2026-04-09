
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
            const normalized = results.data.map((row: any) => {
              const newRow: any = { ...row };
              // Simple normalization for now, matching DashboardPage logic
              const rawDate = row['T/D'] || row['Date'] || row['closing_time_utc'] || row['time'];
              if (rawDate) {
                 try {
                    let p;
                    const fmts = ['MM/dd/yy', 'yyyy-MM-dd', 'MM/dd/yyyy', 'yyyy.MM.dd'];
                    for (const f of fmts) {
                        p = parse(rawDate.split(' ')[0], f, new Date());
                        if (isValid(p)) break;
                    }
                    newRow.Date = isValid(p) ? format(p!, 'yyyy-MM-dd') : rawDate;
                 } catch (e) { newRow.Date = rawDate; }
              }
              newRow.NetPnL = row['Net Proceeds'] || row['NetPnL'] || row['profit'] || '0';
              newRow.GrossPnl = row['Gross Proceeds'] || row['GrossPnl'] || row['profit'] || '0';
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
    if (selectedAccountId === '__new__') {
      if (!newAccountName.trim()) {
        toast({ title: 'Name Required', description: 'Please enter a name for the new account.', variant: 'destructive' });
        return;
      }
      const newAcc = await createAccount(newAccountName.trim());
      if (!newAcc) return;
      targetId = newAcc.id;
    }

    if (pendingTrades) {
      await addTradesToAccount(pendingTrades, targetId);
      globalSetSelectedAccount(targetId);
      toast({ title: 'Success', description: `Added ${pendingTrades.length} trades to ${newAccountName || accounts.find(a => a.id === targetId)?.name}` });
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md bg-black border-white/10 p-0 overflow-hidden rounded-3xl">
        <div className="bg-indigo-600 p-6 pt-10 text-center relative">
            <DialogTitle className="text-2xl font-black text-white uppercase tracking-tighter">Add Trades</DialogTitle>
            <DialogDescription className="text-white/70 text-sm mt-1">Import your trading history to BadyTrades</DialogDescription>
        </div>

        <div className="p-6">
          {step === 'choose_method' && (
            <div className="grid gap-3">
              <button 
                onClick={() => { setMethod('csv'); setStep('upload_file'); }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-white uppercase text-xs tracking-widest">Upload CSV File</p>
                  <p className="text-xs text-white/40 mt-1">MetaTrader 4/5 or generic CSV formats</p>
                </div>
              </button>

              <button 
                onClick={() => { setMethod('html'); setStep('upload_file'); }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className="h-10 w-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-white uppercase text-xs tracking-widest">Upload HTML Report</p>
                  <p className="text-xs text-white/40 mt-1">Direct "Save as Detailed Report" from MT4/5</p>
                </div>
              </button>

              <button 
                disabled
                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 opacity-50 cursor-not-allowed text-left grayscale"
              >
                <div className="h-10 w-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Cloud className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white uppercase text-xs tracking-widest">Sync Prop Account</p>
                    <span className="text-[8px] bg-white/10 px-1.5 py-0.5 rounded-full text-white/60">COMING SOON</span>
                  </div>
                  <p className="text-xs text-white/40 mt-1">Direct connection to prop firm accounts</p>
                </div>
              </button>
            </div>
          )}

          {step === 'upload_file' && (
            <div className="flex flex-col items-center py-8 gap-6">
                <div className="h-20 w-20 rounded-3xl bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
                    <Upload className="h-10 w-10" />
                </div>
                <div className="text-center">
                    <p className="font-black text-white uppercase tracking-widest text-sm">Select {method?.toUpperCase()} File</p>
                    <p className="text-xs text-white/40 mt-2">Maximum file size: 10MB</p>
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
                    className="w-full bg-indigo-600 hover:bg-indigo-500" 
                    disabled={isUploading}
                    onClick={() => fileInputRef.current?.click()}
                >
                    {isUploading ? 'Processing...' : 'Browse Files'}
                </Button>
                <button onClick={() => setStep('choose_method')} className="text-xs text-white/40 hover:text-white transition-colors uppercase tracking-widest font-black">Back to methods</button>
            </div>
          )}

          {step === 'select_account' && (
            <div className="space-y-6 py-4">
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">{pendingTrades?.length} Trades detected successfully</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">Target Account</Label>
                        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                            <SelectTrigger className="bg-white/5 border-white/10 rounded-xl">
                                <SelectValue placeholder="Select an account" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10">
                                {accounts.filter(a => a.id !== 'demo-account').map(acc => (
                                    <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                ))}
                                <SelectItem value="__new__">+ Create New Account</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedAccountId === '__new__' && (
                        <div className="space-y-2 animate-in slide-in-from-top-2">
                            <Label className="text-[10px] font-black uppercase text-white/40 tracking-widest">New Account Name</Label>
                            <Input 
                                placeholder="e.g. My Live Portfolio" 
                                className="bg-white/5 border-white/10 rounded-xl"
                                value={newAccountName}
                                onChange={(e) => setNewAccountName(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <Button className="w-full bg-indigo-600 hover:bg-indigo-500" onClick={handleConfirm}>
                    Import Trades
                </Button>
                
                <button onClick={() => setStep('upload_file')} className="w-full text-center text-xs text-white/40 hover:text-white transition-colors uppercase tracking-widest font-black">Back to upload</button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
