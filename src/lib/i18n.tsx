import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "en" | "ar";

type Dict = Record<string, string>;

const en: Dict = {
  // nav
  "nav.home": "Home",
  "nav.shop": "Shop",
  "nav.abayas": "Abayas",
  "nav.new": "New",
  "nav.admin": "Admin",
  "nav.account": "Account",
  "nav.cart": "Cart",
  "nav.signout": "Sign out",
  "nav.lang": "AR",
  // hero
  "hero.eyebrow": "Spring Collection 2026",
  "hero.title1": "Modesty,",
  "hero.title2": "redefined.",
  "hero.subtitle": "A new chapter of modern modest fashion — where silhouette, fabric and grace become one.",
  "hero.shopCta": "Shop the collection",
  "hero.newCta": "New arrivals",
  "hero.scroll": "Scroll",
  // intro
  "intro.eyebrow": "Maison Malaz",
  "intro.title": "For the woman who wears <em>grace</em> like a second skin.",
  "intro.desc": "Malaz crafts a contemporary modest wardrobe in premium textiles — designed in clean, feminine silhouettes, made to be lived in.",
  // collections
  "col.eyebrow": "Collections",
  "col.title": "Curated edits",
  "col.viewAll": "View all",
  "col.abayas": "Abayas",
  "col.dresses": "Dresses",
  "col.blouses": "Blouses",
  "col.new": "New Arrivals",
  "col.shopNow": "Shop now",
  // features
  "feat.eyebrow": "The Malaz Promise",
  "feat.title": "An experience worth the wear",
  "feat.fab.title": "Premium Fabrics",
  "feat.fab.desc": "Hand-selected textiles that drape with effortless grace.",
  "feat.des.title": "Elegant Designs",
  "feat.des.desc": "Silhouettes that whisper rather than shout.",
  "feat.del.title": "Fast Delivery",
  "feat.del.desc": "Worldwide shipping in days, not weeks.",
  "feat.sec.title": "Secure Shopping",
  "feat.sec.desc": "Encrypted checkout and protected accounts.",
  "feat.new.title": "New Arrivals",
  "feat.new.desc": "Fresh drops curated weekly.",
  // products
  "prod.eyebrow": "Boutique",
  "prod.title": "Latest pieces",
  // testimonials
  "test.eyebrow": "Voices",
  "test.title": "Words from our women",
  // CTA
  "cta.eyebrow": "Start your story",
  "cta.title1": "Discover your",
  "cta.title2": "perfect abaya.",
  "cta.shopNow": "Shop now",
  // footer
  "foot.tagline": "Modern modest fashion crafted for women who wear elegance with confidence.",
  "foot.shop": "Shop",
  "foot.house": "House",
  "foot.care": "Care",
  "foot.story": "Our Story",
  "foot.sustain": "Sustainability",
  "foot.journal": "Journal",
  "foot.press": "Press",
  "foot.contact": "Contact",
  "foot.shipping": "Shipping",
  "foot.returns": "Returns",
  "foot.copyright": "Malaz — Modest Luxury",
};

const ar: Dict = {
  "nav.home": "الرئيسية",
  "nav.shop": "المتجر",
  "nav.abayas": "العبايات",
  "nav.new": "جديد",
  "nav.admin": "الإدارة",
  "nav.account": "الحساب",
  "nav.cart": "السلة",
  "nav.signout": "تسجيل الخروج",
  "nav.lang": "EN",
  "hero.eyebrow": "تشكيلة ربيع 2026",
  "hero.title1": "الحشمة،",
  "hero.title2": "بحُلّة جديدة.",
  "hero.subtitle": "فصل جديد من الأزياء المحتشمة العصرية — حيث يلتقي القَدّ والقماش والأناقة في انسجام واحد.",
  "hero.shopCta": "تسوّقي التشكيلة",
  "hero.newCta": "الوافدات الجديدة",
  "hero.scroll": "اسحبي",
  "intro.eyebrow": "دار ملاذ",
  "intro.title": "للمرأة التي ترتدي <em>الأناقة</em> كأنها بشرتها الثانية.",
  "intro.desc": "تصمّم ملاذ خزانة محتشمة معاصرة من أرقى الأقمشة — بقصّات نظيفة وأنثوية، صُنعت لتُعاش.",
  "col.eyebrow": "المجموعات",
  "col.title": "اختيارات منتقاة",
  "col.viewAll": "عرض الكل",
  "col.abayas": "عبايات",
  "col.dresses": "فساتين",
  "col.blouses": "بلوزات",
  "col.new": "وافدات جديدة",
  "col.shopNow": "تسوّقي الآن",
  "feat.eyebrow": "وعد ملاذ",
  "feat.title": "تجربة تستحق الارتداء",
  "feat.fab.title": "أقمشة فاخرة",
  "feat.fab.desc": "أقمشة منتقاة بعناية تنساب برقّة وأناقة.",
  "feat.des.title": "تصاميم راقية",
  "feat.des.desc": "قصّات تهمس بالأناقة دون صخب.",
  "feat.del.title": "توصيل سريع",
  "feat.del.desc": "شحن عالمي خلال أيام، لا أسابيع.",
  "feat.sec.title": "تسوّق آمن",
  "feat.sec.desc": "دفع مشفّر وحسابات محمية.",
  "feat.new.title": "وافدات جديدة",
  "feat.new.desc": "إصدارات أسبوعية منتقاة بعناية.",
  "prod.eyebrow": "البوتيك",
  "prod.title": "أحدث القطع",
  "test.eyebrow": "أصوات",
  "test.title": "كلمات من نسائنا",
  "cta.eyebrow": "ابدئي قصتك",
  "cta.title1": "اكتشفي",
  "cta.title2": "عباءتكِ المثالية.",
  "cta.shopNow": "تسوّقي الآن",
  "foot.tagline": "أزياء محتشمة عصرية صُنعت للمرأة التي ترتدي الأناقة بثقة.",
  "foot.shop": "المتجر",
  "foot.house": "الدار",
  "foot.care": "الرعاية",
  "foot.story": "قصتنا",
  "foot.sustain": "الاستدامة",
  "foot.journal": "المجلة",
  "foot.press": "الصحافة",
  "foot.contact": "تواصل",
  "foot.shipping": "الشحن",
  "foot.returns": "الإرجاع",
  "foot.copyright": "ملاذ — فخامة محتشمة",
};

const dictionaries: Record<Lang, Dict> = { en, ar };

interface I18nCtx {
  lang: Lang;
  dir: "ltr" | "rtl";
  t: (key: string) => string;
  toggle: () => void;
  setLang: (l: Lang) => void;
}

const Ctx = createContext<I18nCtx | undefined>(undefined);

const STORAGE_KEY = "malaz.lang";

function getInitialLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v === "ar" || v === "en") return v;
  } catch {}
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage after mount to avoid SSR mismatch
  useEffect(() => {
    const initial = getInitialLang();
    setLangState(initial);
  }, []);

  const dir: "ltr" | "rtl" = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try { window.localStorage.setItem(STORAGE_KEY, lang); } catch {}
  }, [lang, dir]);

  const t = (key: string) => dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState((p) => (p === "en" ? "ar" : "en"));

  return (
    <Ctx.Provider value={{ lang, dir, t, toggle, setLang }}>
      <div
        key={lang}
        dir={dir}
        className="animate-fade-in"
        style={{ transition: "opacity 300ms ease" }}
      >
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
