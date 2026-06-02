import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type {
  Bundle,
  CrossSellRule,
  CrossSellSuggestion,
  UpsellRule,
  SellingSettings,
} from "./selling-types";

interface State {
  bundles: Bundle[];
  crossSells: CrossSellRule[];
  upsells: UpsellRule[];
  settings: SellingSettings;
  loaded: boolean;
}

const defaultSettings: SellingSettings = {
  defaultBundleTitle: "Complete the Look",
  defaultCrossSellTitle: "You May Also Like",
  defaultUpsellTitle: "Upgrade Your Choice",
  defaultSuggestionCount: 3,
  bundlesEnabled: true,
  crossSellsEnabled: true,
  upsellsEnabled: true,
  currency: "USD",
  priceFormat: "${amount}",
  defaultBundleLocations: ["product", "cart"],
  defaultCrossSellLocation: "product",
  defaultUpsellPosition: "below_cart_btn",
  zeroSalesAlertDays: 14,
};

let state: State = {
  bundles: [],
  crossSells: [],
  upsells: [],
  settings: defaultSettings,
  loaded: false,
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(updater: (s: State) => State) {
  state = updater(state);
  emit();
}

// ============ Row <-> Type mapping ============
type BundleRow = {
  id: string; name: string; description: string; product_ids: string[];
  original_price_override: number | null; discount_mode: "fixed" | "percent";
  discount_value: number; cover_image: string; active: boolean; badge: string;
  starts_at: string | null; ends_at: string | null; locations: string[];
  sort_order: number; purchases: number; created_at: string; updated_at: string;
};
const fromBundleRow = (r: BundleRow): Bundle => ({
  id: r.id, name: r.name, description: r.description ?? "",
  productIds: r.product_ids ?? [],
  originalPriceOverride: r.original_price_override,
  discountMode: r.discount_mode, discountValue: Number(r.discount_value),
  coverImage: r.cover_image ?? "", active: r.active, badge: r.badge ?? "",
  startsAt: r.starts_at, endsAt: r.ends_at,
  locations: (r.locations ?? []) as Bundle["locations"],
  order: r.sort_order, purchases: r.purchases,
  createdAt: r.created_at, updatedAt: r.updated_at,
});
const toBundleRow = (b: Partial<Bundle>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (b.name !== undefined) out.name = b.name;
  if (b.description !== undefined) out.description = b.description;
  if (b.productIds !== undefined) out.product_ids = b.productIds;
  if (b.originalPriceOverride !== undefined) out.original_price_override = b.originalPriceOverride;
  if (b.discountMode !== undefined) out.discount_mode = b.discountMode;
  if (b.discountValue !== undefined) out.discount_value = b.discountValue;
  if (b.coverImage !== undefined) out.cover_image = b.coverImage;
  if (b.active !== undefined) out.active = b.active;
  if (b.badge !== undefined) out.badge = b.badge;
  if (b.startsAt !== undefined) out.starts_at = b.startsAt;
  if (b.endsAt !== undefined) out.ends_at = b.endsAt;
  if (b.locations !== undefined) out.locations = b.locations;
  if (b.order !== undefined) out.sort_order = b.order;
  if (b.purchases !== undefined) out.purchases = b.purchases;
  return out;
};

type CrossRow = {
  id: string; trigger_product_id: string; suggestions: CrossSellSuggestion[];
  section_title: string; style: "grid" | "carousel" | "list"; max_shown: number;
  location: "product" | "cart" | "checkout" | "homepage"; active: boolean;
  clicks: number; updated_at: string;
};
const fromCrossRow = (r: CrossRow): CrossSellRule => ({
  id: r.id, triggerProductId: r.trigger_product_id,
  suggestions: r.suggestions ?? [], sectionTitle: r.section_title,
  style: r.style, maxShown: r.max_shown, location: r.location,
  active: r.active, clicks: r.clicks, updatedAt: r.updated_at,
});
const toCrossRow = (r: Partial<CrossSellRule>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.triggerProductId !== undefined) out.trigger_product_id = r.triggerProductId;
  if (r.suggestions !== undefined) out.suggestions = r.suggestions;
  if (r.sectionTitle !== undefined) out.section_title = r.sectionTitle;
  if (r.style !== undefined) out.style = r.style;
  if (r.maxShown !== undefined) out.max_shown = r.maxShown;
  if (r.location !== undefined) out.location = r.location;
  if (r.active !== undefined) out.active = r.active;
  if (r.clicks !== undefined) out.clicks = r.clicks;
  return out;
};

