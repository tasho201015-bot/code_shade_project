import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ProductIdSchema = z.object({ productId: z.string().uuid() });
const ViewSchema = z.object({
  productId: z.string().uuid(),
  sessionId: z.string().min(8).max(128),
});

// Dedupe window: same session can't inflate views faster than this.
const VIEW_DEDUPE_MINUTES = 30;
// Live visitor active window.
const LIVE_WINDOW_SECONDS = 180;

export type ViewCounterPeriod = "24h" | "7d" | "30d" | "90d" | "365d" | "all";

const PERIOD_HOURS: Record<Exclude<ViewCounterPeriod, "all">, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
  "365d": 24 * 365,
};

export const recordProductView = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ViewSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - VIEW_DEDUPE_MINUTES * 60_000).toISOString();
    const { data: recent } = await supabaseAdmin
      .from("product_views")
      .select("id")
      .eq("product_id", data.productId)
      .eq("session_id", data.sessionId)
      .gte("viewed_at", since)
      .limit(1)
      .maybeSingle();
    if (!recent) {
      await supabaseAdmin
        .from("product_views")
        .insert({ product_id: data.productId, session_id: data.sessionId });
    }
    return { ok: true };
  });

async function countUniqueViewers(productId: string, sinceIso: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Page through session_ids and count uniques. For typical product traffic this is bounded.
  const unique = new Set<string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    let q = supabaseAdmin
      .from("product_views")
      .select("session_id")
      .eq("product_id", productId)
      .order("viewed_at", { ascending: false })
      .range(from, from + pageSize - 1);
    if (sinceIso) q = q.gte("viewed_at", sinceIso);
    const { data, error } = await q;
    if (error || !data || data.length === 0) break;
    for (const r of data as { session_id: string }[]) unique.add(r.session_id);
    if (data.length < pageSize) break;
    from += pageSize;
    // Safety cap to avoid runaway
    if (from > 50_000) break;
  }
  return unique.size;
}

export const getProductViewStats = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProductIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Read product's configured period (defaults to '24h' if missing).
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("view_counter_period, created_at")
      .eq("id", data.productId)
      .maybeSingle();

    const period = ((product as { view_counter_period?: string } | null)?.view_counter_period ??
      "24h") as ViewCounterPeriod;

    const sinceIso =
      period === "all"
        ? null
        : new Date(Date.now() - PERIOD_HOURS[period] * 60 * 60_000).toISOString();

    const uniqueViewers = await countUniqueViewers(data.productId, sinceIso);

    return {
      period,
      uniqueViewers,
      // Back-compat fields (kept so any other caller doesn't break):
      last24h: uniqueViewers,
      all: uniqueViewers,
      today: uniqueViewers,
      last7d: uniqueViewers,
    };
  });

export const getProductPurchaseCount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProductIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("order_items")
      .select("quantity, orders!inner(status)")
      .eq("product_id", data.productId)
      .in("orders.status", ["paid", "completed", "confirmed", "delivered", "shipped"]);
    const total = (rows ?? []).reduce(
      (sum, r: { quantity: number }) => sum + (r.quantity ?? 0),
      0,
    );
    return { count: total };
  });

export const heartbeatLiveVisitor = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ViewSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("product_live_visitors")
      .upsert(
        { product_id: data.productId, session_id: data.sessionId, last_seen: new Date().toISOString() },
        { onConflict: "product_id,session_id" },
      );
    return { ok: true };
  });

export const getLiveVisitors = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ProductIdSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cutoff = new Date(Date.now() - LIVE_WINDOW_SECONDS * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("product_live_visitors")
      .select("*", { count: "exact", head: true })
      .eq("product_id", data.productId)
      .gte("last_seen", cutoff);
    const stale = new Date(Date.now() - 60 * 60_000).toISOString();
    void supabaseAdmin.from("product_live_visitors").delete().lt("last_seen", stale);
    return { count: count ?? 0 };
  });
