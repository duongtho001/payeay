-- ═══════════════════════════════════════════════════════════
-- PayEay — Supabase Migration SQL
-- Chạy trong Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT '',
    phone TEXT DEFAULT '',
    plan TEXT NOT NULL DEFAULT 'free',
    api_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. Keywords (webhook configurations)
CREATE TABLE IF NOT EXISTS public.keywords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    keyword TEXT NOT NULL,
    webhook_url TEXT NOT NULL,
    source TEXT DEFAULT '*',
    submits INTEGER DEFAULT 0,
    last_submit TIMESTAMPTZ,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keywords_user ON public.keywords(user_id);

-- 3. Bank Settings
CREATE TABLE IF NOT EXISTS public.bank_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    bank_name TEXT DEFAULT '',
    account_num TEXT DEFAULT '',
    account_name TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Transactions Log
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'notification',
    source TEXT DEFAULT '',
    amount NUMERIC,
    keyword TEXT,
    api_key TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

-- ═══ ROW LEVEL SECURITY ═══

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Keywords: users manage their own
CREATE POLICY "Users can view own keywords" ON public.keywords
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own keywords" ON public.keywords
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own keywords" ON public.keywords
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own keywords" ON public.keywords
    FOR DELETE USING (auth.uid() = user_id);

-- Bank Settings: users manage their own
CREATE POLICY "Users can view own bank" ON public.bank_settings
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own bank" ON public.bank_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bank" ON public.bank_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- Transactions: users view their own
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "API can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true); -- API key auth handled at app level
