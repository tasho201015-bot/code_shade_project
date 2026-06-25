import { supabase } from "@/integrations/supabase/client";

export type ShippingMode = "flat" | "per_governorate";

export interface ShippingSettings {
  mode: ShippingMode;
  flat_fee: number;
  free_shipping_threshold: number;
}

export interface ShippingRate {
  governorate: string;
  fee: number;
}

export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  mode: "flat",
  flat_fee: 0,
  free_shipping_threshold: 0,
};

export async function fetchShippingSettings(): Promise<ShippingSettings> {
  const { data } = await supabase
    .from("shipping_settings")
    .select("mode,flat_fee,free_shipping_threshold")
    .eq("id", true)
    .maybeSingle();
  if (!data) return DEFAULT_SHIPPING_SETTINGS;
  return {
    mode: (data.mode as ShippingMode) ?? "flat",
    flat_fee: Number(data.flat_fee) || 0,
    free_shipping_threshold: Number(data.free_shipping_threshold) || 0,
  };
}

export async function fetchShippingRates(): Promise<ShippingRate[]> {
  const { data } = await supabase
    .from("shipping_rates")
    .select("governorate,fee")
    .order("governorate");
  return (data ?? []).map((r) => ({
    governorate: r.governorate,
    fee: Number(r.fee) || 0,
  }));
}

export function computeShippingFee(
  subtotal: number,
  settings: ShippingSettings,
  rates: ShippingRate[],
  governorate: string,
): number {
  if (
    settings.free_shipping_threshold > 0 &&
    subtotal >= settings.free_shipping_threshold
  ) {
    return 0;
  }
  if (settings.mode === "flat") return settings.flat_fee;
  const rate = rates.find(
    (r) => r.governorate.toLowerCase() === governorate.trim().toLowerCase(),
  );
  return rate ? rate.fee : settings.flat_fee;
}
