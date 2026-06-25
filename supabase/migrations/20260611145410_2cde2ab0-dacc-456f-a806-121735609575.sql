ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS view_counter_period text NOT NULL DEFAULT '24h'
  CHECK (view_counter_period IN ('24h','7d','30d','90d','365d','all'));