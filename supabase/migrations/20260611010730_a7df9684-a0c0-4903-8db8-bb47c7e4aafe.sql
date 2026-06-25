ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(10,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN IF NOT EXISTS offer_starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS offer_enabled boolean NOT NULL DEFAULT false;