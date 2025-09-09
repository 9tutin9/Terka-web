-- Přidat sloupec size a odstranit diameter_mm
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS size TEXT;

-- Odstranit starý sloupec diameter_mm
ALTER TABLE public.products 
DROP COLUMN IF EXISTS diameter_mm;

-- Přidat index pro rychlejší vyhledávání podle velikosti
CREATE INDEX IF NOT EXISTS idx_products_size ON public.products(size);

-- Aktualizovat RLS policies (pokud je potřeba)
-- Policies už existují, takže jen refresh schema
SELECT pg_notify('pgrst', 'reload schema');
