// Business logic: order status normalization.
//
// The database stores granular lifecycle statuses (pending_confirmation,
// confirmed_cod, paid_pending_confirmation, etc.) that mirror the payment
// + fulfillment pipeline. The admin dashboard and analytics layer should
// reason in terms of a small, stable set of canonical buckets so reports
// and shipping-provider integrations stay consistent even as new internal
// statuses are added.
//
// Raw DB statuses are preserved as-is — never rewritten. This module is the
// single source of truth for mapping raw -> canonical.

export const CANONICAL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
] as const;

export type CanonicalOrderStatus = (typeof CANONICAL_ORDER_STATUSES)[number];

/**
 * Map a raw DB status string to its canonical dashboard bucket.
 * Unknown / failed / null statuses fall back to "cancelled" so they never
 * inflate revenue. Use `normalizeOrderStatusOrNull` if you need to detect
 * unknowns instead of bucketing them.
 */
export function normalizeOrderStatus(
  raw: string | null | undefined,
): CanonicalOrderStatus {
  return normalizeOrderStatusOrNull(raw) ?? "cancelled";
}

export function normalizeOrderStatusOrNull(
  raw: string | null | undefined,
): CanonicalOrderStatus | null {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return null;
  switch (s) {
    case "pending":
    case "pending_confirmation":
      return "pending";
    case "processing":
    case "confirmed":
    case "paid":
    case "confirmed_cod":
    case "confirmed_paid":
    case "paid_pending_confirmation":
      return "confirmed";
    case "shipped":
    case "out_for_delivery":
    case "in_transit":
      return "shipped";
    case "delivered":
    case "completed":
      return "delivered";
    case "returned":
    case "refunded":
      return "returned";
    case "cancelled":
    case "canceled":
    case "failed":
    case "void":
    case "voided":
      return "cancelled";
    default:
      return null;
  }
}

/**
 * Raw DB statuses grouped by canonical bucket. Use when querying Supabase
 * with `.in('status', ...)` so future raw statuses only need updating here.
 */
export const RAW_STATUSES_BY_CANONICAL: Record<CanonicalOrderStatus, string[]> = {
  pending: ["pending", "pending_confirmation"],
  confirmed: [
    "processing",
    "confirmed",
    "paid",
    "confirmed_cod",
    "confirmed_paid",
    "paid_pending_confirmation",
  ],
  shipped: ["shipped", "out_for_delivery", "in_transit"],
  delivered: ["delivered", "completed"],
  returned: ["returned", "refunded"],
  cancelled: ["cancelled", "canceled", "failed", "void", "voided"],
};

/**
 * Buckets that contribute gross revenue (everything except returned / cancelled).
 * Returns are tracked separately and subtracted to derive Net Sales.
 */
export const REVENUE_CANONICAL_STATUSES: CanonicalOrderStatus[] = [
  "confirmed",
  "delivered",
];

export const REVENUE_RAW_STATUSES: string[] = REVENUE_CANONICAL_STATUSES.flatMap(
  (c) => RAW_STATUSES_BY_CANONICAL[c],
);

export const RETURNED_RAW_STATUSES: string[] = RAW_STATUSES_BY_CANONICAL.returned;

export const CANCELLED_RAW_STATUSES: string[] = RAW_STATUSES_BY_CANONICAL.cancelled;

/**
 * Human label for a canonical status (admin dashboard).
 */
export function canonicalStatusLabel(s: CanonicalOrderStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
