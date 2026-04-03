// src/app/api/mt4-sync/route.ts
// Receives trade data pushed by the MT4/MT5 Expert Advisor plugin running on the user's PC.
// The EA sends a POST every 30s with the full account state — trades, balance, equity.
// This is the ONLY legitimate real-time broker connection method for Exness MT4/MT5.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic route — Supabase env vars are only available at runtime, not build time
export const dynamic = 'force-dynamic';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EATrade {
  ticket: number;
  openTime: string;
  closeTime: string;
  type: string;       // 'buy' | 'sell' | 'balance'
  lots: number;
  symbol: string;
  openPrice: number;
  closePrice?: number;
  profit: number;
  commission: number;
  swap: number;
  comment?: string;
}

interface EAPayload {
  apiKey: string;
  userId: string;
  accountNumber: string;
  broker: string;         // e.g. "Exness"
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  currency: string;
  leverage: number;
  trades: EATrade[];
  syncedAt: string;       // ISO timestamp from the EA
}

// ─── Route Handler ────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  try {
    const payload: EAPayload = await request.json();

    // Validate API key (stored in Supabase ea_connections table)
    const { data: connection, error: connErr } = await supabase
      .from('ea_connections')
      .select('user_id, is_active')
      .eq('api_key', payload.apiKey)
      .single();

    if (connErr || !connection) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }
    if (!connection.is_active) {
      return NextResponse.json({ error: 'Connection is disabled' }, { status: 403 });
    }

    const userId = connection.user_id;

    // Upsert account snapshot (balance, equity etc.)
    await supabase.from('account_snapshots').upsert({
      user_id: userId,
      account_number: payload.accountNumber,
      broker: payload.broker,
      balance: payload.balance,
      equity: payload.equity,
      margin: payload.margin,
      free_margin: payload.freeMargin,
      currency: payload.currency,
      leverage: payload.leverage,
      synced_at: payload.syncedAt,
    }, { onConflict: 'user_id,account_number' });

    // Separate balance operations (deposits/withdrawals) from trades
    const balanceOps = payload.trades.filter(t => t.type === 'balance');
    const tradeRows = payload.trades.filter(t => t.type !== 'balance' && t.closeTime);

    // Upsert balance operations
    if (balanceOps.length > 0) {
      const ops = balanceOps.map(op => ({
        user_id: userId,
        ticket: op.ticket,
        date: op.closeTime?.split(' ')[0] ?? op.openTime?.split(' ')[0],
        amount: op.profit,
        type: op.profit > 0 ? 'deposit' : 'withdrawal',
        comment: op.comment ?? '',
      }));
      await supabase.from('balance_operations').upsert(ops, { onConflict: 'user_id,ticket' });
    }

    // Upsert closed trades
    if (tradeRows.length > 0) {
      const trades = tradeRows.map(t => ({
        user_id: userId,
        id: `ea-${userId}-${t.ticket}`,
        date: t.closeTime?.split(' ')[0],
        symbol: t.symbol,
        side: t.type,
        qty: t.lots,
        price: t.closePrice ?? t.openPrice,
        net_pnl: t.profit + t.commission + t.swap,
        gross_pnl: t.profit,
        exec_time: t.closeTime,
        note: `EA sync | Ticket ${t.ticket}`,
        source: 'ea_sync',
      }));
      await supabase.from('trades').upsert(trades, { onConflict: 'id' });
    }

    return NextResponse.json({
      success: true,
      processed: { trades: tradeRows.length, balanceOps: balanceOps.length },
      balance: payload.balance,
      equity: payload.equity,
    });

  } catch (err: any) {
    console.error('MT4 sync error:', err);
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}
