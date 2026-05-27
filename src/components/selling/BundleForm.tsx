import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ProductPicker } from "./ProductPicker";
import { SlideOver } from "./SlideOver";
import { bundlesApi } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import type { Bundle, DisplayLocation } from "@/lib/selling-types";

const LOCATIONS: { value: DisplayLocation; label: string }[] = [
  { value: "product", label: "Product Page" },
  { value: "cart", label: "Cart Page" },
  { value: "checkout", label: "Checkout" },
  { value: "homepage", label: "Homepage" },
];

export function BundleForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: Bundle | null;
}) {
  const products = useProducts();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [discountMode, setDiscountMode] = useState<"fixed" | "percent">("percent");
  const [discountValue, setDiscountValue] = useState(10);
  const [cover, setCover] = useState("");
  const [active, setActive] = useState(true);
  const [badge, setBadge] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [locations, setLocations] = useState<DisplayLocation[]>(["product"]);

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setDesc(initial.description);
      setProductIds(initial.productIds);
      setDiscountMode(initial.discountMode);
      setDiscountValue(initial.discountValue);
      setCover(initial.coverImage);
      setActive(initial.active);
      setBadge(initial.badge);
      setStartsAt(initial.startsAt?.slice(0, 10) ?? "");
      setEndsAt(initial.endsAt?.slice(0, 10) ?? "");
      setLocations(initial.locations);
    } else if (open) {
      setName(""); setDesc(""); setProductIds([]);
      setDiscountMode("percent"); setDiscountValue(10);
      setCover(""); setActive(true); setBadge("");
      setStartsAt(""); setEndsAt(""); setLocations(["product"]);
    }
  }, [initial, open]);

  const originalTotal = productIds.reduce((sum, id) => {
    const p = products.find((x) => x.id === id);
    return sum + Number(p?.price ?? 0);
  }, 0);
  const finalPrice =
    discountMode === "fixed"
      ? discountValue
      : originalTotal * (1 - discountValue / 100);
  const savings = Math.max(0, originalTotal - finalPrice);

  const submit = () => {
    if (!name.trim()) return toast.error("Name is required");
    if (productIds.length === 0) return toast.error("Add at least one product");
    const payload: Partial<Bundle> = {
      name: name.trim(),
      description: desc.trim(),
      productIds,
      discountMode,
      discountValue,
      coverImage: cover.trim(),
      active,
      badge: badge.trim(),
      startsAt: startsAt ? new Date(startsAt).toISOString() : null,
      endsAt: endsAt ? new Date(endsAt).toISOString() : null,
      locations,
    };
    if (initial) {
      bundlesApi.update(initial.id, payload);
      toast.success("Bundle updated");
    } else {
      bundlesApi.create(payload);
      toast.success("Bundle created");
    }
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Edit bundle" : "New bundle"}
      footer={
        <>
          <button className="s-btn s-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="s-btn s-btn-primary" onClick={submit}>
            {initial ? "Save changes" : "Create bundle"}
          </button>
        </>
      }
    >
      <Field label="Bundle name">
        <input className="s-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Complete the Look" />
      </Field>
      <Field label="Description">
        <textarea className="s-input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} />
      </Field>

      <ProductPicker value={productIds} onChange={setProductIds} />

      <div className="s-card p-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div><div className="s-muted">Original</div><div className="font-semibold mt-1 tabular-nums">${originalTotal.toFixed(2)}</div></div>
        <div><div className="s-muted">Final</div><div className="font-semibold mt-1 tabular-nums s-accent">${finalPrice.toFixed(2)}</div></div>
        <div><div className="s-muted">Saves</div><div className="font-semibold mt-1 tabular-nums">${savings.toFixed(2)}</div></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Discount mode">
          <select className="s-input" value={discountMode} onChange={(e) => setDiscountMode(e.target.value as "fixed" | "percent")}>
            <option value="percent">Percent off (%)</option>
            <option value="fixed">Fixed price ($)</option>
          </select>
        </Field>
        <Field label={discountMode === "fixed" ? "Bundle price" : "Discount %"}>
          <input type="number" className="s-input" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
        </Field>
      </div>

      <Field label="Cover image URL">
        <input className="s-input" value={cover} onChange={(e) => setCover(e.target.value)} placeholder="https://…" />
      </Field>

      <Field label="Badge label">
        <input className="s-input" value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="Best Value" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts at"><input type="date" className="s-input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></Field>
        <Field label="Ends at"><input type="date" className="s-input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></Field>
      </div>

      <Field label="Display locations">
        <div className="grid grid-cols-2 gap-2">
          {LOCATIONS.map((l) => {
            const on = locations.includes(l.value);
            return (
              <button
                key={l.value}
                type="button"
                onClick={() =>
                  setLocations(on ? locations.filter((x) => x !== l.value) : [...locations, l.value])
                }
                className={`s-btn ${on ? "s-btn-primary" : "s-btn-ghost"} justify-center !text-xs`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </Field>

      <label className="flex items-center justify-between s-card p-3">
        <div>
          <div className="text-sm font-medium">Active</div>
          <div className="text-xs s-muted">Bundle is visible to customers</div>
        </div>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
      </label>
    </SlideOver>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs s-muted uppercase tracking-wider block mb-1.5">{label}</label>
      {children}
    </div>
  );
}
