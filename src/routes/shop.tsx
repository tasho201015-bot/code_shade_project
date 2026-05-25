import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { resolveImage } from "@/lib/product-image";
import { supabase } from "@/integrations/supabase/client";
import p3 from "@/assets/product-3.webp";

export const Route = createFileRoute("/shop")({
  validateSearch: (s: Record<string, unknown>) => ({ category: (s.category as string) || "all" }),
  component: ShopPage,
});

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  category: string;
}

interface CatRow { slug: string; name: string; sort_order: number }

function ShopPage() {
  const { category } = Route.useSearch();
  const [products, setProducts] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ key: string; label: string }[]>([
    { key: "all", label: "All" },
  ]);

  useEffect(() => {
    let mounted = true;
    supabase
      .from("categories")
      .select("slug,name,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        const list = (data ?? []) as CatRow[];
        setCats([
          { key: "all", label: "All" },
          ...list
            .filter((c) => c.slug !== "uncategorized")
            .map((c) => ({ key: c.slug, label: c.name })),
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
      .select("id,name,price,image_url,category")
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

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-12 max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-[10px] tracking-luxe uppercase text-accent">Boutique</div>
          <h1 className="font-display text-5xl md:text-7xl mt-3">The Collection</h1>
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
                {c.label}
              </Link>
            ))}
          </div>
        </Reveal>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-32">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
          {filtered.map((p) => (
            <div key={p.id} className="opacity-100">
              <Link
                to="/product/$id"
                params={{ id: p.id }}
                className="block group bg-card text-card-foreground border border-border rounded-sm p-3 shadow-soft hover:border-accent transition-colors min-h-[320px]"
              >
                <div className="aspect-[3/4] bg-muted overflow-hidden relative">
                  <img
                    src={resolveImage(p.image_url)}
                    alt={p.name}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== p3) img.src = p3;
                    }}
                    className="w-full h-full object-cover block"
                  />
                  <div className="absolute inset-0 -z-10 flex items-center justify-center text-xs uppercase tracking-luxe text-muted-foreground">
                    {p.name}
                  </div>
                </div>
                <div className="mt-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="font-display text-xl leading-tight text-foreground">{p.name}</div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-1">
                      {p.category}
                    </div>
                  </div>
                  <div className="text-sm tabular-nums text-foreground">${Number(p.price).toFixed(0)}</div>
                </div>
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-24 text-muted-foreground">No pieces in this collection yet.</div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
