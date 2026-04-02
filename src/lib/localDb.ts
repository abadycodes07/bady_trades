// src/lib/localDb.ts

'use client';

import { v4 as uuidv4 } from 'uuid';

export interface LocalUser {
  uid: string;
  email: string | null;
  displayName?: string;
  photoURL?: string;
}

export interface LocalTrade {
  id: string;
  Date: string;
  Symbol: string;
  Side: string;
  Qty: number;
  Price: number;
  NetPnL: number;
  GrossPnl: number;
  [key: string]: any;
}

const STORAGE_KEYS = {
  USER: 'bt_user',
  TRADES: 'bt_trades',
  ACCOUNTS: 'bt_accounts',
  SETTINGS: 'bt_settings',
  BACKTESTING: 'bt_backtesting',
};

class LocalDatabase {
  private isBrowser = typeof window !== 'undefined';

  private get(key: string): any {
    if (!this.isBrowser) return null;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  private set(key: string, value: any): void {
    if (!this.isBrowser) return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  // Auth Operations
  getCurrentUser(): LocalUser | null {
    return this.get(STORAGE_KEYS.USER);
  }

  setCurrentUser(user: LocalUser | null): void {
    this.set(STORAGE_KEYS.USER, user);
  }

  // Trade Operations
  getTrades(userId: string): LocalTrade[] {
    const allTrades = this.get(`${STORAGE_KEYS.TRADES}_${userId}`) || [];
    return allTrades;
  }

  saveTrades(userId: string, trades: LocalTrade[]): void {
    this.set(`${STORAGE_KEYS.TRADES}_${userId}`, trades);
  }

  addTrade(userId: string, trade: Partial<LocalTrade>): LocalTrade {
    const trades = this.getTrades(userId);
    const newTrade: LocalTrade = {
      id: uuidv4(),
      Date: new Date().toISOString().split('T')[0],
      Symbol: '',
      Side: 'Buy',
      Qty: 0,
      Price: 0,
      NetPnL: 0,
      GrossPnl: 0,
      ...trade,
    };
    trades.push(newTrade);
    this.saveTrades(userId, trades);
    return newTrade;
  }

  updateTrade(userId: string, tradeId: string, updates: Partial<LocalTrade>): void {
    const trades = this.getTrades(userId);
    const index = trades.findIndex(t => t.id === tradeId);
    if (index !== -1) {
      trades[index] = { ...trades[index], ...updates };
      this.saveTrades(userId, trades);
    }
  }

  deleteTrade(userId: string, tradeId: string): void {
    const trades = this.getTrades(userId);
    const filtered = trades.filter(t => t.id !== tradeId);
    this.saveTrades(userId, filtered);
  }

  clearTrades(userId: string): void {
    this.saveTrades(userId, []);
  }

  // Account Operations
  getAccounts(userId: string): any[] {
    return this.get(`${STORAGE_KEYS.ACCOUNTS}_${userId}`) || [];
  }

  saveAccounts(userId: string, accounts: any[]): void {
    this.set(`${STORAGE_KEYS.ACCOUNTS}_${userId}`, accounts);
  }

  // Settings
  getSettings(userId: string): any {
    return this.get(`${STORAGE_KEYS.SETTINGS}_${userId}`) || {};
  }

  saveSettings(userId: string, settings: any): void {
    this.set(`${STORAGE_KEYS.SETTINGS}_${userId}`, settings);
  }
}

export const localDb = new LocalDatabase();
