import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import { PriceTag } from "@/components/storefront/PriceTag";
import { useI18n } from "@/lib/i18n";
import { ChevronLeft, X, ZoomIn } from "lucide-react";
import { GlowCard } from "@/components/ui/glow-card";


export const Route = createFileRoute("/categories/$slug")({
  component: CategoryPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug.replace(/-/g, " ")} — Malaz` },
      {
        name: "description",
        content: `Discover the ${params.slug.replace(/-/g, " ")} collection — handpicked pieces from Malaz.`,
      },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-4xl">Collection not found</h1>
      <Link to="/categories" className="link-underline text-xs uppercase tracking-luxe">
        See all collections
      </Link>
    </div>
  ),
  errorComponent: ({ error, reset }) => (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-3xl">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">{error.message}</p>
      <button onClick={reset} className="text-xs uppercase tracking-luxe link-underline">
        Try again
      </button>
    </div>
  ),
});

interface Cat {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
}
interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
  compare_at_price: number | null;
  offer_enabled: boolean | null;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
}

function CategoryPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const [cat, setCat] = useState<Cat | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoomImg, setZoomImg] = useState<{ src: string; alt: string } | null>(null);

  useEffect(() => {
    if (!zoomImg) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomImg(null);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [zoomImg]);


  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("categories").select("*").eq("slug", slug).maybeSingle(),
        supabase
          .from("products")
          .select("id,name,name_ar,price,image_url,category,stock,compare_at_price,offer_enabled,offer_starts_at,offer_ends_at")
          .eq("is_active", true)
          .eq("category", slug)
          .order("created_at", { ascending: false }),
      ]);
      if (!alive) return;
      setCat((c as Cat) ?? null);
      setProducts((p as Product[]) ?? []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="pt-40 max-w-7xl mx-auto px-6 lg:px-10 text-muted-foreground text-sm">
          {t("catpage.loading")}
        </div>
      </div>
    );
  }

  if (!cat) throw notFound();

  const hero = cat.image_url ?? products[0]?.image_url ?? null;
  const catName = lang === "ar" && cat.name_ar ? cat.name_ar : cat.name;

  return (
    <div className="min-h-screen">
      <Header />

      {/* Cinematic cover */}
      <section className="relative h-[70vh] min-h-[480px] overflow-hidden">
        {hero ? (
          <motion.img
            src={resolveImage(hero)}
            alt={catName}
            initial={{ scale: 1.15, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-noir to-accent/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-transparent" />
        <div className="absolute -bottom-20 -left-20 w-[40rem] h-[40rem] rounded-full bg-accent/15 blur-[120px]" />

        <div className="relative h-full max-w-7xl mx-auto px-6 lg:px-10 flex flex-col justify-end pb-16 text-cream">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.3 }}
          >
            <Link
              to="/categories"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-luxe opacity-80 hover:opacity-100"
            >
              <ChevronLeft className="w-3 h-3" /> {t("catpage.back")}
            </Link>
            <div className="mt-6 text-[10px] uppercase tracking-luxe text-accent">
              {t("catpage.theEdit", { name: catName })}
            </div>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.95] mt-3">
              {catName}
            </h1>
            {(cat.description || cat.description_ar) && (
              <p className="mt-5 max-w-xl text-sm opacity-85">
                {lang === "ar" && cat.description_ar ? cat.description_ar : cat.description}
              </p>
            )}
            <div className="mt-6 text-[10px] uppercase tracking-luxe opacity-70">
              {products.length} {products.length === 1 ? t("catpage.piece") : t("catpage.pieces")} · {t("catpage.curated")}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Asymmetric editorial product grid */}
      <section className="max-w-[90rem] mx-auto px-4 lg:px-8 py-20">
        {products.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">
            {t("catpage.empty")}
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-3 md:gap-6">
            {products.map((p, i) => {
              // editorial cadence: hero, two stacked, wide, normal
              const mod = i % 6;
              const span =
                mod === 0
                  ? "col-span-12 md:col-span-7"
                  : mod === 1
                    ? "col-span-6 md:col-span-5"
                    : mod === 2
                      ? "col-span-6 md:col-span-4"
                      : mod === 3
                        ? "col-span-6 md:col-span-4"
                        : mod === 4
                          ? "col-span-6 md:col-span-4"
                          : "col-span-12 md:col-span-12";
              const aspect = mod === 0 ? "aspect-[4/3] md:aspect-[16/10]" : mod === 5 ? "aspect-[21/9]" : "aspect-[3/4]";
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.7, delay: (i % 6) * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  className={`${span} group`}
                >
                  <GlowCard customSize glowColor="orange" className="block w-full !p-0 !gap-0 !rounded-[24px] !shadow-none">
                    <div className="bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60">
                      <div className={`relative ${aspect} overflow-hidden bg-muted rounded-[18px]`}>
                        <button
                          type="button"
                          onClick={() =>
                            setZoomImg({
                              src: resolveImage(p.image_url),
                              alt: lang === "ar" && p.name_ar ? p.name_ar : p.name,
                            })
                          }
                          className="absolute inset-0 w-full h-full block focus:outline-none focus:ring-2 focus:ring-accent"
                          aria-label="Zoom image"
                        >
                          <motion.img
                            src={resolveImage(p.image_url)}
                            alt={lang === "ar" && p.name_ar ? p.name_ar : p.name}
                            loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 active:scale-95"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-noir/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                          <div className="absolute bottom-3 right-3 bg-noir/70 text-cream p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <ZoomIn className="w-4 h-4" />
                          </div>
                        </button>
                        {p.stock <= 0 && (
                          <div className="absolute top-3 left-3 bg-noir text-cream px-3 py-1 text-[10px] uppercase tracking-luxe pointer-events-none">
                            {t("catpage.soldOut")}
                          </div>
                        )}
                        {p.stock > 0 && p.stock <= 3 && (
                          <div className="absolute top-3 left-3 bg-accent text-background px-3 py-1 text-[10px] uppercase tracking-luxe pointer-events-none">
                            {t("catpage.onlyLeft", { n: p.stock })}
                          </div>
                        )}
                      </div>
                      <Link to="/product/$id" params={{ id: p.id }} className="block">
                        <div className="mt-4 flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="font-display text-xl md:text-2xl leading-tight truncate text-cream group-hover:text-accent transition-colors">
                              {lang === "ar" && p.name_ar ? p.name_ar : p.name}
                            </div>
                            <div className="text-[10px] uppercase tracking-luxe text-cream/60 mt-1">
                              {t(`cat.${p.category}`)}
                            </div>
                          </div>
                          <PriceTag p={p} />
                        </div>
                      </Link>
                    </div>
                  </GlowCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {zoomImg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-noir/95 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomImg(null)}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => setZoomImg(null)}
              className="absolute top-5 right-5 text-cream/90 hover:text-cream p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img
              key={zoomImg.src}
              src={zoomImg.src}
              alt={zoomImg.alt}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-full max-h-full object-contain shadow-luxe"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}

