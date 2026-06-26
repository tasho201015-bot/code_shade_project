import { createFileRoute, Link, Outlet, useNavigate, useRouterState, redirect } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/product-image";
import { motion } from "framer-motion";
import { Pencil, Trash2, Plus, Upload } from "lucide-react";
import { AnalyticsRangeProvider } from "@/lib/analytics-range";
import { DateRangePicker } from "@/components/admin/DateRangePicker";
import { toast } from "sonner";
import { OrderStatusBadge, ORDER_STATUSES } from "@/components/site/OrderStatusBadge";
import { normalizeOrderStatus } from "@/lib/order-status";

const AnalyticsDashboard = lazy(() => import("@/components/admin/AnalyticsDashboard").then(m => ({ default: m.AnalyticsDashboard })));
const DashboardOverview = lazy(() => import("@/components/admin/DashboardOverview").then(m => ({ default: m.DashboardOverview })));
const CategoryManager = lazy(() => import("@/components/admin/CategoryManager").then(m => ({ default: m.CategoryManager })));
const TeamManager = lazy(() => import("@/components/admin/TeamManager").then(m => ({ default: m.TeamManager })));
const AttributesManager = lazy(() => import("@/components/admin/AttributesManager").then(m => ({ default: m.AttributesManager })));
const ProductFAQManager = lazy(() => import("@/components/admin/ProductFAQManager").then(m => ({ default: m.ProductFAQManager })));
const NotificationsManager = lazy(() => import("@/components/admin/NotificationsManager").then(m => ({ default: m.NotificationsManager })));
const CampaignsManager = lazy(() => import("@/components/admin/CampaignsManager").then(m => ({ default: m.CampaignsManager })));
const ReviewsManager = lazy(() => import("@/components/admin/ReviewsManager").then(m => ({ default: m.ReviewsManager })));
import { getOfferStatus, isoToLocalInput, localInputToIso, type OfferStatus } from "@/lib/product-offer";
import { useServerFn } from "@tanstack/react-start";
import { adminListAllOrders, adminUpdateOrderStatus } from "@/lib/analytics.functions";

import {
  fetchAllColors, fetchAllSizes,
  fetchProductColorIds, fetchProductSizeIds,
  setProductColors, setProductSizes,
  type ProductColor, type ProductSize,
} from "@/lib/product-attributes";
import {
  fetchVariantAvailability, saveVariantAvailability, variantKey,
  type VariantStatus,
} from "@/lib/product-variants";

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
  name_ar: string | null;
  description_ar: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_title_ar: string | null;
  meta_description_ar: string | null;
  price: number;
  image_url: string | null;
  category: string;
  stock: number;
  is_active: boolean;
  compare_at_price: number | null;
  offer_enabled: boolean;
  offer_starts_at: string | null;
  offer_ends_at: string | null;
  view_counter_period: string;
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
  name: "", description: "",
  name_ar: "", description_ar: "",
  meta_title: "", meta_description: "",
  meta_title_ar: "", meta_description_ar: "",
  price: 0, image_url: "", category: "abayas", stock: 0, is_active: true,
  compare_at_price: null, offer_enabled: false, offer_starts_at: null, offer_ends_at: null,
  view_counter_period: "24h",
};

