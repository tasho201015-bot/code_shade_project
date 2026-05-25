import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import heroBg from "@/assets/product-7.webp";

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => ({ redirect: (s.redirect as string) || "/" }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp } = useAuth();
  const nav = useNavigate();
  const search = useSearch({ from: "/login" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password, name);
    setLoading(false);
    if (res.error) setErr(res.error);
    else nav({ to: search.redirect || "/" });
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
        <div className="absolute bottom-12 left-12 right-12 text-cream">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.9 }}
          >
            <div className="text-xs tracking-luxe uppercase text-accent mb-3">Maison Malaz</div>
            <h2 className="font-display text-5xl xl:text-6xl leading-[1.05] text-balance">
              Where modesty<br /><em className="font-light">becomes couture.</em>
            </h2>
          </motion.div>
        </div>
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
            {mode === "signin" ? "Welcome back" : "Create an account"}
          </p>

          <form onSubmit={onSubmit} className="mt-10 space-y-5">
            {mode === "signup" && (
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Full name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none transition-colors"
                />
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Email</label>
              <input
                type="email" required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"} required minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full bg-transparent border-b border-border focus:border-accent py-2 pr-8 outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 mt-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {mode === "signin" && (
                <div className="mt-2 text-right">
                  <Link
                    to="/forgot-password"
                    onClick={() => console.log("[login] forgot password clicked")}
                    className="text-[10px] uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
              )}
            </div>

            {err && <div className="text-xs text-destructive">{err}</div>}

            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full bg-noir text-cream py-4 text-xs uppercase tracking-luxe disabled:opacity-60"
            >
              {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="w-full text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
            >
              {mode === "signin" ? "New here? — Create an account" : "Have an account? — Sign in"}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
