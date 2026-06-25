import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useServerFn } from "@tanstack/react-start";
import { cancelOrder as cancelOrderFn } from "@/lib/orders.functions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { OrderStatusBadge } from "@/components/site/OrderStatusBadge";
import { useI18n } from "@/lib/i18n";


export const Route = createFileRoute("/account")({
  component: AccountPage,
});

interface Order {
  id: string;
  total: number;
  status: string;
  created_at: string;
  shipping_address: string;
  items: OrderItem[];
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  price: number;
}

function AccountPage() {
  const { t } = useI18n();

  const { user, session, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const cancelOrder = useServerFn(cancelOrderFn);

  useEffect(() => {
    if (!user) return;

    const loadOrders = async () => {
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("id,total,status,created_at,shipping_address")
        .order("created_at", { ascending: false })
        .limit(20);

      if (orderError || !orderRows?.length) {
        setOrders([]);
        return;
      }

      const orderIds = orderRows.map((order) => order.id);
      const { data: itemRows } = await supabase
        .from("order_items")
        .select("id,order_id,product_name,quantity,price")
        .in("order_id", orderIds);

      setOrders(
        orderRows.map((order) => ({
          ...order,
          items: ((itemRows ?? []) as OrderItem[]).filter((item) => item.order_id === order.id),
        })) as Order[],
      );
    };

    loadOrders();
  }, [user]);

  const handleCancel = async (order: Order) => {
    setCancellingId(order.id);
    const result = await cancelOrder({ data: { order_id: order.id, access_token: session?.access_token } });
    setCancellingId(null);

    if (!result.ok) {
      toast.error(result.error ?? t("account.cancelError"));
      return;
    }

    setOrders((current) => current.map((item) => (item.id === order.id ? { ...item, status: "cancelled" } : item)));
    setSelectedOrder((current) => (current?.id === order.id ? { ...current, status: "cancelled" } : current));
    toast.success(t("account.cancelled"), { description: t("account.cancelledDesc", { ref: order.id.slice(0, 8) }) });

  };

  const isCancellable = (status: string) => {
    const s = status.toLowerCase();
    return s === "pending_confirmation" || s === "paid_pending_confirmation" || s === "confirmed_cod";
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-5xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">{t("account.eyebrow")}</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">{t("account.hello", { email: user?.email ?? "" })}</h1>

        <div className="mt-12">
          <h2 className="font-display text-2xl mb-6">{t("account.orders")}</h2>
          {orders.length === 0 ? (
            <div className="glass p-8 rounded-sm text-muted-foreground">{t("account.empty")}</div>
          ) : (

            <div className="space-y-4">
              {orders.map((o, idx) => (
                <motion.div
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-black p-6 rounded-[24px] border border-[#5A5A5A] grid gap-5 md:grid-cols-[1.1fr_0.8fr_0.7fr_auto] md:items-center"
                >
                  <div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">{t("account.orderId")}</div>
                    <div className="font-mono text-sm mt-1">#{o.id.slice(0, 8)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">{t("account.date")}</div>
                    <div className="text-sm mt-1">
                      {new Date(o.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">{t("account.total")}</div>
                    <div className="font-display text-2xl tabular-nums mt-1">${Number(o.total).toFixed(2)}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <OrderStatusBadge status={o.status} />
                    <Button
                      variant="outline"
                      size="sm"
                      className="bg-[#C9A96E] text-black border-[#C9A96E] hover:bg-[#C9A96E] hover:text-black hover:border-[#C9A96E]"
                      onClick={() => setSelectedOrder(o)}
                    >
                      {t("account.viewDetails")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={!isCancellable(o.status) || cancellingId === o.id}
                      onClick={() => handleCancel(o)}
                    >
                      {cancellingId === o.id ? t("account.cancelling") : t("account.cancel")}
                    </Button>

                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="bg-black rounded-[24px] border border-[#5A5A5A] sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="font-display text-3xl">{t("confirm.order")} #{selectedOrder?.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                {selectedOrder ? new Date(selectedOrder.created_at).toLocaleDateString() : ""} · ${Number(selectedOrder?.total ?? 0).toFixed(2)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {selectedOrder?.items.length ? (
                selectedOrder.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-4 border-b border-border py-3">
                    <div>
                      <div className="font-display text-xl">{item.product_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">{t("account.qty")} {item.quantity}</div>
                    </div>
                    <div className="text-sm tabular-nums">${(Number(item.price) * item.quantity).toFixed(2)}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-muted-foreground">{t("account.itemsNA")}</div>
              )}
            </div>
            {selectedOrder && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <OrderStatusBadge status={selectedOrder.status} />
                <Button
                  variant="destructive"
                  disabled={!isCancellable(selectedOrder.status) || cancellingId === selectedOrder.id}
                  onClick={() => handleCancel(selectedOrder)}
                >
                  {cancellingId === selectedOrder.id ? t("account.cancelling") : t("account.cancel")}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <button
          onClick={signOut}
          className="mt-16 px-8 py-3 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors"
        >
          {t("account.signOut")}
        </button>

      </div>
      <Footer />
    </div>
  );
}
