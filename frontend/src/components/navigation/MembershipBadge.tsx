import { Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TIER_LABEL, useAccess, type SubscriptionTier } from "@/lib/access";

const TIER_STYLE: Record<SubscriptionTier, { variant: "atlas" | "neutral"; icon: boolean }> = {
  free: { variant: "neutral", icon: false },
  medium: { variant: "atlas", icon: false },
  elite: { variant: "atlas", icon: true },
};

/**
 * Membership tier chip.
 *
 * Reads the access model rather than the Supabase profile directly, so the tier
 * shown here always matches the tier the rest of the UI is gating on — including
 * when the dev switcher overrides it.
 */
export function MembershipBadge({ className }: { className?: string }) {
  const { tier } = useAccess();
  const style = TIER_STYLE[tier];

  return (
    <Badge variant={style.variant} className={className}>
      {style.icon && <Sparkles />}
      {TIER_LABEL[tier]}
    </Badge>
  );
}
