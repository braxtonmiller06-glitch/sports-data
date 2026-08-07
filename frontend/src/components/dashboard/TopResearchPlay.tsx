import { motion, useReducedMotion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { BookmarkCheck, BookmarkPlus, Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LivePulse } from "@/components/ui/live-pulse";
import { ResearchFilters } from "./ResearchFilters";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { useTrackedProps } from "@/lib/tracked-props";
import { ROUTES } from "@/lib/routes";
import { cardVariants, transition } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { premiumInsightsFixture, topPlayFixture } from "@/data/dashboardFixtures";

const play = topPlayFixture;

const METRICS = [
  { label: "Projection", value: play.projection, tone: "fg" },
  { label: "Edge", value: play.edge, tone: "atlas" },
  { label: "Confidence", value: play.confidence, tone: "atlas" },
  { label: "Books compared", value: String(play.booksCompared), tone: "fg" },
  { label: "Filters passed", value: `${play.filtersPassed} / ${play.filtersTotal}`, tone: "fg" },
] as const;

const PLAY_ID = "top-play-edwards-pts";

/**
 * The single highest-conviction subject on the board.
 *
 * Available at every tier — a free account gets today's play in full, including
 * all eight signals and their reasoning. What Medium adds is the rest of the
 * board, surfaced below rather than hidden.
 */
export function TopResearchPlay({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const { isTracked, toggle } = useTrackedProps();

  const tracked = isTracked(PLAY_ID);

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

        {/* Reasoning — never gated */}
        <div className="flex flex-1 flex-col gap-4 border-t border-line-faint p-5">
          <ResearchFilters filters={play.filters} />

          {/* Elite tier. The signals above explain *why*; this shows the
              arithmetic that turns them into the number. */}
          <PremiumGate feature="premium_insights">
            <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-inset p-4">
              <h4 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
                EDGE DECOMPOSITION
              </h4>
              <dl className="flex flex-col">
                {premiumInsightsFixture.map((row) => (
                  <div
                    key={row.label}
                    className="flex items-baseline gap-3 border-b border-line-faint py-2 last:border-b-0"
                  >
                    <dt className="min-w-0 flex-1 truncate text-[12px] text-fg-muted">
                      {row.label}
                      <span className="ml-2 text-[11px] text-fg-faint">{row.detail}</span>
                    </dt>
                    <dd className="tabular shrink-0 text-[13px] font-medium text-fg">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </PremiumGate>

          {/* The rest of the board. Visible to everyone; readable above Free. */}
          <PremiumGate
            feature="unlimited_plays"
            title={`${play.additionalPlaysToday} more plays cleared the threshold today`}
            description="Every play the filter engine published today, not just the top one."
          >
            <Link
              to={ROUTES.research}
              className={cn(
                "flex items-center gap-3 rounded-lg border border-line bg-inset px-4 py-3",
                "outline-none transition-colors duration-[120ms] hover:border-line-hi hover:bg-surface-hi",
              )}
            >
              <Layers className="size-4 shrink-0 text-atlas" />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] font-medium text-fg">
                  {play.additionalPlaysToday} more plays today
                </span>
                <span className="text-[11px] text-fg-faint">
                  View the full published board
                </span>
              </span>
            </Link>
          </PremiumGate>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2.5 border-t border-line-faint p-5">
          <Button
            variant="primary"
            onClick={() => navigate(ROUTES.playerLookup)}
          >
            View research
          </Button>
          <Button
            variant={tracked ? "outline" : "secondary"}
            aria-pressed={tracked}
            onClick={() =>
              toggle({ id: PLAY_ID, subject: play.subject, market: play.market })
            }
          >
            {tracked ? <BookmarkCheck className="text-atlas" /> : <BookmarkPlus />}
            {tracked ? "Tracking" : "Track prop"}
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}
