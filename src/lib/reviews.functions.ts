import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVENUE_RAW_STATUSES } from "@/lib/order-status";

const UuidSchema = z.string().uuid();

const ReviewSubmitSchema = z.object({
  product_id: UuidSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).nullable().optional(),
  title_ar: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().max(4000).default(""),
  body_ar: z.string().trim().max(4000).nullable().optional(),
  lang: z.enum(["en", "ar"]).default("en"),
});

const ReviewUpsertSchema = z.object({
  id: UuidSchema.optional(),
  product_id: UuidSchema,
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(200).nullable().optional(),
  title_ar: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().max(4000).default(""),
  body_ar: z.string().trim().max(4000).nullable().optional(),
  lang: z.enum(["en", "ar"]).default("en"),
  customer_name: z.string().trim().max(200).default(""),
  customer_avatar_url: z.string().trim().max(2048).nullable().optional(),
  status: z.enum(["pending", "approved", "rejected"]).default("approved"),
  is_visible: z.boolean().default(true),
  is_pinned: z.boolean().default(false),
  sort_order: z.number().int().min(0).max(99999).default(0),
});

/* ============================================================ */
/* PUBLIC: list approved reviews for a product (+ summary)       */
/* ============================================================ */

export const listProductReviews = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        productId: UuidSchema,
        limit: z.number().int().min(1).max(100).default(50),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("product_reviews")
      .select(
        "id, product_id, rating, title, title_ar, body, body_ar, lang, customer_name, customer_avatar_url, is_pinned, sort_order, created_at",
      )
      .eq("product_id", data.productId)
      .eq("status", "approved")
      .eq("is_visible", true)
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const reviews = rows ?? [];
    const count = reviews.length;
    const sum = reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0);
    const average = count > 0 ? sum / count : 0;
    return { reviews, summary: { count, average } };
  });

/* ============================================================ */
/* CUSTOMER: submit a review (purchase-verified)                 */
/* ============================================================ */

export const submitProductReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewSubmitSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Purchase verification: user must have an order containing this product
    // with a revenue (paid/confirmed/delivered) status.
    const { data: orderRows } = await supabaseAdmin
      .from("orders")
      .select("id, status, order_items!inner(product_id)")
      .eq("user_id", context.userId)
      .in("status", REVENUE_RAW_STATUSES)
      .eq("order_items.product_id", data.product_id)
      .limit(1);

    if (!orderRows || orderRows.length === 0) {
      throw new Error("You can only review products you have purchased.");
    }

    // Snapshot name + avatar from profile / auth metadata
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", context.userId)
      .maybeSingle();
    const meta = (context.claims?.user_metadata ?? {}) as Record<string, unknown>;
    const customer_name =
      (profile?.full_name as string | null)?.trim() ||
      (meta.full_name as string | undefined)?.trim() ||
      (meta.name as string | undefined)?.trim() ||
      (context.claims?.email as string | undefined)?.split("@")[0] ||
      "Customer";
    const customer_avatar_url =
      (meta.avatar_url as string | undefined) ??
      (meta.picture as string | undefined) ??
      null;

    const orderId = (orderRows[0] as { id: string }).id;

    const { data: inserted, error } = await supabaseAdmin
      .from("product_reviews")
      .insert({
        product_id: data.product_id,
        user_id: context.userId,
        order_id: orderId,
        rating: data.rating,
        title: data.title ?? null,
        title_ar: data.title_ar ?? null,
        body: data.body ?? "",
        body_ar: data.body_ar ?? null,
        lang: data.lang,
        customer_name,
        customer_avatar_url,
        status: "approved",
        is_visible: true,
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

/* ============================================================ */
/* ADMIN                                                         */
/* ============================================================ */

async function assertAdmin(context: {
  supabase: { rpc: (n: string, a: unknown) => Promise<{ data: boolean | null }> };
  userId: string;
}) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminListReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ productId: UuidSchema.optional() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    let q = context.supabase
      .from("product_reviews")
      .select(
        "id, product_id, user_id, order_id, rating, title, title_ar, body, body_ar, lang, customer_name, customer_avatar_url, status, is_visible, is_pinned, sort_order, created_at, products(name)",
      )
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.productId) q = q.eq("product_id", data.productId);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { reviews: rows ?? [] };
  });

export const adminUpsertReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ReviewUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { id, ...rest } = data;
    if (id) {
      const { error } = await context.supabase.from("product_reviews").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true, id };
    }
    const { data: row, error } = await context.supabase
      .from("product_reviews")
      .insert(rest)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: UuidSchema }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { error } = await context.supabase.from("product_reviews").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetReviewFlags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: UuidSchema,
        is_visible: z.boolean().optional(),
        is_pinned: z.boolean().optional(),
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        sort_order: z.number().int().min(0).max(99999).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context as never);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("product_reviews").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
