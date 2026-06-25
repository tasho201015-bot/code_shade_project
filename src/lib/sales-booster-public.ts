import { supabase } from "@/integrations/supabase/client";
import type { Bundle, CrossSellRule, UpsellRule, DisplayLocation } from "./selling-types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const nowIso = () => new Date().toISOString();

/** Bundle row -> Bundle (subset used by storefront) */
function mapBundle(r: Record<string, unknown>): Bundle {
  return {
    id: r.id as string,
    name: r.name as string,
    name_ar: (r.name_ar as string | null) ?? null,
    description: (r.description as string) ?? "",
    description_ar: (r.description_ar as string | null) ?? null,
    productIds: (r.product_ids as string[]) ?? [],
    originalPriceOverride: (r.original_price_override as number | null) ?? null,
    discountMode: r.discount_mode as "fixed" | "percent",
    discountValue: Number(r.discount_value),
    coverImage: (r.cover_image as string) ?? "",
    active: r.active as boolean,
    badge: (r.badge as string) ?? "",
    badge_ar: (r.badge_ar as string | null) ?? null,
    startsAt: (r.starts_at as string | null) ?? null,
    endsAt: (r.ends_at as string | null) ?? null,
    locations: ((r.locations as string[]) ?? []) as DisplayLocation[],
    order: (r.sort_order as number) ?? 0,
    purchases: (r.purchases as number) ?? 0,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

function mapCross(r: Record<string, unknown>): CrossSellRule {
  const locs = ((r.locations as string[] | null) ?? []) as DisplayLocation[];
  const loc = r.location as DisplayLocation;
  return {
    id: r.id as string,
    triggerProductId: r.trigger_product_id as string,
    suggestions: (r.suggestions as CrossSellRule["suggestions"]) ?? [],
    sectionTitle: r.section_title as string,
    sectionTitle_ar: (r.section_title_ar as string | null) ?? null,
    style: r.style as CrossSellRule["style"],
    maxShown: (r.max_shown as number) ?? 3,
    location: loc,
    locations: locs.length ? locs : (loc ? [loc] : []),
    active: r.active as boolean,
    clicks: (r.clicks as number) ?? 0,
    updatedAt: r.updated_at as string,
  };
}

function mapUpsell(r: Record<string, unknown>): UpsellRule {
  const pos = ((r.positions as string[] | null) ?? []) as UpsellRule["positions"];
  const position = r.position as UpsellRule["position"];
  return {
    id: r.id as string,
    triggerProductId: r.trigger_product_id as string,
    type: r.type as UpsellRule["type"],
    headline: r.headline as string,
    headline_ar: (r.headline_ar as string | null) ?? null,
    note: (r.note as string) ?? "",
    note_ar: (r.note_ar as string | null) ?? null,
    suggestedProductId: (r.suggested_product_id as string | null) ?? null,
    suggestedBundleId: (r.suggested_bundle_id as string | null) ?? null,
    originalPrice: Number(r.original_price),
    upsellPrice: Number(r.upsell_price),
    badge: (r.badge as string) ?? "",
    badge_ar: (r.badge_ar as string | null) ?? null,
    countdownEndsAt: (r.countdown_ends_at as string | null) ?? null,
    position,
    positions: pos.length ? pos : (position ? [position] : []),
    active: r.active as boolean,
    conversions: (r.conversions as number) ?? 0,
    updatedAt: r.updated_at as string,
    config: ((r.config as UpsellRule["config"]) ?? {}) as UpsellRule["config"],
  };
}


/** Filter by schedule window (starts_at / ends_at). */
function withinSchedule(startsAt: string | null, endsAt: string | null) {
  const t = nowIso();
  if (startsAt && startsAt > t) return false;
  if (endsAt && endsAt < t) return false;
  return true;
}

export async function fetchUpsellsForProduct(productId: string): Promise<UpsellRule[]> {
  const { data, error } = await sb
    .from("sb_upsells")
    .select("*")
    .eq("active", true)
    .eq("trigger_product_id", productId)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sales-booster] fetchUpsellsForProduct", error);
    return [];
  }
  return (data ?? []).map(mapUpsell);
}

export async function fetchCrossSellsForProduct(productId: string, location: DisplayLocation = "product"): Promise<CrossSellRule[]> {
  const { data, error } = await sb
    .from("sb_cross_sells")
    .select("*")
    .eq("active", true)
    .eq("trigger_product_id", productId)
    .eq("location", location)
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sales-booster] fetchCrossSellsForProduct", error);
    return [];
  }
  return (data ?? []).map(mapCross);
}

