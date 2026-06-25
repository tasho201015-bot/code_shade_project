
DO $$ BEGIN
  CREATE TYPE public.variant_status AS ENUM ('available', 'out_of_stock', 'hidden');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE public.product_variant_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  color_id uuid NOT NULL REFERENCES public.product_colors(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.product_sizes(id) ON DELETE CASCADE,
  status public.variant_status NOT NULL DEFAULT 'available',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (product_id, color_id, size_id)
);

CREATE INDEX product_variant_availability_product_idx ON public.product_variant_availability(product_id);

GRANT SELECT ON public.product_variant_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_variant_availability TO authenticated;
GRANT ALL ON public.product_variant_availability TO service_role;

ALTER TABLE public.product_variant_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read variant availability" ON public.product_variant_availability
  FOR SELECT USING (true);
CREATE POLICY "Admins insert variant availability" ON public.product_variant_availability
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update variant availability" ON public.product_variant_availability
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete variant availability" ON public.product_variant_availability
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_product_variant_availability_updated_at
  BEFORE UPDATE ON public.product_variant_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
