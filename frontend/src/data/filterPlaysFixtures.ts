import type { FilterStatus } from "./dashboardFixtures";
import type { StatKey } from "./playerLookupFixtures";
import type { SportId } from "@/lib/sports";

/**
 * ---------------------------------------------------------------------------
 * SAMPLE DATA for Filter Plays — nothing here is real.
 * ---------------------------------------------------------------------------
 *
 * Shaped the way the FastAPI aggregator will return a scored board: one row per
 * priced market, carrying the projection, the market's number, and the eight
 * signal verdicts that produced them.
 *
 * Two rules hold this module together:
 *
 *   1. Nothing here is derived. `filtersPassed`, the result count and the
 *      ordering are all computed at runtime in `lib/filter-plays.ts`, because
 *      turning a signal off has to genuinely re-score the board. Storing a
 *      pass count would let the fixture and the filter disagree.
 *   2. Nothing here is presentational. No component imports this module
 *      directly — the hook does — so swapping this file for `fetch()` is the
 *      only change needed to go live.
 */

/* ----------------------------------------------------------------- signals -- */

/** The eight Atlas signals, in the order they are always displayed. */
export const ATLAS_SIGNALS = [
  { id: "pace", label: "Pace" },
  { id: "minutes", label: "Minutes" },
  { id: "usage", label: "Usage" },
  { id: "matchup", label: "Matchup" },
  { id: "rest", label: "Rest" },
  { id: "line_value", label: "Line Value" },
  { id: "market", label: "Market" },
  { id: "injuries", label: "Injuries" },
] as const;

export type AtlasSignalId = (typeof ATLAS_SIGNALS)[number]["id"];

export const SIGNAL_IDS: AtlasSignalId[] = ATLAS_SIGNALS.map((s) => s.id);

export interface OpportunitySignal {
  id: AtlasSignalId;
  name: string;
  status: FilterStatus;
  headline: string;
  explanation: string;
}

/* ----------------------------------------------------------------- markets -- */

export interface MarketDef {
  value: string;
  label: string;
  /**
   * The Player Lookup stat this market maps onto, when one exists. Combination
   * markets (PRA, PR, PA) and 3PT have no single-stat equivalent yet, so a deep
   * link carrying them falls back to the player's default market.
   */
  stat?: StatKey;
}

/**
 * Markets are per sport, not global. NBA and WNBA differ in which combination
 * markets books actually price, and the remaining sports have no fixture board
 * behind them at all — an absent entry is what drives the coming-soon state.
 */
export const MARKETS_BY_SPORT: Partial<Record<SportId, MarketDef[]>> = {
  nba: [
    { value: "points", label: "Points", stat: "points" },
    { value: "rebounds", label: "Rebounds", stat: "rebounds" },
    { value: "assists", label: "Assists", stat: "assists" },
    { value: "threes", label: "3PT Made" },
    { value: "pra", label: "PRA" },
    { value: "pr", label: "PR" },
    { value: "pa", label: "PA" },
  ],
  wnba: [
    { value: "points", label: "Points", stat: "points" },
    { value: "rebounds", label: "Rebounds", stat: "rebounds" },
    { value: "assists", label: "Assists", stat: "assists" },
    { value: "threes", label: "3PT Made" },
    { value: "pra", label: "PRA" },
  ],
};

export function marketsForSport(sport: SportId): MarketDef[] {
  return MARKETS_BY_SPORT[sport] ?? [];
}

export function marketDef(sport: SportId, value: string): MarketDef | undefined {
  return marketsForSport(sport).find((m) => m.value === value);
}

/* ----------------------------------------------------------- opportunities -- */

export type Volatility = "Low" | "Medium" | "High";

/** Numbers the signal explanations are written from. */
interface SignalContext {
  oppPace: number;
  oppPaceRank: number;
  projMinutes: number;
  usage: number;
  oppDefRank: number;
  daysRest: number;
  /** Where the consensus number has moved to, against the best available line. */
  consensus: number;
  /** Line units moved since open, signed against the listed side. */
  lineMove: number;
  /** Short rotation note, used by the injuries signal. */
  note: string;
}

export interface Opportunity {
  id: string;
  sport: SportId;
  /** Player Lookup fixture id — the deep link target. */
  playerId: string;
  playerSlug: string;
  player: string;
  team: string;
  opponent: string;
  matchup: string;
  market: string;
  marketLabel: string;
  side: "Over" | "Under";
  line: number;
  projection: number;
  /** Percentage points of edge against the market's implied number. */
  edge: number;
  /** Model confidence in the projection, 0–100. Not the opportunity score. */
  confidence: number;
  bestOdds: string;
  bestBook: string;
  /** 0 = today, 1 = tomorrow, 2 = two days out. */
  dayOffset: 0 | 1 | 2;
  tipoff: string;
  /**
   * Overall quality of the research opportunity, 0–100 — a different question
   * from confidence, which only measures the projection's sample. Fixture
   * value; the aggregator will compute this.
   */
  opportunityScore: number;
  volatility: Volatility;
  signals: OpportunitySignal[];
  /** One-paragraph read. Open on every tier, by product rule. */
  summary: string;
}

