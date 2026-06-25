// Admin-only analytics endpoints.
// Each server function authenticates the caller, verifies the `admin` role,
// then delegates to the server-only repository in analytics.server.ts.
//
// SECURITY: Never returns Meta Ads tokens or other secrets. The
// `metaAds.configured` boolean indicates only whether the integration is wired.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const RangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
  })
  .optional();

function resolveRange(input: { from?: string; to?: string } | undefined) {
  const to = input?.to ? new Date(input.to) : new Date();
  const from = input?.from
    ? new Date(input.from)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw new Error("Invalid date range");
  }
  // Cap to 2 years to avoid runaway queries
  const maxMs = 366 * 2 * 24 * 60 * 60 * 1000;
  if (to.getTime() - from.getTime() > maxMs) throw new Error("Range too large");
  return { from: from.toISOString(), to: to.toISOString() };
}

async function assertAdmin(ctx: { supabase: unknown; userId: string }) {
  const sb = ctx.supabase as {
    rpc: (
      fn: "has_role",
      args: { _user_id: string; _role: "admin" },
    ) => Promise<{ data: boolean | null; error: unknown }>;
  };
  const { data, error } = await sb.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const getAnalyticsOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getAnalyticsOverview: query } = await import("./analytics.server");
    return query(range);
  });

export const getReturnsStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getReturnsStats: q } = await import("./analytics.server");
    return q(range);
  });

export const getSalesStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getSalesStats: q } = await import("./analytics.server");
    return q(range);
  });

export const getAdSpend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getAdSpend: q } = await import("./analytics.server");
    return q(range);
  });

export const getNewCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getNewCustomers: q } = await import("./analytics.server");
    return q(range);
  });

export const getMetaAdsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { getMetaAdsConfigStatus } = await import("./meta-ads.server");
    return getMetaAdsConfigStatus();
  });

const ChartRangeSchema = z
  .object({
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    days: z.number().int().min(1).max(366).optional(),
  })
  .optional();

export const getRevenueChartAndGovernorates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ChartRangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const range = resolveRange(data);
    const { getRevenueChartAndGovernorates: q } = await import("./analytics.server");
    const days = data?.days ?? Math.max(
      1,
      Math.round(
        (new Date(range.to).getTime() - new Date(range.from).getTime()) /
          (24 * 60 * 60 * 1000),
      ),
    );
    return q(range, days);
  });

export const adminListAllOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => RangeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { adminListOrdersServer } = await import("./analytics.server");
    // No range = return all orders for Manage Orders view.
    if (!data?.from && !data?.to) return adminListOrdersServer();
    return adminListOrdersServer(resolveRange(data));
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ id: z.string().uuid(), status: z.string().min(1).max(60) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

