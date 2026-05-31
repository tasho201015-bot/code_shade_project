
-- ============ Sales Booster tables (mirror src/lib/selling-types.ts) ============

-- BUNDLES
CREATE TABLE public.sb_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'Untitled bundle',
  description text NOT NULL DEFAULT '',
  product_ids uuid[] NOT NULL DEFAULT '{}',
  original_price_override numeric,
  discount_mode text NOT NULL DEFAULT 'percent' CHECK (discount_mode IN ('fixed','percent')),
  discount_value numeric NOT NULL DEFAULT 10,
  cover_image text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  badge text NOT NULL DEFAULT '',
  starts_at timestamptz,
  ends_at timestamptz,
  locations text[] NOT NULL DEFAULT '{product}',
  sort_order integer NOT NULL DEFAULT 0,
  purchases integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sb_bundles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sb_bundles TO authenticated;
GRANT ALL ON public.sb_bundles TO service_role;

ALTER TABLE public.sb_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active bundles" ON public.sb_bundles
  FOR SELECT TO anon, authenticated
  USING (active = true);

CREATE POLICY "Admins read all bundles" ON public.sb_bundles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert bundles" ON public.sb_bundles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update bundles" ON public.sb_bundles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete bundles" ON public.sb_bundles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sb_bundles_updated_at
  BEFORE UPDATE ON public.sb_bundles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CROSS-SELLS
CREATE TABLE public.sb_cross_sells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_product_id uuid NOT NULL,
  suggestions jsonb NOT NULL DEFAULT '[]'::jsonb,
  section_title text NOT NULL DEFAULT 'You May Also Like',
  style text NOT NULL DEFAULT 'grid' CHECK (style IN ('grid','carousel','list')),
  max_shown integer NOT NULL DEFAULT 3,
  location text NOT NULL DEFAULT 'product' CHECK (location IN ('product','cart','checkout','homepage')),
  active boolean NOT NULL DEFAULT true,
  clicks integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sb_cross_sells TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sb_cross_sells TO authenticated;
GRANT ALL ON public.sb_cross_sells TO service_role;

ALTER TABLE public.sb_cross_sells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active cross_sells" ON public.sb_cross_sells
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins read all cross_sells" ON public.sb_cross_sells
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert cross_sells" ON public.sb_cross_sells
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update cross_sells" ON public.sb_cross_sells
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete cross_sells" ON public.sb_cross_sells
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sb_cross_sells_updated_at
  BEFORE UPDATE ON public.sb_cross_sells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- UPSELLS
CREATE TABLE public.sb_upsells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_product_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'upgrade' CHECK (type IN ('upgrade','quantity','limited','bundle')),
  headline text NOT NULL DEFAULT '',
  note text NOT NULL DEFAULT '',
  suggested_product_id uuid,
  suggested_bundle_id uuid REFERENCES public.sb_bundles(id) ON DELETE SET NULL,
  original_price numeric NOT NULL DEFAULT 0,
  upsell_price numeric NOT NULL DEFAULT 0,
  badge text NOT NULL DEFAULT '',
  countdown_ends_at timestamptz,
  position text NOT NULL DEFAULT 'below_cart_btn' CHECK (position IN ('below_cart_btn','popup','cart','checkout')),
  active boolean NOT NULL DEFAULT true,
  conversions integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sb_upsells TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sb_upsells TO authenticated;
GRANT ALL ON public.sb_upsells TO service_role;

ALTER TABLE public.sb_upsells ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active upsells" ON public.sb_upsells
  FOR SELECT TO anon, authenticated USING (active = true);
CREATE POLICY "Admins read all upsells" ON public.sb_upsells
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert upsells" ON public.sb_upsells
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update upsells" ON public.sb_upsells
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete upsells" ON public.sb_upsells
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sb_upsells_updated_at
  BEFORE UPDATE ON public.sb_upsells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SETTINGS (singleton: store the full SellingSettings as JSONB)
CREATE TABLE public.sb_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.sb_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.sb_settings TO authenticated;
GRANT ALL ON public.sb_settings TO service_role;

ALTER TABLE public.sb_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read settings" ON public.sb_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins insert settings" ON public.sb_settings
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update settings" ON public.sb_settings
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER sb_settings_updated_at
  BEFORE UPDATE ON public.sb_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings row
INSERT INTO public.sb_settings (data, singleton) VALUES ('{}'::jsonb, true);

-- Helpful indexes
CREATE INDEX sb_bundles_sort_order_idx ON public.sb_bundles(sort_order);
CREATE INDEX sb_cross_sells_trigger_idx ON public.sb_cross_sells(trigger_product_id);
CREATE INDEX sb_upsells_trigger_idx ON public.sb_upsells(trigger_product_id);
