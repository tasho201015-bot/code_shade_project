import { createFileRoute, Link, useSearch, useNavigate } from "@tanstack/react-router";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useServerFn } from "@tanstack/react-start";
import { verifyPaymobOrder as verifyPaymobOrderFn } from "@/lib/paymob.functions";
import { getConfirmationToken as getConfirmationTokenFn } from "@/lib/orders.functions";
import { useI18n } from "@/lib/i18n";



// Paymob appends many params; only pick the ones we care about.
const searchSchema = (s: Record<string, unknown>) => ({
  success: String(s.success ?? "") === "true",
  pending: String(s.pending ?? "") === "true",
  order: typeof s.order === "string" ? s.order : undefined,
  merchant_order_id:
    typeof s.merchant_order_id === "string" ? s.merchant_order_id : undefined,
  txn_id: typeof s.id === "string" ? s.id : undefined,
});

export const Route = createFileRoute("/payment-success")({
  validateSearch: searchSchema,
  component: PaymentSuccessPage,
});

type Status = "verifying" | "paid" | "pending" | "failed";

function PaymentSuccessPage() {
  const { t } = useI18n();

  const { success, pending, merchant_order_id, order } = useSearch({
    from: "/payment-success",
  });
  const orderRef = merchant_order_id ?? order;
  const verify = useServerFn(verifyPaymobOrderFn);
  const getToken = useServerFn(getConfirmationTokenFn);
  const { clear, loaded } = useCart();
  const nav = useNavigate();
  const [status, setStatus] = useState<Status>(
    success ? "paid" : pending ? "pending" : "verifying",
  );
  const cleared = useRef(false);

  // Clear cart eagerly on URL success flag.
  useEffect(() => {
    if (loaded && success && !cleared.current) {
      cleared.current = true;
      clear();
    }
  }, [loaded, success, clear]);

  // Server-side verification (and polling for pending).
  useEffect(() => {
    if (!orderRef) {
      if (status === "verifying") setStatus(success ? "paid" : "failed");
      return;
    }
    let cancelled = false;
    let attempts = 0;
    // Exponential backoff: 3s, 6s, 12s, 24s, then 30s cap.
    const delays = [3000, 6000, 12000, 24000];
    const maxDelay = 30000;
    const max = 12;
    const nextDelay = (a: number) => delays[a] ?? maxDelay;

    const tick = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await verify({ data: { order_id: orderRef } });
        if (cancelled) return;
        if (res.ok) {
          const s = res.status as "paid" | "pending" | "failed";
          setStatus(s);
          if (s === "paid" && !cleared.current) {
            cleared.current = true;
            console.log("[payment-success] verified paid, clearing cart", orderRef);
            clear();
            // Forward to the customer confirmation page so they can verify
            // their address & phone before we ship the paid order.
            try {
              const res2 = await getToken({ data: { order_id: orderRef } });
              const tok = res2.ok ? res2.token : null;


              if (tok) {
                nav({
                  to: "/confirm-order/$id",
                  params: { id: orderRef },
                  search: { token: tok },
                  replace: true,
                });
              }
            } catch (e) {
              console.warn("[payment-success] confirm token fetch failed", e);
            }
            return;
          }
          if (s === "failed") return;
        }
      } catch (err) {
        console.error("[payment-success] verify failed", err);
      }
      if (attempts < max && !cancelled) {
        setTimeout(tick, nextDelay(attempts));
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderRef]);

  const isPaid = status === "paid";
  const isPending = status === "pending" || status === "verifying";
  const isFailed = status === "failed";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-2xl mx-auto px-6 text-center">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 16 }}
          className="flex justify-center mb-6"
        >
          {isPaid && <CheckCircle2 className="w-20 h-20 text-accent" strokeWidth={1.5} />}
          {status === "verifying" && (
            <Loader2 className="w-16 h-16 text-muted-foreground animate-spin" strokeWidth={1.5} />
          )}
          {status === "pending" && (
            <Clock className="w-20 h-20 text-foreground" strokeWidth={1.5} />
          )}
          {isFailed && <XCircle className="w-20 h-20 text-destructive" strokeWidth={1.5} />}
        </motion.div>

        <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
          {t("psucc.status")}
        </div>
        <h1
          className={`font-display text-5xl md:text-6xl mt-3 ${
            isPaid ? "text-accent" : isFailed ? "text-destructive" : "text-foreground"
          }`}
        >
          {isPaid && t("psucc.paid")}
          {status === "verifying" && t("psucc.verifying")}
          {status === "pending" && t("psucc.pending")}
          {isFailed && t("psucc.failed")}
        </h1>
        <p className="mt-4 text-muted-foreground">
          {isPaid && t("psucc.paidDesc")}
          {status === "verifying" && t("psucc.verifyingDesc")}
          {status === "pending" && t("psucc.pendingDesc")}
          {isFailed && t("psucc.failedDesc")}
        </p>
        {orderRef && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t("psucc.ref")}: <span className="font-mono">{orderRef.slice(0, 12)}</span>
          </p>
        )}

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/"
            className="px-6 py-3 text-xs uppercase tracking-luxe bg-noir text-cream"
          >
            {t("psucc.goHome")}
          </Link>
          <Link
            to="/account"
            className="px-6 py-3 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors"
          >
            {t("psucc.viewOrders")}
          </Link>
          {isFailed && (
            <Link
              to="/cart"
              className="px-6 py-3 text-xs uppercase tracking-luxe border border-destructive text-destructive hover:bg-destructive hover:text-background transition-colors"
            >
              {t("psucc.backToBag")}
            </Link>
          )}
        </div>

      </div>
      <Footer />
    </div>
  );
}
