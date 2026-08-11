import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { STAT_LABEL, type GameLogEntry, type StatKey } from "@/data/playerLookupFixtures";

interface Props {
  games: GameLogEntry[];
  stat: StatKey;
  line: number;
}

const PLOT_HEIGHT = 200;

/**
 * Per-game results against the current line.
 *
 * Bars are coloured by outcome, but the colour never carries the fact alone —
 * every bar is direct-labelled with its value and the line is drawn across the
 * plot, so the comparison is legible without relying on hue. The plot rescales
 * to whichever is larger, the sample or the line, so the rule is always in
 * frame.
 */
export function PerformanceChart({ games, stat, line }: Props) {
  const values = games.map((g) => g[stat]);
  const ceiling = Math.max(...values, line) * 1.18 || 1;

  const overs = values.filter((v) => v > line).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{STAT_LABEL[stat]} by game</CardTitle>
        <span className="text-[11px] text-fg-faint">vs line {line.toFixed(1)}</span>
        <Badge variant="outline" className="ml-auto">
          {overs} over · {games.length - overs} under
        </Badge>
      </CardHeader>

      <CardContent>
        {games.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-hi bg-inset px-4 py-12 text-center text-[12px] text-fg-muted">
            No games in this sample. Widen a filter to plot results.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              {/* Plot */}
              <div className="relative" style={{ height: PLOT_HEIGHT }}>
                {/* The sportsbook line */}
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ bottom: `${(line / ceiling) * PLOT_HEIGHT}px` }}
                >
                  <div className="h-px w-full bg-atlas/45" />
                  <span className="tabular ml-2 shrink-0 rounded border border-atlas/30 bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-atlas">
                    {line.toFixed(1)}
                  </span>
                </div>

                {/* Bars */}
                <div className="flex h-full items-end gap-1.5">
                  {games.map((game) => {
                    const value = game[stat];
                    const over = value > line;
                    const height = Math.max((value / ceiling) * PLOT_HEIGHT, 3);

                    return (
                      <div
                        key={game.id}
                        className="group flex min-w-0 flex-1 flex-col items-center justify-end"
                        style={{ height: PLOT_HEIGHT }}
                      >
                        <span
                          className={cn(
                            "tabular mb-1 text-[11px] font-semibold",
                            over ? "text-atlas" : "text-signal-crit",
                          )}
                        >
                          {value}
                        </span>
                        <div
                          role="img"
                          aria-label={`${game.date} vs ${game.opponent}: ${value} ${stat}, ${over ? "over" : "under"} ${line}`}
                          className={cn(
                            "w-full rounded-t-[4px] transition-opacity duration-[120ms]",
                            over ? "bg-atlas/80" : "bg-signal-crit/75",
                            "group-hover:opacity-100 opacity-90",
                          )}
                          style={{ height }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Axis */}
              <div className="mt-2 flex gap-1.5 border-t border-line pt-2">
                {games.map((game) => (
                  <div
                    key={game.id}
                    className="flex min-w-0 flex-1 flex-col items-center gap-0.5 text-center"
                  >
                    <span className="truncate text-[10px] font-medium text-fg-muted">
                      {game.homeAway === "home" ? "vs" : "@"} {game.opponent}
                    </span>
                    <span className="truncate text-[9.5px] text-fg-faint">{game.date}</span>
                    <span className="tabular truncate text-[9.5px] text-fg-faint">
                      {game.minutes.toFixed(0)}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
