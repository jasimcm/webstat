import { createSupabaseAdminClient } from "@/lib/supabase/server";
import type { CountRow, DateRange } from "@/lib/queries/traffic";

export interface RevenuePoint {
  date: string;
  revenueCents: number;
}

export interface RevenueData {
  summary: { totalCents: number; purchases: number };
  revenueOverTime: RevenuePoint[];
  revenueByReferrer: CountRow[];
}

/** Single fetch backing every revenue widget, mirroring getTrafficData's one-query approach. */
export async function getRevenueData(siteId: string, range: DateRange): Promise<RevenueData> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("amount_cents, referrer_domain, created_at")
    .eq("site_id", siteId)
    .eq("type", "revenue")
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  if (error) throw error;
  const rows = data ?? [];

  const byDay = new Map<string, number>();
  const byReferrer = new Map<string, number>();
  let totalCents = 0;

  for (const row of rows) {
    const amount = row.amount_cents ?? 0;
    totalCents += amount;

    const day = row.created_at.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + amount);

    const referrer = row.referrer_domain ?? "Direct / Unknown";
    byReferrer.set(referrer, (byReferrer.get(referrer) ?? 0) + amount);
  }

  return {
    summary: { totalCents, purchases: rows.length },
    revenueOverTime: Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenueCents]) => ({ date, revenueCents })),
    revenueByReferrer: Array.from(byReferrer.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
  };
}
