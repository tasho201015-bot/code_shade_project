import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateConfirmationToken(): string {
  return randomBytes(24).toString("hex");
}

const PaySchema = z.object({
  shipping_address: z.string().trim().min(5).max(1000),
  governorate: z.string().trim().min(2).max(80),
  city: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(5).max(40),
  access_token: z.string().optional(),
  items: z
    .array(
      z.object({
        product_id: z.string().min(1).max(120),
        quantity: z.number().int().min(1).max(99),
        color: z.string().trim().max(80).optional(),
        size: z.string().trim().max(40).optional(),
      }),
    )
    .min(1)
    .max(50),
});

const WalletPaySchema = PaySchema.extend({
  wallet_phone: z
    .string()
    .trim()
    .regex(/^01[0125]\d{8}$/u, "Enter a valid Egyptian mobile number (11 digits, starts with 01)"),
});

const PAYMOB_BASE = "https://accept.paymob.com/api";

async function paymobAuth(apiKey: string): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/auth/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) throw new Error(`Paymob auth failed (${res.status})`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("Paymob auth: missing token");
  return data.token;
}

async function paymobRegisterOrder(
  authToken: string,
  amountCents: number,
  merchantOrderId: string,
  items: { name: string; amount_cents: number; quantity: number }[],
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/ecommerce/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: authToken,
      delivery_needed: false,
      amount_cents: amountCents,
      currency: "EGP",
      merchant_order_id: merchantOrderId,
      items,
    }),
  });
  if (!res.ok) throw new Error(`Paymob register order failed (${res.status})`);
  const data = (await res.json()) as { id?: number | string };
  if (data.id === undefined) throw new Error("Paymob register order: missing id");
  return String(data.id);
}

