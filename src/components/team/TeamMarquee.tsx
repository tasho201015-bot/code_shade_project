import { useEffect, useState } from "react";
import { fetchPublicTeam, type TeamMember } from "@/lib/team";
import { Reveal } from "@/components/site/Reveal";

export function TeamMarquee() {
  const [members, setMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchPublicTeam().then(({ members }) => {
      if (mounted) setMembers(members);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (members.length === 0) return null;

  const loop = [...members, ...members];

  return (
    <section className="py-24 lg:py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-center mb-14">
            <div className="text-[10px] tracking-luxe uppercase text-accent">Team</div>
            <h2 className="font-display text-4xl md:text-5xl mt-2">The People Behind Malaz</h2>
          </div>
        </Reveal>
      </div>
      <div className="overflow-hidden w-full">
        <div className="flex w-max animate-team-marquee">
          {loop.map((m, i) => (
            <div
              key={`${m.id}-${i}`}
              className="flex items-center gap-10 lg:gap-16 px-8 lg:px-12 border-r border-border/60"
            >
              <div className="text-center whitespace-nowrap">
                <div className="font-display text-3xl md:text-4xl leading-tight">{m.name}</div>
                <div className="mt-2 text-[11px] uppercase tracking-luxe text-muted-foreground font-light">
                  {m.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
