import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ProductPicker } from "./ProductPicker";
import { SlideOver } from "./SlideOver";
import { Field } from "./BundleForm";
import { upsellsApi, useSellingStore } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import type { UpsellConfig, UpsellRule, UpsellType } from "@/lib/selling-types";

const TYPES: { v: UpsellType; label: string; hint: string }[] = [
  { v: "upgrade", label: "Upgrade Version", hint: "Suggest a better product" },
  { v: "quantity", label: "Quantity Deal", hint: "Buy more, save more" },
  { v: "limited", label: "Limited Edition", hint: "Exclusive + countdown" },
  { v: "bundle", label: "Bundle Upgrade", hint: "Suggest a bundle instead" },
];

// ---------- Zod schemas (one per type) ----------
const baseSchema = z.object({
  triggerProductId: z.string().uuid("Select a trigger product"),
  headline: z.string().trim().min(1, "Headline required").max(120),
  note: z.string().trim().max(400),
  badge: z.string().trim().max(40),
  position: z.enum(["below_cart_btn", "popup", "cart", "checkout"]),
  active: z.boolean(),
});

const upgradeSchema = baseSchema.extend({
  type: z.literal("upgrade"),
  suggestedProductId: z.string().uuid("Pick a suggested product"),
  originalPrice: z.number().nonnegative(),
  upsellPrice: z.number().nonnegative(),
});

const quantitySchema = baseSchema.extend({
  type: z.literal("quantity"),
  minQuantity: z.number().int().min(2, "Minimum 2"),
  discountMode: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive("Discount must be > 0"),
});

const limitedSchema = baseSchema.extend({
  type: z.literal("limited"),
  suggestedProductId: z.string().uuid("Pick a suggested product"),
  originalPrice: z.number().nonnegative(),
  upsellPrice: z.number().nonnegative(),
  countdownEndsAt: z.string().min(1, "Pick a countdown date"),
  limitedStockMessage: z.string().trim().max(120),
});

