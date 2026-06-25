// Server-only analytics repository.
// Data access only — all derived metrics (Revenue, Net Sales, Net Profit, CPP)
// are computed via the pure functions in ./analytics-logic.ts, and all order
// status filtering goes through the canonical buckets in ./order-status.ts.
//
// Only callable from server functions (see analytics.functions.ts).

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { fetchMetaAdSpend, getMetaAdsConfigStatus } from "./meta-ads.server";
import {
  REVENUE_RAW_STATUSES,
  RETURNED_RAW_STATUSES,
  CANCELLED_RAW_STATUSES,
  type CanonicalOrderStatus,
} from "./order-status";
import { cpp as calcCpp, netProfit, netSales, revenue } from "./analytics-logic";

export type DateRange = { from: string; to: string }; // ISO strings, inclusive

export type ReturnsStats = { count: number; amount: number };
export async function getReturnsStats(range: DateRange): Promise<ReturnsStats> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("total")
    .in("status", RETURNED_RAW_STATUSES)
    .gte("created_at", range.from)
    .lte("created_at", range.to);
  if (error) throw error;
  const rows = (data ?? []) as { total: number | string }[];
  return {
    count: rows.length,
    amount: rows.reduce((s, r) => s + Number(r.total ?? 0), 0),
  };
}

export type CancelledStats = { count: number; amount: number };
export async function getCancelledStats(range: DateRange): Promise<CancelledStats> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("total")
    .in("status", CANCELLED_RAW_STATUSES)
    .gte("created_at", range.from)
    .lte("created_at", range.to);
  if (error) throw error;
  const rows = (data ?? []) as { total: number | string }[];
  return {
    count: rows.length,
    amount: rows.reduce((s, r) => s + Number(r.total ?? 0), 0),
  };
}

export type SalesStats = {
  revenue: number; // gross revenue (before returns/cancelled)
  returns: number;
  cancelled: number;
  net: number; // net sales = revenue - returns - cancelled
  purchases: number; // count of revenue-bucket orders
};
export async function getSalesStats(range: DateRange): Promise<SalesStats> {
  const [revenueQ, returns, cancelled] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("total")
      .in("status", REVENUE_RAW_STATUSES)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    getReturnsStats(range),
    getCancelledStats(range),
  ]);
  if (revenueQ.error) throw revenueQ.error;
  const rows = (revenueQ.data ?? []) as { total: number | string }[];
  const grossRevenue = rows.reduce((s, r) => s + Number(r.total ?? 0), 0);
  return {
    revenue: revenue({ grossRevenue, returnsAmount: returns.amount, cancelledAmount: cancelled.amount }),
    returns: returns.amount,
    cancelled: cancelled.amount,
    net: netSales({ grossRevenue, returnsAmount: returns.amount, cancelledAmount: cancelled.amount }),
    purchases: rows.length,
  };
}

export type StatusBreakdown = Record<CanonicalOrderStatus, { count: number; amount: number }>;

/**
 * Order counts + totals grouped by canonical dashboard status
 * (Pending / Confirmed / Shipped / Delivered / Returned / Cancelled).
 * Raw DB statuses are preserved internally; this only buckets for reporting.
 */
export async function getOrderStatusBreakdown(range: DateRange): Promise<StatusBreakdown> {
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("status,total")
    .gte("created_at", range.from)
    .lte("created_at", range.to);
  if (error) throw error;

  const empty: StatusBreakdown = {
    pending: { count: 0, amount: 0 },
    confirmed: { count: 0, amount: 0 },
    shipped: { count: 0, amount: 0 },
    delivered: { count: 0, amount: 0 },
    returned: { count: 0, amount: 0 },
    cancelled: { count: 0, amount: 0 },
  };

  const { normalizeOrderStatus } = await import("./order-status");
  for (const row of (data ?? []) as { status: string | null; total: number | string }[]) {
    const bucket = normalizeOrderStatus(row.status);
    empty[bucket].count += 1;
    empty[bucket].amount += Number(row.total ?? 0);
  }
  return empty;
}

