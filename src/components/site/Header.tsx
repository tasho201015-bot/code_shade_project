import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ShoppingBag, User as UserIcon, LogOut, LayoutDashboard, Menu, X, Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);
  const { user, signOut, isAdmin } = useAuth();
  const { count } = useCart();
  const { count: wishCount } = useWishlist();
  const { t } = useI18n();
  const nav = useNavigate();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const { scrollY } = useScroll();
  const bgDynamic = useTransform(scrollY, [0, 80], ["oklch(0.14 0.01 60 / 0.4)", "oklch(0.12 0.01 60 / 0.85)"]);
  const borderDynamic = useTransform(scrollY, [0, 80], ["oklch(0.94 0.025 82 / 0)", "oklch(0.94 0.025 82 / 0.12)"]);
  const bg = isAdminRoute ? "#0a0a0a" : bgDynamic;
  const border = isAdminRoute ? "oklch(0.94 0.025 82 / 0.12)" : borderDynamic;

  // Hide header while inside the hero section on the home page.
  const isHome = location.pathname === "/";
  const [hidden, setHidden] = useState(isHome);
  useEffect(() => {
    if (!isHome) { setHidden(false); return; }
    const onScroll = () => {
      const threshold = window.innerHeight - 120;
      setHidden(window.scrollY < threshold);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/login", search: { redirect: "/" } });
  };

  return (
    <motion.header
      style={{ backgroundColor: bg, borderBottomColor: border }}
      animate={{
        opacity: hidden ? 0 : 1,
        y: hidden ? -24 : 0,
        filter: hidden ? "blur(8px)" : "blur(0px)",
      }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 inset-x-0 z-50 border-b backdrop-blur-xl ${hidden ? "pointer-events-none" : ""}`}
    >
      <div className={`max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between ${isAdminRoute ? "text-cream" : ""}`}>
        <Link to="/" className="font-display text-2xl tracking-luxe uppercase">
          Mala<span className="italic font-light">z</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-10 text-xs uppercase tracking-luxe">
          <Link to="/" className="link-underline">{t("nav.home")}</Link>
          <Link to="/shop" search={{ category: "all" }} className="link-underline">{t("nav.shop")}</Link>
          <Link to="/team" className="link-underline">{t("nav.atelier")}</Link>
          <Link to="/shop" search={{ category: "new-arrivals" } as never} className="link-underline">{t("nav.new")}</Link>
        </nav>


        <div className="flex items-center gap-2">
          <LanguageToggle />
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden lg:inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-luxe link-underline"
            >
              <LayoutDashboard className="w-4 h-4" /> {t("nav.admin")}
            </Link>
          )}
          <Link to="/account" className="p-2 hover:text-accent transition-colors" aria-label={t("nav.account")}>
            <UserIcon className="w-5 h-5" />
          </Link>
          <Link to="/wishlist" className="relative p-2 hover:text-accent transition-colors" aria-label={t("nav.wishlist")}>
            <Heart className="w-5 h-5" />
            {wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-accent text-accent-foreground text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {wishCount}
              </span>
            )}
          </Link>
          <Link to="/cart" className="relative p-2 hover:text-accent transition-colors" aria-label={t("nav.cart")}>
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-noir text-cream text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          {user && (
            <button onClick={handleSignOut} className="hidden lg:inline-flex p-2 hover:text-accent transition-colors" aria-label={t("nav.signout")}>
              <LogOut className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden lg:hidden inline-flex p-2 hover:text-accent transition-colors"
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="hidden md:inline-flex lg:hidden p-2 hover:text-accent transition-colors"
            aria-label={t("nav.menu")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMenuOpen(false)}
              className="lg:hidden fixed inset-0 top-20 bg-noir/30 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden fixed top-20 inset-x-0 z-50 bg-cream border-b border-border shadow-lg"
            >
              <nav className="max-w-7xl mx-auto px-6 py-6 flex flex-col gap-1">
                <Link to="/" className="py-3 text-xs uppercase tracking-luxe border-b border-border/40">{t("nav.home")}</Link>
                <Link to="/shop" search={{ category: "all" }} className="py-3 text-xs uppercase tracking-luxe border-b border-border/40">{t("nav.shop")}</Link>
                <Link to="/team" className="py-3 text-xs uppercase tracking-luxe border-b border-border/40">{t("nav.atelier")}</Link>
                <Link to="/shop" search={{ category: "new-arrivals" } as never} className="py-3 text-xs uppercase tracking-luxe border-b border-border/40">{t("nav.new")}</Link>
                <Link to="/wishlist" className="py-3 text-xs uppercase tracking-luxe border-b border-border/40 flex items-center gap-2"><Heart className="w-4 h-4" /> {t("nav.wishlist")}{wishCount > 0 ? ` (${wishCount})` : ""}</Link>

                {isAdmin && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="text-[10px] uppercase tracking-luxe text-accent mb-2">{t("nav.admin")}</div>
                    <Link to="/admin" className="py-3 text-xs uppercase tracking-luxe flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" /> {t("nav.admin")}
                    </Link>
                  </div>
                )}

                {user && (
                  <button onClick={handleSignOut} className="mt-4 py-3 text-xs uppercase tracking-luxe flex items-center gap-2 text-left">
                    <LogOut className="w-4 h-4" /> {t("nav.signout")}
                  </button>
                )}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
