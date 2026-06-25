
-- Global color palette
CREATE TABLE public.product_colors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  hex text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_colors TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_colors TO authenticated;
GRANT ALL ON public.product_colors TO service_role;
ALTER TABLE public.product_colors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active colors" ON public.product_colors FOR SELECT USING (is_active = true);
CREATE POLICY "Admins view all colors" ON public.product_colors FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert colors" ON public.product_colors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update colors" ON public.product_colors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete colors" ON public.product_colors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_product_colors_updated BEFORE UPDATE ON public.product_colors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Global size list with weight ranges
CREATE TABLE public.product_sizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  label_ar text,
  weight_min_kg numeric(5,2),
  weight_max_kg numeric(5,2),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_sizes_weight_range_check CHECK (
    weight_min_kg IS NULL OR weight_max_kg IS NULL OR weight_max_kg >= weight_min_kg
  )
);
GRANT SELECT ON public.product_sizes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_sizes TO authenticated;
GRANT ALL ON public.product_sizes TO service_role;
ALTER TABLE public.product_sizes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active sizes" ON public.product_sizes FOR SELECT USING (is_active = true);
CREATE POLICY "Admins view all sizes" ON public.product_sizes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert sizes" ON public.product_sizes FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update sizes" ON public.product_sizes FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete sizes" ON public.product_sizes FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_product_sizes_updated BEFORE UPDATE ON public.product_sizes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Per-product color assignment
CREATE TABLE public.product_color_links (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, color_id)
);
GRANT SELECT ON public.product_color_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_color_links TO authenticated;
GRANT ALL ON public.product_color_links TO service_role;
ALTER TABLE public.product_color_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read color links" ON public.product_color_links FOR SELECT USING (true);
CREATE POLICY "Admins insert color links" ON public.product_color_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update color links" ON public.product_color_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete color links" ON public.product_color_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Per-product size assignment
CREATE TABLE public.product_size_links (
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, size_id)
);
GRANT SELECT ON public.product_size_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_size_links TO authenticated;
GRANT ALL ON public.product_size_links TO service_role;
ALTER TABLE public.product_size_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read size links" ON public.product_size_links FOR SELECT USING (true);
CREATE POLICY "Admins insert size links" ON public.product_size_links FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update size links" ON public.product_size_links FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete size links" ON public.product_size_links FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Seed a sensible default palette and size list
INSERT INTO public.product_colors (name, hex, sort_order) VALUES
  ('Black', '#1a1a1a', 0),
  ('Cream', '#f4ead5', 1),
  ('Brown', '#6b4a2b', 2),
  ('Navy', '#1f2a44', 3);

INSERT INTO public.product_sizes (label, weight_min_kg, weight_max_kg, sort_order) VALUES
  ('S', 50, 60, 0),
  ('M', 60, 75, 1),
  ('L', 75, 90, 2),
  ('XL', 90, 110, 3);
