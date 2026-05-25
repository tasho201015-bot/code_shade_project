import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { toast } from "sonner";
import { TrendingUp, DollarSign, Receipt, Target, ShoppingBag, Percent, UserPlus, AlertTriangle } from "lucide-react";
import { grantAdminByEmail } from "@/lib/orders.functions";
import { Link } from "@tanstack/react-router";

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
}

interface Expense {
  id: string;
  amount: number;
  description: string | null;
  occurred_at: string;
}

const REVENUE_STATUSES = new Set(["pending", "processing", "shipped", "delivered"]);
const SUCCESS_STATUSES = new Set(["delivered"]);
const CONFIRMED_STATUSES = new Set(["processing", "shipped", "delivered"]);
const CANCELLED_STATUSES = new Set(["cancelled", "returned"]);

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [expenseRows, setExpenseRows] = useState<Expense[]>([]);
  const [expenseAmount, setExpenseAmount] = useState<string>("");
  const [expenseDesc, setExpenseDesc] = useState<string>("");
  const [savingExpense, setSavingExpense] = useState(false);
  const [grantEmail, setGrantEmail] = useState("");
  const [granting, setGranting] = useState(false);

  useEffect(() => {
    const since = subDays(new Date(), 90).toISOString();
    supabase.from("orders").select("id,total,status,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => setOrders((data ?? []) as Order[]));
    supabase.from("expenses").select("id,amount,description,occurred_at")
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setExpenseRows((data ?? []) as Expense[]));
  }, []);

  const expenses = useMemo(
    () => expenseRows.reduce((s, e) => s + Number(e.amount), 0),
    [expenseRows],
  );

  const m = useMemo(() => {
    const norm = (s: string) => s.toLowerCase();
    const revenueOrders = orders.filter((o) => REVENUE_STATUSES.has(norm(o.status)));
    const revenue = revenueOrders.reduce((s, o) => s + Number(o.total), 0);
    const totalOrders = orders.length;
    const confirmed = orders.filter((o) => CONFIRMED_STATUSES.has(norm(o.status))).length;
    const delivered = orders.filter((o) => SUCCESS_STATUSES.has(norm(o.status))).length;
    const cancelled = orders.filter((o) => CANCELLED_STATUSES.has(norm(o.status))).length;

    const netProfit = revenue - expenses;
    const ros = expenses > 0 ? revenue / expenses : 0;
    const aov = revenueOrders.length > 0 ? revenue / revenueOrders.length : 0;
    const cpp = totalOrders > 0 ? expenses / totalOrders : 0;
    const confirmRate = totalOrders > 0 ? (confirmed / totalOrders) * 100 : 0;
    const deliveryRate = totalOrders > 0 ? (delivered / totalOrders) * 100 : 0;
    const returnRate = totalOrders > 0 ? (cancelled / totalOrders) * 100 : 0;

    return { revenue, netProfit, ros, aov, cpp, totalOrders, confirmed, delivered, cancelled, confirmRate, deliveryRate, returnRate };
  }, [orders, expenses]);

  const revenueByDay = useMemo(() => {
    const days = 14;
    const buckets = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = format(subDays(new Date(), i), "MMM d");
      buckets.set(d, 0);
    }
    const cutoff = startOfDay(subDays(new Date(), days - 1)).getTime();
    orders.forEach((o) => {
      if (!REVENUE_STATUSES.has(o.status.toLowerCase())) return;
      const t = new Date(o.created_at).getTime();
      if (t < cutoff) return;
      const key = format(new Date(o.created_at), "MMM d");
      buckets.set(key, (buckets.get(key) || 0) + Number(o.total));
    });
    return Array.from(buckets, ([day, revenue]) => ({ day, revenue: Math.round(revenue * 100) / 100 }));
  }, [orders]);

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach((o) => { const k = o.status.toLowerCase(); counts[k] = (counts[k] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [orders]);

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
          <Metric label="CPP" value={expenses > 0 && m.totalOrders > 0 ? fmt$(m.cpp) : "No data"} hint={expenses > 0 && m.totalOrders > 0 ? "Cost per purchase" : "Needs orders & expenses"} icon={Percent} />
        </div>

        <div className="glass p-6 rounded-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Revenue</div>
              <div className="font-display text-xl">Last 14 days</div>
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
