import type { FilterStatus } from "./dashboardFixtures";
import { sportIdFromLeague, type SportId } from "@/lib/sports";

/**
 * ---------------------------------------------------------------------------
 * SAMPLE DATA for Player Lookup — nothing here is real.
 * ---------------------------------------------------------------------------
 *
 * Shaped the way the FastAPI backend will return it: a player record, a game
 * log of per-game rows carrying every field the filters need, a market book,
 * and the aggregator's signal output. Every derived figure the page shows —
 * over/under rate, averages, the chart — is computed from `games` at runtime,
 * so replacing this module with a fetch changes nothing in the UI.
 */

/* --------------------------------------------------------------- markets -- */

export type StatKey = "points" | "rebounds" | "assists";

export const STAT_LABEL: Record<StatKey, string> = {
  points: "Points",
  rebounds: "Rebounds",
  assists: "Assists",
};

export type GameScript = "close" | "neutral" | "blowout";

export interface GameLogEntry {
  id: string;
  date: string;
  opponent: string;
  homeAway: "home" | "away";
  result: string;
  minutes: number;
  usage: number;
  daysRest: number;
  teammateOut: boolean;
  gameScript: GameScript;
  /** 1 = best defence in the league. */
  oppDefenseRank: number;
  oppPace: number;
  points: number;
  rebounds: number;
  assists: number;
}

/**
 * Compact source rows, expanded below. Ordered oldest → newest; the UI reverses
 * where it wants most-recent-first.
 *
 * [date, opp, home?, pts, reb, ast, min, usage, rest, teammateOut, script, oppDefRank, oppPace]
 */
type RawGame = [
  string, string, boolean, number, number, number, number, number, number, boolean, GameScript, number, number,
];

function expand(playerId: string, rows: RawGame[]): GameLogEntry[] {
  return rows.map((r, i) => {
    const [date, opponent, home, points, rebounds, assists, minutes, usage, daysRest, teammateOut, gameScript, oppDefenseRank, oppPace] = r;
    return {
      id: `${playerId}-g${i}`,
      date,
      opponent,
      homeAway: home ? "home" : "away",
      // Deterministic, and only ever shown as context beneath a bar.
      result: home ? "W" : i % 3 === 0 ? "L" : "W",
      minutes,
      usage,
      daysRest,
      teammateOut,
      gameScript,
      oppDefenseRank,
      oppPace,
      points,
      rebounds,
      assists,
    };
  });
}

/* --------------------------------------------------------------- players -- */

export interface SeasonBaseline {
  points: number;
  rebounds: number;
  assists: number;
  minutes: number;
  usage: number;
  /** League percentile, 0–100, per metric. */
  percentiles: Record<"points" | "rebounds" | "assists" | "minutes" | "usage", number>;
}

export interface PlayerMarket {
  stat: StatKey;
  line: number;
  overOdds: string;
  underOdds: string;
}

export interface SignalDef {
  id: string;
  name: string;
  status: FilterStatus;
  headline: string;
  explanation: string;
}

export interface BookPrice {
  book: string;
  over: string;
  under: string;
  line: number;
  /** Movement since open, in line units. */
  movement: number;
  isFair?: boolean;
}

export interface PlayerFixture {
  id: string;
  name: string;
  team: string;
  teamName: string;
  position: string;
  number: string;
  league: string;
  nextGame: {
    opponent: string;
    opponentName: string;
    tipoff: string;
    homeAway: "home" | "away";
    daysRest: number;
    opponentPace: number;
    opponentPaceRank: number;
    opponentDefRating: number;
    opponentDefRank: number;
  };
  seasonMinutes: number;
  usageRate: number;
  baseline: SeasonBaseline;
  markets: PlayerMarket[];
  signals: SignalDef[];
  books: BookPrice[];
  games: GameLogEntry[];
}

const EDWARDS_GAMES: RawGame[] = [
  ["Jul 09", "PHX", true, 24, 5, 4, 35.1, 30.2, 2, false, "neutral", 14, 99.1],
  ["Jul 12", "GSW", false, 31, 6, 3, 37.4, 32.8, 2, false, "close", 9, 101.8],
  ["Jul 15", "SAC", true, 22, 4, 6, 33.2, 28.9, 1, false, "blowout", 21, 103.2],
  ["Jul 18", "LAL", false, 35, 7, 5, 39.0, 34.6, 2, true, "close", 12, 98.4],
  ["Jul 21", "DAL", true, 27, 5, 4, 36.2, 31.0, 1, false, "neutral", 17, 100.2],
  ["Jul 24", "OKC", false, 19, 3, 2, 30.8, 27.4, 0, false, "blowout", 3, 97.6],
  ["Jul 27", "HOU", true, 33, 8, 6, 38.5, 33.9, 2, true, "close", 11, 99.8],
  ["Jul 30", "POR", false, 29, 6, 5, 36.9, 31.7, 1, false, "neutral", 24, 102.4],
  ["Aug 02", "UTA", true, 38, 5, 7, 40.1, 35.8, 2, true, "close", 26, 104.1],
  ["Aug 04", "SAS", false, 26, 4, 3, 34.6, 29.8, 1, false, "neutral", 19, 101.1],
  ["Aug 06", "GSW", true, 32, 7, 5, 38.2, 33.4, 1, false, "close", 9, 101.8],
  ["Aug 07", "DEN", false, 30, 6, 4, 37.0, 32.6, 2, true, "neutral", 22, 101.4],
];

const JOKIC_GAMES: RawGame[] = [
  ["Jul 10", "MIN", true, 27, 13, 9, 34.2, 29.1, 2, false, "close", 6, 99.4],
  ["Jul 13", "LAC", false, 22, 11, 12, 33.8, 27.6, 1, false, "neutral", 13, 98.2],
  ["Jul 16", "PHX", true, 31, 15, 8, 36.1, 31.2, 2, false, "close", 14, 99.1],
  ["Jul 19", "MEM", false, 19, 10, 11, 31.4, 25.8, 0, false, "blowout", 8, 100.6],
  ["Jul 22", "NOP", true, 25, 12, 10, 34.9, 28.4, 2, true, "neutral", 16, 101.2],
  ["Jul 25", "OKC", false, 28, 9, 7, 35.2, 30.1, 1, false, "close", 3, 97.6],
  ["Jul 28", "SAC", true, 24, 14, 13, 33.6, 27.9, 2, false, "neutral", 21, 103.2],
  ["Jul 31", "DAL", false, 30, 11, 9, 36.8, 31.6, 1, true, "close", 17, 100.2],
  ["Aug 03", "POR", true, 21, 13, 14, 32.1, 26.4, 2, false, "blowout", 24, 102.4],
  ["Aug 05", "UTA", false, 26, 12, 8, 34.4, 28.8, 1, false, "neutral", 26, 104.1],
  ["Aug 06", "LAL", true, 29, 16, 11, 36.2, 30.8, 0, false, "close", 12, 98.4],
  ["Aug 07", "MIN", true, 25, 12, 10, 34.8, 29.4, 2, false, "neutral", 7, 99.8],
];

