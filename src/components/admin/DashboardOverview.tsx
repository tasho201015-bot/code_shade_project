// Admin Dashboard UI — KPI cards, Revenue chart, Governorates report, Inventory overview.
// Pure presentation: consumes the existing analytics server function
// (getAnalyticsOverview) for totals and reads orders/products via the
// existing supabase client (same pattern as AnalyticsDashboard). No
// calculations, queries, repositories, APIs, or business logic are added
// or modified here.

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
// (no date-fns needed — chart labels come from the server)
import {
  DollarSign,
  Megaphone,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  TrendingUp,
  UserPlus,
  MapPin,
  AlertTriangle,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import {
  getAnalyticsOverview,
  getRevenueChartAndGovernorates,
} from "@/lib/analytics.functions";
import { useAnalyticsRange } from "@/lib/analytics-range";
import { DateRangePicker } from "@/components/admin/DateRangePicker";


type OverviewData = Awaited<ReturnType<typeof getAnalyticsOverview>>;

type ChartDay = { day: string; sales: number; profit: number; adSpend: number };

type GovRow = { name: string; orders: number; revenue: number };

type InventoryProduct = {
  id: string;
  name: string;
  stock: number;
  is_active: boolean;
};

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass p-5 rounded-sm border ${
        accent ? "border-accent/40" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-luxe text-muted-foreground">
          {label}
        </span>
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <div className="font-display text-3xl mt-3 tabular-nums">{value}</div>
      {hint && (
        <div className="text-xs text-muted-foreground mt-1">{hint}</div>
      )}
    </motion.div>
  );
}

