import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Loading placeholder.
 *
 * Deliberately a slow, low-contrast pulse rather than a sweeping shimmer --
 * a shimmer draws the eye to the thing that has no information in it yet.
 */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-line-faint", className)}
      {...props}
    />
  );
}

/** A run of text lines. The last line is shortened so it reads as prose. */
export function SkeletonText({
  lines = 3,
  className,
  ...props
}: ComponentProps<"div"> & { lines?: number }) {
  return (
    <div className={cn("flex flex-col gap-2.5", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-3", i === lines - 1 ? "w-2/5" : i % 3 === 1 ? "w-11/12" : "w-full")}
        />
      ))}
    </div>
  );
}

/** Repeating rows, for feeds and tables that are still loading. */
export function SkeletonRows({
  rows = 4,
  className,
  ...props
}: ComponentProps<"div"> & { rows?: number }) {
  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-line-faint py-3.5 last:border-b-0"
        >
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-2.5 w-3/5" />
          </div>
          <Skeleton className="h-3 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** Label-over-value block, matching the metric cells used across the app. */
export function SkeletonMetric({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-6 w-24" />
      <Skeleton className="h-2.5 w-20" />
    </div>
  );
}
