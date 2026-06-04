import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateToken(): string {
  return randomBytes(24).toString("hex");
}

const PlaceOrderSchema = z.object({
  shipping_address: z.string().trim().min(5).max(1000),
  phone: z.string().trim().min(5).max(40),
  access_token: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
      })
    )
    .min(1)
    .max(50),
});

const CancelOrderSchema = z.object({
  order_id: z.string().uuid(),
  access_token: z.string().optional(),
});

const GrantAdminSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  access_token: z.string().optional(),
});

const ConfirmOrderSchema = z.object({
  order_id: z.string().uuid(),
  token: z.string().min(16).max(128),
  shipping_address: z.string().trim().min(5).max(1000).optional(),
  phone: z.string().trim().min(5).max(40).optional(),
});

const LoadConfirmSchema = z.object({
  order_id: z.string().uuid(),
  token: z.string().min(16).max(128),
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PlaceOrderSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      if (data.items.some((item) => item.product_id.startsWith("sample-"))) {
        return { ok: false, error: "Please remove old sample items from your bag and add products from the live shop." };
      }

      const authHeader = getRequestHeader("authorization");
      const token = data.access_token || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");

      if (!token) {
        return { ok: false, error: "Please sign in before placing an order." };
      }

      const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;

      if (claimsError || !userId) {
        return { ok: false, error: "Your session could not be verified. Please sign in again." };
      }

      // Fetch authoritative product data server-side
      const ids = Array.from(new Set(data.items.map((i) => i.product_id)));
      const { data: products, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock, is_active")
        .in("id", ids);

      if (prodErr) return { ok: false, error: "Failed to load products." };
      if (!products || products.length !== ids.length) {
        return { ok: false, error: "One or more products are no longer available." };
      }

    const map = new Map(products.map((p) => [p.id, p]));
    let total = 0;
    const verifiedItems = data.items.map((i) => {
      const p = map.get(i.product_id)!;
      if (!p.is_active) throw new Error(`Product unavailable: ${p.name}`);
      if (p.stock < i.quantity) throw new Error(`Insufficient stock: ${p.name}`);
      const lineTotal = Number(p.price) * i.quantity;
      total += lineTotal;
      return {
        product_id: p.id,
        product_name: p.name,
        price: Number(p.price),
        quantity: i.quantity,
      };
    });

    total = Math.round(total * 100) / 100;

    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total,
        status: "pending_confirmation",
        payment_provider: "cod",
        confirmation_token: generateToken(),
        shipping_address: data.shipping_address,
        phone: data.phone,
      })
      .select("id, confirmation_token")
      .single();

    if (orderErr || !order) return { ok: false, error: "Failed to create order." };

    const { error: itemsErr } = await supabaseAdmin.from("order_items").insert(
      verifiedItems.map((i) => ({ ...i, order_id: order.id }))
    );

    if (itemsErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return { ok: false, error: "Failed to create order items." };
    }

    // Atomically decrement stock. If insufficient (race), roll back the order.
    const { error: stockErr } = await supabaseAdmin.rpc("decrement_product_stock", {
      p_items: verifiedItems.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    });
    if (stockErr) {
      await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      return { ok: false, error: stockErr.message || "Insufficient stock." };
    }

    return {
      ok: true,
      orderId: order.id,
      confirmationToken: order.confirmation_token as string,
      total,
      mock: false,
    };
    } catch (error) {
      console.error("placeOrder failed", error);
      return { ok: false, error: error instanceof Error ? error.message : "Failed to place order." };
    }
  });

export const cancelOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CancelOrderSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const authHeader = getRequestHeader("authorization");
      const token = data.access_token || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");

      if (!token) return { ok: false, error: "Please sign in before cancelling an order." };

      const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;

      if (claimsError || !userId) {
        return { ok: false, error: "Your session could not be verified. Please sign in again." };
      }

      const { data: order, error: loadError } = await supabaseAdmin
        .from("orders")
        .select("id,status,user_id")
        .eq("id", data.order_id)
        .eq("user_id", userId)
        .single();

      if (loadError || !order) return { ok: false, error: "Order not found." };
      const cancellable = new Set([
        "pending_confirmation",
        "paid_pending_confirmation",
        "confirmed_cod",
      ]);
      if (!cancellable.has(order.status.toLowerCase())) {
        return { ok: false, error: "This order can no longer be cancelled." };
      }

      const { error: updateError } = await supabaseAdmin
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", data.order_id)
        .eq("user_id", userId);

      if (updateError) return { ok: false, error: "Failed to cancel order." };

      return { ok: true, status: "cancelled" };
    } catch (error) {
      console.error("cancelOrder failed", error);
      return { ok: false, error: error instanceof Error ? error.message : "Failed to cancel order." };
    }
  });

