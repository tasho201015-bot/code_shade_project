
-- Product FAQs
CREATE TABLE public.product_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  question text NOT NULL,
  question_ar text,
  answer text NOT NULL,
  answer_ar text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_faqs TO authenticated;
GRANT ALL ON public.product_faqs TO service_role;
ALTER TABLE public.product_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active FAQs" ON public.product_faqs FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage FAQs" ON public.product_faqs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX product_faqs_product_idx ON public.product_faqs(product_id, sort_order);
CREATE TRIGGER update_product_faqs_updated_at BEFORE UPDATE ON public.product_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recently viewed (per customer)
CREATE TABLE public.product_recently_viewed (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_recently_viewed TO authenticated;
GRANT ALL ON public.product_recently_viewed TO service_role;
ALTER TABLE public.product_recently_viewed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recent views" ON public.product_recently_viewed FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins read recent views" ON public.product_recently_viewed FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX product_recently_viewed_user_idx ON public.product_recently_viewed(user_id, viewed_at DESC);

-- Back-in-stock subscriptions
CREATE TABLE public.back_in_stock_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  color_id uuid REFERENCES public.product_colors(id) ON DELETE SET NULL,
  size_id uuid REFERENCES public.product_sizes(id) ON DELETE SET NULL,
  channel text NOT NULL DEFAULT 'email',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.back_in_stock_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.back_in_stock_subscriptions TO authenticated;
GRANT ALL ON public.back_in_stock_subscriptions TO service_role;
ALTER TABLE public.back_in_stock_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can subscribe back-in-stock" ON public.back_in_stock_subscriptions FOR INSERT
  WITH CHECK (notified_at IS NULL);
CREATE POLICY "Users view own subscriptions" ON public.back_in_stock_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage subscriptions" ON public.back_in_stock_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX bis_product_idx ON public.back_in_stock_subscriptions(product_id) WHERE notified_at IS NULL;
CREATE UNIQUE INDEX bis_unique_pending ON public.back_in_stock_subscriptions(product_id, email, COALESCE(color_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(size_id, '00000000-0000-0000-0000-000000000000'::uuid)) WHERE notified_at IS NULL;

-- Notification log (extensible: email, whatsapp, ...)
CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text NOT NULL DEFAULT 'email',
  template text NOT NULL,
  recipient text NOT NULL,
  subject text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_log TO service_role;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notification log" ON public.notification_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX notification_log_status_idx ON public.notification_log(status, created_at DESC);
