import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Shuffle,
  TrendingUp,
  Settings,
} from "lucide-react";

const items = [
  { to: "/selling", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/selling/products", label: "Products", icon: Package },
  { to: "/selling/bundles", label: "Bundles", icon: Boxes },
  { to: "/selling/cross-sells", label: "Cross-Sells", icon: Shuffle },
  { to: "/selling/upsells", label: "Upsells", icon: TrendingUp },
  { to: "/selling/settings", label: "Settings", icon: Settings },
];

export function SellingSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <aside className="s-card !rounded-none lg:!rounded-r-xl !border-l-0 h-full w-60 flex flex-col py-6">
      <div className="px-5 mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md s-bg-accent grid place-items-center"
            style={{ fontWeight: 700 }}
          >
            S
          </div>
          <div>
            <div className="font-semibold">Selling Hub</div>
            <div className="text-[10px] s-muted uppercase tracking-wider">
              Smart Strategies
            </div>
          </div>
        </div>
      </div>
      <nav className="px-3 flex-1 space-y-1">
        {items.map((it) => {
          const active = it.exact
            ? pathname === it.to
            : pathname === it.to || pathname.startsWith(it.to + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "s-link-active font-medium"
                  : "hover:bg-[var(--s-surface-2)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 pt-4 mt-4 border-t s-border">
        <Link to="/" className="text-xs s-muted hover:s-accent">
          ← Back to store
        </Link>
      </div>
    </aside>
  );
}
