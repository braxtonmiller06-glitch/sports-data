import { useCallback, useMemo, useState } from "react";
import {
  ADVANCED_FILTER_IDS,
  LOOKUP_FILTERS,
  playerById,
  playersForSport,
  type GameLogEntry,
  type StatKey,
} from "@/data/playerLookupFixtures";
import { useSport } from "@/lib/sport-context";

export type FilterState = Record<string, string>;

const DEFAULT_FILTERS: FilterState = Object.fromEntries(
  LOOKUP_FILTERS.map((f) => [f.id, f.id === "timeframe" ? "l10" : "all"]),
);

/** Applies one filter to one game. Kept separate so each rule reads plainly. */
function matches(game: GameLogEntry, id: string, value: string, stat: StatKey, prev?: GameLogEntry, line?: number): boolean {
  if (value === "all") return true;

  switch (id) {
    case "venue":
      return game.homeAway === value;
    case "opponent":
      return game.opponent === value;
    case "rest":
      return value === "2" ? game.daysRest >= 2 : game.daysRest === Number(value);
    case "teammate":
      return value === "yes" ? game.teammateOut : !game.teammateOut;
    case "minutes":
      return game.minutes >= Number(value);
    case "usage":
      return game.usage >= Number(value);
    case "script":
      return game.gameScript === value;
    case "oppdef":
      return value === "top10" ? game.oppDefenseRank <= 10 : game.oppDefenseRank > 10;
    case "pace":
      return value === "fast" ? game.oppPace >= 100 : game.oppPace < 100;
    case "prev": {
      if (!prev || line === undefined) return false;
      const prevWentOver = prev[stat] > line;
      return value === "over" ? prevWentOver : !prevWentOver;
    }
    default:
      return true;
  }
}

/**
 * All Player Lookup state and every figure derived from it.
 *
 * The page is presentational: over/under rate, averages and the chart are all
 * computed here from the game log, so a filter change genuinely re-derives the
 * numbers rather than swapping one canned answer for another. Replacing the
 * fixture import with a fetch is the only change this needs to go live.
 */
export function usePlayerLookup() {
  const { sport, config: sportConfig } = useSport();

  const roster = useMemo(() => playersForSport(sport), [sport]);

  const [playerId, setPlayerId] = useState(() => playersForSport(sport)[0]?.id ?? "");
  const [stat, setStat] = useState<StatKey>("points");
  const [side, setSide] = useState<"over" | "under">("over");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [lineOverride, setLineOverride] = useState<number | null>(null);

  // Switching sport swaps the roster underneath; fall back to its first player
  // rather than holding a selection that no longer belongs to this sport.
  const resolvedId = useMemo(
    () => (roster.some((p) => p.id === playerId) ? playerId : (roster[0]?.id ?? "")),
    [roster, playerId],
  );

  const player = useMemo(() => playerById(resolvedId), [resolvedId]);

  const market = useMemo(
    () => player.markets.find((m) => m.stat === stat) ?? player.markets[0],
    [player, stat],
  );

  const line = lineOverride ?? market.line;

  /** Opponent options are per-player, so they are derived rather than static. */
  const opponentOptions = useMemo(() => {
    const seen = [...new Set(player.games.map((g) => g.opponent))].sort();
    return [{ value: "all", label: "All opponents" }, ...seen.map((o) => ({ value: o, label: `vs ${o}` }))];
  }, [player]);

  const filteredGames = useMemo(() => {
    // Newest first, so "last N" means the most recent N.
    const ordered = [...player.games].reverse();

    const timeframe = filters.timeframe;
    const windowed =
      timeframe === "l5" ? ordered.slice(0, 5) : timeframe === "l10" ? ordered.slice(0, 10) : ordered;

    return windowed.filter((game) => {
      const index = player.games.findIndex((g) => g.id === game.id);
      const prev = index > 0 ? player.games[index - 1] : undefined;

      return LOOKUP_FILTERS.every((def) => {
        if (def.id === "timeframe") return true;
        return matches(game, def.id, filters[def.id] ?? "all", stat, prev, line);
      });
    });
  }, [player, filters, stat, line]);

  const stats = useMemo(() => {
    const values = filteredGames.map((g) => g[stat]);
    const sample = values.length;
    const overs = values.filter((v) => v > line).length;
    const unders = sample - overs;
    const average = sample ? values.reduce((a, b) => a + b, 0) / sample : 0;
    const seasonAverage = player.baseline[stat];

    return {
      sample,
      overs,
      unders,
      overPct: sample ? (overs / sample) * 100 : 0,
      underPct: sample ? (unders / sample) * 100 : 0,
      average,
      seasonAverage,
      diff: average - seasonAverage,
      hitPct: side === "over" ? (sample ? (overs / sample) * 100 : 0) : sample ? (unders / sample) * 100 : 0,
    };
  }, [filteredGames, stat, line, player, side]);

  /** Chart shows the filtered sample, oldest → newest, capped for legibility. */
  const chartGames = useMemo(() => [...filteredGames].slice(0, 10).reverse(), [filteredGames]);

  const activeFilters = useMemo(
    () =>
      LOOKUP_FILTERS.flatMap((def) => {
        const value = filters[def.id] ?? "all";
        if (value === "all") return [];
        if (def.id === "timeframe" && value === "l10") return [];
        const option =
          def.id === "opponent"
            ? opponentOptions.find((o) => o.value === value)
            : def.options.find((o) => o.value === value);
        return option ? [{ id: def.id, label: def.label, value, optionLabel: option.label }] : [];
      }),
    [filters, opponentOptions],
  );

  const setFilter = useCallback((id: string, value: string) => {
    setFilters((prev) => ({ ...prev, [id]: value }));
  }, []);

  const clearFilter = useCallback((id: string) => {
    setFilters((prev) => ({ ...prev, [id]: id === "timeframe" ? "l10" : "all" }));
  }, []);

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const selectPlayer = useCallback((id: string) => {
    setPlayerId(id);
    // A new player means a new market; carrying a line or an opponent filter
    // across would be meaningless.
    setLineOverride(null);
    setFilters(DEFAULT_FILTERS);
  }, []);

  const selectStat = useCallback((next: StatKey) => {
    setStat(next);
    setLineOverride(null);
  }, []);

  const nudgeLine = useCallback(
    (delta: number) => setLineOverride((prev) => Math.max(0.5, (prev ?? market.line) + delta)),
    [market.line],
  );

  const advancedActiveCount = useMemo(
    () => activeFilters.filter((f) => (ADVANCED_FILTER_IDS as readonly string[]).includes(f.id)).length,
    [activeFilters],
  );

  return {
    // sport scope
    sport,
    sportConfig,
    roster,
    sportSupported: sportConfig.implemented && roster.length > 0,
    advancedActiveCount,
    // selection
    player,
    playerId: resolvedId,
    selectPlayer,
    stat,
    selectStat,
    side,
    setSide,
    market,
    line,
    nudgeLine,
    resetLine: () => setLineOverride(null),
    lineIsCustom: lineOverride !== null,
    // filtering
    filters,
    setFilter,
    clearFilter,
    resetFilters,
    activeFilters,
    opponentOptions,
    // derived
    filteredGames,
    chartGames,
    stats,
  };
}
