import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  fetchCrossSellsForPostPurchase,
  fetchProductsByIds,
  type PublicProduct,
} from "@/lib/sales-booster-public";
import type { CrossSellRule } from "@/lib/selling-types";
import { resolveImage } from "@/lib/product-image";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { loc } from "@/lib/localize";

interface Props {
  productIds: string[];
}

/**
 * Cross-sell offers shown on the Order Confirmation page (post-purchase).
 * Reuses the same cross-sell data model and renders only rules whose
 * `locations` include "post_purchase" and trigger from a purchased item.
 */
export function PostPurchaseOffers({ productIds }: Props) {
  const { lang, t } = useI18n();
  const { add } = useCart();
  const [rules, setRules] = useState<CrossSellRule[]>([]);
  const [products, setProducts] = useState<Record<string, PublicProduct>>({});
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = (id: string) => setDismissed((s) => { const n = new Set(s); n.add(id); return n; });

  const key = productIds.slice().sort().join(",");

  useEffect(() => {
    let cancelled = false;
    if (!productIds.length) {
      setRules([]); setProducts({}); setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const c = await fetchCrossSellsForPostPurchase(productIds);
      if (cancelled) return;
      const ids = new Set<string>();
      c.forEach((r) => r.suggestions.forEach((s) => ids.add(s.productId)));
      const fetched = await fetchProductsByIds([...ids]);
      if (cancelled) return;
      const map: Record<string, PublicProduct> = {};
      fetched.forEach((p) => { map[p.id] = p; });
      setRules(c);
      setProducts(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (loading || !rules.length) return null;

  const displayName = (p: PublicProduct) => (lang === "ar" && p.name_ar ? p.name_ar : p.name);

  const handleAdd = (p: PublicProduct) => {
    const res = add({ id: p.id, name: p.name, price: Number(p.price), image_url: p.image_url, stock: p.stock });
    if (!res.ok) toast.error(res.reason ?? t("offers.couldNotAdd"));
    else toast.success(t("offers.addedToast", { name: displayName(p) }));
  };

  return (
    <div className="space-y-6">
      {rules.map((r) => {
        if (dismissed.has(r.id)) return null;
        const suggested = r.suggestions
          .slice(0, r.maxShown)
          .map((s) => products[s.productId])
          .filter(Boolean) as PublicProduct[];
        if (!suggested.length) return null;
        return (
          <section key={r.id} className="border border-white/15 rounded-sm px-5 py-5 bg-black text-white">
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
                    <span className="text-xs tabular-nums font-semibold">${Number(p.price).toFixed(2)}</span>
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
    </div>
  );
}
