import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getRecentlyViewed } from "@/lib/product-experience.functions";
import { useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/product-image";
import { useAuth } from "@/lib/auth";

interface P {
  id: string; name: string; name_ar: string | null;
  price: number; compare_at_price: number | null;
  image_url: string | null; stock: number;
}

export function RecentlyViewed({ excludeProductId }: { excludeProductId?: string }) {
  const { lang, t } = useI18n();
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
          <Link key={p.id} to="/product/$id" params={{ id: p.id }} className="group">
            <div className="aspect-[3/4] bg-muted overflow-hidden rounded-sm">
              <img src={resolveImage(p.image_url)} alt={p.name} loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            </div>
            <div className="mt-3 text-sm">{lang === "ar" && p.name_ar ? p.name_ar : p.name}</div>
            <div className="text-xs tabular-nums">${Number(p.price).toFixed(2)}</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