const WILSON_GAMES: RawGame[] = [
  ["Jul 11", "SEA", false, 21, 9, 3, 32.4, 30.1, 2, false, "neutral", 8, 96.2],
  ["Jul 14", "NY", true, 26, 11, 2, 34.8, 32.6, 1, false, "close", 4, 94.8],
  ["Jul 17", "CON", false, 18, 8, 4, 30.2, 27.9, 2, false, "blowout", 2, 93.4],
  ["Jul 20", "CHI", true, 29, 12, 3, 35.6, 34.2, 1, true, "close", 11, 98.1],
  ["Jul 23", "IND", false, 23, 10, 5, 33.1, 30.8, 2, false, "neutral", 9, 99.4],
  ["Jul 26", "PHX", true, 27, 9, 2, 34.2, 32.1, 1, false, "close", 10, 97.6],
  ["Jul 29", "DAL", false, 20, 11, 4, 31.8, 28.6, 0, false, "blowout", 6, 95.2],
  ["Aug 01", "ATL", true, 31, 13, 3, 36.4, 35.1, 2, true, "close", 12, 99.8],
  ["Aug 03", "LA", false, 24, 10, 5, 33.4, 31.2, 1, false, "neutral", 7, 96.8],
  ["Aug 05", "MIN", true, 28, 12, 4, 35.1, 33.4, 2, false, "close", 5, 95.6],
  ["Aug 06", "SEA", false, 22, 9, 3, 32.6, 30.4, 0, false, "neutral", 8, 96.2],
  ["Aug 07", "SEA", false, 25, 11, 4, 34.0, 32.0, 1, true, "close", 8, 96.2],
];

const MURRAY_GAMES: RawGame[] = [
  ["Jul 10", "MIN", true, 24, 4, 7, 33.1, 26.8, 2, false, "close", 7, 99.8],
  ["Jul 13", "LAC", false, 18, 3, 5, 30.6, 24.2, 1, false, "neutral", 13, 98.2],
  ["Jul 16", "PHX", true, 27, 5, 6, 34.8, 28.1, 2, false, "close", 14, 99.1],
  ["Jul 19", "MEM", false, 15, 2, 4, 28.4, 22.6, 0, false, "blowout", 8, 100.6],
  ["Jul 22", "NOP", true, 22, 4, 8, 33.2, 26.1, 2, true, "neutral", 16, 101.2],
  ["Jul 25", "OKC", false, 19, 3, 5, 31.8, 25.4, 1, false, "close", 3, 97.6],
  ["Jul 28", "SAC", true, 26, 5, 6, 34.1, 27.6, 2, false, "neutral", 21, 103.2],
  ["Jul 31", "DAL", false, 21, 4, 7, 32.9, 26.2, 1, true, "close", 17, 100.2],
  ["Aug 03", "POR", true, 17, 3, 5, 29.8, 23.9, 2, false, "blowout", 24, 102.4],
  ["Aug 05", "UTA", false, 25, 5, 6, 34.4, 27.8, 1, false, "neutral", 26, 104.1],
  ["Aug 06", "LAL", true, 20, 4, 8, 32.2, 25.8, 0, false, "close", 12, 98.4],
  ["Aug 07", "MIN", true, 18, 3, 6, 31.4, 24.9, 2, false, "neutral", 7, 99.8],
];

const TOWNS_GAMES: RawGame[] = [
  ["Jul 09", "PHX", true, 23, 9, 3, 32.6, 25.1, 2, false, "neutral", 14, 99.1],
  ["Jul 12", "GSW", false, 18, 7, 2, 30.4, 22.8, 2, false, "close", 9, 101.8],
  ["Jul 15", "SAC", true, 26, 11, 4, 34.2, 27.4, 1, false, "blowout", 21, 103.2],
  ["Jul 18", "LAL", false, 15, 8, 2, 29.1, 21.6, 2, true, "close", 12, 98.4],
  ["Jul 21", "DAL", true, 21, 10, 3, 32.8, 24.9, 1, false, "neutral", 17, 100.2],
  ["Jul 24", "OKC", false, 12, 6, 1, 26.4, 19.8, 0, false, "blowout", 3, 97.6],
  ["Jul 27", "HOU", true, 28, 12, 4, 35.6, 28.2, 2, true, "close", 11, 99.8],
  ["Jul 30", "POR", false, 24, 9, 3, 33.4, 26.1, 1, false, "neutral", 24, 102.4],
  ["Aug 02", "UTA", true, 19, 8, 2, 31.2, 23.4, 2, true, "close", 26, 104.1],
  ["Aug 04", "SAS", false, 22, 10, 4, 33.0, 25.6, 1, false, "neutral", 19, 101.1],
  ["Aug 06", "GSW", true, 16, 7, 2, 29.8, 22.1, 1, false, "close", 9, 101.8],
  ["Aug 07", "DEN", false, 25, 11, 3, 34.1, 26.8, 2, true, "neutral", 22, 101.4],
];

