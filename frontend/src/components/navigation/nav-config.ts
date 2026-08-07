import {
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FlaskConical,
  Gauge,
  LayoutDashboard,
  Scale,
  Settings,
  Sigma,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, type RoutePath } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import type { FeatureId } from "@/lib/access";

export interface NavItemDef {
  label: string;
  to: RoutePath;
  icon: LucideIcon;
  /** Rendered as a trailing count chip. Wired to real data later. */
  badge?: string;
  /** Marks routes whose page is still a placeholder. */
  soon?: boolean;
  /** Feature this destination belongs to, when it is tier-gated. */
  feature?: FeatureId;
}

export interface NavSectionDef {
  /** Omitted for the first group, which needs no heading. */
  label?: string;
  items: NavItemDef[];
}

/**
 * Single source of truth for the sidebar, the page title, and route
 * generation. Paths come from ROUTES rather than string literals, so a
 * destination cannot drift out of sync with the router.
 *
 * The Tools section is derived from the tool registry, so the sidebar and the
 * Tools menu can never disagree about what exists.
 */
export const NAV_SECTIONS: NavSectionDef[] = [
  {
    items: [
      { label: "Overview", to: ROUTES.dashboard, icon: LayoutDashboard },
      { label: "Today's Slate", to: ROUTES.slate, icon: CalendarDays, soon: true },
    ],
  },
  {
    label: "Tools",
    items: TOOLS.map((tool) => ({
      label: tool.name,
      to: tool.to,
      icon: tool.icon,
      feature: tool.premiumFeature,
    })),
  },
  {
    label: "Research",
    items: [
      { label: "Research Reports", to: ROUTES.research, icon: FlaskConical, soon: true },
      { label: "Player Lookup", to: ROUTES.playerLookup, icon: UserRound, soon: true },
      { label: "Moneylines", to: ROUTES.moneylines, icon: Scale, soon: true },
      { label: "Totals", to: ROUTES.totals, icon: Sigma, soon: true },
    ],
  },
  {
    label: "Markets",
    items: [
      { label: "Game Center", to: ROUTES.games, icon: Gauge, soon: true },
      { label: "Market Movers", to: ROUTES.marketMovers, icon: TrendingUp, soon: true },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "Bet Tracker", to: ROUTES.tracker, icon: ClipboardList, soon: true },
      { label: "Performance", to: ROUTES.performance, icon: ChartColumn, soon: true },
    ],
  },
];

export const SETTINGS_ITEM: NavItemDef = {
  label: "Settings",
  to: ROUTES.settings,
  icon: Settings,
};

export const ALL_NAV_ITEMS: NavItemDef[] = [
  ...NAV_SECTIONS.flatMap((section) => section.items),
  SETTINGS_ITEM,
];

/**
 * The single nav destination a path belongs to, by longest-prefix match with
 * exact matches winning. Resolving it once here is what keeps /research from
 * lighting up alongside /research/props, and guarantees the highlighted rail
 * item and the top-bar title can never disagree.
 */
export function activeNavItem(pathname: string): NavItemDef | null {
  const exact = ALL_NAV_ITEMS.find((item) => item.to === pathname);
  if (exact) return exact;

  const prefixed = ALL_NAV_ITEMS.filter((item) => pathname.startsWith(item.to + "/")).sort(
    (a, b) => b.to.length - a.to.length,
  );
  return prefixed[0] ?? null;
}

export function titleForPath(pathname: string): string {
  return activeNavItem(pathname)?.label ?? "Atlas";
}
