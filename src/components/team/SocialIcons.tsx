import { Instagram, Twitter, Linkedin, Facebook, Youtube, Globe, Mail, Phone } from "lucide-react";
import type { TeamSocials } from "@/lib/team";

const ICONS: Record<keyof TeamSocials, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  facebook: Facebook,
  tiktok: Globe,
  youtube: Youtube,
  behance: Globe,
  dribbble: Globe,
  website: Globe,
};

export function SocialIcons({
  socials,
  email,
  phone,
  className = "",
  iconClass = "w-4 h-4",
}: {
  socials: TeamSocials;
  email?: string | null;
  phone?: string | null;
  className?: string;
  iconClass?: string;
}) {
  const entries = Object.entries(socials).filter(([, v]) => v) as [string, string][];

  if (!entries.length && !email && !phone) return null;
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {entries.map(([key, url]) => {
        const Icon = ICONS[key as keyof TeamSocials] ?? Globe;
        return (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={key}
            className="hover:text-accent transition-colors"
          >
            <Icon className={iconClass} />
          </a>
        );
      })}


      {email && (
        <a href={`mailto:${email}`} aria-label="Email" className="hover:text-accent transition-colors">
          <Mail className={iconClass} />
        </a>
      )}
      {phone && (
        <a href={`tel:${phone}`} aria-label="Phone" className="hover:text-accent transition-colors">
          <Phone className={iconClass} />
        </a>
      )}
    </div>
  );
}
