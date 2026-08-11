import { Minus, Plus, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAT_LABEL, type StatKey } from "@/data/playerLookupFixtures";

interface Props {
  stat: StatKey;
  line: number;
  lineIsCustom: boolean;
  onNudgeLine: (delta: number) => void;
  onResetLine: () => void;
  side: "over" | "under";
  onSideChange: (side: "over" | "under") => void;
  overOdds: string;
  underOdds: string;
  stats: {
    sample: number;
    overs: number;
    unders: number;
    overPct: number;
    underPct: number;
    average: number;
    seasonAverage: number;
    diff: number;
  };
}

/**
 * The headline read on the selected market.
 *
 * Everything here is derived from the filtered sample, so it moves whenever a
 * filter, the line, or the player changes.
 */
export function PropSummary({
  stat,
  line,
  lineIsCustom,
  onNudgeLine,
  onResetLine,
  side,
  onSideChange,
  overOdds,
  underOdds,
  stats,
}: Props) {
  const empty = stats.sample === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STAT_LABEL[stat]} summary</CardTitle>
        <Badge variant="outline" className="ml-auto">
          {stats.sample} {stats.sample === 1 ? "game" : "games"}
        </Badge>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        {/* Line control + side selector */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
              CURRENT LINE
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNudgeLine(-0.5)}
                aria-label="Lower the line"
                className="rounded-lg border border-line bg-inset p-1.5 text-fg-muted outline-none transition-colors duration-[120ms] hover:border-line-hi hover:text-fg"
              >
                <Minus className="size-3.5" />
              </button>
              <span className="tabular min-w-[64px] text-center text-2xl font-semibold tracking-tight text-fg">
                {line.toFixed(1)}
              </span>
              <button
                type="button"
                onClick={() => onNudgeLine(0.5)}
                aria-label="Raise the line"
                className="rounded-lg border border-line bg-inset p-1.5 text-fg-muted outline-none transition-colors duration-[120ms] hover:border-line-hi hover:text-fg"
              >
                <Plus className="size-3.5" />
              </button>
              {lineIsCustom && (
                <button
                  type="button"
                  onClick={onResetLine}
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-medium text-fg-faint outline-none transition-colors duration-[120ms] hover:text-atlas"
                >
                  <RotateCcw className="size-3" />
                  Market
                </button>
              )}
            </div>
          </div>

          <div
            className="flex items-center gap-1 rounded-lg border border-line bg-inset p-0.5"
            role="group"
            aria-label="Over or under"
          >
            {(["over", "under"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onSideChange(option)}
                aria-pressed={side === option}
                className={cn(
                  "rounded-md px-3.5 py-1.5 text-[12px] font-medium capitalize outline-none",
                  "transition-colors duration-[120ms]",
                  side === option
                    ? "bg-atlas/12 text-atlas"
                    : "text-fg-muted hover:bg-surface-hi hover:text-fg",
                )}
              >
                {option} {option === "over" ? overOdds : underOdds}
              </button>
            ))}
          </div>
        </div>

        {empty ? (
          <p className="rounded-lg border border-dashed border-line-hi bg-inset px-4 py-6 text-center text-[12px] text-fg-muted">
            No games match the current filters. Clear one to widen the sample.
          </p>
        ) : (
          <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
            <Tile
              label="Over"
              value={`${stats.overPct.toFixed(0)}%`}
              detail={`${stats.overs} of ${stats.sample}`}
              tone={side === "over" ? "atlas" : "default"}
            />
            <Tile
              label="Under"
              value={`${stats.underPct.toFixed(0)}%`}
              detail={`${stats.unders} of ${stats.sample}`}
              tone={side === "under" ? "atlas" : "default"}
            />
            <Tile label="Average" value={stats.average.toFixed(1)} detail="Filtered sample" />
            <Tile
              label="Season average"
              value={stats.seasonAverage.toFixed(1)}
              detail="All games"
            />
            <Tile
              label="vs season"
              value={`${stats.diff >= 0 ? "+" : ""}${stats.diff.toFixed(1)}`}
              detail={stats.diff >= 0 ? "Above baseline" : "Below baseline"}
              tone={stats.diff >= 0 ? "atlas" : "crit"}
            />
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "atlas" | "crit";
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-3.5">
      <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{label}</dt>
      <dd
        className={cn(
          "text-xl font-semibold tracking-tight",
          tone === "atlas" ? "text-atlas" : tone === "crit" ? "text-signal-crit" : "text-fg",
        )}
      >
        {value}
      </dd>
      <span className="text-[11px] text-fg-faint">{detail}</span>
    </div>
  );
}
