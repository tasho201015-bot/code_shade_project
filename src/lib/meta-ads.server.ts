// Server-only Meta (Facebook) Marketing API integration for ad spend.
// Reads credentials from environment variables. Never expose these to the client.
//
// Required env vars (optional — gracefully degrades when missing):
//   META_ADS_ACCESS_TOKEN    Long-lived user/system-user access token (ads_read scope)
//   META_ADS_AD_ACCOUNT_ID   Ad account id, e.g. "act_1234567890"
//   META_ADS_API_VERSION     Graph API version (default "v21.0")
//
// All functions return spend in the ad account's reporting currency (number).

const GRAPH_BASE = "https://graph.facebook.com";

export type MetaAdsConfigStatus = {
  configured: boolean;
  missing: string[];
};

export function getMetaAdsConfigStatus(): MetaAdsConfigStatus {
  const missing: string[] = [];
  if (!process.env.META_ADS_ACCESS_TOKEN) missing.push("META_ADS_ACCESS_TOKEN");
  if (!process.env.META_ADS_AD_ACCOUNT_ID) missing.push("META_ADS_AD_ACCOUNT_ID");
  return { configured: missing.length === 0, missing };
}

type Insight = { spend?: string };

/**
 * Fetch total Meta ad spend between two ISO dates (inclusive).
 * Returns `null` when integration is not configured.
 */
export async function fetchMetaAdSpend(
  sinceIso: string,
  untilIso: string,
): Promise<number | null> {
  const status = getMetaAdsConfigStatus();
  if (!status.configured) return null;

  const token = process.env.META_ADS_ACCESS_TOKEN!;
  const accountId = process.env.META_ADS_AD_ACCOUNT_ID!;
  const version = process.env.META_ADS_API_VERSION || "v21.0";

  // Meta expects YYYY-MM-DD for time_range.
  const since = sinceIso.slice(0, 10);
  const until = untilIso.slice(0, 10);

  const url = new URL(`${GRAPH_BASE}/${version}/${encodeURIComponent(accountId)}/insights`);
  url.searchParams.set("fields", "spend");
  url.searchParams.set("time_range", JSON.stringify({ since, until }));
  url.searchParams.set("level", "account");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Do not surface provider error contents to clients; log server-side only.
    console.error("[meta-ads] insights request failed", res.status, body.slice(0, 500));
    throw new Error(`Meta Ads request failed (${res.status})`);
  }

  const json = (await res.json()) as { data?: Insight[] };
  const rows = json.data ?? [];
  return rows.reduce((sum, r) => sum + Number(r.spend ?? 0), 0);
}
