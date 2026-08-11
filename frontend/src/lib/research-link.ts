import { marketDef } from "@/data/filterPlaysFixtures";
import {
  playerBySlug,
  sportOf,
  type PlayerFixture,
  type StatKey,
} from "@/data/playerLookupFixtures";
import { ROUTES } from "./routes";
import type { SportId } from "./sports";

/**
 * The Filter Plays → Player Lookup contract.
 *
 * One module owns both ends of the link so the query string cannot drift: the
 * board builds it here, and Player Lookup resolves it here. Every parameter is
 * optional on the way in, and anything unresolvable degrades to the page's
 * default rather than erroring or landing the user somewhere blank.
 */

export interface ResearchLinkSource {
  playerSlug: string;
  market: string;
  line: number;
  side: "Over" | "Under";
}

export function buildResearchHref(source: ResearchLinkSource): string {
  const params = new URLSearchParams({
    player: source.playerSlug,
    market: source.market,
    line: String(source.line),
    side: source.side.toLowerCase(),
  });
  return `${ROUTES.playerLookup}?${params.toString()}`;
}

export interface ResolvedResearchLink {
  player: PlayerFixture;
  sport: SportId;
  stat: StatKey;
  /**
   * The line to pin, or null when the requested market has no single-stat
   * equivalent in Player Lookup — carrying a PRA number onto a points chart
   * would be worse than falling back to the player's own market.
   */
  line: number | null;
  side: "over" | "under";
  /**
   * The market that was asked for but could not be shown, if any. The page
   * surfaces this so a fallback is explained rather than silently wrong.
   */
  unavailableMarket: string | null;
}

/**
 * Resolves `?player=&market=&line=&side=` into concrete Player Lookup state.
 *
 * Returns null when there is no usable player, which the page reads as "just
 * show the default" — an unknown player is not an error state.
 */
export function parseResearchLink(search: string): ResolvedResearchLink | null {
  const params = new URLSearchParams(search);
  const slug = params.get("player");
  if (!slug) return null;

  const player = playerBySlug(slug);
  if (!player) return null;

  const sport = sportOf(player);
  const requestedMarket = params.get("market");
  const definition = requestedMarket ? marketDef(sport, requestedMarket) : undefined;

  // A market Player Lookup can chart, or the player's own default.
  const stat: StatKey = definition?.stat ?? player.markets[0].stat;
  const unavailableMarket =
    requestedMarket && !definition?.stat ? (definition?.label ?? requestedMarket) : null;

  // The line only travels with a market that mapped; otherwise it describes a
  // different quantity than the one being charted.
  const rawLine = Number(params.get("line"));
  const line =
    definition?.stat && Number.isFinite(rawLine) && rawLine > 0 ? rawLine : null;

  const rawSide = params.get("side");
  const side: "over" | "under" = rawSide === "under" ? "under" : "over";

  return { player, sport, stat, line, side, unavailableMarket };
}
