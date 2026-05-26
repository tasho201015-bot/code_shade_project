import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { placeOrder as placeOrderFn } from "@/lib/orders.functions";
import {
  createPaymobCheckout as createPaymobCheckoutFn,
  createPaymobWalletCheckout as createPaymobWalletCheckoutFn,
} from "@/lib/paymob.functions";
import { resolveImage } from "@/lib/product-image";
import { Trash2, Minus, Plus, CreditCard, Smartphone, Truck } from "lucide-react";
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

// Egyptian governorates with major cities
const EG_LOCATIONS: Record<string, string[]> = {
  Cairo: ["Nasr City", "Heliopolis", "Maadi", "New Cairo", "Downtown", "Shoubra", "Helwan", "6th of October (Cairo)"],
  Giza: ["Dokki", "Mohandessin", "Haram", "Faisal", "Sheikh Zayed", "6th of October", "Imbaba", "Agouza"],
  Alexandria: ["Smouha", "Sidi Gaber", "Miami", "Montazah", "Agami", "Stanley", "Sporting", "Borg El Arab"],
  Dakahlia: ["Mansoura", "Talkha", "Mit Ghamr", "Sherbin", "Belqas"],
  "Red Sea": ["Hurghada", "Safaga", "Marsa Alam", "El Gouna"],
  Beheira: ["Damanhour", "Kafr El Dawwar", "Rashid", "Edku"],
  Fayoum: ["Fayoum City", "Tamiya", "Sinnuris", "Ibsheway"],
  Gharbia: ["Tanta", "Mahalla El Kubra", "Kafr El Zayat", "Zifta"],
  Ismailia: ["Ismailia City", "Fayed", "Qantara"],
  Menofia: ["Shibin El Kom", "Menouf", "Sadat City", "Ashmoun"],
  Minya: ["Minya City", "Mallawi", "Beni Mazar"],
  Qaliubiya: ["Banha", "Qalyub", "Shubra El Kheima", "Khanka", "Obour"],
  "New Valley": ["Kharga", "Dakhla", "Farafra"],
  Suez: ["Suez City", "Ain Sokhna"],
  Aswan: ["Aswan City", "Kom Ombo", "Edfu"],
  Asyut: ["Asyut City", "Dairout", "Abnoub"],
  "Beni Suef": ["Beni Suef City", "Wasta", "Nasser"],
  "Port Said": ["Port Said City", "Port Fouad"],
  Damietta: ["Damietta City", "New Damietta", "Ras El Bar"],
  Sharqia: ["Zagazig", "10th of Ramadan", "Belbeis", "Minya El Qamh"],
  "South Sinai": ["Sharm El Sheikh", "Dahab", "Nuweiba", "Saint Catherine"],
  "Kafr El Sheikh": ["Kafr El Sheikh City", "Desouk", "Baltim"],
  Matrouh: ["Marsa Matrouh", "Siwa", "El Alamein"],
  Luxor: ["Luxor City", "Esna", "Armant"],
  Qena: ["Qena City", "Naqada", "Qus"],
  "North Sinai": ["Arish", "Sheikh Zuweid", "Rafah"],
  Sohag: ["Sohag City", "Akhmim", "Girga"],
};

const GOVERNORATES = Object.keys(EG_LOCATIONS).sort();

type PayMethod = "cod" | "card" | "wallet";

