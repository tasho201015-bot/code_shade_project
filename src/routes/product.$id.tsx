import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/product-image";
import { ProductOffersCards } from "@/components/storefront/ProductOffersCards";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, RotateCcw, Truck, Lock, Share2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { fetchProductColors, fetchProductSizes, formatWeightRange, type ProductColor, type ProductSize } from "@/lib/product-attributes";
import { fetchVariantAvailability, variantKey, type VariantStatus } from "@/lib/product-variants";
import { ProductSocialProof } from "@/components/storefront/ProductSocialProof";
import { SaleCountdown } from "@/components/storefront/SaleCountdown";
import { getDiscountPercent, getOfferStatus } from "@/lib/product-offer";
import { ExactImportedButton } from "@/components/ui/exact-imported-button";
import { GlowCard } from "@/components/ui/glow-card";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { ProductFAQ } from "@/components/storefront/ProductFAQ";
import { BackInStockNotify } from "@/components/storefront/BackInStockNotify";
import { TrendingNow } from "@/components/storefront/TrendingNow";
import { RecentlyViewed } from "@/components/storefront/RecentlyViewed";
import { ProductReviews } from "@/components/storefront/ProductReviews";
import { useAuth } from "@/lib/auth";
import { useServerFn } from "@tanstack/react-start";
import { recordRecentlyViewed } from "@/lib/product-experience.functions";

export const Route = createFileRoute("/product/$id")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("id", params.id)
      .maybeSingle();
    return { product: data as Product | null };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.product;
    if (!p) return {};
    const rawLang = typeof document !== "undefined" ? document.documentElement.lang : "en";
    const isAr = rawLang === "ar";
    const title = isAr && p.meta_title_ar?.trim()
      ? p.meta_title_ar
      : (p.meta_title?.trim() || p.name);
    const desc = isAr && p.meta_description_ar?.trim()
      ? p.meta_description_ar
      : (p.meta_description?.trim() || p.description || "");
    const meta: Array<{ title?: string; name?: string; content?: string; property?: string }> = [];
    if (title) meta.push({ title });
    if (desc) meta.push({ name: "description", content: desc });
    if (title) {
      meta.push({ property: "og:title", content: title });
      meta.push({ property: "og:type", content: "product" });
    }
    if (desc) meta.push({ property: "og:description", content: desc });
    return { meta };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl">Product not found</h1>
      <Link to="/" className="link-underline text-xs uppercase tracking-luxe">
        Back to shop
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="text-xs uppercase tracking-luxe link-underline">
        Try again
      </button>
    </div>
  ),
  component: ProductPage,
});

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  meta_title: string | null;
  meta_title_ar: string | null;
  meta_description: string | null;
  meta_description_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
  compare_at_price: number | null;
  offer_enabled: boolean;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
}

