-- Tabulka pro objednávky
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  address_line TEXT,
  address_city TEXT,
  address_zip TEXT,
  amount DECIMAL(10,2) NOT NULL,
  vs TEXT,
  ss TEXT,
  payment_message TEXT,
  delivery_note TEXT,
  qr_png TEXT,
  qr_code TEXT,
  payment_info JSONB,
  items JSONB,
  paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies pro orders
DROP POLICY IF EXISTS "public orders read" ON public.orders;
CREATE POLICY "public orders read" ON public.orders
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "admin orders write" ON public.orders;
CREATE POLICY "admin orders write" ON public.orders
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.admin_users u WHERE u.email = auth.email()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users u WHERE u.email = auth.email()));

-- Indexy pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_vs ON public.orders(vs);
CREATE INDEX IF NOT EXISTS idx_orders_paid ON public.orders(paid);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

-- Trigger pro updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
