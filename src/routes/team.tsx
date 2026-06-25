import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { fetchPublicTeam, type TeamMember, type TeamSettings } from "@/lib/team";
import { FeaturedMember } from "@/components/team/FeaturedMember";
import {
  GridLayout,
  AsymmetricalLayout,
  MasonryLayout,
  SliderLayout,
  FeaturedGridLayout,
} from "@/components/team/TeamLayouts";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "The People Behind Malaz — Our Atelier" },
      { name: "description", content: "Meet the creative minds crafting timeless modest fashion at Malaz — founders, designers, and storytellers behind every collection." },
      { property: "og:title", content: "The People Behind Malaz" },
      { property: "og:description", content: "Meet the creative minds behind Malaz — designers, founders, and storytellers." },
    ],
  }),
  component: TeamPage,
});

function TeamSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] bg-muted animate-pulse" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <div className="text-[10px] uppercase tracking-luxe text-accent">Coming Soon</div>
      <h3 className="font-display text-3xl mt-2">Our story is being written</h3>
      <p className="text-muted-foreground mt-4 max-w-md mx-auto">
        The people behind Malaz will be introduced here shortly.
      </p>
    </div>
  );
}

function TeamPage() {
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [settings, setSettings] = useState<TeamSettings | null>(null);

  useEffect(() => {
    fetchPublicTeam().then((d) => {
      setMembers(d.members);
      setSettings(d.settings);
    });
  }, []);

  const featured = members?.find((m) => m.is_featured) ?? null;
  const others = members?.filter((m) => !featured || m.id !== featured.id) ?? [];
  const layout = settings?.layout ?? "grid";

  const renderLayout = () => {
    if (!others.length) return null;
    switch (layout) {
      case "asymmetrical": return <AsymmetricalLayout members={others} settings={settings} />;
      case "masonry":      return <MasonryLayout members={others} settings={settings} />;
      case "slider":       return <SliderLayout members={others} settings={settings} />;
      case "featured":     return <FeaturedGridLayout members={others} settings={settings} />;
      case "grid":
      default:             return <GridLayout members={others} settings={settings} />;
    }
  };

  const bgStyle = settings?.background_image
    ? { backgroundImage: `url(${settings.background_image})`, backgroundSize: "cover", backgroundPosition: "center" }
    : settings?.background_color
    ? { backgroundColor: settings.background_color }
    : {};

  return (
    <div className={`min-h-screen ${settings?.dark_mode ? "text-cream" : "text-foreground"}`}>
      <Header />

      {/* Hero header */}
      <section className="relative pt-40 pb-20 lg:pt-48 lg:pb-28" style={bgStyle}>
        {settings?.background_image && (
          <div className="absolute inset-0 bg-noir" style={{ opacity: settings.overlay_opacity }} />
        )}
        <div className="relative max-w-5xl mx-auto px-6 lg:px-10 text-center">
          <Reveal>
            <div className="text-[10px] uppercase tracking-luxe text-accent">
              {settings?.eyebrow ?? "Our Atelier"}
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl mt-5 leading-[0.95] text-balance">
              {settings?.title ?? "The People Behind Malaz"}
            </h1>
          </Reveal>
          {settings?.subtitle && (
            <Reveal delay={0.2}>
              <p className="mt-8 text-muted-foreground max-w-2xl mx-auto leading-relaxed text-lg">
                {settings.subtitle}
              </p>
            </Reveal>
          )}
        </div>
      </section>

      {/* Featured member */}
      {settings?.show_featured_section && featured && <FeaturedMember member={featured} />}

      {/* Members */}
      <section className="py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          {members === null ? (
            <TeamSkeleton />
          ) : others.length === 0 && !featured ? (
            <EmptyState />
          ) : (
            renderLayout()
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}
