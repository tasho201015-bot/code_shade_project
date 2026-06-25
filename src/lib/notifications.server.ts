/**
 * Notifications service.
 * Email-only today; channel/template shape supports future providers.
 * Sends are recorded in `notification_log` even when delivery fails so
 * admins can audit/retry.
 */

export type NotificationChannel = "email" | "whatsapp";

export interface SendBackInStockArgs {
  to: string;
  productName: string;
  productUrl: string;
  variant?: { color?: string | null; size?: string | null };
  lang?: "en" | "ar";
}

export interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

export interface SendOrderConfirmationArgs {
  to: string;
  orderId: string;
  total: number;
  currency?: string;
  items: OrderEmailItem[];
  shippingAddress?: string;
  siteOrigin?: string;
}

export interface SendCampaignEmailArgs {
  to: string;
  subject: string;
  html: string;
  campaignId?: string;
}

const BRAND = "MALAZ";

function fromAddress(): string {
  return process.env.NOTIFICATION_FROM_EMAIL ?? `${BRAND} <onboarding@resend.dev>`;
}

function businessAddress(): string | null {
  return (
    process.env.BUSINESS_EMAIL ||
    process.env.NOTIFICATION_TO_EMAIL ||
    null
  );
}

async function sendEmailViaResend(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: "RESEND_API_KEY not configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ from: fromAddress(), to: [args.to], subject: args.subject, html: args.html }),
    });
    if (!res.ok) return { ok: false, error: `Resend ${res.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

async function logAndSend(args: {
  to: string;
  subject: string;
  html: string;
  template: string;
  payload?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: logged } = await supabaseAdmin
    .from("notification_log")
    .insert({
      channel: "email",
      template: args.template,
      recipient: args.to,
      subject: args.subject,
      payload: (args.payload ?? null) as never,
      status: "pending",
    })
    .select("id")
    .single();

  const send = await sendEmailViaResend({ to: args.to, subject: args.subject, html: args.html });

  if (logged?.id) {
    await supabaseAdmin
      .from("notification_log")
      .update({
        status: send.ok ? "sent" : "failed",
        error: send.ok ? null : send.error,
        sent_at: send.ok ? new Date().toISOString() : null,
      })
      .eq("id", logged.id);
  }
  return send;
}

/* ============================================================ */
/* Back in stock                                                  */
/* ============================================================ */

function renderBackInStockHtml(a: SendBackInStockArgs): { subject: string; html: string } {
  const isAr = a.lang === "ar";
  const variantLine = a.variant && (a.variant.color || a.variant.size)
    ? `<p style="color:#666;font-size:14px">${[a.variant.color, a.variant.size].filter(Boolean).join(" • ")}</p>`
    : "";
  const subject = isAr ? `${a.productName} متوفر الآن!` : `${a.productName} is back in stock!`;
  const cta = isAr ? "تسوّقي الآن" : "Shop now";
  const body = isAr
    ? `<p>القطعة التي تنتظرينها متوفرة من جديد.</p>`
    : `<p>The piece you were waiting for is available again.</p>`;
  const html = `
<!doctype html><html dir="${isAr ? "rtl" : "ltr"}"><body style="font-family:Inter,Arial,sans-serif;background:#faf7f0;padding:40px">
  <div style="max-width:520px;margin:0 auto;background:#fff;padding:32px;border-radius:8px">
    <h1 style="font-size:20px;margin:0 0 8px">${BRAND}</h1>
    <h2 style="font-size:24px;margin:16px 0 4px">${a.productName}</h2>
    ${variantLine}
    ${body}
    <p style="margin:24px 0"><a href="${a.productUrl}" style="background:#141413;color:#faf7f0;padding:14px 28px;text-decoration:none;display:inline-block;letter-spacing:0.1em;text-transform:uppercase;font-size:12px">${cta}</a></p>
  </div>
</body></html>`;
  return { subject, html };
}

export async function sendBackInStockNotification(args: SendBackInStockArgs) {
  const { subject, html } = renderBackInStockHtml(args);
  return logAndSend({
    to: args.to,
    subject,
    html,
    template: "back_in_stock",
    payload: { productName: args.productName, productUrl: args.productUrl, variant: args.variant ?? null, lang: args.lang ?? "en" },
  });
}

/* ============================================================ */
/* Order confirmation + new order to business                     */
/* ============================================================ */

function fmtMoney(n: number, cur = "EGP") {
  return `${cur} ${n.toFixed(2)}`;
}

function renderOrderRows(items: OrderEmailItem[], cur: string) {
  return items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${i.name}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${fmtMoney(i.price * i.quantity, cur)}</td>
      </tr>`
    )
    .join("");
}

