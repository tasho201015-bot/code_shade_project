import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { settingsApi, useSellingStore } from "@/lib/selling-store";
import { Field } from "@/components/selling/BundleForm";
import type { SellingSettings } from "@/lib/selling-types";

export const Route = createFileRoute("/selling/settings")({
  component: SettingsPage,
});

export function SettingsPage() {
  const settings = useSellingStore((s) => s.settings);
  const [draft, setDraft] = useState<SellingSettings>(settings);

  const set = <K extends keyof SellingSettings>(k: K, v: SellingSettings[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  const save = () => {
    settingsApi.update(draft);
    toast.success("Settings saved");
  };

  const preview = draft.priceFormat
    .replace("{symbol}", currencySymbol(draft.currency))
    .replace("{amount}", "129.00");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm s-muted">Global defaults for all strategies</p>
        </div>
        <button onClick={save} className="s-btn s-btn-primary">Save changes</button>
      </div>

      <div className="s-card p-6 space-y-4">
        <h2 className="font-semibold">Master toggles</h2>
        {[
          { k: "bundlesEnabled" as const, label: "Bundles enabled site-wide" },
          { k: "crossSellsEnabled" as const, label: "Cross-sells enabled site-wide" },
          { k: "upsellsEnabled" as const, label: "Upsells enabled site-wide" },
        ].map(({ k, label }) => (
          <label key={k} className="flex items-center justify-between py-2">
            <span className="text-sm">{label}</span>
            <input type="checkbox" checked={draft[k]} onChange={(e) => set(k, e.target.checked)} className="w-4 h-4 accent-emerald-500" />
          </label>
        ))}
      </div>

      <div className="s-card p-6 space-y-4">
        <h2 className="font-semibold">Default section titles</h2>
        <Field label="Bundle section title">
          <input className="s-input" value={draft.defaultBundleTitle} onChange={(e) => set("defaultBundleTitle", e.target.value)} />
        </Field>
        <Field label="Cross-sell section title">
          <input className="s-input" value={draft.defaultCrossSellTitle} onChange={(e) => set("defaultCrossSellTitle", e.target.value)} />
        </Field>
        <Field label="Upsell section title">
          <input className="s-input" value={draft.defaultUpsellTitle} onChange={(e) => set("defaultUpsellTitle", e.target.value)} />
        </Field>
        <Field label="Default number of suggestions">
          <select className="s-input" value={draft.defaultSuggestionCount} onChange={(e) => set("defaultSuggestionCount", Number(e.target.value))}>
            <option value={2}>2</option><option value={3}>3</option><option value={4}>4</option>
          </select>
        </Field>

        <details className="border-t pt-4 mt-2">
          <summary className="cursor-pointer font-medium text-sm select-none">المحتوى العربي (Arabic Content)</summary>
          <p className="text-xs s-muted mt-2 mb-3">
            Leave any field empty to fall back to the English title above on Arabic pages.
          </p>
          <div className="space-y-3" dir="rtl">
            <Field label="عنوان قسم الباقات">
              <input
                className="s-input font-arabic"
                dir="rtl"
                placeholder="مثال: أكمل إطلالتك"
                value={draft.defaultBundleTitle_ar ?? ""}
                onChange={(e) => set("defaultBundleTitle_ar", e.target.value || null)}
              />
            </Field>
            <Field label="عنوان قسم المنتجات المقترحة">
              <input
                className="s-input font-arabic"
                dir="rtl"
                placeholder="مثال: قد يعجبك أيضًا"
                value={draft.defaultCrossSellTitle_ar ?? ""}
                onChange={(e) => set("defaultCrossSellTitle_ar", e.target.value || null)}
              />
            </Field>
            <Field label="عنوان قسم الترقيات">
              <input
                className="s-input font-arabic"
                dir="rtl"
                placeholder="مثال: طوّر اختيارك"
                value={draft.defaultUpsellTitle_ar ?? ""}
                onChange={(e) => set("defaultUpsellTitle_ar", e.target.value || null)}
              />
            </Field>
          </div>
        </details>
      </div>


      <div className="s-card p-6 space-y-4">
        <h2 className="font-semibold">Currency & price format</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency code">
            <select className="s-input" value={draft.currency} onChange={(e) => set("currency", e.target.value)}>
              <option>USD</option><option>EUR</option><option>GBP</option><option>EGP</option><option>SAR</option>
            </select>
          </Field>
          <Field label="Format ({symbol}, {amount})">
            <input className="s-input" value={draft.priceFormat} onChange={(e) => set("priceFormat", e.target.value)} />
          </Field>
        </div>
        <div className="text-xs s-muted">Preview: <span className="s-accent font-medium">{preview}</span></div>
      </div>

      {/* Default display locations moved to each individual Bundle / Cross-Sell / Upsell rule. */}

      <div className="s-card p-6 space-y-4">
        <h2 className="font-semibold">Alerts</h2>
        <Field label="Alert if a strategy has 0 sales after (days)">
          <input type="number" className="s-input max-w-[160px]" value={draft.zeroSalesAlertDays} onChange={(e) => set("zeroSalesAlertDays", Number(e.target.value))} />
        </Field>
      </div>

      <div className="flex justify-end">
        <button onClick={save} className="s-btn s-btn-primary">Save changes</button>
      </div>
    </div>
  );
}

function currencySymbol(code: string) {
  return { USD: "$", EUR: "€", GBP: "£", EGP: "E£", SAR: "﷼" }[code] ?? "$";
}
