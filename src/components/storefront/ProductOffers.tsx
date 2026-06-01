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
import { useI18n } from "@/lib/i18n";

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
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">{u.badge || "Exclusive Offer"}</div>
            <h2 className="font-display text-2xl md:text-3xl mb-2">{u.headline}</h2>
            {u.note && <p className="text-muted-foreground max-w-xl mb-6">{u.note}</p>}
            <div className="flex flex-wrap items-baseline gap-4 mb-6">
              {u.originalPrice > 0 && (
                <span className="text-muted-foreground line-through tabular-nums">${u.originalPrice.toFixed(2)}</span>
              )}
              <span className="font-display text-2xl tabular-nums text-accent">${u.upsellPrice.toFixed(2)}</span>
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
                    Add upgrade
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
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">{b.badge || "Complete the Look"}</div>
            <h2 className="font-display text-2xl md:text-3xl mb-2">{b.name}</h2>
            {b.description && <p className="text-muted-foreground max-w-xl mb-8">{b.description}</p>}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
              {items.map((p) => (
                <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group block">
                  <div className="aspect-[3/4] bg-muted overflow-hidden">
                    <img src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-luxe truncate">{displayName(p)}</div>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap items-baseline gap-4">
              <span className="text-muted-foreground line-through tabular-nums">${original.toFixed(2)}</span>
              <span className="font-display text-2xl tabular-nums text-accent">${final.toFixed(2)}</span>
              {saved > 0 && (
                <span className="text-[10px] uppercase tracking-luxe text-accent">Save ${saved.toFixed(2)}</span>
              )}
            </div>
            <button
              onClick={() => items.forEach(handleAdd)}
              className="mt-6 px-8 py-4 text-xs uppercase tracking-luxe bg-noir text-cream hover:opacity-90 transition-opacity"
            >
              Add bundle to bag
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
            <div className="text-[10px] uppercase tracking-luxe text-accent mb-3">Curated For You</div>
            <h2 className="font-display text-2xl md:text-3xl mb-10">{r.sectionTitle}</h2>
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
                <Link
                  key={p.id}
                  to="/product/$id"
                  params={{ id: p.id }}
                  className={`group block ${r.style === "carousel" ? "min-w-[220px] snap-start" : ""}`}
                >
                  <div className="aspect-[3/4] bg-muted overflow-hidden">
                    <img src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="mt-3 flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm truncate">{displayName(p)}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">${Number(p.price).toFixed(2)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        );
      })}
    </div>
  );
}
