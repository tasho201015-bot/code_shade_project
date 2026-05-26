import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import { useI18n } from "@/lib/i18n";
import { ChevronLeft, X, ZoomIn } from "lucide-react";


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
}

function CategoryPage() {
  const { slug } = Route.useParams();
  const { t, lang } = useI18n();
  const [cat, setCat] = useState<Cat | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const [{ data: c }, { data: p }] = await Promise.all([
        supabase.from("categories").select("*").eq("slug", slug).maybeSingle(),
        supabase
          .from("products")
          .select("id,name,name_ar,price,image_url,category,stock")
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
      <div className="bg-background min-h-screen">
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
    <div className="bg-background min-h-screen">
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
            {cat.description && (
              <p className="mt-5 max-w-xl text-sm opacity-85">{cat.description}</p>
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
                  <Link to="/product/$id" params={{ id: p.id }} className="block">
                    <div
                      className={`relative ${aspect} overflow-hidden bg-muted shadow-soft rounded-sm`}
                    >
                      <motion.img
                        src={resolveImage(p.image_url)}
                        alt={lang === "ar" && p.name_ar ? p.name_ar : p.name}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover"
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-noir/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      {p.stock <= 0 && (
                        <div className="absolute top-3 left-3 bg-noir text-cream px-3 py-1 text-[10px] uppercase tracking-luxe">
                          {t("catpage.soldOut")}
                        </div>
                      )}
                      {p.stock > 0 && p.stock <= 3 && (
                        <div className="absolute top-3 left-3 bg-accent text-background px-3 py-1 text-[10px] uppercase tracking-luxe">
                          {t("catpage.onlyLeft", { n: p.stock })}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4 px-1">
                      <div className="min-w-0">
                        <div className="font-display text-xl md:text-2xl leading-tight truncate group-hover:text-accent transition-colors">
                          {lang === "ar" && p.name_ar ? p.name_ar : p.name}
                        </div>
                        <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-1">
                          {t(`cat.${p.category}`)}
                        </div>
                      </div>
                      <div className="text-sm tabular-nums">${Number(p.price).toFixed(0)}</div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <Footer />
    </div>
  );
}
