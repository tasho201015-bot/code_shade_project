import { supabase } from "@/integrations/supabase/client";

export interface ProductColor {
  id: string;
  name: string;
  name_ar: string | null;
  hex: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProductSize {
  id: string;
  label: string;
  label_ar: string | null;
  weight_min_kg: number | null;
  weight_max_kg: number | null;
  sort_order: number;
  is_active: boolean;
}

// ---------- PUBLIC (storefront) ----------
export async function fetchProductColors(productId: string): Promise<ProductColor[]> {
  const { data, error } = await supabase
    .from("product_color_links")
    .select("sort_order, product_colors!inner(*)")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as { sort_order: number; product_colors: ProductColor }[])
    .map((r) => r.product_colors)
    .filter((c) => c?.is_active);
}

export async function fetchProductSizes(productId: string): Promise<ProductSize[]> {
  const { data, error } = await supabase
    .from("product_size_links")
    .select("sort_order, product_sizes!inner(*)")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });
  if (error || !data) return [];
  return (data as unknown as { sort_order: number; product_sizes: ProductSize }[])
    .map((r) => r.product_sizes)
    .filter((s) => s?.is_active);
}

// ---------- ADMIN: catalog ----------
export async function fetchAllColors(): Promise<ProductColor[]> {
  const { data } = await supabase.from("product_colors").select("*").order("sort_order");
  return (data ?? []) as ProductColor[];
}
export async function fetchAllSizes(): Promise<ProductSize[]> {
  const { data } = await supabase.from("product_sizes").select("*").order("sort_order");
  return (data ?? []) as ProductSize[];
}

export async function upsertColor(c: Partial<ProductColor> & { name: string; hex: string }) {
  if (c.id) {
    const { error } = await supabase.from("product_colors").update({
      name: c.name, name_ar: c.name_ar ?? null, hex: c.hex,
      sort_order: c.sort_order ?? 0, is_active: c.is_active ?? true,
    }).eq("id", c.id);
    return { error };
  }
  const { error } = await supabase.from("product_colors").insert({
    name: c.name, name_ar: c.name_ar ?? null, hex: c.hex,
    sort_order: c.sort_order ?? 0, is_active: c.is_active ?? true,
  });
  return { error };
}
export async function deleteColor(id: string) {
  return supabase.from("product_colors").delete().eq("id", id);
}

export async function upsertSize(s: Partial<ProductSize> & { label: string }) {
  if (s.weight_min_kg != null && s.weight_max_kg != null && s.weight_max_kg < s.weight_min_kg) {
    return { error: { message: "Max weight must be ≥ min weight" } as { message: string } };
  }
  if (s.id) {
    const { error } = await supabase.from("product_sizes").update({
      label: s.label, label_ar: s.label_ar ?? null,
      weight_min_kg: s.weight_min_kg ?? null, weight_max_kg: s.weight_max_kg ?? null,
      sort_order: s.sort_order ?? 0, is_active: s.is_active ?? true,
    }).eq("id", s.id);
    return { error };
  }
  const { error } = await supabase.from("product_sizes").insert({
    label: s.label, label_ar: s.label_ar ?? null,
    weight_min_kg: s.weight_min_kg ?? null, weight_max_kg: s.weight_max_kg ?? null,
    sort_order: s.sort_order ?? 0, is_active: s.is_active ?? true,
  });
  return { error };
}
export async function deleteSize(id: string) {
  return supabase.from("product_sizes").delete().eq("id", id);
}

// ---------- ADMIN: per-product assignment ----------
export async function fetchProductColorIds(productId: string): Promise<string[]> {
  const { data } = await supabase.from("product_color_links").select("color_id").eq("product_id", productId);
  return (data ?? []).map((r: { color_id: string }) => r.color_id);
}
export async function fetchProductSizeIds(productId: string): Promise<string[]> {
  const { data } = await supabase.from("product_size_links").select("size_id").eq("product_id", productId);
  return (data ?? []).map((r: { size_id: string }) => r.size_id);
}
export async function setProductColors(productId: string, colorIds: string[]) {
  await supabase.from("product_color_links").delete().eq("product_id", productId);
  if (colorIds.length === 0) return { error: null };
  const rows = colorIds.map((color_id, i) => ({ product_id: productId, color_id, sort_order: i }));
  const { error } = await supabase.from("product_color_links").insert(rows);
  return { error };
}
export async function setProductSizes(productId: string, sizeIds: string[]) {
  await supabase.from("product_size_links").delete().eq("product_id", productId);
  if (sizeIds.length === 0) return { error: null };
  const rows = sizeIds.map((size_id, i) => ({ product_id: productId, size_id, sort_order: i }));
  const { error } = await supabase.from("product_size_links").insert(rows);
  return { error };
}

export function formatWeightRange(s: ProductSize): string {
  if (s.weight_min_kg == null && s.weight_max_kg == null) return "";
  if (s.weight_min_kg != null && s.weight_max_kg != null) return `${s.weight_min_kg}–${s.weight_max_kg} kg`;
  if (s.weight_min_kg != null) return `${s.weight_min_kg}+ kg`;
  return `up to ${s.weight_max_kg} kg`;
}
