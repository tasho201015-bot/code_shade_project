// Reusable date-range selector. Drives the shared AnalyticsRangeContext, so
// changing the preset refreshes every analytics widget on the page.

import { RANGE_PRESETS, useAnalyticsRange } from "@/lib/analytics-range";

export function DateRangePicker({ className = "" }: { className?: string }) {
  const { preset, setPreset } = useAnalyticsRange();
  return (
    <div
      className={`inline-flex flex-wrap items-center gap-1 border border-border rounded-sm p-1 bg-background/40 ${className}`}
      role="tablist"
      aria-label="Analytics date range"
    >
      {RANGE_PRESETS.map((p) => {
        const active = preset === p.id;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setPreset(p.id)}
            className={`px-3 py-1.5 text-[10px] uppercase tracking-luxe transition-colors rounded-sm ${
              active
                ? "bg-noir text-cream"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
