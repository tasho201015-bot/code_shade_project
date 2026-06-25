import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import heroBg from "@/assets/product-7.webp";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});


function ResetPasswordPage() {
  const { t } = useI18n();
  const nav = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        setReady(true);
        setChecking(false);
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

        // 1) Error returned in URL hash (e.g. otp_expired, access_denied)
        const hashError = hash.get("error") || hash.get("error_code");
        if (hashError) {
          const desc = hash.get("error_description") || hashError;
          setLinkError(decodeURIComponent(desc.replace(/\+/g, " ")));
          setChecking(false);
          return;
        }

        // 2) PKCE flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setLinkError(error.message);
          } else if (data.session) {
            setReady(true);
          }
          // clean URL
          window.history.replaceState({}, "", url.pathname);
          setChecking(false);
          return;
        }

        // 3) Implicit flow: tokens in hash
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        const type = hash.get("type");
        if (access_token && refresh_token) {
          const { data, error } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });
          if (error) setLinkError(error.message);
          else if (data.session && (type === "recovery" || type === null)) {
            setReady(true);
          }
          window.history.replaceState({}, "", url.pathname);
          setChecking(false);
          return;
        }

        // 4) Already signed in via recovery (e.g. detectSessionInUrl handled it)
        const { data: sess } = await supabase.auth.getSession();
        if (sess.session) setReady(true);
        setChecking(false);
      } catch (e: any) {
        setLinkError(e?.message || "Could not process the reset link.");
        setChecking(false);
      }
    })();

    return () => sub.subscription.unsubscribe();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 6) return setErr(t("auth.pwdShort"));
    if (password !== confirm) return setErr(t("auth.pwdMismatch"));

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setErr(error.message);
    setDone(true);
    setTimeout(() => nav({ to: "/login", search: { redirect: "/" } }), 1500);
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
            {t("auth.newPwdTitle")}
          </p>

          {checking ? (
            <p className="mt-10 text-center text-sm text-muted-foreground animate-pulse">
              {t("auth.verifying")}
            </p>
          ) : linkError ? (
            <div className="mt-10 space-y-5 text-center">
              <p className="text-sm text-destructive">
                {t("auth.linkInvalid")}
              </p>
              <p className="text-xs text-muted-foreground">{linkError}</p>
              <Link
                to="/forgot-password"
                className="inline-block btn-glow bg-noir text-cream px-6 py-3 text-xs uppercase tracking-luxe"
              >
                {t("auth.requestNew")}
              </Link>
            </div>
          ) : !ready ? (
            <div className="mt-10 space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                {t("auth.openLink")}
              </p>
              <Link
                to="/forgot-password"
                className="inline-block text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("auth.requestNew")}
              </Link>
            </div>
          ) : done ? (
            <p className="mt-10 text-center text-sm text-foreground">
              {t("auth.pwdUpdated")}
            </p>

          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                  {t("auth.newPwd")}
                </label>

                <div className="relative">
                  <input
                    type={show ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 pr-8 outline-none transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 mt-1 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={show ? t("auth.hidePwd") : t("auth.showPwd")}
                  >
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                  {t("auth.confirmPwd")}
                </label>

                <input
                  type={show ? "text" : "password"}
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none transition-colors"
                />
              </div>

              {err && <div className="text-xs text-destructive">{err}</div>}

              <button
                type="submit"
                disabled={loading}
                className="btn-glow w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
              >
                {loading ? t("auth.updating") : t("auth.updatePwd")}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
