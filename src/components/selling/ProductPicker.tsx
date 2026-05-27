import { useMemo, useState } from "react";
import { useProducts, type SellingProduct } from "@/lib/selling-products";
import { Search, X, Check } from "lucide-react";

export function ProductPicker({
  value,
  onChange,
  multi = true,
  label = "Products",
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  multi?: boolean;
  label?: string;
}) {
  const products = useProducts();
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase().trim()),
      ),
    [products, q],
  );

  const selected = value
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as SellingProduct[];

  const toggle = (id: string) => {
    if (multi) {
      onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
    } else {
      onChange([id]);
    }
  };

  return (
    <div>
      <label className="text-xs s-muted uppercase tracking-wider">{label}</label>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2 mb-3">
          {selected.map((p) => (
            <span
              key={p.id}
              className="s-badge gap-1.5"
              style={{ paddingRight: 4 }}
            >
              {p.name}
              <button
                type="button"
                onClick={() => toggle(p.id)}
                className="hover:opacity-70"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative mt-2">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 s-muted" />
        <input
          className="s-input pl-9"
          placeholder="Search products…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="mt-2 max-h-56 overflow-y-auto s-card !rounded-md divide-y s-border">
        {filtered.length === 0 ? (
          <div className="p-4 text-sm s-muted text-center">No products</div>
        ) : (
          filtered.slice(0, 40).map((p) => {
            const on = value.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className="w-full flex items-center gap-3 p-2.5 text-left hover:bg-[var(--s-surface-2)] transition-colors"
              >
                <div
                  className={`w-4 h-4 rounded border s-border grid place-items-center ${
                    on ? "s-bg-accent" : ""
                  }`}
                >
                  {on && <Check className="w-3 h-3" />}
                </div>
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    className="w-8 h-8 rounded object-cover s-border border"
                  />
                ) : (
                  <div className="w-8 h-8 rounded s-surface-2" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{p.name}</div>
                  <div className="text-xs s-muted">${Number(p.price).toFixed(2)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
