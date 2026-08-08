import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { DeltaTag } from "@/components/ui/live-pulse";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { cn } from "@/lib/utils";
import {
  AI_ANALYSIS,
  HISTORICAL_WINDOWS,
  LINE_MOVEMENT,
  PLAYER_H2H,
  STAT_LABEL,
  type GameLogEntry,
  type PlayerFixture,
  type StatKey,
} from "@/data/playerLookupFixtures";

/* ---------------------------------------------------------- performance -- */

/** Every game in the filtered sample, as a table rather than a chart. */
export function GameLogPanel({
  games,
  stat,
  line,
}: {
  games: GameLogEntry[];
  stat: StatKey;
  line: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Game log</CardTitle>
        <Badge variant="outline" className="ml-auto">
          {games.length} {games.length === 1 ? "game" : "games"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {games.length === 0 ? (
          <p className="px-5 py-12 text-center text-[12px] text-fg-muted">
            No games match the current filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse">
              <thead>
                <tr className="border-b border-line text-left">
                  {["Date", "Opp", "Venue", STAT_LABEL[stat], "Line", "Result", "Min", "Usg"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                    >
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...games].reverse().map((game) => {
                  const value = game[stat];
                  const over = value > line;
                  return (
                    <tr
                      key={game.id}
                      className="border-b border-line-faint transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi"
                    >
                      <td className="px-4 py-2.5 text-[12px] text-fg-muted">{game.date}</td>
                      <td className="px-4 py-2.5 text-[12px] text-fg">{game.opponent}</td>
                      <td className="px-4 py-2.5 text-[12px] text-fg-faint">
                        {game.homeAway === "home" ? "Home" : "Away"}
                      </td>
                      <td className="tabular px-4 py-2.5 text-[13px] font-semibold text-fg">
                        {value}
                      </td>
                      <td className="tabular px-4 py-2.5 text-[12px] text-fg-muted">
                        {line.toFixed(1)}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-2.5 text-[11px] font-medium",
                          over ? "text-atlas" : "text-signal-crit",
                        )}
                      >
                        {over ? "OVER" : "UNDER"}
                      </td>
                      <td className="tabular px-4 py-2.5 text-[12px] text-fg-muted">
                        {game.minutes.toFixed(1)}
                      </td>
                      <td className="tabular px-4 py-2.5 text-[12px] text-fg-muted">
                        {game.usage.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** The same stat across widening windows, so form and baseline sit together. */
export function HistoricalPerformancePanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Historical performance</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {HISTORICAL_WINDOWS.map((w) => (
            <div
              key={w.label}
              className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-3.5"
            >
              <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{w.label}</dt>
              <dd className="tabular text-xl font-semibold tracking-tight text-fg">
                {w.average.toFixed(1)}
              </dd>
              <span className="tabular text-[11px] text-fg-faint">
                {w.overRate}% over · {w.sample} games
              </span>
            </div>
          ))}
        </dl>
        <p className="mt-4 max-w-[72ch] text-[12px] leading-relaxed text-fg-muted">
          A recent window above the season baseline is form; whether it is signal depends on
          whether a mechanism explains it. Check the usage and minutes filters before treating a
          hot stretch as a new level.
        </p>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------- matchup -- */

export function MatchupContextPanel({ player }: { player: PlayerFixture }) {
  const g = player.nextGame;
  const cells = [
    { label: "Opponent defense", value: g.opponentDefRating.toFixed(1), detail: `Ranked ${g.opponentDefRank}` },
    { label: "Opponent pace", value: g.opponentPace.toFixed(1), detail: `Ranked ${g.opponentPaceRank}` },
    { label: "Days rest", value: String(g.daysRest), detail: g.daysRest >= 2 ? "Rested" : "Short rest" },
    { label: "Venue", value: g.homeAway === "home" ? "Home" : "Away", detail: g.opponentName },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matchup context</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {cells.map((c) => (
            <div
              key={c.label}
              className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-3.5"
            >
              <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{c.label}</dt>
              <dd className="text-lg font-semibold tracking-tight text-fg">{c.value}</dd>
              <span className="truncate text-[11px] text-fg-faint">{c.detail}</span>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/** This player against this opponent specifically. */
export function PlayerHeadToHeadPanel({ stat }: { stat: StatKey }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Head to head</CardTitle>
        <span className="ml-auto text-[11px] text-fg-faint">vs this opponent</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                {["Date", "Opp", STAT_LABEL[stat], "Line", "Result", "Min"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAYER_H2H.map((row) => {
                const over = row.value > row.line;
                return (
                  <tr
                    key={row.date}
                    className="border-b border-line-faint transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi"
                  >
                    <td className="px-4 py-2.5 text-[12px] text-fg-muted">{row.date}</td>
                    <td className="px-4 py-2.5 text-[12px] text-fg">{row.opponent}</td>
                    <td className="tabular px-4 py-2.5 text-[13px] font-semibold text-fg">
                      {row.value}
                    </td>
                    <td className="tabular px-4 py-2.5 text-[12px] text-fg-muted">{row.line}</td>
                    <td
                      className={cn(
                        "px-4 py-2.5 text-[11px] font-medium",
                        over ? "text-atlas" : "text-signal-crit",
                      )}
                    >
                      {over ? "OVER" : "UNDER"}
                    </td>
                    <td className="tabular px-4 py-2.5 text-[12px] text-fg-muted">
                      {row.minutes.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="border-t border-line-faint px-4 py-3 text-[11px] leading-relaxed text-fg-faint">
          Five meetings is a small sample and rosters change between them. Useful for pace and
          style, weak as a direct predictor.
        </p>
      </CardContent>
    </Card>
  );
}

/* ----------------------------------------------------------------- odds -- */

export function LineMovementPanel() {
  const series = LINE_MOVEMENT.map((p) => p.line);
  const drift = series[series.length - 1] - series[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Line movement</CardTitle>
        <div className="ml-auto">
          <DeltaTag
            delta={`${drift > 0 ? "+" : ""}${drift.toFixed(1)}`}
            trend={drift > 0 ? "up" : drift < 0 ? "down" : "flat"}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Sparkline
          data={series}
          trend={drift > 0 ? "up" : drift < 0 ? "down" : "flat"}
          label="Line movement since open"
          className="h-12"
        />
        <ol className="flex flex-col">
          {LINE_MOVEMENT.map((point) => (
            <li
              key={point.time}
              className="flex items-center gap-3 border-b border-line-faint py-2.5 last:border-b-0"
            >
              <span className="w-32 shrink-0 text-[11px] text-fg-faint">{point.time}</span>
              <span className="tabular flex-1 text-[13px] font-medium text-fg">
                {point.line.toFixed(1)}
              </span>
              <span className="tabular text-[12px] text-fg-muted">{point.price}</span>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------- research -- */

export function AtlasAiPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atlas AI analysis</CardTitle>
        <Badge variant="atlas" className="ml-auto">
          AI
        </Badge>
      </CardHeader>
      <CardContent>
        <PremiumGate
          feature="ask_atlas"
          title="Atlas AI analysis"
          description="A written read on this specific prop, citing the signals and market snapshots behind it."
        >
          <div className="flex flex-col gap-4">
            <p className="max-w-[74ch] text-[13.5px] leading-relaxed text-fg-muted">
              {AI_ANALYSIS.summary}
            </p>
            <ul className="flex flex-col gap-2.5">
              {AI_ANALYSIS.points.map((point) => (
                <li key={point} className="flex items-start gap-2.5">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-atlas" />
                  <span className="max-w-[72ch] text-[12.5px] leading-relaxed text-fg-muted">
                    {point}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2 border-t border-line-faint pt-4">
              <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
                DERIVED FROM
              </span>
              {AI_ANALYSIS.citations.map((c) => (
                <Badge key={c} variant="neutral">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </PremiumGate>
      </CardContent>
    </Card>
  );
}

export function FullAnalysisPanel({ player, stat }: { player: PlayerFixture; stat: StatKey }) {
  const passes = player.signals.filter((s) => s.status === "pass").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Full analysis</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="max-w-[74ch] text-[13px] leading-relaxed text-fg-muted">
          {passes} of {player.signals.length} signals pass on {player.name}'s{" "}
          {STAT_LABEL[stat].toLowerCase()} market. The projection is built from the season rate,
          adjusted for opponent pace, matchup quality and any rotation change, then discounted for
          minutes risk.
        </p>
        <p className="max-w-[74ch] text-[13px] leading-relaxed text-fg-muted">
          Read the signals first, then the filters. A signal tells you what the model saw; a filter
          lets you check whether the same pattern holds in the specific spot this game presents.
          Where the two disagree, trust the larger sample.
        </p>
      </CardContent>
    </Card>
  );
}
