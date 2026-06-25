import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import { ArrowUpRight } from "lucide-react";
import { useLoc } from "@/lib/localize";

export const Route = createFileRoute("/categories/")({
  component: CategoriesIndex,
  head: () => ({
    meta: [
      { title: "Collections — Malaz" },
      {
        name: "description",
        content:
          "Browse the Malaz universe — curated collections of modest fashion, draped in cinematic detail.",
      },
    ],
  }),
});

interface Cat {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string;
  description: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number;
}

interface CatWithCover extends Cat {
  cover?: string | null;
  count: number;
}

function CategoriesIndex() {
  const [cats, setCats] = useState<CatWithCover[]>([]);
  const tl = useLoc();

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: c } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (!alive || !c) return;

      // pull a cover image + product count per category
      const enriched = await Promise.all(
        (c as Cat[])
          .filter((cat) => cat.slug !== "uncategorized")
          .map(async (cat) => {
            const [{ data: prods }, { count }] = await Promise.all([
              supabase
                .from("products")
                .select("image_url")
                .eq("is_active", true)
                .eq("category", cat.slug)
                .not("image_url", "is", null)
                .limit(1),
              supabase
                .from("products")
                .select("id", { count: "exact", head: true })
                .eq("is_active", true)
                .eq("category", cat.slug),
            ]);
            return {
              ...cat,
              cover: cat.image_url ?? prods?.[0]?.image_url ?? null,
              count: count ?? 0,
            } as CatWithCover;
          }),
      );
      if (alive) setCats(enriched);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="text-[10px] uppercase tracking-luxe text-accent">Universe</div>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl mt-3 leading-[0.95]">
              Step into <em className="italic font-light">the</em>
              <br /> Malaz collections.
            </h1>
            <p className="mt-6 max-w-xl text-muted-foreground">
              Each collection is its own atmosphere — fabric, light, and silhouette in conversation.
              Move through them slowly. Let one of them choose you.
            </p>
          </motion.div>
        </div>

        {/* Asymmetric immersive bento */}
        <div className="mt-16 max-w-[90rem] mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-12 auto-rows-[170px] md:auto-rows-[200px] gap-3 md:gap-5">
            {cats.map((cat, i) => {
              // composition pattern: large, tall, medium, wide rotation
              const span = [
                "col-span-12 md:col-span-7 row-span-2",
                "col-span-12 md:col-span-5 row-span-3",
                "col-span-6 md:col-span-4 row-span-2",
                "col-span-6 md:col-span-3 row-span-2",
                "col-span-12 md:col-span-5 row-span-2",
              ][i % 5];
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  className={`relative group overflow-hidden bg-muted shadow-luxe rounded-sm ${span}`}
                >
                  <Link
                    to="/categories/$slug"
                    params={{ slug: cat.slug }}
                    className="block absolute inset-0"
                  >
                    {cat.cover ? (
                      <motion.img
                        src={resolveImage(cat.cover)}
                        alt={tl(cat, "name")}
                        loading="lazy"
                        className="absolute inset-0 w-full h-full object-cover will-change-transform"
                        whileHover={{ scale: 1.06 }}
                        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-noir/40 to-accent/30" />
                    )}
                    {/* gradient veil */}
                    <div className="absolute inset-0 bg-gradient-to-t from-noir/85 via-noir/30 to-transparent" />
                    {/* floating accent orb */}
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-accent/20 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-end text-cream">
                      <div className="text-[10px] uppercase tracking-luxe opacity-80">
                        {cat.count} {cat.count === 1 ? "piece" : "pieces"}
                      </div>
                      <div className="mt-2 flex items-end justify-between gap-4">
                        <h2 className="font-display text-3xl md:text-5xl leading-none">
                          {tl(cat, "name")}
                        </h2>
                        <motion.div
                          className="shrink-0 w-12 h-12 rounded-full bg-cream/10 backdrop-blur flex items-center justify-center border border-cream/30"
                          whileHover={{ rotate: 45, scale: 1.1 }}
                          transition={{ duration: 0.4 }}
                        >
                          <ArrowUpRight className="w-5 h-5" />
                        </motion.div>
                      </div>
                      {(cat.description || cat.description_ar) && (
                        <p className="mt-2 text-xs opacity-75 max-w-md line-clamp-2">
                          {tl(cat, "description")}
                        </p>
                      )}
                    </div>
                  </Link>
                </motion.div>
              );
            })}
            {cats.length === 0 && (
              <div className="col-span-12 py-32 text-center text-muted-foreground">
                Collections coming soon.
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
