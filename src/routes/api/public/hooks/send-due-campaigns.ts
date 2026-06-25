import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendCampaignEmail } from "@/lib/notifications.server";

/**
 * Sends due campaigns (status='scheduled' AND scheduled_at <= now())
 * AND 'active' campaigns that have not been sent yet.
 * Wired to pg_cron with apikey header bypass — /api/public/* skips auth.
 */
export const Route = createFileRoute("/api/public/hooks/send-due-campaigns")({
  server: {
    handlers: {
      POST: async () => {
        const nowIso = new Date().toISOString();
        const { data: due, error } = await supabaseAdmin
          .from("email_campaigns")
          .select("*")
          .or(`and(status.eq.scheduled,scheduled_at.lte.${nowIso}),status.eq.active`)
          .is("sent_at", null)
          .limit(20);
        if (error) {
          return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
        }
        const campaigns = due ?? [];
        if (campaigns.length === 0) {
          return new Response(JSON.stringify({ ok: true, processed: 0 }), { headers: { "Content-Type": "application/json" } });
        }

        // Collect registered customer emails.
        const emails: string[] = [];
        for (let page = 1; page <= 50; page++) {
          const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
          if (lErr) break;
          const users = list?.users ?? [];
          for (const u of users) if (u.email) emails.push(u.email);
          if (users.length < 200) break;
        }
        const unique = Array.from(new Set(emails.map((e) => e.toLowerCase())));

        let totalSent = 0;
        for (const c of campaigns) {
          let sent = 0;
          let failed = 0;
          let lastError: string | null = null;
          for (const to of unique) {
            const r = await sendCampaignEmail({ to, subject: c.subject, html: c.body_html, campaignId: c.id });
            if (r.ok) sent++;
            else { failed++; lastError = r.error ?? lastError; }
          }
          totalSent += sent;
          await supabaseAdmin
            .from("email_campaigns")
            .update({
              status: "sent",
              sent_at: new Date().toISOString(),
              recipients_count: sent,
              last_error: failed > 0 ? lastError : null,
            })
            .eq("id", c.id);
        }
        return new Response(JSON.stringify({ ok: true, processed: campaigns.length, totalSent }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
