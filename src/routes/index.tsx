import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal, Stagger, itemVariants } from "@/components/site/Reveal";
import { DrawIcon } from "@/components/site/DrawIcon";
import { useI18n } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import heroLg from "@/assets/hero-desktop.jpg";
import heroMd from "@/assets/hero-md.jpg";
import heroSm from "@/assets/hero-sm.jpg";
import look2 from "@/assets/product-6.webp";
import look3 from "@/assets/product-3.webp";
import look4 from "@/assets/product-4.webp";

export const Route = createFileRoute("/")({
  head: () => ({
    links: [
      { rel: "preload", as: "image", href: heroLg, fetchpriority: "high" },
    ],
  }),
  component: HomePage,
});

interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
}

// Module-level cache so navigating away/back doesn't refetch within the session.
let productsCache: Product[] | null = null;
let productsPromise: Promise<Product[]> | null = null;
const CACHE_TTL_MS = 60_000;
let cacheTime = 0;

function loadHomepageProducts(): Promise<Product[]> {
  const now = Date.now();
  if (productsCache && now - cacheTime < CACHE_TTL_MS) {
    return Promise.resolve(productsCache);
  }
  if (productsPromise) return productsPromise;
  const p = supabase
    .from("products")
    .select("id,name,name_ar,price,image_url,category")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(8)
    .then(({ data }: { data: Product[] | null }) => {
      productsCache = (data ?? []) as Product[];
      cacheTime = Date.now();
      productsPromise = null;
      return productsCache!;
    });
  productsPromise = p as Promise<Product[]>;
  return productsPromise;
}

const collections = [
  { nameKey: "col.abayas", href: "abayas", img: look2 },
  { nameKey: "col.dresses", href: "dresses", img: look3 },
  { nameKey: "col.blouses", href: "blouses", img: look4 },
  { nameKey: "col.new", href: "new-arrivals", img: heroLg },
];

const testimonials = [
  { quoteKey: "test.1.quote", nameKey: "test.1.name", roleKey: "test.1.role" },
  { quoteKey: "test.2.quote", nameKey: "test.2.name", roleKey: "test.2.role" },
  { quoteKey: "test.3.quote", nameKey: "test.3.name", roleKey: "test.3.role" },
];

