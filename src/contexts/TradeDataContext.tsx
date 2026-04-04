// src/contexts/TradeDataContext.tsx
'use client';

import React, { createContext, useState, useContext, type ReactNode, useCallback, useEffect } from 'react';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import { parse, isValid, format, compareAsc } from 'date-fns';
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
  addTrades: (newTrades: CsvTradeData[]) => void;
  clearTrades: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

export const TradeDataProvider = ({ children }: { children: ReactNode }) => {
  const [tradeData, setTradeData] = useState<CsvTradeData[]>([]);
  const [accounts, setAccounts] = useState<TradingAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      if (user && !authLoading) {
        setIsLoading(true);
        try {
          // 1. Try to load accounts (graceful fail if migration not run)
          const { data: accData, error: accErr } = await supabase
            .from('trading_accounts')
            .select('*')
            .eq('user_id', user.id);

          let currentAccounts: TradingAccount[] = [];
          if (!accErr && accData) {
              currentAccounts = accData as TradingAccount[];
              setAccounts(currentAccounts);
              if (currentAccounts.length > 0 && !selectedAccountId) {
                 setSelectedAccountId(currentAccounts[0].id);
              }
          } else {
             // Migration not yet run or error
             setAccounts([]);
          }

          // 2. Load trades (Filter by selected account if available, else load all)
          let tradeQuery = supabase.from('trades').select('*').eq('user_id', user.id);
          // If we have accounts and one is selected, we filter. If migration not run, this won't filter.
          if (currentAccounts.length > 0 && selectedAccountId) {
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

          setTradeData(sortTrades(fetchedTrades));
        } catch (error: any) {
          console.error("Error loading trades from Supabase:", error);
          toast({ title: 'Error Loading Trades', description: error.message, variant: 'destructive' });
          setTradeData([]); 
        } finally {
          setIsLoading(false);
        }
      } else if (!user && !authLoading) {
        setTradeData([]); 
        setAccounts([]);
        setSelectedAccountId(null);
        setIsLoading(false); 
      }
    };
    loadData();
  }, [user, authLoading, toast, sortTrades, selectedAccountId]);

  // --- Create Account ---
  const createAccount = useCallback(async (name: string, broker?: string) => {
      if (!user || !supabase) return null;
      try {
          const { data, error } = await supabase.from('trading_accounts').insert({
              user_id: user.id,
              name,
              broker: broker || null
          }).select().single();
          
          if (error) throw error;
          const newAcc = data as TradingAccount;
          setAccounts(prev => [...prev, newAcc]);
          setSelectedAccountId(newAcc.id);
          return newAcc;
      } catch (err: any) {
          console.error("Failed to create account:", err);
          toast({ title: "Failed to create account", description: err.message, variant: "destructive" });
          return null;
      }
  }, [user, toast]);

  // --- Update Account Balance ---
  const updateAccountInitialBalance = useCallback(async (accountId: string, amount: number) => {
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

  const addTrades = useCallback(async (newTradesInput: CsvTradeData[]) => {
    if (newTradesInput.length === 0) return;
    setIsLoading(true);

    const currentTradesSnapshot = [...tradeData];
    const tradesToUpsert: any[] = [];
    
    // contentKey -> id mapping for duplicates
    const existingContentKeyToIdMap = new Map<string, string | number>();
    currentTradesSnapshot.forEach(trade => {
      const key = `${trade.Date || ''}-${trade.Symbol || ''}-${trade['Exec Time'] || ''}-${trade.Side || ''}-${trade.Qty || ''}-${trade.Price || ''}`;
      if (trade.id) {
        existingContentKeyToIdMap.set(key, trade.id);
      }
    });

    // Track IDs already used in THIS batch to prevent duplicates within the same upload
    // (e.g. two partial-close trades with identical fields will map to the same contentKey)
    const idsUsedInThisBatch = new Set<string | number>();

    for (const inputTrade of newTradesInput) {
      const contentKey = `${inputTrade.Date || ''}-${inputTrade.Symbol || ''}-${inputTrade['Exec Time'] || ''}-${inputTrade.Side || ''}-${inputTrade.Qty || ''}-${inputTrade.Price || ''}`;
      
      let tradeId: string | number = existingContentKeyToIdMap.get(contentKey) || uuidv4();
      
      // If this ID is already in the current batch, always generate a fresh unique one
      if (idsUsedInThisBatch.has(tradeId)) {
        tradeId = uuidv4();
      }
      idsUsedInThisBatch.add(tradeId);

      if (user) {
        tradesToUpsert.push({
          id: tradeId,
          user_id: user.id,
          // Only append account_id if tables exist (we know they do if accounts > 0)
          ...(accounts.length > 0 && selectedAccountId ? { account_id: selectedAccountId } : {}),
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
      } else {
          // Local only mode
          tradesToUpsert.push({ ...inputTrade, id: tradeId });
      }
    }

    if (supabase && user && tradesToUpsert.length > 0) {
      try {
        const { error } = await supabase
          .from('trades')
          .upsert(tradesToUpsert, { onConflict: 'id' });

        if (error) throw error;

        toast({ title: 'Trades Processed', description: `${tradesToUpsert.length} trades saved/updated.` });
        
        // Reload trades after upsert
        let loadQuery = supabase.from('trades').select('*').eq('user_id', user.id);
        if (accounts.length > 0 && selectedAccountId) {
            loadQuery = loadQuery.eq('account_id', selectedAccountId);
        }
        const { data: freshData, error: loadError } = await loadQuery;
        
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

      } catch (error: any) {
        console.error("Error saving trades to Supabase:", error);
        toast({ title: 'Error Processing Trades', description: error.message, variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    } else {
        // Local state only
        const newLocalData = [...tradeData];
        tradesToUpsert.forEach(t => {
          const index = newLocalData.findIndex(lt => lt.id === t.id);
          if (index !== -1) {
            newLocalData[index] = t;
          } else {
            newLocalData.push(t);
          }
        });
        setTradeData(sortTrades(newLocalData));
        setIsLoading(false);
    }

  }, [tradeData, user, toast, setIsLoading, sortTrades]);

  const clearTrades = useCallback(async () => {
    setIsLoading(true);
    if (supabase && user) {
      try {
        let delQuery = supabase.from('trades').delete().eq('user_id', user.id);
        if (accounts.length > 0 && selectedAccountId) {
            delQuery = delQuery.eq('account_id', selectedAccountId);
        }
        const { error } = await delQuery;

        if (error) throw error;

        toast({ title: 'Trades Cleared', description: 'All trades have been cleared from your account.' });
        setTradeData([]);
      } catch (error: any) {
        console.error("Error clearing trades from Supabase:", error);
        toast({ title: 'Error Clearing Trades', description: error.message, variant: 'destructive' });
      }
    } else {
        setTradeData([]);
    }
    setIsLoading(false);
  }, [user, toast, setIsLoading]);

  return (
    <TradeDataContext.Provider value={{ tradeData, accounts, selectedAccountId, setSelectedAccountId, createAccount, updateAccountInitialBalance, addTrades, clearTrades, isLoading, setIsLoading }}>
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
