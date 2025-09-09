-- Přidání sloupce shipped do tabulky orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS shipped BOOLEAN DEFAULT FALSE;

-- Index pro rychlé vyhledávání podle shipped statusu
CREATE INDEX IF NOT EXISTS idx_orders_shipped ON public.orders(shipped);
