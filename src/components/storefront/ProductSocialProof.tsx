import { useEffect, useState } from "react";
import { Eye, ShoppingBag, Users } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  recordProductView,
  getProductViewStats,
  getProductPurchaseCount,
  heartbeatLiveVisitor,
  getLiveVisitors,
} from "@/lib/product-metrics.functions";
import { useI18n } from "@/lib/i18n";

function getSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  const KEY = "malaz_session_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
      (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`) +
      "";
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function ProductSocialProof({ productId }: { productId: string }) {
  const { t, lang } = useI18n();
  const recordView = useServerFn(recordProductView);
  const fetchStats = useServerFn(getProductViewStats);
  const fetchPurchases = useServerFn(getProductPurchaseCount);
  const heartbeat = useServerFn(heartbeatLiveVisitor);
  const fetchLive = useServerFn(getLiveVisitors);

  const periodToHours = (p: string | undefined): number | null => {
    switch (p) {
      case "24h": return 24;
      case "7d": return 168;
      case "30d": return 720;
      case "90d": return 2160;
      case "365d": return 8760;
      default: return null;
    }
  };
  const labelForPeriod = (p: string | undefined) => {
    const h = periodToHours(p);
    return h == null
      ? t("socialProof.viewersAll")
      : t("socialProof.viewers", { hours: h });
  };
  const [views, setViews] = useState<number>(0);
  const [viewsLabel, setViewsLabel] = useState<string>(() => labelForPeriod("24h"));

  const [purchases, setPurchases] = useState<number>(0);
  const [live, setLive] = useState<number>(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!productId) return;
    const sessionId = getSessionId();
    let cancelled = false;

    const refresh = async () => {
      try {
        const [stats, p, l] = await Promise.all([
          fetchStats({ data: { productId } }),
          fetchPurchases({ data: { productId } }),
          fetchLive({ data: { productId } }),
        ]);
        if (cancelled) return;
        setViews(stats.uniqueViewers);
        setViewsLabel(labelForPeriod(stats.period));

        setPurchases(p.count);
        setLive(Math.max(1, l.count));
        setLoaded(true);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    };

    Promise.allSettled([
      recordView({ data: { productId, sessionId } }),
      heartbeat({ data: { productId, sessionId } }),
    ]).then(refresh);

    const hbInterval = setInterval(() => {
      void heartbeat({ data: { productId, sessionId } });
    }, 60_000);
    const refreshInterval = setInterval(refresh, 30_000);

    return () => {
      cancelled = true;
      clearInterval(hbInterval);
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, lang]);

  if (!loaded && views === 0 && purchases === 0 && live === 0) {
    return (
      <div className="mt-5 h-[52px] rounded-sm border border-border/70 animate-pulse" />
    );
  }

  return (
    <div className="mt-5 border border-border/70 rounded-sm px-4 py-3">
      <div className="grid grid-cols-3 gap-2 md:gap-4 text-center">
        <Metric
          icon={<Users className="w-4 h-4" />}
          value={live}
          label={t("socialProof.viewingNow")}
          accent
        />
        <Metric
          icon={<Eye className="w-4 h-4" />}
          value={views}
          label={viewsLabel}
        />
        <Metric
          icon={<ShoppingBag className="w-4 h-4" />}
          value={purchases}
          label={t("socialProof.sold")}
        />
      </div>
    </div>
  );
}

function Metric({
  icon,
  value,
  label,
  accent,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="flex items-center gap-1.5">
        <span className={accent ? "" : "text-muted-foreground"} style={accent ? { color: "#D8B98A" } : undefined}>{icon}</span>
        <span className="text-sm md:text-base font-medium tabular-nums">
          {value.toLocaleString()}
        </span>
        {accent && (
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
        )}
      </div>
      <span className="text-[10px] uppercase tracking-luxe text-muted-foreground truncate">
        {label}
      </span>
    </div>
  );
}