/* ------------------------------------------------------ signal generation -- */

const ORDINAL = (n: number): string => {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = ["th", "st", "nd", "rd"][n % 10];
  return `${n}${suffix ?? "th"}`;
};

type SignalCopy = { headline: string; explanation: string };
type CopyBuilder = (c: SignalContext, o: OpportunityMeta) => SignalCopy;

/** The subset of a row the copy builders need, before signals exist. */
interface OpportunityMeta {
  player: string;
  opponent: string;
  marketLabel: string;
  side: "Over" | "Under";
  line: number;
}

/**
 * Signal copy, written per status rather than per row.
 *
 * Each builder takes the row's own numbers, so two rows never read identically
 * even when they share a verdict — the reasoning layer stays specific, which is
 * the whole point of showing it to every tier.
 */
const SIGNAL_COPY: Record<AtlasSignalId, Record<FilterStatus, CopyBuilder>> = {
  pace: {
    pass: (c, o) => ({
      headline: `${ORDINAL(c.oppPaceRank)} fastest opponent`,
      explanation: `${o.opponent} plays at ${c.oppPace} possessions per game, ${ORDINAL(c.oppPaceRank)} fastest in the league. More possessions means more attempts available, which is a direct tailwind for ${o.marketLabel.toLowerCase()}.`,
    }),
    warn: (c, o) => ({
      headline: `${ORDINAL(c.oppPaceRank)}, middling`,
      explanation: `${o.opponent} plays at ${c.oppPace} possessions per game, ${ORDINAL(c.oppPaceRank)} in the league. Neither a tailwind nor a headwind — pace is not doing any work in this projection.`,
    }),
    fail: (c, o) => ({
      headline: `${ORDINAL(c.oppPaceRank)}, grinding`,
      explanation: `${o.opponent} plays at ${c.oppPace} possessions per game, ${ORDINAL(c.oppPaceRank)} in the league. They shorten games deliberately, and volume-dependent markets lose their tailwind against them.`,
    }),
  },
  minutes: {
    pass: (c, o) => ({
      headline: `Projected ${c.projMinutes}`,
      explanation: `Projected ${c.projMinutes} minutes. ${o.player} has cleared that workload in eight of the last ten, and no load management is flagged for this game.`,
    }),
    warn: (c, o) => ({
      headline: `${c.projMinutes} with risk`,
      explanation: `Projected ${c.projMinutes} minutes, but the workload band is wider than usual — ${o.player} has been pulled early in three of the last ten, all in games that stopped being competitive.`,
    }),
    fail: (c, o) => ({
      headline: `Workload capped`,
      explanation: `Projected ${c.projMinutes} minutes against a season average well above it. ${o.player} is on a stated minutes restriction, which removes the top of the outcome range entirely.`,
    }),
  },
  usage: {
    pass: (c, o) => ({
      headline: `${c.usage}% and stable`,
      explanation: `${o.player} carries a ${c.usage}% usage rate over the last ten games. The rate has held inside a three-point band all month, which is what makes the projection's volume assumption safe.`,
    }),
    warn: (c) => ({
      headline: `${c.usage}%, secondary`,
      explanation: `Usage sits at ${c.usage}%, behind the primary option. It climbs meaningfully only in the stretches that option rests, so the projection leans on rotation patterns rather than a stable rate.`,
    }),
    fail: (c, o) => ({
      headline: `${c.usage}% and falling`,
      explanation: `Usage has dropped to ${c.usage}% over the last five, down from the season rate. ${o.player} is taking a smaller share of the offence than the posted number assumes.`,
    }),
  },
  matchup: {
    pass: (c, o) => ({
      headline: `${ORDINAL(c.oppDefRank)}-rated defence`,
      explanation: `${o.opponent} ranks ${ORDINAL(c.oppDefRank)} in defensive rating and concedes above the league rate in this exact market over the last fifteen games.`,
    }),
    warn: (c, o) => ({
      headline: `${ORDINAL(c.oppDefRank)}, neutral`,
      explanation: `${o.opponent} ranks ${ORDINAL(c.oppDefRank)} defensively — average overall, with no clear personnel edge either way in this matchup.`,
    }),
    fail: (c, o) => ({
      headline: `${ORDINAL(c.oppDefRank)}-rated defence`,
      explanation: `${o.opponent} ranks ${ORDINAL(c.oppDefRank)} in defensive rating and has the personnel to defend this matchup without help, the coverage behind the lowest outcomes in the sample.`,
    }),
  },
  rest: {
    pass: (c) => ({
      headline: `${c.daysRest} ${c.daysRest === 1 ? "day" : "days"} rest`,
      explanation: `${c.daysRest} ${c.daysRest === 1 ? "day" : "days"} of rest with no travel burden. Production in this rest situation runs at or above the season rate.`,
    }),
    warn: (c, o) => ({
      headline: `${c.daysRest} ${c.daysRest === 1 ? "day" : "days"} rest`,
      explanation: `${c.daysRest} ${c.daysRest === 1 ? "day" : "days"} of rest on the road. ${o.player} holds volume on short rest, but efficiency slips enough to widen the range of outcomes.`,
    }),
    fail: (c, o) => ({
      headline: `Back-to-back travel`,
      explanation: `${c.daysRest} ${c.daysRest === 1 ? "day" : "days"} of rest with travel. ${o.player} loses roughly three units of production per game in this situation across the season.`,
    }),
  },
  line_value: {
    pass: (c, o) => ({
      headline: `${o.line} still available`,
      explanation: `The best available number is ${o.line} while the consensus has moved to ${c.consensus}. Taking the stale side of a half-point gap is most of the edge in this row.`,
    }),
    warn: (c, o) => ({
      headline: `${o.line} is fair`,
      explanation: `The market sits at ${o.line} against a consensus of ${c.consensus}. The gap is real but inside the range that this player's own variance explains.`,
    }),
    fail: (c, o) => ({
      headline: `${o.line} is stale against us`,
      explanation: `Every tracked book has moved past ${o.line} to ${c.consensus}. The available price is now the worst of the market rather than the best.`,
    }),
  },
  market: {
    pass: (c) => ({
      headline: `Stable since open`,
      explanation: `The number has not moved since it was posted and limits are unchanged${c.lineMove === 0 ? "" : ` beyond a ${Math.abs(c.lineMove)}-point early adjustment`}. A firm line at raised limits usually means the price is respected.`,
    }),
    warn: (c) => ({
      headline: `Moving against us`,
      explanation: `The consensus has climbed ${Math.abs(c.lineMove)} points since open and two books have cut limits. The edge shrinks if the remaining books follow.`,
    }),
    fail: (c) => ({
      headline: `Sharp money opposed`,
      explanation: `The number has moved ${Math.abs(c.lineMove)} points against this side on rising limits — the signature of informed money taking the other way.`,
    }),
  },
  injuries: {
    pass: (c) => ({
      headline: c.note,
      explanation: `${c.note}. No late scratches reported on either side, and nothing in the rotation report changes the minutes assumption behind this projection.`,
    }),
    warn: (c) => ({
      headline: c.note,
      explanation: `${c.note}. It does not invalidate the projection, but it widens the band around the minutes term more than the posted price reflects.`,
    }),
    fail: (c) => ({
      headline: c.note,
      explanation: `${c.note}. This is the single scenario that removes the top of the outcome range, and it is also the scenario the market is currently pricing toward.`,
    }),
  },
};