function HomePage() {
  const { t, lang } = useI18n();
  const [products, setProducts] = useState<Product[]>(() => productsCache ?? []);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 140]);
  const heroScale = useTransform(scrollY, [0, 600], [1, 1.12]);
  const heroOpacity = useTransform(scrollY, [0, 500], [1, 0.3]);

  useEffect(() => {
    let mounted = true;
    loadHomepageProducts().then((data) => {
      if (mounted) setProducts(data);
    });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="bg-background text-foreground">
      <Header />

      {/* HERO */}
      <section className="relative h-screen overflow-hidden">
        <motion.div style={{ y: heroY, scale: heroScale, opacity: heroOpacity }} className="absolute inset-0">
          <img
            src={heroLg}
            srcSet={`${heroSm} 768w, ${heroMd} 1280w, ${heroLg} 1920w`}
            sizes="100vw"
            alt="Malaz signature abaya"
            fetchPriority="high"
            decoding="async"
            width={1920}
            height={1080}
            onLoad={() => setHeroLoaded(true)}
            style={{
              opacity: heroLoaded ? 1 : 0,
              transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
            className="w-full h-full object-cover object-center select-none"
            draggable={false}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-noir/30 via-noir/10 to-noir/70" />
        </motion.div>

        <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-10 flex flex-col justify-end pb-24">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-cream max-w-2xl"
          >
            <div className="text-[10px] tracking-luxe uppercase text-accent mb-4">{t("hero.eyebrow")}</div>
            <h1 className="font-display text-6xl md:text-8xl leading-[0.95] text-balance">
              {t("hero.title1")}<br /><em className="font-light">{t("hero.title2")}</em>
            </h1>
            <p className="mt-6 text-cream/80 max-w-md text-lg leading-relaxed">
              {t("hero.subtitle")}
            </p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 1 }}
              className="mt-10 flex gap-4"
            >
              <Link to="/shop" search={{ category: "all" }} className="btn-glow inline-flex items-center bg-cream text-noir px-8 py-4 text-xs uppercase tracking-luxe">
                {t("hero.shopCta")}
              </Link>
              <Link to="/shop" search={{ category: "new-arrivals" } as never} className="inline-flex items-center text-cream px-8 py-4 text-xs uppercase tracking-luxe link-underline">
                {t("hero.newCta")}
              </Link>
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream/70 text-[10px] tracking-luxe uppercase"
        >
          {t("hero.scroll")}
        </motion.div>
      </section>

      {/* INTRO */}
      <section className="py-24 lg:py-32 max-w-5xl mx-auto px-6 lg:px-10 text-center">
        <Reveal>
          <div className="text-[10px] tracking-luxe uppercase text-accent">{t("intro.eyebrow")}</div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2
            className="font-display text-4xl md:text-6xl mt-4 leading-tight text-balance"
            dangerouslySetInnerHTML={{ __html: t("intro.title") }}
          />
        </Reveal>
        <Reveal delay={0.2}>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t("intro.desc")}
          </p>
        </Reveal>
      </section>

      {/* COLLECTIONS */}
      <section className="py-20 lg:py-28 bg-secondary/40">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="text-[10px] tracking-luxe uppercase text-accent">{t("col.eyebrow")}</div>
                <h2 className="font-display text-4xl md:text-5xl mt-2">{t("col.title")}</h2>
              </div>
              <Link to="/shop" search={{ category: "all" }} className="hidden sm:inline-block text-xs uppercase tracking-luxe link-underline">
                {t("col.viewAll")}
              </Link>
            </div>
          </Reveal>

          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {collections.map((c) => (
              <motion.div key={c.href} variants={itemVariants}>
                <Link
                  to="/shop"
                  search={{ category: c.href } as never}
                  className="group block image-zoom relative aspect-[3/4] bg-muted shadow-soft"
                >
                  <img
                    src={c.img}
                    alt={t(c.nameKey)}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-noir/70 via-transparent to-transparent" />
                  <div className="absolute bottom-5 left-5 right-5 text-cream">
                    <div className="font-display text-2xl">{t(c.nameKey)}</div>
                    <div className="text-[10px] tracking-luxe uppercase mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      {t("col.shopNow")} →
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 lg:py-32 max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-luxe uppercase text-accent">{t("feat.eyebrow")}</div>
            <h2 className="font-display text-4xl md:text-5xl mt-2">{t("feat.title")}</h2>
          </div>
        </Reveal>
        <Stagger className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-4">
          {features.map((f) => (
            <motion.div
              key={f.titleKey}
              variants={itemVariants}
              whileHover={{ y: -6 }}
              transition={{ duration: 0.4 }}
              className="group glass rounded-sm p-8 text-center cursor-default"
            >
              <div className="text-accent inline-flex">
                <DrawIcon size={44}>{f.svg}</DrawIcon>
              </div>
              <h3 className="font-display text-xl mt-5">{t(f.titleKey)}</h3>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{t(f.descKey)}</p>
            </motion.div>
          ))}
        </Stagger>
      </section>

      {/* PRODUCTS */}
      <section className="py-20 lg:py-28 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <Reveal>
            <div className="flex items-end justify-between mb-12">
              <div>
                <div className="text-[10px] tracking-luxe uppercase text-accent">{t("prod.eyebrow")}</div>
                <h2 className="font-display text-4xl md:text-5xl mt-2">{t("prod.title")}</h2>
              </div>
              <Link to="/shop" search={{ category: "all" }} className="text-xs uppercase tracking-luxe link-underline">{t("col.viewAll")}</Link>
            </div>
          </Reveal>
          <Stagger className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8">
            {products.map((p) => (
              <motion.div key={p.id} variants={itemVariants}>
                <Link to="/product/$id" params={{ id: p.id }} className="block group">
                  <div className="image-zoom aspect-[3/4] bg-muted shadow-soft">
                    <img
                      src={resolveImage(p.image_url)}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="font-display text-lg leading-tight">{p.name}</div>
                      <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-1">{p.category}</div>
                    </div>
                    <div className="text-sm tabular-nums">${Number(p.price).toFixed(0)}</div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 lg:py-32 max-w-7xl mx-auto px-6 lg:px-10">
        <Reveal>
          <div className="text-center mb-16">
            <div className="text-[10px] tracking-luxe uppercase text-accent">{t("test.eyebrow")}</div>
            <h2 className="font-display text-4xl md:text-5xl mt-2">{t("test.title")}</h2>
          </div>
        </Reveal>
        <Stagger className="grid md:grid-cols-3 gap-6">
          {testimonials.map((tm) => (
            <motion.figure
              key={tm.nameKey}
              variants={itemVariants}
              className="glass p-8 rounded-sm"
            >
              <div className="text-accent font-display text-4xl leading-none">"</div>
              <blockquote className="mt-3 font-display text-xl leading-snug text-balance">{t(tm.quoteKey)}</blockquote>
              <figcaption className="mt-6 text-[10px] uppercase tracking-luxe text-muted-foreground">
                {t(tm.nameKey)} — {t(tm.roleKey)}
              </figcaption>
            </motion.figure>
          ))}
        </Stagger>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="relative h-[70vh] min-h-[480px]">
          <motion.img
            initial={{ scale: 1.1 }} whileInView={{ scale: 1 }}
            viewport={{ once: true }} transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }}
            src={look4} alt="" loading="lazy" decoding="async"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-noir/80 via-noir/40 to-noir/20" />
          <div className="relative z-10 h-full max-w-7xl mx-auto px-6 lg:px-10 flex flex-col justify-center text-cream">
            <Reveal>
              <div className="text-[10px] tracking-luxe uppercase text-accent">{t("cta.eyebrow")}</div>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="font-display text-5xl md:text-7xl mt-3 leading-[1] max-w-2xl text-balance">
                {t("cta.title1")}<br /><em className="font-light">{t("cta.title2")}</em>
              </h2>
            </Reveal>
            <Reveal delay={0.25}>
              <Link to="/shop" search={{ category: "all" }} className="btn-glow mt-10 self-start inline-flex bg-cream text-noir px-10 py-4 text-xs uppercase tracking-luxe">
                {t("cta.shopNow")}
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const features = [
  {
    titleKey: "feat.fab.title", descKey: "feat.fab.desc",
    svg: (<>
      <path d="M8 10 L24 6 L40 10 L40 38 L24 42 L8 38 Z" />
      <path d="M8 10 L24 14 L40 10" />
      <path d="M24 14 L24 42" />
      <path d="M16 18 L16 36" />
      <path d="M32 18 L32 36" />
    </>),
  },
  {
    titleKey: "feat.des.title", descKey: "feat.des.desc",
    svg: (<>
      <circle cx="24" cy="14" r="6" />
      <path d="M14 44 C14 32 18 26 24 26 C30 26 34 32 34 44" />
      <path d="M10 44 L38 44" />
    </>),
  },
  {
    titleKey: "feat.del.title", descKey: "feat.del.desc",
    svg: (<>
      <rect x="6" y="16" width="22" height="18" />
      <path d="M28 22 L36 22 L42 28 L42 34 L28 34 Z" />
      <circle cx="14" cy="38" r="3" />
      <circle cx="34" cy="38" r="3" />
    </>),
  },
  {
    titleKey: "feat.sec.title", descKey: "feat.sec.desc",
    svg: (<>
      <path d="M24 6 L38 12 L38 24 C38 34 32 40 24 42 C16 40 10 34 10 24 L10 12 Z" />
      <path d="M18 24 L22 28 L30 18" />
    </>),
  },
  {
    titleKey: "feat.new.title", descKey: "feat.new.desc",
    svg: (<>
      <path d="M24 6 L28 18 L40 18 L30 26 L34 38 L24 30 L14 38 L18 26 L8 18 L20 18 Z" />
    </>),
  },
];
