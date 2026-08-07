import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlaceholderCard } from "./PlaceholderCard";

/** Market movement summary: a counter strip over a list of recent moves. */
export function MarketPulseCard({ className }: { className?: string }) {
  return (
    <PlaceholderCard
      className={className}
      title="Market Pulse"
      action={<Badge variant="outline">Awaiting data</Badge>}
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 bg-surface px-2 py-3.5">
              <Skeleton className="h-5 w-8" />
              <Skeleton className="h-2 w-12" />
            </div>
          ))}
        </div>

        <div className="flex flex-col">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-line-faint py-3 last:border-b-0"
            >
              <Skeleton className="h-8 w-0.5 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-3 w-4/5" />
              </div>
              <Skeleton className="h-4 w-10 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </PlaceholderCard>
  );
}
