import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  adminListCampaigns,
  adminUpsertCampaign,
  adminSetCampaignStatus,
  adminDeleteCampaign,
  adminSendCampaign,
} from "@/lib/email-campaigns.functions";
import { toast } from "sonner";
import { Send, Trash2, Plus, Save } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  body_html: string;
  status: "draft" | "scheduled" | "active" | "inactive" | "sent";
  scheduled_at: string | null;
  sent_at: string | null;
  recipients_count: number;
  last_error: string | null;
  created_at: string;
}

const empty = {
  id: "",
  name: "",
  subject: "",
  body_html: "",
  status: "draft" as Campaign["status"],
  scheduled_at: "" as string,
};

function isoToLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function localToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function CampaignsManager() {
  const [rows, setRows] = useState<Campaign[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [busy, setBusy] = useState(false);

  const list = useServerFn(adminListCampaigns);
  const upsert = useServerFn(adminUpsertCampaign);
  const setStatus = useServerFn(adminSetCampaignStatus);
  const del = useServerFn(adminDeleteCampaign);
  const send = useServerFn(adminSendCampaign);

  const refresh = async () => {
    const r = await list();
    setRows(r.campaigns as Campaign[]);
  };
  useEffect(() => { refresh().catch((e) => toast.error(e.message)); }, []);

  const edit = (c: Campaign) => setForm({
    id: c.id, name: c.name, subject: c.subject, body_html: c.body_html,
    status: c.status === "sent" ? "draft" : c.status,
    scheduled_at: isoToLocal(c.scheduled_at),
  });

  const save = async () => {
    if (!form.name || !form.subject || !form.body_html) {
      toast.error("Name, subject, and body are required");
      return;
    }
    setBusy(true);
    try {
      await upsert({
        data: {
          id: form.id || undefined,
          name: form.name,
          subject: form.subject,
          body_html: form.body_html,
          status: form.status === "sent" ? "draft" : form.status,
          scheduled_at: localToIso(form.scheduled_at),
        },
      });
      toast.success(form.id ? "Campaign updated" : "Campaign created");
      setForm({ ...empty });
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const toggle = async (c: Campaign, status: Campaign["status"]) => {
    try {
      await setStatus({ data: { id: c.id, status: status as "draft" | "scheduled" | "active" | "inactive" } });
      await refresh();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete campaign "${c.name}"?`)) return;
    try { await del({ data: { id: c.id } }); await refresh(); } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  };

  const sendNow = async (c: Campaign) => {
    if (!confirm(`Send "${c.name}" to all registered customers now?`)) return;
    setBusy(true);
    try {
      const r = await send({ data: { id: c.id } });
      toast.success(`Sent ${r.sent} of ${r.total} (failed ${r.failed})`);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <div className="mt-8 grid lg:grid-cols-[1fr_1.4fr] gap-8">
      {/* Form */}
      <div className="border border-border rounded-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-xs uppercase tracking-luxe">{form.id ? "Edit campaign" : "New campaign"}</div>
          {form.id && (
            <button onClick={() => setForm({ ...empty })} className="text-[10px] uppercase tracking-luxe text-muted-foreground hover:text-foreground">
              <Plus className="w-3 h-3 inline mr-1" />New
            </button>
          )}
        </div>
        <div className="space-y-3">
          <input className="w-full bg-transparent border border-border px-3 py-2 text-sm" placeholder="Internal name"
            value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="w-full bg-transparent border border-border px-3 py-2 text-sm" placeholder="Email subject"
            value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          <textarea className="w-full bg-transparent border border-border px-3 py-2 text-sm min-h-[180px] font-mono"
            placeholder="<html>…</html> body" value={form.body_html}
            onChange={(e) => setForm({ ...form, body_html: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <select className="bg-transparent border border-border px-3 py-2 text-xs uppercase tracking-luxe"
              value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Campaign["status"] })}>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <input type="datetime-local" className="bg-transparent border border-border px-3 py-2 text-xs"
              value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>
          <button onClick={save} disabled={busy}
            className="inline-flex items-center gap-2 bg-noir text-cream px-4 py-2 text-xs uppercase tracking-luxe disabled:opacity-50">
            <Save className="w-3.5 h-3.5" />{busy ? "Saving…" : "Save campaign"}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="border border-border rounded-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-luxe">
            <tr>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Scheduled</th>
              <th className="text-left p-3">Sent</th>
              <th className="text-right p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No campaigns yet</td></tr>
            ) : rows.map((c) => (
              <tr key={c.id} className="border-t border-border align-top">
                <td className="p-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[280px]">{c.subject}</div>
                </td>
                <td className="p-3">
                  <select value={c.status === "sent" ? "draft" : c.status}
                    onChange={(e) => toggle(c, e.target.value as Campaign["status"])}
                    className="bg-transparent border border-border px-2 py-1 text-[10px] uppercase tracking-luxe">
                    <option value="draft">Draft</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  {c.status === "sent" && <div className="text-[10px] text-muted-foreground mt-1">sent</div>}
                </td>
                <td className="p-3 text-xs">{c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : "—"}</td>
                <td className="p-3 text-xs">
                  {c.sent_at ? <>{new Date(c.sent_at).toLocaleString()}<br/><span className="text-muted-foreground">{c.recipients_count} recipients</span></> : "—"}
                </td>
                <td className="p-3 text-right whitespace-nowrap">
                  <button onClick={() => edit(c)} className="text-[10px] uppercase tracking-luxe px-2 py-1 hover:underline">Edit</button>
                  <button onClick={() => sendNow(c)} disabled={busy}
                    className="inline-flex items-center gap-1 text-[10px] uppercase tracking-luxe px-2 py-1 hover:underline disabled:opacity-50">
                    <Send className="w-3 h-3" />Send now
                  </button>
                  <button onClick={() => remove(c)} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-luxe px-2 py-1 hover:underline text-red-600">
                    <Trash2 className="w-3 h-3" />Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
