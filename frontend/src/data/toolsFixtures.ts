import type { SelectOption } from "@/components/ui/select";

/**
 * ---------------------------------------------------------------------------
 * SAMPLE DATA for the eight tools — nothing here is real.
 * ---------------------------------------------------------------------------
 *
 * Every figure the tool pages render is defined here, so the workspaces stay
 * presentational and going live is a change to this module plus the hooks that
 * replace it. No tool component hardcodes a number.
 */

/* ----------------------------------------------------------------- shared -- */

export const SPORT_OPTIONS: SelectOption[] = [
  { value: "all", label: "All sports" },
  { value: "nba", label: "NBA" },
  { value: "mlb", label: "MLB" },
  { value: "wnba", label: "WNBA" },
  { value: "soccer", label: "Soccer" },
];

export const DATE_OPTIONS: SelectOption[] = [
  { value: "today", label: "Today · Aug 7" },
  { value: "tomorrow", label: "Tomorrow · Aug 8" },
  { value: "week", label: "Next 7 days" },
];

export const MARKET_OPTIONS: SelectOption[] = [
  { value: "all", label: "All markets" },
  { value: "points", label: "Player points" },
  { value: "rebounds", label: "Player rebounds" },
  { value: "assists", label: "Player assists" },
  { value: "totals", label: "Game totals" },
  { value: "spreads", label: "Spreads" },
];

export const CONFIDENCE_OPTIONS: SelectOption[] = [
  { value: "0", label: "Any confidence" },
  { value: "70", label: "70+ confidence" },
  { value: "80", label: "80+ confidence" },
  { value: "90", label: "90+ confidence" },
];

export const SORT_OPTIONS: SelectOption[] = [
  { value: "edge", label: "Sort: Edge" },
  { value: "confidence", label: "Sort: Confidence" },
  { value: "line", label: "Sort: Line" },
];

/* ----------------------------------------------------------- filter plays -- */

export interface ResearchFilterToggle {
  id: string;
  label: string;
  /** Elite-only filters are shown but not selectable below that tier. */
  advanced?: boolean;
}

export const FILTER_TOGGLES: ResearchFilterToggle[] = [
  { id: "pace", label: "Pace" },
  { id: "minutes", label: "Minutes" },
  { id: "usage", label: "Usage" },
  { id: "matchup", label: "Matchup" },
  { id: "rest", label: "Rest" },
  { id: "line_value", label: "Line Value" },
  { id: "market", label: "Market" },
  { id: "injuries", label: "Injuries" },
  { id: "splits", label: "Home/Away splits", advanced: true },
  { id: "regression", label: "Shooting regression", advanced: true },
  { id: "correlation", label: "Correlation", advanced: true },
];

export interface PlayResult {
  id: string;
  player: string;
  team: string;
  sport: string;
  matchup: string;
  market: string;
  side: "Over" | "Under";
  line: number;
  projection: number;
  /** Percentage points of edge. */
  edge: number;
  confidence: number;
  filtersPassed: number;
  filtersTotal: number;
  bestOdds: string;
  bestBook: string;
}

