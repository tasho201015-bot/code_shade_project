import { useSyncExternalStore } from "react";
import type {
  Bundle,
  CrossSellRule,
  UpsellRule,
  SellingSettings,
} from "./selling-types";

const KEY = "selling.store.v1";

interface State {
  bundles: Bundle[];
  crossSells: CrossSellRule[];
  upsells: UpsellRule[];
  settings: SellingSettings;
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

const seed = (): State => ({
  bundles: [],
  crossSells: [],
  upsells: [],
  settings: defaultSettings,
});

let state: State = load();
const listeners = new Set<() => void>();

function load(): State {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as Partial<State>;
    return {
      bundles: parsed.bundles ?? [],
      crossSells: parsed.crossSells ?? [],
      upsells: parsed.upsells ?? [],
      settings: { ...defaultSettings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return seed();
  }
}

function persist() {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(state));
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function setState(updater: (s: State) => State) {
  state = updater(state);
  emit();
}

export function useSellingStore<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
    () => selector(state),
  );
}

export function getState() {
  return state;
}

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

const now = () => new Date().toISOString();

// ============ BUNDLES ============
export const bundlesApi = {
  create(input: Partial<Bundle>): Bundle {
    const b: Bundle = {
      id: uid(),
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
      createdAt: now(),
      updatedAt: now(),
      purchases: Math.floor(Math.random() * 60),
    };
    setState((s) => ({ ...s, bundles: [...s.bundles, b] }));
    return b;
  },
  update(id: string, patch: Partial<Bundle>) {
    setState((s) => ({
      ...s,
      bundles: s.bundles.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: now() } : b,
      ),
    }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, bundles: s.bundles.filter((b) => b.id !== id) }));
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
    setState((s) => ({
      ...s,
      bundles: s.bundles
        .slice()
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
        .map((b, i) => ({ ...b, order: i })),
    }));
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
    const r: CrossSellRule = {
      id: uid(),
      triggerProductId: input.triggerProductId ?? "",
      suggestions: input.suggestions ?? [],
      sectionTitle: input.sectionTitle ?? state.settings.defaultCrossSellTitle,
      style: input.style ?? "grid",
      maxShown: input.maxShown ?? 3,
      location: input.location ?? state.settings.defaultCrossSellLocation,
      active: input.active ?? true,
      updatedAt: now(),
      clicks: Math.floor(Math.random() * 200),
    };
    setState((s) => ({ ...s, crossSells: [...s.crossSells, r] }));
    return r;
  },
  update(id: string, patch: Partial<CrossSellRule>) {
    setState((s) => ({
      ...s,
      crossSells: s.crossSells.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: now() } : r,
      ),
    }));
  },
  remove(id: string) {
    setState((s) => ({
      ...s,
      crossSells: s.crossSells.filter((r) => r.id !== id),
    }));
  },
  toggle(id: string) {
    const r = state.crossSells.find((x) => x.id === id);
    if (r) crossSellsApi.update(id, { active: !r.active });
  },
};

// ============ UPSELLS ============
export const upsellsApi = {
  create(input: Partial<UpsellRule>): UpsellRule {
    const r: UpsellRule = {
      id: uid(),
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
      updatedAt: now(),
      conversions: Math.floor(Math.random() * 80),
    };
    setState((s) => ({ ...s, upsells: [...s.upsells, r] }));
    return r;
  },
  update(id: string, patch: Partial<UpsellRule>) {
    setState((s) => ({
      ...s,
      upsells: s.upsells.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: now() } : r,
      ),
    }));
  },
  remove(id: string) {
    setState((s) => ({ ...s, upsells: s.upsells.filter((r) => r.id !== id) }));
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
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  },
};
