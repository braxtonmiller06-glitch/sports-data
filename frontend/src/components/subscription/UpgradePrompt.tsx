import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  FEATURES,
  TIER_LABEL,
  TIER_PITCH,
  featuresIntroducedBy,
  nextTier,
  useAccess,
} from "@/lib/access";

/**
 * The single upgrade surface.
 *
 * Mounted once by AppShell and opened through `requestUpgrade()`, so no
 * component owns its own modal and the copy cannot drift between surfaces.
 *
 * Tone is deliberate: it states what the current plan already includes before
 * what the next one adds. The product rule is that free should feel valuable,
 * not besieged — so this appears when a user asks for something, never on its
 * own initiative.
 */
export function UpgradePrompt() {
  const { tier, upgradeOpen, upgradeFeature, closeUpgrade } = useAccess();

  // If a specific feature was clicked, pitch the tier that actually unlocks it
  // rather than assuming the next one up.
  const target = upgradeFeature ? FEATURES[upgradeFeature].minTier : nextTier(tier);

  if (!target) return null;

  const gains = featuresIntroducedBy(target).slice(0, 6);

  return (
    <Dialog open={upgradeOpen} onOpenChange={(open) => !open && closeUpgrade()}>
      <DialogContent>
        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col gap-2">
            <DialogTitle>Unlock more research</DialogTitle>
            <DialogDescription>
              Your {TIER_LABEL[tier].toLowerCase()} account gives you {TIER_PITCH[tier].toLowerCase()}
            </DialogDescription>
          </div>

          {upgradeFeature && (
            <div className="rounded-lg border border-line bg-inset px-3.5 py-3">
              <p className="text-[12px] font-medium text-fg">
                {FEATURES[upgradeFeature].label}
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-fg-muted">
                {FEATURES[upgradeFeature].description}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-medium tracking-[0.14em] text-fg-faint">
              {TIER_LABEL[target].toUpperCase()} ADDS
            </p>
            <ul className="flex flex-col gap-2.5">
              {gains.map((feature) => (
                <li key={feature.id} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-atlas" />
                  <span className="text-[13px] text-fg-muted">
                    <span className="text-fg">{feature.label}</span>
                    <span className="text-fg-faint"> — {feature.description}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Placeholder: billing is not wired up yet. */}
            <Button variant="primary" onClick={closeUpgrade}>
              Upgrade to {TIER_LABEL[target]}
            </Button>
            <Button variant="ghost" onClick={closeUpgrade}>
              Maybe later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
