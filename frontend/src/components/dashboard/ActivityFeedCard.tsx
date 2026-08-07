import { SkeletonRows } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PlaceholderCard } from "./PlaceholderCard";

/** Chronological event stream. Scrolls internally so the page height is stable. */
export function ActivityFeedCard({ className }: { className?: string }) {
  return (
    <PlaceholderCard
      className={className}
      title="Activity Feed"
      action={<Badge variant="outline">Awaiting data</Badge>}
    >
      <SkeletonRows rows={6} className="scrollbar-atlas max-h-80 overflow-y-auto pr-1" />
    </PlaceholderCard>
  );
}
