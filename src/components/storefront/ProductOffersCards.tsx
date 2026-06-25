import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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


interface Props {
  productId: string;
}

export function ProductOffersCards({ productId }: Props) {
  const { lang } = useI18n();
  const { add } = useCart();
  const [upsells, setUpsells] = useState<UpsellRule[]>([]);
  const [crossSells, setCrossSells] = useState<CrossSellRule[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [products, setProducts] = useState<Record<string, PublicProduct>>({});
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);

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

  const displayName = (p: PublicProduct) =>
    lang === "ar" && p.name_ar ? p.name_ar : p.name;

  const handleAdd = (p: PublicProduct) => {
    const res = add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock });
    if (!res.ok) toast.error(res.reason ?? "Could not add to bag");
    else toast.success(`${displayName(p)} added`);
  };

  // Flatten cross-sell suggestions
  const crossProducts: PublicProduct[] = [];
  crossSells.forEach((r) =>
    r.suggestions.slice(0, r.maxShown).forEach((s) => {
      const p = products[s.productId];
      if (p) crossProducts.push(p);
    })
  );

  const visiblePerPage = 4;
  const maxIndex = Math.max(0, crossProducts.length - visiblePerPage);

  return (
    <div className="space-y-6">
      {/* UPSELL CARD */}
      {upsells.map((u) => {
        const sp = u.suggestedProductId ? products[u.suggestedProductId] : null;
        if (!sp) return null;
        const diff = u.upsellPrice - u.originalPrice;
        return (
          <section key={u.id} className="border border-border/70 rounded-sm px-6 py-6 md:px-8 md:py-7">
            <div className="flex items-center gap-3 mb-5">
              <h3 className="font-display text-base md:text-lg uppercase tracking-luxe">
                {loc(u, "headline", lang) || (lang === "ar" ? "طوّري تجربتكِ" : "Upgrade your experience")}
              </h3>
              {loc(u, "badge", lang) && (
                <span className="text-[10px] uppercase tracking-luxe bg-accent/30 text-accent-foreground px-2.5 py-1 rounded-sm">
                  {loc(u, "badge", lang)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[120px_1fr_auto] gap-5 md:gap-6 items-center">
              <Link to="/product/$id" params={{ id: sp.id }} className="block w-28 md:w-[120px] aspect-square bg-muted overflow-hidden">
                <img src={resolveImage(sp.image_url)} alt={displayName(sp)} className="w-full h-full object-cover" />
              </Link>
              <div className="min-w-0">
                <Link to="/product/$id" params={{ id: sp.id }} className="font-display text-base md:text-lg hover:text-accent transition-colors block">
                  {displayName(sp)}
                </Link>
                {loc(u, "note", lang) && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{loc(u, "note", lang)}</p>}
                <div className="mt-2 text-sm tabular-nums font-semibold text-white">${Number(sp.price).toFixed(2)}</div>
              </div>
              <div className="flex flex-col items-start md:items-end gap-3">
                {diff > 0 && (
                  <div className="text-sm font-bold tabular-nums text-white">+${diff.toFixed(2)}</div>
                )}
                <button
                  onClick={() => handleAdd(sp)}
                  className="px-5 py-3 text-[10px] uppercase tracking-luxe bg-noir text-cream hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                  {lang === "ar" ? "ترقية الآن" : "Upgrade now"}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {/* BUNDLE CARD */}
      {bundles.map((b) => {
        const { original, final, saved, items } = computeBundlePrice(b, Object.values(products));
        if (!items.length) return null;
        const savedPct = original > 0 ? Math.round((saved / original) * 100) : 0;
        return (
          <section key={b.id} className="border border-border/70 rounded-sm px-6 py-6 md:px-8 md:py-7">
            <div className="flex items-center gap-3 mb-6">
              <h3 className="font-display text-base md:text-lg uppercase tracking-luxe">
                {loc(b, "name", lang) || (lang === "ar" ? "أكملي الإطلالة" : "Complete the look")}
              </h3>
              {savedPct > 0 && (
                <span className="text-[10px] uppercase tracking-luxe bg-accent/30 text-accent-foreground px-2.5 py-1 rounded-sm">
                  {lang === "ar" ? `وفّري ${savedPct}%` : `Save ${savedPct}%`}
                </span>
              )}

            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6 items-stretch">
              <div className="flex items-center gap-3 md:gap-4 overflow-x-auto">
                {items.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 md:gap-4">
                    <Link to="/product/$id" params={{ id: p.id }} className="block w-28 md:w-32 shrink-0">
                      <div className="aspect-square bg-muted overflow-hidden">
                        <img src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover" />
                      </div>
                      <div className="mt-2 text-[10px] uppercase tracking-luxe truncate">{displayName(p)}</div>
                      <div className="text-xs tabular-nums text-[#8A8A8A]">${Number(p.price).toFixed(2)}</div>
                    </Link>
                    {i < items.length - 1 && (
                      <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                ))}
              </div>
              <div className="border border-border/70 rounded-sm p-5 flex flex-col justify-center ">
                <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-2">{lang === "ar" ? "سعر الباقة" : "Bundle price"}</div>
                {original > final && (
                  <div className="text-sm line-through text-[#8A8A8A] tabular-nums">${original.toFixed(2)}</div>
                )}
                <div className="font-display text-2xl tabular-nums font-bold text-white mt-1">${final.toFixed(2)}</div>
                {saved > 0 && (
                  <div className="text-xs text-accent mt-1">{lang === "ar" ? `وفّرتِ $${saved.toFixed(2)}` : `You save $${saved.toFixed(2)}`}</div>
                )}
                <button
                  onClick={() => items.forEach(handleAdd)}
                  className="mt-4 px-5 py-3 text-[10px] uppercase tracking-luxe bg-noir text-cream hover:opacity-90 transition-opacity"
                >
                  {lang === "ar" ? "أضيفي الباقة للحقيبة" : "Add bundle to bag"}
                </button>

              </div>
            </div>
          </section>
        );
      })}

      {/* CROSS-SELL CAROUSEL */}
      {crossProducts.length > 0 && (
        <section className="border border-border/70 rounded-sm px-6 py-6 md:px-8 md:py-7">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display text-base md:text-lg uppercase tracking-luxe">
              {(crossSells[0] && loc(crossSells[0], "sectionTitle", lang)) || (lang === "ar" ? "قد يعجبكِ أيضاً" : "You may also like")}
            </h3>

            {crossProducts.length > visiblePerPage && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCarouselIndex((i) => Math.max(0, i - 1))}
                  disabled={carouselIndex === 0}
                  className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent disabled:opacity-40 transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCarouselIndex((i) => Math.min(maxIndex, i + 1))}
                  disabled={carouselIndex >= maxIndex}
                  className="w-9 h-9 border border-border flex items-center justify-center hover:border-accent disabled:opacity-40 transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="overflow-hidden">
            <div
              className="flex gap-5 transition-transform duration-500"
              style={{ transform: `translateX(calc(-${carouselIndex} * (25% + 0px)))` }}
            >
              {crossProducts.map((p) => (
                <GlowCard
                  key={p.id}
                  customSize
                  glowColor="orange"
                  className="block shrink-0 w-[calc(50%-10px)] md:w-[calc(33.333%-14px)] lg:w-[calc(25%-15px)] !p-0 !gap-0 !rounded-[24px] !shadow-none"
                >
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="group block bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60"
                  >
                    <div className="aspect-[3/4] bg-muted overflow-hidden rounded-[18px]">
                      <img
                        src={resolveImage(p.image_url)}
                        alt={displayName(p)}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                    <div className="mt-4">
                      <div className="text-[11px] uppercase tracking-luxe truncate text-cream">{displayName(p)}</div>
                      <div className="text-xs tabular-nums font-semibold text-white mt-1">${Number(p.price).toFixed(2)}</div>
                    </div>
                  </Link>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
