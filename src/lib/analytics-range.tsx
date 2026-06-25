// Shared analytics date-range source of truth.
// All analytics widgets (Dashboard, Overview, Orders, Performance, Revenue
// Chart, KPI Cards, Governorates Report) consume this context so a single
// selector drives every refresh. Range bounds are computed once and reused
// across the existing analytics queries (getAnalyticsOverview, etc.) and
// direct supabase reads.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type RangePreset = "24h" | "7d" | "30d" | "60d" | "90d";

export interface RangePresetMeta {
  id: RangePreset;
  label: string;
  /** Number of day-buckets to render in charts. 24h uses 1. */
  days: number;
  /** Lookback window in hours, used to compute `from`. */
  hours: number;
}

export const RANGE_PRESETS: RangePresetMeta[] = [
  { id: "24h", label: "Last 24 hours", days: 1, hours: 24 },
  { id: "7d", label: "Last 7 days", days: 7, hours: 24 * 7 },
  { id: "30d", label: "Last 30 days", days: 30, hours: 24 * 30 },
  { id: "60d", label: "Last 60 days", days: 60, hours: 24 * 60 },
  { id: "90d", label: "Last 90 days", days: 90, hours: 24 * 90 },
];

export interface ResolvedRange {
  preset: RangePreset;
  label: string;
  days: number;
  hours: number;
  /** ISO start of window. */
  from: string;
  /** ISO end of window (now). */
  to: string;
}

interface Ctx {
  preset: RangePreset;
  setPreset: (p: RangePreset) => void;
  range: ResolvedRange;
  /** Bump to force-refresh consumers that key on it. */
  refreshKey: number;
  refresh: () => void;
}

const AnalyticsRangeContext = createContext<Ctx | null>(null);

function metaFor(preset: RangePreset): RangePresetMeta {
  return RANGE_PRESETS.find((p) => p.id === preset) ?? RANGE_PRESETS[2];
}

function resolve(preset: RangePreset): ResolvedRange {
  const m = metaFor(preset);
  const to = new Date();
  const from = new Date(to.getTime() - m.hours * 60 * 60 * 1000);
  return {
    preset,
    label: m.label,
    days: m.days,
    hours: m.hours,
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

export function AnalyticsRangeProvider({
  children,
  defaultPreset = "30d",
}: {
  children: ReactNode;
  defaultPreset?: RangePreset;
}) {
  const [preset, setPreset] = useState<RangePreset>(defaultPreset);
  const [refreshKey, setRefreshKey] = useState(0);

  // Re-resolve when preset or refreshKey changes so `to = now` stays fresh.
  const range = useMemo(
    () => resolve(preset),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preset, refreshKey],
  );

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const value = useMemo<Ctx>(
    () => ({ preset, setPreset, range, refreshKey, refresh }),
    [preset, range, refreshKey, refresh],
  );

  return (
    <AnalyticsRangeContext.Provider value={value}>
      {children}
    </AnalyticsRangeContext.Provider>
  );
}

export function useAnalyticsRange(): Ctx {
  const ctx = useContext(AnalyticsRangeContext);
  if (!ctx) {
    // Safe fallback so widgets used outside the provider still work.
    const range = resolve("30d");
    return {
      preset: "30d",
      setPreset: () => {},
      range,
      refreshKey: 0,
      refresh: () => {},
    };
  }
  return ctx;
}
