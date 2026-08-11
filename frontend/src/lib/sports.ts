/**
 * The sports the app can be scoped to.
 *
 * `implemented` gates whether a sport has a full fixture set behind it. The
 * per-sport config exists so stats, markets, filters and positions can diverge
 * later without reshaping the UI — NBA and WNBA are filled in today, and the
 * remaining three carry enough to render a considered empty state.
 */
export type SportId = "nba" | "nfl" | "mlb" | "wnba" | "soccer";

export interface SportConfig {
  id: SportId;
  label: string;
  /** Long name, used in empty states and tooltips. */
  name: string;
  implemented: boolean;
  /** Stat keys this sport exposes on Player Lookup. */
  stats: string[];
  /** Market families, for the eventual market selector. */
  markets: string[];
  /** Positions used by the player search and roster filters. */
  positions: string[];
  /** Filter ids that apply. Sports without minutes will drop that filter. */
  filters: string[];
  /** Shown on the coming-soon state so the plan is legible. */
  note?: string;
}

const CORE_FILTERS = [
  "timeframe",
  "venue",
  "opponent",
  "rest",
  "teammate",
  "minutes",
  "usage",
  "script",
  "oppdef",
  "pace",
  "prev",
];

export const SPORTS: SportConfig[] = [
  {
    id: "nba",
    label: "NBA",
    name: "National Basketball Association",
    implemented: true,
    stats: ["points", "rebounds", "assists"],
    markets: ["Player points", "Player rebounds", "Player assists"],
    positions: ["PG", "SG", "SF", "PF", "C"],
    filters: CORE_FILTERS,
  },
  {
    id: "wnba",
    label: "WNBA",
    name: "Women's National Basketball Association",
    implemented: true,
    stats: ["points", "rebounds", "assists"],
    markets: ["Player points", "Player rebounds", "Player assists"],
    positions: ["G", "F", "C"],
    filters: CORE_FILTERS,
  },
  {
    id: "nfl",
    label: "NFL",
    name: "National Football League",
    implemented: false,
    stats: ["passing_yards", "rushing_yards", "receiving_yards", "receptions"],
    markets: ["Passing yards", "Rushing yards", "Receiving yards", "Receptions"],
    positions: ["QB", "RB", "WR", "TE"],
    filters: ["timeframe", "venue", "opponent", "rest", "script", "oppdef", "pace", "prev"],
    note: "Snap share, route participation and target share replace minutes and usage.",
  },
  {
    id: "mlb",
    label: "MLB",
    name: "Major League Baseball",
    implemented: false,
    stats: ["strikeouts", "hits", "total_bases", "runs"],
    markets: ["Strikeouts", "Hits", "Total bases", "Runs"],
    positions: ["SP", "RP", "C", "IF", "OF"],
    filters: ["timeframe", "venue", "opponent", "rest", "oppdef", "prev"],
    note: "Handedness splits, park factors and umpire assignment replace pace and usage.",
  },
  {
    id: "soccer",
    label: "Soccer",
    name: "Association Football",
    implemented: false,
    stats: ["shots", "shots_on_target", "assists", "passes"],
    markets: ["Shots", "Shots on target", "Assists", "Passes"],
    positions: ["GK", "DF", "MF", "FW"],
    filters: ["timeframe", "venue", "opponent", "rest", "script", "oppdef", "prev"],
    note: "Minutes risk from rotation and fixture congestion replaces the rest filter.",
  },
];

export const DEFAULT_SPORT: SportId = "nba";

export function sportById(id: SportId): SportConfig {
  return SPORTS.find((s) => s.id === id) ?? SPORTS[0];
}

/** Maps a fixture player's league string onto a sport id. */
export function sportIdFromLeague(league: string): SportId {
  const match = SPORTS.find((s) => s.label.toLowerCase() === league.toLowerCase());
  return match?.id ?? "nba";
}