async function paymobPaymentKey(args: {
  authToken: string;
  amountCents: number;
  paymobOrderId: string;
  integrationId: string;
  billing: {
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    street: string;
  };
}): Promise<string> {
  const billing_data = {
    apartment: "NA",
    email: args.billing.email,
    floor: "NA",
    first_name: args.billing.first_name || "NA",
    street: args.billing.street || "NA",
    building: "NA",
    phone_number: args.billing.phone,
    shipping_method: "NA",
    postal_code: "NA",
    city: "NA",
    country: "EG",
    last_name: args.billing.last_name || "NA",
    state: "NA",
  };
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payment_keys`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_token: args.authToken,
      amount_cents: args.amountCents,
      expiration: 3600,
      order_id: args.paymobOrderId,
      billing_data,
      currency: "EGP",
      integration_id: Number(args.integrationId),
    }),
  });
  if (!res.ok) throw new Error(`Paymob payment key failed (${res.status})`);
  const data = (await res.json()) as { token?: string };
  if (!data.token) throw new Error("Paymob payment key: missing token");
  return data.token;
}

export const createPaymobCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PaySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.PAYMOB_API_KEY;
      const integrationId = process.env.PAYMOB_INTEGRATION_ID;
      const iframeId = process.env.PAYMOB_IFRAME_ID;
      if (!apiKey || !integrationId || !iframeId) {
        return { ok: false as const, error: "Paymob is not configured." };
      }

      if (data.items.some((i) => i.product_id.startsWith("sample-"))) {
        return { ok: false as const, error: "Please remove sample items from your bag." };
      }

      const authHeader = getRequestHeader("authorization");
      const token =
        data.access_token ||
        (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");
      if (!token) return { ok: false as const, error: "Please sign in before paying." };

      const { data: claimsData, error: claimsErr } = await supabaseAdmin.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;
      const userEmail = (claimsData?.claims?.email as string | undefined) ?? "noreply@example.com";
      if (claimsErr || !userId) {
        return { ok: false as const, error: "Your session could not be verified." };
      }

      // Verify products and price server-side
      const ids = Array.from(new Set(data.items.map((i) => i.product_id)));
      const { data: products, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock, is_active")
        .in("id", ids);
      if (prodErr) return { ok: false as const, error: "Failed to load products." };
      if (!products || products.length !== ids.length) {
        return { ok: false as const, error: "One or more products are unavailable." };
      }

      const map = new Map(products.map((p) => [p.id, p]));
      let total = 0;
      const verifiedItems = data.items.map((i) => {
        const p = map.get(i.product_id)!;
        if (!p.is_active) throw new Error(`Product unavailable: ${p.name}`);
        if (p.stock < i.quantity) throw new Error(`Insufficient stock: ${p.name}`);
        const lineTotal = Number(p.price) * i.quantity;
        total += lineTotal;
        const variantParts = [i.color, i.size].filter(Boolean);
        const displayName = variantParts.length
          ? `${p.name} (${variantParts.join(" · ")})`
          : p.name;
        return {
          product_id: p.id,
          product_name: displayName,
          price: Number(p.price),
          quantity: i.quantity,
        };
      });
      total = Math.round(total * 100) / 100;
      const amountCents = Math.round(total * 100);

      // Create local order in pending state
      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          total,
          status: "pending",
          confirmation_token: generateConfirmationToken(),
          shipping_address: data.shipping_address,
          governorate: data.governorate,
          city: data.city,
          phone: data.phone,
          payment_provider: "paymob",
        })
        .select("id")
        .single();
      if (orderErr || !order) return { ok: false as const, error: "Failed to create order." };

      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(verifiedItems.map((i) => ({ ...i, order_id: order.id })));
      if (itemsErr) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        return { ok: false as const, error: "Failed to create order items." };
      }

      // Talk to Paymob
      try {
        const authToken = await paymobAuth(apiKey);
        const paymobOrderId = await paymobRegisterOrder(
          authToken,
          amountCents,
          order.id,
          verifiedItems.map((i) => ({
            name: i.product_name.slice(0, 50),
            amount_cents: Math.round(Number(i.price) * 100),
            quantity: i.quantity,
          })),
        );
        const paymentKey = await paymobPaymentKey({
          authToken,
          amountCents,
          paymobOrderId,
          integrationId,
          billing: {
            email: userEmail,
            phone: data.phone,
            first_name: "Customer",
            last_name: "User",
            street: data.shipping_address,
          },
        });

        await supabaseAdmin
          .from("orders")
          .update({ paymob_order_id: paymobOrderId })
          .eq("id", order.id);

        const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
        return { ok: true as const, orderId: order.id, iframeUrl };
      } catch (paymobErr) {
        // Roll back the order so user can retry cleanly
        await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        const msg = paymobErr instanceof Error ? paymobErr.message : "Paymob request failed";
        console.error("Paymob checkout failed", paymobErr);
        return { ok: false as const, error: `Payment provider error: ${msg}` };
      }
    } catch (error) {
      console.error("createPaymobCheckout failed", error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Failed to start payment.",
      };
    }
  });

async function paymobWalletPay(
  paymentKey: string,
  walletPhone: string,
): Promise<string> {
  const res = await fetch(`${PAYMOB_BASE}/acceptance/payments/pay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: { identifier: walletPhone, subtype: "WALLET" },
      payment_token: paymentKey,
    }),
  });
  if (!res.ok) throw new Error(`Paymob wallet pay failed (${res.status})`);
  const data = (await res.json()) as {
    redirect_url?: string;
    iframe_redirection_url?: string;
    redirection_url?: string;
  };
  const url = data.redirect_url || data.iframe_redirection_url || data.redirection_url;
  if (!url) throw new Error("Paymob wallet pay: missing redirect url");
  return url;
}

