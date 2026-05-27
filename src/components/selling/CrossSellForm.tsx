import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { ProductPicker } from "./ProductPicker";
import { SlideOver } from "./SlideOver";
import { Field } from "./BundleForm";
import { crossSellsApi } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import type { CrossSellRule, DisplayLocation } from "@/lib/selling-types";

export function CrossSellForm({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: CrossSellRule | null;
}) {
  const products = useProducts();
  const [trigger, setTrigger] = useState<string[]>([]);
  const [suggIds, setSuggIds] = useState<string[]>([]);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [title, setTitle] = useState("You May Also Like");
  const [style, setStyle] = useState<"grid" | "carousel" | "list">("grid");
  const [maxShown, setMaxShown] = useState(3);
  const [location, setLocation] = useState<DisplayLocation>("product");
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (initial) {
      setTrigger([initial.triggerProductId]);
      setSuggIds(initial.suggestions.map((s) => s.productId));
      setLabels(Object.fromEntries(initial.suggestions.map((s) => [s.productId, s.label])));
      setTitle(initial.sectionTitle);
      setStyle(initial.style);
      setMaxShown(initial.maxShown);
      setLocation(initial.location);
      setActive(initial.active);
    } else if (open) {
      setTrigger([]); setSuggIds([]); setLabels({});
      setTitle("You May Also Like"); setStyle("grid"); setMaxShown(3);
      setLocation("product"); setActive(true);
    }
  }, [initial, open]);

  const move = (id: string, dir: -1 | 1) => {
    const i = suggIds.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= suggIds.length) return;
    const next = suggIds.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setSuggIds(next);
  };

  const submit = () => {
    if (!trigger[0]) return toast.error("Pick a trigger product");
    if (suggIds.length === 0) return toast.error("Add at least one suggestion");
    const payload: Partial<CrossSellRule> = {
      triggerProductId: trigger[0],
      suggestions: suggIds.map((id) => ({ productId: id, label: labels[id] ?? "" })),
      sectionTitle: title.trim() || "You May Also Like",
      style,
      maxShown,
      location,
      active,
    };
    if (initial) {
      crossSellsApi.update(initial.id, payload);
      toast.success("Rule updated");
    } else {
      crossSellsApi.create(payload);
      toast.success("Rule created");
    }
    onClose();
  };

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title={initial ? "Edit cross-sell" : "New cross-sell"}
      footer={
        <>
          <button className="s-btn s-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="s-btn s-btn-primary" onClick={submit}>
            {initial ? "Save" : "Create rule"}
          </button>
        </>
      }
    >
      <ProductPicker value={trigger} onChange={setTrigger} multi={false} label="Trigger product" />
      <ProductPicker value={suggIds} onChange={setSuggIds} label="Suggested products" />

      {suggIds.length > 0 && (
        <Field label="Priority & labels">
          <div className="space-y-2">
            {suggIds.map((id) => {
              const p = products.find((x) => x.id === id);
              if (!p) return null;
              return (
                <div key={id} className="s-card p-2 flex items-center gap-2">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(id, -1)} className="s-muted hover:s-accent"><ArrowUp className="w-3 h-3" /></button>
                    <button type="button" onClick={() => move(id, 1)} className="s-muted hover:s-accent"><ArrowDown className="w-3 h-3" /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs truncate">{p.name}</div>
                    <input
                      className="s-input mt-1 !py-1 !text-xs"
                      placeholder="Label (e.g. Recommended)"
                      value={labels[id] ?? ""}
                      onChange={(e) => setLabels({ ...labels, [id]: e.target.value })}
                    />
                  </div>
                  <button type="button" onClick={() => setSuggIds(suggIds.filter((x) => x !== id))} className="s-muted hover:s-accent">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </Field>
      )}

      <Field label="Section title">
        <input className="s-input" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Display style">
          <select className="s-input" value={style} onChange={(e) => setStyle(e.target.value as "grid" | "carousel" | "list")}>
            <option value="grid">Grid</option>
            <option value="carousel">Carousel</option>
            <option value="list">List</option>
          </select>
        </Field>
        <Field label="Max shown">
          <select className="s-input" value={maxShown} onChange={(e) => setMaxShown(Number(e.target.value))}>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
          </select>
        </Field>
      </div>

      <Field label="Display location">
        <select className="s-input" value={location} onChange={(e) => setLocation(e.target.value as DisplayLocation)}>
          <option value="product">Product Detail Page</option>
          <option value="cart">Cart Drawer / Page</option>
          <option value="checkout">Checkout</option>
          <option value="homepage">Homepage</option>
        </select>
      </Field>

      <label className="flex items-center justify-between s-card p-3">
        <div className="text-sm font-medium">Active</div>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 accent-emerald-500" />
      </label>
    </SlideOver>
  );
}
