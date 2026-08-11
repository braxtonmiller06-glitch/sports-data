import type { SubscriptionTier } from "./tiers";

/**
 * The feature catalogue — the single place a capability is tied to a tier.
 *
 * Components ask `can("closing_line_value")`; they never compare tier names.
 * That keeps entitlement decisions reviewable in one file instead of scattered
 * across the UI, and means repricing a feature is a one-line change here.
 */
export type FeatureId =
  // --- Free -----------------------------------------------------------------
  | "daily_top_play"
  | "basic_research"
  | "game_previews"
  | "morning_briefing"
  | "basic_market"
  | "basic_filters"
  | "limited_history"
  | "community_discord"
  // --- Medium ---------------------------------------------------------------
  | "unlimited_plays"
  | "all_tools"
  | "live_plays_alerts"
  | "player_props"
  | "head_to_head"
  | "closing_line_value"
  | "ask_atlas"
  | "expanded_filters"
  | "extended_history"
  | "full_research_reports"
  | "member_discord"
  // --- Elite ----------------------------------------------------------------
  | "priority_support"
  | "early_access"
  | "custom_alerts"
  | "advanced_filters"
  | "data_export"
  | "premium_insights";

export interface FeatureDef {
  id: FeatureId;
  /** Shown on lock states and in the upgrade prompt. */
  label: string;
  /** One sentence on what the user gains. Written as a benefit, not a limit. */
  description: string;
  minTier: SubscriptionTier;
}

export const FEATURES: Record<FeatureId, FeatureDef> = {
  // --- Free -----------------------------------------------------------------
  daily_top_play: {
    id: "daily_top_play",
    label: "Today's top play",
    description: "The highest-conviction play on the board, every day.",
    minTier: "free",
  },
  basic_research: {
    id: "basic_research",
    label: "Player and game research",
    description: "Core projections and matchup context for any player or game.",
    minTier: "free",
  },
  game_previews: {
    id: "game_previews",
    label: "Game previews",
    description: "Pre-game reads on every game on the slate.",
    minTier: "free",
  },
  morning_briefing: {
    id: "morning_briefing",
    label: "Morning Briefing",
    description: "The daily written read on the slate.",
    minTier: "free",
  },
  basic_market: {
    id: "basic_market",
    label: "Market overview",
    description: "Line movement and market activity across tracked books.",
    minTier: "free",
  },
  basic_filters: {
    id: "basic_filters",
    label: "Research filters",
    description: "The eight core signals behind every Atlas play, always shown in full.",
    minTier: "free",
  },
  limited_history: {
    id: "limited_history",
    label: "Recent research history",
    description: "Your most recent research sessions.",
    minTier: "free",
  },
  community_discord: {
    id: "community_discord",
    label: "Discord community",
    description: "The open Atlas community channels.",
    minTier: "free",
  },

  // --- Medium ---------------------------------------------------------------
  unlimited_plays: {
    id: "unlimited_plays",
    label: "Unlimited plays",
    description: "Every play that clears the research threshold, not just today's top one.",
    minTier: "medium",
  },
  all_tools: {
    id: "all_tools",
    label: "All eight Atlas tools",
    description: "The complete research desk rather than the core set.",
    minTier: "medium",
  },
  live_plays_alerts: {
    id: "live_plays_alerts",
    label: "Live plays and alerts",
    description: "Positions tracked in real time, with alerts when the market moves.",
    minTier: "medium",
  },
  player_props: {
    id: "player_props",
    label: "Player props",
    description: "Full prop coverage across every league on the slate.",
    minTier: "medium",
  },
  head_to_head: {
    id: "head_to_head",
    label: "Head-to-head research",
    description: "Matchup history and split-level comparisons between any two sides.",
    minTier: "medium",
  },
  closing_line_value: {
    id: "closing_line_value",
    label: "Closing line value",
    description: "How your entry price compares to where the market closed.",
    minTier: "medium",
  },
  ask_atlas: {
    id: "ask_atlas",
    label: "Ask Atlas",
    description: "Question the research layer in plain language, with cited sources.",
    minTier: "medium",
  },
  expanded_filters: {
    id: "expanded_filters",
    label: "Expanded filters",
    description: "Deeper cuts on each signal — splits, thresholds and sample controls.",
    minTier: "medium",
  },
  extended_history: {
    id: "extended_history",
    label: "Extended history",
    description: "Your full research and results history rather than the last few sessions.",
    minTier: "medium",
  },
  full_research_reports: {
    id: "full_research_reports",
    label: "Full research reports",
    description: "Complete written breakdowns behind every published play.",
    minTier: "medium",
  },
  member_discord: {
    id: "member_discord",
    label: "Member Discord channels",
    description: "Private channels alongside the research desk.",
    minTier: "medium",
  },

  // --- Elite ----------------------------------------------------------------
  priority_support: {
    id: "priority_support",
    label: "Priority support",
    description: "Direct line to the team, answered first.",
    minTier: "elite",
  },
  early_access: {
    id: "early_access",
    label: "Early access",
    description: "New tools and models before they ship widely.",
    minTier: "elite",
  },
  custom_alerts: {
    id: "custom_alerts",
    label: "Custom alerts",
    description: "Alerts on your own conditions — any player, market or threshold.",
    minTier: "elite",
  },
  advanced_filters: {
    id: "advanced_filters",
    label: "Advanced filters",
    description: "Build and save your own signal combinations.",
    minTier: "elite",
  },
  data_export: {
    id: "data_export",
    label: "Data exports",
    description: "Full CSV and API export of any research view.",
    minTier: "elite",
  },
  premium_insights: {
    id: "premium_insights",
    label: "Premium research insights",
    description: "Model internals and edge decomposition behind each play.",
    minTier: "elite",
  },
};

/** Everything a tier unlocks that the tier below it does not. */
export function featuresIntroducedBy(tier: SubscriptionTier): FeatureDef[] {
  return Object.values(FEATURES).filter((feature) => feature.minTier === tier);
}