function CartPage() {
  const { items, remove, setQty, total, clear, loaded } = useCart();
  const { user, session } = useAuth();
  const nav = useNavigate();
  const submitOrder = useServerFn(placeOrderFn);
  const startPaymob = useServerFn(createPaymobCheckoutFn);
  const startPaymobWallet = useServerFn(createPaymobWalletCheckoutFn);

  // Shipping
  const [fullName, setFullName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [useCustomCity, setUseCustomCity] = useState(false);
  const [street, setStreet] = useState("");
  const [phoneCode] = useState("+20");
  const [phone, setPhone] = useState("");

  // Payment
  const [method, setMethod] = useState<PayMethod>("cod");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [walletPhone, setWalletPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cities = useMemo(() => (governorate ? EG_LOCATIONS[governorate] ?? [] : []), [governorate]);

  const buildAddress = () => {
    const parts = [
      fullName.trim() ? `Name: ${fullName.trim()}` : "",
      street.trim(),
      city.trim(),
      governorate.trim(),
      "Egypt",
    ].filter(Boolean);
    return parts.join(", ");
  };


  const validate = (): string | null => {
    if (!user) return "Please sign in to place an order.";
    if (items.length === 0) return "Your bag is empty.";
    if (!fullName.trim() || fullName.trim().length < 2) return "Please enter your full name.";
    if (!governorate) return "Select a governorate.";
    if (!city.trim()) return "Select or enter a city.";
    if (street.trim().length < 6) return "Enter a complete home address (street, building, floor, apt).";

    if (!/^1[0125]\d{8}$/.test(phone)) return "Enter a valid Egyptian mobile (10 digits after +20, starts with 1).";
    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(digits)) return "Enter a valid card number.";
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) return "Expiry must be MM/YY.";
      if (!/^\d{3,4}$/.test(cardCvv)) return "CVV must be 3 or 4 digits.";
    }
    if (method === "wallet") {
      if (!/^01[0125]\d{8}$/.test(walletPhone)) return "Enter a valid wallet number (11 digits, starts with 01).";
    }
    return null;
  };

  const handleSubmit = async () => {
    const v = validate();
    if (v) { setErr(v); return; }
    setErr(null);
    setSubmitting(true);
    const address = buildAddress();
    const fullPhone = `${phoneCode}${phone}`;
    const payload = {
      shipping_address: address,
      phone: fullPhone,
      access_token: session?.access_token,
      items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
    };
    try {
      if (method === "cod") {
        const result = await submitOrder({ data: payload });
        if (!result.ok) { setErr(result.error); return; }
        toast.success("Order placed successfully");
        clear();
        if (result.confirmationToken) {
          nav({ to: "/confirm-order/$id", params: { id: result.orderId }, search: { token: result.confirmationToken } });
        } else {
          nav({ to: "/account" });
        }
      } else if (method === "card") {
        const result = await startPaymob({ data: payload });
        if (!result.ok) { setErr(result.error); return; }
        nav({ to: "/payment", search: { url: result.iframeUrl, order: result.orderId } });
      } else {
        const result = await startPaymobWallet({ data: { ...payload, wallet_phone: walletPhone } });
        if (!result.ok) { setErr(result.error); return; }
        window.location.href = result.redirectUrl;
      }
    } catch (e: any) {
      setErr(e?.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <CartLoading />;

  const safeItems = items ?? [];
  const safeTotal = Number.isFinite(total) ? total : 0;

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Checkout</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Your order</h1>

        {safeItems.length === 0 ? (
          <div className="mt-16 text-muted-foreground">
            Your bag is empty.{" "}
            <Link to="/shop" search={{ category: "all" }} className="link-underline text-foreground">
              Continue shopping
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-10">
            {/* LEFT: form sections */}
            <div className="space-y-12">
              {/* 1. Order Summary */}
              <Section title="Order summary" step="01">
                <div className="space-y-5">
                  {safeItems.map((i) => {
                    if (!i || !i.id || typeof i.price !== "number") return null;
                    const lineTotal = (i.price ?? 0) * i.quantity;
                    return (
                      <motion.div
                        key={i.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4 border-b border-border pb-5"
                      >
                        <div className="w-20 h-24 bg-muted overflow-hidden shadow-soft shrink-0">
                          <img src={resolveImage(i.image_url)} alt={i.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-display text-lg truncate">{i.name}</div>
                              <div className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                ${(i.price ?? 0).toFixed(2)} each
                              </div>
                            </div>
                            <button
                              onClick={() => remove(i.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label="Remove"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="inline-flex items-center border border-border">
                              <button onClick={() => setQty(i.id, i.quantity - 1)} className="p-2 hover:text-accent" aria-label="Decrease">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-4 text-sm tabular-nums">{i.quantity}</span>
                              <button
                                onClick={() => {
                                  const r = setQty(i.id, i.quantity + 1);
                                  if (!r.ok) toast.message(r.reason ?? "Maximum stock reached");
                                }}
                                disabled={typeof i.stock === "number" && i.quantity >= i.stock}
                                className="p-2 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label="Increase"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="font-display tabular-nums text-base">${lineTotal.toFixed(2)}</div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Section>

              {/* 2. Shipping address */}
              <Section title="Shipping address" step="02">
                <div className="grid sm:grid-cols-2 gap-5">
                  <Field label="Governorate">
                    <select
                      value={governorate}
                      onChange={(e) => { setGovernorate(e.target.value); setCity(""); }}
                      className="form-control"
                    >
                      <option value="">Select governorate</option>
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="City">
                    {cities.length > 0 ? (
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="form-control"
                        disabled={!governorate}
                      >
                        <option value="">Select city</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__other__">Other…</option>
                      </select>
                    ) : (
                      <input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter city"
                        className="form-control"
                        disabled={!governorate}
                      />
                    )}
                    {city === "__other__" && (
                      <input
                        autoFocus
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Enter your city"
                        className="form-control mt-2"
                      />
                    )}
                  </Field>

                  <div className="sm:col-span-2">
                    <Field label="Exact home address">
                      <textarea
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        rows={3}
                        placeholder="Street, building number, floor, apartment"
                        className="form-control resize-none"
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label="Phone number">
                      <div className="flex items-stretch border-b border-border focus-within:border-accent transition-colors">
                        <span className="text-sm tabular-nums py-2 pr-3 text-muted-foreground border-r border-border mr-3">
                          {phoneCode}
                        </span>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                          inputMode="numeric"
                          placeholder="1XXXXXXXXX"
                          className="flex-1 bg-transparent py-2 outline-none text-sm tabular-nums"
                        />
                      </div>
                    </Field>
                  </div>
                </div>
              </Section>

              {/* 3. Payment method */}
              <Section title="Payment method" step="03">
                <div className="space-y-3">
                  <PayOption
                    icon={<Truck className="w-4 h-4" />}
                    label="Cash on delivery"
                    hint="Pay when you receive your order"
                    value="cod"
                    selected={method}
                    onSelect={setMethod}
                  />
                  <PayOption
                    icon={<CreditCard className="w-4 h-4" />}
                    label="Visa / Credit card"
                    hint="Secured by Paymob"
                    value="card"
                    selected={method}
                    onSelect={setMethod}
                  />
                  {method === "card" && (
                    <div className="ml-7 mt-2 grid sm:grid-cols-2 gap-4 border-l border-border pl-5 py-2">
                      <div className="sm:col-span-2">
                        <Field label="Card number">
                          <input
                            value={cardNumber}
                            onChange={(e) => {
                              const v = e.target.value.replace(/\D/g, "").slice(0, 19);
                              setCardNumber(v.replace(/(\d{4})(?=\d)/g, "$1 "));
                            }}
                            inputMode="numeric"
                            placeholder="1234 5678 9012 3456"
                            className="form-control tabular-nums"
                          />
                        </Field>
                      </div>
                      <Field label="Expiry (MM/YY)">
                        <input
                          value={cardExpiry}
                          onChange={(e) => {
                            let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                            if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                            setCardExpiry(v);
                          }}
                          placeholder="MM/YY"
                          className="form-control tabular-nums"
                        />
                      </Field>
                      <Field label="CVV">
                        <input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          inputMode="numeric"
                          placeholder="123"
                          className="form-control tabular-nums"
                        />
                      </Field>
                      <p className="sm:col-span-2 text-[10px] uppercase tracking-luxe text-muted-foreground">
                        For your security, card details are finalized on the encrypted Paymob page.
                      </p>
                    </div>
                  )}

                  <PayOption
                    icon={<Smartphone className="w-4 h-4" />}
                    label="Mobile wallet"
                    hint="Vodafone Cash, Orange Money, Etisalat Cash"
                    value="wallet"
                    selected={method}
                    onSelect={setMethod}
                  />
                  {method === "wallet" && (
                    <div className="ml-7 mt-2 border-l border-border pl-5 py-2">
                      <Field label="Wallet phone number">
                        <input
                          value={walletPhone}
                          onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                          inputMode="numeric"
                          placeholder="01XXXXXXXXX"
                          className="form-control tabular-nums"
                        />
                      </Field>
                    </div>
                  )}
                </div>
              </Section>
            </div>

            {/* RIGHT: totals + submit */}
            <aside className="glass p-8 h-fit lg:sticky lg:top-28 rounded-sm">
              <div className="text-[10px] uppercase tracking-luxe text-accent">Total</div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Items ({safeItems.reduce((n, i) => n + i.quantity, 0)})</span>
                  <span className="tabular-nums">${safeTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Shipping</span>
                  <span>Calculated next</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex justify-between font-display text-2xl">
                <span>Grand total</span>
                <span className="tabular-nums">${safeTotal.toFixed(2)}</span>
              </div>

              {err && <div className="mt-4 text-xs text-destructive">{err}</div>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-glow mt-6 w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
              >
                {submitting
                  ? "Processing…"
                  : method === "cod"
                    ? "Place order"
                    : method === "card"
                      ? "Pay with card"
                      : "Pay with wallet"}
              </button>

              <p className="mt-3 text-[10px] uppercase tracking-luxe text-muted-foreground text-center">
                Secure checkout · EGP
              </p>
            </aside>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

/* ---------- small presentational helpers ---------- */

function Section({ title, step, children }: { title: string; step: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="text-[10px] uppercase tracking-luxe text-accent tabular-nums">{step}</span>
        <h2 className="font-display text-2xl md:text-3xl">{title}</h2>
        <div className="flex-1 h-px bg-border ml-3" />
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-luxe text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function PayOption({
  icon, label, hint, value, selected, onSelect,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: PayMethod;
  selected: PayMethod;
  onSelect: (v: PayMethod) => void;
}) {
  const active = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`w-full text-left flex items-center gap-4 border p-4 transition-colors ${
        active ? "border-accent bg-accent/5" : "border-border hover:border-foreground/40"
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
          active ? "border-accent" : "border-border"
        }`}
      >
        {active && <span className="w-2 h-2 rounded-full bg-accent" />}
      </span>
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground mt-0.5">{hint}</span>
      </span>
    </button>
  );
}
