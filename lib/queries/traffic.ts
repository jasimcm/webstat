import { createSupabaseAdminClient } from "@/lib/supabase/server";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DailyPoint {
  date: string;
  visitors: number;
  pageviews: number;
}

export interface CountRow {
  label: string;
  count: number;
}

export interface CustomEventRow {
  name: string;
  count: number;
}

export interface TrafficData {
  summary: { visitors: number; pageviews: number; customEvents: number };
  visitorsOverTime: DailyPoint[];
  topPages: CountRow[];
  topReferrers: CountRow[];
  topCountries: CountRow[];
  devices: CountRow[];
  browsers: CountRow[];
  customEvents: CustomEventRow[];
}

interface EventRow {
  type: "pageview" | "custom";
  visitor_id: string;
  url: string | null;
  name: string | null;
  referrer_domain: string | null;
  country: string | null;
  device: string | null;
  browser: string | null;
  created_at: string;
}

function topCounts(rows: (string | null)[], limit = 10): CountRow[] {
  const counts = new Map<string, number>();
  for (const key of rows) {
    const label = key ?? "Direct / Unknown";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Single fetch backing every widget on the traffic dashboard, so one page load issues one query. */
export async function getTrafficData(siteId: string, range: DateRange): Promise<TrafficData> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select("type, visitor_id, url, name, referrer_domain, country, device, browser, created_at")
    .eq("site_id", siteId)
    .in("type", ["pageview", "custom"])
    .gte("created_at", range.from.toISOString())
    .lte("created_at", range.to.toISOString());

  if (error) throw error;
  const rows = (data ?? []) as EventRow[];

  const pageviews = rows.filter((r) => r.type === "pageview");
  const customs = rows.filter((r) => r.type === "custom");

  const byDay = new Map<string, { visitors: Set<string>; pageviews: number }>();
  for (const row of pageviews) {
    const day = row.created_at.slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, { visitors: new Set(), pageviews: 0 });
    const bucket = byDay.get(day)!;
    bucket.visitors.add(row.visitor_id);
    bucket.pageviews += 1;
  }
  const visitorsOverTime = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({ date, visitors: bucket.visitors.size, pageviews: bucket.pageviews }));

  const customCounts = new Map<string, number>();
  for (const row of customs) {
    const name = row.name ?? "unnamed";
    customCounts.set(name, (customCounts.get(name) ?? 0) + 1);
  }

  return {
    summary: {
      visitors: new Set(pageviews.map((r) => r.visitor_id)).size,
      pageviews: pageviews.length,
      customEvents: customs.length,
    },
    visitorsOverTime,
    topPages: topCounts(pageviews.map((r) => r.url)),
    topReferrers: topCounts(pageviews.map((r) => r.referrer_domain)),
    topCountries: topCounts(pageviews.map((r) => r.country)),
    devices: topCounts(pageviews.map((r) => r.device)),
    browsers: topCounts(pageviews.map((r) => r.browser)),
    customEvents: Array.from(customCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
  };
}
