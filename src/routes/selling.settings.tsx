import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { settingsApi, useSellingStore } from "@/lib/selling-store";
import { Field } from "@/components/selling/BundleForm";
import type { DisplayLocation, SellingSettings, UpsellRule } from "@/lib/selling-types";

export const Route = createFileRoute("/selling/settings")({
  component: SettingsPage,
});

const LOCATIONS: { value: DisplayLocation; label: string }[] = [
  { value: "product", label: "Product Page" },
  { value: "cart", label: "Cart Page" },
  { value: "checkout", label: "Checkout" },
  { value: "homepage", label: "Homepage" },
];

function SettingsPage() {
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

      <div className="s-card p-6 space-y-4">
        <h2 className="font-semibold">Default display locations</h2>
        <Field label="Bundles default locations">
          <div className="grid grid-cols-2 gap-2">
            {LOCATIONS.map((l) => {
              const on = draft.defaultBundleLocations.includes(l.value);
              return (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => set("defaultBundleLocations", on ? draft.defaultBundleLocations.filter((x) => x !== l.value) : [...draft.defaultBundleLocations, l.value])}
                  className={`s-btn ${on ? "s-btn-primary" : "s-btn-ghost"} justify-center !text-xs`}
                >
                  {l.label}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Cross-sell default location">
          <select className="s-input" value={draft.defaultCrossSellLocation} onChange={(e) => set("defaultCrossSellLocation", e.target.value as DisplayLocation)}>
            {LOCATIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </Field>
        <Field label="Upsell default position">
          <select className="s-input" value={draft.defaultUpsellPosition} onChange={(e) => set("defaultUpsellPosition", e.target.value as UpsellRule["position"])}>
            <option value="below_cart_btn">Below Add-to-Cart</option>
            <option value="popup">Popup after Add-to-Cart</option>
            <option value="cart">Cart Page</option>
            <option value="checkout">Checkout Page</option>
          </select>
        </Field>
      </div>

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