export const PLAY_RESULTS: PlayResult[] = [
  { id: "r1", player: "Anthony Edwards", team: "MIN", sport: "nba", matchup: "MIN at DEN", market: "Points", side: "Over", line: 27.5, projection: 31.8, edge: 14.0, confidence: 92, filtersPassed: 6, filtersTotal: 8, bestOdds: "-108", bestBook: "Pinnacle" },
  { id: "r2", player: "Nikola Jokić", team: "DEN", sport: "nba", matchup: "MIN at DEN", market: "Assists", side: "Over", line: 9.5, projection: 11.2, edge: 9.4, confidence: 87, filtersPassed: 7, filtersTotal: 8, bestOdds: "-115", bestBook: "Circa" },
  { id: "r3", player: "A'ja Wilson", team: "LV", sport: "wnba", matchup: "LV at SEA", market: "Points", side: "Over", line: 21.5, projection: 24.0, edge: 9.0, confidence: 71, filtersPassed: 5, filtersTotal: 8, bestOdds: "-110", bestBook: "FanDuel" },
  { id: "r4", player: "Rudy Gobert", team: "MIN", sport: "nba", matchup: "MIN at DEN", market: "Rebounds", side: "Over", line: 11.5, projection: 13.1, edge: 7.8, confidence: 78, filtersPassed: 6, filtersTotal: 8, bestOdds: "-104", bestBook: "BetOnline" },
  { id: "r5", player: "Paul Skenes", team: "PIT", sport: "mlb", matchup: "PIT at CHC", market: "Strikeouts", side: "Over", line: 7.5, projection: 8.9, edge: 7.1, confidence: 83, filtersPassed: 6, filtersTotal: 8, bestOdds: "-120", bestBook: "Pinnacle" },
  { id: "r6", player: "Jamal Murray", team: "DEN", sport: "nba", matchup: "MIN at DEN", market: "Points", side: "Under", line: 22.5, projection: 19.4, edge: 6.6, confidence: 74, filtersPassed: 5, filtersTotal: 8, bestOdds: "-112", bestBook: "Circa" },
  { id: "r7", player: "Caitlin Clark", team: "IND", sport: "wnba", matchup: "IND at NY", market: "Assists", side: "Over", line: 8.5, projection: 9.8, edge: 5.9, confidence: 69, filtersPassed: 4, filtersTotal: 8, bestOdds: "-118", bestBook: "DraftKings" },
  { id: "r8", player: "Shohei Ohtani", team: "LAD", sport: "mlb", matchup: "LAD at SD", market: "Total bases", side: "Over", line: 1.5, projection: 1.9, edge: 5.2, confidence: 66, filtersPassed: 4, filtersTotal: 8, bestOdds: "+104", bestBook: "FanDuel" },
  { id: "r9", player: "Breanna Stewart", team: "NY", sport: "wnba", matchup: "IND at NY", market: "Rebounds", side: "Under", line: 8.5, projection: 7.2, edge: 4.8, confidence: 64, filtersPassed: 4, filtersTotal: 8, bestOdds: "-106", bestBook: "Pinnacle" },
  { id: "r10", player: "Karl-Anthony Towns", team: "MIN", sport: "nba", matchup: "MIN at DEN", market: "Points", side: "Over", line: 20.5, projection: 22.4, edge: 4.1, confidence: 61, filtersPassed: 3, filtersTotal: 8, bestOdds: "-110", bestBook: "Circa" },
];

/* ------------------------------------------------------------- live plays -- */

export interface LivePlay {
  id: string;
  player: string;
  matchup: string;
  market: string;
  openLine: number;
  currentLine: number;
  status: "steam" | "holding" | "fading";
  gameClock: string;
  movement: number[];
}

export const LIVE_PLAYS: LivePlay[] = [
  { id: "l1", player: "Anthony Edwards", matchup: "MIN at DEN", market: "Points Over", openLine: 27.5, currentLine: 28.5, status: "steam", gameClock: "Q2 · 4:18", movement: [27.5, 27.5, 28, 28, 28.5, 28.5] },
  { id: "l2", player: "MIN/DEN", matchup: "MIN at DEN", market: "Game total", openLine: 221.5, currentLine: 219.0, status: "fading", gameClock: "Q2 · 4:18", movement: [221.5, 221, 220.5, 220, 219.5, 219] },
  { id: "l3", player: "Nikola Jokić", matchup: "MIN at DEN", market: "Assists Over", openLine: 9.5, currentLine: 9.5, status: "holding", gameClock: "Q2 · 4:18", movement: [9.5, 9.5, 9.5, 9.5, 9.5, 9.5] },
  { id: "l4", player: "Paul Skenes", matchup: "PIT at CHC", market: "Strikeouts Over", openLine: 7.5, currentLine: 8.0, status: "steam", gameClock: "T4 · 1 out", movement: [7.5, 7.5, 7.5, 8, 8, 8] },
  { id: "l5", player: "Shohei Ohtani", matchup: "LAD at SD", market: "Total bases", openLine: 1.5, currentLine: 1.5, status: "holding", gameClock: "Pre-game", movement: [1.5, 1.5, 1.5, 1.5, 1.5, 1.5] },
];

/* ---------------------------------------------------------- straight data -- */

export interface DataTrend {
  id: string;
  subject: string;
  trend: string;
  sample: string;
  hitRate: number;
  streak: string;
  significance: "high" | "medium" | "low";
}

