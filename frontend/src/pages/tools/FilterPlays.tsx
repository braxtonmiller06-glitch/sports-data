import { motion } from "framer-motion";
import { SearchX } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SportSelector } from "@/components/navigation/SportSelector";
import { SportComingSoon } from "@/components/player-lookup/SportComingSoon";
import { FilterBar } from "@/components/filter-plays/FilterBar";
import { ResultsBoard } from "@/components/filter-plays/ResultsBoard";
import { useFilterPlays } from "@/hooks/useFilterPlays";
import { DATE_RANGE_OPTIONS, type DateRange } from "@/lib/filter-plays";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";

const TOOL = TOOLS.find((t) => t.id === "filter-plays")!;

/**
 * Filter Plays.
 *
 * The question this page answers is "given the criteria I care about, what
 * opportunities exist on today's slate?" — so the criteria are the interface
 * and the board is the answer. Every control is wired through `useFilterPlays`
 * into the pure engine in `lib/filter-plays`; nothing here filters, sorts or
 * scores anything itself.
 *
 * The board is fixture data today. The separation is deliberate: fixtures →
 * engine → UI, so the API replaces the first layer alone.
 */
export default function FilterPlaysPage() {
  const board = useFilterPlays();
  const { criteria, results, total, sportSupported, sportConfig, markets } = board;

  const marketOptions = [
    { value: "all", label: "All markets" },
    ...markets.map((market) => ({ value: market.value, label: market.label })),
  ];

  const countLabel = board.filtersActive
    ? `Showing ${results.length} of ${total} ${total === 1 ? "opportunity" : "opportunities"}`
    : `${total} ${total === 1 ? "opportunity" : "opportunities"} found`;

  return (
    <ToolShell
      tool={TOOL}
      controlsClassName="grid-cols-2 sm:grid-cols-3 xl:max-w-2xl xl:grid-cols-3"
      controls={
        <>
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
              SPORT
            </span>
            {/* The app-wide selector, not a second copy of the state: changing
                it here changes the scope everywhere. */}
            <SportSelector className="h-9 justify-between" />
          </div>

          <Select
            label="Date"
            options={DATE_RANGE_OPTIONS}
            value={criteria.date}
            onChange={(e) => board.setField("date", e.target.value as DateRange)}
          />

          <Select
            label="Market"
            options={marketOptions}
            value={criteria.market}
            disabled={markets.length === 0}
            onChange={(e) => board.setField("market", e.target.value)}
          />
        </>
      }
    >
      {!sportSupported ? (
        <motion.div variants={cardVariants}>
          <SportComingSoon config={sportConfig} />
        </motion.div>
      ) : (
        <div className="flex flex-col gap-5">
          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Research criteria</CardTitle>
              </CardHeader>
              <CardContent>
                <FilterBar
                  criteria={criteria}
                  onField={board.setField}
                  onSignalRequirement={board.setSignalRequirement}
                  onToggleSignal={board.toggleSignal}
                  onReset={board.reset}
                  signalsChanged={board.signalsChanged}
                />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Opportunities</CardTitle>
                <Badge variant={results.length > 0 ? "atlas" : "neutral"}>
                  {results.length}
                </Badge>
                <span
                  aria-live="polite"
                  className="ml-auto text-[11px] text-fg-faint"
                >
                  {countLabel}
                </span>
              </CardHeader>

              <CardContent className="p-0">
                {results.length === 0 ? (
                  <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                    <span className="flex size-10 items-center justify-center rounded-lg border border-line bg-inset">
                      <SearchX aria-hidden="true" className="size-5 text-fg-faint" />
                    </span>
                    <h3 className="text-[11px] font-medium tracking-[0.18em] text-fg-faint">
                      NO MATCHING OPPORTUNITIES
                    </h3>
                    <p className="max-w-[46ch] text-[13px] leading-relaxed text-fg-muted">
                      Atlas didn't find opportunities matching your current criteria.
                    </p>
                    <Button variant="secondary" size="sm" onClick={board.reset} className="mt-1">
                      Reset filters
                    </Button>
                  </div>
                ) : (
                  <ResultsBoard results={results} />
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants}>
            <Card>
              <CardHeader>
                <CardTitle>How this works</CardTitle>
                <Badge variant="neutral" className="ml-auto">
                  Sample data
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="max-w-[78ch] text-[13px] leading-relaxed text-fg-muted">
                  Every market on the slate is scored by the eight Atlas signals. A row appears
                  here when the projection diverges from the market's implied number by more than
                  the noise in the sample — that gap is the edge column. Confidence is separate:
                  it measures how much of the projection rests on a large sample rather than a
                  handful of comparable games.
                </p>
                <p className="max-w-[78ch] text-[13px] leading-relaxed text-fg-muted">
                  Opportunity Score is a third thing again — the overall quality of the research
                  opportunity once price, sample and volatility are taken together. A high edge
                  with low confidence is a thin sample, not an opportunity, and it scores
                  accordingly.
                </p>
                <p className="max-w-[78ch] text-[13px] leading-relaxed text-fg-faint">
                  The board is sample data, not a live feed. The filtering, ranking and scoring
                  are real and run over that data; only the source is stubbed.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </ToolShell>
  );
}
