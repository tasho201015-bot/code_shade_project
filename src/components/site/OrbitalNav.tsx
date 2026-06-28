import { useNavigate } from "@tanstack/react-router";
import { Home, ShoppingBag, Grid3x3, Gem, Sparkles, Box, Shield } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type OrbitItem = {
  key: string;
  label: string;
  Icon: typeof Home;
  onClick: () => void;
};

export function OrbitalNav() {
  const nav = useNavigate();
  const { toggle, lang } = useI18n();
  const { isAdmin } = useAuth();

  const items: OrbitItem[] = [
    { key: "home", label: "Home", Icon: Home, onClick: () => nav({ to: "/" }) },
    {
      key: "shop",
      label: "Shop",
      Icon: ShoppingBag,
      onClick: () => nav({ to: "/shop", search: { category: "all" } as never }),
    },
    {
      key: "collections",
      label: "Collections",
      Icon: Grid3x3,
      onClick: () => nav({ to: "/categories" }),
    },
    { key: "atelier", label: "Atelier", Icon: Gem, onClick: () => nav({ to: "/team" }) },
    {
      key: "new",
      label: "New",
      Icon: Sparkles,
      onClick: () => nav({ to: "/shop", search: { category: "new-arrivals" } as never }),
    },
    { key: "ar", label: lang === "en" ? "العربية" : "English", Icon: Box, onClick: () => toggle() },
    ...(isAdmin
      ? [{ key: "admin", label: "Admin", Icon: Shield, onClick: () => nav({ to: "/admin" }) }]
      : []),
  ];

  const count = items.length;
  // Radius expressed in CSS so it scales with the container
  const radiusCss = "calc(clamp(280px, 60vmin, 640px) / 2)";

  return (
    <div
      className="relative pointer-events-none select-none"
      style={{
        width: "clamp(280px, 60vmin, 640px)",
        height: "clamp(280px, 60vmin, 640px)",
      }}
      aria-label="Orbital navigation"
    >
      <style>{`
        @keyframes malaz-orbit-spin { to { transform: rotate(360deg); } }
        @keyframes malaz-orbit-counter { to { transform: rotate(-360deg); } }
        @keyframes malaz-orbit-shimmer { to { transform: rotate(360deg); } }
        .malaz-orbit-spin { animation: malaz-orbit-spin 38s linear infinite; transform-origin: 50% 50%; will-change: transform; }
        .malaz-orbit-counter { animation: malaz-orbit-counter 38s linear infinite; transform-origin: 50% 50%; will-change: transform; }
        .malaz-orbit-shimmer { animation: malaz-orbit-shimmer 22s linear infinite; transform-origin: 50% 50%; }
        @media (prefers-reduced-motion: reduce) {
          .malaz-orbit-spin, .malaz-orbit-counter, .malaz-orbit-shimmer { animation: none; }
        }
        /* backdrop-filter on a continuously-rotating element forces the GPU
           to re-sample the framebuffer every frame for each of the 7 icons —
           the single biggest jank source on Adreno 5xx-class mobile GPUs.
           Drop it on touch devices; the gradient + border already read as a
           solid pill against the dark background. */
        @media (hover: none), (pointer: coarse) {
          .malaz-orbit-btn { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
        }
      `}</style>


      {/* Outer ring */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          border: "1px solid rgba(216,138,58,0.18)",
          boxShadow: "inset 0 0 60px rgba(183,106,31,0.08), 0 0 50px rgba(183,106,31,0.10)",
          background:
            "radial-gradient(circle at center, rgba(0,0,0,0) 58%, rgba(183,106,31,0.05) 100%)",
        }}
      />
      {/* Inner secondary ring */}
      <div
        className="absolute rounded-full"
        style={{
          inset: "7%",
          border: "1px dashed rgba(216,138,58,0.10)",
        }}
      />
      {/* Shimmer reflection traveling around the ring */}
      <div className="absolute inset-0 rounded-full malaz-orbit-shimmer">
        <div
          className="absolute"
          style={{
            top: "-6px",
            left: "50%",
            width: "120px",
            height: "120px",
            transform: "translate(-50%, 0)",
            background: "radial-gradient(circle, rgba(216,138,58,0.45) 0%, rgba(216,138,58,0) 70%)",
            filter: "blur(10px)",
          }}
        />
      </div>

      {/* Rotating icon layer */}
      <div key={count} className="absolute inset-0 malaz-orbit-spin">
        {items.map((item, i) => {
          const angle = (360 / count) * i - 90;
          const { Icon } = item;
          return (
            // Zero-size anchor at the exact orbit point (constant radius).
            <div
              key={item.key}
              className="absolute"
              style={{
                top: "50%",
                left: "50%",
                width: 0,
                height: 0,
                transform: `rotate(${angle}deg) translateY(calc(-1 * ${radiusCss})) rotate(${-angle}deg)`,
              }}
            >
              {/* Centering wrapper: sized to button, translated so its center sits on the anchor. */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "max-content",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* Counter-rotation wrapper: spins -360deg around its own center (= button center)
                    so the icon graphic and label always stay upright. */}
                <div className="malaz-orbit-counter">
                  <button
                    type="button"
                    onClick={item.onClick}
                    aria-label={item.label}
                    className={cn(
                      "group pointer-events-auto relative flex items-center justify-center",
                      "w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full",
                      "transition-transform duration-300 ease-out hover:scale-110",
                    )}
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(20,12,6,0.85), rgba(34,20,10,0.70))",
                      border: "1px solid rgba(216,138,58,0.32)",
                      boxShadow: "0 6px 22px rgba(0,0,0,0.5), inset 0 1px 0 rgba(216,138,58,0.20)",
                      color: "#E8C7A1",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    <span
                      className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{
                        boxShadow:
                          "0 0 26px 4px rgba(183,106,31,0.55), inset 0 0 14px rgba(216,138,58,0.35)",
                      }}
                    />
                    <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 relative" strokeWidth={1.4} />
                    {/* Static tooltip below the icon */}
                    <span
                      className="absolute left-1/2 -translate-x-1/2 top-full mt-2 px-2.5 py-1 text-[10px] uppercase tracking-luxe whitespace-nowrap rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                      style={{
                        color: "#F4E3CC",
                        background: "rgba(10,6,4,0.9)",
                        border: "1px solid rgba(216,138,58,0.28)",
                      }}
                    >
                      {item.label}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default OrbitalNav;
