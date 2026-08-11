import { TIER_LABEL, TIER_ORDER, devToolsEnabled, useAccess } from "@/lib/access";
import { cn } from "@/lib/utils";

/**
 * Development control for previewing each tier.
 *
 * Renders only when dev tools are enabled (vite dev, or the review snapshot),
 * so it cannot reach a production build. The choice persists across reloads,
 * which matters when checking a tier across several screens.
 */
export function TierSwitcher({ className }: { className?: string }) {
  const { tier, setTier } = useAccess();

  if (!devToolsEnabled()) return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-line bg-inset p-0.5",
        className,
      )}
      role="group"
      aria-label="Preview subscription tier"
    >
      <span className="px-1.5 text-[9px] font-medium tracking-[0.14em] text-fg-faint">
        TIER
      </span>
      {TIER_ORDER.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => setTier(option)}
          aria-pressed={tier === option}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium outline-none",
            "transition-colors duration-[120ms]",
            tier === option
              ? "bg-atlas/12 text-atlas"
              : "text-fg-faint hover:bg-surface-hi hover:text-fg",
          )}
        >
          {TIER_LABEL[option]}
        </button>
      ))}
    </div>
  );
}
