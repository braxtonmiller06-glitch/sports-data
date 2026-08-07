import { motion, useReducedMotion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton, SkeletonMetric } from "@/components/ui/skeleton";
import { cardVariants, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * The lead panel. Sized and weighted to carry the day's headline figure, with
 * a supporting metric row beneath it.
 */
export function HeroCard({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardVariants}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={transition}
      className={cn("min-w-0", className)}
    >
      <Card className="h-full hover:border-line-hi">
        {/* justify-between so the metric row sits on the floor of the card
            rather than leaving a void when a taller neighbour sets the row
            height. */}
        <div className="flex h-full flex-col justify-between gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-9 w-40" />
            </div>
            <Badge variant="outline">Awaiting data</Badge>
          </div>

          <Skeleton className="h-1.5 w-full rounded-full" />

          <div className="grid grid-cols-2 gap-6 border-t border-line-faint pt-5 sm:grid-cols-3">
            <SkeletonMetric />
            <SkeletonMetric />
            <SkeletonMetric className="hidden sm:flex" />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
