
-- Arabic content fields (additive only). English columns remain the source of truth.

-- Products: add Arabic + SEO fields (EN + AR)
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_title_ar text,
  ADD COLUMN IF NOT EXISTS meta_description_ar text;

-- Categories: add Arabic + SEO fields
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS meta_title_ar text,
  ADD COLUMN IF NOT EXISTS meta_description_ar text;

-- Bundles
ALTER TABLE public.sb_bundles
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar text;

-- Cross-sells (suggestion labels live inside the jsonb `suggestions` array as { label, label_ar })
ALTER TABLE public.sb_cross_sells
  ADD COLUMN IF NOT EXISTS section_title_ar text;

-- Upsells
ALTER TABLE public.sb_upsells
  ADD COLUMN IF NOT EXISTS headline_ar text,
  ADD COLUMN IF NOT EXISTS note_ar text,
  ADD COLUMN IF NOT EXISTS badge_ar text;

-- Team members
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS role_ar text,
  ADD COLUMN IF NOT EXISTS bio_ar text,
  ADD COLUMN IF NOT EXISTS quote_ar text,
  ADD COLUMN IF NOT EXISTS cta_label_ar text;

-- Team settings
ALTER TABLE public.team_settings
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS subtitle_ar text,
  ADD COLUMN IF NOT EXISTS eyebrow_ar text;

-- sb_settings.data is jsonb — Arabic siblings for section titles and labels live inside that jsonb
-- (e.g. { offersTitle, offersTitle_ar, bundlesTitle, bundlesTitle_ar, ... }); no column change needed.
