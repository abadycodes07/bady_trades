// src/contexts/TradeDataContext.tsx
'use client';

import React, { createContext, useState, useContext, type ReactNode, useCallback, useEffect } from 'react';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import { parse, isValid, format, compareAsc, subDays, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface TradingAccount {
  id: string;
  user_id: string;
  name: string;
  broker: string | null;
  initial_balance: number;
}

interface TradeDataContextType {
  tradeData: CsvTradeData[];
  accounts: TradingAccount[];
  selectedAccountId: string | null;
  setSelectedAccountId: React.Dispatch<React.SetStateAction<string | null>>;
  createAccount: (name: string, broker?: string) => Promise<TradingAccount | null>;
  updateAccountInitialBalance: (accountId: string, amount: number) => Promise<void>;
  addTrades: (newTrades: CsvTradeData[], accountId?: string) => void;
  addTradesToAccount: (newTrades: CsvTradeData[], accountId: string) => Promise<void>;
  clearTrades: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isDemoMode: boolean;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

// --- Demo Data Generator ---
function generateDemoTrades(): CsvTradeData[] {
  const trades: CsvTradeData[] = [];
  const symbols = ['XAUUSD', 'XAUUSD', 'XAUUSD', 'EURUSD', 'GBPUSD', 'XAUUSD'];
  const sides = ['Buy', 'Sell'];

  // Seed data over past 60 days
  const today = new Date();
  let tradeCounter = 0;

  for (let dayOffset = 59; dayOffset >= 0; dayOffset--) {
    const day = subDays(today, dayOffset);
    const dayOfWeek = day.getDay();

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Skip some random days (40% chance of no trades)
    if (Math.random() < 0.40) continue;

    // 1-4 trades per day
    const numTrades = Math.floor(Math.random() * 4) + 1;

    for (let t = 0; t < numTrades; t++) {
      const symbol = symbols[Math.floor(Math.random() * symbols.length)];
      const side = sides[Math.floor(Math.random() * sides.length)];

      // Generate realistic P&L: 60% win rate, ranging -150 to +300
      const isWin = Math.random() < 0.60;
      let netPnl: number;
      if (isWin) {
        netPnl = Math.round((Math.random() * 250 + 30) * 100) / 100;
      } else {
        netPnl = Math.round(-(Math.random() * 120 + 20) * 100) / 100;
      }

      const grossPnl = netPnl > 0 ? netPnl + Math.random() * 5 : netPnl + Math.random() * 3;
      const hour = 9 + Math.floor(Math.random() * 8);
      const minute = Math.floor(Math.random() * 60);
      const execTime = `${format(day, 'yyyy-MM-dd')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

      tradeCounter++;
      trades.push({
        id: `demo-trade-${tradeCounter}`,
        Date: format(day, 'yyyy-MM-dd'),
        'T/D': format(day, 'yyyy-MM-dd'),
        Symbol: symbol,
        Side: side,
        Qty: (Math.random() * 0.5 + 0.1).toFixed(2),
        Price: symbol.includes('XAU') ? (2300 + Math.random() * 200).toFixed(2) : (1.05 + Math.random() * 0.15).toFixed(5),
        'Exec Time': execTime,
        NetPnL: netPnl.toString(),
        GrossPnl: grossPnl.toFixed(2),
        NetCash: '0',
        Account: 'Demo Account',
        Note: '',
      });
    }
  }

  return trades;
}

const DEMO_ACCOUNT: TradingAccount = {
  id: 'demo-account',
  user_id: 'demo-user',
  name: 'Demo Account',
  broker: 'Demo Broker',
  initial_balance: 10000,
};

export const TradeDataProvider = ({ children }: { children: ReactNode }) => {
  const [tradeData, setTradeData] = useState<CsvTradeData[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const sortTrades = useCallback((trades: CsvTradeData[]): CsvTradeData[] => {
    return trades.sort((a, b) => {
      if (!a.Date || !b.Date) return 0;
      try {
        let dateA, dateB;
        dateA = parse(a.Date, 'yyyy-MM-dd', new Date());
        if (!isValid(dateA)) dateA = parse(a.Date, 'MM/dd/yy', new Date());
        if (!isValid(dateA)) dateA = parse(a.Date, 'MM/dd/yyyy', new Date());

        dateB = parse(b.Date, 'yyyy-MM-dd', new Date());
        if (!isValid(dateB)) dateB = parse(b.Date, 'MM/dd/yy', new Date());
        if (!isValid(dateB)) dateB = parse(b.Date, 'MM/dd/yyyy', new Date());

        if (!isValid(dateA) || !isValid(dateB)) return 0;
        return compareAsc(dateB, dateA);
      } catch {
        return 0;
      }
    });
  }, []);


  // --- Fetch Accounts & Trades ---
  useEffect(() => {
    const loadData = async () => {
      // Not logged in — show demo data
      if (!user && !authLoading) {
        const demoTrades = generateDemoTrades();
        setAccounts([DEMO_ACCOUNT]);
        setSelectedAccountId(DEMO_ACCOUNT.id);
        setTradeData(sortTrades(demoTrades));
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      if (!supabase) {
        // No supabase — show demo data
        const demoTrades = generateDemoTrades();
        setAccounts([DEMO_ACCOUNT]);
        setSelectedAccountId(DEMO_ACCOUNT.id);
        setTradeData(sortTrades(demoTrades));
        setIsDemoMode(true);
        setIsLoading(false);
        return;
      }

      if (user && !authLoading) {
        setIsLoading(true);
        try {
          // 1. Load accounts
          const { data: accData, error: accErr } = await supabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', user.id);

          let currentAccounts: TradingAccount[] = [];
          if (!accErr && accData && accData.length > 0) {
              currentAccounts = accData as TradingAccount[];
              setAccounts(currentAccounts);
              if (currentAccounts.length > 0 && !selectedAccountId) {
                 setSelectedAccountId(currentAccounts[0].id);
              }
              setIsDemoMode(false);
          } else {
             // No accounts yet — show demo account alongside
             currentAccounts = [DEMO_ACCOUNT];
             setAccounts([DEMO_ACCOUNT]);
             setSelectedAccountId(DEMO_ACCOUNT.id);
             setIsDemoMode(true);
          }

          // 2. Load trades
          if (currentAccounts.length > 0 && currentAccounts[0].id !== 'demo-account') {
              let tradeQuery = supabase.from('trades').select('*').eq('user_id', user.id);
              if (selectedAccountId && selectedAccountId !== 'demo-account') {
                 tradeQuery = tradeQuery.eq('account_id', selectedAccountId);
              }

              const { data, error } = await tradeQuery;
              if (error) throw error;

              const fetchedTrades: CsvTradeData[] = (data || []).map((t: any) => ({
                ...t,
                id: t.id,
                Date: t.date,
                Symbol: t.symbol,
                Side: t.side,
                Qty: t.qty?.toString(),
                Price: t.price?.toString(),
                NetPnL: t.net_pnl?.toString(),
                GrossPnl: t.gross_pnl?.toString(),
                'Exec Time': t.exec_time,
                Note: t.note,
              }));

              if (fetchedTrades.length === 0) {
                // No real trades yet — load demo
                const demoTrades = generateDemoTrades();
                setTradeData(sortTrades(demoTrades));
              } else {
                setTradeData(sortTrades(fetchedTrades));
              }
          } else {
              // Demo account selected
              const demoTrades = generateDemoTrades();
              setTradeData(sortTrades(demoTrades));
          }
        } catch (error: any) {
          console.error("Error loading trades from Supabase:", error);
          // Fall back to demo data on error
          const demoTrades = generateDemoTrades();
          setAccounts([DEMO_ACCOUNT]);
          setSelectedAccountId(DEMO_ACCOUNT.id);
          setTradeData(sortTrades(demoTrades));
          setIsDemoMode(true);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, sortTrades]);

  // Re-load trades when account switches
  useEffect(() => {
    if (!selectedAccountId) return;

    if (selectedAccountId === 'demo-account') {
      const demoTrades = generateDemoTrades();
      setTradeData(sortTrades(demoTrades));
      setIsDemoMode(true);
      return;
    }

    if (!supabase || !user) return;

    const reloadForAccount = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('trades')
          .select('*')
          .eq('user_id', user.id)
          .eq('account_id', selectedAccountId);

        if (error) throw error;

        const fetchedTrades: CsvTradeData[] = (data || []).map((t: any) => ({
          ...t,
          id: t.id,
          Date: t.date,
          Symbol: t.symbol,
          Side: t.side,
          Qty: t.qty?.toString(),
          Price: t.price?.toString(),
          NetPnL: t.net_pnl?.toString(),
          GrossPnl: t.gross_pnl?.toString(),
          'Exec Time': t.exec_time,
          Note: t.note,
        }));

        setTradeData(sortTrades(fetchedTrades));
        setIsDemoMode(false);
      } catch (err: any) {
        console.error("Error reloading trades for account:", err);
      } finally {
        setIsLoading(false);
      }
    };

    reloadForAccount();
  }, [selectedAccountId, user, sortTrades]);

  // --- Create Account ---
  const createAccount = useCallback(async (name: string, broker?: string) => {
      if (!user || !supabase) {
          // Local-only: create a local account
          const localAcc: TradingAccount = {
              id: uuidv4(),
              user_id: 'local',
              name,
              broker: broker || null,
              initial_balance: 0,
          };
          setAccounts(prev => [...prev.filter(a => a.id !== 'demo-account'), localAcc]);
          setSelectedAccountId(localAcc.id);
          return localAcc;
      }
      try {
          const { data, error } = await supabase.from('trading_accounts').insert({
              user_id: user.id,
              name,
              broker: broker || null
          }).select().single();

          if (error) throw error;
          const newAcc = data as TradingAccount;
          setAccounts(prev => [...prev.filter(a => a.id !== 'demo-account'), newAcc]);
          setSelectedAccountId(newAcc.id);
          setIsDemoMode(false);
          return newAcc;
      } catch (err: any) {
          console.error("Failed to create account:", err);
          toast({ title: "Failed to create account", description: err.message, variant: "destructive" });
          return null;
      }
  }, [user, toast]);

  // --- Update Account Balance ---
  const updateAccountInitialBalance = useCallback(async (accountId: string, amount: number) => {
      if (accountId === 'demo-account') {
          setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, initial_balance: amount } : a));
          toast({ title: "Balance Updated", description: "Demo account balance set." });
          return;
      }
      if (!supabase) return;
      try {
          const { error } = await supabase
              .from('trading_accounts')
              .update({ initial_balance: amount })
              .eq('id', accountId);
          if (error) throw error;

          setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, initial_balance: amount } : a));
          toast({ title: "Account Updated", description: "Initial balance set successfully." });
      } catch (err: any) {
          console.error("Failed to update initial balance:", err);
          toast({ title: "Failed to update balance", description: err.message, variant: "destructive" });
      }
  }, [toast]);

  const addTradesToAccount = useCallback(async (newTradesInput: CsvTradeData[], accountId: string) => {
    if (newTradesInput.length === 0) return;
    setIsLoading(true);

    // If demo account or no supabase, just set local state
    if (accountId === 'demo-account' || !supabase || !user) {
      setTradeData(prev => sortTrades([...prev.filter(t => !t.id?.toString().startsWith('demo-trade-')), ...newTradesInput]));
      setIsLoading(false);
      setIsDemoMode(false);
      return;
    }

    const tradesToUpsert: any[] = [];
    const existingContentKeyToIdMap = new Map<string, string | number>();
    tradeData.forEach(trade => {
      const key = `${trade.Date || ''}-${trade.Symbol || ''}-${trade['Exec Time'] || ''}-${trade.Side || ''}-${trade.Qty || ''}-${trade.Price || ''}`;
      if (trade.id) existingContentKeyToIdMap.set(key, trade.id);
    });

    const idsUsedInThisBatch = new Set<string | number>();
    for (const inputTrade of newTradesInput) {
      const contentKey = `${inputTrade.Date || ''}-${inputTrade.Symbol || ''}-${inputTrade['Exec Time'] || ''}-${inputTrade.Side || ''}-${inputTrade.Qty || ''}-${inputTrade.Price || ''}`;
      let tradeId: string | number = existingContentKeyToIdMap.get(contentKey) || uuidv4();
      if (idsUsedInThisBatch.has(tradeId)) tradeId = uuidv4();
      idsUsedInThisBatch.add(tradeId);

      tradesToUpsert.push({
        id: tradeId,
        user_id: user.id,
        account_id: accountId,
        date: inputTrade.Date,
        symbol: inputTrade.Symbol,
        side: inputTrade.Side,
        qty: parseFloat(inputTrade.Qty || '0'),
        price: parseFloat(inputTrade.Price || '0'),
        net_pnl: parseFloat(inputTrade.NetPnL || '0'),
        gross_pnl: parseFloat(inputTrade.GrossPnl || '0'),
        exec_time: inputTrade['Exec Time'],
        note: inputTrade.Note,
      });
    }

    try {
      const { error } = await supabase.from('trades').upsert(tradesToUpsert, { onConflict: 'id' });
      if (error) throw error;

      toast({ title: 'Trades Processed', description: `${tradesToUpsert.length} trades saved/updated.` });

      const { data: freshData, error: loadError } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .eq('account_id', accountId);

      if (loadError) throw loadError;

      const fetchedTrades: CsvTradeData[] = (freshData || []).map((t: any) => ({
          ...t,
          id: t.id,
          Date: t.date,
          Symbol: t.symbol,
          Side: t.side,
          Qty: t.qty?.toString(),
          Price: t.price?.toString(),
          NetPnL: t.net_pnl?.toString(),
          GrossPnl: t.gross_pnl?.toString(),
          'Exec Time': t.exec_time,
          Note: t.note,
      }));
      setTradeData(sortTrades(fetchedTrades));
      setIsDemoMode(false);
    } catch (error: any) {
      console.error("Error saving trades:", error);
      toast({ title: 'Error Processing Trades', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [tradeData, user, toast, sortTrades]);

  const addTrades = useCallback(async (newTradesInput: CsvTradeData[]) => {
    await addTradesToAccount(newTradesInput, selectedAccountId || 'demo-account');
  }, [addTradesToAccount, selectedAccountId]);

  const clearTrades = useCallback(async () => {
    setIsLoading(true);
    if (selectedAccountId === 'demo-account') {
      setTradeData([]);
      setIsLoading(false);
      return;
    }
    if (supabase && user) {
      try {
        let delQuery = supabase.from('trades').delete().eq('user_id', user.id);
        if (selectedAccountId) delQuery = delQuery.eq('account_id', selectedAccountId);
        const { error } = await delQuery;
        if (error) throw error;
        toast({ title: 'Trades Cleared', description: 'All trades have been cleared.' });
        setTradeData([]);
      } catch (error: any) {
        console.error("Error clearing trades:", error);
        toast({ title: 'Error Clearing Trades', description: error.message, variant: 'destructive' });
      }
    } else {
        setTradeData([]);
    }
    setIsLoading(false);
  }, [user, selectedAccountId, toast]);

  return (
    <TradeDataContext.Provider value={{
      tradeData, accounts, selectedAccountId, setSelectedAccountId,
      createAccount, updateAccountInitialBalance,
      addTrades, addTradesToAccount, clearTrades,
      isLoading, setIsLoading, isDemoMode
    }}>
      {children}
    </TradeDataContext.Provider>
  );
};

export const useTradeData = () => {
  const context = useContext(TradeDataContext);
  if (context === undefined) {
    throw new Error('useTradeData must be used within a TradeDataProvider');
  }
  return context;
};
