import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Copy, TrendingUp } from "lucide-react";
import { upsellsApi, useSellingStore } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import { UpsellForm } from "@/components/selling/UpsellForm";
import { EmptyState } from "@/components/selling/StatCard";
import { ConfirmDialog } from "./selling.bundles";
import type { UpsellRule } from "@/lib/selling-types";

const TYPE_LABEL: Record<UpsellRule["type"], string> = {
  upgrade: "Upgrade",
  quantity: "Quantity",
  limited: "Limited",
  bundle: "Bundle",
};

export const Route = createFileRoute("/selling/upsells")({
  component: UpsellsPage,
});

function UpsellsPage() {
  const rules = useSellingStore((s) => s.upsells);
  const bundles = useSellingStore((s) => s.bundles);
  const products = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UpsellRule | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Upsells</h1>
          <p className="text-sm s-muted">Persuade customers to pick a better option</p>
        </div>
        <button className="s-btn s-btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> New Upsell
        </button>
      </div>

      {rules.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No upsell rules yet"
          description="Add an upsell to encourage premium picks, quantity deals or limited editions."
          actionLabel="Create Upsell"
          onAction={() => { setEditing(null); setOpen(true); }}
        />
      ) : (
        <div className="s-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs s-muted uppercase tracking-wider border-b s-border">
              <tr>
                <th className="px-3 py-3">Trigger</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Headline</th>
                <th className="px-3 py-3">Suggested</th>
                <th className="px-3 py-3 text-right">Price Δ</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const tp = products.find((p) => p.id === r.triggerProductId);
                const sp = r.suggestedProductId ? products.find((p) => p.id === r.suggestedProductId) : null;
                const sb = r.suggestedBundleId ? bundles.find((b) => b.id === r.suggestedBundleId) : null;
                const diff = r.upsellPrice - r.originalPrice;
                return (
                  <tr key={r.id} className="border-b s-border last:border-0">
                    <td className="px-3 py-3">{tp?.name ?? "—"}</td>
                    <td className="px-3 py-3"><span className="s-badge">{TYPE_LABEL[r.type]}</span></td>
                    <td className="px-3 py-3">{r.headline}</td>
                    <td className="px-3 py-3 s-muted">{sb?.name ?? sp?.name ?? "—"}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${diff > 0 ? "s-accent" : ""}`}>
                      {diff >= 0 ? "+" : ""}${diff.toFixed(2)}
                    </td>
                    <td className="px-3 py-3 s-muted capitalize">{r.position.replace(/_/g, " ")}</td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={r.active} onChange={() => { upsellsApi.toggle(r.id); toast.success(r.active ? "Disabled" : "Enabled"); }} className="w-4 h-4 accent-emerald-500" />
                        <span className="text-xs s-muted">{r.active ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(r); setOpen(true); }} className="s-btn s-btn-ghost !p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => { upsellsApi.duplicate(r.id); toast.success("Duplicated"); }} className="s-btn s-btn-ghost !p-1.5"><Copy className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmId(r.id)} className="s-btn s-btn-danger !p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <UpsellForm open={open} onClose={() => setOpen(false)} initial={editing} />

      {confirmId && (
        <ConfirmDialog
          message="Delete this upsell rule?"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => { upsellsApi.remove(confirmId); setConfirmId(null); toast.success("Deleted"); }}
        />
      )}
    </div>
  );
}
