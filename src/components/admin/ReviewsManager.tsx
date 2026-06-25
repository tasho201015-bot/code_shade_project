import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus, Trash2, Save, Pin, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListReviews,
  adminUpsertReview,
  adminDeleteReview,
  adminSetReviewFlags,
} from "@/lib/reviews.functions";

interface Review {
  id?: string;
  product_id: string;
  rating: number;
  title: string | null;
  title_ar: string | null;
  body: string;
  body_ar: string | null;
  lang: "en" | "ar";
  customer_name: string;
  customer_avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  is_visible: boolean;
  is_pinned: boolean;
  sort_order: number;
  products?: { name: string } | null;
}

const empty = (productId: string): Review => ({
  product_id: productId,
  rating: 5,
  title: "",
  title_ar: "",
  body: "",
  body_ar: "",
  lang: "en",
  customer_name: "",
  customer_avatar_url: "",
  status: "approved",
  is_visible: true,
  is_pinned: false,
  sort_order: 0,
});

export function ReviewsManager() {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  const list = useServerFn(adminListReviews);
  const upsert = useServerFn(adminUpsertReview);
  const del = useServerFn(adminDeleteReview);
  const setFlags = useServerFn(adminSetReviewFlags);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        setProducts(data ?? []);
        if (data?.[0] && !productId) setProductId(data[0].id);
      });
  }, []);

  const refresh = (pid: string) => {
    if (!pid) return;
    setLoading(true);
    list({ data: { productId: pid } })
      .then((r) => setReviews(r.reviews as Review[]))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh(productId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const update = (idx: number, patch: Partial<Review>) =>
    setReviews((arr) => arr.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const save = async (idx: number) => {
    const r = reviews[idx];
    if (!r.customer_name.trim()) return toast.error("Customer name required");
    if (!r.body.trim()) return toast.error("Review body required");
    try {
      const res = await upsert({
        data: {
          ...r,
          title: r.title || null,
          title_ar: r.title_ar || null,
          body_ar: r.body_ar || null,
          customer_avatar_url: r.customer_avatar_url || null,
        },
      });
      toast.success("Saved");
      if (!r.id) update(idx, { id: res.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (idx: number) => {
    const r = reviews[idx];
    if (r.id) {
      try {
        await del({ data: { id: r.id } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
        return;
      }
    }
    setReviews((arr) => arr.filter((_, i) => i !== idx));
    toast.success("Deleted");
  };

  const togglePin = async (idx: number) => {
    const r = reviews[idx];
    const next = !r.is_pinned;
    update(idx, { is_pinned: next });
    if (r.id) {
      try {
        await setFlags({ data: { id: r.id, is_pinned: next } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    }
  };

  const toggleVisible = async (idx: number) => {
    const r = reviews[idx];
    const next = !r.is_visible;
    update(idx, { is_visible: next });
    if (r.id) {
      try {
        await setFlags({ data: { id: r.id, is_visible: next } });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed");
      }
    }
  };

  const add = () =>
    setReviews((arr) => [...arr, { ...empty(productId), sort_order: arr.length }]);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <label className="text-[11px] uppercase tracking-luxe text-muted-foreground">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mt-1 w-full md:w-96 px-3 py-2 text-sm border border-border bg-background"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <>
          <div className="space-y-4">
            {reviews.map((r, idx) => (
              <div key={r.id ?? idx} className="border border-border p-4 rounded-sm space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Customer name</label>
                    <input
                      value={r.customer_name}
                      onChange={(e) => update(idx, { customer_name: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Avatar URL</label>
                    <input
                      value={r.customer_avatar_url ?? ""}
                      onChange={(e) => update(idx, { customer_avatar_url: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Title (EN)</label>
                    <input
                      value={r.title ?? ""}
                      onChange={(e) => update(idx, { title: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                  <div dir="rtl">
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">العنوان (AR)</label>
                    <input
                      value={r.title_ar ?? ""}
                      onChange={(e) => update(idx, { title_ar: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Review (EN)</label>
                    <textarea
                      value={r.body}
                      onChange={(e) => update(idx, { body: e.target.value })}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                  <div dir="rtl">
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">المراجعة (AR)</label>
                    <textarea
                      value={r.body_ar ?? ""}
                      onChange={(e) => update(idx, { body_ar: e.target.value })}
                      rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border flex-wrap">
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Rating</span>
                      <input
                        type="number" min={1} max={5}
                        value={r.rating}
                        onChange={(e) => update(idx, { rating: Math.max(1, Math.min(5, parseInt(e.target.value || "5", 10))) })}
                        className="w-14 px-2 py-1 border border-border bg-background"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Order</span>
                      <input
                        type="number"
                        value={r.sort_order}
                        onChange={(e) => update(idx, { sort_order: parseInt(e.target.value || "0", 10) })}
                        className="w-16 px-2 py-1 border border-border bg-background"
                      />
                    </label>
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Status</span>
                      <select
                        value={r.status}
                        onChange={(e) => update(idx, { status: e.target.value as Review["status"] })}
                        className="px-2 py-1 border border-border bg-background"
                      >
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </label>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => togglePin(idx)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs uppercase tracking-luxe border ${r.is_pinned ? "bg-accent text-accent-foreground border-accent" : "border-border hover:bg-muted"}`}>
                      <Pin className="w-3 h-3" /> {r.is_pinned ? "Pinned" : "Pin"}
                    </button>
                    <button onClick={() => toggleVisible(idx)} className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-luxe hover:bg-muted">
                      {r.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {r.is_visible ? "Visible" : "Hidden"}
                    </button>
                    <button onClick={() => save(idx)} className="inline-flex items-center gap-1.5 bg-noir text-cream px-3 py-1.5 text-xs uppercase tracking-luxe">
                      <Save className="w-3 h-3" /> Save
                    </button>
                    <button onClick={() => remove(idx)} className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs uppercase tracking-luxe hover:border-destructive hover:text-destructive">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={add}
            disabled={!productId}
            className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-luxe hover:bg-muted"
          >
            <Plus className="w-3.5 h-3.5" /> Add review
          </button>
        </>
      )}
    </div>
  );
}
