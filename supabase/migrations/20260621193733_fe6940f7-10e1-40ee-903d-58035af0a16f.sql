
-- Shipping settings singleton
CREATE TABLE public.shipping_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),
  mode text NOT NULL DEFAULT 'flat' CHECK (mode IN ('flat','per_governorate')),
  flat_fee numeric NOT NULL DEFAULT 0,
  free_shipping_threshold numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_settings TO authenticated;
GRANT ALL ON public.shipping_settings TO service_role;

ALTER TABLE public.shipping_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_settings readable by everyone"
  ON public.shipping_settings FOR SELECT
  USING (true);

CREATE POLICY "shipping_settings admin manage"
  ON public.shipping_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shipping_settings_set_updated_at
  BEFORE UPDATE ON public.shipping_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.shipping_settings (id, mode, flat_fee, free_shipping_threshold)
  VALUES (true, 'flat', 0, 0)
  ON CONFLICT (id) DO NOTHING;

-- Per-governorate rates
CREATE TABLE public.shipping_rates (
  governorate text PRIMARY KEY,
  fee numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.shipping_rates TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.shipping_rates TO authenticated;
GRANT ALL ON public.shipping_rates TO service_role;

ALTER TABLE public.shipping_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shipping_rates readable by everyone"
  ON public.shipping_rates FOR SELECT
  USING (true);

CREATE POLICY "shipping_rates admin manage"
  ON public.shipping_rates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER shipping_rates_set_updated_at
  BEFORE UPDATE ON public.shipping_rates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
