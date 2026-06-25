import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function CartLoading({ label }: { label?: string }) {
  const { t } = useI18n();
  const text = label ?? t("cart.loading");
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-6xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">{t("cart.eyebrow")}</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">{t("cart.title")}</h1>
        <div className="mt-12 grid lg:grid-cols-[1.5fr_1fr] gap-12">
          <div className="space-y-6">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-5 border-b border-border pb-6">
                <Skeleton className="w-28 h-36" />
                <div className="flex-1 space-y-3 py-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-8 w-32 mt-6" />
                </div>
              </div>
            ))}
          </div>
          <div className="glass p-8 h-fit rounded-sm space-y-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full mt-4" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="mt-10 flex items-center justify-center gap-3 text-xs uppercase tracking-luxe text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          {text}
        </div>
      </div>
      <Footer />
    </div>
  );
}