export const createPaymobWalletCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => WalletPaySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      const apiKey = process.env.PAYMOB_API_KEY;
      const walletIntegrationId = process.env.PAYMOB_WALLET_INTEGRATION_ID;
      if (!apiKey || !walletIntegrationId) {
        return { ok: false as const, error: "Mobile wallet payment is not configured." };
      }

      if (data.items.some((i) => i.product_id.startsWith("sample-"))) {
        return { ok: false as const, error: "Please remove sample items from your bag." };
      }

      const authHeader = getRequestHeader("authorization");
      const token =
        data.access_token ||
        (authHeader?.startsWith("Bearer ") ? authHeader.replace("Bearer ", "") : "");
      if (!token) return { ok: false as const, error: "Please sign in before paying." };

      const { data: claimsData, error: claimsErr } = await supabaseAdmin.auth.getClaims(token);
      const userId = claimsData?.claims?.sub;
      const userEmail = (claimsData?.claims?.email as string | undefined) ?? "noreply@example.com";
      if (claimsErr || !userId) {
        return { ok: false as const, error: "Your session could not be verified." };
      }

      const ids = Array.from(new Set(data.items.map((i) => i.product_id)));
      const { data: products, error: prodErr } = await supabaseAdmin
        .from("products")
        .select("id, name, price, stock, is_active")
        .in("id", ids);
      if (prodErr) return { ok: false as const, error: "Failed to load products." };
      if (!products || products.length !== ids.length) {
        return { ok: false as const, error: "One or more products are unavailable." };
      }

      const map = new Map(products.map((p) => [p.id, p]));
      let total = 0;
      const verifiedItems = data.items.map((i) => {
        const p = map.get(i.product_id)!;
        if (!p.is_active) throw new Error(`Product unavailable: ${p.name}`);
        if (p.stock < i.quantity) throw new Error(`Insufficient stock: ${p.name}`);
        const lineTotal = Number(p.price) * i.quantity;
        total += lineTotal;
        const variantParts = [i.color, i.size].filter(Boolean);
        const displayName = variantParts.length
          ? `${p.name} (${variantParts.join(" · ")})`
          : p.name;
        return {
          product_id: p.id,
          product_name: displayName,
          price: Number(p.price),
          quantity: i.quantity,
        };
      });
      total = Math.round(total * 100) / 100;
      const amountCents = Math.round(total * 100);

      const { data: order, error: orderErr } = await supabaseAdmin
        .from("orders")
        .insert({
          user_id: userId,
          total,
          status: "pending",
          confirmation_token: generateConfirmationToken(),
          shipping_address: data.shipping_address,
          governorate: data.governorate,
          city: data.city,
          phone: data.phone,
          payment_provider: "paymob_wallet",
        })
        .select("id")
        .single();
      if (orderErr || !order) return { ok: false as const, error: "Failed to create order." };

      const { error: itemsErr } = await supabaseAdmin
        .from("order_items")
        .insert(verifiedItems.map((i) => ({ ...i, order_id: order.id })));
      if (itemsErr) {
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        return { ok: false as const, error: "Failed to create order items." };
      }

      try {
        const authToken = await paymobAuth(apiKey);
        const paymobOrderId = await paymobRegisterOrder(
          authToken,
          amountCents,
          order.id,
          verifiedItems.map((i) => ({
            name: i.product_name.slice(0, 50),
            amount_cents: Math.round(Number(i.price) * 100),
            quantity: i.quantity,
          })),
        );
        const paymentKey = await paymobPaymentKey({
          authToken,
          amountCents,
          paymobOrderId,
          integrationId: walletIntegrationId,
          billing: {
            email: userEmail,
            phone: data.wallet_phone,
            first_name: "Customer",
            last_name: "User",
            street: data.shipping_address,
          },
        });

        await supabaseAdmin
          .from("orders")
          .update({ paymob_order_id: paymobOrderId })
          .eq("id", order.id);

        const redirectUrl = await paymobWalletPay(paymentKey, data.wallet_phone);
        return { ok: true as const, orderId: order.id, redirectUrl };
      } catch (paymobErr) {
        await supabaseAdmin.from("order_items").delete().eq("order_id", order.id);
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
        const msg = paymobErr instanceof Error ? paymobErr.message : "Paymob request failed";
        console.error("Paymob wallet checkout failed", paymobErr);
        return { ok: false as const, error: `Payment provider error: ${msg}` };
      }
    } catch (error) {
      console.error("createPaymobWalletCheckout failed", error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Failed to start wallet payment.",
      };
    }
  });

const VerifySchema = z.object({
  order_id: z.string().uuid().optional(),
  paymob_order_id: z.string().min(1).max(64).optional(),
});

/**
 * Server-side fallback verification used by the payment callback page.
 * Queries Paymob's transaction inquiry API using the merchant_order_id
 * (our local order id) and updates the order status accordingly.
 * This guards against the case where the webhook has not yet been
 * delivered or was missed.
 */
