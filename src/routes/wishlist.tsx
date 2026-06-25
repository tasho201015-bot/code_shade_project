import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { resolveImage } from "@/lib/product-image";
import { PriceTag } from "@/components/storefront/PriceTag";
import { WishlistButton } from "@/components/storefront/WishlistButton";
import { GlowCard } from "@/components/ui/glow-card";
import p3 from "@/assets/product-3.webp";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
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

function WishlistPage() {
  const { ids, loaded, count } = useWishlist();
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loaded) return;
    const idList = Array.from(ids);
    if (idList.length === 0) {
      setProducts([]);
      return;
    }
    setFetching(true);
    supabase
      .from("products")
      .select("id,name,name_ar,price,image_url,category,compare_at_price,offer_enabled,offer_starts_at,offer_ends_at")
      .in("id", idList)
      .then(({ data }) => {
        setProducts((data ?? []) as Product[]);
        setFetching(false);
      });
  }, [ids, loaded]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="pt-32 pb-12 max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] tracking-luxe uppercase text-accent">{t("wishlist.eyebrow")}</div>
        <h1 className="font-display text-5xl md:text-7xl mt-3">{t("wishlist.title")}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {count > 0 ? t("wishlist.countLabel", { n: count }) : t("wishlist.empty")}
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-32">
        {!loaded || fetching ? (
          <div className="text-center py-24 text-muted-foreground">{t("wishlist.loading")}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-muted-foreground">{t("wishlist.emptyHint")}</p>
            <Link to="/shop" search={{ category: "all" }} className="mt-6 inline-block px-6 py-3 text-xs uppercase tracking-luxe bg-noir text-cream">
              {t("wishlist.browseCta")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-10">
            {products.map((p) => {
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
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
