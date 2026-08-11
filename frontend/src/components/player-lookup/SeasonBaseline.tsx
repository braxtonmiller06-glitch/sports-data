import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SeasonBaseline as Baseline } from "@/data/playerLookupFixtures";

const ROWS = [
  { key: "points", label: "Points" },
  { key: "rebounds", label: "Rebounds" },
  { key: "assists", label: "Assists" },
  { key: "minutes", label: "Minutes" },
  { key: "usage", label: "Usage", suffix: "%" },
] as const;

/**
 * Season rates with league percentile.
 *
 * The bar encodes percentile, not the raw value — points and usage are not on
 * the same scale, so a shared bar of raw numbers would be meaningless. The
 * number itself is always printed beside it.
 */
export function SeasonBaselinePanel({ baseline }: { baseline: Baseline }) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Season baseline</CardTitle>
        <span className="ml-auto text-[10px] font-medium tracking-wide text-fg-faint">
          PERCENTILE
        </span>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {ROWS.map((row) => {
          const value = baseline[row.key];
          const pct = baseline.percentiles[row.key];
          const elite = pct >= 90;

          return (
            <div key={row.key} className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[12px] text-fg-muted">{row.label}</span>
                <span className="flex items-baseline gap-2">
                  <span className="tabular text-[14px] font-semibold text-fg">
                    {value.toFixed(1)}
                    {"suffix" in row ? row.suffix : ""}
                  </span>
                  <span
                    className={cn(
                      "tabular w-9 text-right text-[11px] font-medium",
                      elite ? "text-atlas" : "text-fg-faint",
                    )}
                  >
                    {pct}
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
                <div
                  className={cn("h-full rounded-full", elite ? "bg-atlas" : "bg-line-hi")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}

        <p className="text-[11px] leading-relaxed text-fg-faint">
          Percentile is against every qualified player in the league this season. Bars encode
          rank, not the raw figure.
        </p>
      </CardContent>
    </Card>
  );
}
