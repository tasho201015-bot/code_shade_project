// Shared offer/sale helpers for the storefront and admin.
// Pricing source-of-truth stays on `products.price` (the current selling price).
// `compare_at_price` is the original/strike-through price used to compute % off.

export interface OfferFields {
  price: number | string;
  compare_at_price?: number | string | null;
  offer_enabled?: boolean | null;
  offer_starts_at?: string | null;
  offer_ends_at?: string | null;
}

export type OfferStatus = "active" | "scheduled" | "expired" | "none";

export function getOfferStatus(p: OfferFields, now: Date = new Date()): OfferStatus {
  if (!p.offer_enabled) return "none";
  const compare = p.compare_at_price != null ? Number(p.compare_at_price) : NaN;
  const price = Number(p.price);
  if (!Number.isFinite(compare) || compare <= price) return "none";
  const start = p.offer_starts_at ? new Date(p.offer_starts_at) : null;
  const end = p.offer_ends_at ? new Date(p.offer_ends_at) : null;
  if (start && now < start) return "scheduled";
  if (end && now >= end) return "expired";
  return "active";
}

export function getDiscountPercent(p: OfferFields): number | null {
  const compare = p.compare_at_price != null ? Number(p.compare_at_price) : NaN;
  const price = Number(p.price);
  if (!Number.isFinite(compare) || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

export function isOfferActiveNow(p: OfferFields, now: Date = new Date()): boolean {
  return getOfferStatus(p, now) === "active";
}

// "datetime-local" <-> ISO helpers for the admin form
export function isoToLocalInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
