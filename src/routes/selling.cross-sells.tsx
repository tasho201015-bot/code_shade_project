import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shuffle, Search } from "lucide-react";
import { crossSellsApi, useSellingStore } from "@/lib/selling-store";
import { useProducts } from "@/lib/selling-products";
import { CrossSellForm } from "@/components/selling/CrossSellForm";
import { EmptyState } from "@/components/selling/StatCard";
import { ConfirmDialog } from "./selling.bundles";
import type { CrossSellRule } from "@/lib/selling-types";

export const Route = createFileRoute("/selling/cross-sells")({
  component: CrossSellsPage,
});

export function CrossSellsPage() {
  const rules = useSellingStore((s) => s.crossSells);
  const products = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CrossSellRule | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return rules.filter((r) => {
      const tp = products.find((p) => p.id === r.triggerProductId);
      if (statusFilter !== "all" && (statusFilter === "active") !== r.active) return false;
      if (q && !(tp?.name ?? "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rules, products, q, statusFilter]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Cross-Sells</h1>
          <p className="text-sm s-muted">Suggest complementary products together</p>
        </div>
        <button className="s-btn s-btn-primary" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="s-card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 s-muted" />
          <input className="s-input pl-9" placeholder="Filter by trigger product…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="s-input max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Shuffle}
          title={rules.length === 0 ? "No cross-sell rules yet" : "No rules match your filters"}
          description={rules.length === 0
            ? "Create a rule to recommend complementary products on your storefront."
            : "Adjust the filters above or clear them to see all rules."}
          actionLabel={rules.length === 0 ? "Create Rule" : undefined}
          onAction={rules.length === 0 ? () => { setEditing(null); setOpen(true); } : undefined}
        />
      ) : (
        <div className="s-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="text-left text-xs s-muted uppercase tracking-wider border-b s-border">
              <tr>
                <th className="px-3 py-3">Trigger</th>
                <th className="px-3 py-3">Suggestions</th>
                <th className="px-3 py-3">Location</th>
                <th className="px-3 py-3">Modified</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const tp = products.find((p) => p.id === r.triggerProductId);
                return (
                  <tr key={r.id} className="border-b s-border last:border-0">
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        {tp?.image_url ? (
                          <img src={tp.image_url} alt="" className="w-9 h-9 rounded object-cover border s-border" />
                        ) : (<div className="w-9 h-9 rounded s-surface-2" />)}
                        <div>
                          <div className="font-medium">{tp?.name ?? "Deleted product"}</div>
                          <div className="text-xs s-muted">{r.sectionTitle}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 s-muted">{r.suggestions.length} · {r.style}</td>
                    <td className="px-3 py-3 s-muted capitalize">{r.location}</td>
                    <td className="px-3 py-3 s-muted">{new Date(r.updatedAt).toLocaleDateString()}</td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={r.active}
                          onChange={() => { crossSellsApi.toggle(r.id); toast.success(r.active ? "Disabled" : "Enabled"); }}
                          className="w-4 h-4 accent-emerald-500"
                        />
                        <span className="text-xs s-muted">{r.active ? "On" : "Off"}</span>
                      </label>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <div className="inline-flex gap-1">
                        <button onClick={() => { setEditing(r); setOpen(true); }} className="s-btn s-btn-ghost !p-1.5"><Pencil className="w-3.5 h-3.5" /></button>
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

      <CrossSellForm open={open} onClose={() => setOpen(false)} initial={editing} />

      {confirmId && (
        <ConfirmDialog
          message="Delete this cross-sell rule?"
          onCancel={() => setConfirmId(null)}
          onConfirm={() => { crossSellsApi.remove(confirmId); setConfirmId(null); toast.success("Deleted"); }}
        />
      )}
    </div>
  );
}