export const DATA_TRENDS: DataTrend[] = [
  { id: "d1", subject: "Denver at home", trend: "Opponent wings over points line", sample: "Last 15 home games", hitRate: 73.3, streak: "W5", significance: "high" },
  { id: "d2", subject: "Anthony Edwards", trend: "Over 27.5 points on 2+ days rest", sample: "Last 22 games", hitRate: 68.2, streak: "W3", significance: "high" },
  { id: "d3", subject: "MIN/DEN", trend: "Under the closing total", sample: "Last 10 meetings", hitRate: 70.0, streak: "W2", significance: "medium" },
  { id: "d4", subject: "Paul Skenes", trend: "Over strikeout line vs sub-.240 lineups", sample: "Last 18 starts", hitRate: 66.7, streak: "W4", significance: "high" },
  { id: "d5", subject: "WNBA road favourites", trend: "First-quarter spread cover", sample: "Season to date", hitRate: 58.9, streak: "L1", significance: "low" },
  { id: "d6", subject: "Nikola Jokić", trend: "Over assists when trailing at half", sample: "Last 30 games", hitRate: 64.3, streak: "W6", significance: "medium" },
];

/* -------------------------------------------------------------- hot / cold -- */

export interface FormEntry {
  id: string;
  player: string;
  team: string;
  metric: string;
  baseline: number;
  recent: number;
  delta: number;
  games: string;
  form: "hot" | "cold";
}

export const FORM_ENTRIES: FormEntry[] = [
  { id: "h1", player: "Anthony Edwards", team: "MIN", metric: "Points", baseline: 26.8, recent: 32.4, delta: 20.9, games: "Last 5", form: "hot" },
  { id: "h2", player: "Nikola Jokić", team: "DEN", metric: "Assists", baseline: 9.1, recent: 11.6, delta: 27.5, games: "Last 5", form: "hot" },
  { id: "h3", player: "Paul Skenes", team: "PIT", metric: "Strikeouts", baseline: 7.2, recent: 9.4, delta: 30.6, games: "Last 4", form: "hot" },
  { id: "h4", player: "A'ja Wilson", team: "LV", metric: "Points", baseline: 22.4, recent: 25.8, delta: 15.2, games: "Last 5", form: "hot" },
  { id: "c1", player: "Karl-Anthony Towns", team: "MIN", metric: "Points", baseline: 21.6, recent: 16.2, delta: -25.0, games: "Last 5", form: "cold" },
  { id: "c2", player: "Jamal Murray", team: "DEN", metric: "Points", baseline: 22.9, recent: 18.4, delta: -19.7, games: "Last 5", form: "cold" },
  { id: "c3", player: "Breanna Stewart", team: "NY", metric: "Rebounds", baseline: 9.2, recent: 7.0, delta: -23.9, games: "Last 5", form: "cold" },
  { id: "c4", player: "Shohei Ohtani", team: "LAD", metric: "Total bases", baseline: 2.1, recent: 1.6, delta: -23.8, games: "Last 6", form: "cold" },
];

/* ------------------------------------------------------------ player board -- */

export interface BoardPlayer {
  id: string;
  player: string;
  team: string;
  minutes: number;
  usage: number;
  points: number;
  rebounds: number;
  assists: number;
  projection: number;
  edge: number;
}

export const BOARD_METRICS = [
  { key: "minutes", label: "MIN", suffix: "" },
  { key: "usage", label: "USG%", suffix: "%" },
  { key: "points", label: "PTS", suffix: "" },
  { key: "rebounds", label: "REB", suffix: "" },
  { key: "assists", label: "AST", suffix: "" },
  { key: "projection", label: "PROJ", suffix: "" },
  { key: "edge", label: "EDGE", suffix: "%" },
] as const;

export const BOARD_PLAYERS: BoardPlayer[] = [
  { id: "b1", player: "Anthony Edwards", team: "MIN", minutes: 37.2, usage: 33.1, points: 26.8, rebounds: 5.4, assists: 4.6, projection: 31.8, edge: 14.0 },
  { id: "b2", player: "Nikola Jokić", team: "DEN", minutes: 34.8, usage: 29.4, points: 25.1, rebounds: 12.3, assists: 9.1, projection: 26.4, edge: 5.2 },
  { id: "b3", player: "Karl-Anthony Towns", team: "MIN", minutes: 33.1, usage: 24.8, points: 21.6, rebounds: 8.9, assists: 3.2, projection: 22.4, edge: 4.1 },
  { id: "b4", player: "Jamal Murray", team: "DEN", minutes: 32.6, usage: 26.2, points: 22.9, rebounds: 4.1, assists: 6.4, projection: 19.4, edge: -6.6 },
  { id: "b5", player: "Rudy Gobert", team: "MIN", minutes: 30.4, usage: 14.2, points: 12.1, rebounds: 11.8, assists: 1.4, projection: 13.1, edge: 7.8 },
  { id: "b6", player: "Aaron Gordon", team: "DEN", minutes: 31.2, usage: 18.6, points: 14.8, rebounds: 6.2, assists: 3.1, projection: 15.2, edge: 2.4 },
];

