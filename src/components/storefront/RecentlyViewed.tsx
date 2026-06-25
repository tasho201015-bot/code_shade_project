import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getRecentlyViewed } from "@/lib/product-experience.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { ProductCard } from "@/components/storefront/ProductCard";

interface P {
  id: string; name: string; name_ar: string | null;
  price: number; compare_at_price: number | null;
  image_url: string | null; stock: number;
}

export function RecentlyViewed({ excludeProductId }: { excludeProductId?: string }) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [items, setItems] = useState<P[]>([]);
  const fn = useServerFn(getRecentlyViewed);
  useEffect(() => {
    if (!user) { setItems([]); return; }
    fn({ data: { excludeProductId } })
      .then((r) => setItems(r.products as P[]))
      .catch(() => setItems([]));
  }, [fn, user, excludeProductId]);
  if (!user || items.length === 0) return null;
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl md:text-3xl mb-5">{t("prod.recent.title")}</h2>
      <div className="grid grid-cols-2 gap-4 md:gap-6 max-w-2xl">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
