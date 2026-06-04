import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/product-image";
import { ProductOffers } from "@/components/storefront/ProductOffers";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, RotateCcw, Truck, Lock } from "lucide-react";
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

  useEffect(() => {
    supabase.from("products").select("*").eq("id", id).maybeSingle().then(({ data }) => {
      setP(data as Product | null);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">{t("prod.loading")}</div>;
  if (!p) return <div className="min-h-screen flex items-center justify-center">{t("prod.notFound")}</div>;

  const soldOut = (p.stock ?? 0) <= 0;
  const displayName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
  const displayDesc = lang === "ar" && p.description_ar ? p.description_ar : p.description;

  const handleAdd = () => {
    if (soldOut) return;
    const res = add(
      { id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock },
    );
    if (!res.ok) {
      toast.error(res.reason ?? t("prod.addToBag"));
      return;
    }
    if (res.reason) toast.message(res.reason);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="bg-background min-h-screen">
      <Header />

      {/* 1. Gallery + Product Info / Purchase actions */}
      <div className="pt-28 max-w-7xl mx-auto px-6 lg:px-10 grid lg:grid-cols-2 gap-10 lg:gap-20">
        <motion.div
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="aspect-[3/4] bg-muted shadow-luxe overflow-hidden"
        >
          <img src={resolveImage(p.image_url)} alt={displayName} className="w-full h-full object-cover" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.2 }}
          className="lg:pt-10"
        >
          <div className="text-[10px] uppercase tracking-luxe text-accent">{t(`cat.${p.category}`)}</div>
          <h1 className="font-display text-2xl md:text-3xl mt-2 leading-tight">{displayName}</h1>
          <div className="mt-4 text-2xl tabular-nums">${Number(p.price).toFixed(2)}</div>
          {displayDesc && (
            <p className="mt-6 text-muted-foreground leading-relaxed max-w-md">{displayDesc}</p>
          )}

          <div className="mt-10 flex flex-col gap-3">
            <button
              onClick={handleAdd}
              disabled={!cartLoaded || soldOut}
              className="btn-glow bg-noir text-cream px-8 py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
            >
              {soldOut ? t("prod.soldOut") : added ? t("prod.added") : t("prod.addToBag")}
            </button>
            <button
              onClick={() => { handleAdd(); nav({ to: "/cart" }); }}
              disabled={!cartLoaded || soldOut}
              className="px-8 py-4 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors disabled:opacity-60"
            >
              {t("prod.buyNow")}
            </button>
          </div>
        </motion.div>
      </div>

      {/* 2. Sales Booster offers — Upsell → Bundle → Cross-sell (order handled inside) */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 lg:mt-20">
        <ProductOffers productId={p.id} productPrice={Number(p.price)} />
      </div>

      {/* 3. Description tabs */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 lg:mt-20">
        <Tabs defaultValue="description" className="w-full">
          <TabsList className="w-full justify-start gap-8 bg-transparent border-b border-border rounded-none p-0 h-auto">
            <TabsTrigger
              value="description"
              className="text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t("prod.tab.description") || "Description"}
            </TabsTrigger>
            <TabsTrigger
              value="details"
              className="text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t("prod.tab.details") || "Details"}
            </TabsTrigger>
            <TabsTrigger
              value="size"
              className="text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t("prod.tab.size") || "Size & Fit"}
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="text-[11px] uppercase tracking-luxe pb-3 rounded-none border-b-2 border-transparent data-[state=active]:border-accent data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              {t("prod.tab.shipping") || "Shipping & Returns"}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="pt-6 text-muted-foreground leading-relaxed max-w-3xl">
            {displayDesc || t("prod.noDescription") || "No description available."}
          </TabsContent>
          <TabsContent value="details" className="pt-6 text-muted-foreground leading-relaxed max-w-3xl">
            {t("prod.tab.detailsBody") || "Crafted with premium fabrics and finished with refined detail."}
          </TabsContent>
          <TabsContent value="size" className="pt-6 text-muted-foreground leading-relaxed max-w-3xl">
            {t("prod.tab.sizeBody") || "Designed for a flowing, comfortable silhouette. See the size guide for fit details."}
          </TabsContent>
          <TabsContent value="shipping" className="pt-6 text-muted-foreground leading-relaxed max-w-3xl">
            {t("prod.tab.shippingBody") || "Fast delivery across the region. Easy returns within 14 days."}
          </TabsContent>
        </Tabs>
      </div>


      {/* 4. Trust / Service features */}
      <div className="max-w-7xl mx-auto px-6 lg:px-10 mt-16 mb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border border-border/60 px-6 py-8">
          <TrustItem icon={<ShieldCheck className="w-5 h-5" />} title={t("prod.trust.qualityTitle") || "Premium Quality"} subtitle={t("prod.trust.qualityBody") || "Finest fabrics & craftsmanship"} />
          <TrustItem icon={<RotateCcw className="w-5 h-5" />} title={t("prod.trust.returnsTitle") || "Easy Returns"} subtitle={t("prod.trust.returnsBody") || "Within 14 days"} />
          <TrustItem icon={<Truck className="w-5 h-5" />} title={t("prod.trust.deliveryTitle") || "Fast Delivery"} subtitle={t("prod.trust.deliveryBody") || "Across the region"} />
          <TrustItem icon={<Lock className="w-5 h-5" />} title={t("prod.trust.secureTitle") || "Secure Payment"} subtitle={t("prod.trust.secureBody") || "100% secure checkout"} />
        </div>
      </div>

      <Footer />
    </div>
  );
}

function TrustItem({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="text-accent shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="text-[11px] uppercase tracking-luxe">{title}</div>
        <div className="text-xs text-muted-foreground mt-1">{subtitle}</div>
      </div>
    </div>
  );
}
