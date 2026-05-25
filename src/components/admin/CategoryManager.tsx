import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Plus, GripVertical, Check, X } from "lucide-react";
import { toast } from "sonner";

export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function CategoryManager() {
  const [cats, setCats] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const refresh = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCats((data ?? []) as AdminCategory[]);
  };

  useEffect(() => {
    refresh();
  }, []);

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const slug = slugify(name);
    if (!slug) {
      toast.error("Invalid name");
      return;
    }
    setCreating(true);
    const nextOrder = (cats[cats.length - 1]?.sort_order ?? 0) + 10;
    const { error } = await supabase
      .from("categories")
      .insert({ name, slug, sort_order: nextOrder });
    setCreating(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewName("");
    toast.success(`Category “${name}” added`);
    refresh();
  };

  const startRename = (c: AdminCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const saveRename = async (c: AdminCategory) => {
    const name = editName.trim();
    if (!name || name === c.name) {
      setEditingId(null);
      return;
    }
    const { error } = await supabase
      .from("categories")
      .update({ name })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditingId(null);
    toast.success("Renamed");
    refresh();
  };

  const remove = async (c: AdminCategory) => {
    if (c.slug === "uncategorized") {
      toast.error("The fallback category cannot be deleted.");
      return;
    }
    if (
      !confirm(
        `Delete “${c.name}”? Any products in it will be moved to Uncategorized (not deleted).`,
      )
    )
      return;
    const { error } = await supabase.from("categories").delete().eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Category deleted, products moved to Uncategorized");
    refresh();
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= cats.length) return;
    const a = cats[idx];
    const b = cats[target];
    // swap sort_order
    const updates = [
      supabase.from("categories").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("categories").update({ sort_order: a.sort_order }).eq("id", b.id),
    ];
    await Promise.all(updates);
    refresh();
  };

  const toggleActive = async (c: AdminCategory) => {
    const { error } = await supabase
      .from("categories")
      .update({ is_active: !c.is_active })
      .eq("id", c.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
  };

  return (
    <div className="mt-8 space-y-6">
      <form
        onSubmit={addCategory}
        className="glass p-5 rounded-sm border border-border flex flex-col sm:flex-row gap-3"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name (e.g. Kaftans)"
          className="flex-1 bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
        />
        <button
          type="submit"
          disabled={creating || !newName.trim()}
          className="bg-noir text-cream px-5 py-2 text-xs uppercase tracking-luxe btn-glow disabled:opacity-50 inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add category
        </button>
      </form>

      <div className="glass rounded-sm border border-border divide-y divide-border">
        <div className="px-5 py-3 text-[10px] uppercase tracking-luxe text-muted-foreground grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center">
          <span className="w-6" />
          <span>Category</span>
          <span>Visible</span>
          <span className="text-right">Actions</span>
        </div>
        {loading && (
          <div className="px-5 py-10 text-sm text-muted-foreground">Loading categories…</div>
        )}
        {!loading && cats.length === 0 && (
          <div className="px-5 py-10 text-sm text-muted-foreground">No categories yet.</div>
        )}
        <AnimatePresence initial={false}>
          {cats.map((c, i) => (
            <motion.div
              key={c.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="px-5 py-3 grid grid-cols-[auto_1fr_auto_auto] gap-4 items-center"
            >
              <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Move up"
                  className="hover:text-accent disabled:opacity-30 text-xs leading-none"
                >
                  ▲
                </button>
                <GripVertical className="w-3 h-3 opacity-40" />
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === cats.length - 1}
                  aria-label="Move down"
                  className="hover:text-accent disabled:opacity-30 text-xs leading-none"
                >
                  ▼
                </button>
              </div>

              <div className="min-w-0">
                {editingId === c.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(c);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 bg-transparent border-b border-accent py-1 outline-none text-sm"
                    />
                    <button
                      onClick={() => saveRename(c)}
                      className="p-1.5 text-accent hover:bg-accent/10"
                      aria-label="Save"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1.5 text-muted-foreground hover:bg-muted"
                      aria-label="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="font-display text-lg truncate">{c.name}</div>
                    <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mt-0.5">
                      /{c.slug}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => toggleActive(c)}
                className={`px-3 py-1 text-[10px] uppercase tracking-luxe border transition-colors ${
                  c.is_active
                    ? "border-accent text-accent"
                    : "border-border text-muted-foreground"
                }`}
                disabled={c.slug === "uncategorized"}
                title={c.slug === "uncategorized" ? "Always active" : ""}
              >
                {c.is_active ? "Visible" : "Hidden"}
              </button>

              <div className="flex items-center gap-1 justify-end">
                {editingId !== c.id && (
                  <button
                    onClick={() => startRename(c)}
                    className="p-2 hover:text-accent"
                    aria-label="Rename"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => remove(c)}
                  className="p-2 hover:text-destructive disabled:opacity-30 disabled:hover:text-muted-foreground"
                  aria-label="Delete"
                  disabled={c.slug === "uncategorized"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <p className="text-xs text-muted-foreground">
        Deleting a category never deletes products — they're moved to{" "}
        <span className="text-accent">Uncategorized</span> so you can re-assign them safely.
      </p>
    </div>
  );
}