const STATUS_BY_CHAR: Record<string, FilterStatus> = { p: "pass", w: "warn", f: "fail" };

/** Expands an eight-character verdict code into the full signal array. */
function buildSignals(code: string, ctx: SignalContext, meta: OpportunityMeta): OpportunitySignal[] {
  return ATLAS_SIGNALS.map((signal, index) => {
    const status = STATUS_BY_CHAR[code[index]] ?? "warn";
    const copy = SIGNAL_COPY[signal.id][status](ctx, meta);
    return { id: signal.id, name: signal.label, status, ...copy };
  });
}

/* ------------------------------------------------------------- board rows -- */

interface RawOpportunity extends OpportunityMeta {
  id: string;
  sport: SportId;
  playerId: string;
  playerSlug: string;
  team: string;
  matchup: string;
  market: string;
  projection: number;
  edge: number;
  confidence: number;
  bestOdds: string;
  bestBook: string;
  dayOffset: 0 | 1 | 2;
  tipoff: string;
  opportunityScore: number;
  volatility: Volatility;
  /** pace, minutes, usage, matchup, rest, line value, market, injuries. */
  code: string;
  ctx: SignalContext;
  summary: string;
}

const RAW: RawOpportunity[] = [
  /* ------------------------------------------------------------- NBA today -- */
  {
    id: "nba-1", sport: "nba", playerId: "edwards", playerSlug: "anthony-edwards",
    player: "Anthony Edwards", team: "MIN", opponent: "DEN", matchup: "MIN at DEN",
    market: "points", marketLabel: "Points", side: "Over", line: 27.5, projection: 31.8,
    edge: 14.2, confidence: 92, bestOdds: "-108", bestBook: "Pinnacle",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 92, volatility: "Low",
    code: "pppppppw",
    ctx: { oppPace: 101.4, oppPaceRank: 6, projMinutes: 37.2, usage: 33.1, oppDefRank: 22, daysRest: 2, consensus: 28.5, lineMove: 1, note: "Denver's starting guard ruled out" },
    summary: "Denver's starting guard was ruled out at 11:34 and the derivative markets have not fully absorbed it. The game total moved; the wing props lagged by roughly forty minutes. That gap is the row.",
  },
  {
    id: "nba-2", sport: "nba", playerId: "edwards", playerSlug: "anthony-edwards",
    player: "Anthony Edwards", team: "MIN", opponent: "DEN", matchup: "MIN at DEN",
    market: "pra", marketLabel: "PRA", side: "Over", line: 37.5, projection: 41.9,
    edge: 11.4, confidence: 88, bestOdds: "-112", bestBook: "Circa",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 85, volatility: "Low",
    code: "ppppppwf",
    ctx: { oppPace: 101.4, oppPaceRank: 6, projMinutes: 37.2, usage: 33.1, oppDefRank: 22, daysRest: 2, consensus: 38.5, lineMove: 1, note: "9.5 spread carries fourth-quarter risk" },
    summary: "The combination market carries the same usage bump as the points row but spreads it across three categories, which dampens the variance without giving up much of the edge.",
  },
  {
    id: "nba-3", sport: "nba", playerId: "edwards", playerSlug: "anthony-edwards",
    player: "Anthony Edwards", team: "MIN", opponent: "DEN", matchup: "MIN at DEN",
    market: "threes", marketLabel: "3PT Made", side: "Over", line: 3.5, projection: 4.2,
    edge: 9.1, confidence: 84, bestOdds: "+104", bestBook: "FanDuel",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 78, volatility: "High",
    code: "ppwppppf",
    ctx: { oppPace: 101.4, oppPaceRank: 6, projMinutes: 37.2, usage: 33.1, oppDefRank: 22, daysRest: 2, consensus: 3.5, lineMove: 0, note: "9.5 spread carries fourth-quarter risk" },
    summary: "Denver concedes the sixth most attempts from range to wings. The projection is sound, but three-point markets are the highest-variance row on any board — the score reflects that, the confidence does not.",
  },
  {
    id: "nba-4", sport: "nba", playerId: "jokic", playerSlug: "nikola-jokic",
    player: "Nikola Jokić", team: "DEN", opponent: "MIN", matchup: "MIN at DEN",
    market: "assists", marketLabel: "Assists", side: "Over", line: 9.5, projection: 11.2,
    edge: 9.4, confidence: 87, bestOdds: "-115", bestBook: "Circa",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 84, volatility: "Low",
    code: "pppfpppp",
    ctx: { oppPace: 99.8, oppPaceRank: 18, projMinutes: 35.1, usage: 29.1, oppDefRank: 7, daysRest: 2, consensus: 10.5, lineMove: 0, note: "Both rotations intact" },
    summary: "Two books still post 9.5 while the consensus has moved to 10.5. The matchup is the one thing arguing against it: Minnesota defends the post without doubling, which historically suppresses his assist volume.",
  },
  {
    id: "nba-5", sport: "nba", playerId: "jokic", playerSlug: "nikola-jokic",
    player: "Nikola Jokić", team: "DEN", opponent: "MIN", matchup: "MIN at DEN",
    market: "pra", marketLabel: "PRA", side: "Over", line: 46.5, projection: 50.8,
    edge: 8.2, confidence: 86, bestOdds: "-110", bestBook: "DraftKings",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 81, volatility: "Low",
    code: "ppppppwp",
    ctx: { oppPace: 99.8, oppPaceRank: 18, projMinutes: 35.1, usage: 29.1, oppDefRank: 7, daysRest: 2, consensus: 47.5, lineMove: 1, note: "Both rotations intact" },
    summary: "The most sample-stable row on the board. His combination output has landed inside a six-point band in eleven of the last twelve, which is why confidence sits high despite a modest edge.",
  },
  {
    id: "nba-6", sport: "nba", playerId: "jokic", playerSlug: "nikola-jokic",
    player: "Nikola Jokić", team: "DEN", opponent: "MIN", matchup: "MIN at DEN",
    market: "rebounds", marketLabel: "Rebounds", side: "Over", line: 12.5, projection: 13.6,
    edge: 5.4, confidence: 81, bestOdds: "-105", bestBook: "BetOnline",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 68, volatility: "Medium",
    code: "wpppppwp",
    ctx: { oppPace: 99.8, oppPaceRank: 18, projMinutes: 35.1, usage: 29.1, oppDefRank: 7, daysRest: 2, consensus: 12.5, lineMove: 0.5, note: "Both rotations intact" },
    summary: "A thin edge against a number the market has mostly got right. Included because the price is the best available, not because the projection is far from the line.",
  },
  {
    id: "nba-7", sport: "nba", playerId: "towns", playerSlug: "karl-anthony-towns",
    player: "Karl-Anthony Towns", team: "MIN", opponent: "DEN", matchup: "MIN at DEN",
    market: "rebounds", marketLabel: "Rebounds", side: "Over", line: 8.5, projection: 10.1,
    edge: 12.6, confidence: 90, bestOdds: "-118", bestBook: "Pinnacle",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 88, volatility: "Low",
    code: "ppppppwp",
    ctx: { oppPace: 101.4, oppPaceRank: 6, projMinutes: 32.6, usage: 24.4, oppDefRank: 22, daysRest: 2, consensus: 9.5, lineMove: 1, note: "Minnesota frontcourt intact" },
    summary: "Denver's pace and their bottom-third defensive rebounding rate point the same direction. Two books still show 8.5 against a 9.5 consensus, which is where most of the edge sits.",
  },
  {
    id: "nba-8", sport: "nba", playerId: "towns", playerSlug: "karl-anthony-towns",
    player: "Karl-Anthony Towns", team: "MIN", opponent: "DEN", matchup: "MIN at DEN",
    market: "points", marketLabel: "Points", side: "Under", line: 20.5, projection: 18.2,
    edge: 6.8, confidence: 79, bestOdds: "-110", bestBook: "Caesars",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 64, volatility: "Medium",
    code: "pwwpppwp",
    ctx: { oppPace: 101.4, oppPaceRank: 6, projMinutes: 32.6, usage: 24.4, oppDefRank: 22, daysRest: 2, consensus: 20.5, lineMove: 0.5, note: "Foul trouble history vs this frontcourt" },
    summary: "The under rests on foul trouble rather than the matchup — he has picked up four fouls in five of the last ten against this frontcourt. That is a real pattern with a small sample behind it.",
  },
  {
    id: "nba-9", sport: "nba", playerId: "murray", playerSlug: "jamal-murray",
    player: "Jamal Murray", team: "DEN", opponent: "MIN", matchup: "MIN at DEN",
    market: "points", marketLabel: "Points", side: "Under", line: 22.5, projection: 19.4,
    edge: 10.2, confidence: 83, bestOdds: "-115", bestBook: "Circa",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 74, volatility: "Medium",
    code: "wwpfpppp",
    ctx: { oppPace: 99.8, oppPaceRank: 18, projMinutes: 31.8, usage: 25.8, oppDefRank: 7, daysRest: 2, consensus: 22.5, lineMove: 0, note: "9.5 spread, blowout risk both ways" },
    summary: "Minnesota switches every screen and has the perimeter size to do it, the coverage behind his three lowest scoring games. The blowout risk that hurts the Edwards row helps this one.",
  },
  {
    id: "nba-10", sport: "nba", playerId: "murray", playerSlug: "jamal-murray",
    player: "Jamal Murray", team: "DEN", opponent: "MIN", matchup: "MIN at DEN",
    market: "assists", marketLabel: "Assists", side: "Over", line: 6.5, projection: 7.4,
    edge: 5.1, confidence: 76, bestOdds: "+100", bestBook: "FanDuel",
    dayOffset: 0, tipoff: "8:10 PM ET", opportunityScore: 58, volatility: "High",
    code: "wwpfppwp",
    ctx: { oppPace: 99.8, oppPaceRank: 18, projMinutes: 31.8, usage: 25.8, oppDefRank: 7, daysRest: 2, consensus: 6.5, lineMove: 0.5, note: "9.5 spread, blowout risk both ways" },
    summary: "A marginal row kept on the board for completeness. Plus money on a projection this close to the line is the only reason it clears the threshold.",
  },

  /* ---------------------------------------------------------- NBA tomorrow -- */
  {
    id: "nba-11", sport: "nba", playerId: "edwards", playerSlug: "anthony-edwards",
    player: "Anthony Edwards", team: "MIN", opponent: "PHX", matchup: "MIN at PHX",
    market: "points", marketLabel: "Points", side: "Over", line: 26.5, projection: 29.4,
    edge: 8.6, confidence: 85, bestOdds: "-106", bestBook: "DraftKings",
    dayOffset: 1, tipoff: "9:00 PM ET", opportunityScore: 79, volatility: "Low",
    code: "ppppwpwp",
    ctx: { oppPace: 100.8, oppPaceRank: 9, projMinutes: 36.4, usage: 33.1, oppDefRank: 19, daysRest: 1, consensus: 27.5, lineMove: 1, note: "Phoenix rotation intact" },
    summary: "The second night of a road pair. The matchup is still favourable, but one day of rest is the difference between this and the Denver row a day earlier.",
  },
  {
    id: "nba-12", sport: "nba", playerId: "jokic", playerSlug: "nikola-jokic",
    player: "Nikola Jokić", team: "DEN", opponent: "LAL", matchup: "LAL at DEN",
    market: "points", marketLabel: "Points", side: "Over", line: 24.5, projection: 28.1,
    edge: 13.1, confidence: 91, bestOdds: "-110", bestBook: "Pinnacle",
    dayOffset: 1, tipoff: "10:00 PM ET", opportunityScore: 94, volatility: "Low",
    code: "pppppppp",
    ctx: { oppPace: 100.2, oppPaceRank: 11, projMinutes: 35.8, usage: 29.1, oppDefRank: 24, daysRest: 1, consensus: 25.5, lineMove: 1, note: "Los Angeles starting centre out" },
    summary: "All eight signals clear, which happens perhaps twice a week. Los Angeles are without their starting centre, and the backup has conceded the second-most points to opposing fives this season.",
  },
  {
    id: "nba-13", sport: "nba", playerId: "towns", playerSlug: "karl-anthony-towns",
    player: "Karl-Anthony Towns", team: "MIN", opponent: "PHX", matchup: "MIN at PHX",
    market: "pr", marketLabel: "PR", side: "Over", line: 29.5, projection: 32.4,
    edge: 7.4, confidence: 80, bestOdds: "-108", bestBook: "BetMGM",
    dayOffset: 1, tipoff: "9:00 PM ET", opportunityScore: 71, volatility: "Medium",
    code: "ppwpppwp",
    ctx: { oppPace: 100.8, oppPaceRank: 9, projMinutes: 32.8, usage: 24.4, oppDefRank: 19, daysRest: 1, consensus: 30.5, lineMove: 1, note: "Phoenix rotation intact" },
    summary: "Points plus rebounds smooths the foul-trouble risk that makes his single-category markets awkward. The same projection, expressed in a less fragile way.",
  },
  {
    id: "nba-14", sport: "nba", playerId: "murray", playerSlug: "jamal-murray",
    player: "Jamal Murray", team: "DEN", opponent: "LAL", matchup: "LAL at DEN",
    market: "pa", marketLabel: "PA", side: "Over", line: 28.5, projection: 30.2,
    edge: 4.2, confidence: 72, bestOdds: "-112", bestBook: "Caesars",
    dayOffset: 1, tipoff: "10:00 PM ET", opportunityScore: 52, volatility: "High",
    code: "wwppppww",
    ctx: { oppPace: 100.2, oppPaceRank: 11, projMinutes: 32.4, usage: 25.8, oppDefRank: 24, daysRest: 1, consensus: 29.5, lineMove: 0.5, note: "Minutes trimmed in three of last five" },
    summary: "The thinnest edge on the board with the widest minutes band behind it. Shown so the filtering has something at the bottom of the range to exclude.",
  },

  /* ------------------------------------------------------- NBA two days out -- */
  {
    id: "nba-15", sport: "nba", playerId: "edwards", playerSlug: "anthony-edwards",
    player: "Anthony Edwards", team: "MIN", opponent: "SAC", matchup: "SAC at MIN",
    market: "rebounds", marketLabel: "Rebounds", side: "Over", line: 5.5, projection: 6.4,
    edge: 7.9, confidence: 77, bestOdds: "-114", bestBook: "FanDuel",
    dayOffset: 2, tipoff: "8:00 PM ET", opportunityScore: 66, volatility: "Medium",
    code: "ppwwpppf",
    ctx: { oppPace: 103.2, oppPaceRank: 2, projMinutes: 36.8, usage: 33.1, oppDefRank: 21, daysRest: 2, consensus: 6.5, lineMove: 1, note: "Sacramento listing two starters questionable" },
    summary: "Sacramento play at the second-fastest pace in the league, which lifts every counting market in this game. The rebounding number has not moved with it yet.",
  },
  {
    id: "nba-16", sport: "nba", playerId: "jokic", playerSlug: "nikola-jokic",
    player: "Nikola Jokić", team: "DEN", opponent: "UTA", matchup: "DEN at UTA",
    market: "pa", marketLabel: "PA", side: "Over", line: 34.5, projection: 38.6,
    edge: 15.8, confidence: 93, bestOdds: "-104", bestBook: "Circa",
    dayOffset: 2, tipoff: "9:30 PM ET", opportunityScore: 96, volatility: "Low",
    code: "pppppppp",
    ctx: { oppPace: 104.1, oppPaceRank: 1, projMinutes: 36.2, usage: 29.1, oppDefRank: 26, daysRest: 2, consensus: 36.5, lineMove: 2, note: "Utah rotation intact" },
    summary: "The best row on the board and the clearest one to explain: the fastest pace in the league, a bottom-five defence, two days of rest, and a number two full points behind the consensus.",
  },
  {
    id: "nba-17", sport: "nba", playerId: "towns", playerSlug: "karl-anthony-towns",
    player: "Karl-Anthony Towns", team: "MIN", opponent: "SAC", matchup: "SAC at MIN",
    market: "assists", marketLabel: "Assists", side: "Over", line: 2.5, projection: 3.4,
    edge: 6.1, confidence: 74, bestOdds: "-125", bestBook: "DraftKings",
    dayOffset: 2, tipoff: "8:00 PM ET", opportunityScore: 55, volatility: "High",
    code: "pwwppppf",
    ctx: { oppPace: 103.2, oppPaceRank: 2, projMinutes: 32.4, usage: 24.4, oppDefRank: 21, daysRest: 2, consensus: 2.5, lineMove: 0, note: "Sacramento listing two starters questionable" },
    summary: "A low-line market where a single extra pass decides it. The projection is above the number, but the distribution is coarse enough that the edge is less meaningful than it reads.",
  },
  {
    id: "nba-18", sport: "nba", playerId: "murray", playerSlug: "jamal-murray",
    player: "Jamal Murray", team: "DEN", opponent: "UTA", matchup: "DEN at UTA",
    market: "threes", marketLabel: "3PT Made", side: "Under", line: 2.5, projection: 1.9,
    edge: 5.6, confidence: 70, bestOdds: "+102", bestBook: "ESPN Bet",
    dayOffset: 2, tipoff: "9:30 PM ET", opportunityScore: 44, volatility: "High",
    code: "wwffpwpp",
    ctx: { oppPace: 104.1, oppPaceRank: 1, projMinutes: 31.6, usage: 25.8, oppDefRank: 26, daysRest: 2, consensus: 2.5, lineMove: 0, note: "Minutes trimmed in three of last five" },
    summary: "Three signals fail and the pace is working against the under. On the board because the price is plus money, and nothing else.",
  },

  /* ------------------------------------------------------------ WNBA today -- */
  {
    id: "wnba-1", sport: "wnba", playerId: "wilson", playerSlug: "a-ja-wilson",
    player: "A'ja Wilson", team: "LV", opponent: "SEA", matchup: "LV at SEA",
    market: "points", marketLabel: "Points", side: "Over", line: 21.5, projection: 24.0,
    edge: 11.6, confidence: 89, bestOdds: "-110", bestBook: "FanDuel",
    dayOffset: 0, tipoff: "10:00 PM ET", opportunityScore: 83, volatility: "Low",
    code: "pwppfppp",
    ctx: { oppPace: 96.2, oppPaceRank: 8, projMinutes: 33.0, usage: 31.6, oppDefRank: 8, daysRest: 1, consensus: 22.5, lineMove: 1, note: "Both rotations intact" },
    summary: "The widest projection gap on the WNBA board. Rest is the one thing against it — her scoring drops 3.1 points per game on one day with travel, and this is that exact situation.",
  },
  {
    id: "wnba-2", sport: "wnba", playerId: "wilson", playerSlug: "a-ja-wilson",
    player: "A'ja Wilson", team: "LV", opponent: "SEA", matchup: "LV at SEA",
    market: "rebounds", marketLabel: "Rebounds", side: "Over", line: 10.5, projection: 11.8,
    edge: 8.4, confidence: 82, bestOdds: "-112", bestBook: "DraftKings",
    dayOffset: 0, tipoff: "10:00 PM ET", opportunityScore: 73, volatility: "Medium",
    code: "ppwpfppp",
    ctx: { oppPace: 96.2, oppPaceRank: 8, projMinutes: 33.0, usage: 31.6, oppDefRank: 8, daysRest: 1, consensus: 10.5, lineMove: 0, note: "Both rotations intact" },
    summary: "Rebounding holds up on short rest far better than scoring does, which is why this row survives the same rest failure that caps the points row.",
  },
  {
    id: "wnba-3", sport: "wnba", playerId: "clark", playerSlug: "caitlin-clark",
    player: "Caitlin Clark", team: "IND", opponent: "NY", matchup: "IND at NY",
    market: "assists", marketLabel: "Assists", side: "Over", line: 8.5, projection: 9.8,
    edge: 5.9, confidence: 75, bestOdds: "-118", bestBook: "DraftKings",
    dayOffset: 0, tipoff: "7:00 PM ET", opportunityScore: 57, volatility: "High",
    code: "wppfwpwp",
    ctx: { oppPace: 94.8, oppPaceRank: 4, projMinutes: 35.4, usage: 29.7, oppDefRank: 4, daysRest: 1, consensus: 9.5, lineMove: 1, note: "Both rotations intact" },
    summary: "New York pressure ball handlers above the arc, the exact look behind her three lowest assist games. Books disagree by a full assist, which usually means the input is genuinely uncertain.",
  },
  {
    id: "wnba-4", sport: "wnba", playerId: "stewart", playerSlug: "breanna-stewart",
    player: "Breanna Stewart", team: "NY", opponent: "IND", matchup: "IND at NY",
    market: "rebounds", marketLabel: "Rebounds", side: "Over", line: 8.5, projection: 9.6,
    edge: 9.2, confidence: 86, bestOdds: "-106", bestBook: "Pinnacle",
    dayOffset: 0, tipoff: "7:00 PM ET", opportunityScore: 80, volatility: "Low",
    code: "pppwwppp",
    ctx: { oppPace: 99.4, oppPaceRank: 2, projMinutes: 33.4, usage: 27.4, oppDefRank: 9, daysRest: 1, consensus: 9.5, lineMove: 1, note: "Both rotations intact" },
    summary: "Indiana play at the second-fastest pace in the league and concede the third most rebounds to opposing forwards. The number is the last thing that has not moved.",
  },

  /* --------------------------------------------------------- WNBA tomorrow -- */
  {
    id: "wnba-5", sport: "wnba", playerId: "collier", playerSlug: "napheesa-collier",
    player: "Napheesa Collier", team: "MIN", opponent: "SEA", matchup: "SEA at MIN",
    market: "points", marketLabel: "Points", side: "Over", line: 20.5, projection: 23.4,
    edge: 12.8, confidence: 90, bestOdds: "-108", bestBook: "Circa",
    dayOffset: 1, tipoff: "9:00 PM ET", opportunityScore: 89, volatility: "Low",
    code: "pppwpppp",
    ctx: { oppPace: 96.2, oppPaceRank: 8, projMinutes: 34.1, usage: 27.9, oppDefRank: 8, daysRest: 2, consensus: 21.5, lineMove: 1, note: "Seattle centre cleared protocol Tuesday" },
    summary: "Two days of rest at home with usage trending up over eight games. The only signal short of a pass is the matchup, and Seattle have no natural match for her at the four.",
  },
  {
    id: "wnba-6", sport: "wnba", playerId: "collier", playerSlug: "napheesa-collier",
    player: "Napheesa Collier", team: "MIN", opponent: "SEA", matchup: "SEA at MIN",
    market: "pra", marketLabel: "PRA", side: "Over", line: 33.5, projection: 36.9,
    edge: 7.2, confidence: 81, bestOdds: "-110", bestBook: "BetMGM",
    dayOffset: 1, tipoff: "9:00 PM ET", opportunityScore: 70, volatility: "Medium",
    code: "pppwpwpp",
    ctx: { oppPace: 96.2, oppPaceRank: 8, projMinutes: 34.1, usage: 27.9, oppDefRank: 8, daysRest: 2, consensus: 34.0, lineMove: 0.5, note: "Seattle centre cleared protocol Tuesday" },
    summary: "The same read as the points row with less of the edge left in it — the combination number has already absorbed most of the move.",
  },

  /* ------------------------------------------------------ WNBA two days out -- */
  {
    id: "wnba-7", sport: "wnba", playerId: "clark", playerSlug: "caitlin-clark",
    player: "Caitlin Clark", team: "IND", opponent: "CHI", matchup: "CHI at IND",
    market: "points", marketLabel: "Points", side: "Over", line: 20.5, projection: 22.6,
    edge: 6.4, confidence: 73, bestOdds: "-105", bestBook: "Caesars",
    dayOffset: 2, tipoff: "8:00 PM ET", opportunityScore: 61, volatility: "Medium",
    code: "wppfwpwp",
    ctx: { oppPace: 98.1, oppPaceRank: 11, projMinutes: 35.0, usage: 29.7, oppDefRank: 11, daysRest: 2, consensus: 21.5, lineMove: 0.5, note: "Chicago listing a starter questionable" },
    summary: "A softer matchup than the New York game two days earlier, but the number has moved to meet it. What is left is a modest edge on a well-priced market.",
  },
  {
    id: "wnba-8", sport: "wnba", playerId: "stewart", playerSlug: "breanna-stewart",
    player: "Breanna Stewart", team: "NY", opponent: "CON", matchup: "NY at CON",
    market: "points", marketLabel: "Points", side: "Under", line: 20.5, projection: 18.4,
    edge: 5.1, confidence: 71, bestOdds: "-110", bestBook: "ESPN Bet",
    dayOffset: 2, tipoff: "7:30 PM ET", opportunityScore: 42, volatility: "High",
    code: "wpwfwfpp",
    ctx: { oppPace: 93.4, oppPaceRank: 12, projMinutes: 31.8, usage: 27.4, oppDefRank: 2, daysRest: 1, consensus: 19.5, lineMove: 1, note: "Both rotations intact" },
    summary: "Connecticut are the second-rated defence in the league and slow the game down. The under is directionally right, but the line has already moved past the best available price.",
  },
];

/**
 * The scored board.
 *
 * Built once at module load. When this becomes an API call the shape is
 * unchanged — the filtering layer only ever sees `Opportunity[]`.
 */
export const OPPORTUNITIES: Opportunity[] = RAW.map((row) => {
  const { code, ctx, ...rest } = row;
  return {
    ...rest,
    signals: buildSignals(code, ctx, {
      player: row.player,
      opponent: row.opponent,
      marketLabel: row.marketLabel,
      side: row.side,
      line: row.line,
    }),
  };
});

/** Sports with a fixture board behind them. Everything else shows coming-soon. */
export function sportHasBoard(sport: SportId): boolean {
  return marketsForSport(sport).length > 0 && OPPORTUNITIES.some((o) => o.sport === sport);
}
