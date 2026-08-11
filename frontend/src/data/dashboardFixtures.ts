import {
  BookOpen,
  ChartColumn,
  ClipboardList,
  Gauge,
  Newspaper,
  Radio,
  Sparkles,
  UserSearch,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, type RoutePath } from "@/lib/routes";
import type { FeatureId } from "@/lib/access";

/**
 * ---------------------------------------------------------------------------
 * SAMPLE DATA — nothing in this file is real.
 * ---------------------------------------------------------------------------
 *
 * Every figure the dashboard renders is defined here and nowhere else, so the
 * widgets stay presentational and swapping in live data is a change to this
 * module plus the hook that replaces it. No component hardcodes a number.
 *
 * Replace with: the FastAPI backend for slate/odds/market data, Supabase for
 * saved research and performance, and the aggregator for filter output.
 */

export type Trend = "up" | "down" | "flat";

/* -------------------------------------------------------------------------- */
/* Welcome header                                                             */
/* -------------------------------------------------------------------------- */

export const SLATE_LEAGUES = ["NBA", "MLB", "WNBA", "Soccer"] as const;

export const welcomeFixture = {
  gamesToday: 42,
  leagues: SLATE_LEAGUES,
  marketStatus: "live" as "live" | "closed" | "pre-open",
  marketStatusLabel: "Live",
};

/* -------------------------------------------------------------------------- */
/* Opportunity score — a rating of the slate, not a confidence figure          */
/* -------------------------------------------------------------------------- */

export const opportunityFixture = {
  score: 92,
  scale: 100,
  expectedValue: "+8.4%",
  slateQuality: "Elite",
  marketVolatility: "Medium",
};

/* -------------------------------------------------------------------------- */
/* Today's slate                                                              */
/* -------------------------------------------------------------------------- */

export interface SlateStat {
  label: string;
  value: string;
  detail: string;
}

export const slateFixture: SlateStat[] = [
  { label: "Games today", value: "42", detail: "Across 4 leagues" },
  { label: "Top leagues", value: "NBA · MLB", detail: "18 and 14 games" },
  { label: "Starting soon", value: "6", detail: "Within the next 2 hours" },
  { label: "Largest line movement", value: "2.5", detail: "MIN/DEN total, 221.5 → 219.0" },
  { label: "Highest confidence game", value: "94", detail: "Minnesota at Denver" },
];

/* -------------------------------------------------------------------------- */
/* Top research play                                                          */
/* -------------------------------------------------------------------------- */

export type FilterStatus = "pass" | "warn" | "fail";

export interface PlayFilter {
  id: string;
  name: string;
  status: FilterStatus;
  /** One-line verdict shown beside the status. */
  headline: string;
  /** Shown on hover, focus, or click. The reasoning is never tier-gated. */
  explanation: string;
}

export const topPlayFixture = {
  subject: "Anthony Edwards",
  team: "Minnesota Timberwolves",
  market: "Over 27.5 Points",
  matchup: "MIN at DEN",
  tipoff: "8:10 PM ET",
  projection: "31.8",
  edge: "+14%",
  confidence: "92%",
  booksCompared: 28,
  filtersPassed: 6,
  filtersTotal: 8,
  lastUpdated: "18 seconds ago",
  /** Additional plays that cleared the threshold today. Gated above Free. */
  additionalPlaysToday: 6,
  filters: [
    {
      id: "pace",
      name: "Pace",
      status: "pass",
      headline: "6th fastest opponent",
      explanation:
        "Denver plays at 101.4 possessions per 48 minutes, 6th fastest in the league. More possessions means more shot attempts available.",
    },
    {
      id: "minutes",
      name: "Minutes",
      status: "pass",
      headline: "Projected 37.2",
      explanation:
        "Projected 37.2 minutes. He has cleared 35 minutes in 9 of his last 10 appearances.",
    },
    {
      id: "usage",
      name: "Usage",
      status: "pass",
      headline: "33.1% over last 10",
      explanation:
        "Edwards carries a 33.1% usage rate over the last 10 games, up from 30.4% on the season.",
    },
    {
      id: "matchup",
      name: "Matchup",
      status: "pass",
      headline: "22nd vs wings",
      explanation:
        "Denver allows the 4th most points to opposing wings and ranks 22nd in perimeter defensive rating over the last 15 games.",
    },
    {
      id: "rest",
      name: "Rest",
      status: "pass",
      headline: "Two days rest",
      explanation: "Two days of rest. No back-to-back, and no travel since Tuesday.",
    },
    {
      id: "line_value",
      name: "Line Value",
      status: "pass",
      headline: "27.5 still available",
      explanation:
        "Best available number is 27.5 at three books while the consensus has moved to 28.5.",
    },
    {
      id: "market",
      name: "Market",
      status: "warn",
      headline: "Moving against us",
      explanation:
        "The consensus has climbed a full point since open and two books have cut limits. The edge shrinks if the remaining books follow.",
    },
    {
      id: "injuries",
      name: "Injuries",
      status: "fail",
      headline: "Blowout risk elevated",
      explanation:
        "Denver's starting guard is out and the spread sits at 9.5. A comfortable lead is the one scenario that removes fourth-quarter minutes entirely.",
    },
  ] satisfies PlayFilter[],
};

