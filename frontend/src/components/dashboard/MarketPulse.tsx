import { Sparkline } from "@/components/ui/sparkline";
import { DeltaTag, LivePulse } from "@/components/ui/live-pulse";
import { WidgetCard } from "./WidgetCard";
import { marketPulseFixture } from "@/data/dashboardFixtures";

/**
 * What the market is doing right now.
 *
 * Each row is one measure: the current figure, a signed delta with a direction
 * glyph, and a bare trend line. No axes or gridlines — at this size the shape
 * is the whole message, and the exact figure is already stated beside it.
 */
export function MarketPulse({ className }: { className?: string }) {
  return (
    <WidgetCard
      title="Market Pulse"
      className={className}
      action={<LivePulse tone="live" label="Live" />}
      contentClassName="p-0"
    >
      <ul className="flex flex-col">
        {marketPulseFixture.map((metric) => (
          <li
            key={metric.label}
            className="flex flex-col gap-2 border-b border-line-faint px-5 py-3.5 last:border-b-0"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate text-[13px] text-fg-muted">{metric.label}</span>
              <span className="shrink-0 text-lg font-semibold tracking-tight text-fg">
                {metric.value}
              </span>
            </div>

            {/* Sparkline on its own line so the row holds up at any card width. */}
            <div className="flex items-center gap-3">
              <Sparkline
                data={metric.series}
                trend={metric.trend}
                label={`${metric.label} trend, currently ${metric.value}`}
                className="h-6 min-w-0 flex-1"
              />
              <DeltaTag delta={metric.delta} trend={metric.trend} className="shrink-0" />
            </div>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}
