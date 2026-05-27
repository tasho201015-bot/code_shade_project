import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Boxes,
  Shuffle,
  TrendingUp,
  DollarSign,
  Trophy,
  Zap,
  Plus,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { StatCard } from "@/components/selling/StatCard";
import { useSellingStore } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";

export const Route = createFileRoute("/selling/")({
  component: SellingDashboard,
});

function SellingDashboard() {
  const bundles = useSellingStore((s) => s.bundles);
  const crossSells = useSellingStore((s) => s.crossSells);
  const upsells = useSellingStore((s) => s.upsells);
  const products = useProducts();

  const activeBundles = bundles.filter((b) => b.active).length;
  const totalRevenue = useMemo(
    () =>
      bundles.reduce((sum, b) => {
        const orig = b.productIds.reduce((s, id) => {
          const p = products.find((x) => x.id === id);
          return s + Number(p?.price ?? 0);
        }, 0);
        const final =
          b.discountMode === "fixed"
            ? b.discountValue
            : orig * (1 - b.discountValue / 100);
        return sum + final * b.purchases;
      }, 0),
    [bundles, products],
  );

  const topBundle = [...bundles].sort((a, b) => b.purchases - a.purchases)[0];
  const topCross = [...crossSells].sort((a, b) => b.clicks - a.clicks)[0];
  const topUp = [...upsells].sort((a, b) => b.conversions - a.conversions)[0];

  const chartData = useMemo(() => {
    const days = 14;
    return Array.from({ length: days }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return {
        day: label,
        bundles: Math.round(20 + Math.random() * 80 + activeBundles * 5),
        upsells: Math.round(10 + Math.random() * 60 + upsells.length * 4),
      };
    });
  }, [activeBundles, upsells.length]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm s-muted">
            Overview of your smart selling strategies
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Active Bundles" value={String(activeBundles)} icon={Boxes} hint={`${bundles.length} total`} />
        <StatCard label="Cross-Sell Rules" value={String(crossSells.length)} icon={Shuffle} />
        <StatCard label="Upsell Rules" value={String(upsells.length)} icon={TrendingUp} />
        <StatCard label="Bundle Revenue" value={`$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={DollarSign} hint="Mock data" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <StatCard label="Top Bundle" value={topBundle?.name ?? "—"} hint={topBundle ? `${topBundle.purchases} purchases` : "No bundles yet"} icon={Trophy} />
        <StatCard label="Top Cross-Sell" value={topCross ? `${topCross.clicks} clicks` : "—"} hint={topCross?.sectionTitle ?? "No rules yet"} icon={Zap} />
        <StatCard label="Top Upsell" value={topUp ? `${topUp.conversions} conv.` : "—"} hint={topUp?.headline ?? "No rules yet"} icon={TrendingUp} />
      </div>

      <div className="s-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider s-muted">
              Performance
            </div>
            <div className="text-lg font-semibold">Last 14 days</div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--s-border)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--s-muted)" }} stroke="var(--s-border)" />
              <YAxis tick={{ fontSize: 10, fill: "var(--s-muted)" }} stroke="var(--s-border)" />
              <Tooltip
                cursor={{ fill: "var(--s-surface-2)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--s-surface)",
                  border: "1px solid var(--s-border)",
                  fontSize: 12,
                  color: "var(--s-fg)",
                  borderRadius: 8,
                }}
              />
              <Bar dataKey="bundles" fill="var(--s-accent)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="upsells" fill="color-mix(in oklab, var(--s-accent) 50%, white)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="s-card p-6">
        <div className="text-[10px] uppercase tracking-wider s-muted">Quick actions</div>
        <div className="text-lg font-semibold mb-4">Build a new strategy</div>
        <div className="flex flex-wrap gap-2">
          <Link to="/selling/bundles" className="s-btn s-btn-primary">
            <Plus className="w-4 h-4" /> Create Bundle
          </Link>
          <Link to="/selling/cross-sells" className="s-btn s-btn-ghost">
            <Plus className="w-4 h-4" /> Add Cross-Sell Rule
          </Link>
          <Link to="/selling/upsells" className="s-btn s-btn-ghost">
            <Plus className="w-4 h-4" /> Add Upsell Rule
          </Link>
        </div>
      </div>
    </div>
  );
}
