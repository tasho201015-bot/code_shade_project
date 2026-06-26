import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { CheckoutOffers } from "@/components/storefront/CheckoutOffers";
import { useI18n } from "@/lib/i18n";
import {
  fetchShippingSettings,
  fetchShippingRates,
  computeShippingFee,
  DEFAULT_SHIPPING_SETTINGS,
  type ShippingSettings,
  type ShippingRate,
} from "@/lib/shipping";


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
  const { t } = useI18n();
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

  // Shipping settings (admin-configured)
  const [shipSettings, setShipSettings] = useState<ShippingSettings>(DEFAULT_SHIPPING_SETTINGS);
  const [shipRates, setShipRates] = useState<ShippingRate[]>([]);
  useEffect(() => {
    let alive = true;
    Promise.all([fetchShippingSettings(), fetchShippingRates()]).then(([s, r]) => {
      if (!alive) return;
      setShipSettings(s);
      setShipRates(r);
    });
    return () => { alive = false; };
  }, []);

  const cities = useMemo(() => (governorate ? EG_LOCATIONS[governorate] ?? [] : []), [governorate]);
  // When the selected governorate has no preset cities, force the custom input on.
  const cityInputMode = useCustomCity || cities.length === 0;

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
    if (!user) return t("val.signIn");
    if (items.length === 0) return t("val.bagEmpty");
    if (!fullName.trim() || fullName.trim().length < 2) return t("val.name");
    if (!governorate) return t("val.gov");
    if (!city.trim()) return t("val.city");
    if (street.trim().length < 6) return t("val.street");

    if (!/^1[0125]\d{8}$/.test(phone)) return t("val.phone");
    if (method === "card") {
      const digits = cardNumber.replace(/\s/g, "");
      if (!/^\d{13,19}$/.test(digits)) return t("val.card");
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry)) return t("val.expiry");
      if (!/^\d{3,4}$/.test(cardCvv)) return t("val.cvv");
    }
    if (method === "wallet") {
      if (!/^01[0125]\d{8}$/.test(walletPhone)) return t("val.wallet");
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
      governorate: governorate.trim(),
      city: city.trim(),
      phone: fullPhone,
      access_token: session?.access_token,
      items: items.map((i) => ({
        product_id: i.id,
        quantity: i.quantity,
        color: i.colorName ?? undefined,
        size: i.sizeLabel ?? undefined,
      })),
    };
    try {
      if (method === "cod") {
        const result = await submitOrder({ data: payload });
        if (!result.ok) { setErr(result.error); return; }
        toast.success(t("checkout.placed"));
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
      setErr(e?.message ?? t("val.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!loaded) return <CartLoading />;

  const safeItems = items ?? [];
  const safeTotal = Number.isFinite(total) ? total : 0;

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">{t("checkout.eyebrow")}</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">{t("checkout.title")}</h1>

        {safeItems.length === 0 ? (
          <div className="mt-16 text-muted-foreground">
            {t("checkout.empty")}{" "}
            <Link to="/shop" search={{ category: "all" }} className="link-underline text-foreground">
              {t("checkout.continue")}
            </Link>
          </div>
        ) : (
          <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-10">
            {/* LEFT: form sections */}
            <div className="space-y-12">
              {/* 1. Order Summary */}
              <Section title={t("checkout.step1")} step="01">

                <div className="space-y-5">
                  {safeItems.map((i) => {
                    if (!i || !i.id || typeof i.price !== "number") return null;
                    const lineTotal = (i.price ?? 0) * i.quantity;
                    return (
                      <motion.div
                        key={i.key}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex gap-4 border-b border-border pb-5"
                      >
                        <div className="w-20 h-24 bg-muted overflow-hidden shadow-soft shrink-0">
                          <img loading="lazy" decoding="async" src={resolveImage(i.image_url)} alt={i.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-display text-lg truncate">{i.name}</div>
                              {(i.colorName || i.sizeLabel) && (
                                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] uppercase tracking-luxe text-muted-foreground">
                                  {i.colorName && (
                                    <span className="inline-flex items-center gap-1.5">
                                      {i.colorHex && (
                                        <span
                                          aria-hidden
                                          className="inline-block w-3 h-3 rounded-full border border-border"
                                          style={{ backgroundColor: i.colorHex }}
                                        />
                                      )}
                                      <span>{t("checkout.color")}: {i.colorName}</span>
                                    </span>
                                  )}
                                  {i.sizeLabel && <span>{t("checkout.size")}: {i.sizeLabel}</span>}
                                </div>
                              )}
                              <div className="text-xs text-muted-foreground tabular-nums mt-1">
                                ${(i.price ?? 0).toFixed(2)} {t("checkout.each")}
                              </div>
                            </div>

                            <button
                              onClick={() => remove(i.key)}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                              aria-label={t("checkout.remove")}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <div className="inline-flex items-center border border-border">
                              <button onClick={() => setQty(i.key, i.quantity - 1)} className="p-2 hover:text-accent" aria-label={t("checkout.decrease")}>
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-4 text-sm tabular-nums">{i.quantity}</span>
                              <button
                                onClick={() => {
                                  const r = setQty(i.key, i.quantity + 1);
                                  if (!r.ok) toast.message(r.reason ?? t("checkout.errMaxStock"));
                                }}
                                disabled={typeof i.stock === "number" && i.quantity >= i.stock}
                                className="p-2 hover:text-accent disabled:opacity-40 disabled:cursor-not-allowed"
                                aria-label={t("checkout.increase")}

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

              {/* Offers (upsells → cross-sells → bundles) for items in cart */}
              <CheckoutOffers cartProductIds={Array.from(new Set(safeItems.map((i) => i.id).filter(Boolean)))} />

              {/* 2. Shipping address */}
              <Section title={t("checkout.step2")} step="02">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <Field label={t("checkout.fullName")}>
                      <input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t("checkout.fullNamePh")}
                        autoComplete="name"
                        className="form-control"
                      />
                    </Field>
                  </div>

                  <Field label={t("checkout.gov")}>
                    <select
                      value={governorate}
                      onChange={(e) => {
                        setGovernorate(e.target.value);
                        setCity("");
                        setUseCustomCity(false);
                      }}
                      className="form-control"
                    >
                      <option value="">{t("checkout.govSelect")}</option>
                      {GOVERNORATES.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label={t("checkout.city")}>
                    {!governorate ? (
                      <input
                        value=""
                        readOnly
                        disabled
                        placeholder={t("checkout.cityPh")}
                        className="form-control cursor-not-allowed"
                      />
                    ) : cityInputMode ? (
                      <div className="space-y-2">
                        <input
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder={t("checkout.cityEnter")}
                          autoFocus={useCustomCity}
                          className="form-control"
                        />
                        {cities.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setUseCustomCity(false);
                              setCity("");
                            }}
                            className="text-[10px] uppercase tracking-luxe text-accent hover:underline"
                          >
                            {t("checkout.chooseList")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <select
                        value={city}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "__other__") {
                            setUseCustomCity(true);
                            setCity("");
                          } else {
                            setCity(v);
                          }
                        }}
                        className="form-control"
                      >
                        <option value="">{t("checkout.citySelect")}</option>
                        {cities.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                        <option value="__other__">{t("checkout.cityOther")}</option>
                      </select>
                    )}
                  </Field>





                  <div className="sm:col-span-2">
                    <Field label={t("checkout.address")}>
                      <textarea
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        rows={3}
                        placeholder={t("checkout.addressPh")}
                        className="form-control resize-none"
                      />
                    </Field>
                  </div>

                  <div className="sm:col-span-2">
                    <Field label={t("checkout.phone")}>
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
              <Section title={t("checkout.step3")} step="03">
                <div className="space-y-3">
                  <PayOption
                    icon={<Truck className="w-4 h-4" />}
                    label={t("checkout.cod")}
                    hint={t("checkout.codHint")}
                    value="cod"
                    selected={method}
                    onSelect={setMethod}
                  />
                  <PayOption
                    icon={<CreditCard className="w-4 h-4" />}
                    label={t("checkout.card")}
                    hint={t("checkout.cardHint")}
                    value="card"
                    selected={method}
                    onSelect={setMethod}
                  />
                  {method === "card" && (
                    <div className="ml-7 mt-2 grid sm:grid-cols-2 gap-4 border-l border-border pl-5 py-2">
                      <div className="sm:col-span-2">
                        <Field label={t("checkout.cardNumber")}>
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
                      <Field label={t("checkout.expiry")}>
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
                      <Field label={t("checkout.cvv")}>
                        <input
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                          inputMode="numeric"
                          placeholder="123"
                          className="form-control tabular-nums"
                        />
                      </Field>
                      <p className="sm:col-span-2 text-[10px] uppercase tracking-luxe text-muted-foreground">
                        {t("checkout.cardNote")}
                      </p>
                    </div>
                  )}

                  <PayOption
                    icon={<Smartphone className="w-4 h-4" />}
                    label={t("checkout.wallet")}
                    hint={t("checkout.walletHint")}
                    value="wallet"
                    selected={method}
                    onSelect={setMethod}
                  />
                  {method === "wallet" && (
                    <div className="ml-7 mt-2 border-l border-border pl-5 py-2">
                      <Field label={t("checkout.walletPhone")}>
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
            <aside className="bg-black p-8 h-fit lg:sticky lg:top-28 rounded-[24px] border border-[#5A5A5A]">
              {(() => {
                const threshold = shipSettings.free_shipping_threshold;
                const unlocked = threshold > 0 && safeTotal >= threshold;
                const remaining = Math.max(0, threshold - safeTotal);
                const pct = threshold > 0 ? Math.min(100, (safeTotal / threshold) * 100) : 0;
                const shipFee = computeShippingFee(safeTotal, shipSettings, shipRates, governorate);
                const grand = safeTotal + shipFee;
                return (
                  <>
                    {threshold > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 text-[11px] uppercase tracking-luxe text-cream">
                          <Truck className="w-3.5 h-3.5" />
                          <span>
                            {unlocked
                              ? t("checkout.freeShipUnlocked")
                              : t("checkout.freeShipRemaining", { amount: remaining.toFixed(2) })}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full bg-accent transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] uppercase tracking-luxe text-accent">{t("checkout.total")}</div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{t("checkout.itemsN", { n: safeItems.reduce((n, i) => n + i.quantity, 0) })}</span>
                        <span className="tabular-nums">${safeTotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>{t("checkout.shipping")}</span>
                        <span className="tabular-nums">
                          {!governorate && shipSettings.mode === "per_governorate"
                            ? t("checkout.shippingCalc")
                            : shipFee === 0
                              ? t("checkout.shippingFree")
                              : `$${shipFee.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border flex justify-between font-display text-2xl">
                      <span>{t("checkout.grand")}</span>
                      <span className="tabular-nums">${grand.toFixed(2)}</span>
                    </div>
                  </>
                );
              })()}

              {err && <div className="mt-4 text-xs text-destructive">{err}</div>}

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-glow mt-6 w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
              >
                {submitting
                  ? t("checkout.processing")
                  : method === "cod"
                    ? t("checkout.place")
                    : method === "card"
                      ? t("checkout.payCard")
                      : t("checkout.payWallet")}
              </button>

              <p className="mt-3 text-[10px] uppercase tracking-luxe text-muted-foreground text-center">
                {t("checkout.secure")}
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
