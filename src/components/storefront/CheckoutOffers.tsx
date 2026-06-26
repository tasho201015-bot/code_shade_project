import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  fetchUpsellsForCheckout,
  fetchCrossSellsForCheckout,
  fetchBundlesForCheckout,
  fetchBundlesByIds,
  fetchProductsByIds,
  computeBundlePrice,
  type PublicProduct,
} from "@/lib/sales-booster-public";
import type { Bundle, CrossSellRule, UpsellRule } from "@/lib/selling-types";
import { resolveImage } from "@/lib/product-image";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { loc } from "@/lib/localize";

interface Props {
  cartProductIds: string[];
}

/**
 * Checkout-page offers shown between the order summary and shipping form.
 * Renders Upsells → Cross-Sells → Bundles in that order, only for rules
 * whose positions/locations include "checkout" and trigger from a cart item.
 */
export function CheckoutOffers({ cartProductIds }: Props) {
  const { lang, t } = useI18n();
  const { add } = useCart();
  const [upsells, setUpsells] = useState<UpsellRule[]>([]);
  const [crossSells, setCrossSells] = useState<CrossSellRule[]>([]);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [upsellBundles, setUpsellBundles] = useState<Record<string, Bundle>>({});
  const [products, setProducts] = useState<Record<string, PublicProduct>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (id: string) => setDismissed((s) => { const n = new Set(s); n.add(id); return n; });

  const key = cartProductIds.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (!cartProductIds.length) {
      setUpsells([]); setCrossSells([]); setBundles([]); setUpsellBundles({}); setProducts({});
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const [u, c, b] = await Promise.all([
        fetchUpsellsForCheckout(cartProductIds),
        fetchCrossSellsForCheckout(cartProductIds),
        fetchBundlesForCheckout(cartProductIds),
      ]);
      if (cancelled) return;
      const bundleIds = Array.from(new Set(u.map((r) => r.suggestedBundleId).filter(Boolean) as string[]));
      const uBundles = bundleIds.length ? await fetchBundlesByIds(bundleIds) : [];
      if (cancelled) return;
      const uBundleMap: Record<string, Bundle> = {};
      uBundles.forEach((bn) => { uBundleMap[bn.id] = bn; });

      const ids = new Set<string>();
      u.forEach((r) => {
        if (r.suggestedProductId) ids.add(r.suggestedProductId);
        if (r.triggerProductId) ids.add(r.triggerProductId);
      });
      c.forEach((r) => r.suggestions.forEach((s) => ids.add(s.productId)));
      b.forEach((bn) => bn.productIds.forEach((id) => ids.add(id)));
      uBundles.forEach((bn) => bn.productIds.forEach((id) => ids.add(id)));
      const fetched = await fetchProductsByIds([...ids]);
      if (cancelled) return;
      const map: Record<string, PublicProduct> = {};
      fetched.forEach((p) => { map[p.id] = p; });
      setUpsells(u);
      setCrossSells(c);
      setBundles(b);
      setUpsellBundles(uBundleMap);
      setProducts(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (loading) return null;
  if (!upsells.length && !crossSells.length && !bundles.length) return null;

  const displayName = (p: PublicProduct) => (lang === "ar" && p.name_ar ? p.name_ar : p.name);


  const handleAdd = (p: PublicProduct) => {
    const res = add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock });
    if (!res.ok) toast.error(res.reason ?? t("offers.couldNotAdd"));
    else toast.success(t("offers.addedToast", { name: displayName(p) }));
  };

  return (
    <div className="my-12 space-y-8">
      <div className="text-[10px] uppercase tracking-luxe text-accent">
        {t("offers.title")}
      </div>

      {/* UPSELLS first */}
      {upsells.map((u) => {
        if (dismissed.has(u.id)) return null;
        const headline = loc(u, "headline", lang) || t("offers.upgrade");
        const badge = loc(u, "badge", lang);
        const diff = u.upsellPrice - u.originalPrice;

        // Bundle-type upsell: render the suggested bundle
        if (u.suggestedBundleId && upsellBundles[u.suggestedBundleId]) {
          const bn = upsellBundles[u.suggestedBundleId];
          const { original, final, saved, items } = computeBundlePrice(bn, Object.values(products));
          if (!items.length) return null;
          return (
            <section key={u.id} className="border border-border/70 rounded-sm px-5 py-5">
              <div className="flex items-center gap-3 mb-4">
                <h3 className="font-display text-base uppercase tracking-luxe">{headline}</h3>
                {badge && (
                  <span className="text-[10px] uppercase tracking-luxe bg-accent/30 text-accent-foreground px-2 py-0.5 rounded-sm">
                    {badge}
                  </span>
                )}
              </div>
              {loc(u, "note", lang) && <p className="text-xs text-muted-foreground mb-3">{loc(u, "note", lang)}</p>}
              <div className="flex flex-wrap gap-3 mb-4">
                {items.map((p) => (
                  <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="block w-20">
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img loading="lazy" decoding="async" src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover" />
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-luxe truncate">{displayName(p)}</div>
                  </Link>
                ))}
              </div>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-baseline gap-3">
                  {original > final && (
                    <span className="text-sm line-through text-[#8A8A8A] tabular-nums">${original.toFixed(2)}</span>
                  )}
                  <span className="font-display text-xl tabular-nums font-bold text-white">${final.toFixed(2)}</span>
                  {saved > 0 && (
                    <span className="text-[10px] uppercase tracking-luxe text-accent">
                      {t("offers.save", { amount: saved.toFixed(2) })}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => { items.forEach(handleAdd); dismiss(u.id); }}
                  className="px-5 py-2.5 text-[10px] uppercase tracking-luxe bg-noir text-cream transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_18px_rgba(201,169,97,0.55)] hover:ring-1 hover:ring-[#C9A961]/60"
                >
                  {t("offers.addBundle")}
                </button>
              </div>
            </section>
          );
        }

        // Product-suggestion upsell (upgrade)
        const sp = u.suggestedProductId
          ? products[u.suggestedProductId]
          : (u.type === "quantity" || u.type === "limited")
            ? products[u.triggerProductId]
            : null;
        if (!sp) return null;
        return (
          <section key={u.id} className="border border-border/70 rounded-sm px-5 py-5">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-display text-base uppercase tracking-luxe">{headline}</h3>
              {badge && (
                <span className="text-[10px] uppercase tracking-luxe bg-accent/30 text-accent-foreground px-2 py-0.5 rounded-sm">
                  {badge}
                </span>
              )}
            </div>
            <div className="grid grid-cols-[88px_1fr_auto] gap-4 items-center">
              <Link to="/product/$id" params={{ id: sp.id }} className="block w-22 aspect-square bg-muted overflow-hidden">
                <img loading="lazy" decoding="async" src={resolveImage(sp.image_url)} alt={displayName(sp)} className="w-full h-full object-cover" />
              </Link>
              <div className="min-w-0">
                <Link to="/product/$id" params={{ id: sp.id }} className="font-display text-base hover:text-accent transition-colors block truncate">
                  {displayName(sp)}
                </Link>
                {loc(u, "note", lang) && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{loc(u, "note", lang)}</p>}
              </div>
              <div className="flex flex-col items-end gap-2">
                {diff !== 0 && (
                  <div className="text-sm font-bold tabular-nums text-white">
                    {diff > 0 ? "+" : ""}${diff.toFixed(2)}
                  </div>
                )}
                <button
                  onClick={() => { handleAdd(sp); dismiss(u.id); }}
                  className="px-4 py-2 text-[10px] uppercase tracking-luxe bg-black text-cream whitespace-nowrap transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_18px_rgba(201,169,97,0.55)] hover:ring-1 hover:ring-[#C9A961]/60"
                >
                  {t("offers.add")}
                </button>
              </div>
            </div>
          </section>
        );
      })}

      {/* CROSS-SELLS */}
      {crossSells.map((r) => {
        if (dismissed.has(r.id)) return null;
        const suggested = r.suggestions
          .slice(0, r.maxShown)
          .map((s) => products[s.productId])
          .filter(Boolean) as PublicProduct[];
        if (!suggested.length) return null;
        return (
          <section key={r.id} className="border border-border/70 rounded-sm px-5 py-5">
            <h3 className="font-display text-base uppercase tracking-luxe mb-4">
              {loc(r, "sectionTitle", lang)}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {suggested.map((p) => (
                <div key={p.id} className="space-y-2">
                  <Link to="/product/$id" params={{ id: p.id }} className="block aspect-[3/4] bg-muted overflow-hidden">
                    <img loading="lazy" decoding="async" src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover" />
                  </Link>
                  <div className="text-[11px] uppercase tracking-luxe truncate">{displayName(p)}</div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs tabular-nums text-white font-semibold">${Number(p.price).toFixed(2)}</span>
                    <button
                      onClick={() => { handleAdd(p); dismiss(r.id); }}
                      className="text-[10px] uppercase tracking-luxe text-accent px-2 py-1 rounded-sm transition-all duration-300 hover:underline hover:shadow-[0_0_14px_rgba(201,169,97,0.5)]"
                    >
                      {t("offers.add")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* BUNDLES */}
      {bundles.map((b) => {
        if (dismissed.has(b.id)) return null;
        const { original, final, saved, items } = computeBundlePrice(b, Object.values(products));
        if (!items.length) return null;
        return (
          <section key={b.id} className="border border-border/70 rounded-sm px-5 py-5">
            <div className="flex items-center gap-3 mb-4">
              <h3 className="font-display text-base uppercase tracking-luxe">
                {loc(b, "name", lang) || t("offers.complete")}
              </h3>
              {saved > 0 && (
                <span className="text-[10px] uppercase tracking-luxe bg-accent/30 text-accent-foreground px-2 py-0.5 rounded-sm">
                  {t("offers.save", { amount: saved.toFixed(2) })}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {items.map((p) => (
                <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="block w-20">
                  <div className="aspect-square bg-muted overflow-hidden">
                    <img loading="lazy" decoding="async" src={resolveImage(p.image_url)} alt={displayName(p)} className="w-full h-full object-cover" />
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-luxe truncate">{displayName(p)}</div>
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-baseline gap-3">
                {original > final && (
                  <span className="text-sm line-through text-[#8A8A8A] tabular-nums">${original.toFixed(2)}</span>
                )}
                <span className="font-display text-xl tabular-nums font-bold text-white">${final.toFixed(2)}</span>
              </div>
              <button
                onClick={() => { items.forEach(handleAdd); dismiss(b.id); }}
                className="px-5 py-2.5 text-[10px] uppercase tracking-luxe bg-noir text-cream transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_18px_rgba(201,169,97,0.55)] hover:ring-1 hover:ring-[#C9A961]/60"
              >
                {t("offers.addBundle")}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
