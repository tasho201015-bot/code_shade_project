
DROP POLICY IF EXISTS "anyone can record a view" ON public.product_views;
CREATE POLICY "anyone can record a view"
  ON public.product_views
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    product_id IS NOT NULL
    AND session_id IS NOT NULL
    AND length(session_id) BETWEEN 1 AND 128
  );

DROP POLICY IF EXISTS "admins delete product_views" ON public.product_views;
CREATE POLICY "admins delete product_views"
  ON public.product_views
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "anyone can upsert presence insert" ON public.product_live_visitors;
CREATE POLICY "anyone can upsert presence insert"
  ON public.product_live_visitors
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    product_id IS NOT NULL
    AND session_id IS NOT NULL
    AND length(session_id) BETWEEN 1 AND 128
  );

DROP POLICY IF EXISTS "anyone can upsert presence update" ON public.product_live_visitors;
CREATE POLICY "anyone can upsert presence update"
  ON public.product_live_visitors
  FOR UPDATE
  TO anon, authenticated
  USING (product_id IS NOT NULL AND session_id IS NOT NULL)
  WITH CHECK (
    product_id IS NOT NULL
    AND session_id IS NOT NULL
    AND length(session_id) BETWEEN 1 AND 128
  );

DROP POLICY IF EXISTS "admins delete live visitors" ON public.product_live_visitors;
CREATE POLICY "admins delete live visitors"
  ON public.product_live_visitors
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));
