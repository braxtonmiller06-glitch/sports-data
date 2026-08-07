import { Lock } from "lucide-react";
import { TIER_LABEL, type SubscriptionTier } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * Small marker showing which tier a feature belongs to.
 *
 * Deliberately quiet — it labels, it does not shout. The tier is named rather
 * than a generic "PRO" so the user knows exactly which plan they need.
 */
export function LockChip({
  tier,
  className,
}: {
  tier: SubscriptionTier;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-line-hi bg-surface-hi",
        "px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-fg-muted",
        className,
      )}
    >
      <Lock className="size-2.5" />
      {TIER_LABEL[tier]}
    </span>
  );
}
