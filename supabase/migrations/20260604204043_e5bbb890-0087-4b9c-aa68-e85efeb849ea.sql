
-- Allow anon/authenticated to read visible team members' rows (the view filters columns).
CREATE POLICY "Public can view visible team members"
ON public.team_members FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- Column-level: revoke broad SELECT, then grant only non-sensitive columns to anon/authenticated.
REVOKE SELECT ON public.team_members FROM anon, authenticated;

GRANT SELECT (
  id, name, slug, role, bio, quote, image_url, cta_label, cta_url,
  socials, is_featured, is_visible, sort_order, created_at, updated_at
) ON public.team_members TO anon, authenticated;

-- Admins read through has_role policy; ensure they keep full column access via service_role / table owner.
GRANT SELECT ON public.team_members TO service_role;