export const grantAdminByEmail = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => GrantAdminSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const authHeader = getRequestHeader("authorization");
      const token = data.access_token || (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");
      if (!token) return { ok: false, error: "Not authenticated." };

      const { data: claimsData, error: claimsError } = await supabaseAdmin.auth.getClaims(token);
      const callerId = claimsData?.claims?.sub;
      if (claimsError || !callerId) return { ok: false, error: "Session invalid." };

      // Verify caller is admin
      const { data: callerRoles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .eq("role", "admin");
      if (!callerRoles || callerRoles.length === 0) {
        return { ok: false, error: "Only admins can grant admin access." };
      }

      // Find user by email via admin API
      let targetId: string | null = null;
      let page = 1;
      while (page <= 20) {
        const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) return { ok: false, error: "Failed to look up user." };
        const found = list.users.find((u) => u.email?.toLowerCase() === data.email);
        if (found) { targetId = found.id; break; }
        if (list.users.length < 1000) break;
        page++;
      }
      if (!targetId) return { ok: false, error: "No user found with that email. They must sign up first." };

      const { error: insErr } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: targetId, role: "admin" }, { onConflict: "user_id,role" });
      if (insErr) return { ok: false, error: "Failed to grant admin role." };

      return { ok: true };
    } catch (error) {
      console.error("grantAdminByEmail failed", error);
      return { ok: false, error: error instanceof Error ? error.message : "Failed." };
    }
  });

export const loadConfirmOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => LoadConfirmSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id,status,total,phone,shipping_address,confirmation_token,confirmed_at,created_at")
        .eq("id", data.order_id)
        .maybeSingle();
      if (error || !order) return { ok: false as const, error: "Order not found." };
      if (!order.confirmation_token || order.confirmation_token !== data.token) {
        return { ok: false as const, error: "Invalid confirmation link." };
      }
      const { data: items } = await supabaseAdmin
        .from("order_items")
        .select("id,product_name,quantity,price")
        .eq("order_id", order.id);
      return {
        ok: true as const,
        order: {
          id: order.id,
          status: order.status,
          total: Number(order.total),
          phone: order.phone,
          shipping_address: order.shipping_address,
          confirmed_at: order.confirmed_at,
          created_at: order.created_at,
        },
        items: items ?? [],
      };
    } catch (e) {
      console.error("loadConfirmOrder failed", e);
      return { ok: false as const, error: "Failed to load order." };
    }
  });

export const confirmOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ConfirmOrderSchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const { data: order, error } = await supabaseAdmin
        .from("orders")
        .select("id,status,confirmation_token")
        .eq("id", data.order_id)
        .maybeSingle();
      if (error || !order) return { ok: false as const, error: "Order not found." };
      if (!order.confirmation_token || order.confirmation_token !== data.token) {
        return { ok: false as const, error: "Invalid confirmation link." };
      }

      const current = (order.status ?? "").toLowerCase();
      let nextStatus: string | null = null;
      if (current === "pending_confirmation") nextStatus = "confirmed_cod";
      else if (current === "paid_pending_confirmation") nextStatus = "confirmed_paid";
      else if (current === "confirmed_cod" || current === "confirmed_paid") {
        nextStatus = current; // already confirmed; allow address edits below
      } else {
        return {
          ok: false as const,
          error: "This order is no longer awaiting confirmation.",
        };
      }

      const update: {
        status: string;
        shipping_address?: string;
        phone?: string;
        confirmed_at?: string;
        confirmation_token?: null;
      } = { status: nextStatus };
      if (data.shipping_address) update.shipping_address = data.shipping_address;
      if (data.phone) update.phone = data.phone;
      if (current === "pending_confirmation" || current === "paid_pending_confirmation") {
        update.confirmed_at = new Date().toISOString();
        // One-time secret: clear after successful confirmation so it cannot be re-read.
        update.confirmation_token = null;
      }

      const { error: upErr } = await supabaseAdmin
        .from("orders")
        .update(update)
        .eq("id", data.order_id);
      if (upErr) {
        console.error("confirmOrder update failed", upErr);
        return { ok: false as const, error: "Failed to confirm order." };
      }
      return { ok: true as const, status: nextStatus };
    } catch (e) {
      console.error("confirmOrder failed", e);
      return { ok: false as const, error: "Failed to confirm order." };
    }
  });