export type AdSpendBreakdown = {
  source: "meta" | "manual" | "none";
  amount: number;
  configured: boolean;
};

const AD_KEYWORD_RE = /\b(ad|ads|meta|facebook|fb|instagram|ig)\b/i;

/**
 * Ad spend for a date range. Prefers live Meta Ads API; falls back to expenses
 * whose description mentions an ad-related keyword if Meta is not configured.
 */
export async function getAdSpend(range: DateRange): Promise<AdSpendBreakdown> {
  const cfg = getMetaAdsConfigStatus();
  if (cfg.configured) {
    const amount = await fetchMetaAdSpend(range.from, range.to);
    return { source: "meta", amount: amount ?? 0, configured: true };
  }
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("amount, description")
    .gte("occurred_at", range.from)
    .lte("occurred_at", range.to);
  if (error) throw error;
  const amount = ((data ?? []) as { amount: number | string; description: string | null }[])
    .filter((e) => e.description && AD_KEYWORD_RE.test(e.description))
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);
  return { source: amount > 0 ? "manual" : "none", amount, configured: false };
}

/**
 * Non-ad operating expenses in the range. Used as a cost component of Net Profit.
 * Ad-keyword expenses are excluded so they aren't double-counted with `getAdSpend`.
 */
export async function getOtherExpenses(range: DateRange): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("amount, description")
    .gte("occurred_at", range.from)
    .lte("occurred_at", range.to);
  if (error) throw error;
  return ((data ?? []) as { amount: number | string; description: string | null }[])
    .filter((e) => !(e.description && AD_KEYWORD_RE.test(e.description)))
    .reduce((s, e) => s + Number(e.amount ?? 0), 0);
}

/* ============================================================ */
/* Revenue chart series + Governorates report                    */
/* Single source of truth shared with the dashboard KPIs above.  */
/* ============================================================ */

export type RevenueChartDay = {
  day: string;            // "MMM d" label (UTC bucket key)
  date: string;           // ISO date of the bucket start
  sales: number;          // gross revenue − returns
  adSpend: number;        // ad-keyword expenses (or Meta Ads when configured)
  otherExpenses: number;  // non-ad expenses
  profit: number;         // sales − adSpend − otherExpenses
};

export type GovernorateRow = { name: string; orders: number; revenue: number };

export type RevenueChartAndGovernorates = {
  series: RevenueChartDay[];
  governorates: GovernorateRow[];
};

function bucketKey(d: Date): string {
  // YYYY-MM-DD in UTC so buckets are stable across timezones.
  return d.toISOString().slice(0, 10);
}

