import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";

// Legacy redirect: forward to /payment-success preserving Paymob params.
const searchSchema = (s: Record<string, unknown>) => ({
  success: String(s.success ?? "") === "true",
  pending: String(s.pending ?? "") === "true",
  order: typeof s.order === "string" ? s.order : undefined,
  merchant_order_id:
    typeof s.merchant_order_id === "string" ? s.merchant_order_id : undefined,
  txn_id: typeof s.id === "string" ? s.id : undefined,
});

export const Route = createFileRoute("/payment/callback")({
  validateSearch: searchSchema,
  component: LegacyCallbackRedirect,
});

function LegacyCallbackRedirect() {
  const search = useSearch({ from: "/payment/callback" });
  const nav = useNavigate();
  useEffect(() => {
    nav({
      to: "/payment-success",
      search: {
        success: search.success,
        pending: search.pending,
        merchant_order_id: search.merchant_order_id,
        order: search.order,
        txn_id: search.txn_id,
      },
      replace: true,
    });
  }, [nav, search]);
  return (
    <div className="bg-background min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Redirecting…</p>
    </div>
  );
}
