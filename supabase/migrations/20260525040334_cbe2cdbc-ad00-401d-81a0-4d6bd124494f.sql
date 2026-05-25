-- Add Arabic localization fields
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text;

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS name_ar text;