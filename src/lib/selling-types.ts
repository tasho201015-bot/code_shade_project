export type DisplayLocation = "product" | "cart" | "checkout" | "homepage" | "post_purchase";

export interface Bundle {
  id: string;
  name: string;
  name_ar?: string | null;
  description: string;
  description_ar?: string | null;
  productIds: string[];
  /** Manual override of original total; if null, computed from products */
  originalPriceOverride: number | null;
  discountMode: "fixed" | "percent";
  discountValue: number; // fixed price OR percent off
  coverImage: string;
  active: boolean;
  badge: string;
  badge_ar?: string | null;
  startsAt: string | null;
  endsAt: string | null;
  locations: DisplayLocation[];
  order: number;
  createdAt: string;
  updatedAt: string;
  /** mock metric */
  purchases: number;
}


export type CrossSellStyle = "grid" | "carousel" | "list";

export interface CrossSellSuggestion {
  productId: string;
  label: string;
  label_ar?: string | null;
}

export interface CrossSellRule {
  id: string;
  triggerProductId: string;
  suggestions: CrossSellSuggestion[];
  sectionTitle: string;
  sectionTitle_ar?: string | null;
  style: CrossSellStyle;
  maxShown: number;
  /** Legacy single location (kept for backwards-compat). */
  location: DisplayLocation;
  /** Multi-location display targets. */
  locations: DisplayLocation[];
  active: boolean;
  updatedAt: string;
  /** mock metric */
  clicks: number;
}


export type UpsellType =
  | "upgrade"
  | "quantity"
  | "limited"
  | "bundle";

/** Type-specific UI/business behavior. Never used for DB filtering, sort, joins, RLS. */
export type UpsellConfig =
  | { kind: "upgrade" }
  | {
      kind: "quantity";
      minQuantity: number;
      discountMode: "percent" | "fixed";
      discountValue: number;
    }
  | { kind: "limited"; limitedStockMessage: string }
  | { kind: "bundle" }
  | Record<string, never>;

export type CrossSellConfig = Record<string, unknown>;
export type BundleConfig = Record<string, unknown>;

export interface UpsellRule {
  id: string;
  triggerProductId: string;
  type: UpsellType;
  headline: string;
  headline_ar?: string | null;
  note: string;
  note_ar?: string | null;
  suggestedProductId: string | null;
  suggestedBundleId: string | null;
  originalPrice: number;
  upsellPrice: number;
  badge: string;
  badge_ar?: string | null;

  countdownEndsAt: string | null;
  position: "below_cart_btn" | "popup" | "cart" | "checkout";
  positions: ("below_cart_btn" | "popup" | "cart" | "checkout")[];
  active: boolean;
  updatedAt: string;
  config: UpsellConfig;
  /** mock metric */
  conversions: number;
}


export interface SellingSettings {
  defaultBundleTitle: string;
  defaultCrossSellTitle: string;
  defaultUpsellTitle: string;
  defaultBundleTitle_ar: string | null;
  defaultCrossSellTitle_ar: string | null;
  defaultUpsellTitle_ar: string | null;
  defaultSuggestionCount: number;
  bundlesEnabled: boolean;
  crossSellsEnabled: boolean;
  upsellsEnabled: boolean;
  currency: string;
  priceFormat: string; // e.g. "{symbol}{amount}"
  defaultBundleLocations: DisplayLocation[];
  defaultCrossSellLocation: DisplayLocation;
  defaultUpsellPosition: UpsellRule["position"];
  zeroSalesAlertDays: number;
}
