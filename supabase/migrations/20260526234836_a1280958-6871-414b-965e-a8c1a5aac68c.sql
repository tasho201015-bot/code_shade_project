
-- 1. Revoke EXECUTE on SECURITY DEFINER functions from public roles (called only via service_role)
REVOKE EXECUTE ON FUNCTION public.decrement_product_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_product_stock(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_grant_admin() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_products_to_uncategorized() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_uncategorized_delete() FROM PUBLIC, anon, authenticated;
-- has_role is used inside RLS policies; revoke from anon but keep for authenticated
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- 2. Lock down user_roles: add restrictive policy preventing non-admin INSERT/UPDATE/DELETE
CREATE POLICY "Only admins can insert user_roles"
  ON public.user_roles AS RESTRICTIVE
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update user_roles"
  ON public.user_roles AS RESTRICTIVE
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete user_roles"
  ON public.user_roles AS RESTRICTIVE
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Restrict product-images bucket: drop broad SELECT (listing) policy.
-- Public URL access continues to work via the public-bucket CDN endpoint and does not need an RLS policy.
DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
