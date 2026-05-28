import { useRef } from "react";
import type { TeamMember, TeamSettings } from "@/lib/team";
import { MemberCard } from "./MemberCard";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface LayoutProps {
  members: TeamMember[];
  settings: TeamSettings | null;
}

const colsClass = (n: number) => {
  switch (n) {
    case 2: return "grid-cols-1 sm:grid-cols-2";
    case 4: return "grid-cols-2 lg:grid-cols-4";
    case 5: return "grid-cols-2 lg:grid-cols-5";
    case 3:
    default: return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
  }
};

export function GridLayout({ members, settings }: LayoutProps) {
  return (
    <div
      className={`grid ${colsClass(settings?.columns ?? 3)}`}
      style={{ gap: settings?.card_spacing ?? 24 }}
    >
      {members.map((m) => (
        <MemberCard key={m.id} member={m} settings={settings} />
      ))}
    </div>
  );
}

export function AsymmetricalLayout({ members, settings }: LayoutProps) {
  // Editorial irregular grid: alternates tall/wide
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-6 auto-rows-[minmax(200px,auto)]"
      style={{ gap: settings?.card_spacing ?? 24 }}
    >
      {members.map((m, i) => {
        const pattern = i % 5;
        const span =
          pattern === 0 ? "md:col-span-4 md:row-span-2" :
          pattern === 1 ? "md:col-span-2" :
          pattern === 2 ? "md:col-span-2" :
          pattern === 3 ? "md:col-span-3" :
                         "md:col-span-3";
        const aspect = pattern === 0 ? "aspect-[4/5] md:aspect-auto md:h-full" : "aspect-[3/4]";
        return (
          <div key={m.id} className={span}>
            <MemberCard member={m} settings={settings} aspect={aspect} />
          </div>
        );
      })}
    </div>
  );
}

export function MasonryLayout({ members, settings }: LayoutProps) {
  const cols = settings?.columns ?? 3;
  const colClass =
    cols === 2 ? "sm:columns-2" :
    cols === 4 ? "sm:columns-2 lg:columns-4" :
    cols === 5 ? "sm:columns-2 lg:columns-5" :
                 "sm:columns-2 lg:columns-3";
  return (
    <div className={`columns-1 ${colClass}`} style={{ columnGap: settings?.card_spacing ?? 24 }}>
      {members.map((m, i) => {
        const heights = ["aspect-[3/4]", "aspect-[4/5]", "aspect-[3/5]", "aspect-square", "aspect-[4/6]"];
        return (
          <div key={m.id} className="mb-6 break-inside-avoid">
            <MemberCard member={m} settings={settings} aspect={heights[i % heights.length]} />
          </div>
        );
      })}
    </div>
  );
}

export function SliderLayout({ members, settings }: LayoutProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };
  return (
    <div className="relative">
      <div
        ref={ref}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-6 lg:-mx-10 px-6 lg:px-10"
        style={{ gap: settings?.card_spacing ?? 24, scrollbarWidth: "none" }}
      >
        {members.map((m) => (
          <div key={m.id} className="snap-start shrink-0 w-[80%] sm:w-[45%] lg:w-[30%]">
            <MemberCard member={m} settings={settings} />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={() => scroll(-1)}
          aria-label="Previous"
          className="w-12 h-12 border border-border rounded-full inline-flex items-center justify-center hover:bg-noir hover:text-cream hover:border-noir transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => scroll(1)}
          aria-label="Next"
          className="w-12 h-12 border border-border rounded-full inline-flex items-center justify-center hover:bg-noir hover:text-cream hover:border-noir transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export function FeaturedGridLayout({ members, settings }: LayoutProps) {
  if (!members.length) return null;
  const [hero, ...rest] = members;
  return (
    <div className="space-y-12">
      <div className="grid lg:grid-cols-2 gap-8">
        <MemberCard member={hero} settings={settings} aspect="aspect-[4/5]" />
        <div className="flex flex-col justify-center">
          <div className="text-[10px] uppercase tracking-luxe text-accent">Founder</div>
          <h3 className="font-display text-4xl md:text-5xl mt-2">{hero.name}</h3>
          <div className="text-xs uppercase tracking-luxe text-muted-foreground mt-2">{hero.role}</div>
          {hero.bio && <p className="mt-6 text-muted-foreground leading-relaxed">{hero.bio}</p>}
        </div>
      </div>
      {rest.length > 0 && <GridLayout members={rest} settings={settings} />}
    </div>
  );
}
