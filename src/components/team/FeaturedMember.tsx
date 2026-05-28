import { motion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import type { TeamMember } from "@/lib/team";
import { SocialIcons } from "./SocialIcons";

export function FeaturedMember({ member }: { member: TeamMember }) {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary/40 via-background to-secondary/30" />
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-7 relative aspect-[4/5] bg-muted shadow-soft overflow-hidden"
        >
          {member.image_url ? (
            <img
              src={member.image_url}
              alt={member.name}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-display text-9xl text-muted-foreground bg-secondary">
              {member.name.charAt(0)}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-tr from-noir/40 via-transparent to-transparent" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="lg:col-span-5"
        >
          <div className="text-[10px] uppercase tracking-luxe text-accent">Featured</div>
          <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-3">{member.role}</div>
          <h2 className="font-display text-4xl md:text-5xl lg:text-6xl mt-2 leading-[1.05] text-balance">
            {member.name}
          </h2>

          {member.quote && (
            <blockquote className="mt-8 relative font-display text-xl md:text-2xl italic leading-snug text-foreground/80 text-balance border-l-2 border-accent pl-6">
              "{member.quote}"
            </blockquote>
          )}

          {member.bio && (
            <p className="mt-6 text-muted-foreground leading-relaxed">{member.bio}</p>
          )}

          <div className="mt-8 flex items-center gap-6 flex-wrap">
            <SocialIcons socials={member.socials ?? {}} email={member.email} phone={member.phone} iconClass="w-5 h-5" />
            {member.cta_url && member.cta_label && (
              <a
                href={member.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow inline-flex bg-noir text-cream px-8 py-3 text-xs uppercase tracking-luxe"
              >
                {member.cta_label}
              </a>
            )}
            <Link to="/team/$slug" params={{ slug: member.slug }} className="text-xs uppercase tracking-luxe link-underline">
              Read story →
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
