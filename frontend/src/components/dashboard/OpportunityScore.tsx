import { AnimatedCounter } from "@/components/ui/animated-counter";
import { Badge } from "@/components/ui/badge";
import { WidgetCard } from "./WidgetCard";
import { opportunityFixture } from "@/data/dashboardFixtures";

const ARC_LENGTH = 236;

/**
 * Rating of the slate as a whole — how much opportunity is on the board today.
 *
 * Explicitly not a confidence figure: confidence belongs to an individual play,
 * this is the environment those plays sit in. The three supporting readings are
 * what the score is composed from.
 */
export function OpportunityScore({ className }: { className?: string }) {
  const { score, scale, expectedValue, slateQuality, marketVolatility } = opportunityFixture;
  const filled = ARC_LENGTH * (score / scale);

  return (
    <WidgetCard title="Today's Opportunity Score" className={className}>
      <div className="flex h-full flex-col items-center justify-center gap-5">
        <div className="relative">
          <svg viewBox="0 0 180 104" className="w-[168px] overflow-visible" role="presentation">
            <path
              d="M14 96 A76 76 0 0 1 166 96"
              fill="none"
              stroke="var(--color-line)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            <path
              d="M14 96 A76 76 0 0 1 166 96"
              fill="none"
              stroke="var(--color-atlas)"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={ARC_LENGTH}
              strokeDashoffset={ARC_LENGTH - filled}
              className="[transition:stroke-dashoffset_900ms_cubic-bezier(0.22,1,0.36,1)]"
            />
          </svg>

          <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
            {/* Proportional figures: tabular digits make a hero number look loose. */}
            <AnimatedCounter
              value={score}
              className="text-[44px] font-semibold leading-none tracking-tight text-fg"
            />
            <span className="mt-2 text-[10px] font-medium tracking-[0.16em] text-fg-faint">
              OF {scale}
            </span>
          </div>
        </div>

        <Badge variant="atlas">Slate quality — {slateQuality}</Badge>

        <dl className="grid w-full grid-cols-3 gap-px overflow-hidden rounded-lg border border-line bg-line">
          <div className="flex flex-col items-center gap-2 bg-surface px-2 py-3 text-center">
            <dt className="text-[10px] font-medium tracking-wide text-fg-faint">Expected value</dt>
            <dd className="text-sm font-semibold text-atlas">{expectedValue}</dd>
          </div>
          <div className="flex flex-col items-center gap-2 bg-surface px-2 py-3 text-center">
            <dt className="text-[10px] font-medium tracking-wide text-fg-faint">Slate quality</dt>
            <dd className="text-sm font-semibold text-fg">{slateQuality}</dd>
          </div>
          <div className="flex flex-col items-center gap-2 bg-surface px-2 py-3 text-center">
            <dt className="text-[10px] font-medium tracking-wide text-fg-faint">Volatility</dt>
            <dd className="text-sm font-semibold text-signal-warn">{marketVolatility}</dd>
          </div>
        </dl>
      </div>
    </WidgetCard>
  );
}
