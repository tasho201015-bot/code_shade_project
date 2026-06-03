
-- Remove public SELECT on base table (contains email/phone)
DROP POLICY IF EXISTS "Public view visible team members" ON public.team_members;

-- Create a public-safe view that excludes email and phone
CREATE OR REPLACE VIEW public.team_members_public AS
SELECT
  id, name, slug, role, bio, quote, image_url,
  cta_label, cta_url, socials,
  is_featured, is_visible, sort_order,
  created_at, updated_at
FROM public.team_members
WHERE is_visible = true;

GRANT SELECT ON public.team_members_public TO anon, authenticated;
