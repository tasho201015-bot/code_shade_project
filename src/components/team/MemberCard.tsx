import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import type { TeamMember, TeamSettings } from "@/lib/team";
import { SocialIcons } from "./SocialIcons";

interface Props {
  member: TeamMember;
  settings: TeamSettings | null;
  aspect?: string; // tailwind aspect class override
}

export function MemberCard({ member, settings, aspect = "aspect-[3/4]" }: Props) {
  const hover = settings?.hover_effect ?? "zoom";
  const radius = settings?.card_radius ?? 2;

  return (
    <motion.article
      initial={settings?.animations_enabled ? { opacity: 0, y: 24 } : false}
      whileInView={settings?.animations_enabled ? { opacity: 1, y: 0 } : undefined}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover === "lift" ? { y: -8 } : undefined}
      className="group relative"
      style={{ borderRadius: radius }}
    >
      <Link to="/team/$slug" params={{ slug: member.slug }} className="block">
        <div
          className={`relative ${aspect} overflow-hidden bg-muted shadow-soft`}
          style={{ borderRadius: radius }}
        >
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              loading="lazy"
              decoding="async"
              className={`w-full h-full object-cover transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
                hover === "zoom" ? "group-hover:scale-110" : ""
              } ${hover === "fade" ? "group-hover:opacity-80" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary text-muted-foreground font-display text-5xl">
              {member.name.charAt(0)}
            </div>
          )}

          {/* Elegant overlay fade */}
          <div className="absolute inset-0 bg-gradient-to-t from-noir/85 via-noir/20 to-transparent opacity-90" />

          {/* Glow border on hover */}
          {hover === "glow" && (
            <div className="absolute inset-0 ring-1 ring-accent/0 group-hover:ring-accent/60 transition-all duration-700" />
          )}

          {/* Bottom content */}
          <div className="absolute inset-x-0 bottom-0 p-6 text-cream">
            <div className="text-[10px] uppercase tracking-luxe text-accent">{member.role}</div>
            <h3 className="font-display text-2xl mt-1 leading-tight">{member.name}</h3>

            {/* Socials fade in */}
            <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-1 group-hover:translate-y-0">
              <SocialIcons socials={member.socials ?? {}} email={member.email} phone={member.phone} iconClass="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}
