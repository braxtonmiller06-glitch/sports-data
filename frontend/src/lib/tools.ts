import {
  Activity,
  Columns3,
  Flame,
  Newspaper,
  Sparkles,
  SlidersHorizontal,
  Swords,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { ROUTES, type RoutePath } from "./routes";
import type { FeatureId } from "./access";

export interface ToolDef {
  id: string;
  name: string;
  /** One line, shown in the Tools menu and as the page subtitle. */
  description: string;
  icon: LucideIcon;
  to: RoutePath;
  /**
   * Tier required for the tool's *advanced* surface only. Every tool is
   * enterable at every tier — gating happens inside, never at the door.
   */
  premiumFeature?: FeatureId;
}

/**
 * The eight Atlas tools.
 *
 * Single source for the Tools menu, the sidebar section, and route generation.
 */
export const TOOLS: ToolDef[] = [
  {
    id: "filter-plays",
    name: "Filter Plays",
    description: "Scan the slate through Atlas research filters.",
    icon: SlidersHorizontal,
    to: ROUTES.filterPlays,
    premiumFeature: "expanded_filters",
  },
  {
    id: "live-plays",
    name: "Live Plays",
    description: "Monitor live markets and changing lines.",
    icon: Activity,
    to: ROUTES.livePlays,
    premiumFeature: "live_plays_alerts",
  },
  {
    id: "straight-data",
    name: "Straight Data",
    description: "Find the strongest statistical trends.",
    icon: Table2,
    to: ROUTES.straightData,
    premiumFeature: "data_export",
  },
  {
    id: "hot-cold",
    name: "Hot & Cold",
    description: "Identify players trending above or below baseline.",
    icon: Flame,
    to: ROUTES.hotCold,
    premiumFeature: "extended_history",
  },
  {
    id: "morning-briefing",
    name: "Morning Briefing",
    description: "Start the day with the full slate.",
    icon: Newspaper,
    to: ROUTES.morningBriefing,
  },
  {
    id: "player-board",
    name: "Player Board",
    description: "Compare players across key metrics.",
    icon: Columns3,
    to: ROUTES.playerBoard,
    premiumFeature: "player_props",
  },
  {
    id: "head-to-head",
    name: "Head to Head",
    description: "Research matchup history.",
    icon: Swords,
    to: ROUTES.headToHead,
    premiumFeature: "head_to_head",
  },
  {
    id: "ask-atlas",
    name: "Ask Atlas",
    description: "Ask Atlas about any game, player, or market.",
    icon: Sparkles,
    to: ROUTES.askAtlas,
    premiumFeature: "ask_atlas",
  },
];

export function toolByPath(pathname: string): ToolDef | null {
  return TOOLS.find((tool) => tool.to === pathname) ?? null;
}
