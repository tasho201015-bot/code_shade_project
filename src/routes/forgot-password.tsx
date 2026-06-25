import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import heroBg from "@/assets/product-7.webp";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    setLoading(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="relative hidden lg:block overflow-hidden">
        <motion.img
          src={heroBg}
          alt=""
          initial={{ scale: 1.15, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-noir/70 via-noir/30 to-transparent" />
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="w-full max-w-sm"
        >
          <div className="font-display text-3xl tracking-luxe uppercase text-center">
            Mala<span className="italic font-light">z</span>
          </div>
          <p className="mt-2 text-center text-xs uppercase tracking-luxe text-muted-foreground">
            {t("auth.resetTitle")}
          </p>

          {sent ? (
            <div className="mt-10 space-y-5 text-center">
              <p className="text-sm text-foreground">
                {t("auth.sentTo", { email })}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("auth.checkInbox")}
              </p>
              <Link
                to="/login"
                search={{ redirect: "/" }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> {t("auth.backToSignin")}
              </Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none transition-colors"
                />
              </div>

              {err && <div className="text-xs text-destructive">{err}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-glow w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
              >
                {loading ? t("auth.sending") : t("auth.sendReset")}
              </button>

              <Link
                to="/login"
                search={{ redirect: "/" }}
                className="flex items-center justify-center gap-2 text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-3 h-3" /> {t("auth.backToSignin")}
              </Link>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
