import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { SubscriptionTier } from "../lib/access/tiers";

/**
 * What the subscription's billing is doing -- independent of what it entitles.
 *
 * Kept apart from the tier because they answer different questions and change
 * for different reasons: a past_due Elite subscriber is still on Elite, and a
 * plan change is not a billing event. Conflating them means every future
 * question ("show a payment warning", "which plan are they on") has to be
 * answered by pattern-matching one overloaded string.
 */
export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface Profile {
  id: string;
  email: string;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
}

/**
 * Translate the single legacy column into the split model.
 *
 * `profiles.subscription_status` currently stores 'free' | 'active' |
 * 'past_due' | 'canceled', which mixes the plan with its billing state. The
 * rest of the app is written against the split model, so the translation is
 * confined to this function: once the migration adds `subscription_tier` and
 * narrows `subscription_status`, this is replaced by selecting both columns
 * and no caller changes.
 *
 * 'active' does not record which paid plan it is, so it maps to the lowest
 * paid tier. Guessing upward would hand Elite features to Medium subscribers,
 * and this mapping disappears the moment the real column exists.
 */
function fromLegacyStatus(raw: string | null | undefined): {
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
} {
  switch (raw) {
    case "active":
      return { subscription_tier: "medium", subscription_status: "active" };
    case "past_due":
      return { subscription_tier: "medium", subscription_status: "past_due" };
    case "canceled":
      return { subscription_tier: "free", subscription_status: "canceled" };
    // 'free', null, and anything unrecognised. A free account has no billing
    // to be wrong, so 'active' here means "nothing is outstanding", not "paid".
    default:
      return { subscription_tier: "free", subscription_status: "active" };
  }
}

/** The row as `profiles` stores it today, before the migration splits it. */
interface LegacyProfileRow {
  id: string;
  email: string;
  subscription_status: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, email, subscription_status")
      .eq("id", user.id)
      // maybeSingle, not single: single() treats "no row" as an error, and a
      // user who signed up before the handle_new_user trigger existed has no
      // profile row. That is a missing row, not a failure, and logging it as
      // an error hides real ones.
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error("failed to load profile:", error.message);
        }
        const row = data as LegacyProfileRow | null;
        setProfile(
          row
            ? {
                id: row.id,
                email: row.email,
                ...fromLegacyStatus(row.subscription_status),
              }
            : null,
        );
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Unchanged in effect: only a paying account in good standing is subscribed.
  // Stating it against the split model keeps past_due locked out explicitly
  // rather than by omission from a list of status strings.
  const isSubscribed =
    profile !== null &&
    profile.subscription_tier !== "free" &&
    profile.subscription_status === "active";

  return { profile, isSubscribed, tier: profile?.subscription_tier ?? "free", loading };
}
