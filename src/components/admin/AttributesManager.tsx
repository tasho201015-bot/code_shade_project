import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, ArrowUp, ArrowDown, Check, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchAllColors, fetchAllSizes,
  upsertColor, upsertSize, deleteColor, deleteSize,
  type ProductColor, type ProductSize,
} from "@/lib/product-attributes";
import { supabase } from "@/integrations/supabase/client";

export function AttributesManager() {
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [editingColor, setEditingColor] = useState<Partial<ProductColor> | null>(null);
  const [editingSize, setEditingSize] = useState<Partial<ProductSize> | null>(null);

  const refresh = async () => {
    const [c, s] = await Promise.all([fetchAllColors(), fetchAllSizes()]);
    setColors(c); setSizes(s);
  };
  useEffect(() => { refresh(); }, []);

  // --- reorder helpers ---
  const moveColor = async (id: string, dir: -1 | 1) => {
    const idx = colors.findIndex((c) => c.id === id);
    const swap = colors[idx + dir];
    if (!swap) return;
    const a = colors[idx];
    await supabase.from("product_colors").update({ sort_order: swap.sort_order }).eq("id", a.id);
    await supabase.from("product_colors").update({ sort_order: a.sort_order }).eq("id", swap.id);
    refresh();
  };
  const moveSize = async (id: string, dir: -1 | 1) => {
    const idx = sizes.findIndex((s) => s.id === id);
    const swap = sizes[idx + dir];
    if (!swap) return;
    const a = sizes[idx];
    await supabase.from("product_sizes").update({ sort_order: swap.sort_order }).eq("id", a.id);
    await supabase.from("product_sizes").update({ sort_order: a.sort_order }).eq("id", swap.id);
    refresh();
  };

  const toggleColor = async (c: ProductColor) => {
    await supabase.from("product_colors").update({ is_active: !c.is_active }).eq("id", c.id);
    refresh();
  };
  const toggleSize = async (s: ProductSize) => {
    await supabase.from("product_sizes").update({ is_active: !s.is_active }).eq("id", s.id);
    refresh();
  };

  const saveColor = async () => {
    if (!editingColor || !editingColor.name?.trim() || !editingColor.hex?.trim()) {
      toast.error("Name and hex required"); return;
    }
    const { error } = await upsertColor({
      ...editingColor,
      name: editingColor.name!, hex: editingColor.hex!,
      sort_order: editingColor.sort_order ?? colors.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Color saved");
    setEditingColor(null); refresh();
  };
  const saveSize = async () => {
    if (!editingSize || !editingSize.label?.trim()) { toast.error("Label required"); return; }
    const { error } = await upsertSize({
      ...editingSize,
      label: editingSize.label!,
      sort_order: editingSize.sort_order ?? sizes.length,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Size saved");
    setEditingSize(null); refresh();
  };

  const removeColor = async (id: string) => {
    if (!confirm("Delete this color?")) return;
    const { error } = await deleteColor(id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };
  const removeSize = async (id: string) => {
    if (!confirm("Delete this size?")) return;
    const { error } = await deleteSize(id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); refresh(); }
  };

  return (
    <div className="mt-8 grid lg:grid-cols-2 gap-8">
      {/* COLORS */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Colors</h2>
          <button
            onClick={() => setEditingColor({ name: "", hex: "#000000", is_active: true })}
            className="inline-flex items-center gap-2 bg-noir text-cream px-4 py-2 text-xs uppercase tracking-luxe"
          >
            <Plus className="w-4 h-4" /> New color
          </button>
        </div>
        <div className="space-y-2">
          {colors.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass p-3 rounded-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground">{c.hex} · {c.is_active ? "active" : "hidden"}</div>
              </div>
              <button disabled={i === 0} onClick={() => moveColor(c.id, -1)} className="p-1.5 disabled:opacity-30 hover:text-accent"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button disabled={i === colors.length - 1} onClick={() => moveColor(c.id, 1)} className="p-1.5 disabled:opacity-30 hover:text-accent"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleColor(c)} className="p-1.5 hover:text-accent text-[10px] uppercase tracking-luxe">{c.is_active ? "Hide" : "Show"}</button>
              <button onClick={() => setEditingColor(c)} className="p-1.5 hover:text-accent"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => removeColor(c.id)} className="p-1.5 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
          {colors.length === 0 && <div className="text-sm text-muted-foreground">No colors yet.</div>}
        </div>
      </section>

      {/* SIZES */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl">Sizes</h2>
          <button
            onClick={() => setEditingSize({ label: "", weight_min_kg: null, weight_max_kg: null, is_active: true })}
            className="inline-flex items-center gap-2 bg-noir text-cream px-4 py-2 text-xs uppercase tracking-luxe"
          >
            <Plus className="w-4 h-4" /> New size
          </button>
        </div>
        <div className="space-y-2">
          {sizes.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass p-3 rounded-sm flex items-center gap-3">
              <div className="w-12 h-10 border border-border flex items-center justify-center text-sm font-medium">{s.label}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">
                  {s.weight_min_kg != null || s.weight_max_kg != null
                    ? `${s.weight_min_kg ?? "?"}–${s.weight_max_kg ?? "?"} kg`
                    : "No weight range"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{s.is_active ? "active" : "hidden"}</div>
              </div>
              <button disabled={i === 0} onClick={() => moveSize(s.id, -1)} className="p-1.5 disabled:opacity-30 hover:text-accent"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button disabled={i === sizes.length - 1} onClick={() => moveSize(s.id, 1)} className="p-1.5 disabled:opacity-30 hover:text-accent"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button onClick={() => toggleSize(s)} className="p-1.5 hover:text-accent text-[10px] uppercase tracking-luxe">{s.is_active ? "Hide" : "Show"}</button>
              <button onClick={() => setEditingSize(s)} className="p-1.5 hover:text-accent"><Pencil className="w-3.5 h-3.5" /></button>
              <button onClick={() => removeSize(s.id)} className="p-1.5 hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
            </motion.div>
          ))}
          {sizes.length === 0 && <div className="text-sm text-muted-foreground">No sizes yet.</div>}
        </div>
      </section>

      {/* COLOR EDITOR */}
      {editingColor && (
        <div className="fixed inset-0 z-50 bg-noir/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingColor(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-md p-6 rounded-sm shadow-luxe">
            <h3 className="font-display text-xl mb-4">{editingColor.id ? "Edit color" : "New color"}</h3>
            <div className="space-y-3">
              <Field label="Name">
                <input value={editingColor.name ?? ""} onChange={(e) => setEditingColor({ ...editingColor, name: e.target.value })} className="inp" />
              </Field>
              <Field label="Name (Arabic)">
                <input value={editingColor.name_ar ?? ""} onChange={(e) => setEditingColor({ ...editingColor, name_ar: e.target.value })} className="inp" />
              </Field>
              <Field label="Hex">
                <div className="flex items-center gap-2">
                  <input type="color" value={editingColor.hex ?? "#000000"} onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })} className="w-12 h-9 border border-border bg-transparent" />
                  <input value={editingColor.hex ?? ""} onChange={(e) => setEditingColor({ ...editingColor, hex: e.target.value })} className="inp flex-1" />
                </div>
              </Field>
              <label className="flex items-center gap-2 text-xs uppercase tracking-luxe">
                <input type="checkbox" checked={editingColor.is_active ?? true} onChange={(e) => setEditingColor({ ...editingColor, is_active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingColor(null)} className="px-4 py-2 text-xs uppercase tracking-luxe border border-border"><X className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
              <button onClick={saveColor} className="px-4 py-2 text-xs uppercase tracking-luxe bg-noir text-cream"><Check className="w-3.5 h-3.5 inline mr-1" />Save</button>
            </div>
          </div>
        </div>
      )}

      {/* SIZE EDITOR */}
      {editingSize && (
        <div className="fixed inset-0 z-50 bg-noir/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditingSize(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background w-full max-w-md p-6 rounded-sm shadow-luxe">
            <h3 className="font-display text-xl mb-4">{editingSize.id ? "Edit size" : "New size"}</h3>
            <div className="space-y-3">
              <Field label="Label">
                <input value={editingSize.label ?? ""} onChange={(e) => setEditingSize({ ...editingSize, label: e.target.value })} className="inp" />
              </Field>
              <Field label="Label (Arabic)">
                <input value={editingSize.label_ar ?? ""} onChange={(e) => setEditingSize({ ...editingSize, label_ar: e.target.value })} className="inp" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Min weight (kg)">
                  <input type="number" step="0.1" value={editingSize.weight_min_kg ?? ""} onChange={(e) => setEditingSize({ ...editingSize, weight_min_kg: e.target.value === "" ? null : Number(e.target.value) })} className="inp" />
                </Field>
                <Field label="Max weight (kg)">
                  <input type="number" step="0.1" value={editingSize.weight_max_kg ?? ""} onChange={(e) => setEditingSize({ ...editingSize, weight_max_kg: e.target.value === "" ? null : Number(e.target.value) })} className="inp" />
                </Field>
              </div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-luxe">
                <input type="checkbox" checked={editingSize.is_active ?? true} onChange={(e) => setEditingSize({ ...editingSize, is_active: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setEditingSize(null)} className="px-4 py-2 text-xs uppercase tracking-luxe border border-border"><X className="w-3.5 h-3.5 inline mr-1" />Cancel</button>
              <button onClick={saveSize} className="px-4 py-2 text-xs uppercase tracking-luxe bg-noir text-cream"><Check className="w-3.5 h-3.5 inline mr-1" />Save</button>
            </div>
          </div>
        </div>
      )}

      <style>{`.inp{margin-top:.25rem;width:100%;background:transparent;border-bottom:1px solid hsl(var(--border));padding:.5rem 0;outline:none;font-size:.875rem}.inp:focus{border-color:hsl(var(--accent))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