function OfferStatusChip({ status, endsAt }: { status: OfferStatus; endsAt?: string | null }) {
  if (status === "none") {
    return <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase tracking-luxe border border-border rounded-sm text-muted-foreground">No offer</span>;
  }
  const map: Record<Exclude<OfferStatus, "none">, string> = {
    active: "bg-accent text-accent-foreground",
    scheduled: "bg-noir text-cream",
    expired: "bg-muted text-muted-foreground",
  };
  const label = status === "active" ? "Active offer" : status === "scheduled" ? "Scheduled" : "Expired";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[10px] uppercase tracking-luxe rounded-sm ${map[status]}`}>
      {label}
      {endsAt && status !== "expired" && (
        <span className="opacity-80 normal-case tracking-normal">· ends {new Date(endsAt).toLocaleDateString()}</span>
      )}
    </span>
  );
}

function AdminPage() {
  const { isAdmin, loading, user } = useAuth();
  const nav = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  // When a child route is active (e.g. /admin/sales-booster), render only the Outlet
  // so the child layout owns the full screen. The dashboard shell shows on exact /admin.
  const isChild = pathname !== "/admin" && pathname !== "/admin/";
  const [tab, setTab] = useState<"dashboard" | "overview" | "orders-analytics" | "performance" | "products" | "categories" | "team" | "orders" | "attributes" | "faqs" | "notifications" | "campaigns" | "reviews">("dashboard");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<{ slug: string; name: string }[]>([]);
  const [editing, setEditing] = useState<Product | (Omit<Product, "id"> & { id?: string }) | null>(null);
  const [uploading, setUploading] = useState(false);
  const [allColors, setAllColors] = useState<ProductColor[]>([]);
  const [allSizes, setAllSizes] = useState<ProductSize[]>([]);
  const [selColorIds, setSelColorIds] = useState<string[]>([]);
  const [selSizeIds, setSelSizeIds] = useState<string[]>([]);
  const [variantMatrix, setVariantMatrix] = useState<Record<string, VariantStatus>>({});

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

  const listOrders = useServerFn(adminListAllOrders);
  const updateOrderStatusFn = useServerFn(adminUpdateOrderStatus);

  const refresh = async () => {
    const [p, c] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("slug,name").order("sort_order", { ascending: true }),
    ]);
    setProducts((p.data ?? []) as Product[]);
    setCategoryOptions((c.data ?? []) as { slug: string; name: string }[]);
    try {
      const o = await listOrders({ data: {} });
      setOrders((o ?? []) as Order[]);
    } catch {
      setOrders([]);
    }
  };


  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  // Load global attribute catalog once admin is verified
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const [c, s] = await Promise.all([fetchAllColors(), fetchAllSizes()]);
      setAllColors(c); setAllSizes(s);
    })();
  }, [isAdmin]);

  // When opening editor, load that product's assigned colors/sizes
  useEffect(() => {
    if (!editing) { setSelColorIds([]); setSelSizeIds([]); setVariantMatrix({}); return; }
    const pid = "id" in editing ? editing.id : undefined;
    if (!pid) { setSelColorIds([]); setSelSizeIds([]); setVariantMatrix({}); return; }
    (async () => {
      const [cids, sids, mtx] = await Promise.all([
        fetchProductColorIds(pid),
        fetchProductSizeIds(pid),
        fetchVariantAvailability(pid),
      ]);
      setSelColorIds(cids); setSelSizeIds(sids); setVariantMatrix(mtx);
    })();
  }, [editing]);

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
      name_ar: editing.name_ar || null,
      description_ar: editing.description_ar || null,
      meta_title: editing.meta_title || null,
      meta_description: editing.meta_description || null,
      meta_title_ar: editing.meta_title_ar || null,
      meta_description_ar: editing.meta_description_ar || null,
      price: Number(editing.price),
      image_url: editing.image_url,
      category: editing.category,
      stock: Number(editing.stock),
      is_active: editing.is_active,
      compare_at_price: editing.compare_at_price == null || editing.compare_at_price === ("" as unknown as number)
        ? null
        : Number(editing.compare_at_price),
      offer_enabled: !!editing.offer_enabled,
      offer_starts_at: editing.offer_starts_at,
      offer_ends_at: editing.offer_ends_at,
      view_counter_period: editing.view_counter_period || "24h",
    };
    let productId: string | undefined = "id" in editing ? editing.id : undefined;
    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) { toast.error(error.message || "Failed to save product"); return; }
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !data) { toast.error(error?.message || "Failed to save product"); return; }
      productId = data.id;
    }
    // Save attribute links + variant availability matrix
    if (productId) {
      const [colorRes, sizeRes] = await Promise.all([
        setProductColors(productId, selColorIds),
        setProductSizes(productId, selSizeIds),
      ]);
      if (colorRes.error) toast.error(`Colors: ${colorRes.error.message}`);
      if (sizeRes.error) toast.error(`Sizes: ${sizeRes.error.message}`);
      const matrixRes = await saveVariantAvailability(productId, selColorIds, selSizeIds, variantMatrix);
      if (matrixRes.error) toast.error(`Variants: ${matrixRes.error.message}`);
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
    try {
      await updateOrderStatusFn({ data: { id, status } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update");
    }
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

  if (isChild) {
    return <Outlet />;
  }

  return (
    <div className="admin-shell bg-background min-h-screen text-foreground">
      <Header />
      <div className="pt-32 pb-32 max-w-7xl mx-auto px-6 lg:px-10">

        <div className="text-[10px] uppercase tracking-luxe text-accent">Atelier</div>
        <h1 className="font-display text-5xl md:text-6xl mt-2">Admin dashboard</h1>

        <div className="mt-10 flex gap-2 border-b border-border flex-wrap items-center">
          {([
            ["dashboard", "Dashboard"],
            ["overview", "Overview"],
            ["orders-analytics", "Orders"],
            ["performance", "Performance"],
            ["products", "Products"],
            ["categories", "Categories"],
            ["attributes", "Attributes"],
            ["faqs", "FAQs"],
            ["reviews", "Reviews"],
            ["notifications", "Notifications"],
            ["campaigns", "Campaigns"],
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
          <Link
            to="/admin/shipping"
            className="px-6 py-3 text-xs uppercase tracking-luxe text-muted-foreground hover:text-foreground transition-colors"
          >
            Shipping →
          </Link>
        </div>



        {(tab === "dashboard" || tab === "overview" || tab === "orders-analytics" || tab === "performance") && (
          <AnalyticsRangeProvider>
            <div className="mt-6 flex items-center justify-between gap-4 flex-wrap">
              <div className="text-[10px] uppercase tracking-luxe text-muted-foreground">
                Date range
              </div>
              <DateRangePicker />
            </div>
            {tab === "dashboard" && <DashboardOverview />}
            {tab === "overview" && <AnalyticsDashboard section="overview" />}
            {tab === "orders-analytics" && <AnalyticsDashboard section="orders" />}
            {tab === "performance" && <AnalyticsDashboard section="performance" />}
          </AnalyticsRangeProvider>
        )}
        {tab === "categories" && <CategoryManager />}
        {tab === "attributes" && <AttributesManager />}
        {tab === "faqs" && <ProductFAQManager />}
        {tab === "reviews" && <ReviewsManager />}
        {tab === "notifications" && <NotificationsManager />}
        {tab === "campaigns" && <CampaignsManager />}
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
                    <img loading="lazy" decoding="async" src={resolveImage(p.image_url)} alt="" className="w-full h-full object-cover"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg truncate">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">{p.category} · stock {p.stock} · {p.is_active ? "active" : "hidden"}</div>
                    <div className="text-sm tabular-nums mt-1 flex items-center gap-2 flex-wrap">
                      <span>${Number(p.price).toFixed(2)}</span>
                      {p.compare_at_price != null && Number(p.compare_at_price) > Number(p.price) && (
                        <span className="text-muted-foreground line-through text-xs">${Number(p.compare_at_price).toFixed(2)}</span>
                      )}
                      <OfferStatusChip status={getOfferStatus(p)} endsAt={p.offer_ends_at} />
                    </div>
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
                    value={normalizeOrderStatus(o.status)}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="bg-transparent border border-border px-3 py-2 text-xs uppercase tracking-luxe"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
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
              <ProductContentTabs
                editing={editing}
                setEditing={setEditing as (p: Product | Omit<Product, "id">) => void}
              />
              {[
                { k: "price", label: "Price (USD)", type: "number" },
                { k: "stock", label: "Stock", type: "number" },
              ].map((f) => (
                <div key={f.k}>
                  <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">{f.label}</label>
                  <input
                    type={f.type}
                    value={String((editing as unknown as Record<string, unknown>)[f.k] ?? "")}
                    onChange={(e) => setEditing({ ...editing, [f.k]: Number(e.target.value) })}
                    className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                  />
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
                      <img loading="lazy" decoding="async" src={resolveImage(editing.image_url)} alt="" className="w-12 h-14 object-cover bg-muted" />
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
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Available colors</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allColors.length === 0 && <div className="text-xs text-muted-foreground">No colors yet — add in the Attributes tab.</div>}
                  {allColors.map((c) => {
                    const on = selColorIds.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setSelColorIds((p) => on ? p.filter((x) => x !== c.id) : [...p, c.id])}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 border text-xs ${on ? "border-noir bg-noir text-cream" : "border-border hover:border-noir"}`}>
                        <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c.hex }} />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Available sizes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allSizes.length === 0 && <div className="text-xs text-muted-foreground">No sizes yet — add in the Attributes tab.</div>}
                  {allSizes.map((s) => {
                    const on = selSizeIds.includes(s.id);
                    return (
                      <button key={s.id} type="button"
                        onClick={() => setSelSizeIds((p) => on ? p.filter((x) => x !== s.id) : [...p, s.id])}
                        className={`inline-flex items-center px-3 py-1.5 border text-xs ${on ? "border-noir bg-noir text-cream" : "border-border hover:border-noir"}`}>
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Variant availability matrix */}
              {selColorIds.length > 0 && selSizeIds.length > 0 && (
                <div className="pt-2 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-3">
                    Variant availability
                  </div>
                  <div className="overflow-x-auto -mx-2">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr>
                          <th className="text-left px-2 py-2 font-normal text-muted-foreground"></th>
                          {selSizeIds.map((sid) => {
                            const s = allSizes.find((x) => x.id === sid);
                            return (
                              <th key={sid} className="px-2 py-2 font-medium text-center">
                                {s?.label ?? "—"}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {selColorIds.map((cid) => {
                          const c = allColors.find((x) => x.id === cid);
                          return (
                            <tr key={cid} className="border-t border-border/50">
                              <td className="px-2 py-2 whitespace-nowrap">
                                <span className="inline-flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full border border-border" style={{ backgroundColor: c?.hex }} />
                                  {c?.name ?? "—"}
                                </span>
                              </td>
                              {selSizeIds.map((sid) => {
                                const k = variantKey(cid, sid);
                                const v = variantMatrix[k] ?? "available";
                                return (
                                  <td key={sid} className="px-1 py-1">
                                    <select
                                      value={v}
                                      onChange={(e) =>
                                        setVariantMatrix((m) => ({ ...m, [k]: e.target.value as VariantStatus }))
                                      }
                                      className="w-full bg-transparent border border-border px-2 py-1 text-[11px] uppercase tracking-luxe"
                                    >
                                      <option value="available">Available</option>
                                      <option value="out_of_stock">Out of stock</option>
                                      <option value="hidden">Hidden</option>
                                    </select>
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* Offer / Sale */}
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-3">Offer / Sale</div>
                <label className="flex items-center gap-2 text-xs uppercase tracking-luxe mb-3">
                  <input type="checkbox" checked={!!editing.offer_enabled}
                    onChange={(e) => setEditing({ ...editing, offer_enabled: e.target.checked })}/>
                  Enable offer
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Original price</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={editing.compare_at_price ?? ""}
                      onChange={(e) => setEditing({ ...editing, compare_at_price: e.target.value === "" ? null : Number(e.target.value) })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Sale price (current)</label>
                    <input
                      type="number" min="0" step="0.01"
                      value={editing.price}
                      onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Starts at</label>
                    <input
                      type="datetime-local"
                      value={isoToLocalInput(editing.offer_starts_at)}
                      onChange={(e) => setEditing({ ...editing, offer_starts_at: localInputToIso(e.target.value) })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Ends at</label>
                    <input
                      type="datetime-local"
                      value={isoToLocalInput(editing.offer_ends_at)}
                      onChange={(e) => setEditing({ ...editing, offer_ends_at: localInputToIso(e.target.value) })}
                      className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 text-xs">
                  <OfferStatusChip status={getOfferStatus(editing)} endsAt={editing.offer_ends_at} />
                </div>
              </div>

              {/* Product views counter period */}
              <div className="pt-2 border-t border-border/60">
                <div className="text-[10px] uppercase tracking-luxe text-muted-foreground mb-2">Product views counter</div>
                <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Reporting period</label>
                <select
                  value={editing.view_counter_period || "24h"}
                  onChange={(e) => setEditing({ ...editing, view_counter_period: e.target.value })}
                  className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="365d">Last 365 Days</option>
                  <option value="all">All Time</option>
                </select>
                <p className="text-[10px] text-muted-foreground mt-1">Counts unique viewers within the selected period.</p>
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

type EditingProduct = Product | Omit<Product, "id">;

function ProductContentTabs({
  editing,
  setEditing,
}: {
  editing: EditingProduct;
  setEditing: (p: EditingProduct) => void;
}) {
  const [tab, setTab] = useState<"en" | "ar">("en");
  const rec = editing as unknown as Record<string, unknown>;
  const set = (k: string, v: string) => setEditing({ ...(editing as Product), [k]: v } as EditingProduct);

  const tabBtn = (id: "en" | "ar", label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-4 py-2 text-[10px] uppercase tracking-luxe border-b-2 transition-colors ${
        tab === id ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );

  const enField = (k: string, label: string, textarea = false) => (
    <div key={k}>
      <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          value={String(rec[k] ?? "")}
          onChange={(e) => set(k, e.target.value)}
          className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm resize-none"
        />
      ) : (
        <input
          type="text"
          value={String(rec[k] ?? "")}
          onChange={(e) => set(k, e.target.value)}
          className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm"
        />
      )}
    </div>
  );

  const arField = (k: string, label: string, textarea = false) => (
    <div key={k}>
      <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">{label}</label>
      {textarea ? (
        <textarea
          rows={3}
          dir="rtl"
          lang="ar"
          placeholder="اترك فارغًا لاستخدام النص الإنجليزي"
          value={String(rec[k] ?? "")}
          onChange={(e) => set(k, e.target.value)}
          className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm resize-none font-arabic text-right"
        />
      ) : (
        <input
          type="text"
          dir="rtl"
          lang="ar"
          placeholder="اترك فارغًا لاستخدام النص الإنجليزي"
          value={String(rec[k] ?? "")}
          onChange={(e) => set(k, e.target.value)}
          className="mt-1 w-full bg-transparent border-b border-border focus:border-accent py-2 outline-none text-sm font-arabic text-right"
        />
      )}
    </div>
  );

  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-4">
        {tabBtn("en", "English content")}
        {tabBtn("ar", "المحتوى العربي")}
      </div>
      {tab === "en" ? (
        <div className="space-y-4">
          {enField("name", "Name")}
          {enField("description", "Description", true)}
          <details className="border border-border rounded-sm">
            <summary className="px-3 py-2 text-[10px] uppercase tracking-luxe text-muted-foreground cursor-pointer hover:text-foreground">
              SEO (English)
            </summary>
            <div className="px-3 pb-3 space-y-3">
              {enField("meta_title", "Meta title")}
              {enField("meta_description", "Meta description", true)}
            </div>
          </details>
        </div>
      ) : (
        <div className="space-y-4">
          {arField("name_ar", "الاسم (Name)")}
          {arField("description_ar", "الوصف (Description)", true)}
          <details className="border border-border rounded-sm">
            <summary className="px-3 py-2 text-[10px] uppercase tracking-luxe text-muted-foreground cursor-pointer hover:text-foreground">
              SEO (Arabic)
            </summary>
            <div className="px-3 pb-3 space-y-3">
              {arField("meta_title_ar", "عنوان SEO (Meta title)")}
              {arField("meta_description_ar", "وصف SEO (Meta description)", true)}
            </div>
          </details>
          <p className="text-[10px] text-muted-foreground">
            Leave any field empty to fall back to the English version on the Arabic storefront.
          </p>
        </div>
      )}
    </div>
  );
}
