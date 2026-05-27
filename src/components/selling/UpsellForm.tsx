import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductPicker } from "./ProductPicker";
import { SlideOver } from "./SlideOver";
import { Field } from "./BundleForm";
import { upsellsApi, useSellingStore } from "@/lib/selling-store";
import type { UpsellRule, UpsellType } from "@/lib/selling-types";

const TYPES: { v: UpsellType; label: string; hint: string }[] = [
  { v: "upgrade", label: "Upgrade Version", hint: "Premium / higher tier" },
  { v: "quantity", label: "Quantity Deal", hint: "Buy 2, save 15%" },
  { v: "limited", label: "Limited Edition", hint: "Exclusive + countdown" },
  { v: "bundle", label: "Bundle Upgrade", hint: "Suggest a bundle instead" },
];

export function UpsellForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: UpsellRule | null;
}) {
  const bundles = useSellingStore((s) => s.bundles);
  const [trigger, setTrigger] = useState<string[]>([]);
  const [type, setType] = useState<UpsellType>("upgrade");
  const [headline, setHeadline] = useState("Upgrade Your Choice");
  const [note, setNote] = useState("");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [bundleId, setBundleId] = useState<string>("");
  const [originalPrice, setOriginalPrice] = useState(0);
  const [upsellPrice, setUpsellPrice] = useState(0);
  const [badge, setBadge] = useState("");
  const [countdownEndsAt, setCountdownEndsAt] = useState("");
  const [position, setPosition] = useState<UpsellRule["position"]>("below_cart_btn");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setTrigger([initial.triggerProductId]);
      setType(initial.type);
      setHeadline(initial.headline);
      setNote(initial.note);
      setSuggested(initial.suggestedProductId ? [initial.suggestedProductId] : []);
      setBundleId(initial.suggestedBundleId ?? "");
      setOriginalPrice(initial.originalPrice);
      setUpsellPrice(initial.upsellPrice);
      setBadge(initial.badge);
      setCountdownEndsAt(initial.countdownEndsAt?.slice(0, 10) ?? "");
      setPosition(initial.position);
      setActive(initial.active);
    } else if (open) {
      setTrigger([]); setType("upgrade"); setHeadline("Upgrade Your Choice");
      setNote(""); setSuggested([]); setBundleId("");
      setOriginalPrice(0); setUpsellPrice(0); setBadge("");
      setCountdownEndsAt(""); setPosition("below_cart_btn"); setActive(true);
    }
  }, [initial, open]);

  const submit = () => {
    if (!trigger[0]) return toast.error("Pick a trigger product");
    const payload: Partial<UpsellRule> = {
      triggerProductId: trigger[0],
      type,
      headline: headline.trim() || "Upgrade",
      note: note.trim(),
      suggestedProductId: type === "bundle" ? null : suggested[0] ?? null,
      suggestedBundleId: type === "bundle" ? bundleId || null : null,
      originalPrice,
      upsellPrice,
      badge: badge.trim(),
      countdownEndsAt:
        type === "limited" && countdownEndsAt
          ? new Date(countdownEndsAt).toISOString()
          : null,
      position,
      active,
    };
    if (initial) {
      upsellsApi.update(initial.id, payload);
      toast.success("Upsell updated");
    } else {
      upsellsApi.create(payload);
      toast.success("Upsell created");
    }
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Edit upsell" : "New upsell"}
      footer={
        <>
          <button className="s-btn s-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="s-btn s-btn-primary" onClick={submit}>
            {initial ? "Save" : "Create upsell"}
          </button>
        </>
      }
    >
      <ProductPicker value={trigger} onChange={setTrigger} multi={false} label="Trigger product" />

      <Field label="Upsell type">
        <div className="grid grid-cols-2 gap-2">
          {TYPES.map((t) => (
            <button
              key={t.v}
              type="button"
              onClick={() => setType(t.v)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                type === t.v
                  ? "border-[var(--s-accent)] bg-[color-mix(in_oklab,var(--s-accent)_12%,transparent)]"
                  : "s-border hover:s-surface-2"
              }`}
              style={{ borderWidth: 1, borderStyle: "solid" }}
            >
              <div className="text-sm font-medium">{t.label}</div>
              <div className="text-xs s-muted mt-0.5">{t.hint}</div>
            </button>
          ))}
        </div>
      </Field>

      <Field label="Headline">
        <input className="s-input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Most Popular Pick" />
      </Field>
      <Field label="Persuasion note">
        <textarea className="s-input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Higher quality fabric, limited stock…" />
      </Field>

      {type === "bundle" ? (
        <Field label="Suggested bundle">
          <select className="s-input" value={bundleId} onChange={(e) => setBundleId(e.target.value)}>
            <option value="">— Select bundle —</option>
            {bundles.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </Field>
      ) : (
        <ProductPicker value={suggested} onChange={setSuggested} multi={false} label="Suggested product" />
      )}

      <Field label="Price comparison">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs s-muted mb-1">Original</div>
            <input type="number" className="s-input" value={originalPrice} onChange={(e) => setOriginalPrice(Number(e.target.value))} />
          </div>
          <div>
            <div className="text-xs s-muted mb-1">Upsell</div>
            <input type="number" className="s-input" value={upsellPrice} onChange={(e) => setUpsellPrice(Number(e.target.value))} />
          </div>
        </div>
      </Field>

      <Field label="Badge"><input className="s-input" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Best Seller" /></Field>

      {type === "limited" && (
        <Field label="Countdown ends">
          <input type="date" className="s-input" value={countdownEndsAt} onChange={(e) => setCountdownEndsAt(e.target.value)} />
        </Field>
      )}

      <Field label="Display position">
        <select className="s-input" value={position} onChange={(e) => setPosition(e.target.value as UpsellRule["position"])}>
          <option value="below_cart_btn">Below Add-to-Cart button</option>
          <option value="popup">Popup after Add-to-Cart</option>
          <option value="cart">Cart Page</option>
          <option value="checkout">Checkout Page</option>
        </select>
      </Field>

      <label className="flex items-center justify-between s-card p-3">
        <div className="text-sm font-medium">Active</div>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
      </label>
    </SlideOver>
  );
}
