/**
 * Canonical destinations.
 *
 * Every link in the app resolves through this object — the sidebar, the tools
 * menu, the dashboard cards, and the router all read from it. Nothing types a
 * path as a string literal, so a route can be renamed in one place and a typo
 * becomes a compile error rather than a dead link.
 */
export const ROUTES = {
  dashboard: "/dashboard",
  slate: "/slate",

  // --- The eight Atlas tools ------------------------------------------------
  filterPlays: "/tools/filter-plays",
  livePlays: "/tools/live-plays",
  straightData: "/tools/straight-data",
  hotCold: "/tools/hot-cold",
  morningBriefing: "/tools/morning-briefing",
  playerBoard: "/tools/player-board",
  headToHead: "/tools/head-to-head",
  askAtlas: "/ask-atlas",

  // --- Research -------------------------------------------------------------
  research: "/research",
  playerLookup: "/research/player-lookup",
  moneylines: "/research/moneylines",
  totals: "/research/totals",

  // --- Markets --------------------------------------------------------------
  games: "/games",
  marketMovers: "/market/movers",

  // --- Portfolio ------------------------------------------------------------
  tracker: "/tracker",
  performance: "/performance",

  settings: "/settings",
  login: "/login",
  signup: "/signup",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * Paths that moved when the tools were given their own namespace. Kept so
 * older links keep working instead of hitting the catch-all.
 */
export const ROUTE_REDIRECTS: Record<string, RoutePath> = {
  "/live": ROUTES.livePlays,
  "/briefing": ROUTES.morningBriefing,
  "/ask": ROUTES.askAtlas,
  "/market": ROUTES.games,
  "/research/props": ROUTES.playerLookup,
};
