import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { toast } from "sonner";
import { TrendingUp, DollarSign, Receipt, Target, ShoppingBag, Percent, UserPlus } from "lucide-react";
import { grantAdminByEmail } from "@/lib/orders.functions";
import {
  getAnalyticsOverview,
  getRevenueChartAndGovernorates,
} from "@/lib/analytics.functions";
import { useAnalyticsRange } from "@/lib/analytics-range";

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
}

type Overview = Awaited<ReturnType<typeof getAnalyticsOverview>>;
type ChartData = Awaited<ReturnType<typeof getRevenueChartAndGovernorates>>;

function Metric({ label, value, hint, icon: Icon, accent }: {
  label: string; value: string; hint?: string; icon: React.ComponentType<{ className?: string }>; accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`glass p-5 rounded-sm border ${accent ? "border-accent/40" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-luxe text-muted-foreground">{label}</span>
        <Icon className="w-4 h-4 text-accent" />
      </div>
      <div className="font-display text-3xl mt-3 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </motion.div>
  );
}

export function AnalyticsDashboard({ section }: { section: "overview" | "orders" | "performance" }) {
  const { range, refreshKey } = useAnalyticsRange();
  const days = range.days;
  const fetchOverview = useServerFn(getAnalyticsOverview);
  const fetchChart = useServerFn(getRevenueChartAndGovernorates);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [chart, setChart] = useState<ChartData | null>(null);
  const [expenseRows, setExpenseRows] = useState<Expense[]>([]);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDesc, setExpenseDesc] = useState<string>("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchOverview({ data: { from: range.from, to: range.to } })
      .then((d) => { if (!cancelled) setOverview(d); })
      .catch(() => { if (!cancelled) setOverview(null); });
    fetchChart({ data: { from: range.from, to: range.to, days } })
      .then((d) => { if (!cancelled) setChart(d); })
      .catch(() => { if (!cancelled) setChart(null); });
    supabase.from("expenses").select("id,amount,description,occurred_at")
      .gte("occurred_at", range.from)
      .lte("occurred_at", range.to)
      .order("occurred_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => { if (!cancelled) setExpenseRows((data ?? []) as Expense[]); });
    return () => { cancelled = true; };
  }, [fetchOverview, fetchChart, range, days, refreshKey]);

  const expenses = useMemo(
    () => (overview?.totals.adSpend.amount ?? 0) + (overview?.totals.otherExpenses ?? 0),
    [overview],
  );

  const m = useMemo(() => {
    const t = overview?.totals;
    const revenue = t?.sales.revenue ?? 0;            // gross
    const netSales = t?.sales.net ?? 0;               // gross − returns
    const purchases = t?.purchases ?? 0;
    
    const sb = overview?.statusBreakdown;
    const totalOrders = sb
      ? sb.pending.count + sb.confirmed.count + sb.shipped.count + sb.delivered.count + sb.returned.count + sb.cancelled.count
      : 0;
    const confirmed = sb ? sb.confirmed.count + sb.shipped.count + sb.delivered.count : 0;
    const delivered = sb?.delivered.count ?? 0;
    const cancelled = sb ? sb.cancelled.count + sb.returned.count : 0;

    const netProfit = t?.netProfit ?? 0;
    const ros = expenses > 0 ? netSales / expenses : 0;
    const aov = purchases > 0 ? netSales / purchases : 0;
    const cpp = t?.cpp ?? null;
    const confirmRate = totalOrders > 0 ? (confirmed / totalOrders) * 100 : 0;
    const deliveryRate = totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;

    return { revenue, netSales, netProfit, ros, aov, cpp, totalOrders, confirmed, delivered, cancelled, confirmRate, deliveryRate, returnRate, purchases };
  }, [overview, expenses]);

  const revenueByDay = useMemo(
    () => (chart?.series ?? []).map((s) => ({ day: s.day, revenue: s.sales })),
    [chart],
  );

  const statusBreakdown = useMemo(() => {
    const sb = overview?.statusBreakdown;
    if (!sb) return [] as { status: string; count: number }[];
    return [
      { status: "pending", count: sb.pending.count },
      { status: "confirmed", count: sb.confirmed.count },
      { status: "shipped", count: sb.shipped.count },
      { status: "delivered", count: sb.delivered.count },
      { status: "returned", count: sb.returned.count },
      { status: "cancelled", count: sb.cancelled.count },
    ];
  }, [overview]);


  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grantEmail.trim()) return;
    setGranting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await grantAdminByEmail({
        data: { email: grantEmail.trim(), access_token: session?.access_token },
      });
      if (res.ok) {
        toast.success(`Admin access granted to ${grantEmail}`);
        setGrantEmail("");
      } else {
        toast.error(res.error || "Failed to grant access");
      }
    } catch {
      toast.error("Failed to grant access");
    } finally {
      setGranting(false);
    }
  };

  const fmt$ = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(expenseAmount);
    if (!amt || amt <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSavingExpense(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("expenses")
      .insert({ amount: amt, description: expenseDesc.trim() || null, created_by: user?.id })
      .select("id,amount,description,occurred_at")
      .single();
    setSavingExpense(false);
    if (error || !data) {
      toast.error(error?.message || "Failed to add expense");
      return;
    }
    setExpenseRows((rows) => [data as Expense, ...rows]);
    setExpenseAmount("");
    setExpenseDesc("");
    toast.success("Expense added");
  };

  const handleDeleteExpense = async (id: string) => {
    const prev = expenseRows;
    setExpenseRows((rows) => rows.filter((r) => r.id !== id));
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setExpenseRows(prev);
      toast.error("Failed to remove expense");
    } else {
      toast.success("Expense removed");
    }
  };

  if (section === "overview") {
    return (
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Metric label="Total Revenue" value={fmt$(m.revenue)} hint="Non-cancelled orders" icon={DollarSign} accent />
          <Metric label="Net Profit" value={fmt$(m.netProfit)} hint="Revenue − Expenses" icon={TrendingUp} accent={m.netProfit >= 0} />
          <Metric label="Total Expenses" value={fmt$(expenses)} hint="Manual entry" icon={Receipt} />
          <Metric label="ROS" value={expenses > 0 ? `${m.ros.toFixed(2)}×` : "No data"} hint={expenses > 0 ? "Return on spend" : "Add expenses to calculate"} icon={Target} />
          <Metric label="AOV" value={fmt$(m.aov)} hint="Avg. order value" icon={ShoppingBag} />
          <Metric label="CPP" value={m.cpp != null ? fmt$(m.cpp) : "No data"} hint={m.cpp != null ? "Cost per purchase" : "Needs orders & ad spend"} icon={Percent} />
        </div>

        <div className="glass p-6 rounded-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Revenue</div>
              <div className="font-display text-xl">{range.label}</div>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueByDay} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                <Tooltip contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", fontSize: 12, color: "var(--foreground)" }} />
                <Line type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: "var(--accent)" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass p-6 rounded-sm border border-border">
          <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Expenses</div>
          <div className="font-display text-xl mt-1">Track business spend</div>
          <p className="text-xs text-muted-foreground mt-1">Shared across all admins. Used for ROS, CPP and Net Profit.</p>

          <form onSubmit={handleAddExpense} className="mt-4 grid grid-cols-1 sm:grid-cols-[140px_1fr_auto] gap-3">
            <div className="flex items-center gap-2 border-b border-border focus-within:border-accent">
              <span className="text-muted-foreground text-sm">$</span>
              <input
                type="number" min="0" step="0.01" required placeholder="0.00"
                value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)}
                className="flex-1 bg-transparent py-2 outline-none text-sm tabular-nums"
              />
            </div>
            <input
              type="text" placeholder="Description (e.g. Meta ads — April)"
              value={expenseDesc} onChange={(e) => setExpenseDesc(e.target.value)}
              className="bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
            />
            <button
              type="submit" disabled={savingExpense}
              className="bg-noir text-cream px-5 py-2 text-xs uppercase tracking-luxe btn-glow disabled:opacity-50"
            >
              {savingExpense ? "Adding…" : "Add expense"}
            </button>
          </form>

          <div className="mt-6">
            <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-2">Recent entries</div>
            {expenseRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {expenseRows.slice(0, 8).map((e) => (
                  <li key={e.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="tabular-nums">{fmt$(Number(e.amount))}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {e.description || "—"} · {format(new Date(e.occurred_at), "MMM d, yyyy")}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExpense(e.id)}
                      className="text-xs uppercase tracking-luxe text-muted-foreground hover:text-accent"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (section === "orders") {
    return (
      <div className="mt-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric label="Total Orders" value={String(m.totalOrders)} icon={ShoppingBag} />
          <Metric label="Confirmed" value={String(m.confirmed)} icon={Target} />
          <Metric label="Delivered" value={String(m.delivered)} icon={TrendingUp} accent />
          <Metric label="Cancelled / Returned" value={String(m.cancelled)} icon={Receipt} />
        </div>

        <div className="glass p-6 rounded-sm border border-border">
          <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Status</div>
          <div className="font-display text-xl mt-1">Order distribution</div>
          <div className="h-72 mt-4">
            {statusBreakdown.length === 0 || statusBreakdown.every((d) => !d.count) ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-sm">
                No data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="status" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                    contentStyle={{ background: "var(--background)", border: "1px solid var(--border)", fontSize: 12, color: "var(--foreground)" }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} animationDuration={600} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Metric label="Confirmation Rate" value={`${m.confirmRate.toFixed(1)}%`} hint="Confirmed / total" icon={Target} accent />
        <Metric label="Delivery Rate" value={`${m.deliveryRate.toFixed(1)}%`} hint="Delivered / total" icon={TrendingUp} accent />
        <Metric label="Return Rate" value={`${m.returnRate.toFixed(1)}%`} hint="Cancelled / total" icon={Percent} />
      </div>

      <div className="glass p-6 rounded-sm border border-border">
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-accent" />
          <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Admin access</div>
        </div>
        <div className="font-display text-xl mt-1">Grant admin to a user</div>
        <p className="text-xs text-muted-foreground mt-1">User must have signed up first. Admins have full dashboard access.</p>
        <form onSubmit={handleGrant} className="mt-4 flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="email" required placeholder="user@example.com"
            value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)}
            className="flex-1 bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
          />
          <button
            type="submit" disabled={granting}
            className="bg-noir text-cream px-5 py-2 text-xs uppercase tracking-luxe btn-glow disabled:opacity-50"
          >
            {granting ? "Granting…" : "Grant admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
