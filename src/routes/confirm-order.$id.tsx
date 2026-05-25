import { createFileRoute, Link, useParams, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, AlertCircle, Pencil } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useServerFn } from "@tanstack/react-start";
import {
  loadConfirmOrder as loadConfirmOrderFn,
  confirmOrder as confirmOrderFn,
} from "@/lib/orders.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderStatusBadge } from "@/components/site/OrderStatusBadge";

const searchSchema = (s: Record<string, unknown>) => ({
  token: typeof s.token === "string" ? s.token : "",
});

export const Route = createFileRoute("/confirm-order/$id")({
  validateSearch: searchSchema,
  component: ConfirmOrderPage,
});

type OrderItem = { id: string; product_name: string; quantity: number; price: number };
type OrderData = {
  id: string;
  status: string;
  total: number;
  phone: string;
  shipping_address: string;
  confirmed_at: string | null;
  created_at: string;
};

function ConfirmOrderPage() {
  const { id } = useParams({ from: "/confirm-order/$id" });
  const { token } = useSearch({ from: "/confirm-order/$id" });
  const load = useServerFn(loadConfirmOrderFn);
  const confirm = useServerFn(confirmOrderFn);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await load({ data: { order_id: id, token } });
        if (cancelled) return;
        if (!res.ok) {
          setError(res.error);
        } else {
          setOrder(res.order);
          setItems(res.items);
          setAddress(res.order.shipping_address);
          setPhone(res.order.phone);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load order.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, token, load]);

  const submit = async (withEdits: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      const payload: {
        order_id: string;
        token: string;
        shipping_address?: string;
        phone?: string;
      } = { order_id: id, token };
      if (withEdits) {
        payload.shipping_address = address;
        payload.phone = phone;
      }
      const res = await confirm({ data: payload });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDone(true);
      setOrder((cur) =>
        cur
          ? {
              ...cur,
              status: res.status ?? cur.status,
              shipping_address: withEdits ? address : cur.shipping_address,
              phone: withEdits ? phone : cur.phone,
              confirmed_at: new Date().toISOString(),
            }
          : cur,
      );
      setEditing(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to confirm.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-2xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Order confirmation</div>
        <h1 className="font-display text-4xl md:text-5xl mt-2">Please confirm your order</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          Verify your delivery details so we can ship your order without delay.
        </p>

        {loading && (
          <div className="mt-12 flex items-center gap-3 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading your order…
          </div>
        )}

        {!loading && error && !order && (
          <div className="mt-12 glass p-6 rounded-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-display text-xl">We couldn't open this link</div>
              <div className="text-sm text-muted-foreground mt-1">{error}</div>
              <Link to="/account" className="link-underline text-xs uppercase tracking-luxe mt-4 inline-block">
                Go to your account
              </Link>
            </div>
          </div>
        )}

        {!loading && order && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-10 space-y-8"
          >
            <div className="glass p-6 rounded-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Order</div>
                  <div className="font-mono text-sm mt-1">#{order.id.slice(0, 8)}</div>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              {!editing ? (
                <div className="space-y-3 pt-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Phone</div>
                    <div className="text-sm mt-1">{order.phone}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">Shipping address</div>
                    <div className="text-sm mt-1 whitespace-pre-wrap">{order.shipping_address}</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Phone</label>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Shipping address</label>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="glass p-6 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-3">Items</div>
              <div className="space-y-2">
                {items.length === 0 && (
                  <div className="text-sm text-muted-foreground">No items found.</div>
                )}
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm">
                    <span>
                      {it.product_name} <span className="text-muted-foreground">× {it.quantity}</span>
                    </span>
                    <span className="tabular-nums">${(Number(it.price) * it.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-border mt-4 pt-3 flex justify-between font-display text-xl">
                <span>Total</span>
                <span className="tabular-nums">${order.total.toFixed(2)}</span>
              </div>
            </div>

            {error && <div className="text-xs text-destructive">{error}</div>}

            {done ? (
              <div className="glass p-6 rounded-sm flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-accent flex-shrink-0" />
                <div>
                  <div className="font-display text-xl">Order confirmed</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Thank you. We're preparing your order for shipment.
                  </div>
                  <div className="mt-4 flex gap-3">
                    <Link to="/" className="px-5 py-2 text-xs uppercase tracking-luxe bg-noir text-cream">
                      Go home
                    </Link>
                    <Link to="/account" className="px-5 py-2 text-xs uppercase tracking-luxe border border-border hover:border-accent">
                      View orders
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {!editing ? (
                  <>
                    <Button onClick={() => submit(false)} disabled={submitting}>
                      {submitting ? "Confirming…" : "Confirm information"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(true)} disabled={submitting}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit information
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => submit(true)} disabled={submitting}>
                      {submitting ? "Saving…" : "Save & confirm"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditing(false)} disabled={submitting}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>
      <Footer />
    </div>
  );
}
