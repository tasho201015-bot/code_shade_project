import { supabase } from "@/integrations/supabase/client";

export interface TeamSocials {
  instagram?: string;
  twitter?: string;
  linkedin?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
  behance?: string;
  dribbble?: string;
  website?: string;
  [key: string]: string | undefined;
}


export interface TeamMember {
  id: string;
  name: string;
  slug: string;
  role: string;
  bio: string | null;
  quote: string | null;
  image_url: string | null;
  email: string | null;
  phone: string | null;
  cta_label: string | null;
  cta_url: string | null;
  socials: TeamSocials;
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type TeamLayout = "grid" | "asymmetrical" | "slider" | "masonry" | "featured";

export interface TeamSettings {
  id: string;
  title: string;
  subtitle: string | null;
  eyebrow: string | null;
  layout: TeamLayout;
  columns: number;
  card_radius: number;
  hover_effect: "zoom" | "fade" | "lift" | "glow";
  card_spacing: number;
  background_color: string | null;
  background_image: string | null;
  overlay_opacity: number;
  animations_enabled: boolean;
  dark_mode: boolean;
  show_featured_section: boolean;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `member-${Date.now()}`;
}

export async function fetchPublicTeam(): Promise<{ members: TeamMember[]; settings: TeamSettings | null }> {
  const [m, s] = await Promise.all([
    // Use the public view which excludes email/phone (admin-only PII)
    supabase.from("team_members_public").select("*").order("sort_order"),
    supabase.from("team_settings").select("*").limit(1).maybeSingle(),
  ]);
  return {
    members: ((m.data ?? []) as unknown as TeamMember[]),
    settings: (s.data as unknown as TeamSettings | null) ?? null,
  };
}
