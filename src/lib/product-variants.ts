import { supabase } from "@/integrations/supabase/client";

export type VariantStatus = "available" | "out_of_stock" | "hidden";

export interface VariantAvailabilityRow {
  product_id: string;
  color_id: string;
  size_id: string;
  status: VariantStatus;
}

// Storefront/admin read: returns map keyed by `${colorId}:${sizeId}` → status.
// Missing rows = default "available".
export async function fetchVariantAvailability(productId: string): Promise<Record<string, VariantStatus>> {
  const { data, error } = await supabase
    .from("product_variant_availability")
    .select("color_id,size_id,status")
    .eq("product_id", productId);
  if (error || !data) return {};
  const out: Record<string, VariantStatus> = {};
  for (const r of data as { color_id: string; size_id: string; status: VariantStatus }[]) {
    out[`${r.color_id}:${r.size_id}`] = r.status;
  }
  return out;
}

export function variantKey(colorId: string, sizeId: string) {
  return `${colorId}:${sizeId}`;
}

// Admin write: replace matrix for the product (only for the given color/size sets).
// Rows for combinations no longer present are removed.
export async function saveVariantAvailability(
  productId: string,
  colorIds: string[],
  sizeIds: string[],
  matrix: Record<string, VariantStatus>,
): Promise<{ error: { message: string } | null }> {
  // Delete stale rows (any not in current color/size selection)
  const { error: delErr } = await supabase
    .from("product_variant_availability")
    .delete()
    .eq("product_id", productId);
  if (delErr) return { error: delErr };

  if (colorIds.length === 0 || sizeIds.length === 0) return { error: null };

  const rows: VariantAvailabilityRow[] = [];
  for (const cid of colorIds) {
    for (const sid of sizeIds) {
      const status = matrix[variantKey(cid, sid)] ?? "available";
      rows.push({ product_id: productId, color_id: cid, size_id: sid, status });
    }
  }
  const { error } = await supabase.from("product_variant_availability").insert(rows);
  return { error };
}
