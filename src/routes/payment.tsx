import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyPaymobOrder as verifyPaymobOrderFn } from "@/lib/paymob.functions";
import { useCart } from "@/lib/cart";
import { useNavigate } from "@tanstack/react-router";
import { CartLoading } from "@/components/site/CartLoading";
import { RouteErrorState } from "@/components/site/RouteErrorState";

const searchSchema = z.object({
  url: z.string().url().optional(),
  order: z.string().optional(),
});

export const Route = createFileRoute("/payment")({
  validateSearch: (s) => searchSchema.parse(s),
  component: PaymentPage,
  pendingMs: 150,
  pendingComponent: () => <CartLoading label="Preparing checkout…" />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} title="Checkout failed to load" />
  ),
});

function PaymentPage() {
  const { url, order } = useSearch({ from: "/payment" });
  const verify = useServerFn(verifyPaymobOrderFn);
  const { clear, loaded } = useCart();
  const nav = useNavigate();
  const [status, setStatus] = useState<"pending" | "paid" | "failed" | null>(null);
  const stoppedRef = useRef(false);

  // Poll Paymob via our server-side inquiry while the iframe is open.
  // When the order is confirmed paid, clear the cart and forward to the
  // shared /payment/callback success screen — exactly like the wallet flow.
  useEffect(() => {
    if (!order || !url) return;
    stoppedRef.current = false;
    let attempts = 0;
    // Exponential backoff: 3s, 6s, 12s, 24s, then 30s cap.
    // ~7 minutes total with ~17 calls instead of 120.
    const delays = [3000, 6000, 12000, 24000];
    const maxDelay = 30000;
    const maxAttempts = 20;
    const nextDelay = (a: number) => delays[a] ?? maxDelay;
    const tick = async () => {
      if (stoppedRef.current) return;
      attempts += 1;
      try {
        const res = await verify({ data: { order_id: order } });
        if (res.ok) {
          setStatus(res.status as "pending" | "paid" | "failed");
          if (res.status === "paid") {
            stoppedRef.current = true;
            console.log("[payment] Visa verified paid, clearing cart", order);
            clear();
            nav({
              to: "/payment-success",
              search: {
                success: true,
                pending: false,
                merchant_order_id: order,
                order: undefined,
                txn_id: undefined,
              },
            });
            return;
          }
          if (res.status === "failed") {
            stoppedRef.current = true;
            nav({
              to: "/payment-success",
              search: {
                success: false,
                pending: false,
                merchant_order_id: order,
                order: undefined,
                txn_id: undefined,
              },
            });
            return;
          }
        }
      } catch (err) {
        console.error("[payment] verifyPaymobOrder poll failed", err);
      }
      if (attempts < maxAttempts && !stoppedRef.current) {
        setTimeout(tick, nextDelay(attempts));
      }
    };
    const t = setTimeout(tick, nextDelay(0));
    return () => {
      stoppedRef.current = true;
      clearTimeout(t);
    };
  }, [order, url, verify, clear, nav]);

  if (!loaded) return <CartLoading label="Preparing checkout…" />;

  if (!url || typeof url !== "string") {
    return (
      <div className="bg-background min-h-screen">
        <Header />
        <div className="pt-32 pb-32 max-w-3xl mx-auto px-6 text-center">
          <h1 className="font-display text-4xl">No active payment</h1>
          <p className="mt-3 text-muted-foreground text-sm">
            Start a checkout from your bag to pay online.
          </p>
          <Link to="/cart" className="link-underline text-foreground mt-6 inline-block">
            Back to bag
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-28 pb-16 max-w-5xl mx-auto px-4 lg:px-8">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Secure checkout</div>
        <h1 className="font-display text-3xl md:text-4xl mt-2">
          Complete your payment
        </h1>
        {order && (
          <p className="text-xs text-muted-foreground mt-1">
            Order #{order.slice(0, 8)}
          </p>
        )}
        {status === "pending" && (
          <p className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-2">
            Waiting for confirmation…
          </p>
        )}
        <div className="mt-6 border border-border rounded-sm overflow-hidden bg-muted">
          <iframe
            src={url}
            title="Paymob payment"
            className="w-full"
            style={{ height: "min(85vh, 900px)" }}
            allow="payment"
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}