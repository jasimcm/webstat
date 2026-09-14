"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RevenuePoint } from "@/lib/queries/revenue";

const config: ChartConfig = {
  revenueCents: { label: "Revenue", color: "var(--chart-2)" },
};

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-64 w-full">
      <AreaChart data={data} margin={{ left: 0, right: 12, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          tickFormatter={(value: string) =>
            new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent formatter={(value) => `$${(Number(value) / 100).toFixed(2)}`} />
          }
        />
        <Area
          dataKey="revenueCents"
          type="monotone"
          fill="var(--color-revenueCents)"
          fillOpacity={0.15}
          stroke="var(--color-revenueCents)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  );
}