const STEWART_GAMES: RawGame[] = [
  ["Jul 11", "IND", true, 22, 8, 4, 33.2, 28.6, 2, false, "neutral", 9, 99.4],
  ["Jul 14", "LV", false, 17, 7, 3, 31.4, 26.1, 1, false, "close", 5, 95.6],
  ["Jul 17", "CON", true, 25, 10, 5, 34.8, 30.2, 2, false, "close", 2, 93.4],
  ["Jul 20", "CHI", false, 14, 6, 2, 28.6, 23.8, 1, false, "blowout", 11, 98.1],
  ["Jul 23", "SEA", true, 21, 9, 4, 33.0, 27.9, 2, true, "neutral", 8, 96.2],
  ["Jul 26", "PHX", false, 19, 8, 3, 32.1, 26.4, 1, false, "close", 10, 97.6],
  ["Jul 29", "DAL", true, 26, 11, 5, 35.2, 30.8, 0, false, "neutral", 6, 95.2],
  ["Aug 01", "ATL", false, 16, 7, 2, 30.2, 24.6, 2, false, "blowout", 12, 99.8],
  ["Aug 03", "LA", true, 23, 9, 4, 33.8, 28.4, 1, true, "close", 7, 96.8],
  ["Aug 05", "MIN", false, 20, 8, 3, 32.4, 27.1, 2, false, "neutral", 5, 95.6],
  ["Aug 06", "IND", true, 24, 10, 5, 34.4, 29.6, 1, false, "close", 9, 99.4],
  ["Aug 07", "IND", true, 18, 7, 3, 31.0, 25.8, 1, false, "neutral", 9, 99.4],
];

const COLLIER_GAMES: RawGame[] = [
  ["Jul 11", "PHX", false, 19, 9, 3, 32.8, 27.2, 2, false, "neutral", 10, 97.6],
  ["Jul 14", "SEA", true, 24, 11, 4, 34.6, 29.8, 1, false, "close", 8, 96.2],
  ["Jul 17", "LA", false, 16, 8, 2, 30.4, 25.1, 2, false, "blowout", 7, 96.8],
  ["Jul 20", "NY", true, 22, 10, 3, 33.8, 28.4, 1, true, "close", 4, 94.8],
  ["Jul 23", "CON", false, 18, 9, 4, 31.6, 26.2, 2, false, "neutral", 2, 93.4],
  ["Jul 26", "CHI", true, 26, 12, 3, 35.2, 31.1, 1, false, "close", 11, 98.1],
  ["Jul 29", "IND", false, 15, 7, 2, 29.8, 24.4, 0, false, "blowout", 9, 99.4],
  ["Aug 01", "ATL", true, 23, 10, 4, 34.0, 29.2, 2, true, "close", 12, 99.8],
  ["Aug 03", "DAL", false, 20, 9, 3, 32.2, 27.6, 1, false, "neutral", 6, 95.2],
  ["Aug 05", "NY", true, 21, 11, 4, 33.4, 28.8, 2, false, "close", 4, 94.8],
  ["Aug 06", "LV", false, 17, 8, 2, 30.8, 25.9, 1, false, "neutral", 5, 95.6],
  ["Aug 07", "SEA", true, 25, 12, 3, 34.8, 30.4, 1, true, "close", 8, 96.2],
];

const CLARK_GAMES: RawGame[] = [
  ["Jul 12", "NY", true, 19, 5, 9, 33.6, 28.4, 2, false, "neutral", 4, 94.8],
  ["Jul 15", "CON", false, 14, 4, 7, 31.2, 25.9, 1, false, "blowout", 2, 93.4],
  ["Jul 18", "CHI", true, 22, 6, 11, 35.1, 30.2, 2, false, "close", 11, 98.1],
  ["Jul 21", "LV", false, 17, 5, 8, 32.4, 27.1, 1, false, "neutral", 5, 95.6],
  ["Jul 24", "SEA", true, 25, 7, 12, 36.2, 31.8, 2, true, "close", 8, 96.2],
  ["Jul 27", "PHX", false, 20, 4, 6, 33.8, 28.9, 0, false, "neutral", 10, 97.6],
  ["Jul 30", "DAL", true, 28, 6, 10, 37.1, 33.4, 2, true, "close", 6, 95.2],
  ["Aug 02", "ATL", false, 16, 5, 9, 32.0, 26.8, 1, false, "blowout", 12, 99.8],
  ["Aug 04", "MIN", true, 23, 7, 11, 35.4, 30.6, 2, false, "neutral", 5, 95.6],
  ["Aug 05", "LA", false, 21, 4, 8, 33.2, 29.1, 0, false, "close", 7, 96.8],
  ["Aug 06", "NY", true, 26, 6, 13, 36.8, 32.4, 1, true, "close", 4, 94.8],
  ["Aug 07", "NY", false, 24, 5, 10, 35.0, 31.2, 1, false, "neutral", 4, 94.8],
];

