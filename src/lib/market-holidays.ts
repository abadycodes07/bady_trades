// src/lib/market-holidays.ts
// Static CME/COMEX Gold Market Holiday List for 2025-2026
// Source: CME Group Official Holiday Calendar
// Gold (XAU/USD) traded on COMEX follows these closures.

export interface MarketHoliday {
  date: string; // YYYY-MM-DD
  name: string;
  shortName: string;
  markets: string[]; // which markets are affected
}

// CME/COMEX Gold holidays - full closures
export const MARKET_HOLIDAYS_2025_2026: MarketHoliday[] = [
  // 2025
  { date: '2025-01-01', name: "New Year's Day", shortName: "New Year's", markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-01-20', name: 'Martin Luther King Jr. Day', shortName: 'MLK Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-02-17', name: "Presidents' Day", shortName: "Presidents'", markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-04-18', name: 'Good Friday', shortName: 'Good Friday', markets: ['GOLD', 'OIL', 'FX'] },
  { date: '2025-05-26', name: 'Memorial Day', shortName: 'Memorial', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-06-19', name: 'Juneteenth National Independence Day', shortName: 'Juneteenth', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-07-04', name: 'Independence Day', shortName: 'Indep. Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-09-01', name: 'Labor Day', shortName: 'Labor Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-11-27', name: 'Thanksgiving Day', shortName: 'Thanksgiving', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2025-12-25', name: 'Christmas Day', shortName: 'Christmas', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  // 2026
  { date: '2026-01-01', name: "New Year's Day", shortName: "New Year's", markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-01-19', name: 'Martin Luther King Jr. Day', shortName: 'MLK Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-02-16', name: "Presidents' Day", shortName: "Presidents'", markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-04-03', name: 'Good Friday', shortName: 'Good Friday', markets: ['GOLD', 'OIL', 'FX'] },
  { date: '2026-05-25', name: 'Memorial Day', shortName: 'Memorial', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-06-19', name: 'Juneteenth National Independence Day', shortName: 'Juneteenth', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-07-03', name: 'Independence Day (observed)', shortName: 'Indep. Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-09-07', name: 'Labor Day', shortName: 'Labor Day', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-11-26', name: 'Thanksgiving Day', shortName: 'Thanksgiving', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
  { date: '2026-12-25', name: 'Christmas Day', shortName: 'Christmas', markets: ['GOLD', 'OIL', 'FX', 'INDICES'] },
];

const holidayMap = new Map<string, MarketHoliday>(
  MARKET_HOLIDAYS_2025_2026.map(h => [h.date, h])
);

export function isMarketHoliday(date: Date): boolean {
  const key = formatDateKey(date);
  return holidayMap.has(key);
}

export function getHoliday(date: Date): MarketHoliday | null {
  const key = formatDateKey(date);
  return holidayMap.get(key) ?? null;
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
}

export function isGoldMarketOpen(date: Date): boolean {
  return !isWeekend(date) && !isMarketHoliday(date);
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Detect asset class from symbol string
export type AssetClass = 'GOLD' | 'OIL' | 'FX' | 'INDICES' | 'CRYPTO' | 'OTHER';

export function detectAsset(symbol: string): AssetClass {
  const s = (symbol || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (/XAU|GOLD|GC|XAUUSD/.test(s)) return 'GOLD';
  if (/XAG|SILVER/.test(s)) return 'GOLD'; // treat silver same as gold market
  if (/WTI|BRENT|CL|OIL|USO/.test(s)) return 'OIL';
  if (/NQ|NASDAQ|MNQ|QQQ/.test(s)) return 'INDICES';
  if (/ES|SPX|SPY|YM|DOW|RTY/.test(s)) return 'INDICES';
  if (/EUR|GBP|JPY|AUD|CAD|CHF|NZD|USD/.test(s)) return 'FX';
  if (/BTC|ETH|CRYPTO/.test(s)) return 'CRYPTO';
  return 'OTHER';
}

export function getAssetEmoji(asset: AssetClass): string {
  switch (asset) {
    case 'GOLD': return '🥇';
    case 'OIL': return '🛢';
    case 'FX': return '💱';
    case 'INDICES': return '📈';
    case 'CRYPTO': return '₿';
    default: return '📊';
  }
}

export function getAssetLabel(asset: AssetClass): string {
  switch (asset) {
    case 'GOLD': return 'Gold';
    case 'OIL': return 'Oil';
    case 'FX': return 'FX Pair';
    case 'INDICES': return 'Index';
    case 'CRYPTO': return 'Crypto';
    default: return 'Other';
  }
}
