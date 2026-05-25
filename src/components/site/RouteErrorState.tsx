import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Link, useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

interface Props {
  error: Error;
  reset: () => void;
  title?: string;
}

export function RouteErrorState({ error, reset, title = "Something went wrong" }: Props) {
  const router = useRouter();

  useEffect(() => {
    console.error("[route-error]", error);
  }, [error]);

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-2xl mx-auto px-6 text-center">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Error</div>
        <h1 className="font-display text-4xl md:text-5xl mt-3">{title}</h1>
        <p className="mt-4 text-muted-foreground text-sm">
          {error?.message || "An unexpected error occurred while loading this page."}
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="px-6 py-3 text-xs uppercase tracking-luxe bg-noir text-cream"
          >
            Try again
          </button>
          <Link
            to="/"
            className="px-6 py-3 text-xs uppercase tracking-luxe border border-border hover:border-accent transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}