type UpsellRow = {
  id: string; trigger_product_id: string;
  type: "upgrade" | "quantity" | "limited" | "bundle";
  headline: string; note: string;
  suggested_product_id: string | null; suggested_bundle_id: string | null;
  original_price: number; upsell_price: number; badge: string;
  countdown_ends_at: string | null;
  position: "below_cart_btn" | "popup" | "cart" | "checkout";
  active: boolean; conversions: number; updated_at: string;
  config: UpsellRule["config"] | null;
};
const fromUpsellRow = (r: UpsellRow): UpsellRule => ({
  id: r.id, triggerProductId: r.trigger_product_id, type: r.type,
  headline: r.headline, note: r.note ?? "",
  suggestedProductId: r.suggested_product_id, suggestedBundleId: r.suggested_bundle_id,
  originalPrice: Number(r.original_price), upsellPrice: Number(r.upsell_price),
  badge: r.badge ?? "", countdownEndsAt: r.countdown_ends_at,
  position: r.position, active: r.active, conversions: r.conversions,
  updatedAt: r.updated_at,
  config: (r.config ?? {}) as UpsellRule["config"],
});
const toUpsellRow = (r: Partial<UpsellRule>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  if (r.triggerProductId !== undefined) out.trigger_product_id = r.triggerProductId;
  if (r.type !== undefined) out.type = r.type;
  if (r.headline !== undefined) out.headline = r.headline;
  if (r.note !== undefined) out.note = r.note;
  if (r.suggestedProductId !== undefined) out.suggested_product_id = r.suggestedProductId;
  if (r.suggestedBundleId !== undefined) out.suggested_bundle_id = r.suggestedBundleId;
  if (r.originalPrice !== undefined) out.original_price = r.originalPrice;
  if (r.upsellPrice !== undefined) out.upsell_price = r.upsellPrice;
  if (r.badge !== undefined) out.badge = r.badge;
  if (r.countdownEndsAt !== undefined) out.countdown_ends_at = r.countdownEndsAt;
  if (r.position !== undefined) out.position = r.position;
  if (r.active !== undefined) out.active = r.active;
  if (r.conversions !== undefined) out.conversions = r.conversions;
  if (r.config !== undefined) out.config = r.config;
  return out;
};


// ============ Initial load ============
let loadingPromise: Promise<void> | null = null;
let settingsRowId: string | null = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

async function loadAll() {
  if (loadingPromise) return loadingPromise;
  loadingPromise = (async () => {
    const [bRes, cRes, uRes, sRes] = await Promise.all([
      sb.from("sb_bundles").select("*").order("sort_order", { ascending: true }),
      sb.from("sb_cross_sells").select("*").order("updated_at", { ascending: false }),
      sb.from("sb_upsells").select("*").order("updated_at", { ascending: false }),
      sb.from("sb_settings").select("*").limit(1).maybeSingle(),
    ]);
    const settings: SellingSettings = {
      ...defaultSettings,
      ...((sRes.data?.data as Partial<SellingSettings>) ?? {}),
    };
    settingsRowId = sRes.data?.id ?? null;
    setState((s) => ({
      ...s,
      bundles: ((bRes.data ?? []) as BundleRow[]).map(fromBundleRow),
      crossSells: ((cRes.data ?? []) as CrossRow[]).map(fromCrossRow),
      upsells: ((uRes.data ?? []) as UpsellRow[]).map(fromUpsellRow),
      settings,
      loaded: true,
    }));
  })();
  return loadingPromise;
}

