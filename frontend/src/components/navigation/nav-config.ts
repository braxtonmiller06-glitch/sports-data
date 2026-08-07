import {
  Activity,
  CalendarDays,
  ChartColumn,
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  Newspaper,
  Scale,
  Settings,
  Sigma,
  Sparkles,
  TrendingUp,
  UserRound,
  type LucideIcon,
} from "lucide-react";

export interface NavItemDef {
  label: string;
  to: string;
  icon: LucideIcon;
  /** Rendered as a trailing count chip. Wired to real data later. */
  badge?: string;
  /** Marks routes whose page is still a placeholder. */
  soon?: boolean;
}

export interface NavSectionDef {
  /** Omitted for the first group, which needs no heading. */
  label?: string;
  items: NavItemDef[];
}

/**
 * Single source of truth for the sidebar, the page title in the top bar, and
 * the command palette. Adding a destination means adding it here and nowhere
 * else.
 */
export const NAV_SECTIONS: NavSectionDef[] = [
  {
    items: [
      { label: "Overview", to: "/dashboard", icon: LayoutDashboard },
      { label: "Today's Slate", to: "/slate", icon: CalendarDays, soon: true },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Research", to: "/research", icon: FlaskConical, soon: true },
      { label: "Player Props", to: "/research/props", icon: UserRound, soon: true },
      { label: "Moneylines", to: "/research/moneylines", icon: Scale, soon: true },
      { label: "Totals", to: "/research/totals", icon: Sigma, soon: true },
    ],
  },
  {
    label: "Markets",
    items: [
      { label: "Live Market", to: "/market", icon: Activity, soon: true },
      { label: "Market Movers", to: "/market/movers", icon: TrendingUp, soon: true },
    ],
  },
  {
    label: "Portfolio",
    items: [
      { label: "Bet Tracker", to: "/tracker", icon: ClipboardList, soon: true },
      { label: "Performance", to: "/performance", icon: ChartColumn, soon: true },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { label: "Morning Briefing", to: "/briefing", icon: Newspaper, soon: true },
      { label: "Ask Atlas AI", to: "/ask", icon: Sparkles, soon: true },
    ],
  },
];

export const SETTINGS_ITEM: NavItemDef = {
  label: "Settings",
  to: "/settings",
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
 *
 * Returns null when the path is outside the nav (auth pages, previews).
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
