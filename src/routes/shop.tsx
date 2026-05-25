import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { resolveImage } from "@/lib/product-image";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
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
      .select("id,name,name_ar,price,image_url,category")
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

  const filtered = useMemo(
    () => (category === "all" ? products : products.filter((p) => p.category === category)),
    [category, products],
  );

  const catLabel = (c: { key: string; label_en: string; label_ar: string | null }) => {
    if (lang === "ar") return c.label_ar ?? t(`cat.${c.key}`);
    // English: prefer i18n key, fall back to DB name
    const fromKey = `cat.${c.key}`;
    return t(fromKey) === `⟦${fromKey}⟧` ? c.label_en : t(fromKey);
  };

  return (
    <div className="bg-background min-h-screen">
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
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          {filtered.map((p) => {
            const displayName = lang === "ar" && p.name_ar ? p.name_ar : p.name;
            return (
              <div key={p.id} className="opacity-100">
                <Link
                  to="/product/$id"
                  params={{ id: p.id }}
                  className="block group bg-card text-card-foreground border border-border rounded-sm p-3 shadow-soft hover:border-accent transition-colors min-h-[320px]"
                >
                  <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                    <img
                      src={resolveImage(p.image_url)}
                      alt={displayName}
                      loading="lazy"
                      onError={(e) => {
                        const img = e.currentTarget;
                        if (img.src !== p3) img.src = p3;
                      }}
                      className="w-full h-full object-cover block"
                    />
                    <div className="absolute inset-0 -z-10 flex items-center justify-center text-xs uppercase tracking-luxe text-muted-foreground">
                      {displayName}
                    </div>
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-xl leading-tight text-foreground">{displayName}</div>
                      <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-1">
                        {t(`cat.${p.category}`)}
                      </div>
                    </div>
                    <div className="text-sm tabular-nums text-foreground">${Number(p.price).toFixed(0)}</div>
                  </div>
                </Link>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-24 text-muted-foreground">{t("shop.empty")}</div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
