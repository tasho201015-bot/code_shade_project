-- 1) Restrict client-side access to sensitive order columns (confirmation_token, paymob_*)
REVOKE SELECT ON public.orders FROM authenticated;
REVOKE SELECT ON public.orders FROM anon;
GRANT SELECT (id, user_id, created_at, updated_at, phone, shipping_address, status, total, payment_provider, confirmed_at) ON public.orders TO authenticated;

-- 2) Stop exposing team_members.phone and team_members.email to anon/authenticated;
-- public reads must go through the team_members_public view which excludes those columns.
DROP POLICY IF EXISTS "Public can view visible team members" ON public.team_members;