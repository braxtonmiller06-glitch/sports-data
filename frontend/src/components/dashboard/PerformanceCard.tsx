import { Skeleton, SkeletonMetric } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlaceholderCard } from "./PlaceholderCard";

/**
 * Performance summary: metric row over a chart well.
 *
 * The well is an empty bordered area rather than a fake sparkline — a drawn
 * curve here would be an invented statistic.
 */
export function PerformanceCard({ className }: { className?: string }) {
  return (
    <PlaceholderCard
      className={className}
      title="Performance"
      action={<Badge variant="outline">Awaiting data</Badge>}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric className="hidden sm:flex" />
        </div>

        <div className="flex h-36 items-end gap-1.5 rounded-lg border border-line-faint bg-inset p-4">
          {Array.from({ length: 24 }).map((_, i) => (
            <Skeleton
              key={i}
              className="flex-1 rounded-sm"
              // A flat bar field reads as "chart pending" without asserting a trend.
              style={{ height: `${28 + ((i * 37) % 44)}%` }}
            />
          ))}
        </div>
      </div>
    </PlaceholderCard>
  );
}
