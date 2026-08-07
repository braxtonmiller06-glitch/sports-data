import type { SubscriptionTier } from "./tiers";

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  subscriptionTier: SubscriptionTier;
}

/**
 * Mock signed-in user.
 *
 * The one place the app decides who is using it. When Stripe and auth are
 * connected this is replaced by a hook reading the real profile — every caller
 * already goes through `useAccess()`, so nothing else has to change.
 */
export const MOCK_CURRENT_USER: CurrentUser = {
  id: "mock-user",
  name: "Braxton",
  email: "braxton@atlas.dev",
  subscriptionTier: "free",
};
