import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { subscribeBackInStock } from "@/lib/product-experience.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Bell } from "lucide-react";

interface Props {
  productId: string;
  colorId?: string | null;
  sizeId?: string | null;
}

export function BackInStockNotify({ productId, colorId = null, sizeId = null }: Props) {
  const { t } = useI18n();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const subscribe = useServerFn(subscribeBackInStock);

  // Logged-in customers only — uses the account email automatically.
  if (!user) {
    return (
      <Link
        to="/login"
        search={{ redirect: typeof window !== "undefined" ? window.location.pathname : "/" }}
        className="w-full inline-flex items-center justify-center gap-2 border border-noir px-5 py-3 text-xs uppercase tracking-luxe hover:bg-noir hover:text-cream transition-colors"
      >
        <Bell className="w-3.5 h-3.5" />
        {t("prod.bis.signInToNotify") || "Sign in to get notified"}
      </Link>
    );
  }

  const submit = async () => {
    setBusy(true);
    try {
      await subscribe({ data: { productId, colorId, sizeId } });
      setDone(true);
      toast.success(t("prod.bis.success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={submit}
      disabled={busy || done}
      className="w-full inline-flex items-center justify-center gap-2 border border-noir px-5 py-3 text-xs uppercase tracking-luxe hover:bg-noir hover:text-cream transition-colors disabled:opacity-60"
    >
      <Bell className="w-3.5 h-3.5" />
      {done
        ? t("prod.bis.success")
        : busy
          ? "…"
          : `${t("prod.bis.notifyMe")} · ${user.email ?? ""}`}
    </button>
  );
}
