import { motion, useReducedMotion } from "framer-motion";
import { BookmarkPlus, Check, TriangleAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LivePulse } from "@/components/ui/live-pulse";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cardVariants, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { topPlayFixture } from "@/data/dashboardFixtures";

const play = topPlayFixture;

const METRICS = [
  { label: "Projection", value: play.projection, tone: "fg" },
  { label: "Edge", value: play.edge, tone: "atlas" },
  { label: "Confidence", value: play.confidence, tone: "atlas" },
  { label: "Books compared", value: String(play.booksCompared), tone: "fg" },
  { label: "Filters passed", value: `${play.filtersPassed} / ${play.filtersTotal}`, tone: "fg" },
] as const;

/**
 * The single highest-conviction subject on the board.
 *
 * "Why we like it" is the important half: each filter is named on the face of
 * the card and explains itself on hover or keyboard focus, so the reasoning is
 * inspectable rather than a score to be taken on trust.
 */
export function TopResearchPlay({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      variants={cardVariants}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={transition}
      className={cn("min-w-0", className)}
    >
      <Card className="h-full hover:border-line-hi">
        {/* Identity */}
        <div className="flex flex-wrap items-start gap-4 border-b border-line-faint p-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="atlas">Top research play</Badge>
              <span className="text-[11px] text-fg-faint">
                {play.matchup} · {play.tipoff}
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-fg">{play.subject}</h3>
            <p className="mt-1.5 text-[13px] text-fg-muted">
              <span className="font-medium text-fg">{play.market}</span>
              <span className="mx-2 text-fg-faint">·</span>
              {play.team}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <LivePulse tone="live" label="Tracking" />
            <span className="text-[11px] text-fg-faint">Updated {play.lastUpdated}</span>
          </div>
        </div>

        {/* Metrics */}
        {/* 5 metrics across only once the card is genuinely wide; at its usual
            6-of-12 span it sits at 3 across over two rows. */}
        <dl className="grid grid-cols-2 gap-px bg-line-faint sm:grid-cols-3 2xl:grid-cols-5">
          {METRICS.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-2 bg-surface px-5 py-4">
              <dt className="text-[10px] font-medium tracking-wide text-fg-faint">
                {metric.label}
              </dt>
              <dd
                className={cn(
                  "text-xl font-semibold tracking-tight",
                  metric.tone === "atlas" ? "text-atlas" : "text-fg",
                )}
              >
                {metric.value}
              </dd>
            </div>
          ))}
        </dl>

        {/* Why we like it */}
        <div className="flex flex-1 flex-col gap-3 border-t border-line-faint p-5">
          <div className="flex items-center gap-2">
            <h4 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
              WHY WE LIKE IT
            </h4>
            <span className="text-[11px] text-fg-faint">
              Hover a signal for the detail behind it
            </span>
          </div>

          <ul className="flex flex-wrap gap-2">
            {play.filters.map((filter) => (
              <li key={filter.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                        "text-[12px] font-medium outline-none",
                        "transition-colors duration-[120ms]",
                        filter.status === "pass"
                          ? "border-atlas/25 bg-atlas/8 text-fg hover:border-atlas/50 hover:bg-atlas/12"
                          : "border-signal-warn/30 bg-signal-warn/10 text-signal-warn hover:border-signal-warn/50",
                      )}
                    >
                      {filter.status === "pass" ? (
                        <Check className="size-3.5 text-atlas" />
                      ) : (
                        <TriangleAlert className="size-3.5" />
                      )}
                      {filter.name}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-wrap font-normal leading-relaxed">
                    {filter.explanation}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2.5 border-t border-line-faint p-5">
          <Button variant="primary">View research</Button>
          <Button variant="secondary">
            <BookmarkPlus />
            Track prop
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
