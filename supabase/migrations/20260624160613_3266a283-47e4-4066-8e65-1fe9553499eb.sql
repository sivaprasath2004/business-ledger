
-- Shared updated_at trigger function
CREATE OR REPLACE FUNCTION public.tg_set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- ========== profiles ==========
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  full_name TEXT,
  email TEXT,
  profession TEXT,
  business_name TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  locale TEXT NOT NULL DEFAULT 'en-US',
  onboarded BOOLEAN NOT NULL DEFAULT false,
  tour_completed BOOLEAN NOT NULL DEFAULT false,
  theme TEXT NOT NULL DEFAULT 'dark',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self" ON public.profiles FOR ALL TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== customers ==========
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "customers_self" ON public.customers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX customers_user_idx ON public.customers(user_id);
CREATE TRIGGER customers_updated BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== vendors ==========
CREATE TABLE public.vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  address TEXT,
  tax_id TEXT,
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vendors TO authenticated;
GRANT ALL ON public.vendors TO service_role;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vendors_self" ON public.vendors FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX vendors_user_idx ON public.vendors(user_id);
CREATE TRIGGER vendors_updated BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== ledger_entries ==========
CREATE TABLE public.ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ledger_number TEXT,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT,
  description TEXT,
  payment_method TEXT,
  reference_number TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ledger_entries TO authenticated;
GRANT ALL ON public.ledger_entries TO service_role;
ALTER TABLE public.ledger_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ledger_self" ON public.ledger_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ledger_user_date_idx ON public.ledger_entries(user_id, entry_date DESC);
CREATE INDEX ledger_user_type_idx ON public.ledger_entries(user_id, type);
CREATE TRIGGER ledger_updated BEFORE UPDATE ON public.ledger_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== invoices ==========
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'USD',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invoices_self" ON public.invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX invoices_user_idx ON public.invoices(user_id, issue_date DESC);
CREATE TRIGGER invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== calendar_events ==========
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL DEFAULT 'event', -- event, task, reminder, meeting, payment, invoice
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  all_day BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_events TO authenticated;
GRANT ALL ON public.calendar_events TO service_role;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events_self" ON public.calendar_events FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX events_user_starts_idx ON public.calendar_events(user_id, starts_at);
CREATE TRIGGER events_updated BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== notes ==========
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT,
  category TEXT DEFAULT 'personal',
  pinned BOOLEAN NOT NULL DEFAULT false,
  color TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_self" ON public.notes FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX notes_user_idx ON public.notes(user_id, updated_at DESC);
CREATE TRIGGER notes_updated BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