export function useSellingStore<T>(selector: (s: State) => T): T {
  useEffect(() => {
    if (!state.loaded && !loadingPromise) {
      loadAll().catch((e) => {
        console.error("[selling-store] load failed", e);
      });
    }
  }, []);
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

export function ensureLoaded() {
  if (!state.loaded) return loadAll();
  return Promise.resolve();
}

function handleErr(e: unknown, msg: string) {
  console.error("[selling-store]", msg, e);
  toast.error(msg);
  // Reload from server to repair optimistic drift
  loadingPromise = null;
  loadAll();
}

// ============ BUNDLES ============
const tempId = () => "tmp_" + Math.random().toString(36).slice(2);

export const bundlesApi = {
  create(input: Partial<Bundle>): Bundle {
    const optimistic: Bundle = {
      id: tempId(),
      name: input.name ?? "Untitled bundle",
      description: input.description ?? "",
      productIds: input.productIds ?? [],
      originalPriceOverride: input.originalPriceOverride ?? null,
      discountMode: input.discountMode ?? "percent",
      discountValue: input.discountValue ?? 10,
      coverImage: input.coverImage ?? "",
      active: input.active ?? true,
      badge: input.badge ?? "",
      startsAt: input.startsAt ?? null,
      endsAt: input.endsAt ?? null,
      locations: input.locations ?? ["product"],
      order: state.bundles.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      purchases: 0,
    };
    setState((s) => ({ ...s, bundles: [...s.bundles, optimistic] }));
    (async () => {
      const { data, error } = await sb
        .from("sb_bundles")
        .insert(toBundleRow(optimistic))
        .select("*")
        .single();
      if (error || !data) return handleErr(error, "Failed to create bundle");
      const real = fromBundleRow(data as BundleRow);
      setState((s) => ({
        ...s,
        bundles: s.bundles.map((b) => (b.id === optimistic.id ? real : b)),
      }));
    })();
    return optimistic;
  },
  update(id: string, patch: Partial<Bundle>) {
    setState((s) => ({
      ...s,
      bundles: s.bundles.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
    (async () => {
      const { error } = await sb.from("sb_bundles").update(toBundleRow(patch)).eq("id", id);
      if (error) handleErr(error, "Failed to update bundle");
    })();
  },
  remove(id: string) {
    const prev = state.bundles;
    setState((s) => ({ ...s, bundles: s.bundles.filter((b) => b.id !== id) }));
    (async () => {
      const { error } = await sb.from("sb_bundles").delete().eq("id", id);
      if (error) {
        setState((s) => ({ ...s, bundles: prev }));
        toast.error("Failed to delete bundle");
      }
    })();
  },
  duplicate(id: string) {
    const src = state.bundles.find((b) => b.id === id);
    if (!src) return;
    bundlesApi.create({ ...src, name: src.name + " (copy)" });
  },
  toggle(id: string) {
    const b = state.bundles.find((x) => x.id === id);
    if (b) bundlesApi.update(id, { active: !b.active });
  },
  reorder(ids: string[]) {
    const reordered = state.bundles
      .slice()
      .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
      .map((b, i) => ({ ...b, order: i }));
    setState((s) => ({ ...s, bundles: reordered }));
    (async () => {
      await Promise.all(
        reordered.map((b) =>
          sb.from("sb_bundles").update({ sort_order: b.order }).eq("id", b.id),
        ),
      );
    })();
  },
  move(id: string, dir: -1 | 1) {
    const list = state.bundles.slice().sort((a, b) => a.order - b.order);
    const i = list.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    bundlesApi.reorder(list.map((b) => b.id));
  },
};

// ============ CROSS-SELLS ============
export const crossSellsApi = {
  create(input: Partial<CrossSellRule>): CrossSellRule {
    const optimistic: CrossSellRule = {
      id: tempId(),
      triggerProductId: input.triggerProductId ?? "",
      suggestions: input.suggestions ?? [],
      sectionTitle: input.sectionTitle ?? state.settings.defaultCrossSellTitle,
      style: input.style ?? "grid",
      maxShown: input.maxShown ?? 3,
      location: input.location ?? state.settings.defaultCrossSellLocation,
      active: input.active ?? true,
      updatedAt: new Date().toISOString(),
      clicks: 0,
    };
    setState((s) => ({ ...s, crossSells: [...s.crossSells, optimistic] }));
    (async () => {
      const { data, error } = await sb
        .from("sb_cross_sells")
        .insert(toCrossRow(optimistic))
        .select("*")
        .single();
      if (error || !data) return handleErr(error, "Failed to create cross-sell");
      const real = fromCrossRow(data as CrossRow);
      setState((s) => ({
        ...s,
        crossSells: s.crossSells.map((r) => (r.id === optimistic.id ? real : r)),
      }));
    })();
    return optimistic;
  },
  update(id: string, patch: Partial<CrossSellRule>) {
    setState((s) => ({
      ...s,
      crossSells: s.crossSells.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    (async () => {
      const { error } = await sb.from("sb_cross_sells").update(toCrossRow(patch)).eq("id", id);
      if (error) handleErr(error, "Failed to update cross-sell");
    })();
  },
  remove(id: string) {
    const prev = state.crossSells;
    setState((s) => ({ ...s, crossSells: s.crossSells.filter((r) => r.id !== id) }));
    (async () => {
      const { error } = await sb.from("sb_cross_sells").delete().eq("id", id);
      if (error) {
        setState((s) => ({ ...s, crossSells: prev }));
        toast.error("Failed to delete cross-sell");
      }
    })();
  },
  toggle(id: string) {
    const r = state.crossSells.find((x) => x.id === id);
    if (r) crossSellsApi.update(id, { active: !r.active });
  },
};

// ============ UPSELLS ============
export const upsellsApi = {
  create(input: Partial<UpsellRule>): UpsellRule {
    const optimistic: UpsellRule = {
      id: tempId(),
      triggerProductId: input.triggerProductId ?? "",
      type: input.type ?? "upgrade",
      headline: input.headline ?? state.settings.defaultUpsellTitle,
      note: input.note ?? "",
      suggestedProductId: input.suggestedProductId ?? null,
      suggestedBundleId: input.suggestedBundleId ?? null,
      originalPrice: input.originalPrice ?? 0,
      upsellPrice: input.upsellPrice ?? 0,
      badge: input.badge ?? "",
      countdownEndsAt: input.countdownEndsAt ?? null,
      position: input.position ?? state.settings.defaultUpsellPosition,
      active: input.active ?? true,
      updatedAt: new Date().toISOString(),
      conversions: 0,
    };
    setState((s) => ({ ...s, upsells: [...s.upsells, optimistic] }));
    (async () => {
      const { data, error } = await sb
        .from("sb_upsells")
        .insert(toUpsellRow(optimistic))
        .select("*")
        .single();
      if (error || !data) return handleErr(error, "Failed to create upsell");
      const real = fromUpsellRow(data as UpsellRow);
      setState((s) => ({
        ...s,
        upsells: s.upsells.map((r) => (r.id === optimistic.id ? real : r)),
      }));
    })();
    return optimistic;
  },
  update(id: string, patch: Partial<UpsellRule>) {
    setState((s) => ({
      ...s,
      upsells: s.upsells.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
    (async () => {
      const { error } = await sb.from("sb_upsells").update(toUpsellRow(patch)).eq("id", id);
      if (error) handleErr(error, "Failed to update upsell");
    })();
  },
  remove(id: string) {
    const prev = state.upsells;
    setState((s) => ({ ...s, upsells: s.upsells.filter((r) => r.id !== id) }));
    (async () => {
      const { error } = await sb.from("sb_upsells").delete().eq("id", id);
      if (error) {
        setState((s) => ({ ...s, upsells: prev }));
        toast.error("Failed to delete upsell");
      }
    })();
  },
  duplicate(id: string) {
    const src = state.upsells.find((r) => r.id === id);
    if (!src) return;
    upsellsApi.create({ ...src, headline: src.headline + " (copy)" });
  },
  toggle(id: string) {
    const r = state.upsells.find((x) => x.id === id);
    if (r) upsellsApi.update(id, { active: !r.active });
  },
};

// ============ SETTINGS ============
export const settingsApi = {
  update(patch: Partial<SellingSettings>) {
    const next = { ...state.settings, ...patch };
    setState((s) => ({ ...s, settings: next }));
    (async () => {
      if (settingsRowId) {
        const { error } = await sb
          .from("sb_settings")
          .update({ data: next })
          .eq("id", settingsRowId);
        if (error) handleErr(error, "Failed to save settings");
      } else {
        const { data, error } = await sb
          .from("sb_settings")
          .insert({ data: next, singleton: true })
          .select("*")
          .single();
        if (error || !data) handleErr(error, "Failed to save settings");
        else settingsRowId = (data as { id: string }).id;
      }
    })();
  },
};
