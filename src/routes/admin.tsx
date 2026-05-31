import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import { motion } from "framer-motion";
import { Pencil, Trash2, Plus, Upload } from "lucide-react";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { toast } from "sonner";
import { OrderStatusBadge, ORDER_STATUSES } from "@/components/site/OrderStatusBadge";
import { TeamManager } from "@/components/admin/TeamManager";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: "/login", search: { redirect: "/admin" } });
    }
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      throw redirect({ to: "/" });
    }
  },
  component: AdminPage,
});

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
  is_active: boolean;
}

interface Order {
  id: string;
  user_id: string;
  total: number;
  status: string;
  created_at: string;
  phone: string;
  shipping_address: string;
}

const empty: Omit<Product, "id"> = {
  name: "", description: "", price: 0, image_url: "", category: "abayas", stock: 0, is_active: true,
};

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"overview" | "orders-analytics" | "performance" | "products" | "categories" | "team" | "orders">("overview");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ slug: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Product | (Omit<Product, "id"> & { id?: string }) | null>(null);
  const [uploading, setUploading] = useState(false);

  const ensureAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error("You must be signed in.");
      return false;
    }
    const { data: ok } = await supabase.rpc("has_role", {
      _user_id: session.user.id,
      _role: "admin",
    });
    if (!ok) {
      toast.error("Admins only.");
      return false;
    }
    return true;
  };

  const uploadImage = async (file: File) => {
    if (!(await ensureAdmin())) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message || "Upload failed");
      return;
    }
    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    setEditing((cur) => (cur ? { ...cur, image_url: pub.publicUrl } : cur));
    setUploading(false);
    toast.success("Image uploaded");
  };

  useEffect(() => {
    if (!loading && user && !isAdmin) nav({ to: "/" });
  }, [loading, user, isAdmin, nav]);

  const refresh = async () => {
    const [p, o, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("slug,name").order("sort_order", { ascending: true }),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setOrders((o.data ?? []) as Order[]);
    setCategoryOptions((c.data ?? []) as { slug: string; name: string }[]);
  };

  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  const save = async () => {
    if (!editing) return;
    if (!(await ensureAdmin())) return;
    if (!editing.name?.trim() || !Number(editing.price)) {
      toast.error("Name and price are required.");
      return;
    }
    const payload = {
      name: editing.name,
      description: editing.description,
      price: Number(editing.price),
      image_url: editing.image_url,
      category: editing.category,
      stock: Number(editing.stock),
      is_active: editing.is_active,
    };
    const { error } =
      "id" in editing && editing.id
        ? await supabase.from("products").update(payload).eq("id", editing.id)
        : await supabase.from("products").insert(payload);
    if (error) {
      toast.error(error.message || "Failed to save product");
      return;
    }
    toast.success("Product saved");
    setEditing(null);
    refresh();
  };

  const del = async (id: string) => {
    if (!(await ensureAdmin())) return;
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message || "Failed to delete");
      return;
    }
    refresh();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("orders").update({ status }).eq("id", id);
    refresh();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="font-display text-3xl">Admin only</h1>
        <p className="text-muted-foreground text-sm">Your account does not have admin privileges.</p>
        <Link to="/" className="link-underline text-xs uppercase tracking-luxe">Back home</Link>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="pt-32 pb-32 max-w-7xl mx-auto px-6 lg:px-10">
        <div className="text-[10px] uppercase tracking-luxe text-accent">Atelier</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Admin dashboard</h1>

        <div className="mt-10 flex gap-2 border-b border-border flex-wrap items-center">
          {([
            ["overview", "Overview"],
            ["orders-analytics", "Orders"],
            ["performance", "Performance"],
            ["products", "Products"],
            ["categories", "Categories"],
            ["team", "Team"],
            ["orders", "Manage orders"],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-xs uppercase tracking-luxe transition-colors ${
                tab === t ? "border-b-2 border-noir text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
          <Link
            to="/admin/sales-booster"
            className="px-6 py-3 text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
          >
            Sales Booster →
          </Link>
        </div>


        {tab === "overview" && <AnalyticsDashboard section="overview" />}
        {tab === "orders-analytics" && <AnalyticsDashboard section="orders" />}
        {tab === "performance" && <AnalyticsDashboard section="performance" />}
        {tab === "categories" && <CategoryManager />}
        {tab === "team" && <TeamManager />}

        {tab === "products" && (
          <div className="mt-8">
            {isAdmin && (
              <button
                onClick={() => setEditing({ ...empty })}
                className="inline-flex items-center gap-2 bg-noir text-cream px-5 py-3 text-xs uppercase tracking-luxe btn-glow"
              >
                <Plus className="w-4 h-4"/> New product
              </button>
            )}

            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
              {products.map((p) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="glass p-4 rounded-sm flex gap-4">
                  <div className="w-20 h-24 bg-muted overflow-hidden flex-shrink-0">
                    <img src={resolveImage(p.image_url)} alt="" className="w-full h-full object-cover"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.category} · stock {p.stock} · {p.is_active ? "active" : "hidden"}</div>
                    <div className="text-sm tabular-nums mt-1">${Number(p.price).toFixed(2)}</div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => setEditing(p)} className="p-2 hover:text-accent"><Pencil className="w-4 h-4"/></button>
                    <button onClick={() => del(p.id)} className="p-2 hover:text-destructive"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div className="mt-8 space-y-3">
            {orders.length === 0 && <div className="text-muted-foreground">No orders yet.</div>}
            {orders.map((o) => (
              <motion.div key={o.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass p-5 rounded-sm grid lg:grid-cols-[1fr_2fr_auto_auto] gap-4 items-center">
                <div>
                  <div className="font-mono text-xs">#{o.id.slice(0, 8)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleString()}</div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>{o.shipping_address}</div>
                  <div>{o.phone}</div>
                </div>
                <div className="font-display text-xl tabular-nums">${Number(o.total).toFixed(2)}</div>
                <div className="flex flex-col gap-2 items-end">
                  <OrderStatusBadge status={o.status} />
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="bg-transparent border border-border px-3 py-2 text-xs uppercase tracking-luxe"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replaceAll("_", " ")}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-noir/60 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto" onClick={() => setEditing(null)}>
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-background w-full max-w-lg shadow-luxe rounded-sm flex flex-col max-h-[90vh] my-auto"
          >
            <div className="px-6 sm:px-8 pt-6 sm:pt-8">
              <h3 className="font-display text-2xl">{("id" in editing && editing.id) ? "Edit product" : "New product"}</h3>
            </div>
            <div className="px-6 sm:px-8 py-6 space-y-4 overflow-y-auto flex-1">
              {[
                { k: "name", label: "Name" },
                { k: "description", label: "Description", textarea: true },
                { k: "price", label: "Price (USD)", type: "number" },
                { k: "stock", label: "Stock", type: "number" },
              ].map((f) => (
                <div key={f.k}>
                  <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">{f.label}</label>
                  {f.textarea ? (
                    <textarea
                      rows={3}
                      value={String((editing as unknown as Record<string, unknown>)[f.k] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.k]: e.target.value })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm resize-none"
                    />
                  ) : (
                    <input
                      type={f.type ?? "text"}
                      value={String((editing as unknown as Record<string, unknown>)[f.k] ?? "")}
                      onChange={(e) => setEditing({ ...editing, [f.k]: f.type === "number" ? Number(e.target.value) : e.target.value })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  )}
                </div>
              ))}
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Image</label>
                <input
                  type="text"
                  placeholder="https://… or upload below"
                  value={editing.image_url ?? ""}
                  onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
                  className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                />
                {isAdmin && (
                  <div className="mt-3 flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-luxe border border-border cursor-pointer hover:border-accent">
                      <Upload className="w-4 h-4" />
                      {uploading ? "Uploading…" : "Upload image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadImage(f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    {editing.image_url && (
                      <img src={resolveImage(editing.image_url)} alt="" className="w-12 h-14 object-cover bg-muted" />
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Category</label>
                <select
                  value={editing.category}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="mt-1 w-full bg-transparent border-b border-border py-2 text-sm outline-none"
                >
                  {categoryOptions.length === 0 && <option value={editing.category}>{editing.category}</option>}
                  {categoryOptions.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs uppercase tracking-luxe">
                <input type="checkbox" checked={editing.is_active}
                  onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}/>
                Active
              </label>
            </div>
            <div className="px-6 sm:px-8 py-4 flex gap-3 justify-end border-t border-border bg-background sticky bottom-0">
              <button onClick={() => setEditing(null)} className="px-5 py-2 text-xs uppercase tracking-luxe border border-border">Cancel</button>
              <button onClick={save} className="bg-noir text-cream px-5 py-2 text-xs uppercase tracking-luxe btn-glow">Save</button>
            </div>
          </motion.div>
        </div>
      )}

      <Footer />
    </div>
  );
}
