import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/site/LanguageToggle";
import { ShoppingBag, User as UserIcon, LogOut, LayoutDashboard, Menu, X } from "lucide-react";
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
  const { t } = useI18n();
  const nav = useNavigate();
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 80], ["oklch(0.985 0.005 80 / 0)", "oklch(0.985 0.005 80 / 0.85)"]);
  const border = useTransform(scrollY, [0, 80], ["oklch(0.18 0.01 60 / 0)", "oklch(0.18 0.01 60 / 0.08)"]);

  const handleSignOut = async () => {
    await signOut();
    nav({ to: "/login", search: { redirect: "/" } });
  };

  return (
    <motion.header
      style={{ backgroundColor: bg, borderBottomColor: border }}
      className="fixed top-0 inset-x-0 z-50 border-b backdrop-blur-xl"
    >
      <div className="max-w-7xl mx-auto px-6 lg:px-10 h-20 flex items-center justify-between">
        <Link to="/" className="font-display text-2xl tracking-luxe uppercase">
          Mala<span className="italic font-light">z</span>
        </Link>
        <nav className="hidden md:flex items-center gap-10 text-xs uppercase tracking-luxe">
          <Link to="/" className="link-underline">{t("nav.home")}</Link>
          <Link to="/shop" search={{ category: "all" }} className="link-underline">{t("nav.shop")}</Link>
          <Link to="/categories" className="link-underline">Collections</Link>
          <Link to="/shop" search={{ category: "new-arrivals" } as never} className="link-underline">{t("nav.new")}</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-2 text-xs uppercase tracking-luxe link-underline"
            >
              <LayoutDashboard className="w-4 h-4" /> {t("nav.admin")}
            </Link>
          )}
          <Link to="/account" className="p-2 hover:text-accent transition-colors" aria-label={t("nav.account")}>
            <UserIcon className="w-5 h-5" />
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
            <button onClick={handleSignOut} className="p-2 hover:text-accent transition-colors" aria-label={t("nav.signout")}>
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
