import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useProducts } from "@/lib/selling-products";

export const Route = createFileRoute("/selling/products")({
  component: ProductsPage,
});

export function ProductsPage() {
  const products = useProducts();
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () =>
      products.filter((p) =>
        p.name.toLowerCase().includes(q.toLowerCase().trim()),
      ),
    [products, q],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Products</h1>
        <p className="text-sm s-muted">
          Catalog used as the source for bundles, cross-sells and upsells.
        </p>
      </div>

      <div className="s-card p-4">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 s-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="s-input pl-9"
            placeholder="Search products…"
          />
        </div>
      </div>

      <div className="s-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="text-left text-xs s-muted uppercase tracking-wider border-b s-border">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-10 s-muted">
                  No products
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-b s-border last:border-0">
                  <td className="px-4 py-3 flex items-center gap-3">
                    {p.image_url ? (
                      <img
                        src={p.image_url}
                        alt=""
                        className="w-9 h-9 rounded object-cover border s-border"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded s-surface-2" />
                    )}
                    <span>{p.name}</span>
                  </td>
                  <td className="px-4 py-3 s-muted">{p.category}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ${Number(p.price).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