function fmtBucket(d: Date): string {
  // Match the date-fns "MMM d" labels used previously.
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Build daily series (sales/profit/adSpend) AND governorate rollup
 * from the SAME order rows the KPI cards consume — so totals match
 * the values from getAnalyticsOverview by construction.
 */
export async function getRevenueChartAndGovernorates(
  range: DateRange,
  days: number,
): Promise<RevenueChartAndGovernorates> {
  const safeDays = Math.max(1, Math.min(366, Math.trunc(days || 1)));

  const [revQ, retQ, canQ, adSpendBreakdown, otherExpenses, expQ] = await Promise.all([
    supabaseAdmin
      .from("orders")
      .select("total, governorate, created_at")
      .in("status", REVENUE_RAW_STATUSES)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    supabaseAdmin
      .from("orders")
      .select("total, created_at")
      .in("status", RETURNED_RAW_STATUSES)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    supabaseAdmin
      .from("orders")
      .select("total, created_at")
      .in("status", CANCELLED_RAW_STATUSES)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    getAdSpend(range),
    getOtherExpenses(range),
    supabaseAdmin
      .from("expenses")
      .select("amount, description, occurred_at")
      .gte("occurred_at", range.from)
      .lte("occurred_at", range.to),
  ]);
  if (revQ.error) throw revQ.error;
  if (retQ.error) throw retQ.error;
  if (canQ.error) throw canQ.error;
  if (expQ.error) throw expQ.error;

  type RevRow = { total: number | string; governorate: string | null; created_at: string };
  type StatusRow = { total: number | string; created_at: string };
  type ExpRow = { amount: number | string; description: string | null; occurred_at: string };

  const revRows = (revQ.data ?? []) as RevRow[];
  const retRows = (retQ.data ?? []) as StatusRow[];
  const canRows = (canQ.data ?? []) as StatusRow[];
  const expRows = (expQ.data ?? []) as ExpRow[];

  // Pre-build bucket order so empty days still render.
  const to = new Date(range.to);
  const order: string[] = [];
  const labels = new Map<string, string>();
  for (let i = safeDays - 1; i >= 0; i--) {
    const d = new Date(to.getTime() - i * 24 * 60 * 60 * 1000);
    const k = bucketKey(d);
    order.push(k);
    labels.set(k, fmtBucket(d));
  }
  const sales = new Map<string, number>(order.map((k) => [k, 0]));
  const returns = new Map<string, number>(order.map((k) => [k, 0]));
  const cancelled = new Map<string, number>(order.map((k) => [k, 0]));
  const ads = new Map<string, number>(order.map((k) => [k, 0]));
  const other = new Map<string, number>(order.map((k) => [k, 0]));

  for (const r of revRows) {
    const k = bucketKey(new Date(r.created_at));
    if (sales.has(k)) sales.set(k, (sales.get(k) || 0) + Number(r.total || 0));
  }
  for (const r of retRows) {
    const k = bucketKey(new Date(r.created_at));
    if (returns.has(k)) returns.set(k, (returns.get(k) || 0) + Number(r.total || 0));
  }
  for (const r of canRows) {
    const k = bucketKey(new Date(r.created_at));
    if (cancelled.has(k)) cancelled.set(k, (cancelled.get(k) || 0) + Number(r.total || 0));
  }
  // When Meta Ads is the source of truth, distribute its total evenly across
  // the window so the chart adSpend series sums to the KPI ad-spend total.
  if (adSpendBreakdown.source === "meta") {
    const perDay = (adSpendBreakdown.amount || 0) / safeDays;
    for (const k of order) ads.set(k, perDay);
    for (const e of expRows) {
      if (e.description && AD_KEYWORD_RE.test(e.description)) continue;
      const k = bucketKey(new Date(e.occurred_at));
      if (other.has(k)) other.set(k, (other.get(k) || 0) + Number(e.amount || 0));
    }
  } else {
    for (const e of expRows) {
      const k = bucketKey(new Date(e.occurred_at));
      const isAd = !!(e.description && AD_KEYWORD_RE.test(e.description));
      const map = isAd ? ads : other;
      if (map.has(k)) map.set(k, (map.get(k) || 0) + Number(e.amount || 0));
    }
  }

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const series: RevenueChartDay[] = order.map((k) => {
    // netSales bucket = gross (Confirmed + Delivered), matching getSalesStats.
    const dayNet = sales.get(k) || 0;
    const a = ads.get(k) || 0;
    const o = other.get(k) || 0;
    return {
      day: labels.get(k) || k,
      date: k,
      sales: round2(dayNet),
      adSpend: round2(a),
      otherExpenses: round2(o),
      // SAME formula as KPI Net Profit: netSales − adSpend − otherExpenses
      profit: round2(dayNet - a - o),
    };
  });

  // Governorates rollup uses the SAME revenue rows that drive KPI gross.
  const govMap = new Map<string, { orders: number; revenue: number }>();
  for (const r of revRows) {
    const name = (r.governorate || "").trim() || "Unknown";
    const cur = govMap.get(name) ?? { orders: 0, revenue: 0 };
    cur.orders += 1;
    cur.revenue += Number(r.total || 0);
    govMap.set(name, cur);
  }
  const governorates: GovernorateRow[] = Array.from(govMap, ([name, v]) => ({
    name,
    orders: v.orders,
    revenue: round2(v.revenue),
  }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  return { series, governorates };
}

/**
 * Admin: full order list (bypasses RLS).
 */
export async function adminListOrdersServer(range?: DateRange) {
  let q = supabaseAdmin
    .from("orders")
    .select("id, user_id, total, status, created_at, phone, shipping_address, governorate, city")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (range?.from) q = q.gte("created_at", range.from);
  if (range?.to) q = q.lte("created_at", range.to);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}


export type NewCustomersStats = { count: number };
/**
 * Number of distinct user_ids whose FIRST-ever order falls inside the range.
 */
export async function getNewCustomers(range: DateRange): Promise<NewCustomersStats> {
  const { data: inRange, error } = await supabaseAdmin
    .from("orders")
    .select("user_id, created_at")
    .gte("created_at", range.from)
    .lte("created_at", range.to);
  if (error) throw error;

  const earliestInRange = new Map<string, string>();
  for (const r of (inRange ?? []) as { user_id: string; created_at: string }[]) {
    const prev = earliestInRange.get(r.user_id);
    if (!prev || r.created_at < prev) earliestInRange.set(r.user_id, r.created_at);
  }

  const userIds = Array.from(earliestInRange.keys());
  if (userIds.length === 0) return { count: 0 };

  const { data: priors, error: pErr } = await supabaseAdmin
    .from("orders")
    .select("user_id, created_at")
    .in("user_id", userIds)
    .lt("created_at", range.from);
  if (pErr) throw pErr;

  const hadPrior = new Set(((priors ?? []) as { user_id: string }[]).map((r) => r.user_id));
  let count = 0;
  for (const uid of userIds) if (!hadPrior.has(uid)) count += 1;
  return { count };
}

export type AnalyticsOverview = {
  range: DateRange;
  today: { adSpend: AdSpendBreakdown };
  month: { adSpend: AdSpendBreakdown };
  totals: {
    returns: ReturnsStats;
    cancelled: CancelledStats;
    sales: SalesStats;
    adSpend: AdSpendBreakdown;
    otherExpenses: number;
    purchases: number;
    newCustomers: number;
    cpp: number | null; // ad spend / purchases
    netProfit: number; // net sales − ad spend − returns − cancelled − other expenses
  };
  statusBreakdown: StatusBreakdown;
  metaAds: { configured: boolean; missing: string[] };
};

export async function getAnalyticsOverview(range: DateRange): Promise<AnalyticsOverview> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const nowIso = now.toISOString();

  const [returns, cancelled, sales, adSpend, otherExpenses, newCustomers, todayAd, monthAd, statusBreakdown] =
    await Promise.all([
      getReturnsStats(range),
      getCancelledStats(range),
      getSalesStats(range),
      getAdSpend(range),
      getOtherExpenses(range),
      getNewCustomers(range),
      getAdSpend({ from: startOfToday, to: nowIso }),
      getAdSpend({ from: startOfMonth, to: nowIso }),
      getOrderStatusBreakdown(range),
    ]);

  return {
    range,
    today: { adSpend: todayAd },
    month: { adSpend: monthAd },
    totals: {
      returns,
      cancelled,
      sales,
      adSpend,
      otherExpenses,
      purchases: sales.purchases,
      newCustomers: newCustomers.count,
      cpp: calcCpp(adSpend.amount, sales.purchases),
      netProfit: netProfit({
        netSales: sales.net,
        adSpend: adSpend.amount,
        otherExpenses,
      }),
    },
    statusBreakdown,
    metaAds: getMetaAdsConfigStatus(),
  };
}
