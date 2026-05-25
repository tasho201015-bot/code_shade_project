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

export const Route = createFileRoute("/api/public/paymob/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.PAYMOB_HMAC_SECRET;
        if (!secret) {
          console.error("[paymob-callback] PAYMOB_HMAC_SECRET not configured");
          // Always return 200 per spec
          return new Response("ok", { status: 200 });
        }

        const url = new URL(request.url);
        const providedHmac =
          url.searchParams.get("hmac") ??
          request.headers.get("x-paymob-hmac") ??
          "";

        let payload: any = null;
        try {
          payload = await request.json();
        } catch {
          console.error("[paymob-callback] Invalid JSON payload");
          return new Response("ok", { status: 200 });
        }

        console.log("[paymob-callback] Received payload", JSON.stringify(payload));

        const obj = payload?.obj ?? payload;
        if (!obj) {
          console.error("[paymob-callback] Missing obj in payload");
          return new Response("ok", { status: 200 });
        }

        const expected = computeHmac(secret, obj);
        if (!providedHmac || providedHmac.toLowerCase() !== expected.toLowerCase()) {
          console.warn("[paymob-callback] Invalid HMAC", {
            provided: providedHmac?.slice(0, 12),
            expected: expected.slice(0, 12),
            order_id: obj?.order?.id,
            merchant_order_id: obj?.order?.merchant_order_id,
          });
          return new Response("ok", { status: 200 });
        }

        const success = Boolean(obj.success);
        const transactionId = obj.id != null ? String(obj.id) : null;
        const paymobOrderId = obj.order?.id != null ? String(obj.order.id) : null;
        const merchantOrderId =
          (obj.order?.merchant_order_id as string | undefined) ?? null;

        console.log("[paymob-callback] Verified event", {
          transactionId,
          paymobOrderId,
          merchantOrderId,
          success,
        });

        if (!paymobOrderId && !merchantOrderId) {
          console.error("[paymob-callback] Missing order reference");
          return new Response("ok", { status: 200 });
        }

        const newStatus = success ? "paid_pending_confirmation" : "failed";

        let lookup = supabaseAdmin.from("orders").select("id,status").limit(1);
        if (merchantOrderId) {
          lookup = lookup.eq("id", merchantOrderId);
        } else if (paymobOrderId) {
          lookup = lookup.eq("paymob_order_id", paymobOrderId);
        }
        const { data: rows, error: lookupErr } = await lookup;
        if (lookupErr) {
          console.error("[paymob-callback] Lookup failed", lookupErr);
          return new Response("ok", { status: 200 });
        }
        const existing = rows?.[0];
        if (!existing) {
          console.error("[paymob-callback] Order not found", {
            merchantOrderId,
            paymobOrderId,
          });
          return new Response("ok", { status: 200 });
        }

        // Idempotency: don't downgrade orders past the paid stage
        const PAID_OR_BEYOND = new Set([
          "paid_pending_confirmation",
          "confirmed_paid",
          "shipped",
          "delivered",
        ]);
        const cur = existing.status?.toLowerCase() ?? "";
        if (PAID_OR_BEYOND.has(cur) && !PAID_OR_BEYOND.has(newStatus)) {
          console.log("[paymob-callback] Skipping downgrade of paid order", existing.id);
          return new Response("ok", { status: 200 });
        }
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
          console.error("[paymob-callback] Update failed", error);
          return new Response("ok", { status: 200 });
        }

        console.log("[paymob-callback] Order updated", {
          orderId: existing.id,
          newStatus,
        });

        return new Response("ok", { status: 200 });
      },
    },
  },
});