const fmt$ = (n: number) =>
  `$${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtNum = (n: number) => Number(n || 0).toLocaleString();

export function DashboardOverview() {
  const fetchOverview = useServerFn(getAnalyticsOverview);
  const { range, refreshKey } = useAnalyticsRange();
  const days = range.days;

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [chart, setChart] = useState<ChartDay[]>([]);
  const [governorates, setGovernorates] = useState<GovRow[]>([]);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);

  // 1) KPIs via existing admin-gated server function
  useEffect(() => {
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError(null);
    fetchOverview({ data: range })
      .then((d) => {
        if (!cancelled) setOverview(d);
      })
      .catch((e: unknown) => {
        if (!cancelled)
          setOverviewError(
            e instanceof Error ? e.message : "Failed to load analytics",
          );
      })
      .finally(() => {
        if (!cancelled) setOverviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchOverview, range, refreshKey]);

  // 2) Revenue chart series + Governorates report — single server source
  //    so values match the KPI cards above by construction.
  const fetchChart = useServerFn(getRevenueChartAndGovernorates);
  useEffect(() => {
    let cancelled = false;
    fetchChart({ data: { from: range.from, to: range.to, days } })
      .then((r) => {
        if (cancelled) return;
        setChart(
          r.series.map((s) => ({
            day: s.day,
            sales: s.sales,
            profit: s.profit,
            adSpend: s.adSpend,
          })),
        );
        setGovernorates(r.governorates);
      })
      .catch(() => {
        if (cancelled) return;
        setChart([]);
        setGovernorates([]);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchChart, range, days, refreshKey]);


  // 3) Inventory overview — read products directly
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("products")
      .select("id,name,stock,is_active")
      .order("stock", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        setInventory((data ?? []) as InventoryProduct[]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = overview?.totals;
  const cppDisplay =
    totals?.cpp == null
      ? "—"
      : fmt$(totals.cpp);

  // Inventory aggregates
  const inv = useMemo(() => {
    const active = inventory.filter((p) => p.is_active);
    const out = active.filter((p) => Number(p.stock) <= 0);
    const low = active.filter(
      (p) => Number(p.stock) > 0 && Number(p.stock) <= 5,
    );
    const units = active.reduce((s, p) => s + Number(p.stock || 0), 0);
    return { active, out, low, units };
  }, [inventory]);

  return (
    <div className="mt-8 space-y-8">
      {/* KPI CARDS */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-2xl">Key metrics</h2>
          <span className="text-xs text-muted-foreground">
            {range.label}
          </span>
        </div>
        {overviewError && (
          <div className="mb-4 text-sm text-destructive">{overviewError}</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Net Sales"
            value={overviewLoading ? "…" : fmt$(totals?.sales.net ?? 0)}
            hint={`Gross ${fmt$(totals?.sales.revenue ?? 0)} (Confirmed + Delivered)`}
            icon={DollarSign}
            accent
          />
          <KpiCard
            label="Net Profit"
            value={overviewLoading ? "…" : fmt$(totals?.netProfit ?? 0)}
            hint="Net sales − ad spend − other expenses"
            icon={TrendingUp}
            accent={(totals?.netProfit ?? 0) >= 0}
          />
          <KpiCard
            label="Ad Spend"
            value={overviewLoading ? "…" : fmt$(totals?.adSpend.amount ?? 0)}
            hint={
              overview?.metaAds.configured
                ? "Meta Ads (live)"
                : totals?.adSpend.source === "manual"
                  ? "From expenses"
                  : "Not configured"
            }
            icon={Megaphone}
          />
          <KpiCard
            label="Returns"
            value={overviewLoading ? "…" : fmt$(totals?.returns.amount ?? 0)}
            hint={`${fmtNum(totals?.returns.count ?? 0)} order(s)`}
            icon={Receipt}
          />
          <KpiCard
            label="Purchases"
            value={overviewLoading ? "…" : fmtNum(totals?.purchases ?? 0)}
            hint="Revenue-bucket orders"
            icon={ShoppingBag}
          />
          <KpiCard
            label="New Customers"
            value={overviewLoading ? "…" : fmtNum(totals?.newCustomers ?? 0)}
            hint="First-ever order in range"
            icon={UserPlus}
          />
          <KpiCard
            label="CPP"
            value={overviewLoading ? "…" : cppDisplay}
            hint="Ad spend / purchase"
            icon={Percent}
          />
          <KpiCard
            label="Today / Month Ads"
            value={
              overviewLoading
                ? "…"
                : `${fmt$(overview?.today.adSpend.amount ?? 0)} · ${fmt$(
                    overview?.month.adSpend.amount ?? 0,
                  )}`
            }
            hint="Today · Month-to-date"
            icon={Megaphone}
          />
        </div>
      </section>

      {/* REVENUE CHART */}
      <section className="glass p-6 rounded-sm border border-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
              Revenue
            </div>
            <div className="font-display text-xl">
              Sales · Profit · Ad spend
            </div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chart}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--border)",
                  fontSize: 12,
                  color: "var(--foreground)",
                }}
                formatter={(v: number) => fmt$(Number(v))}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="sales"
                name="Sales"
                fill="var(--accent)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                type="monotone"
                dataKey="profit"
                name="Profit"
                stroke="var(--foreground)"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="adSpend"
                name="Ad spend"
                stroke="var(--destructive)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={{ r: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* GOVERNORATES + INVENTORY */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Governorates */}
        <div className="glass p-6 rounded-sm border border-border">
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-4 h-4 text-accent" />
            <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
              Governorates
            </div>
          </div>
          <div className="font-display text-xl">Top regions</div>
          {governorates.length === 0 ? (
            <div className="mt-6 text-sm text-muted-foreground">
              No orders in this range.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {governorates.map((g) => {
                const max = governorates[0].revenue || 1;
                const pct = Math.min(
                  100,
                  Math.round((g.revenue / max) * 100),
                );
                return (
                  <li key={g.name} className="py-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{g.name}</span>
                      <span className="tabular-nums">
                        {fmt$(g.revenue)}{" "}
                        <span className="text-muted-foreground text-xs">
                          · {g.orders} order{g.orders === 1 ? "" : "s"}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-muted rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-accent"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Inventory */}
        <div className="glass p-6 rounded-sm border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-accent" />
            <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
              Inventory
            </div>
          </div>
          <div className="font-display text-xl">Stock overview</div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="border border-border p-3 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                Active SKUs
              </div>
              <div className="font-display text-2xl tabular-nums mt-1">
                {fmtNum(inv.active.length)}
              </div>
            </div>
            <div className="border border-border p-3 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                Units in stock
              </div>
              <div className="font-display text-2xl tabular-nums mt-1">
                {fmtNum(inv.units)}
              </div>
            </div>
            <div className="border border-accent/40 p-3 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                Low / Out
              </div>
              <div className="font-display text-2xl tabular-nums mt-1">
                {fmtNum(inv.low.length)} / {fmtNum(inv.out.length)}
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-2 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Needs attention
            </div>
            {inv.out.length + inv.low.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All active products have healthy stock.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {[...inv.out, ...inv.low].slice(0, 8).map((p) => (
                  <li
                    key={p.id}
                    className="py-2 flex items-center justify-between text-sm"
                  >
                    <span className="truncate pr-3">{p.name}</span>
                    <span
                      className={`tabular-nums text-xs uppercase tracking-luxe ${
                        Number(p.stock) <= 0
                          ? "text-destructive"
                          : "text-accent"
                      }`}
                    >
                      {Number(p.stock) <= 0
                        ? "Out of stock"
                        : `${p.stock} left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
