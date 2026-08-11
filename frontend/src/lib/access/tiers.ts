/**
 * Subscription tiers, ordered least to most capable.
 *
 * `rank` is the whole comparison mechanism: access is "is my rank at least the
 * feature's rank", never a chain of equality checks against tier names. Adding
 * a tier means adding it here and giving it a rank.
 */
export type SubscriptionTier = "free" | "medium" | "elite";

export const TIER_ORDER: SubscriptionTier[] = ["free", "medium", "elite"];

export const TIER_RANK: Record<SubscriptionTier, number> = {
  free: 0,
  medium: 1,
  elite: 2,
};

export const TIER_LABEL: Record<SubscriptionTier, string> = {
  free: "Free",
  medium: "Medium",
  elite: "Elite",
};

/** Short blurb used on upgrade surfaces. */
export const TIER_PITCH: Record<SubscriptionTier, string> = {
  free: "Today's play and core research.",
  medium: "The full research desk — unlimited plays, every tool, live alerts.",
  elite: "Everything in Medium, plus custom alerts, exports and priority support.",
};

export function meetsTier(current: SubscriptionTier, required: SubscriptionTier): boolean {
  return TIER_RANK[current] >= TIER_RANK[required];
}

/** The next tier up, or null at the ceiling. Drives "Unlock with …" copy. */
export function nextTier(current: SubscriptionTier): SubscriptionTier | null {
  const index = TIER_ORDER.indexOf(current);
  return index >= 0 && index < TIER_ORDER.length - 1 ? TIER_ORDER[index + 1] : null;
}
