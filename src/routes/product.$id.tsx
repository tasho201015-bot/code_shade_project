import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { ShieldCheck, RotateCcw, Truck, Lock, Heart, Share2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  description_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
}

function ProductPage() {
  const { id } = Route.useParams();
  const { t, lang } = useI18n();
  const [p, setP] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { add, loaded: cartLoaded } = useCart();
  const nav = useNavigate();
  const [added, setAdded] = useState(false);
  const [qty, setQty] = useState(1);
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data as Product | null);
      setLoading(false);
      setQty(1);
      setActiveImage(0);
    });
  }, [id]);

  // Build gallery — product schema has a single image_url, repeat as thumbnails
  const gallery = useMemo(() => {
    const src = resolveImage(p?.image_url);
    return [src, src, src, src];
  }, [p?.image_url]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("prod.loading")}</div>;
  }
  if (!p) {
    return <div className="min-h-screen flex items-center justify-center">{t("prod.notFound")}</div>;
  }

  const soldOut = (p.stock ?? 0) <= 0;
  const displayName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
  const displayDesc = lang === "ar" && p.description_ar ? p.description_ar : p.description;

  const handleAdd = (n: number = qty) => {
    if (soldOut) return;
    for (let i = 0; i < n; i++) {
      const res = add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock });
      if (!res.ok) {
        toast.error(res.reason ?? t("prod.addToBag"));
        return;
      }
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="bg-background min-h-screen">
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
                  className={`aspect-[3/4] bg-muted overflow-hidden border transition-colors ${
                    activeImage === i ? "border-noir" : "border-transparent hover:border-border"
                  }`}
                >
                  <img src={src} alt={`${displayName} ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            {/* Main image */}
            <motion.div
              initial={{ opacity: 0, scale: 1.02 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 aspect-[3/4] bg-muted overflow-hidden shadow-luxe"
            >
              <img src={gallery[activeImage]} alt={displayName} className="w-full h-full object-cover" />
            </motion.div>
          </div>

          {/* Info column */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="lg:pt-2"
          >
            <h1 className="font-display text-3xl md:text-4xl tracking-wide leading-tight">{displayName}</h1>
            <div className="mt-3 text-xl md:text-2xl tabular-nums">${Number(p.price).toFixed(2)}</div>

            {displayDesc && (
              <p className="mt-5 text-sm md:text-base text-muted-foreground leading-relaxed max-w-md">
                {displayDesc}
              </p>
            )}

            <div className="my-7 border-t border-border/70" />

            {/* Color (visual) */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">Color:</span>
                <span className="text-[11px] uppercase tracking-luxe">Default</span>
              </div>
              <div className="flex items-center gap-2.5">
                <button className="w-7 h-7 rounded-full ring-2 ring-noir ring-offset-2 ring-offset-background bg-[oklch(0.45_0.06_55)]" aria-label="Brown" />
                <button className="w-7 h-7 rounded-full border border-border bg-[oklch(0.2_0.01_60)]" aria-label="Black" />
                <button className="w-7 h-7 rounded-full border border-border bg-[oklch(0.9_0.02_80)]" aria-label="Cream" />
              </div>
            </div>

            {/* Size (visual) */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-luxe text-muted-foreground">Size:</span>
                <button className="text-[11px] uppercase tracking-luxe text-muted-foreground hover:text-foreground underline-offset-4 hover:underline">
                  Size guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {["S", "M", "L", "XL"].map((s) => (
                  <button
                    key={s}
                    className="min-w-[52px] h-11 px-4 text-xs uppercase tracking-luxe border border-border hover:border-noir transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-6">
              <div className="inline-flex items-center border border-border">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Decrease"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-12 text-center text-sm tabular-nums">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(p.stock || 99, q + 1))}
                  className="w-11 h-11 flex items-center justify-center hover:bg-muted transition-colors"
                  aria-label="Increase"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* CTAs */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleAdd()}
                disabled={!cartLoaded || soldOut}
                className="w-full bg-noir text-cream px-8 py-4 text-xs uppercase tracking-luxe hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {soldOut ? t("prod.soldOut") : added ? t("prod.added") : t("prod.addToBag")}
              </button>
              <button
                onClick={() => { handleAdd(); nav({ to: "/cart" }); }}
                disabled={!cartLoaded || soldOut}
                className="w-full px-8 py-4 text-xs uppercase tracking-luxe border border-noir hover:bg-noir hover:text-cream transition-colors disabled:opacity-60"
              >
                {t("prod.buyNow")}
              </button>
            </div>

            {/* Wishlist / Share */}
            <div className="flex items-center gap-8 mt-5 text-xs">
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Heart className="w-4 h-4" />
                <span>Add to Wishlist</span>
              </button>
              <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </motion.div>
        </div>

        {/* ============ 2. TABS ============ */}
        <section className="mt-14 md:mt-20 border border-border/70 rounded-sm bg-card px-6 py-6 md:px-8 md:py-7">
          <Tabs defaultValue="description" className="w-full">
            <TabsList className="w-full justify-start gap-6 md:gap-10 bg-transparent border-b border-border rounded-none p-0 h-auto mb-5">
              {[
                { v: "description", k: "prod.tab.description" },
                { v: "details", k: "prod.tab.details" },
                { v: "size", k: "prod.tab.size" },
                { v: "shipping", k: "prod.tab.shipping" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.v}
                  value={tab.v}
                  className="text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-noir data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  {t(tab.k)}
                </TabsTrigger>
              ))}
            </TabsList>
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
          </Tabs>
        </section>

        {/* ============ 3. UPSELL / BUNDLE / CROSS-SELL ============ */}
        <div className="mt-6">
          <ProductOffersCards productId={p.id} />
        </div>

        {/* ============ 4. TRUST BADGES ============ */}
        <section className="mt-6 border border-border/70 rounded-sm bg-card px-6 py-6 md:px-8 md:py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <TrustItem icon={<ShieldCheck className="w-5 h-5" />} title={t("prod.trust.qualityTitle")} subtitle={t("prod.trust.qualityBody")} />
            <TrustItem icon={<RotateCcw className="w-5 h-5" />} title={t("prod.trust.returnsTitle")} subtitle={t("prod.trust.returnsBody")} />
            <TrustItem icon={<Truck className="w-5 h-5" />} title={t("prod.trust.deliveryTitle")} subtitle={t("prod.trust.deliveryBody")} />
            <TrustItem icon={<Lock className="w-5 h-5" />} title={t("prod.trust.secureTitle")} subtitle={t("prod.trust.secureBody")} />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

function TrustItem({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-noir shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-luxe">{title}</div>
        <div className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</div>
      </div>
    </div>
  );
}