/* ------------------------------------------------------------ head to head -- */

export const H2H_TEAM_OPTIONS: SelectOption[] = [
  { value: "min", label: "Minnesota Timberwolves" },
  { value: "den", label: "Denver Nuggets" },
  { value: "lv", label: "Las Vegas Aces" },
  { value: "sea", label: "Seattle Storm" },
];

export interface H2HMeeting {
  id: string;
  date: string;
  result: string;
  total: number;
  closingTotal: number;
  note: string;
}

export const H2H_SUMMARY = {
  teamA: "Minnesota Timberwolves",
  teamB: "Denver Nuggets",
  record: "4–6",
  avgTotal: 217.4,
  avgMargin: 6.2,
  overRate: 30,
  pace: 99.8,
};

export const H2H_MEETINGS: H2HMeeting[] = [
  { id: "m1", date: "Apr 22, 2026", result: "DEN 112 – 104 MIN", total: 216, closingTotal: 221.5, note: "Under by 5.5" },
  { id: "m2", date: "Mar 08, 2026", result: "MIN 118 – 109 DEN", total: 227, closingTotal: 223.0, note: "Over by 4.0" },
  { id: "m3", date: "Jan 31, 2026", result: "DEN 105 – 98 MIN", total: 203, closingTotal: 218.5, note: "Under by 15.5" },
  { id: "m4", date: "Dec 14, 2025", result: "DEN 121 – 115 MIN", total: 236, closingTotal: 224.0, note: "Over by 12.0" },
  { id: "m5", date: "Nov 02, 2025", result: "MIN 106 – 101 DEN", total: 207, closingTotal: 219.5, note: "Under by 12.5" },
];

/* ------------------------------------------------------------ morning brief -- */

export const BRIEFING_SECTIONS = [
  {
    heading: "The board",
    body: "Forty-two games across four leagues, and the research threshold cleared on 42 of 286 priced markets. Six reached playable conviction. That is a normal Friday: enough to work with, not enough to force.",
  },
  {
    heading: "Where the dislocation is",
    body: "Minnesota at Denver carries the slate. Denver's starting guard was ruled out at 11:34 and the derivative markets have not fully absorbed it — the game total moved, but the wing props lagged by roughly forty minutes. That gap is the single clearest inefficiency on the board this morning.",
  },
  {
    heading: "What to be careful about",
    body: "The spread sits at 9.5. Every projection tied to fourth-quarter minutes carries blowout risk, and the usage elasticity term rests on three comparable games. Treat the minutes projection as a band rather than a point estimate.",
  },
  {
    heading: "Baseball",
    body: "The eight-game board shows no total more than 30 basis points from model. Historically that argues for restraint rather than volume. Skenes is the exception — the strikeout number has not caught up to the opposing lineup's contact profile.",
  },
];

/* ---------------------------------------------------------------- ask atlas -- */

export interface AskExchange {
  id: string;
  question: string;
  answer: string;
  citations: string[];
}

export const ASK_SUGGESTIONS = [
  "Explain today's top play",
  "Show today's best unders",
  "Find correlated props",
  "Why did this line move?",
  "Compare sportsbooks",
];

/** Canned exchanges so the tool demonstrates its answer shape without a backend. */
export const ASK_EXAMPLES: AskExchange[] = [
  {
    id: "e1",
    question: "Explain today's top play",
    answer:
      "Anthony Edwards over 27.5 points. The model projects 31.8 against a market-implied 28.4, an edge of 14%. Six of eight filters pass: Denver plays at the 6th fastest pace in the league, ranks 22nd in perimeter defensive rating over the last 15 games, and their starting guard was ruled out this morning, which historically lifts Edwards' usage from 24.0% to 29.5%. Two filters flag: the consensus has climbed a full point since open, and a 9.5 spread carries fourth-quarter benching risk.",
    citations: ["Pace filter", "Matchup filter", "Injuries filter", "Market snapshot 11:42"],
  },
];
