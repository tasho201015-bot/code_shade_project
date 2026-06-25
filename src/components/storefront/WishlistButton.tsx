import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useWishlist } from "@/lib/wishlist";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";

interface Props {
  productId: string;
  variant?: "icon" | "full";
  className?: string;
  stopPropagation?: boolean;
}

export function WishlistButton({ productId, variant = "icon", className = "", stopPropagation = true }: Props) {
  const { has, toggle } = useWishlist();
  const { user } = useAuth();
  const { t } = useI18n();
  const nav = useNavigate();
  const active = has(productId);

  const onClick = async (e: React.MouseEvent) => {
    if (stopPropagation) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user) {
      toast.error(t("wishlist.signinRequired"));
      nav({ to: "/login", search: { redirect: typeof window !== "undefined" ? window.location.pathname : "/" } as never });
      return;
    }
    const res = await toggle(productId);
    if (!res.ok) {
      toast.error(t("wishlist.error"));
      return;
    }
    toast.success(res.added ? t("wishlist.added") : t("wishlist.removed"));
  };

  if (variant === "full") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? t("wishlist.remove") : t("wishlist.add")}
        className={`inline-flex items-center justify-center gap-2 w-full px-5 py-3 text-xs uppercase tracking-luxe border transition-colors ${
          active
            ? "border-accent text-accent bg-accent/5"
            : "border-border hover:border-accent hover:text-accent"
        } ${className}`}
      >
        <Heart className={`w-4 h-4 ${active ? "fill-accent" : ""}`} />
        <span>{active ? t("wishlist.remove") : t("wishlist.add")}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? t("wishlist.remove") : t("wishlist.add")}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white hover:text-accent hover:border-accent transition-colors ${className}`}
    >
      <Heart className={`w-4 h-4 ${active ? "fill-accent text-accent" : ""}`} />
    </button>
  );
}
