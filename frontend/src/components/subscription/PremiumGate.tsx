import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FEATURES, TIER_LABEL, useAccess, type FeatureId } from "@/lib/access";
import { LockChip } from "./LockChip";
import { cn } from "@/lib/utils";

interface PremiumGateProps {
  feature: FeatureId;
  children: ReactNode;
  /**
   * `replace` swaps in a locked panel describing what is behind it.
   * `overlay` keeps the real content visible but inert behind a scrim, for
   * cases where seeing the shape of the thing is itself informative.
   */
  mode?: "replace" | "overlay";
  /** Overrides the catalogue copy when a surface needs something specific. */
  title?: string;
  description?: string;
  className?: string;
}

/**
 * Renders `children` when the current tier allows it, and a lock state when it
 * does not — never nothing. A free user should always be able to see that more
 * research exists and what it would tell them.
 */
export function PremiumGate({
  feature,
  children,
  mode = "replace",
  title,
  description,
  className,
}: PremiumGateProps) {
  const { can, requestUpgrade } = useAccess();

  if (can(feature)) return <>{children}</>;

  const def = FEATURES[feature];
  const heading = title ?? def.label;
  const body = description ?? def.description;

  if (mode === "overlay") {
    return (
      <div className={cn("relative isolate overflow-hidden rounded-lg", className)}>
        {/* Inert: the real layout stays visible so the user sees the shape of
            what they'd get, but it cannot be read or interacted with. */}
        <div aria-hidden="true" className="pointer-events-none select-none blur-[3px] saturate-50">
          {children}
        </div>

        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 bg-canvas/75 p-4 text-center backdrop-blur-[1px]">
          <LockChip tier={def.minTier} />
          <p className="text-[12px] font-medium text-fg">{heading}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => requestUpgrade(feature)}
          >
            Unlock with {TIER_LABEL[def.minTier]}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-lg border border-dashed border-line-hi",
        "bg-inset p-4",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-lg border border-line bg-surface">
          <Lock className="size-3.5 text-fg-muted" />
        </span>
        <LockChip tier={def.minTier} />
      </div>

      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] font-medium text-fg">{heading}</p>
        <p className="max-w-[52ch] text-[12px] leading-relaxed text-fg-muted">{body}</p>
      </div>

      <Button size="sm" variant="secondary" onClick={() => requestUpgrade(feature)}>
        Unlock with {TIER_LABEL[def.minTier]}
      </Button>
    </div>
  );
}
