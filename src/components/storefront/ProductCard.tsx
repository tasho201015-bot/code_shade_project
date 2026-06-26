import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { GlowCard } from "@/components/ui/glow-card";
import { resolveImage } from "@/lib/product-image";
import { PriceTag } from "@/components/storefront/PriceTag";
import { useI18n } from "@/lib/i18n";

export interface ProductCardData {
  id: string;
  name: string;
  name_ar?: string | null;
  price: number | string;
  image_url?: string | null;
  category?: string;
  compare_at_price?: number | string | null;
  offer_enabled?: boolean | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
}

interface ProductCardProps {
  product: ProductCardData;
  className?: string;
  linkClassName?: string;
  imageClassName?: string;
}

function ProductCardBase({
  product,
  className = "",
  linkClassName = "",
  imageClassName = "aspect-[3/4]",
}: ProductCardProps) {
  const { lang, t } = useI18n();
  const displayName = lang === "ar" && product.name_ar ? product.name_ar : product.name;
  const category = product.category;

  return (
    <GlowCard
      customSize
      glowColor="orange"
      className={`block w-full !p-0 !gap-0 !rounded-[24px] !shadow-none ${className}`}
    >
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className={`block group bg-black border border-[#5A5A5A] rounded-[24px] p-4 shadow-luxe overflow-hidden transition-colors hover:border-accent/60 ${linkClassName}`}
      >
        <div className={`${imageClassName} bg-muted overflow-hidden rounded-[18px]`}>
          <img
            src={resolveImage(product.image_url)}
            alt={displayName}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
        <div className="mt-4 flex items-start justify-between gap-3">
          <div>
            <div className="font-display text-lg leading-tight text-cream">
              {displayName}
            </div>
            {category && (
              <div className="text-[10px] uppercase tracking-luxe text-cream/60 mt-1">
                {t(`cat.${category}`)}
              </div>
            )}
          </div>
          <PriceTag p={product} />
        </div>
      </Link>
    </GlowCard>
  );
}

export const ProductCard = memo(ProductCardBase);
