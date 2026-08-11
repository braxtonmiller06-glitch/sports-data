import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { cn } from "@/lib/utils";
import {
  CLV_SUMMARY,
  EDGE_DECOMPOSITION,
  SITUATIONAL_SPLITS,
} from "@/data/playerLookupFixtures";

/** Medium: deeper situational splits than the filter rack alone exposes. */
export function SituationalSplits({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Situational splits</CardTitle>
      </CardHeader>
      <CardContent>
        <PremiumGate
          feature="expanded_filters"
          title="Situational splits"
          description="How this player performs in the specific spots that matter — rest, venue, opponent quality and rotation changes."
        >
          <dl className="flex flex-col">
            {SITUATIONAL_SPLITS.map((split) => (
              <div
                key={split.label}
                className="flex items-center gap-3 border-b border-line-faint py-2.5 last:border-b-0"
              >
                <dt className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] text-fg">{split.label}</span>
                  <span className="block text-[11px] text-fg-faint">{split.sample}</span>
                </dt>
                <dd className="tabular shrink-0 text-[14px] font-semibold text-fg">
                  {split.value}
                </dd>
                <span className="tabular w-12 shrink-0 text-right text-[12px] font-medium text-atlas">
                  {split.delta}
                </span>
              </div>
            ))}
          </dl>
        </PremiumGate>
      </CardContent>
    </Card>
  );
}

/** Elite: how the model gets from the market number to its own. */
export function EdgeDecomposition({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Edge decomposition</CardTitle>
      </CardHeader>
      <CardContent>
        <PremiumGate
          feature="premium_insights"
          title="Edge decomposition"
          description="Every adjustment between the base rate and the final projection, with the size of each one."
        >
          <dl className="flex flex-col">
            {EDGE_DECOMPOSITION.map((row, i) => {
              const isTotal = i === EDGE_DECOMPOSITION.length - 1;
              return (
                <div
                  key={row.label}
                  className={cn(
                    "flex items-baseline gap-3 border-b border-line-faint py-2.5 last:border-b-0",
                    isTotal && "mt-1 border-t border-line pt-3",
                  )}
                >
                  <dt className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[12.5px]",
                        isTotal ? "font-medium text-fg" : "text-fg-muted",
                      )}
                    >
                      {row.label}
                    </span>
                    <span className="block truncate text-[11px] text-fg-faint">{row.detail}</span>
                  </dt>
                  <dd
                    className={cn(
                      "tabular shrink-0 text-[14px] font-semibold",
                      isTotal ? "text-atlas" : "text-fg",
                    )}
                  >
                    {row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        </PremiumGate>
      </CardContent>
    </Card>
  );
}

/** Elite: what the entry price is worth against the projected close. */
export function ClosingLineValue({ className }: { className?: string }) {
  return (
    <Card className={cn("h-full", className)}>
      <CardHeader>
        <CardTitle>Closing line value</CardTitle>
      </CardHeader>
      <CardContent>
        <PremiumGate
          feature="closing_line_value"
          title="Closing line value"
          description="What this entry price is projected to be worth against where the market closes."
        >
          <dl className="grid grid-cols-2 gap-2.5">
            {CLV_SUMMARY.map((row) => (
              <div
                key={row.label}
                className="flex flex-col gap-1.5 rounded-lg border border-line bg-inset px-3.5 py-3"
              >
                <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{row.label}</dt>
                <dd className="tabular text-[15px] font-semibold text-fg">{row.value}</dd>
              </div>
            ))}
          </dl>
        </PremiumGate>
      </CardContent>
    </Card>
  );
}
