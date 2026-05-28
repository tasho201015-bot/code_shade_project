
-- TEAM MEMBERS
CREATE TABLE public.team_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  role text NOT NULL,
  bio text,
  quote text,
  image_url text,
  email text,
  phone text,
  cta_label text,
  cta_url text,
  socials jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view visible team members" ON public.team_members
  FOR SELECT USING (is_visible = true);
CREATE POLICY "Admins view all team members" ON public.team_members
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert team members" ON public.team_members
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update team members" ON public.team_members
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete team members" ON public.team_members
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_team_members_sort ON public.team_members(sort_order);
CREATE INDEX idx_team_members_visible ON public.team_members(is_visible);

-- TEAM SETTINGS (singleton)
CREATE TABLE public.team_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL DEFAULT 'The People Behind Malaz',
  subtitle text DEFAULT 'Crafting timeless modest fashion with vision, elegance, and detail.',
  eyebrow text DEFAULT 'Our Atelier',
  layout text NOT NULL DEFAULT 'grid',
  columns integer NOT NULL DEFAULT 3,
  card_radius integer NOT NULL DEFAULT 2,
  hover_effect text NOT NULL DEFAULT 'zoom',
  card_spacing integer NOT NULL DEFAULT 24,
  background_color text,
  background_image text,
  overlay_opacity numeric NOT NULL DEFAULT 0.4,
  animations_enabled boolean NOT NULL DEFAULT true,
  dark_mode boolean NOT NULL DEFAULT false,
  show_featured_section boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.team_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_settings TO authenticated;
GRANT ALL ON public.team_settings TO service_role;

ALTER TABLE public.team_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public view team settings" ON public.team_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins update team settings" ON public.team_settings
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert team settings" ON public.team_settings
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER team_settings_updated_at
  BEFORE UPDATE ON public.team_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default settings row
INSERT INTO public.team_settings (title) VALUES ('The People Behind Malaz');
