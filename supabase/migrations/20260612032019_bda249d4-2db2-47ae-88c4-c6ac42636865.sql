DROP POLICY IF EXISTS "live visitors readable by all" ON public.product_live_visitors;
CREATE POLICY "admins read live visitors" ON public.product_live_visitors
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));