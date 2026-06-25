import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListProductFaqs,
  upsertProductFaq,
  deleteProductFaq,
} from "@/lib/product-experience.functions";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

interface Faq {
  id?: string;
  product_id: string;
  question: string;
  question_ar: string | null;
  answer: string;
  answer_ar: string | null;
  sort_order: number;
  is_active: boolean;
}

const emptyFaq = (productId: string): Faq => ({
  product_id: productId, question: "", question_ar: "", answer: "", answer_ar: "",
  sort_order: 0, is_active: true,
});

export function ProductFAQManager() {
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [productId, setProductId] = useState<string>("");
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(false);
  const list = useServerFn(adminListProductFaqs);
  const upsert = useServerFn(upsertProductFaq);
  const del = useServerFn(deleteProductFaq);

  useEffect(() => {
    supabase.from("products").select("id, name").order("name").then(({ data }) => {
      setProducts(data ?? []);
      if (data?.[0] && !productId) setProductId(data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    list({ data: { productId } })
      .then((r) => setFaqs(r.faqs as Faq[]))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
  }, [productId, list]);

  const update = (idx: number, patch: Partial<Faq>) => {
    setFaqs((arr) => arr.map((f, i) => (i === idx ? { ...f, ...patch } : f)));
  };

  const save = async (idx: number) => {
    const f = faqs[idx];
    if (!f.question.trim() || !f.answer.trim()) { toast.error("Question and answer required"); return; }
    try {
      const res = await upsert({ data: f });
      toast.success("Saved");
      if (!f.id) update(idx, { id: res.id });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (idx: number) => {
    const f = faqs[idx];
    if (f.id) {
      try { await del({ data: { id: f.id } }); } catch (e) { toast.error(e instanceof Error ? e.message : "Delete failed"); return; }
    }
    setFaqs((arr) => arr.filter((_, i) => i !== idx));
    toast.success("Deleted");
  };

  const add = () => setFaqs((arr) => [...arr, { ...emptyFaq(productId), sort_order: arr.length }]);

  return (
    <div className="mt-8 space-y-6">
      <div>
        <label className="text-[11px] uppercase tracking-luxe text-muted-foreground">Product</label>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="mt-1 w-full md:w-96 px-3 py-2 text-sm border border-border bg-background"
        >
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <>
          <div className="space-y-4">
            {faqs.map((f, idx) => (
              <div key={f.id ?? idx} className="border border-border p-4 rounded-sm space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Question (EN)</label>
                    <input value={f.question} onChange={(e) => update(idx, { question: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background" />
                  </div>
                  <div dir="rtl">
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">السؤال (AR)</label>
                    <input value={f.question_ar ?? ""} onChange={(e) => update(idx, { question_ar: e.target.value })}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">Answer (EN)</label>
                    <textarea value={f.answer} onChange={(e) => update(idx, { answer: e.target.value })} rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background" />
                  </div>
                  <div dir="rtl">
                    <label className="text-[10px] uppercase tracking-luxe text-muted-foreground">الإجابة (AR)</label>
                    <textarea value={f.answer_ar ?? ""} onChange={(e) => update(idx, { answer_ar: e.target.value })} rows={3}
                      className="mt-1 w-full px-3 py-2 text-sm border border-border bg-background" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <span className="text-muted-foreground">Order</span>
                      <input type="number" value={f.sort_order} onChange={(e) => update(idx, { sort_order: parseInt(e.target.value || "0", 10) })}
                        className="w-16 px-2 py-1 border border-border bg-background" />
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={f.is_active} onChange={(e) => update(idx, { is_active: e.target.checked })} />
                      <span>Active</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
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
          <button onClick={add} disabled={!productId}
            className="inline-flex items-center gap-2 border border-border px-4 py-2 text-xs uppercase tracking-luxe hover:bg-muted">
            <Plus className="w-3.5 h-3.5" /> Add FAQ
          </button>
        </>
      )}
    </div>
  );
}
