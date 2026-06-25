CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  title_ar TEXT,
  body TEXT NOT NULL DEFAULT '',
  body_ar TEXT,
  lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en','ar')),
  customer_name TEXT NOT NULL DEFAULT '',
  customer_avatar_url TEXT,
  status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_reviews TO authenticated;
GRANT ALL ON public.product_reviews TO service_role;

CREATE INDEX idx_product_reviews_product
  ON public.product_reviews (product_id, status, is_visible, is_pinned DESC, sort_order ASC, created_at DESC);
CREATE INDEX idx_product_reviews_user ON public.product_reviews (user_id);

CREATE TRIGGER trg_product_reviews_updated
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Public can read approved + visible reviews
CREATE POLICY "Public can view approved reviews"
  ON public.product_reviews FOR SELECT
  USING (status = 'approved' AND is_visible = true);

-- Authenticated users can read their own reviews regardless of status
CREATE POLICY "Users can view their own reviews"
  ON public.product_reviews FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins have full access (insert/update/delete/select via ALL)
CREATE POLICY "Admins can manage all reviews"
  ON public.product_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
