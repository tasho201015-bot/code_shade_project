import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Plus, ArrowUp, ArrowDown, Pencil, Trash2, Copy, MoreHorizontal } from "lucide-react";
import { bundlesApi, useSellingStore } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import { BundleForm } from "@/components/selling/BundleForm";
import { EmptyState } from "@/components/selling/StatCard";
import type { Bundle } from "@/lib/selling-types";

export const Route = createFileRoute("/selling/bundles")({
  component: BundlesPage,
});

export function BundlesPage() {
  const bundles = useSellingStore((s) => s.bundles);
  const products = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const sorted = useMemo(
    () => bundles.slice().sort((a, b) => a.order - b.order),
    [bundles],
  );

  const calc = (b: Bundle) => {
    const orig = b.productIds.reduce(
      (s, id) => s + Number(products.find((p) => p.id === id)?.price ?? 0),
      0,
    );
    const final = b.discountMode === "fixed" ? b.discountValue : orig * (1 - b.discountValue / 100);
    return { orig, final, savings: Math.max(0, orig - final) };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bundles</h1>
          <p className="text-sm s-muted">Group products together at a special price</p>
        </div>
        <button className="s-btn s-btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> New Bundle
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No bundles yet"
          description="Create your first bundle to start offering combined deals to your customers."
          actionLabel="Create Bundle"
          onAction={() => { setEditing(null); setOpen(true); }}
        />
      ) : (
        <div className="s-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs s-muted uppercase tracking-wider border-b s-border">
              <tr>
                <th className="px-3 py-3 w-8"></th>
                <th className="px-3 py-3">Bundle</th>
                <th className="px-3 py-3">Products</th>
                <th className="px-3 py-3 text-right">Original</th>
                <th className="px-3 py-3 text-right">Final</th>
                <th className="px-3 py-3 text-right">Saves</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((b) => {
                const { orig, final, savings } = calc(b);
                return (
                  <tr key={b.id} className="border-b s-border last:border-0">
                    <td className="px-3 py-3">
                      <div className="flex flex-col">
                        <button onClick={() => bundlesApi.move(b.id, -1)} className="s-muted hover:s-accent"><ArrowUp className="w-3 h-3" /></button>
                        <button onClick={() => bundlesApi.move(b.id, 1)} className="s-muted hover:s-accent"><ArrowDown className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {b.coverImage ? (
                          <img loading="lazy" decoding="async" src={b.coverImage} alt="" className="w-10 h-10 rounded object-cover border s-border" />
                        ) : (
                          <div className="w-10 h-10 rounded s-surface-2" />
                        )}
                        <div>
                          <div className="font-medium">{b.name}</div>
                          {b.badge && <span className="s-badge mt-1">{b.badge}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 s-muted">{b.productIds.length}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${orig.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right tabular-nums s-accent font-medium">${final.toFixed(2)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">${savings.toFixed(2)}</td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={b.active}
                          onChange={() => { bundlesApi.toggle(b.id); toast.success(b.active ? "Hidden" : "Visible"); }}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-xs s-muted">{b.active ? "Active" : "Hidden"}</span>
                      </label>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button onClick={() => { setEditing(b); setOpen(true); }} className="s-btn s-btn-ghost !p-1.5" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { bundlesApi.duplicate(b.id); toast.success("Duplicated"); }} className="s-btn s-btn-ghost !p-1.5" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmId(b.id)} className="s-btn s-btn-danger !p-1.5" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <BundleForm open={open} onClose={() => setOpen(false)} initial={editing} />

      {confirmId && (
        <ConfirmDialog
          message="Delete this bundle? This cannot be undone."
          onCancel={() => setConfirmId(null)}
          onConfirm={() => {
            bundlesApi.remove(confirmId);
            setConfirmId(null);
            toast.success("Bundle deleted");
          }}
        />
      )}
    </div>
  );
}

export function ConfirmDialog({
  message,
  onCancel,
  onConfirm,
}: {
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="s-card p-6 max-w-sm w-full selling-shell" style={{ background: "var(--s-bg)" }}>
        <div className="text-sm">{message}</div>
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onCancel} className="s-btn s-btn-ghost">Cancel</button>
          <button onClick={onConfirm} className="s-btn s-btn-danger" style={{ color: "var(--s-danger)" }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
