-- BADYTRADES DATABASE SCHEMA INITIALIZATION
-- RUN THIS IN YOUR SUPABASE SQL EDITOR

-- 1. Create Trading Accounts table
CREATE TABLE IF NOT EXISTS public.trading_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    broker TEXT,
    initial_balance DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id TEXT PRIMARY KEY, -- Using TEXT for EA/CSV compatibility (MetaTrader Ticket)
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.trading_accounts(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    symbol TEXT,
    side TEXT,
    qty DECIMAL,
    price DECIMAL,
    net_pnl DECIMAL,
    gross_pnl DECIMAL,
    exec_time TEXT,
    note TEXT,
    roi TEXT,
    r_multiple TEXT,
    strategy TEXT,
    instrument TEXT,
    open_time TEXT,
    close_time TEXT,
    volume TEXT,
    ticks TEXT,
    pips TEXT,
    commissions DECIMAL,
    fees DECIMAL,
    tags TEXT[],
    mistakes TEXT[],
    setups TEXT[],
    bady_score INTEGER,
    source TEXT DEFAULT 'manual', -- 'manual' or 'ea_sync'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create EA Connections table (for MT4 Sync)
CREATE TABLE IF NOT EXISTS public.ea_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Account Snapshots table (for Balance/Equity tracking)
CREATE TABLE IF NOT EXISTS public.account_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    account_number TEXT NOT NULL,
    broker TEXT,
    balance DECIMAL,
    equity DECIMAL,
    margin DECIMAL,
    free_margin DECIMAL,
    currency TEXT,
    leverage INTEGER,
    synced_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, account_number)
);

-- 5. Create Balance Operations table
CREATE TABLE IF NOT EXISTS public.balance_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    ticket TEXT NOT NULL,
    date DATE,
    amount DECIMAL,
    type TEXT, -- 'deposit' | 'withdrawal'
    comment TEXT,
    UNIQUE(user_id, ticket)
);

-- Enable RLS on all tables
ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ea_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_operations ENABLE ROW LEVEL SECURITY;

-- Create Security Policies (Users can only see their own data)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own accounts') THEN
        CREATE POLICY "Users can manage their own accounts" ON public.trading_accounts FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own trades') THEN
        CREATE POLICY "Users can manage their own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own EA connections') THEN
        CREATE POLICY "Users can manage their own EA connections" ON public.ea_connections FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own snapshots') THEN
        CREATE POLICY "Users can manage their own snapshots" ON public.account_snapshots FOR ALL USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage their own operations') THEN
        CREATE POLICY "Users can manage their own operations" ON public.balance_operations FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
