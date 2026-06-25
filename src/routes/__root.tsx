import { Outlet, Link, createRootRoute, HeadContent, Scripts, useLocation, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import appCss from "../styles.css?url";
import { AuthProvider, useAuth } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { WishlistProvider } from "@/lib/wishlist";
import { I18nProvider } from "@/lib/i18n";
import { BackButton } from "@/components/site/BackButton";
import { BeamsBackgroundOrange } from "@/components/ui/beams-background-orange";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-foreground">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-xs uppercase tracking-luxe text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function RootErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("[root-error]", error);
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Error</div>
        <h1 className="font-display text-5xl mt-3 text-foreground">Something went wrong</h1>
        <p className="mt-3 text-sm text-muted-foreground break-words">
          {error?.message || "An unexpected error occurred."}
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={() => {
              try { reset(); } catch (e) { console.error("[root-error] reset failed", e); }
              if (typeof window !== "undefined") window.location.reload();
            }}
            className="px-6 py-3 text-xs uppercase tracking-luxe bg-noir text-cream"
          >
            Try again
          </button>
          <a
            href="/"
            className="px-6 py-3 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Malaz — Modern Modest Luxury" },
      { name: "description", content: "Malaz: elegant modest fashion. Discover abayas, dresses, blouses and modern modest essentials crafted in premium fabrics." },
      { name: "author", content: "Malaz" },
      { property: "og:title", content: "Malaz — Modern Modest Luxury" },
      { property: "og:description", content: "Malaz: elegant modest fashion. Discover abayas, dresses, blouses and modern modest essentials crafted in premium fabrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Malaz — Modern Modest Luxury" },
      { name: "twitter:description", content: "Malaz: elegant modest fashion. Discover abayas, dresses, blouses and modern modest essentials crafted in premium fabrics." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Oevvt6HiM0Ww3JMFGnieZ8oeEEm1/social-images/social-1776526059596-WhatsApp_Image_2026-04-05_at_12.22.03_AM.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Oevvt6HiM0Ww3JMFGnieZ8oeEEm1/social-images/social-1776526059596-WhatsApp_Image_2026-04-05_at_12.22.03_AM.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: RootErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <I18nProvider>
          <CartProvider>{children}</CartProvider>
        </I18nProvider>
        <Scripts />
      </body>
    </html>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const router = useRouter();

  // Public routes
  const publicPaths = ["/login", "/forgot-password", "/reset-password"];
  const isPublic = publicPaths.includes(location.pathname);
  // Routes that should NEVER auto-redirect signed-in users away
  // (recovery links create a temporary session, but the user must stay
  // on /reset-password to set a new password).
  const noAuthRedirectPaths = ["/reset-password"];
  const skipAuthedRedirect = noAuthRedirectPaths.includes(location.pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublic) {
      router.navigate({ to: "/login", search: { redirect: location.pathname } as never });
    } else if (user && isPublic && !skipAuthedRedirect) {
      router.navigate({ to: "/" });
    }
  }, [user, loading, isPublic, skipAuthedRedirect, location.pathname, router]);

  useEffect(() => {
    console.log("[route] navigated to", location.pathname);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="font-display text-2xl tracking-luxe text-muted-foreground animate-pulse">M A L A Z</div>
      </div>
    );
  }

  const isAdminRoute = location.pathname.startsWith("/admin");
  const isLoginRoute = location.pathname === "/login";

  return (
    <>
      {/* Global animated beams backdrop (fixed canvas, pointer-events-none).
          Hidden on admin routes and the login page to keep those backgrounds clean. */}
      {!isAdminRoute && !isLoginRoute && (
        <>
          <div aria-hidden className="fixed inset-0 -z-50 bg-neutral-950 pointer-events-none" />
          <BeamsBackgroundOrange />
        </>
      )}
      <BackButton />
      <Outlet />
    </>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <AuthGate />
      </WishlistProvider>
    </AuthProvider>
  );
}
