import { Skeleton, SkeletonMetric } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlaceholderCard } from "./PlaceholderCard";

/** Headline research subject: identity block, metric row, contributing signals. */
export function TopPlayCard({ className }: { className?: string }) {
  return (
    <PlaceholderCard className={className} title="Top Play" action={<Badge variant="outline">Awaiting data</Badge>}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2.5">
            <Skeleton className="h-2.5 w-24" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-2.5 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 border-y border-line-faint py-4">
          <SkeletonMetric />
          <SkeletonMetric />
          <SkeletonMetric />
        </div>

        {/* Signal contribution strip */}
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-2.5 w-28" />
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-1 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </PlaceholderCard>
  );
}
