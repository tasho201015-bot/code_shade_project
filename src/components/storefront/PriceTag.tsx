import { getOfferStatus, getDiscountPercent, type OfferFields } from "@/lib/product-offer";

interface Props {
  p: OfferFields;
  className?: string;
  align?: "left" | "right";
}

/**
 * Shared price display for product cards / listing pages.
 * Uses the same offer logic as the product details page so behaviour stays consistent.
 * - No discount: just the price.
 * - Active discount: discounted price, strikethrough original, "-X%" badge.
 */
export function PriceTag({ p, className = "", align = "right" }: Props) {
  const status = getOfferStatus(p);
  const pct = getDiscountPercent(p);
  const onSale = status === "active" && pct != null;
  const price = Number(p.price);
  const compare = p.compare_at_price != null ? Number(p.compare_at_price) : null;

  if (!onSale) {
    return (
      <div className={`text-sm tabular-nums font-semibold text-white ${className}`}>${price.toFixed(0)}</div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-1 ${align === "right" ? "items-end" : "items-start"} ${className}`}
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm tabular-nums font-bold text-white">${price.toFixed(0)}</span>
        {compare != null && (
          <span className="text-xs tabular-nums text-[#8A8A8A] line-through">
            ${compare.toFixed(0)}
          </span>
        )}
      </div>
      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] uppercase tracking-luxe bg-accent text-accent-foreground rounded-sm">
        -{pct}%
      </span>
    </div>
  );
}
