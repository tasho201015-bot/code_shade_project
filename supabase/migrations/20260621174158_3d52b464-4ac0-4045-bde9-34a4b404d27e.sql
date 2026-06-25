ALTER TABLE public.sb_cross_sells DROP CONSTRAINT IF EXISTS sb_cross_sells_location_check;
ALTER TABLE public.sb_cross_sells
  ADD CONSTRAINT sb_cross_sells_location_check
  CHECK (location IN ('product','cart','checkout','homepage','post_purchase'));