export const verifyPaymobOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => VerifySchema.parse(input))
  .handler(async ({ data }) => {
    try {
      if (!data.order_id && !data.paymob_order_id) {
        return { ok: false as const, error: "Missing order reference." };
      }
      const apiKey = process.env.PAYMOB_API_KEY;
      if (!apiKey) {
        console.error("[verifyPaymobOrder] PAYMOB_API_KEY not configured");
        return { ok: false as const, error: "Payment provider not configured." };
      }

      // Find local order
      let q = supabaseAdmin
        .from("orders")
        .select("id,status,paymob_order_id")
        .limit(1);
      if (data.order_id) q = q.eq("id", data.order_id);
      else if (data.paymob_order_id) q = q.eq("paymob_order_id", data.paymob_order_id);
      const { data: rows, error: lookupErr } = await q;
      if (lookupErr) {
        console.error("[verifyPaymobOrder] Lookup failed", lookupErr);
        return { ok: false as const, error: "Failed to load order." };
      }
      const order = rows?.[0];
      if (!order) return { ok: false as const, error: "Order not found." };

      // Already settled (or beyond)
      const PAID_OR_BEYOND = new Set([
        "paid_pending_confirmation",
        "confirmed_paid",
        "shipped",
        "delivered",
      ]);
      const curStatus = order.status?.toLowerCase() ?? "";
      if (PAID_OR_BEYOND.has(curStatus)) {
        return { ok: true as const, status: "paid" as const };
      }

      // Ask Paymob for the latest transaction tied to this merchant order id
      const authToken = await paymobAuth(apiKey);
      const inquiryRes = await fetch(
        `${PAYMOB_BASE}/ecommerce/orders/transaction_inquiry`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_token: authToken,
            merchant_order_id: order.id,
          }),
        },
      );

      if (!inquiryRes.ok) {
        console.warn("[verifyPaymobOrder] Inquiry HTTP error", inquiryRes.status);
        return { ok: true as const, status: order.status?.toLowerCase() ?? "pending" };
      }
      const inquiry = (await inquiryRes.json()) as {
        success?: boolean;
        pending?: boolean;
        id?: number | string;
        order?: { id?: number | string };
      };

      console.log("[verifyPaymobOrder] Inquiry response", {
        orderId: order.id,
        success: inquiry.success,
        pending: inquiry.pending,
        txn: inquiry.id,
      });

      const dbStatus = inquiry.success
        ? "paid_pending_confirmation"
        : inquiry.pending
        ? "pending_confirmation"
        : "failed";

      // Don't downgrade
      if (PAID_OR_BEYOND.has(curStatus) && !PAID_OR_BEYOND.has(dbStatus)) {
        return { ok: true as const, status: "paid" as const };
      }

      const update: {
        status: string;
        paymob_transaction_id?: string;
        paymob_order_id?: string;
      } = { status: dbStatus };
      if (inquiry.id != null) update.paymob_transaction_id = String(inquiry.id);
      if (inquiry.order?.id != null) update.paymob_order_id = String(inquiry.order.id);

      const { error: updErr } = await supabaseAdmin
        .from("orders")
        .update(update)
        .eq("id", order.id);
      if (updErr) {
        console.error("[verifyPaymobOrder] Update failed", updErr);
        return { ok: false as const, error: "Failed to update order status." };
      }

      // Decrement stock the first time the order is observed as paid.
      // Idempotent with the webhook: the PAID_OR_BEYOND early return above
      // guarantees this branch only runs on the first paid transition.
      if (inquiry.success && !PAID_OR_BEYOND.has(curStatus)) {
        const { data: items } = await supabaseAdmin
          .from("order_items")
          .select("product_id,quantity")
          .eq("order_id", order.id);
        if (items && items.length > 0) {
          const { error: stockErr } = await supabaseAdmin.rpc("decrement_product_stock", {
            p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
          });
          if (stockErr) {
            console.error("[verifyPaymobOrder] Stock decrement failed", {
              orderId: order.id,
              error: stockErr.message,
            });
          }
        }
      }

      // Map db status back to the simplified status the client expects
      const clientStatus: "paid" | "pending" | "failed" = inquiry.success
        ? "paid"
        : inquiry.pending
        ? "pending"
        : "failed";
      return { ok: true as const, status: clientStatus };
    } catch (error) {
      console.error("[verifyPaymobOrder] failed", error);
      return {
        ok: false as const,
        error: error instanceof Error ? error.message : "Verification failed.",
      };
    }
  });