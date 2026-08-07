import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { WidgetCard } from "./WidgetCard";
import { performanceFixture } from "@/data/dashboardFixtures";

/**
 * What happened — the trailing record.
 *
 * Stat tiles rather than charts: these are five unrelated single figures, and a
 * one-value chart is just a number wearing a costume. The trend belongs on the
 * performance page, not here.
 */
export function PerformanceSnapshot({ className }: { className?: string }) {
  return (
    <WidgetCard
      title="Performance Snapshot"
      className={className}
      action={
        <Link
          to="/performance"
          className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-fg-muted outline-none transition-colors duration-[120ms] hover:text-atlas"
        >
          Full history
          <ChevronRight className="size-3" />
        </Link>
      }
    >
      {/* Individually bordered tiles rather than a gap-background grid: there
          are five stats, so any column count leaves a remainder, and with the
          gap technique that remainder renders as an empty filled cell. */}
      <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
        {performanceFixture.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-4"
          >
            <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{stat.label}</dt>
            <dd className="text-xl font-semibold tracking-tight text-fg">
              <AnimatedCounter
                value={stat.value}
                decimals={stat.decimals}
                prefix={stat.prefix}
                suffix={stat.suffix}
              />
            </dd>
            <span className="text-[11px] text-fg-faint">{stat.detail}</span>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}