function ProductPage() {
  const { id } = Route.useParams();
  const { product: p } = Route.useLoaderData();
  const { t, lang } = useI18n();
  const { add, loaded: cartLoaded } = useCart();
  const nav = useNavigate();
  const { user } = useAuth();
  const recordView = useServerFn(recordRecentlyViewed);
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selColorId, setSelColorId] = useState<string | null>(null);
  const [selSizeId, setSelSizeId] = useState<string | null>(null);
  const [variantMatrix, setVariantMatrix] = useState<Record<string, VariantStatus>>({});
  const [offerTick, setOfferTick] = useState(0);

  // Update document meta when product or language changes
  useEffect(() => {
    if (!p) return;
    const title = lang === "ar" && p.meta_title_ar?.trim()
      ? p.meta_title_ar
      : (p.meta_title?.trim() || p.name);
    const desc = lang === "ar" && p.meta_description_ar?.trim()
      ? p.meta_description_ar
      : (p.meta_description?.trim() || p.description || "");
    if (title) document.title = title;
    const descMeta = document.querySelector('meta[name="description"]');
    if (descMeta && desc) descMeta.setAttribute("content", desc);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle && title) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc && desc) ogDesc.setAttribute("content", desc);
  }, [p, lang]);

  // Auto-flip offer state when start/end boundaries pass
  useEffect(() => {
    if (!p?.offer_enabled) return;
    const now = Date.now();
    const targets = [p.offer_starts_at, p.offer_ends_at]
      .map((s) => (s ? new Date(s).getTime() : NaN))
      .filter((n) => Number.isFinite(n) && n > now) as number[];
    if (targets.length === 0) return;
    const next = Math.min(...targets);
    const id = setTimeout(() => setOfferTick((x) => x + 1), next - now + 250);
    return () => clearTimeout(id);
  }, [p?.offer_enabled, p?.offer_starts_at, p?.offer_ends_at, offerTick]);

  useEffect(() => {
    setSelColorId(null); setSelSizeId(null);
    setQty(1);
    setActiveImage(0);
    fetchProductColors(id).then((c) => { setColors(c); if (c[0]) setSelColorId(c[0].id); });
    fetchProductSizes(id).then((s) => setSizes(s));
    fetchVariantAvailability(id).then(setVariantMatrix);
  }, [id]);

  // Record recently viewed (logged-in customers only)
  useEffect(() => {
    if (!user || !id) return;
    recordView({ data: { productId: id } }).catch(() => { /* non-blocking */ });
  }, [id, user, recordView]);

  // Build gallery — product schema has a single image_url, repeat as thumbnails
  const gallery = useMemo(() => {
    const src = resolveImage(p?.image_url);
    return [src, src, src, src];
  }, [p?.image_url]);

  const sizeStatus = (sizeId: string): VariantStatus => {
    if (!selColorId) return "available";
    return variantMatrix[variantKey(selColorId, sizeId)] ?? "available";
  };

  // Clear size selection if it becomes hidden/oos for the new color
  useEffect(() => {
    if (!selSizeId) return;
    const st = !selColorId ? "available" : (variantMatrix[variantKey(selColorId, selSizeId)] ?? "available");
    if (st !== "available") setSelSizeId(null);
  }, [selColorId, variantMatrix, selSizeId]);

  if (!p) {
    return <div className="min-h-screen flex items-center justify-center">{t("prod.notFound")}</div>;
  }

  const soldOut = (p.stock ?? 0) <= 0;
  const displayName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
  const displayDesc = lang === "ar" && p.description_ar ? p.description_ar : p.description;
  const visibleSizes = sizes.filter((s) => sizeStatus(s.id) !== "hidden");


  const handleAdd = (n: number = qty) => {
    if (soldOut) return;
    if (colors.length > 0 && !selColorId) { toast.error(t("prod.selectColor")); return; }
    if (sizes.length > 0 && !selSizeId) { toast.error(t("prod.selectSize")); return; }
    if (selSizeId && sizeStatus(selSizeId) === "out_of_stock") {
      toast.error(t("prod.sizeOOS"));

      return;
    }
    const color = colors.find((c) => c.id === selColorId) ?? null;
    const size = sizes.find((s) => s.id === selSizeId) ?? null;
    const res = add(
      {
        id: p.id,
        name: p.name,
        price: Number(p.price),
        image_url: p.image_url,
        stock: p.stock,
        colorId: color?.id ?? null,
        colorName: color?.name ?? null,
        colorHex: color?.hex ?? null,
        sizeId: size?.id ?? null,
        sizeLabel: size?.label ?? null,
      },
      n,
    );
    if (!res.ok) {
      toast.error(res.reason ?? t("prod.addToBag"));
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="pt-28 pb-20 max-w-7xl mx-auto px-5 md:px-8">
        {/* ============ 1. GALLERY + INFO ============ */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-14">
          {/* Gallery */}
          <div className="flex gap-3 md:gap-4">
            {/* Thumbnails */}
            <div className="hidden md:flex flex-col gap-3 w-[72px] shrink-0">
              {gallery.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`aspect-[3/4] bg-muted overflow-hidden rounded-[20px] border-2 transition-colors ${
                    activeImage === i ? "border-noir" : "border-transparent hover:border-border"
                  }`}
                >
                  <img loading="lazy" decoding="async" src={src} alt={`${displayName} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {/* Main image */}
            <GlowCard singleChild customSize glowColor="orange" className="flex-1 !p-0 !gap-0 !rounded-[20px] !shadow-none self-start">
              <motion.div
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                className="w-full aspect-[3/4] bg-muted overflow-hidden shadow-luxe rounded-[20px]"
              >
                <img loading="lazy" decoding="async" src={gallery[activeImage]} alt={displayName} className="w-full h-full object-cover" />
              </motion.div>
            </GlowCard>
          </div>

          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:pt-2"
          >
            <h1 className="font-display text-3xl md:text-4xl tracking-wide leading-tight">{displayName}</h1>
            {(() => {
              // re-read offerTick so we re-render on boundary transitions
              void offerTick;
              const status = getOfferStatus(p);
              const pct = getDiscountPercent(p);
              const onSale = status === "active" && pct != null;
              return (
                <>
                  <div className="mt-3 flex items-baseline gap-3 flex-wrap">
                    <span className="text-xl md:text-2xl tabular-nums font-bold text-white">${Number(p.price).toFixed(2)}</span>
                    {onSale && p.compare_at_price != null && (
                      <span className="text-sm md:text-base text-[#8A8A8A] line-through tabular-nums">
                        ${Number(p.compare_at_price).toFixed(2)}
                      </span>
                    )}
                    {onSale && pct != null && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] uppercase tracking-luxe bg-accent text-accent-foreground rounded-sm">
                        Save {pct}%
                      </span>
                    )}
                    {status === "scheduled" && (
                      <span className="inline-flex items-center px-2 py-0.5 text-[11px] uppercase tracking-luxe border border-border rounded-sm text-muted-foreground">
                        Sale soon
                      </span>
                    )}
                  </div>
                  {onSale && p.offer_ends_at && (
                    <div className="mt-4">
                      <SaleCountdown endsAt={p.offer_ends_at} onExpire={() => setOfferTick((x) => x + 1)} />
                    </div>
                  )}
                </>
              );
            })()}

            <div className="my-7 border-t border-border/70" />

            {/* Color */}
            {colors.length > 0 && (
              <div className="mb-6">
                <div className="flex items-baseline gap-3 mb-3">
                  <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">{t("prod.color")}</span>
                  <span className="text-[11px] uppercase tracking-luxe">
                    {colors.find((c) => c.id === selColorId)?.[lang === "ar" ? "name_ar" : "name"] || colors.find((c) => c.id === selColorId)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {colors.map((c) => {
                    const on = selColorId === c.id;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelColorId(c.id)}
                        aria-label={c.name}
                        title={c.name}
                        className={`w-7 h-7 rounded-full border ${on ? "ring-2 ring-noir ring-offset-2 ring-offset-background border-transparent" : "border-border"}`}
                        style={{ backgroundColor: c.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size */}
            {visibleSizes.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">{t("prod.size")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {visibleSizes.map((s) => {
                    const on = selSizeId === s.id;
                    const range = formatWeightRange(s);
                    const label = lang === "ar" && s.label_ar ? s.label_ar : s.label;
                    const status = sizeStatus(s.id);
                    const oos = status === "out_of_stock";
                    return (
                      <button
                        key={s.id}
                        onClick={() => { if (!oos) setSelSizeId(s.id); }}
                        disabled={oos}
                        aria-disabled={oos}
                        title={oos ? t("prod.outOfStock") : undefined}
                        className={`relative overflow-hidden min-w-[68px] px-3 py-2 text-xs uppercase tracking-luxe border transition-colors flex flex-col items-center gap-0.5 ${
                          oos
                            ? "border-border/60 bg-muted/30 text-muted-foreground/70 cursor-not-allowed"
                            : on
                            ? "border-noir bg-noir text-cream"
                            : "border-border hover:border-noir"
                        }`}
                      >
                        <span>{label}</span>
                        {range && !oos && (
                          <span className={`text-[9px] tracking-normal normal-case ${on ? "opacity-80" : "text-muted-foreground"}`}>{range}</span>
                        )}
                        {oos && (
                          <>
                            <span className="text-[8px] tracking-normal normal-case opacity-80">{t("prod.outOfStock")}</span>
                            <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
                              <span className="block w-[140%] h-px bg-foreground/30 -rotate-[28deg]" />
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {/* Quantity */}
            <div className="mb-6">
              <div className="inline-flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={t("prod.decrease")}
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-sm tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label={t("prod.increase")}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {!soldOut && p.stock > 0 && p.stock <= 10 && (
                <div className="mt-2 text-xs text-accent uppercase tracking-luxe">
                  {t("prod.onlyLeft", { n: p.stock })}
                </div>
              )}
              {!soldOut && p.stock > 10 && (
                <div className="mt-2 text-xs text-muted-foreground">
                  {t("prod.remaining", { n: p.stock })}
                </div>
              )}

            </div>

            {/* Social proof metrics */}
            <ProductSocialProof productId={p.id} />

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <ExactImportedButton
                onClick={() => handleAdd()}
                disabled={!cartLoaded || soldOut}
                backgroundColor="#141413"
                lightColor="#FAF7F0"
              >
                {soldOut ? t("prod.soldOut") : added ? t("prod.added") : t("prod.addToBag")}
              </ExactImportedButton>
              <ExactImportedButton
                onClick={() => { handleAdd(); nav({ to: "/cart" }); }}
                disabled={!cartLoaded || soldOut}
                backgroundColor="#FAF7F0"
                lightColor="#141413"
              >
                {t("prod.buyNow")}
              </ExactImportedButton>
              <WishlistButton productId={p.id} variant="full" stopPropagation={false} />
              {soldOut && (
                <BackInStockNotify
                  productId={p.id}
                  colorId={selColorId}
                  sizeId={selSizeId}
                />

              )}
            </div>

            {/* Share */}
            <div className="flex items-center gap-8 mt-5 text-xs">
              <button
                onClick={async () => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
                    try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share({ title: displayName, url }); } catch { /* cancelled */ }
                  } else if (typeof navigator !== "undefined" && navigator.clipboard) {
                    await navigator.clipboard.writeText(url);
                    toast.success("Link copied");
                  }
                }}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* ============ 2. TABS ============ */}
        <section className="mt-14 md:mt-20 border border-border/70 rounded-sm px-6 py-6 md:px-8 md:py-7">
          <Tabs defaultValue="description" className="w-full">
            <div className="-mx-6 md:mx-0 overflow-x-auto scrollbar-none mb-5 border-b border-border">
              <TabsList className="w-max md:w-full justify-start gap-6 md:gap-10 bg-transparent border-0 rounded-none p-0 h-auto px-6 md:px-0 whitespace-nowrap">
                {[
                  { v: "description", k: "prod.tab.description" },
                  { v: "details", k: "prod.tab.details" },
                  { v: "size", k: "prod.tab.size" },
                  { v: "shipping", k: "prod.tab.shipping" },
                  { v: "faq", k: "prod.tab.faq" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.v}
                    value={tab.v}
                    className="shrink-0 text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-noir data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {t(tab.k)}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <TabsContent value="description" className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
              {displayDesc || t("prod.noDescription")}
            </TabsContent>
            <TabsContent value="details" className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
              {t("prod.tab.detailsBody")}
            </TabsContent>
            <TabsContent value="size" className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
              {t("prod.tab.sizeBody")}
            </TabsContent>
            <TabsContent value="shipping" className="text-sm md:text-[15px] text-muted-foreground leading-relaxed max-w-3xl">
              {t("prod.tab.shippingBody")}
            </TabsContent>
            <TabsContent value="faq">
              <ProductFAQ productId={p.id} />
            </TabsContent>
          </Tabs>
        </section>

        {/* ============ 3. UPSELL / BUNDLE / CROSS-SELL ============ */}
        <div className="mt-6">
          <ProductOffersCards productId={p.id} />
        </div>

        {/* ============ 4. TRUST BADGES ============ */}
        <section className="mt-6 border border-border/70 rounded-sm px-6 py-6 md:px-8 md:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TrustItem icon={<ShieldCheck className="w-5 h-5" />} title={t("prod.trust.qualityTitle")} subtitle={t("prod.trust.qualityBody")} />
            <TrustItem icon={<RotateCcw className="w-5 h-5" />} title={t("prod.trust.returnsTitle")} subtitle={t("prod.trust.returnsBody")} />
            <TrustItem icon={<Truck className="w-5 h-5" />} title={t("prod.trust.deliveryTitle")} subtitle={t("prod.trust.deliveryBody")} />
            <TrustItem icon={<Lock className="w-5 h-5" />} title={t("prod.trust.secureTitle")} subtitle={t("prod.trust.secureBody")} />
          </div>
        </section>

        <RecentlyViewed excludeProductId={p.id} />
        <TrendingNow />

        {/* ============ PRODUCT REVIEWS ============ */}
        <ProductReviews productId={p.id} />
      </main>

      <Footer />
    </div>
  );
}

function TrustItem({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 mt-0.5" style={{ color: "#D8B98A" }}>{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-luxe">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</div>
      </div>
    </div>
  );
}
