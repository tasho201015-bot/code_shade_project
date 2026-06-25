import { createFileRoute } from "@tanstack/react-router";
import { createHmac } from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Paymob HMAC field order (transaction processed callback)
// https://docs.paymob.com/docs/hmac-calculation
const HMAC_FIELDS = [
  "amount_cents",
  "created_at",
  "currency",
  "error_occured",
  "has_parent_transaction",
  "id",
  "integration_id",
  "is_3d_secure",
  "is_auth",
  "is_capture",
  "is_refunded",
  "is_standalone_payment",
  "is_voided",
  "order.id",
  "owner",
  "pending",
  "source_data.pan",
  "source_data.sub_type",
  "source_data.type",
  "success",
] as const;

function getNested(obj: any, path: string): unknown {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function computeHmac(secret: string, obj: any): string {
  const concat = HMAC_FIELDS.map((f) => {
    const v = getNested(obj, f);
    return v === undefined || v === null ? "" : String(v);
  }).join("");
  return createHmac("sha512", secret).update(concat).digest("hex");
}

export const Route = createFileRoute("/api/public/paymob-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYMOB_HMAC_SECRET;
        if (!secret) {
          console.error("[paymob-webhook] PAYMOB_HMAC_SECRET not configured");
          return new Response("Webhook not configured", { status: 500 });
        }

        const url = new URL(request.url);
        const providedHmac =
          url.searchParams.get("hmac") ??
          request.headers.get("x-paymob-hmac") ??
          "";

        let payload: any;
        try {
          payload = await request.json();
        } catch {
          console.error("[paymob-webhook] Invalid JSON payload");
          return new Response("Invalid JSON", { status: 400 });
        }

        const obj = payload?.obj ?? payload;
        if (!obj) {
          console.error("[paymob-webhook] Missing obj in payload", payload);
          return new Response("Missing obj", { status: 400 });
        }

        const expected = computeHmac(secret, obj);
        if (!providedHmac || providedHmac.toLowerCase() !== expected.toLowerCase()) {
          console.warn("[paymob-webhook] Invalid HMAC", {
            provided: providedHmac?.slice(0, 12),
            expected: expected.slice(0, 12),
            order_id: obj?.order?.id,
            merchant_order_id: obj?.order?.merchant_order_id,
          });
          return new Response("Invalid signature", { status: 401 });
        }

        const success = Boolean(obj.success);
        const pending = Boolean(obj.pending);
        const transactionId = obj.id != null ? String(obj.id) : null;
        const paymobOrderId = obj.order?.id != null ? String(obj.order.id) : null;
        const merchantOrderId =
          (obj.order?.merchant_order_id as string | undefined) ?? null;

        console.log("[paymob-webhook] Verified event", {
          transactionId,
          paymobOrderId,
          merchantOrderId,
          success,
          pending,
        });

        if (!paymobOrderId && !merchantOrderId) {
          console.error("[paymob-webhook] Missing order reference");
          return new Response("Missing order reference", { status: 400 });
        }

        const newStatus = success
          ? "paid_pending_confirmation"
          : pending
          ? "pending_confirmation"
          : "failed";

        // Look up the order first so we can apply idempotency (don't downgrade a paid order)
        let lookup = supabaseAdmin.from("orders").select("id,status").limit(1);
        if (merchantOrderId) {
          lookup = lookup.eq("id", merchantOrderId);
        } else if (paymobOrderId) {
          lookup = lookup.eq("paymob_order_id", paymobOrderId);
        }
        const { data: rows, error: lookupErr } = await lookup;
        if (lookupErr) {
          console.error("[paymob-webhook] Lookup failed", lookupErr);
          return new Response("Lookup failed", { status: 500 });
        }
        const existing = rows?.[0];
        if (!existing) {
          console.error("[paymob-webhook] Order not found", {
            merchantOrderId,
            paymobOrderId,
          });
          return new Response("Order not found", { status: 404 });
        }

        // Idempotency: never downgrade an order past the paid stage
        const PAID_OR_BEYOND = new Set([
          "paid_pending_confirmation",
          "confirmed_paid",
          "shipped",
          "delivered",
        ]);
        const cur = existing.status?.toLowerCase() ?? "";
        if (PAID_OR_BEYOND.has(cur) && !PAID_OR_BEYOND.has(newStatus)) {
          console.log("[paymob-webhook] Skipping downgrade of paid order", existing.id);
          return new Response("ok", { status: 200 });
        }
        // If already confirmed/shipped/delivered, don't revert to paid_pending_confirmation
        if (
          (cur === "confirmed_paid" || cur === "shipped" || cur === "delivered") &&
          newStatus === "paid_pending_confirmation"
        ) {
          return new Response("ok", { status: 200 });
        }

        const { error } = await supabaseAdmin
          .from("orders")
          .update({
            status: newStatus,
            paymob_transaction_id: transactionId,
            paymob_order_id: paymobOrderId,
          })
          .eq("id", existing.id);
        if (error) {
          console.error("[paymob-webhook] Update failed", error);
          return new Response("Update failed", { status: 500 });
        }

        // Atomically decrement stock the first time an order transitions to paid.
        // Idempotent: PAID_OR_BEYOND check above ensures we only get here once per order.
        if (success && !PAID_OR_BEYOND.has(cur)) {
          const { data: items } = await supabaseAdmin
            .from("order_items")
            .select("product_id,quantity")
            .eq("order_id", existing.id);
          if (items && items.length > 0) {
            const { error: stockErr } = await supabaseAdmin.rpc("decrement_product_stock", {
              p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
            });
            if (stockErr) {
              console.error("[paymob-webhook] Stock decrement failed", {
                orderId: existing.id,
                error: stockErr.message,
              });
            }
          }
        }

        // First-time paid transition: send order emails (best-effort).
        if (success && !PAID_OR_BEYOND.has(cur)) {
          try {
            const { data: orderRow } = await supabaseAdmin
              .from("orders")
              .select("id,user_id,total,shipping_address,governorate,city,phone")
              .eq("id", existing.id)
              .single();
            const { data: items } = await supabaseAdmin
              .from("order_items")
              .select("product_name,price,quantity")
              .eq("order_id", existing.id);
            if (orderRow) {
              const { sendOrderConfirmation, sendNewOrderToBusiness } = await import("@/lib/notifications.server");
              const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(orderRow.user_id);
              const customerEmail = userInfo?.user?.email ?? null;
              const emailItems = (items ?? []).map((i) => ({
                name: i.product_name as string,
                price: Number(i.price),
                quantity: Number(i.quantity),
              }));
              const shipping = `${orderRow.shipping_address ?? ""}\n${orderRow.city ?? ""}, ${orderRow.governorate ?? ""}\n${orderRow.phone ?? ""}`;
              const tasks: Promise<unknown>[] = [];
              if (customerEmail) {
                tasks.push(sendOrderConfirmation({
                  to: customerEmail, orderId: orderRow.id, total: Number(orderRow.total),
                  items: emailItems, shippingAddress: shipping,
                }));
              }
              tasks.push(sendNewOrderToBusiness({
                to: "", orderId: orderRow.id, total: Number(orderRow.total),
                items: emailItems, shippingAddress: shipping, customerEmail: customerEmail ?? undefined,
              }));
              await Promise.allSettled(tasks);
            }
          } catch (mailErr) {
            console.error("[paymob-webhook] notification dispatch failed", mailErr);
          }
        }

        console.log("[paymob-webhook] Order updated", {
          orderId: existing.id,
          newStatus,
        });

        return new Response("ok", { status: 200 });
      },
    },
  },
});