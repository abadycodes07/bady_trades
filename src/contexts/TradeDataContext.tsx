// src/contexts/TradeDataContext.tsx
'use client';

import React, { createContext, useState, useContext, type ReactNode, useCallback, useEffect } from 'react';
import type { CsvTradeData } from '@/app/(app)/dashboard/page';
import { parse, isValid, format, compareAsc } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './AuthContext'; 
import { supabase } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid'; 

interface TradeDataContextType {
  tradeData: CsvTradeData[];
  addTrades: (newTrades: CsvTradeData[]) => void;
  clearTrades: () => void;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const TradeDataContext = createContext<TradeDataContextType | undefined>(undefined);

export const TradeDataProvider = ({ children }: { children: ReactNode }) => {
  const [tradeData, setTradeData] = useState<CsvTradeData[]>([]);
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


  useEffect(() => {
    const loadUserTrades = async () => {
      if (!supabase) {
        setIsLoading(false);
        return;
      }

      if (user && !authLoading) {
        setIsLoading(true);
        try {
          const { data, error } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id);

          if (error) throw error;

          const fetchedTrades: CsvTradeData[] = (data || []).map(t => ({
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
        setIsLoading(false); 
      }
    };
    loadUserTrades();
  }, [user, authLoading, toast, sortTrades]);

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
        const { data: freshData, error: loadError } = await supabase
            .from('trades')
            .select('*')
            .eq('user_id', user.id);
        
        if (loadError) throw loadError;

        const fetchedTrades: CsvTradeData[] = (freshData || []).map(t => ({
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
        const { error } = await supabase
          .from('trades')
          .delete()
          .eq('user_id', user.id);

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
    <TradeDataContext.Provider value={{ tradeData, addTrades, clearTrades, isLoading, setIsLoading }}>
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
