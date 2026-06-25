
CREATE TABLE public.product_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);
CREATE INDEX idx_product_views_product_viewed ON public.product_views(product_id, viewed_at DESC);
CREATE INDEX idx_product_views_session ON public.product_views(product_id, session_id, viewed_at DESC);

GRANT SELECT ON public.product_views TO anon, authenticated;
GRANT ALL ON public.product_views TO service_role;
ALTER TABLE public.product_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views readable by all" ON public.product_views FOR SELECT USING (true);

CREATE TABLE public.product_live_visitors (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, session_id)
);
CREATE INDEX idx_product_live_visitors_last_seen ON public.product_live_visitors(product_id, last_seen DESC);

GRANT SELECT ON public.product_live_visitors TO anon, authenticated;
GRANT ALL ON public.product_live_visitors TO service_role;
ALTER TABLE public.product_live_visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "live visitors readable by all" ON public.product_live_visitors FOR SELECT USING (true);
