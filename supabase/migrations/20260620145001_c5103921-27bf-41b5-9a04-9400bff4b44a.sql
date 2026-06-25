-- Add multi-location support to cross-sells and upsells
ALTER TABLE public.sb_cross_sells
  ADD COLUMN IF NOT EXISTS locations text[] NOT NULL DEFAULT ARRAY[]::text[];

ALTER TABLE public.sb_upsells
  ADD COLUMN IF NOT EXISTS positions text[] NOT NULL DEFAULT ARRAY[]::text[];

-- Backfill from existing single-value columns
UPDATE public.sb_cross_sells
SET locations = ARRAY[location]
WHERE (locations IS NULL OR array_length(locations, 1) IS NULL)
  AND location IS NOT NULL;

UPDATE public.sb_upsells
SET positions = ARRAY[position]
WHERE (positions IS NULL OR array_length(positions, 1) IS NULL)
  AND position IS NOT NULL;