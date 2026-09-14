import Link from "next/link";
import { DateRangePicker } from "@/components/date-range-picker";
import { SiteSwitcher } from "@/components/site-switcher";
import { StatTile } from "@/components/stat-tile";
import { RankedList } from "@/components/ranked-list";
import { VisitorsChart } from "@/components/charts/visitors-chart";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveRange, type RangeKey } from "@/lib/date-range";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { getTrafficData } from "@/lib/queries/traffic";
import { getRevenueData } from "@/lib/queries/revenue";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ site?: string; range?: string }>;
}) {
  const params = await searchParams;
  const supabase = createSupabaseAdminClient();
  const { data: sites } = await supabase.from("sites").select("id, domain, name").order("name");

  if (!sites || sites.length === 0) {
    return (
      <div className="mx-auto max-w-md pt-24 text-center">
        <h2 className="text-lg font-semibold">No sites yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first site to get an embed snippet and start tracking visitors.
        </p>
        <Link href="/sites" className="mt-4 inline-block text-sm underline">
          Go to Sites
        </Link>
      </div>
    );
  }

  const currentDomain = params.site && sites.some((s) => s.domain === params.site)
    ? params.site
    : sites[0].domain;
  const currentSite = sites.find((s) => s.domain === currentDomain)!;
  const rangeKey = (params.range as RangeKey) ?? "30d";
  const range = resolveRange(rangeKey);

  const [traffic, revenue] = await Promise.all([
    getTrafficData(currentSite.id, range),
    getRevenueData(currentSite.id, range),
  ]);

  const formatMoney = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SiteSwitcher sites={sites} current={currentDomain} />
        <DateRangePicker current={rangeKey} />
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatTile label="Visitors" value={traffic.summary.visitors.toLocaleString()} />
        <StatTile label="Pageviews" value={traffic.summary.pageviews.toLocaleString()} />
        <StatTile label="Custom events" value={traffic.summary.customEvents.toLocaleString()} />
        <StatTile label="Revenue" value={formatMoney(revenue.summary.totalCents)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Visitors &amp; pageviews</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitorsChart data={traffic.visitorsOverTime} />
        </CardContent>
      </Card>

      {revenue.summary.purchases > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenue.revenueOverTime} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <RankedList title="Top pages" rows={traffic.topPages} />
        <RankedList title="Referrers" rows={traffic.topReferrers} />
        <RankedList title="Countries" rows={traffic.topCountries} />
        <RankedList title="Devices" rows={traffic.devices} />
        <RankedList title="Browsers" rows={traffic.browsers} />
        {traffic.customEvents.length > 0 && (
          <RankedList
            title="Custom events"
            rows={traffic.customEvents.map((e) => ({ label: e.name, count: e.count }))}
            valueLabel="Count"
          />
        )}
        {revenue.summary.purchases > 0 && (
          <RankedList
            title="Revenue by referrer"
            rows={revenue.revenueByReferrer}
            valueLabel="Revenue"
            formatValue={formatMoney}
          />
        )}
      </div>
    </div>
  );
}
