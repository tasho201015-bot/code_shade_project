import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackButton } from "@/components/site/BackButton";
import { supabase } from "@/integrations/supabase/client";
import { SocialIcons } from "@/components/team/SocialIcons";
import type { TeamMember } from "@/lib/team";

export const Route = createFileRoute("/team/$slug")({
  component: MemberProfile,
});

function MemberProfile() {
  const { slug } = Route.useParams();
  const [member, setMember] = useState<TeamMember | null | undefined>(undefined);

  useEffect(() => {
    supabase
      .from("team_members_public")
      .select("*")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => setMember((data as unknown as TeamMember) ?? null));
  }, [slug]);

  if (member === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>
    );
  }

  if (member === null) {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="pt-40 pb-32 max-w-3xl mx-auto px-6 text-center">
          <h1 className="font-display text-4xl">Profile not found</h1>
          <Link to="/team" className="link-underline text-xs uppercase tracking-luxe mt-6 inline-block">
            ← Back to team
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen text-foreground">
      <Header />
      <div className="pt-28 pb-24 max-w-7xl mx-auto px-6 lg:px-10">
        <BackButton />
        <div className="mt-8 grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <motion.div
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative aspect-[4/5] bg-muted overflow-hidden shadow-soft"
          >
            {member.image_url ? (
              <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-display text-9xl bg-secondary text-muted-foreground">
                {member.name.charAt(0)}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1 }}
          >
            <div className="text-[10px] uppercase tracking-luxe text-accent">{member.role}</div>
            <h1 className="font-display text-5xl md:text-6xl mt-2 leading-tight text-balance">{member.name}</h1>
            {member.quote && (
              <blockquote className="mt-8 font-display text-2xl italic leading-snug border-l-2 border-accent pl-6 text-foreground/80">
                "{member.quote}"
              </blockquote>
            )}
            {member.bio && <p className="mt-8 text-muted-foreground leading-relaxed">{member.bio}</p>}

            <div className="mt-10 pt-8 border-t border-border space-y-5">
              <SocialIcons socials={member.socials ?? {}} email={member.email} phone={member.phone} iconClass="w-5 h-5" />
              {member.cta_url && member.cta_label && (
                <a
                  href={member.cta_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-glow inline-flex bg-noir text-cream px-8 py-4 text-xs uppercase tracking-luxe"
                >
                  {member.cta_label}
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