function renderOrderEmail(opts: {
  heading: string;
  intro: string;
  args: SendOrderConfirmationArgs;
  cta?: { href: string; label: string };
}): string {
  const cur = opts.args.currency ?? "EGP";
  const rows = renderOrderRows(opts.args.items, cur);
  const ctaHtml = opts.cta
    ? `<p style="margin:24px 0"><a href="${opts.cta.href}" style="background:#141413;color:#faf7f0;padding:14px 28px;text-decoration:none;display:inline-block;letter-spacing:0.1em;text-transform:uppercase;font-size:12px">${opts.cta.label}</a></p>`
    : "";
  const addrHtml = opts.args.shippingAddress
    ? `<p style="color:#666;font-size:13px;margin-top:16px"><strong>Shipping to:</strong><br/>${opts.args.shippingAddress.replace(/\n/g, "<br/>")}</p>`
    : "";
  return `
<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;background:#faf7f0;padding:40px">
  <div style="max-width:560px;margin:0 auto;background:#fff;padding:32px;border-radius:8px">
    <h1 style="font-size:20px;margin:0 0 8px;letter-spacing:.2em">${BRAND}</h1>
    <h2 style="font-size:22px;margin:16px 0 4px">${opts.heading}</h2>
    <p style="color:#444">${opts.intro}</p>
    <p style="color:#666;font-size:13px">Order <code>#${opts.args.orderId.slice(0, 8)}</code></p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
      <thead><tr>
        <th style="text-align:left;padding:8px 0;border-bottom:2px solid #141413">Item</th>
        <th style="text-align:center;padding:8px 0;border-bottom:2px solid #141413">Qty</th>
        <th style="text-align:right;padding:8px 0;border-bottom:2px solid #141413">Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr>
        <td colspan="2" style="padding:12px 0;text-align:right;font-weight:600">Total</td>
        <td style="padding:12px 0;text-align:right;font-weight:600">${fmtMoney(opts.args.total, cur)}</td>
      </tr></tfoot>
    </table>
    ${addrHtml}
    ${ctaHtml}
  </div>
</body></html>`;
}

export async function sendOrderConfirmation(args: SendOrderConfirmationArgs) {
  const origin = args.siteOrigin ?? process.env.SITE_ORIGIN ?? "";
  const html = renderOrderEmail({
    heading: "Thank you for your order",
    intro: "We received your order and will keep you posted on the next steps.",
    args,
    cta: origin ? { href: `${origin}/account`, label: "View order" } : undefined,
  });
  return logAndSend({
    to: args.to,
    subject: `Your ${BRAND} order #${args.orderId.slice(0, 8)} is confirmed`,
    html,
    template: "order_confirmation",
    payload: { orderId: args.orderId, total: args.total },
  });
}

export async function sendNewOrderToBusiness(args: SendOrderConfirmationArgs & { customerEmail?: string }) {
  const to = businessAddress();
  if (!to) return { ok: false as const, error: "BUSINESS_EMAIL not configured" };
  const origin = args.siteOrigin ?? process.env.SITE_ORIGIN ?? "";
  const html = renderOrderEmail({
    heading: "New order received",
    intro: args.customerEmail ? `Customer: ${args.customerEmail}` : "A new order has just been placed.",
    args,
    cta: origin ? { href: `${origin}/admin`, label: "Open admin" } : undefined,
  });
  return logAndSend({
    to,
    subject: `[${BRAND}] New order #${args.orderId.slice(0, 8)} — ${fmtMoney(args.total, args.currency ?? "EGP")}`,
    html,
    template: "new_order_admin",
    payload: { orderId: args.orderId, total: args.total, customerEmail: args.customerEmail ?? null },
  });
}

/* ============================================================ */
/* Campaign email (limited offers)                                */
/* ============================================================ */

export async function sendCampaignEmail(args: SendCampaignEmailArgs) {
  return logAndSend({
    to: args.to,
    subject: args.subject,
    html: args.html,
    template: "campaign",
    payload: { campaignId: args.campaignId ?? null },
  });
}
