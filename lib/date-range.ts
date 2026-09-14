import type { DateRange } from "@/lib/queries/traffic";

export const RANGE_PRESETS = {
  "7d": { label: "Last 7 days", days: 7 },
  "30d": { label: "Last 30 days", days: 30 },
  "90d": { label: "Last 90 days", days: 90 },
} as const;

export type RangeKey = keyof typeof RANGE_PRESETS;

export function resolveRange(key: string | undefined): DateRange {
  const preset = RANGE_PRESETS[(key as RangeKey) ?? "30d"] ?? RANGE_PRESETS["30d"];
  const to = new Date();
  const from = new Date(to.getTime() - preset.days * 24 * 60 * 60 * 1000);
  return { from, to };
}
