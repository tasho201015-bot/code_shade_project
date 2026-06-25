import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Uuid = z.string().uuid();

const CampaignUpsertSchema = z.object({
  id: Uuid.optional(),
  name: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  body_html: z.string().trim().min(1).max(50_000),
  body_text: z.string().trim().max(20_000).nullable().optional(),
  status: z.enum(["draft", "scheduled", "active", "inactive"]).default("draft"),
  scheduled_at: z.string().datetime().nullable().optional(),
});

async function ensureAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
}

export const adminListCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("email_campaigns")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { campaigns: data ?? [] };
  });

export const adminUpsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CampaignUpsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const payload = {
      name: data.name,
      subject: data.subject,
      body_html: data.body_html,
      body_text: data.body_text ?? null,
      status: data.status,
      scheduled_at: data.scheduled_at ?? null,
      created_by: context.userId,
    };
    if (data.id) {
      const { error } = await context.supabase.from("email_campaigns").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await context.supabase
      .from("email_campaigns")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id as string };
  });

export const adminSetCampaignStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: Uuid,
      status: z.enum(["draft", "scheduled", "active", "inactive"]),
      scheduled_at: z.string().datetime().nullable().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const patch: { status: typeof data.status; scheduled_at?: string | null } = { status: data.status };
    if (data.scheduled_at !== undefined) patch.scheduled_at = data.scheduled_at;
    const { error } = await context.supabase.from("email_campaigns").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase.from("email_campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Send a campaign to all registered customers immediately. */
export const adminSendCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: Uuid }).parse(d))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendCampaignEmail } = await import("@/lib/notifications.server");

    const { data: campaign, error: cErr } = await supabaseAdmin
      .from("email_campaigns")
      .select("*")
      .eq("id", data.id)
      .single();
    if (cErr || !campaign) throw new Error("Campaign not found");

    // Collect registered customer emails by paging auth.admin.listUsers.
    const emails: string[] = [];
    for (let page = 1; page <= 50; page++) {
      const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (lErr) break;
      const users = list?.users ?? [];
      for (const u of users) {
        if (u.email) emails.push(u.email);
      }
      if (users.length < 200) break;
    }
    const unique = Array.from(new Set(emails.map((e) => e.toLowerCase())));

    let sent = 0;
    let failed = 0;
    let lastError: string | null = null;
    for (const to of unique) {
      const r = await sendCampaignEmail({ to, subject: campaign.subject, html: campaign.body_html, campaignId: campaign.id });
      if (r.ok) sent++;
      else { failed++; lastError = r.error ?? lastError; }
    }
    await supabaseAdmin
      .from("email_campaigns")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        recipients_count: sent,
        last_error: lastError,
      })
      .eq("id", campaign.id);
    return { sent, failed, total: unique.length };
  });