const bundleSchema = baseSchema.extend({
  type: z.literal("bundle"),
  suggestedBundleId: z.string().uuid("Pick a bundle"),
});

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
  const products = useProducts();

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

  // Type-specific config
  const [minQuantity, setMinQuantity] = useState(2);
  const [discountMode, setDiscountMode] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [limitedStockMessage, setLimitedStockMessage] = useState("Only a few left");

  const [priceTouched, setPriceTouched] = useState(false);
  const [noteTouched, setNoteTouched] = useState(false);

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
      setPriceTouched(true);
      setNoteTouched(true);
      const cfg = (initial.config ?? {}) as UpsellConfig & Record<string, unknown>;
      if ("minQuantity" in cfg) setMinQuantity(Number(cfg.minQuantity) || 2);
      if ("discountMode" in cfg) setDiscountMode(cfg.discountMode === "fixed" ? "fixed" : "percent");
      if ("discountValue" in cfg) setDiscountValue(Number(cfg.discountValue) || 10);
      if ("limitedStockMessage" in cfg && typeof cfg.limitedStockMessage === "string") {
        setLimitedStockMessage(cfg.limitedStockMessage);
      }
    } else if (open) {
      setTrigger([]); setType("upgrade"); setHeadline("Upgrade Your Choice");
      setNote(""); setSuggested([]); setBundleId("");
      setOriginalPrice(0); setUpsellPrice(0); setBadge("");
      setCountdownEndsAt(""); setPosition("below_cart_btn"); setActive(true);
      setMinQuantity(2); setDiscountMode("percent"); setDiscountValue(10);
      setLimitedStockMessage("Only a few left");
      setPriceTouched(false); setNoteTouched(false);
    }
  }, [initial, open]);

  const triggerProduct = useMemo(
    () => products.find((p) => p.id === trigger[0]) ?? null,
    [products, trigger],
  );
  const suggestedProduct = useMemo(
    () => products.find((p) => p.id === suggested[0]) ?? null,
    [products, suggested],
  );
  const selectedBundle = useMemo(
    () => bundles.find((b) => b.id === bundleId) ?? null,
    [bundles, bundleId],
  );

  // Auto-fill prices from product data when relevant
  useEffect(() => {
    if (priceTouched) return;
    if (type === "upgrade" || type === "limited") {
      if (triggerProduct) setOriginalPrice(triggerProduct.price);
      if (suggestedProduct) setUpsellPrice(suggestedProduct.price);
    } else if (type === "bundle" && selectedBundle) {
      const sum = selectedBundle.productIds.reduce((acc, id) => {
        const p = products.find((x) => x.id === id);
        return acc + (p?.price ?? 0);
      }, 0);
      const original = selectedBundle.originalPriceOverride ?? sum;
      const final =
        selectedBundle.discountMode === "fixed"
          ? selectedBundle.discountValue
          : original * (1 - selectedBundle.discountValue / 100);
      setOriginalPrice(Number(original.toFixed(2)));
      setUpsellPrice(Number(final.toFixed(2)));
    }
  }, [type, triggerProduct, suggestedProduct, selectedBundle, products, priceTouched]);

  // Auto-generate quantity-deal preview note
  const autoQuantityNote = useMemo(() => {
    if (type !== "quantity") return "";
    const off =
      discountMode === "percent"
        ? `${discountValue}% off`
        : `$${discountValue.toFixed(2)} off`;
    return `Buy ${minQuantity}+ and get ${off}`;
  }, [type, minQuantity, discountMode, discountValue]);

  useEffect(() => {
    if (type === "quantity" && !noteTouched) setNote(autoQuantityNote);
  }, [type, autoQuantityNote, noteTouched]);

  // ---------- Validation ----------
  const validation = useMemo(() => {
    const common = {
      triggerProductId: trigger[0] ?? "",
      headline,
      note,
      badge,
      position,
      active,
    };
    switch (type) {
      case "upgrade":
        return upgradeSchema.safeParse({
          ...common, type, suggestedProductId: suggested[0] ?? "",
          originalPrice, upsellPrice,
        });
      case "quantity":
        return quantitySchema.safeParse({
          ...common, type, minQuantity, discountMode, discountValue,
        });
      case "limited":
        return limitedSchema.safeParse({
          ...common, type, suggestedProductId: suggested[0] ?? "",
          originalPrice, upsellPrice, countdownEndsAt, limitedStockMessage,
        });
      case "bundle":
        return bundleSchema.safeParse({
          ...common, type, suggestedBundleId: bundleId,
        });
    }
  }, [
    type, trigger, headline, note, badge, position, active,
    suggested, bundleId, originalPrice, upsellPrice,
    countdownEndsAt, minQuantity, discountMode, discountValue, limitedStockMessage,
  ]);

  const firstError =
    validation && !validation.success ? validation.error.issues[0]?.message : null;

  const submit = () => {
    if (!validation?.success) {
      toast.error(firstError ?? "Please fix the form");
      return;
    }
    let config: UpsellConfig = {};
    if (type === "quantity") {
      config = { kind: "quantity", minQuantity, discountMode, discountValue };
    } else if (type === "limited") {
      config = { kind: "limited", limitedStockMessage: limitedStockMessage.trim() };
    } else if (type === "upgrade") {
      config = { kind: "upgrade" };
    } else if (type === "bundle") {
      config = { kind: "bundle" };
    }

    const payload: Partial<UpsellRule> = {
      triggerProductId: trigger[0],
      type,
      headline: headline.trim(),
      note: note.trim(),
      suggestedProductId: type === "bundle" || type === "quantity" ? null : suggested[0] ?? null,
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
      config,
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

  const showSuggestedProduct = type === "upgrade" || type === "limited";
  const showPriceComparison = type !== "quantity";
  const diff = upsellPrice - originalPrice;
  const savings = originalPrice - upsellPrice;

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Edit upsell" : "New upsell"}
      footer={
        <>
          <button className="s-btn s-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="s-btn s-btn-primary"
            onClick={submit}
            disabled={!validation?.success}
            title={firstError ?? undefined}
          >
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
              onClick={() => { setType(t.v); setPriceTouched(false); setNoteTouched(false); }}
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
        <input className="s-input" value={headline} onChange={(e) => setHeadline(e.target.value)} />
      </Field>

      <Field label="Persuasion note">
        <textarea
          className="s-input"
          rows={2}
          value={note}
          onChange={(e) => { setNote(e.target.value); setNoteTouched(true); }}
          placeholder={type === "quantity" ? autoQuantityNote : "Higher quality fabric, limited stock…"}
        />
      </Field>

      {/* ----- Type-specific blocks ----- */}
      {type === "bundle" && (
        <Field label="Suggested bundle">
          <select
            className="s-input"
            value={bundleId}
            onChange={(e) => { setBundleId(e.target.value); setPriceTouched(false); }}
          >
            <option value="">— Select bundle —</option>
            {bundles.map((b) => (<option key={b.id} value={b.id}>{b.name}</option>))}
          </select>
        </Field>
      )}

      {showSuggestedProduct && (
        <ProductPicker
          value={suggested}
          onChange={(v) => { setSuggested(v); setPriceTouched(false); }}
          multi={false}
          label="Suggested product"
        />
      )}

      {type === "quantity" && (
        <>
          <Field label="Minimum quantity">
            <input
              type="number" min={2} className="s-input"
              value={minQuantity}
              onChange={(e) => setMinQuantity(Math.max(2, Number(e.target.value) || 2))}
            />
          </Field>
          <Field label="Discount">
            <div className="grid grid-cols-[140px_1fr] gap-3">
              <select
                className="s-input"
                value={discountMode}
                onChange={(e) => setDiscountMode(e.target.value as "percent" | "fixed")}
              >
                <option value="percent">Percentage %</option>
                <option value="fixed">Fixed amount</option>
              </select>
              <input
                type="number" min={0} step="0.01" className="s-input"
                value={discountValue}
                onChange={(e) => setDiscountValue(Number(e.target.value) || 0)}
              />
            </div>
          </Field>
        </>
      )}

      {showPriceComparison && (
        <Field label="Price comparison">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs s-muted mb-1">Original</div>
              <input
                type="number" className="s-input" value={originalPrice}
                onChange={(e) => { setOriginalPrice(Number(e.target.value)); setPriceTouched(true); }}
              />
            </div>
            <div>
              <div className="text-xs s-muted mb-1">
                {type === "bundle" ? "Bundle price" : "Upsell"}
              </div>
              <input
                type="number" className="s-input" value={upsellPrice}
                onChange={(e) => { setUpsellPrice(Number(e.target.value)); setPriceTouched(true); }}
              />
            </div>
          </div>
          {savings > 0 && (
            <div className="text-xs s-muted mt-1">
              Customer saves ${savings.toFixed(2)}
            </div>
          )}
          {diff > 0 && (
            <div className="text-xs s-muted mt-1">
              +${diff.toFixed(2)} upgrade cost
            </div>
          )}
        </Field>
      )}

      <Field label="Badge">
        <input className="s-input" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Best Seller" />
      </Field>

      {type === "limited" && (
        <>
          <Field label="Countdown ends">
            <input
              type="date" className="s-input" value={countdownEndsAt}
              onChange={(e) => setCountdownEndsAt(e.target.value)}
            />
          </Field>
          <Field label="Limited stock message">
            <input
              className="s-input" value={limitedStockMessage}
              onChange={(e) => setLimitedStockMessage(e.target.value)}
              placeholder="Only 12 left in stock"
            />
          </Field>
        </>
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

      {/* ---------- Live customer preview ---------- */}
      <Field label="Customer-facing preview">
        <div className="s-card p-4 space-y-2">
          {badge && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--s-accent)] text-white">
              {badge}
            </span>
          )}
          <div className="text-base font-semibold">{headline || "Headline preview"}</div>
          {note && <div className="text-sm s-muted">{note}</div>}

          {type === "quantity" && (
            <div className="text-sm">
              Buy <strong>{minQuantity}+</strong> of{" "}
              <strong>{triggerProduct?.name ?? "this product"}</strong> and save{" "}
              <strong>
                {discountMode === "percent" ? `${discountValue}%` : `$${discountValue.toFixed(2)}`}
              </strong>
            </div>
          )}

          {type === "bundle" && selectedBundle && (
            <div className="text-sm">
              Get the <strong>{selectedBundle.name}</strong> bundle for{" "}
              <strong>${upsellPrice.toFixed(2)}</strong>{" "}
              <span className="s-muted line-through">${originalPrice.toFixed(2)}</span>
            </div>
          )}

          {(type === "upgrade" || type === "limited") && suggestedProduct && (
            <div className="text-sm">
              Upgrade to <strong>{suggestedProduct.name}</strong> for{" "}
              <strong>${upsellPrice.toFixed(2)}</strong>{" "}
              <span className="s-muted line-through">${originalPrice.toFixed(2)}</span>
            </div>
          )}

          {type === "limited" && (
            <div className="text-xs s-muted">
              {limitedStockMessage}
              {countdownEndsAt && ` · ends ${countdownEndsAt}`}
            </div>
          )}
        </div>
      </Field>

      {firstError && (
        <div className="text-xs text-red-500">{firstError}</div>
      )}
    </SlideOver>
  );
}
