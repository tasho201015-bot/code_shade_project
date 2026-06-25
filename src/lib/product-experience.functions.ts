import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const UuidSchema = z.string().uuid();

/* ============================================================ */
/* FAQs                                                          */
/* ============================================================ */

const FaqUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  question: z.string().trim().min(1).max(500),
  question_ar: z.string().trim().max(500).nullable().optional(),
  answer: z.string().trim().min(1).max(4000),
  answer_ar: z.string().trim().max(4000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  is_active: z.boolean().default(true),
});

/** Public: list active FAQs for a product (ordered). */
export const listProductFaqs = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ productId: UuidSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("product_faqs")
      .select("id, question, question_ar, answer, answer_ar, sort_order")
      .eq("product_id", data.productId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return { faqs: rows ?? [] };
  });

/** Admin: list ALL FAQs (incl. inactive) for a product. */
export const adminListProductFaqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: UuidSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: rows } = await context.supabase
      .from("product_faqs")
      .select("*")
      .eq("product_id", data.productId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    return { faqs: rows ?? [] };
  });

export const upsertProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => FaqUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("product_faqs").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase.from("product_faqs").insert(rest).select("id").single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const deleteProductFaq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: UuidSchema }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("product_faqs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ============================================================ */
/* Trending Now (top viewed)                                     */
/* ============================================================ */

export const getTrendingProducts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).default(8), windowHours: z.number().int().min(1).max(24 * 365).default(24 * 7) }).parse(d ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.windowHours * 60 * 60_000).toISOString();
    const { data: views } = await supabaseAdmin
      .from("product_views")
      .select("product_id")
      .gte("viewed_at", since)
      .limit(5000);
    const counts = new Map<string, number>();
    for (const v of (views ?? []) as { product_id: string }[]) {
      counts.set(v.product_id, (counts.get(v.product_id) ?? 0) + 1);
    }
    const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, data.limit).map(([id]) => id);
    if (topIds.length === 0) return { products: [] };
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("id, name, name_ar, price, compare_at_price, image_url, stock")
      .in("id", topIds)
      .eq("is_active", true);
    const order = new Map(topIds.map((id, i) => [id, i]));
    const sorted = (products ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    return { products: sorted };
  });

/* ============================================================ */
/* Recently Viewed (last 2 unique per customer)                  */
/* ============================================================ */

export const recordRecentlyViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ productId: UuidSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("product_recently_viewed")
      .upsert(
        { user_id: context.userId, product_id: data.productId, viewed_at: new Date().toISOString() },
        { onConflict: "user_id,product_id" },
      );
    return { ok: true };
  });

export const getRecentlyViewed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ excludeProductId: UuidSchema.optional() }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("product_recently_viewed")
      .select("product_id, viewed_at")
      .eq("user_id", context.userId)
      .order("viewed_at", { ascending: false })
      .limit(10);
    const ids = (rows ?? [])
      .map((r) => r.product_id as string)
      .filter((id) => id !== data.excludeProductId)
      .slice(0, 2);
    if (ids.length === 0) return { products: [] };
    const { data: products } = await context.supabase
      .from("products")
      .select("id, name, name_ar, price, compare_at_price, image_url, stock")
      .in("id", ids)
      .eq("is_active", true);
    const order = new Map(ids.map((id, i) => [id, i]));
    return { products: (products ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)) };
  });

/* ============================================================ */
/* Back-in-stock                                                 */
/* ============================================================ */

const SubscribeSchema = z.object({
  productId: UuidSchema,
  colorId: UuidSchema.nullable().optional(),
  sizeId: UuidSchema.nullable().optional(),
});

/**
 * Subscribe the current logged-in customer to a back-in-stock alert.
 * Email is taken from the authenticated session (no manual entry).
 */
export const subscribeBackInStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SubscribeSchema.parse(d))
  .handler(async ({ data, context }) => {
    const email = (context.claims?.email as string | undefined)?.toLowerCase();
    if (!email) throw new Error("Account email is required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: product } = await supabaseAdmin
      .from("products")
      .select("id, stock")
      .eq("id", data.productId)
      .maybeSingle();
    if (!product) throw new Error("Product not found");
    const { error } = await supabaseAdmin.from("back_in_stock_subscriptions").insert({
      product_id: data.productId,
      email,
      user_id: context.userId,
      color_id: data.colorId ?? null,
      size_id: data.sizeId ?? null,
      channel: "email",
    });
    if (error && !/duplicate/i.test(error.message)) {
      throw new Error(error.message);
    }
    return { ok: true };
  });


export const adminListBackInStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: rows } = await context.supabase
      .from("back_in_stock_subscriptions")
      .select("id, product_id, email, color_id, size_id, channel, notified_at, created_at, products(name, stock)")
      .order("created_at", { ascending: false })
      .limit(500);
    return { subscriptions: rows ?? [] };
  });

/** Admin: trigger notifications for all pending subs whose product is in stock. */
export const adminNotifyRestocked = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      productId: UuidSchema.optional(),
      siteOrigin: z.string().url().optional(),
    }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendBackInStockNotification } = await import("@/lib/notifications.server");

    let q = supabaseAdmin
      .from("back_in_stock_subscriptions")
      .select("id, product_id, email, color_id, size_id, user_id, products(name, stock)")
      .is("notified_at", null)
      .not("user_id", "is", null); // logged-in customers only
    if (data.productId) q = q.eq("product_id", data.productId);
    const { data: rows } = await q;


    const origin = data.siteOrigin ?? process.env.SITE_ORIGIN ?? "";
    let sent = 0;
    let failed = 0;

    for (const row of (rows ?? []) as Array<{
      id: string; product_id: string; email: string; color_id: string | null; size_id: string | null;
      products: { name: string; stock: number } | null;
    }>) {
      if (!row.products || row.products.stock <= 0) continue;
      const result = await sendBackInStockNotification({
        to: row.email,
        productName: row.products.name,
        productUrl: `${origin}/product/${row.product_id}`,
      });
      if (result.ok) {
        sent++;
        await supabaseAdmin.from("back_in_stock_subscriptions").update({ notified_at: new Date().toISOString() }).eq("id", row.id);
      } else {
        failed++;
      }
    }
    return { sent, failed };
  });

export const adminListNotifications = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { data: rows } = await context.supabase
      .from("notification_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return { notifications: rows ?? [] };
  });