export const PLAYERS: PlayerFixture[] = [
  {
    id: "edwards",
    name: "Anthony Edwards",
    team: "MIN",
    teamName: "Minnesota Timberwolves",
    position: "SG",
    number: "5",
    league: "NBA",
    nextGame: {
      opponent: "DEN",
      opponentName: "Denver Nuggets",
      tipoff: "8:10 PM ET",
      homeAway: "away",
      daysRest: 2,
      opponentPace: 101.4,
      opponentPaceRank: 6,
      opponentDefRating: 116.2,
      opponentDefRank: 22,
    },
    seasonMinutes: 35.8,
    usageRate: 33.1,
    baseline: {
      points: 26.8,
      rebounds: 5.4,
      assists: 4.6,
      minutes: 35.8,
      usage: 33.1,
      percentiles: { points: 94, rebounds: 41, assists: 62, minutes: 88, usage: 96 },
    },
    markets: [
      { stat: "points", line: 27.5, overOdds: "-108", underOdds: "-112" },
      { stat: "rebounds", line: 5.5, overOdds: "-115", underOdds: "-105" },
      { stat: "assists", line: 4.5, overOdds: "-120", underOdds: "+100" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "pass", headline: "6th fastest opponent", explanation: "Denver plays at 101.4 possessions per 48 minutes, 6th fastest in the league. More possessions means more shot attempts available." },
      { id: "minutes", name: "Minutes", status: "pass", headline: "Projected 37.2", explanation: "Projected 37.2 minutes. He has cleared 35 minutes in 9 of his last 10 appearances." },
      { id: "usage", name: "Usage", status: "pass", headline: "33.1% over last 10", explanation: "Edwards carries a 33.1% usage rate over the last 10 games, up from 30.4% on the season." },
      { id: "matchup", name: "Matchup", status: "pass", headline: "22nd vs wings", explanation: "Denver allows the 4th most points to opposing wings and ranks 22nd in perimeter defensive rating over the last 15 games." },
      { id: "rest", name: "Rest", status: "pass", headline: "Two days rest", explanation: "Two days of rest. No back-to-back, and no travel since Tuesday." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "27.5 still available", explanation: "Best available number is 27.5 at three books while the consensus has moved to 28.5." },
      { id: "market", name: "Market", status: "warn", headline: "Moving against us", explanation: "The consensus has climbed a full point since open and two books have cut limits. The edge shrinks if the remaining books follow." },
      { id: "injuries", name: "Injuries", status: "fail", headline: "Blowout risk elevated", explanation: "Denver's starting guard is out and the spread sits at 9.5. A comfortable lead is the one scenario that removes fourth-quarter minutes entirely." },
    ],
    books: [
      { book: "Atlas Fair", over: "-134", under: "+114", line: 27.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-108", under: "-112", line: 27.5, movement: 0.5 },
      { book: "FanDuel", over: "-112", under: "-108", line: 27.5, movement: 1.0 },
      { book: "BetMGM", over: "-105", under: "-115", line: 28.5, movement: 1.0 },
      { book: "Caesars", over: "-110", under: "-110", line: 28.5, movement: 0.5 },
      { book: "ESPN Bet", over: "-115", under: "-105", line: 27.5, movement: 0 },
    ],
    games: expand("edwards", EDWARDS_GAMES),
  },
  {
    id: "jokic",
    name: "Nikola Jokić",
    team: "DEN",
    teamName: "Denver Nuggets",
    position: "C",
    number: "15",
    league: "NBA",
    nextGame: {
      opponent: "MIN",
      opponentName: "Minnesota Timberwolves",
      tipoff: "8:10 PM ET",
      homeAway: "home",
      daysRest: 2,
      opponentPace: 99.8,
      opponentPaceRank: 18,
      opponentDefRating: 108.4,
      opponentDefRank: 7,
    },
    seasonMinutes: 34.4,
    usageRate: 29.1,
    baseline: {
      points: 25.1,
      rebounds: 12.3,
      assists: 9.1,
      minutes: 34.4,
      usage: 29.1,
      percentiles: { points: 89, rebounds: 97, assists: 99, minutes: 79, usage: 84 },
    },
    markets: [
      { stat: "points", line: 24.5, overOdds: "-110", underOdds: "-110" },
      { stat: "rebounds", line: 12.5, overOdds: "-105", underOdds: "-115" },
      { stat: "assists", line: 9.5, overOdds: "-115", underOdds: "-105" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "warn", headline: "18th, middling", explanation: "Minnesota plays at 99.8 possessions per 48, 18th in the league. Neither a tailwind nor a headwind for volume." },
      { id: "minutes", name: "Minutes", status: "pass", headline: "Projected 35.1", explanation: "Projected 35.1 minutes with no load management flagged and two days of rest behind him." },
      { id: "usage", name: "Usage", status: "pass", headline: "29.1% and stable", explanation: "Usage has held between 27% and 31% across the last twelve games — an unusually stable rate for a primary option." },
      { id: "matchup", name: "Matchup", status: "fail", headline: "7th-rated defence", explanation: "Minnesota ranks 7th in defensive rating and has the personnel to defend the post without doubling, which historically suppresses his assist volume." },
      { id: "rest", name: "Rest", status: "pass", headline: "Two days rest", explanation: "Two days of rest and a home game. No travel since the weekend." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "9.5 assists available", explanation: "Two books still post 9.5 assists while the consensus has moved to 10.5." },
      { id: "market", name: "Market", status: "pass", headline: "Stable since open", explanation: "The number has not moved since it was posted, and limits are unchanged." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "Full rotation", explanation: "No rotation absences on either side beyond the Denver starting guard, already priced in." },
    ],
    books: [
      { book: "Atlas Fair", over: "-118", under: "-102", line: 9.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-115", under: "-105", line: 9.5, movement: 0 },
      { book: "FanDuel", over: "-110", under: "-110", line: 9.5, movement: 0 },
      { book: "BetMGM", over: "-120", under: "+100", line: 10.5, movement: 1.0 },
      { book: "Caesars", over: "-108", under: "-112", line: 9.5, movement: 0 },
      { book: "ESPN Bet", over: "-125", under: "+105", line: 10.5, movement: 1.0 },
    ],
    games: expand("jokic", JOKIC_GAMES),
  },
  {
    id: "wilson",
    name: "A'ja Wilson",
    team: "LV",
    teamName: "Las Vegas Aces",
    position: "F",
    number: "22",
    league: "WNBA",
    nextGame: {
      opponent: "SEA",
      opponentName: "Seattle Storm",
      tipoff: "10:00 PM ET",
      homeAway: "away",
      daysRest: 1,
      opponentPace: 96.2,
      opponentPaceRank: 8,
      opponentDefRating: 102.8,
      opponentDefRank: 8,
    },
    seasonMinutes: 33.6,
    usageRate: 31.6,
    baseline: {
      points: 24.1,
      rebounds: 10.4,
      assists: 3.5,
      minutes: 33.6,
      usage: 31.6,
      percentiles: { points: 98, rebounds: 95, assists: 48, minutes: 91, usage: 97 },
    },
    markets: [
      { stat: "points", line: 21.5, overOdds: "-110", underOdds: "-110" },
      { stat: "rebounds", line: 10.5, overOdds: "-112", underOdds: "-108" },
      { stat: "assists", line: 3.5, overOdds: "+105", underOdds: "-125" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "pass", headline: "8th fastest", explanation: "Seattle plays at 96.2 possessions per 40, 8th fastest in the WNBA — a modest tailwind for counting stats." },
      { id: "minutes", name: "Minutes", status: "warn", headline: "One day rest", explanation: "Projected 33 minutes, but on one day of rest after a 35-minute outing. Some risk of a managed workload." },
      { id: "usage", name: "Usage", status: "pass", headline: "31.6% on the season", explanation: "Wilson's usage sits in the 97th percentile league-wide and has not dipped below 28% in a month." },
      { id: "matchup", name: "Matchup", status: "warn", headline: "8th-rated defence", explanation: "Seattle rates 8th defensively and defends the interior well, though they lack size to match her directly." },
      { id: "rest", name: "Rest", status: "fail", headline: "Back-to-back travel", explanation: "One day of rest with travel. Her scoring drops 3.1 points per game on short rest across the season." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "21.5 is soft", explanation: "The model projects 24.0 against a posted 21.5, one of the wider gaps on the board." },
      { id: "market", name: "Market", status: "pass", headline: "Holding at 21.5", explanation: "The number has held all morning across every tracked book." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "No absences", explanation: "Both rotations are intact. No late scratches reported." },
    ],
    books: [
      { book: "Atlas Fair", over: "-142", under: "+122", line: 21.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-110", under: "-110", line: 21.5, movement: 0 },
      { book: "FanDuel", over: "-115", under: "-105", line: 21.5, movement: 0 },
      { book: "BetMGM", over: "-108", under: "-112", line: 21.5, movement: -0.5 },
      { book: "Caesars", over: "-112", under: "-108", line: 21.5, movement: 0 },
      { book: "ESPN Bet", over: "-105", under: "-115", line: 22.5, movement: 0.5 },
    ],
    games: expand("wilson", WILSON_GAMES),
  },
  {
    id: "clark",
    name: "Caitlin Clark",
    team: "IND",
    teamName: "Indiana Fever",
    position: "G",
    number: "22",
    league: "WNBA",
    nextGame: {
      opponent: "NY",
      opponentName: "New York Liberty",
      tipoff: "7:00 PM ET",
      homeAway: "away",
      daysRest: 1,
      opponentPace: 94.8,
      opponentPaceRank: 4,
      opponentDefRating: 98.6,
      opponentDefRank: 4,
    },
    seasonMinutes: 34.3,
    usageRate: 29.7,
    baseline: {
      points: 21.3,
      rebounds: 5.4,
      assists: 9.5,
      minutes: 34.3,
      usage: 29.7,
      percentiles: { points: 88, rebounds: 55, assists: 99, minutes: 93, usage: 90 },
    },
    markets: [
      { stat: "points", line: 20.5, overOdds: "-112", underOdds: "-108" },
      { stat: "rebounds", line: 5.5, overOdds: "-105", underOdds: "-115" },
      { stat: "assists", line: 8.5, overOdds: "-118", underOdds: "-102" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "warn", headline: "4th, but grinding", explanation: "New York plays fast in transition but slows in the half court, which historically caps assist opportunities." },
      { id: "minutes", name: "Minutes", status: "pass", headline: "Projected 35.4", explanation: "Clark has played 33+ minutes in eleven straight games. Projected 35.4 here." },
      { id: "usage", name: "Usage", status: "pass", headline: "29.7% and rising", explanation: "Usage has climbed from 27.1% to 29.7% since the All-Star break as the offence runs more through her." },
      { id: "matchup", name: "Matchup", status: "fail", headline: "4th-rated defence", explanation: "New York rates 4th defensively and pressures ball handlers above the arc, the exact look that has produced her three lowest assist games." },
      { id: "rest", name: "Rest", status: "warn", headline: "One day rest", explanation: "One day of rest on the road. Her assist rate holds on short rest, but turnovers rise." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "8.5 available", explanation: "The best number is 8.5 while two books have moved to 9.5." },
      { id: "market", name: "Market", status: "warn", headline: "Split market", explanation: "Books disagree by a full assist, which usually means the model input is genuinely uncertain rather than mispriced." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "Rotation intact", explanation: "No absences reported for either side." },
    ],
    books: [
      { book: "Atlas Fair", over: "-126", under: "+106", line: 8.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-118", under: "-102", line: 8.5, movement: 0 },
      { book: "FanDuel", over: "-122", under: "+102", line: 8.5, movement: 0.5 },
      { book: "BetMGM", over: "-110", under: "-110", line: 9.5, movement: 1.0 },
      { book: "Caesars", over: "-115", under: "-105", line: 8.5, movement: 0 },
      { book: "ESPN Bet", over: "-108", under: "-112", line: 9.5, movement: 1.0 },
    ],
    games: expand("clark", CLARK_GAMES),
  },
  {
    id: "murray",
    name: "Jamal Murray",
    team: "DEN",
    teamName: "Denver Nuggets",
    position: "PG",
    number: "27",
    league: "NBA",
    nextGame: {
      opponent: "MIN",
      opponentName: "Minnesota Timberwolves",
      tipoff: "8:10 PM ET",
      homeAway: "home",
      daysRest: 2,
      opponentPace: 99.8,
      opponentPaceRank: 18,
      opponentDefRating: 108.4,
      opponentDefRank: 7,
    },
    seasonMinutes: 32.2,
    usageRate: 25.8,
    baseline: {
      points: 21.0,
      rebounds: 3.8,
      assists: 6.1,
      minutes: 32.2,
      usage: 25.8,
      percentiles: { points: 78, rebounds: 22, assists: 81, minutes: 66, usage: 71 },
    },
    markets: [
      { stat: "points", line: 22.5, overOdds: "-105", underOdds: "-115" },
      { stat: "rebounds", line: 3.5, overOdds: "-125", underOdds: "+105" },
      { stat: "assists", line: 6.5, overOdds: "+100", underOdds: "-120" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "warn", headline: "18th, middling", explanation: "Minnesota plays at 99.8 possessions per 48, 18th in the league. Neither a tailwind nor a headwind for scoring volume." },
      { id: "minutes", name: "Minutes", status: "warn", headline: "Projected 31.8", explanation: "Projected 31.8 minutes. Denver has trimmed his fourth quarters in three of the last five, all in games decided by double figures." },
      { id: "usage", name: "Usage", status: "pass", headline: "25.8% and steady", explanation: "Usage has held between 24% and 28% for a month, and rises to 29.4% in the minutes Jokić sits." },
      { id: "matchup", name: "Matchup", status: "fail", headline: "7th-rated defence", explanation: "Minnesota rates 7th defensively and has the perimeter size to switch every screen, the coverage that has produced his three lowest scoring games this season." },
      { id: "rest", name: "Rest", status: "pass", headline: "Two days rest", explanation: "Two days of rest at home, and no back-to-back on either side of this game." },
      { id: "line_value", name: "Line Value", status: "warn", headline: "22.5 is fair", explanation: "The model projects 19.4 against a posted 22.5, but the gap sits inside the range where his minutes variance alone explains it." },
      { id: "market", name: "Market", status: "pass", headline: "Stable since open", explanation: "The number opened 22.5 and has not moved. Limits are unchanged across every tracked book." },
      { id: "injuries", name: "Injuries", status: "warn", headline: "Blowout risk", explanation: "The spread sits at 9.5. A comfortable Denver lead is the scenario that removes his fourth quarter entirely." },
    ],
    books: [
      { book: "Atlas Fair", over: "+118", under: "-138", line: 22.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-105", under: "-115", line: 22.5, movement: 0 },
      { book: "FanDuel", over: "-110", under: "-110", line: 22.5, movement: 0 },
      { book: "BetMGM", over: "-102", under: "-118", line: 22.5, movement: -0.5 },
      { book: "Caesars", over: "-108", under: "-112", line: 22.5, movement: 0 },
      { book: "ESPN Bet", over: "+100", under: "-120", line: 21.5, movement: -1.0 },
    ],
    games: expand("murray", MURRAY_GAMES),
  },
  {
    id: "towns",
    name: "Karl-Anthony Towns",
    team: "MIN",
    teamName: "Minnesota Timberwolves",
    position: "PF",
    number: "32",
    league: "NBA",
    nextGame: {
      opponent: "DEN",
      opponentName: "Denver Nuggets",
      tipoff: "8:10 PM ET",
      homeAway: "away",
      daysRest: 2,
      opponentPace: 101.4,
      opponentPaceRank: 6,
      opponentDefRating: 116.2,
      opponentDefRank: 22,
    },
    seasonMinutes: 32.1,
    usageRate: 24.4,
    baseline: {
      points: 20.8,
      rebounds: 9.0,
      assists: 2.8,
      minutes: 32.1,
      usage: 24.4,
      percentiles: { points: 76, rebounds: 88, assists: 34, minutes: 64, usage: 68 },
    },
    markets: [
      { stat: "points", line: 20.5, overOdds: "-110", underOdds: "-110" },
      { stat: "rebounds", line: 8.5, overOdds: "-118", underOdds: "-102" },
      { stat: "assists", line: 2.5, overOdds: "-130", underOdds: "+108" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "pass", headline: "6th fastest opponent", explanation: "Denver plays at 101.4 possessions per 48, 6th fastest in the league. More possessions means more rebounding chances at both ends." },
      { id: "minutes", name: "Minutes", status: "warn", headline: "Foul-trouble history", explanation: "Projected 32.6 minutes, but he has picked up four fouls in five of the last ten against Denver's frontcourt." },
      { id: "usage", name: "Usage", status: "warn", headline: "24.4%, third option", explanation: "Usage sits behind Edwards and the guards. It climbs to 28% only in the stretches Edwards rests." },
      { id: "matchup", name: "Matchup", status: "pass", headline: "22nd-rated defence", explanation: "Denver ranks 22nd in defensive rating and concedes the 5th most rebounds per game to opposing bigs over the last 15." },
      { id: "rest", name: "Rest", status: "pass", headline: "Two days rest", explanation: "Two days of rest. His rebounding rate is flat across rest situations, so this is neutral-to-positive." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "8.5 still posted", explanation: "Two books still show 8.5 rebounds while the consensus has moved to 9.5." },
      { id: "market", name: "Market", status: "pass", headline: "Holding at 8.5", explanation: "The rebounding number has not moved since open despite the total climbing two points." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "Rotation intact", explanation: "No absences in the Minnesota frontcourt. Denver's starting guard being out does not change the interior matchup." },
    ],
    books: [
      { book: "Atlas Fair", over: "-136", under: "+116", line: 8.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-118", under: "-102", line: 8.5, movement: 0 },
      { book: "FanDuel", over: "-122", under: "+102", line: 8.5, movement: 0.5 },
      { book: "BetMGM", over: "-110", under: "-110", line: 9.5, movement: 1.0 },
      { book: "Caesars", over: "-115", under: "-105", line: 8.5, movement: 0 },
      { book: "ESPN Bet", over: "-105", under: "-115", line: 9.5, movement: 1.0 },
    ],
    games: expand("towns", TOWNS_GAMES),
  },
  {
    id: "stewart",
    name: "Breanna Stewart",
    team: "NY",
    teamName: "New York Liberty",
    position: "F",
    number: "30",
    league: "WNBA",
    nextGame: {
      opponent: "IND",
      opponentName: "Indiana Fever",
      tipoff: "7:00 PM ET",
      homeAway: "home",
      daysRest: 1,
      opponentPace: 99.4,
      opponentPaceRank: 2,
      opponentDefRating: 104.1,
      opponentDefRank: 9,
    },
    seasonMinutes: 32.5,
    usageRate: 27.4,
    baseline: {
      points: 20.4,
      rebounds: 8.5,
      assists: 3.6,
      minutes: 32.5,
      usage: 27.4,
      percentiles: { points: 92, rebounds: 89, assists: 62, minutes: 86, usage: 88 },
    },
    markets: [
      { stat: "points", line: 20.5, overOdds: "-112", underOdds: "-108" },
      { stat: "rebounds", line: 8.5, overOdds: "-106", underOdds: "-114" },
      { stat: "assists", line: 3.5, overOdds: "-120", underOdds: "+100" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "pass", headline: "2nd fastest", explanation: "Indiana plays at 99.4 possessions per 40, second fastest in the WNBA. The clearest volume tailwind on this slate." },
      { id: "minutes", name: "Minutes", status: "pass", headline: "Projected 33.4", explanation: "Projected 33.4 minutes. She has cleared 32 in nine of the last ten despite the compressed schedule." },
      { id: "usage", name: "Usage", status: "pass", headline: "27.4% on the season", explanation: "Usage sits in the 88th percentile league-wide and has not dipped below 25% since the break." },
      { id: "matchup", name: "Matchup", status: "warn", headline: "9th-rated defence", explanation: "Indiana rates 9th defensively — middling overall, but they have conceded the 3rd most rebounds to opposing forwards." },
      { id: "rest", name: "Rest", status: "warn", headline: "One day rest", explanation: "One day of rest at home. Her rebounding holds on short rest; her scoring efficiency drops about two points." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "8.5 is soft", explanation: "The model projects 9.6 rebounds against a posted 8.5, one of the wider gaps on the WNBA board." },
      { id: "market", name: "Market", status: "warn", headline: "Split market", explanation: "Books disagree by a full rebound, which usually means the input is genuinely uncertain rather than mispriced." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "No absences", explanation: "Both rotations are intact with no late scratches reported." },
    ],
    books: [
      { book: "Atlas Fair", over: "-128", under: "+108", line: 8.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-106", under: "-114", line: 8.5, movement: 0 },
      { book: "FanDuel", over: "-110", under: "-110", line: 8.5, movement: 0 },
      { book: "BetMGM", over: "-102", under: "-118", line: 9.5, movement: 1.0 },
      { book: "Caesars", over: "-108", under: "-112", line: 8.5, movement: 0 },
      { book: "ESPN Bet", over: "-115", under: "-105", line: 9.5, movement: 1.0 },
    ],
    games: expand("stewart", STEWART_GAMES),
  },
  {
    id: "collier",
    name: "Napheesa Collier",
    team: "MIN",
    teamName: "Minnesota Lynx",
    position: "F",
    number: "24",
    league: "WNBA",
    nextGame: {
      opponent: "SEA",
      opponentName: "Seattle Storm",
      tipoff: "9:00 PM ET",
      homeAway: "home",
      daysRest: 2,
      opponentPace: 96.2,
      opponentPaceRank: 8,
      opponentDefRating: 102.8,
      opponentDefRank: 8,
    },
    seasonMinutes: 32.7,
    usageRate: 27.9,
    baseline: {
      points: 20.5,
      rebounds: 9.7,
      assists: 3.1,
      minutes: 32.7,
      usage: 27.9,
      percentiles: { points: 93, rebounds: 94, assists: 51, minutes: 87, usage: 90 },
    },
    markets: [
      { stat: "points", line: 20.5, overOdds: "-108", underOdds: "-112" },
      { stat: "rebounds", line: 9.5, overOdds: "-115", underOdds: "-105" },
      { stat: "assists", line: 3.5, overOdds: "+102", underOdds: "-122" },
    ],
    signals: [
      { id: "pace", name: "Pace", status: "pass", headline: "8th fastest", explanation: "Seattle plays at 96.2 possessions per 40, 8th fastest in the WNBA — a modest tailwind for counting stats." },
      { id: "minutes", name: "Minutes", status: "pass", headline: "Projected 34.1", explanation: "Projected 34.1 minutes on two days of rest at home, her highest projected workload in two weeks." },
      { id: "usage", name: "Usage", status: "pass", headline: "27.9% and rising", explanation: "Usage has climbed from 26.1% to 27.9% over the last eight games as the offence has narrowed." },
      { id: "matchup", name: "Matchup", status: "warn", headline: "8th-rated defence", explanation: "Seattle rates 8th defensively and defends the interior well, though they lack a natural match for her at the four." },
      { id: "rest", name: "Rest", status: "pass", headline: "Two days rest", explanation: "Two days of rest and no travel. Her scoring rises 2.4 points per game in this rest situation." },
      { id: "line_value", name: "Line Value", status: "pass", headline: "20.5 available", explanation: "The best number is 20.5 while two books have already moved to 21.5." },
      { id: "market", name: "Market", status: "pass", headline: "Firm since open", explanation: "The number has held all afternoon with limits raised twice — usually a sign the price is respected." },
      { id: "injuries", name: "Injuries", status: "pass", headline: "Full rotation", explanation: "No absences on either side. Seattle's starting centre cleared concussion protocol on Tuesday." },
    ],
    books: [
      { book: "Atlas Fair", over: "-132", under: "+112", line: 20.5, movement: 0, isFair: true },
      { book: "DraftKings", over: "-108", under: "-112", line: 20.5, movement: 0 },
      { book: "FanDuel", over: "-112", under: "-108", line: 20.5, movement: 0.5 },
      { book: "BetMGM", over: "-105", under: "-115", line: 21.5, movement: 1.0 },
      { book: "Caesars", over: "-110", under: "-110", line: 20.5, movement: 0 },
      { book: "ESPN Bet", over: "-118", under: "-102", line: 21.5, movement: 1.0 },
    ],
    games: expand("collier", COLLIER_GAMES),
  },
];

/** The four primary filters stay on screen; the rest live behind Advanced. */
export const PRIMARY_FILTER_IDS = ["timeframe", "venue", "opponent"] as const;
export const ADVANCED_FILTER_IDS = [
  "rest",
  "teammate",
  "minutes",
  "usage",
  "script",
  "oppdef",
  "pace",
  "prev",
] as const;

export function sportOf(player: PlayerFixture): SportId {
  return sportIdFromLeague(player.league);
}

export function playersForSport(sport: SportId): PlayerFixture[] {
  return PLAYERS.filter((p) => sportOf(p) === sport);
}

export function playerById(id: string): PlayerFixture {
  return PLAYERS.find((p) => p.id === id) ?? PLAYERS[0];
}

/**
 * URL-safe form of a player's name — "Nikola Jokić" becomes "nikola-jokic".
 *
 * Accents are folded rather than stripped so a deep link stays typeable and
 * stable regardless of how the name is spelled at the source.
 */
export function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Resolves the `?player=` parameter used by Filter Plays deep links.
 *
 * Accepts either the fixture id ("edwards") or the full name slug
 * ("anthony-edwards"), so links keep working if one form is swapped for the
 * other when this is backed by the API.
 */
export function playerBySlug(slug: string): PlayerFixture | undefined {
  const wanted = slug.trim().toLowerCase();
  if (!wanted) return undefined;
  return PLAYERS.find((p) => p.id === wanted || slugify(p.name) === wanted);
}

/* --------------------------------------------------------------- filters -- */

export interface FilterOptionDef {
  value: string;
  label: string;
  /** Tier that unlocks this option. Absent = available to everyone. */
  premium?: "medium" | "elite";
}

export interface LookupFilterDef {
  id: string;
  label: string;
  options: FilterOptionDef[];
}

/**
 * The research filters. Options marked premium are visible at every tier but
 * only selectable above it — a free user can see what the deeper cut would be.
 */
export const LOOKUP_FILTERS: LookupFilterDef[] = [
  {
    id: "timeframe",
    label: "Timeframe",
    options: [
      { value: "l5", label: "Last 5" },
      { value: "l10", label: "Last 10" },
      { value: "all", label: "Season" },
    ],
  },
  {
    id: "venue",
    label: "Home/Away",
    options: [
      { value: "all", label: "All" },
      { value: "home", label: "Home" },
      { value: "away", label: "Away" },
    ],
  },
  {
    id: "opponent",
    label: "Opponent",
    options: [{ value: "all", label: "All opponents" }],
  },
  {
    id: "rest",
    label: "Days Rest",
    options: [
      { value: "all", label: "Any" },
      { value: "0", label: "0 days" },
      { value: "1", label: "1 day" },
      { value: "2", label: "2+ days" },
    ],
  },
  {
    id: "teammate",
    label: "Teammate Out",
    options: [
      { value: "all", label: "Any" },
      { value: "yes", label: "Key teammate out", premium: "medium" },
      { value: "no", label: "Full rotation", premium: "medium" },
    ],
  },
  {
    id: "minutes",
    label: "Minutes",
    options: [
      { value: "all", label: "Any" },
      { value: "30", label: "30+" },
      { value: "34", label: "34+", premium: "medium" },
    ],
  },
  {
    id: "usage",
    label: "Usage Rate",
    options: [
      { value: "all", label: "Any" },
      { value: "28", label: "28%+" },
      { value: "32", label: "32%+", premium: "medium" },
    ],
  },
  {
    id: "script",
    label: "Game Script",
    options: [
      { value: "all", label: "Any" },
      { value: "close", label: "Close game", premium: "medium" },
      { value: "blowout", label: "Blowout", premium: "medium" },
    ],
  },
  {
    id: "oppdef",
    label: "Opponent Defense",
    options: [
      { value: "all", label: "Any" },
      { value: "top10", label: "Top 10 defence", premium: "elite" },
      { value: "bottom10", label: "Bottom 10 defence", premium: "elite" },
    ],
  },
  {
    id: "pace",
    label: "Game Pace",
    options: [
      { value: "all", label: "Any" },
      { value: "fast", label: "Fast (100+)", premium: "elite" },
      { value: "slow", label: "Slow (<100)", premium: "elite" },
    ],
  },
  {
    id: "prev",
    label: "Previous Game",
    options: [
      { value: "all", label: "Any" },
      { value: "over", label: "After an over", premium: "elite" },
      { value: "under", label: "After an under", premium: "elite" },
    ],
  },
];

/* ----------------------------------------------------- premium research --- */

export const EDGE_DECOMPOSITION = [
  { label: "Base projection", value: "28.9", detail: "Season rate, minutes-adjusted" },
  { label: "Pace adjustment", value: "+1.4", detail: "Opponent possessions vs league" },
  { label: "Matchup adjustment", value: "+1.9", detail: "Perimeter defence, last 15" },
  { label: "Usage adjustment", value: "+0.8", detail: "Starting guard ruled out" },
  { label: "Blowout haircut", value: "-1.2", detail: "9.5 spread, minutes risk" },
  { label: "Final projection", value: "31.8", detail: "vs market 28.4" },
];

export const CLV_SUMMARY = [
  { label: "Entry price", value: "-108" },
  { label: "Projected close", value: "-124" },
  { label: "Expected CLV", value: "+3.4%" },
  { label: "Beat close rate", value: "63%" },
];

export const SITUATIONAL_SPLITS = [
  { label: "On 2+ days rest", value: "29.4", sample: "14 games", delta: "+2.6" },
  { label: "Away from home", value: "27.9", sample: "18 games", delta: "+1.1" },
  { label: "vs bottom-10 defences", value: "31.2", sample: "11 games", delta: "+4.4" },
  { label: "With a starter out", value: "32.1", sample: "6 games", delta: "+5.3" },
];

/* --------------------------------------------------- line movement & H2H -- */

export interface LineMovementPoint {
  time: string;
  line: number;
  price: string;
}

/** Open → now for the featured market. Replaced by the odds feed later. */
export const LINE_MOVEMENT: LineMovementPoint[] = [
  { time: "Open · 06:00", line: 27.5, price: "-104" },
  { time: "08:20", line: 27.5, price: "-106" },
  { time: "10:05", line: 28.0, price: "-108" },
  { time: "11:18", line: 28.0, price: "-110" },
  { time: "11:42", line: 28.5, price: "-108" },
  { time: "Now · 12:04", line: 28.5, price: "-112" },
];

export interface PlayerH2HRow {
  date: string;
  opponent: string;
  value: number;
  line: number;
  minutes: number;
}

/** This player against the upcoming opponent specifically. */
export const PLAYER_H2H: PlayerH2HRow[] = [
  { date: "Apr 22, 2026", opponent: "DEN", value: 31, line: 27.5, minutes: 38.2 },
  { date: "Mar 08, 2026", opponent: "DEN", value: 24, line: 26.5, minutes: 35.1 },
  { date: "Jan 31, 2026", opponent: "DEN", value: 29, line: 27.5, minutes: 37.6 },
  { date: "Dec 14, 2025", opponent: "DEN", value: 19, line: 26.5, minutes: 31.4 },
  { date: "Nov 02, 2025", opponent: "DEN", value: 33, line: 25.5, minutes: 39.0 },
];

export const HISTORICAL_WINDOWS = [
  { label: "Last 5", average: 30.2, overRate: 80, sample: 5 },
  { label: "Last 10", average: 29.1, overRate: 60, sample: 10 },
  { label: "Last 20", average: 27.6, overRate: 55, sample: 20 },
  { label: "Season", average: 26.8, overRate: 52, sample: 62 },
];

export const AI_ANALYSIS = {
  summary:
    "The projection rests on three things holding: Denver's pace, the usage bump from their starting guard being out, and Edwards clearing 35 minutes. Two of the three are well-sampled. The third is where the risk sits — a 9.5 spread is the one scenario that takes fourth-quarter minutes away, and it is also the scenario the market is pricing toward.",
  points: [
    "Six of eight signals pass. The two that do not are both about the same risk, not two independent risks.",
    "The 14% edge assumes 37.2 minutes. At 33 minutes the edge is roughly 4%, which is inside the noise.",
    "The number has moved a full point against this side since open, which historically precedes the rest of the market following.",
  ],
  citations: ["Pace filter", "Usage filter", "Injuries filter", "Market snapshot 11:42"],
};
