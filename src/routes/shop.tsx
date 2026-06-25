import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { resolveImage } from "@/lib/product-image";
import { PriceTag } from "@/components/storefront/PriceTag";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ShopFilters, emptyFilters, useProductAttributeMaps, type ShopFilterState } from "@/components/storefront/ShopFilters";
import { GlowCard } from "@/components/ui/glow-card";
import p3 from "@/assets/product-3.webp";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>) => ({ category: (s.category as string) || "all" }),
  component: ShopPage,
});

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
  compare_at_price: number | null;
  offer_enabled: boolean | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
}

interface CatRow { slug: string; name: string; name_ar: string | null; sort_order: number }

function ShopPage() {
  const { category } = Route.useSearch();
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ key: string; label_en: string; label_ar: string | null }[]>([
    { key: "all", label_en: "All", label_ar: null },
  ]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("categories")
      .select("slug,name,name_ar,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        const list = (data ?? []) as CatRow[];
        setCats([
          { key: "all", label_en: "All", label_ar: null },
          ...list
            .filter((c) => c.slug !== "uncategorized")
            .map((c) => ({ key: c.slug, label_en: c.name, label_ar: c.name_ar })),
        ]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let q = supabase
      .from("products")
      .select("id,name,name_ar,price,image_url,category,compare_at_price,offer_enabled,offer_starts_at,offer_ends_at")
      .eq("is_active", true);
    if (category && category !== "all") {
      q = q.eq("category", category);
    }
    q.order("created_at", { ascending: false })
      .limit(48)
      .then(({ data, error }) => {
        if (!mounted) return;
        setProducts(error ? [] : ((data ?? []) as Product[]));
      });
    return () => {
      mounted = false;
    };
  }, [category]);

  const [filters, setFilters] = useState<ShopFilterState>(emptyFilters);
  const productIds = useMemo(() => products.map((p) => p.id), [products]);
  const { colorMap, sizeMap } = useProductAttributeMaps(productIds);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      if (category !== "all" && p.category !== category) return false;
      if (filters.minPrice != null && p.price < filters.minPrice) return false;
      if (filters.maxPrice != null && p.price > filters.maxPrice) return false;
      if (filters.colorIds.length > 0) {
        const pc = colorMap[p.id] ?? [];
        if (!filters.colorIds.some((id) => pc.includes(id))) return false;
      }
      if (filters.sizeIds.length > 0) {
        const ps = sizeMap[p.id] ?? [];
        if (!filters.sizeIds.some((id) => ps.includes(id))) return false;
      }
      return true;
    });
  }, [category, products, filters, colorMap, sizeMap]);

  const catLabel = (c: { key: string; label_en: string; label_ar: string | null }) => {
    if (lang === "ar") return c.label_ar ?? t(`cat.${c.key}`);
    // English: prefer i18n key, fall back to DB name
    const fromKey = `cat.${c.key}`;
    return t(fromKey) === `⟦${fromKey}⟧` ? c.label_en : t(fromKey);
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-32 pb-12 max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[10px] tracking-luxe uppercase text-accent">{t("shop.eyebrow")}</div>
          <h1 className="font-display text-5xl md:text-7xl mt-3">{t("shop.title")}</h1>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap gap-2">
            {cats.map((c) => (
              <Link
                key={c.key}
                to="/shop"
                search={{ category: c.key }}
                className={`px-5 py-2 text-[10px] uppercase tracking-luxe border transition-all ${
                  category === c.key
                    ? "bg-noir text-cream border-noir"
                    : "border-border hover:border-accent"
                }`}
              >
                {catLabel(c)}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-32">
        <div className="flex flex-col lg:flex-row lg:gap-10">
          <div className="mb-6 lg:mb-0 flex justify-end lg:block">
            <ShopFilters value={filters} onChange={setFilters} />
          </div>
          <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          {filtered.map((p) => {
            const displayName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
            return (
              <div key={p.id} className="opacity-100">
                <GlowCard customSize glowColor="orange" className="block w-full !p-0 !gap-0 !rounded-[24px] !shadow-none">
                  <Link
                    to="/product/$id"
                    params={{ id: p.id }}
                    className="block group bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60 relative"
                  >
                    <div className="absolute top-6 right-6 z-10">
                      <WishlistButton productId={p.id} />
                    </div>
                    <div className="aspect-[3/4] bg-muted overflow-hidden relative rounded-[18px]">
                      <img
                        src={resolveImage(p.image_url)}
                        alt={displayName}
                        loading="lazy"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src !== p3) img.src = p3;
                        }}
                        className="w-full h-full object-cover block transition-transform duration-700 group-hover:scale-105"
                      />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-display text-xl leading-tight text-cream">{displayName}</div>
                        <div className="text-[10px] uppercase tracking-luxe text-cream/60 mt-1">
                          {t(`cat.${p.category}`)}
                        </div>
                      </div>
                      <PriceTag p={p} />
                    </div>
                  </Link>
                </GlowCard>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-24 text-muted-foreground">{t("shop.empty")}</div>
          )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
