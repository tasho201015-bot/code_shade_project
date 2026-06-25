import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchAllColors,
  fetchAllSizes,
  type ProductColor,
  type ProductSize,
} from "@/lib/product-attributes";
import { useI18n } from "@/lib/i18n";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SlidersHorizontal, X } from "lucide-react";

export interface ShopFilterState {
  colorIds: string[];
  sizeIds: string[];
  minPrice: number | null;
  maxPrice: number | null;
}

export const emptyFilters: ShopFilterState = {
  colorIds: [],
  sizeIds: [],
  minPrice: null,
  maxPrice: null,
};

export function filtersActiveCount(f: ShopFilterState): number {
  return (
    f.colorIds.length +
    f.sizeIds.length +
    (f.minPrice != null ? 1 : 0) +
    (f.maxPrice != null ? 1 : 0)
  );
}

/**
 * Fetch color & size maps for a list of product ids.
 * Only colors/sizes that have at least one AVAILABLE variant are included.
 * Products without any variant-availability rows fall back to their full link sets
 * (legacy products that never had per-variant statuses configured).
 */
export function useProductAttributeMaps(productIds: string[]) {
  const [colorMap, setColorMap] = useState<Record<string, string[]>>({});
  const [sizeMap, setSizeMap] = useState<Record<string, string[]>>({});

  const key = productIds.join(",");
  useEffect(() => {
    let alive = true;
    if (productIds.length === 0) {
      setColorMap({});
      setSizeMap({});
      return;
    }
    (async () => {
      const [{ data: cl }, { data: sl }, { data: va }] = await Promise.all([
        supabase
          .from("product_color_links")
          .select("product_id,color_id")
          .in("product_id", productIds),
        supabase
          .from("product_size_links")
          .select("product_id,size_id")
          .in("product_id", productIds),
        supabase
          .from("product_variant_availability")
          .select("product_id,color_id,size_id,status")
          .in("product_id", productIds),
      ]);
      if (!alive) return;

      // Link maps (full attribute set per product)
      const linkColor: Record<string, Set<string>> = {};
      (cl ?? []).forEach((r: { product_id: string; color_id: string }) => {
        (linkColor[r.product_id] ||= new Set()).add(r.color_id);
      });
      const linkSize: Record<string, Set<string>> = {};
      (sl ?? []).forEach((r: { product_id: string; size_id: string }) => {
        (linkSize[r.product_id] ||= new Set()).add(r.size_id);
      });

      // Availability-derived sets: a color/size only counts if it has ≥1 available variant
      const availColor: Record<string, Set<string>> = {};
      const availSize: Record<string, Set<string>> = {};
      const hasAnyRow: Record<string, boolean> = {};
      (va ?? []).forEach(
        (r: { product_id: string; color_id: string; size_id: string; status: string }) => {
          hasAnyRow[r.product_id] = true;
          if (r.status === "available") {
            (availColor[r.product_id] ||= new Set()).add(r.color_id);
            (availSize[r.product_id] ||= new Set()).add(r.size_id);
          }
        },
      );

      const cMap: Record<string, string[]> = {};
      const sMap: Record<string, string[]> = {};
      for (const pid of productIds) {
        if (hasAnyRow[pid]) {
          cMap[pid] = Array.from(availColor[pid] ?? []);
          sMap[pid] = Array.from(availSize[pid] ?? []);
        } else {
          // Legacy fallback — no per-variant availability configured
          cMap[pid] = Array.from(linkColor[pid] ?? []);
          sMap[pid] = Array.from(linkSize[pid] ?? []);
        }
      }
      setColorMap(cMap);
      setSizeMap(sMap);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { colorMap, sizeMap };
}

interface Props {
  value: ShopFilterState;
  onChange: (next: ShopFilterState) => void;
}

export function ShopFilters({ value, onChange }: Props) {
  const { t, lang } = useI18n();
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.all([fetchAllColors(), fetchAllSizes()]).then(([c, s]) => {
      if (!alive) return;
      setColors(c.filter((x) => x.is_active));
      setSizes(s.filter((x) => x.is_active));
    });
    return () => {
      alive = false;
    };
  }, []);

  const active = filtersActiveCount(value);

  const toggleColor = (id: string) => {
    const set = new Set(value.colorIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ ...value, colorIds: Array.from(set) });
  };
  const toggleSize = (id: string) => {
    const set = new Set(value.sizeIds);
    set.has(id) ? set.delete(id) : set.add(id);
    onChange({ ...value, sizeIds: Array.from(set) });
  };

  const renderBody = (textClass: string, placeholderClass: string) => (
    <div className="space-y-8">
      {/* Color */}
      <section>
        <div className={`text-[10px] uppercase tracking-luxe ${textClass} mb-3`}>
          {t("shop.filters.color")}
        </div>
        <div className="flex flex-wrap gap-2">
          {colors.map((c) => {
            const selected = value.colorIds.includes(c.id);
            const label = lang === "ar" && c.name_ar ? c.name_ar : c.name;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleColor(c.id)}
                aria-pressed={selected}
                title={label}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs transition-colors ${
                  selected
                    ? `border-accent bg-accent/10 ${textClass}`
                    : `border-border hover:border-accent/60 ${textClass}`
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full border border-black/10"
                  style={{ background: c.hex }}
                />
                <span>{label}</span>
              </button>
            );
          })}
          {colors.length === 0 && <div className={`text-xs ${textClass}`}>—</div>}
        </div>
      </section>

      {/* Size */}
      <section>
        <div className={`text-[10px] uppercase tracking-luxe ${textClass} mb-3`}>
          {t("shop.filters.size")}
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((s) => {
            const selected = value.sizeIds.includes(s.id);
            const label = lang === "ar" && s.label_ar ? s.label_ar : s.label;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleSize(s.id)}
                aria-pressed={selected}
                className={`min-w-[44px] px-3 py-1.5 rounded-md border text-xs transition-colors ${
                  selected
                    ? `border-accent bg-accent/10 ${textClass}`
                    : `border-border hover:border-accent/60 ${textClass}`
                }`}
              >
                {label}
              </button>
            );
          })}
          {sizes.length === 0 && <div className={`text-xs ${textClass}`}>—</div>}
        </div>
      </section>

      {/* Price */}
      <section>
        <div className={`text-[10px] uppercase tracking-luxe ${textClass} mb-3`}>
          {t("shop.filters.price")}
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t("shop.filters.min")}
            value={value.minPrice ?? ""}
            min={0}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, minPrice: v === "" ? null : Math.max(0, Number(v)) });
            }}
            className={`h-9 ${textClass} ${placeholderClass}`}
          />
          <span className={textClass}>—</span>
          <Input
            type="number"
            inputMode="numeric"
            placeholder={t("shop.filters.max")}
            value={value.maxPrice ?? ""}
            min={0}
            onChange={(e) => {
              const v = e.target.value;
              onChange({ ...value, maxPrice: v === "" ? null : Math.max(0, Number(v)) });
            }}
            className={`h-9 ${textClass} ${placeholderClass}`}
          />
        </div>
      </section>

      {active > 0 && (
        <Button
          variant="outline"
          size="sm"
          className="w-full bg-gradient-to-r from-amber-200 to-yellow-400 border-yellow-600 text-black hover:from-amber-300 hover:to-yellow-500 hover:border-yellow-700"
          onClick={() => onChange(emptyFilters)}
        >
          <X className="w-4 h-4 mr-1" /> {t("shop.filters.clear")} ({active})
        </Button>
      )}
    </div>
  );

  const body = renderBody("text-black", "placeholder:text-black");

  return (
    <>
      {/* Desktop inline */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-28 self-start">
        <div className="flex items-center justify-between mb-4">
          <div className="font-display text-xl text-white">{t("shop.filters")}</div>
          {active > 0 && (
            <span className="text-[10px] uppercase tracking-luxe text-white">
              {active} {t("shop.filters.active")}
            </span>
          )}
        </div>
        {renderBody("text-white", "placeholder:text-white")}
      </aside>

      {/* Mobile sheet */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-amber-400 text-black border-amber-600 hover:bg-amber-500"
            >
              <SlidersHorizontal className="w-4 h-4" />
              {t("shop.filters")}
              {active > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground">
                  {active}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] sm:w-96 overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-black">{t("shop.filters")}</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{body}</div>
            <div className="mt-8">
              <Button
                className="w-full bg-black text-white hover:bg-black/90"
                onClick={() => setOpen(false)}
              >
                {t("shop.filters.apply")}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