export async function fetchBundlesForProduct(productId: string, location: DisplayLocation = "product"): Promise<Bundle[]> {
  const { data, error } = await sb
    .from("sb_bundles")
    .select("*")
    .eq("active", true)
    .contains("product_ids", [productId])
    .contains("locations", [location])
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[sales-booster] fetchBundlesForProduct", error);
    return [];
  }
  return (data ?? []).map(mapBundle).filter((b: Bundle) => withinSchedule(b.startsAt, b.endsAt));
}

// ============ Checkout-aware fetchers (multi-trigger) ============
/** Upsells whose `positions` includes "checkout" (or legacy "cart") for any of the given product ids. */
export async function fetchUpsellsForCheckout(productIds: string[]): Promise<UpsellRule[]> {
  if (!productIds.length) return [];
  const { data, error } = await sb
    .from("sb_upsells")
    .select("*")
    .eq("active", true)
    .in("trigger_product_id", productIds)
    .overlaps("positions", ["checkout", "cart"])
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sales-booster] fetchUpsellsForCheckout", error);
    return [];
  }
  return (data ?? []).map(mapUpsell);
}

/** Cross-sells whose `locations` includes "checkout" (or legacy "cart") for any of the given product ids. */
export async function fetchCrossSellsForCheckout(productIds: string[]): Promise<CrossSellRule[]> {
  if (!productIds.length) return [];
  const { data, error } = await sb
    .from("sb_cross_sells")
    .select("*")
    .eq("active", true)
    .in("trigger_product_id", productIds)
    .overlaps("locations", ["checkout", "cart"])
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sales-booster] fetchCrossSellsForCheckout", error);
    return [];
  }
  return (data ?? []).map(mapCross);
}

/** Cross-sells whose `locations` includes "post_purchase" for any of the given product ids. */
export async function fetchCrossSellsForPostPurchase(productIds: string[]): Promise<CrossSellRule[]> {
  if (!productIds.length) return [];
  const { data, error } = await sb
    .from("sb_cross_sells")
    .select("*")
    .eq("active", true)
    .in("trigger_product_id", productIds)
    .overlaps("locations", ["post_purchase"])
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[sales-booster] fetchCrossSellsForPostPurchase", error);
    return [];
  }
  return (data ?? []).map(mapCross);
}



/** Bundles whose `locations` includes "checkout" (or legacy "cart") and contain any of the given product ids. */
export async function fetchBundlesForCheckout(productIds: string[]): Promise<Bundle[]> {
  if (!productIds.length) return [];
  const { data, error } = await sb
    .from("sb_bundles")
    .select("*")
    .eq("active", true)
    .overlaps("product_ids", productIds)
    .overlaps("locations", ["checkout", "cart"])
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[sales-booster] fetchBundlesForCheckout", error);
    return [];
  }
  return (data ?? []).map(mapBundle).filter((b: Bundle) => withinSchedule(b.startsAt, b.endsAt));
}

/** Fetch active bundles by ids (used for bundle-type upsells). */
export async function fetchBundlesByIds(ids: string[]): Promise<Bundle[]> {
  if (!ids.length) return [];
  const { data, error } = await sb
    .from("sb_bundles")
    .select("*")
    .eq("active", true)
    .in("id", ids);
  if (error) {
    console.error("[sales-booster] fetchBundlesByIds", error);
    return [];
  }
  return (data ?? []).map(mapBundle).filter((b: Bundle) => withinSchedule(b.startsAt, b.endsAt));
}

export interface PublicProduct {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  image_url: string | null;
  stock: number;
}

export async function fetchProductsByIds(ids: string[]): Promise<PublicProduct[]> {
  if (!ids.length) return [];
  const { data, error } = await sb
    .from("products")
    .select("id, name, name_ar, price, image_url, stock")
    .in("id", ids);
  if (error) {
    console.error("[sales-booster] fetchProductsByIds", error);
    return [];
  }
  return (data ?? []) as PublicProduct[];
}

export function computeBundlePrice(bundle: Bundle, products: PublicProduct[]) {
  const inBundle = products.filter((p) => bundle.productIds.includes(p.id));
  const original =
    bundle.originalPriceOverride ??
    inBundle.reduce((sum, p) => sum + Number(p.price), 0);
  const final =
    bundle.discountMode === "fixed"
      ? Math.max(0, bundle.discountValue)
      : Math.max(0, original * (1 - bundle.discountValue / 100));
  const saved = Math.max(0, original - final);
  return { original, final, saved, items: inBundle };
}
