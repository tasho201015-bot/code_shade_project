import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder as placeOrderFn } from "@/lib/orders.functions";
import { createPaymobCheckout as createPaymobCheckoutFn } from "@/lib/paymob.functions";
import { createPaymobWalletCheckout as createPaymobWalletCheckoutFn } from "@/lib/paymob.functions";
import { resolveImage } from "@/lib/product-image";
import { Trash2, Minus, Plus, CreditCard, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { CartLoading } from "@/components/site/CartLoading";
import { RouteErrorState } from "@/components/site/RouteErrorState";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  pendingMs: 150,
  pendingComponent: () => <CartLoading />,
  errorComponent: ({ error, reset }) => (
    <RouteErrorState error={error} reset={reset} title="Cart failed to load" />
  ),
});

function CartPage() {
  const { items, remove, setQty, total, clear, loaded } = useCart();
  const { user, session } = useAuth();
  const nav = useNavigate();
  const submitOrder = useServerFn(placeOrderFn);
  const startPaymob = useServerFn(createPaymobCheckoutFn);
  const startPaymobWallet = useServerFn(createPaymobWalletCheckoutFn);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [placing, setPlacing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [walletPhone, setWalletPhone] = useState("");
  const [walletPaying, setWalletPaying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!user) return;
    if (!address || !phone) { setErr("Please provide a shipping address and phone."); return; }
    if (items.length === 0) return;
    setErr(null);
    setPlacing(true);
    try {
      const result = await submitOrder({
        data: {
          shipping_address: address,
          phone,
          access_token: session?.access_token,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      clear();
      // Send the customer straight to the confirmation page so they can
      // verify their address & phone before we ship the COD order.
      if (result.confirmationToken) {
        nav({
          to: "/confirm-order/$id",
          params: { id: result.orderId },
          search: { token: result.confirmationToken },
        });
      } else {
        nav({ to: "/account" });
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to place order");
    } finally {
      setPlacing(false);
    }
  };

  const payWithPaymob = async () => {
    if (!user) { setErr("Please sign in to pay online."); return; }
    if (!address || !phone) { setErr("Please provide a shipping address and phone."); return; }
    if (items.length === 0) return;
    setErr(null);
    setPaying(true);
    try {
      const result = await startPaymob({
        data: {
          shipping_address: address,
          phone,
          access_token: session?.access_token,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      nav({ to: "/payment", search: { url: result.iframeUrl, order: result.orderId } });
    } catch (e: any) {
      setErr(e?.message ?? "Failed to start payment");
    } finally {
      setPaying(false);
    }
  };

  const payWithWallet = async () => {
    if (!user) { setErr("Please sign in to pay online."); return; }
    if (!address || !phone) { setErr("Please provide a shipping address and phone."); return; }
    if (items.length === 0) return;
    if (!/^01[0125]\d{8}$/.test(walletPhone)) {
      setErr("Enter a valid Egyptian mobile number (11 digits, starts with 01).");
      return;
    }
    setErr(null);
    setWalletPaying(true);
    try {
      const result = await startPaymobWallet({
        data: {
          shipping_address: address,
          phone,
          wallet_phone: walletPhone,
          access_token: session?.access_token,
          items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
        },
      });
      if (!result.ok) {
        setErr(result.error);
        return;
      }
      window.location.href = result.redirectUrl;
    } catch (e: any) {
      setErr(e?.message ?? "Failed to start wallet payment");
    } finally {
      setWalletPaying(false);
    }
  };

  if (!loaded) return <CartLoading />;

  const safeItems = items ?? [];
  const safeTotal = Number.isFinite(total) ? total : 0;

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Your Bag</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Shopping bag</h1>

        {safeItems.length === 0 ? (
          <div className="mt-16 text-muted-foreground">
            Your bag is empty.{" "}
            <Link to="/shop" search={{ category: "all" }} className="link-underline text-foreground">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-[1.5fr_1fr] gap-12">
            <div className="space-y-6">
              {safeItems.map((i) => {
                if (!i || !i.id || typeof i.price !== "number") {
                  console.warn("[cart] skipping malformed item", i);
                  return null;
                }
                return (
                <motion.div
                  key={i.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-5 border-b border-border pb-6"
                >
                  <div className="w-28 h-36 bg-muted overflow-hidden shadow-soft">
                    <img src={resolveImage(i.image_url)} alt={i.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-display text-xl">{i.name}</div>
                      <div className="text-sm tabular-nums mt-1">${(i.price ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="inline-flex items-center border border-border">
                        <button onClick={() => setQty(i.id, i.quantity - 1)} className="p-2 hover:text-accent"><Minus className="w-3 h-3"/></button>
                        <span className="px-4 text-sm tabular-nums">{i.quantity}</span>
                        <button
                          onClick={() => {
                            const r = setQty(i.id, i.quantity + 1);
                            if (!r.ok) toast.message(r.reason ?? "Maximum stock reached");
                          }}
                          disabled={typeof i.stock === "number" && i.quantity >= i.stock}
                          className="p-2 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
                        ><Plus className="w-3 h-3"/></button>
                      </div>
                      <div className="flex items-center gap-3">
                        {typeof i.stock === "number" && i.stock <= 3 && (
                          <span className="text-[10px] uppercase tracking-luxe text-accent">
                            Only {i.stock} left
                          </span>
                        )}
                        <button onClick={() => remove(i.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
                );
              })}
            </div>

            <div className="glass p-8 h-fit lg:sticky lg:top-28 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-accent">Summary</div>
              <div className="mt-4 flex justify-between text-sm"><span>Subtotal</span><span className="tabular-nums">${safeTotal.toFixed(2)}</span></div>
              <div className="mt-1 flex justify-between text-sm text-muted-foreground"><span>Shipping</span><span>Calculated next</span></div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between font-display text-2xl"><span>Total</span><span className="tabular-nums">${safeTotal.toFixed(2)}</span></div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Shipping address</label>
                  <textarea
                    value={address} onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Phone</label>
                  <input
                    value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm transition-colors"
                  />
                </div>
              </div>

              {err && <div className="mt-3 text-xs text-destructive">{err}</div>}

              <button
                onClick={placeOrder}
                disabled={placing}
                className="btn-glow mt-6 w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
              >
                {placing ? "Placing order…" : "Place order"}
              </button>
              <div className="mt-4 space-y-3">
                <button
                  onClick={payWithPaymob}
                  disabled={paying}
                  className="w-full inline-flex items-center justify-center gap-2 border border-accent text-accent py-4 text-xs uppercase tracking-luxe hover:bg-accent hover:text-background transition-colors disabled:opacity-60"
                >
                  <CreditCard className="w-4 h-4" />
                  {paying ? "Starting payment…" : "Pay with Visa"}
                </button>

                <button
                  onClick={() => setWalletOpen((v) => !v)}
                  className="w-full inline-flex items-center justify-center gap-2 border border-border text-foreground py-4 text-xs uppercase tracking-luxe hover:border-accent hover:text-accent transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  Pay with Mobile Wallet
                </button>

                {walletOpen && (
                  <div className="border border-border p-4 space-y-3">
                    <label className="block text-[10px] uppercase tracking-luxe text-muted-foreground">
                      Wallet phone number
                    </label>
                    <input
                      value={walletPhone}
                      onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                      inputMode="numeric"
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm tabular-nums transition-colors"
                    />
                    <button
                      onClick={payWithWallet}
                      disabled={walletPaying}
                      className="w-full bg-accent text-background py-3 text-xs uppercase tracking-luxe hover:opacity-90 transition-opacity disabled:opacity-60"
                    >
                      {walletPaying ? "Redirecting…" : "Confirm wallet payment"}
                    </button>
                  </div>
                )}
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-luxe text-muted-foreground text-center">
                Secure payment · EGP
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
