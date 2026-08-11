import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { FEATURES, type FeatureId } from "./features";
import { MOCK_CURRENT_USER, type CurrentUser } from "./currentUser";
import { meetsTier, type SubscriptionTier } from "./tiers";

const TIER_STORAGE_KEY = "atlas.dev.tier";

/** Dev-only tier switching. On in `vite dev`, and in the review snapshot. */
export function devToolsEnabled(): boolean {
  if (import.meta.env.DEV) return true;
  return (globalThis as { __ATLAS_DEV_TOOLS__?: boolean }).__ATLAS_DEV_TOOLS__ === true;
}

function readStoredTier(fallback: SubscriptionTier): SubscriptionTier {
  if (!devToolsEnabled()) return fallback;
  try {
    const stored = localStorage.getItem(TIER_STORAGE_KEY);
    if (stored === "free" || stored === "medium" || stored === "elite") return stored;
  } catch {
    // Private mode throws on localStorage access.
  }
  return fallback;
}

interface AccessContextValue {
  user: CurrentUser;
  tier: SubscriptionTier;
  /** True when the current tier meets the feature's minimum. */
  can: (feature: FeatureId) => boolean;
  /** The tier a feature needs. Drives "Unlock with …" copy. */
  requiredTier: (feature: FeatureId) => SubscriptionTier;
  /** Opens the upgrade prompt, optionally anchored to the feature that was clicked. */
  requestUpgrade: (feature?: FeatureId) => void;
  /** Dev-only. No-op in production builds. */
  setTier: (tier: SubscriptionTier) => void;

  upgradeOpen: boolean;
  upgradeFeature: FeatureId | null;
  closeUpgrade: () => void;
}

const AccessContext = createContext<AccessContextValue | undefined>(undefined);

export function AccessProvider({
  children,
  user = MOCK_CURRENT_USER,
}: {
  children: ReactNode;
  user?: CurrentUser;
}) {
  const [tier, setTierState] = useState<SubscriptionTier>(() =>
    readStoredTier(user.subscriptionTier),
  );
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<FeatureId | null>(null);

  const setTier = useCallback((next: SubscriptionTier) => {
    if (!devToolsEnabled()) return;
    setTierState(next);
    try {
      localStorage.setItem(TIER_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the switch still applies for this session.
    }
  }, []);

  const can = useCallback(
    (feature: FeatureId) => meetsTier(tier, FEATURES[feature].minTier),
    [tier],
  );

  const requiredTier = useCallback((feature: FeatureId) => FEATURES[feature].minTier, []);

  const requestUpgrade = useCallback((feature?: FeatureId) => {
    setUpgradeFeature(feature ?? null);
    setUpgradeOpen(true);
  }, []);

  const closeUpgrade = useCallback(() => setUpgradeOpen(false), []);

  const value = useMemo(
    () => ({
      user: { ...user, subscriptionTier: tier },
      tier,
      can,
      requiredTier,
      requestUpgrade,
      setTier,
      upgradeOpen,
      upgradeFeature,
      closeUpgrade,
    }),
    [user, tier, can, requiredTier, requestUpgrade, setTier, upgradeOpen, upgradeFeature, closeUpgrade],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within an AccessProvider");
  return ctx;
}
