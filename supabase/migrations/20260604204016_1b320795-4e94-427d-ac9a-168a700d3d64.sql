
-- 1) Recreate team_members_public with security_invoker so RLS of the querying user applies
DROP VIEW IF EXISTS public.team_members_public;
CREATE VIEW public.team_members_public
WITH (security_invoker = on) AS
SELECT id, name, slug, role, bio, quote, image_url, cta_label, cta_url, socials,
       is_featured, is_visible, sort_order, created_at, updated_at
FROM public.team_members
WHERE is_visible = true;

GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Ensure base table allows the columns selected by the view to be read by anon/authenticated
-- through RLS on team_members. (Existing RLS policies on team_members remain in force; the view
-- now enforces them as the caller rather than the view owner.)

-- 2) Null out confirmation_token for already-confirmed orders so it cannot be re-read.
UPDATE public.orders
SET confirmation_token = NULL
WHERE confirmed_at IS NOT NULL
  AND confirmation_token IS NOT NULL;