/**
 * Edge decomposition behind the top play — how the model gets from the market
 * number to its own. Elite tier.
 */
export const premiumInsightsFixture = [
  { label: "Base projection", value: "28.9", detail: "Season rate, minutes-adjusted" },
  { label: "Pace adjustment", value: "+1.4", detail: "Opponent possessions vs league" },
  { label: "Matchup adjustment", value: "+1.9", detail: "Perimeter defence, last 15" },
  { label: "Usage adjustment", value: "+0.8", detail: "Starting guard ruled out" },
  { label: "Blowout haircut", value: "-1.2", detail: "9.5 spread, minutes risk" },
];

/* -------------------------------------------------------------------------- */
/* Market pulse                                                               */
/* -------------------------------------------------------------------------- */

export interface PulseMetric {
  label: string;
  value: string;
  delta: string;
  trend: Trend;
  /** Single series, most recent last. Rendered as a micro trend line. */
  series: number[];
}

export const marketPulseFixture: PulseMetric[] = [
  {
    label: "Steam moves",
    value: "14",
    delta: "+5",
    trend: "up",
    series: [3, 4, 3, 6, 5, 8, 7, 9, 11, 10, 12, 14],
  },
  {
    label: "Sharp bets",
    value: "37",
    delta: "+12",
    trend: "up",
    series: [12, 15, 14, 18, 22, 21, 25, 27, 26, 31, 34, 37],
  },
  {
    label: "Reverse line movement",
    value: "6",
    delta: "-2",
    trend: "down",
    series: [9, 10, 8, 9, 7, 8, 6, 7, 6, 5, 7, 6],
  },
  {
    label: "Books updating",
    value: "28",
    delta: "0",
    trend: "flat",
    series: [28, 28, 27, 28, 28, 28, 27, 28, 28, 28, 28, 28],
  },
  {
    label: "Live odds changes",
    value: "1,284",
    delta: "+318",
    trend: "up",
    series: [420, 510, 605, 660, 720, 815, 880, 960, 1040, 1120, 1210, 1284],
  },
];

/* -------------------------------------------------------------------------- */
/* Live activity                                                              */
/* -------------------------------------------------------------------------- */

export type ActivityKind = "line" | "sharp" | "injury" | "model" | "steam";

export interface ActivityEvent {
  id: string;
  time: string;
  kind: ActivityKind;
  title: string;
  detail: string;
}

/** Newest first. */
export const activityFixture: ActivityEvent[] = [
  { id: "a1", time: "11:42", kind: "line", title: "FanDuel moved line", detail: "Edwards points 27.5 → 28.5" },
  { id: "a2", time: "11:39", kind: "sharp", title: "Sharp money detected", detail: "MIN/DEN under 219.0, limit order at Pinnacle" },
  { id: "a3", time: "11:34", kind: "injury", title: "Player ruled OUT", detail: "Denver starting guard, right ankle" },
  { id: "a4", time: "11:30", kind: "model", title: "Atlas confidence updated", detail: "Edwards over 27.5 raised to 92%" },
  { id: "a5", time: "11:27", kind: "steam", title: "Steam move", detail: "Five books moved MIN spread within 90 seconds" },
  { id: "a6", time: "11:19", kind: "line", title: "DraftKings moved line", detail: "MIN/DEN total 221.5 → 220.0" },
  { id: "a7", time: "11:08", kind: "model", title: "Research published", detail: "Denver perimeter defence, 15-game trend" },
  { id: "a8", time: "10:54", kind: "sharp", title: "Sharp money detected", detail: "WNBA, Las Vegas team total over" },
  { id: "a9", time: "10:41", kind: "injury", title: "Player questionable", detail: "Minnesota forward, load management" },
  { id: "a10", time: "10:22", kind: "steam", title: "Steam move", detail: "MLB, Dodgers moneyline −132 → −145" },
];

/* -------------------------------------------------------------------------- */
/* Quick access                                                               */
/* -------------------------------------------------------------------------- */

export interface QuickAccessModule {
  title: string;
  description: string;
  icon: LucideIcon;
  to: RoutePath;
  /** When set, the module is tier-gated and shows a lock marker below it. */
  feature?: FeatureId;
}

/**
 * Paths come from ROUTES, so every card is guaranteed to resolve to a route
 * the router actually registers — a broken card becomes a type error.
 */
