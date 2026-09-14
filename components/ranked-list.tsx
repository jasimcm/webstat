import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Row {
  label: string;
  count: number;
}

export function RankedList({
  title,
  rows,
  valueLabel = "Visitors",
  formatValue,
}: {
  title: string;
  rows: Row[];
  valueLabel?: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ul className="flex flex-col gap-1" aria-label={`${title} — ${valueLabel} by row`}>
            {rows.map((row) => (
              <li key={row.label} className="relative overflow-hidden rounded-sm">
                <div
                  className="absolute inset-y-0 left-0 bg-chart-1/15"
                  style={{ width: `${(row.count / max) * 100}%` }}
                  aria-hidden
                />
                <div className="relative flex items-center justify-between px-2 py-1.5 text-sm">
                  <span className="truncate pr-2" title={row.label}>
                    {row.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatValue ? formatValue(row.count) : row.count.toLocaleString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
