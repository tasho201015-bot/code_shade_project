import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListBackInStock,
  adminListNotifications,
  adminNotifyRestocked,
} from "@/lib/product-experience.functions";
import { toast } from "sonner";
import { Send } from "lucide-react";

interface Sub {
  id: string; product_id: string; email: string;
  color_id: string | null; size_id: string | null;
  channel: string; notified_at: string | null; created_at: string;
  products: { name: string; stock: number } | null;
}
interface Log {
  id: string; channel: string; template: string; recipient: string;
  subject: string | null; status: string; error: string | null;
  sent_at: string | null; created_at: string;
}

export function NotificationsManager() {
  const [tab, setTab] = useState<"subs" | "log">("subs");
  const [subs, setSubs] = useState<Sub[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; stock: number }[]>([]);
  const [targetProduct, setTargetProduct] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const listSubs = useServerFn(adminListBackInStock);
  const listLogs = useServerFn(adminListNotifications);
  const notify = useServerFn(adminNotifyRestocked);

  const refresh = async () => {
    const [s, l, p] = await Promise.all([
      listSubs(),
      listLogs(),
      supabase.from("products").select("id, name, stock").order("name", { ascending: true }),
    ]);
    setSubs(s.subscriptions as Sub[]);
    setLogs(l.notifications as Log[]);
    setProducts((p.data ?? []) as { id: string; name: string; stock: number }[]);
  };
  useEffect(() => { refresh().catch((e) => toast.error(e.message)); }, []);

  // Counts per product of pending (logged-in) subs
  const pendingByProduct = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of subs) {
      if (s.notified_at) continue;
      m.set(s.product_id, (m.get(s.product_id) ?? 0) + 1);
    }
    return m;
  }, [subs]);

  const triggerNotify = async (productId?: string) => {
    setBusy(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : undefined;
      const r = await notify({ data: { siteOrigin: origin, productId: productId || undefined } });
      toast.success(`Sent ${r.sent}, failed ${r.failed}`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-2 border-b border-border">
          {(["subs", "log"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-xs uppercase tracking-luxe ${tab === t ? "border-b-2 border-noir" : "text-muted-foreground"}`}>
              {t === "subs" ? "Back-in-stock subs" : "Notification log"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={targetProduct}
            onChange={(e) => setTargetProduct(e.target.value)}
            className="bg-transparent border border-border px-3 py-2 text-xs uppercase tracking-luxe"
          >
            <option value="">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} {pendingByProduct.get(p.id) ? `(${pendingByProduct.get(p.id)})` : ""}
              </option>
            ))}
          </select>
          <button onClick={() => triggerNotify(targetProduct)} disabled={busy}
            className="inline-flex items-center gap-2 bg-noir text-cream px-4 py-2 text-xs uppercase tracking-luxe disabled:opacity-50">
            <Send className="w-3.5 h-3.5" /> {busy ? "Sending…" : targetProduct ? "Notify product" : "Send all pending"}
          </button>
        </div>
      </div>

      {tab === "subs" ? (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-[10px] uppercase tracking-luxe">
              <tr><th className="text-left p-3">Product</th><th className="text-left p-3">Customer email</th><th className="text-left p-3">Stock</th><th className="text-left p-3">Subscribed</th><th className="text-left p-3">Notified</th></tr>
            </thead>
            <tbody>
              {subs.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No subscriptions</td></tr>
              ) : subs.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-3">{s.products?.name ?? s.product_id}</td>
                  <td className="p-3">{s.email}</td>
                  <td className="p-3 tabular-nums">{s.products?.stock ?? 0}</td>
                  <td className="p-3 text-xs">{new Date(s.created_at).toLocaleString()}</td>
                  <td className="p-3 text-xs">{s.notified_at ? new Date(s.notified_at).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="border border-border rounded-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted text-[10px] uppercase tracking-luxe">
              <tr><th className="text-left p-3">When</th><th className="text-left p-3">Channel</th><th className="text-left p-3">Template</th><th className="text-left p-3">Recipient</th><th className="text-left p-3">Status</th><th className="text-left p-3">Error</th></tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No notifications yet</td></tr>
              ) : logs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="p-3">{l.channel}</td>
                  <td className="p-3">{l.template}</td>
                  <td className="p-3">{l.recipient}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] uppercase tracking-luxe rounded-sm ${
                      l.status === "sent" ? "bg-green-100 text-green-800" :
                      l.status === "failed" ? "bg-red-100 text-red-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>{l.status}</span>
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">{l.error ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
