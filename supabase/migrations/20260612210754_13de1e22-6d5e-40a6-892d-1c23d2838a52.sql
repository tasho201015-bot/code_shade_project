DROP POLICY IF EXISTS "views readable by all" ON public.product_views;

CREATE POLICY "admins read product_views"
  ON public.product_views
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert orders"
  ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete orders"
  ON public.orders
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins insert order_items"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update order_items"
  ON public.order_items
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete order_items"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));