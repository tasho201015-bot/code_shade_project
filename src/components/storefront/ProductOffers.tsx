import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  fetchBundlesForProduct,
  fetchCrossSellsForProduct,
  fetchUpsellsForProduct,
  fetchProductsByIds,
  computeBundlePrice,
  type PublicProduct,
} from "@/lib/sales-booster-public";
import type { Bundle, CrossSellRule, UpsellRule } from "@/lib/selling-types";
import { resolveImage } from "@/lib/product-image";
import { useCart } from "@/lib/cart";
import { GlowCard } from "@/components/ui/glow-card";
import { useI18n } from "@/lib/i18n";
import { loc } from "@/lib/localize";
import { ProductCard } from "@/components/storefront/ProductCard";


interface Props {
  productId: string;
  productPrice: number;
}

export function ProductOffers({ productId, productPrice }: Props) {
  const { lang } = useI18n();
  const { add } = useCart();
  const [upsells, setUpsells] = useState<UpsellRule[]>([]);
  const [crossSells, setCrossSells] = useState<CrossSellRule[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Record<string, PublicProduct>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [u, c, b] = await Promise.all([
        fetchUpsellsForProduct(productId),
        fetchCrossSellsForProduct(productId, "product"),
        fetchBundlesForProduct(productId, "product"),
      ]);
      if (cancelled) return;

      // Collect referenced product ids to hydrate
      const ids = new Set<string>();
      u.forEach((r) => r.suggestedProductId && ids.add(r.suggestedProductId));
      c.forEach((r) => r.suggestions.forEach((s) => ids.add(s.productId)));
      b.forEach((bn) => bn.productIds.forEach((id) => ids.add(id)));

      const fetched = await fetchProductsByIds([...ids]);
      if (cancelled) return;
      const map: Record<string, PublicProduct> = {};
      fetched.forEach((p) => { map[p.id] = p; });

      setUpsells(u);
      setCrossSells(c);
      setBundles(b);
      setProducts(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [productId]);

  if (loading) return null;
  if (!upsells.length && !crossSells.length && !bundles.length) return null;

  const displayName = (p: PublicProduct) => (lang === "ar" && p.name_ar ? p.name_ar : p.name);

  const handleAdd = (p: PublicProduct) => {
    const res = add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock });
    if (!res.ok) toast.error(res.reason ?? "Could not add to bag");
    else toast.success(`${displayName(p)} added`);
  };

  return (
    <div className="border-t border-border/60 mt-20">
      {/* UPSELLS */}
      {upsells.map((u) => {
        const sp = u.suggestedProductId ? products[u.suggestedProductId] : null;
        return (
          <motion.section
            key={u.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="py-16 border-b border-border/60"
          >
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">{loc(u, "badge", lang) || (lang === "ar" ? "عرض حصري" : "Exclusive Offer")}</div>
            <h2 className="font-display text-2xl md:text-3xl mb-2">{loc(u, "headline", lang)}</h2>
            {(loc(u, "note", lang)) && <p className="text-muted-foreground max-w-xl mb-6">{loc(u, "note", lang)}</p>}

            <div className="flex flex-wrap items-baseline gap-4 mb-6">
              {u.originalPrice > 0 && (
                <span className="text-[#8A8A8A] line-through tabular-nums">${u.originalPrice.toFixed(2)}</span>
              )}
              <span className="font-display text-2xl tabular-nums font-bold text-white">${u.upsellPrice.toFixed(2)}</span>
            </div>
            {sp && (
              <div className="flex items-center gap-5 max-w-md">
                <Link to="/product/$id" params={{ id: sp.id }} className="block w-24 aspect-[3/4] bg-muted overflow-hidden shrink-0">
                  <img src={resolveImage(sp.image_url)} alt={displayName(sp)} className="w-full h-full object-cover" />
                </Link>
                <div className="flex-1">
                  <Link to="/product/$id" params={{ id: sp.id }} className="font-display text-base hover:text-accent transition-colors">
                    {displayName(sp)}
                  </Link>
                  <button
                    onClick={() => handleAdd(sp)}
                    className="mt-3 px-5 py-2.5 text-[10px] uppercase tracking-luxe bg-noir text-cream hover:opacity-90 transition-opacity"
                  >
                    {lang === "ar" ? "أضيفي الترقية" : "Add upgrade"}
                  </button>
                </div>
              </div>
            )}
          </motion.section>
        );
      })}

      {/* BUNDLES */}
      {bundles.map((b) => {
        const { original, final, saved, items } = computeBundlePrice(b, Object.values(products));
        if (!items.length) return null;
        return (
          <motion.section
            key={b.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="py-16 border-b border-border/60"
          >
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">{loc(b, "badge", lang) || (lang === "ar" ? "أكملي الإطلالة" : "Complete the Look")}</div>
            <h2 className="font-display text-2xl md:text-3xl mb-2">{loc(b, "name", lang)}</h2>
            {loc(b, "description", lang) && <p className="text-muted-foreground max-w-xl mb-8">{loc(b, "description", lang)}</p>}


            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {items.map((p) => (
                <GlowCard key={p.id} customSize glowColor="orange" className="block w-full !p-0 !gap-0 !rounded-[24px] !shadow-none">
                  <Link to="/product/$id" params={{ id: p.id }} className="group block bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60">
                    <div className="aspect-[3/4] bg-muted overflow-hidden rounded-[18px]">
                      <img src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="mt-4 text-[11px] uppercase tracking-luxe truncate text-cream">{displayName(p)}</div>
                  </Link>
                </GlowCard>
              ))}
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <span className="text-[#8A8A8A] line-through tabular-nums">${original.toFixed(2)}</span>
              <span className="font-display text-2xl tabular-nums font-bold text-white">${final.toFixed(2)}</span>
              {saved > 0 && (
                <span className="text-[10px] uppercase tracking-luxe text-accent">{lang === "ar" ? `وفّري $${saved.toFixed(2)}` : `Save $${saved.toFixed(2)}`}</span>
              )}
            </div>
            <button
              onClick={() => items.forEach(handleAdd)}
              className="mt-6 px-8 py-4 text-xs uppercase tracking-luxe bg-noir text-cream hover:opacity-90 transition-opacity"
            >
              {lang === "ar" ? "أضيفي الباقة للحقيبة" : "Add bundle to bag"}
            </button>
          </motion.section>
        );
      })}

      {/* CROSS-SELLS */}
      {crossSells.map((r) => {
        const suggested = r.suggestions
          .slice(0, r.maxShown)
          .map((s) => products[s.productId])
          .filter(Boolean) as PublicProduct[];
        if (!suggested.length) return null;
        return (
          <motion.section
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="py-16"
          >
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">{lang === "ar" ? "منتقاة لكِ" : "Curated For You"}</div>
            <h2 className="font-display text-2xl md:text-3xl mb-10">{loc(r, "sectionTitle", lang)}</h2>

            <div
              className={
                r.style === "list"
                  ? "flex flex-col gap-6"
                  : r.style === "carousel"
                    ? "flex gap-6 overflow-x-auto pb-2 snap-x"
                    : "grid grid-cols-2 md:grid-cols-3 gap-6"
              }
            >
              {suggested.map((p) => (
                <GlowCard key={p.id} customSize glowColor="orange" className={`block !p-0 !gap-0 !rounded-[24px] !shadow-none ${r.style === "carousel" ? "min-w-[220px] snap-start" : "w-full"}`}>
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="group block bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60"
                  >
                    <div className="aspect-[3/4] bg-muted overflow-hidden rounded-[18px]">
                      <img src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    </div>
                    <div className="mt-4 flex items-baseline justify-between gap-2">
                      <span className="font-display text-sm truncate text-cream">{displayName(p)}</span>
                      <span className="text-xs tabular-nums font-semibold text-white">${Number(p.price).toFixed(2)}</span>
                    </div>
                  </Link>
                </GlowCard>
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
