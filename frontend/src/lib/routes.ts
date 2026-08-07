/**
 * Canonical destinations.
 *
 * Every link in the app resolves through this object — the sidebar, the
 * dashboard cards, and the router all read from it. Nothing types a path as a
 * string literal, so a route can be renamed in one place and a typo becomes a
 * compile error rather than a dead card.
 */
export const ROUTES = {
  dashboard: "/dashboard",
  slate: "/slate",

  research: "/research",
  playerLookup: "/research/props",
  moneylines: "/research/moneylines",
  totals: "/research/totals",

  games: "/games",
  live: "/live",
  marketMovers: "/market/movers",

  tracker: "/tracker",
  performance: "/performance",

  briefing: "/briefing",
  askAtlas: "/ask-atlas",

  settings: "/settings",

  login: "/login",
  signup: "/signup",
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];