export const quickAccessFixture: QuickAccessModule[] = [
  { title: "Player Lookup", description: "Search any player and pull their full projection history.", icon: UserSearch, to: ROUTES.playerLookup },
  { title: "Game Center", description: "Every market on a single game, side by side.", icon: Gauge, to: ROUTES.games },
  { title: "Research Reports", description: "Published breakdowns from the filter engine.", icon: BookOpen, to: ROUTES.research, feature: "full_research_reports" },
  { title: "Live Plays", description: "Positions still in play, updating in real time.", icon: Radio, to: ROUTES.livePlays, feature: "live_plays_alerts" },
  { title: "Bet Tracker", description: "Log positions and grade them against closing lines.", icon: ClipboardList, to: ROUTES.tracker },
  { title: "Performance", description: "Your record, graded against closing lines.", icon: ChartColumn, to: ROUTES.performance },
  { title: "Morning Briefing", description: "The daily written read on today's slate.", icon: Newspaper, to: ROUTES.morningBriefing },
  { title: "Ask Atlas AI", description: "Question the research layer in plain language.", icon: Sparkles, to: ROUTES.askAtlas, feature: "ask_atlas" },
];

/* -------------------------------------------------------------------------- */
/* Performance snapshot                                                       */
/* -------------------------------------------------------------------------- */

export interface PerformanceStat {
  label: string;
  /** Numeric target for the count-up. */
  value: number;
  decimals: number;
  prefix?: string;
  suffix?: string;
  detail: string;
  trend: Trend;
  /** When set, the tile is gated and shown behind a lock above its tier. */
  feature?: FeatureId;
}

export const performanceFixture: PerformanceStat[] = [
  { label: "ROI", value: 8.4, decimals: 1, prefix: "+", suffix: "%", detail: "Trailing 30 sessions", trend: "up" },
  { label: "Win rate", value: 58.2, decimals: 1, suffix: "%", detail: "142 of 244 positions", trend: "up" },
  { label: "Units", value: 24.6, decimals: 1, prefix: "+", suffix: "u", detail: "On a 1u flat stake", trend: "up" },
  { label: "Closing line value", value: 3.1, decimals: 1, prefix: "+", suffix: "%", detail: "Beat close on 63%", trend: "up", feature: "closing_line_value" },
  { label: "Research published", value: 218, decimals: 0, detail: "Reports this season", trend: "flat" },
];

/* -------------------------------------------------------------------------- */
/* Continue research                                                          */
/* -------------------------------------------------------------------------- */

export interface ResearchEntry {
  id: string;
  label: string;
  meta: string;
}

export const continueResearchFixture = {
  players: [
    { id: "p1", label: "Anthony Edwards", meta: "MIN · Points, rebounds" },
    { id: "p2", label: "Nikola Jokić", meta: "DEN · Assists" },
    { id: "p3", label: "A'ja Wilson", meta: "LV · Points" },
  ] satisfies ResearchEntry[],
  games: [
    { id: "g1", label: "Minnesota at Denver", meta: "Tonight · 8:10 PM ET" },
    { id: "g2", label: "Dodgers at Padres", meta: "Tonight · 9:40 PM ET" },
  ] satisfies ResearchEntry[],
  saved: [
    { id: "s1", label: "Denver perimeter defence", meta: "Saved 2 days ago" },
    { id: "s2", label: "Pace-adjusted usage model", meta: "Saved last week" },
  ] satisfies ResearchEntry[],
  favorites: [
    { id: "f1", label: "NBA player points", meta: "Market favorite" },
    { id: "f2", label: "Steam move alerts", meta: "Pinned filter" },
  ] satisfies ResearchEntry[],
};

/* -------------------------------------------------------------------------- */
/* Morning briefing                                                           */
/* -------------------------------------------------------------------------- */

export const briefingFixture = {
  issue: "Issue 214",
  time: "6:00 AM ET",
  lede:
    "A dense 42-game board with one clear dislocation. Minnesota at Denver carries the slate, and the derivative markets have not yet absorbed last night's injury news.",
  body:
    "Of 286 priced markets, 42 cleared the research threshold and six reached playable conviction. Baseball totals are broadly efficient this morning, which historically argues for restraint rather than volume.",
  points: [
    { tag: "Focus", text: "Denver's perimeter defence ranks 22nd over the last 15 games, a split the season-long number hides." },
    { tag: "Caution", text: "A 9.5 spread carries blowout risk. Treat the minutes projection as a band, not a point." },
    { tag: "Watch", text: "Six games start within two hours. Line movement will accelerate after 6:00 PM ET." },
  ],
};

/* -------------------------------------------------------------------------- */
/* Ask Atlas                                                                  */
/* -------------------------------------------------------------------------- */

export const askSuggestions = [
  "Explain today's top play",
  "Show today's best unders",
  "Find correlated props",
  "Why did this line move?",
  "Compare sportsbooks",
];
