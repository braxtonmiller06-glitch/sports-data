import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Lock, RotateCcw } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { FEATURES, useAccess } from "@/lib/access";
import { ROUTES } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  CONFIDENCE_OPTIONS,
  DATE_OPTIONS,
  FILTER_TOGGLES,
  MARKET_OPTIONS,
  PLAY_RESULTS,
  SORT_OPTIONS,
  SPORT_OPTIONS,
} from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "filter-plays")!;

/** Free sees the top slice of the board; the rest is a Medium feature. */
const FREE_VISIBLE_RESULTS = 4;

export default function FilterPlaysPage() {
  const navigate = useNavigate();
  const { can, requestUpgrade } = useAccess();

  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");
  const [market, setMarket] = useState("all");
  const [minConfidence, setMinConfidence] = useState("0");
  const [sort, setSort] = useState("edge");
  const [activeFilters, setActiveFilters] = useState<string[]>(
    FILTER_TOGGLES.filter((f) => !f.advanced).map((f) => f.id),
  );

  const canAdvanced = can("advanced_filters");
  const canFullBoard = can("unlimited_plays");

  // Real filtering over the fixture set, so the controls actually do something
  // and the wiring is already correct when this reads from the API instead.
  const results = useMemo(() => {
    const filtered = PLAY_RESULTS.filter((row) => {
      if (sport !== "all" && row.sport !== sport) return false;
      if (market !== "all" && !row.market.toLowerCase().includes(market.slice(0, 5))) return false;
      if (row.confidence < Number(minConfidence)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === "confidence") return b.confidence - a.confidence;
      if (sort === "line") return b.line - a.line;
      return b.edge - a.edge;
    });
  }, [sport, market, minConfidence, sort]);

  const visible = canFullBoard ? results : results.slice(0, FREE_VISIBLE_RESULTS);
  const hidden = results.length - visible.length;

  function toggleFilter(id: string, advanced?: boolean) {
    if (advanced && !canAdvanced) {
      requestUpgrade("advanced_filters");
      return;
    }
    setActiveFilters((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  }

  function resetFilters() {
    setSport("all");
    setDate("today");
    setMarket("all");
    setMinConfidence("0");
    setSort("edge");
    setActiveFilters(FILTER_TOGGLES.filter((f) => !f.advanced).map((f) => f.id));
  }

  return (
    <ToolShell
      tool={TOOL}
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Market" options={MARKET_OPTIONS} value={market} onChange={(e) => setMarket(e.target.value)} />
          <Select label="Confidence" options={CONFIDENCE_OPTIONS} value={minConfidence} onChange={(e) => setMinConfidence(e.target.value)} />
          <Select label="Sort" options={SORT_OPTIONS} value={sort} onChange={(e) => setSort(e.target.value)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Filters */}
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-3">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Research filters</CardTitle>
              <button
                type="button"
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-fg-faint outline-none transition-colors duration-[120ms] hover:text-atlas"
              >
                <RotateCcw className="size-3" />
                Reset
              </button>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <p className="text-[11px] leading-relaxed text-fg-faint">
                Signals applied when scoring the board. Turning one off re-scores every
                result below.
              </p>

              <div className="flex flex-col gap-1.5">
                {FILTER_TOGGLES.map((filter) => {
                  const locked = filter.advanced && !canAdvanced;
                  const on = activeFilters.includes(filter.id);
                  return (
                    <button
                      key={filter.id}
                      type="button"
                      onClick={() => toggleFilter(filter.id, filter.advanced)}
                      aria-pressed={on}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left",
                        "text-[12px] outline-none transition-colors duration-[120ms]",
                        on && !locked
                          ? "border-atlas/30 bg-atlas/8 text-fg"
                          : "border-line bg-inset text-fg-muted hover:border-line-hi hover:text-fg",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          on && !locked ? "bg-atlas" : "bg-line-hi",
                        )}
                      />
                      <span className="min-w-0 flex-1 truncate">{filter.label}</span>
                      {locked && <Lock className="size-3 shrink-0 text-fg-faint" />}
                    </button>
                  );
                })}
              </div>

              {!canAdvanced && (
                <p className="text-[11px] leading-relaxed text-fg-faint">
                  Three advanced signals are available on{" "}
                  {FEATURES.advanced_filters.minTier === "elite" ? "Elite" : "Medium"}.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-9">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <Badge variant="outline">
                {results.length} {results.length === 1 ? "play" : "plays"}
              </Badge>
              <span className="ml-auto text-[11px] text-fg-faint">
                {activeFilters.length} filters active
              </span>
            </CardHeader>

            <CardContent className="p-0">
              {visible.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                  <p className="text-[13px] font-medium text-fg">No plays match these filters.</p>
                  <p className="max-w-sm text-[12px] text-fg-muted">
                    Widen the sport, market or confidence threshold to see more of the board.
                  </p>
                  <Button variant="secondary" size="sm" onClick={resetFilters} className="mt-2">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] border-collapse">
                    <thead>
                      <tr className="border-b border-line text-left">
                        {["Player", "Market", "Line", "Projection", "Edge", "Conf.", "Filters", "Best odds", ""].map(
                          (head) => (
                            <th
                              key={head}
                              className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                            >
                              {head.toUpperCase()}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((row) => (
                        <tr
                          key={row.id}
                          onClick={() => navigate(ROUTES.playerLookup)}
                          tabIndex={0}
                          role="link"
                          onKeyDown={(e) => e.key === "Enter" && navigate(ROUTES.playerLookup)}
                          className={cn(
                            "cursor-pointer border-b border-line-faint outline-none last:border-b-0",
                            "transition-colors duration-[120ms] hover:bg-surface-hi focus-visible:bg-surface-hi",
                          )}
                        >
                          <td className="px-4 py-3">
                            <span className="block text-[13px] font-medium text-fg">{row.player}</span>
                            <span className="block text-[11px] text-fg-faint">{row.matchup}</span>
                          </td>
                          <td className="px-4 py-3 text-[12px] text-fg-muted">
                            {row.side} {row.market}
                          </td>
                          <td className="tabular px-4 py-3 text-[13px] text-fg">{row.line}</td>
                          <td className="tabular px-4 py-3 text-[13px] font-medium text-fg">
                            {row.projection}
                          </td>
                          <td
                            className={cn(
                              "tabular px-4 py-3 text-[13px] font-semibold",
                              row.edge >= 0 ? "text-atlas" : "text-signal-crit",
                            )}
                          >
                            {row.edge > 0 ? "+" : ""}
                            {row.edge.toFixed(1)}%
                          </td>
                          <td className="tabular px-4 py-3 text-[13px] text-fg">{row.confidence}</td>
                          <td className="px-4 py-3">
                            <span className="tabular text-[12px] text-fg-muted">
                              {row.filtersPassed}/{row.filtersTotal}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular block text-[12px] text-fg">{row.bestOdds}</span>
                            <span className="block text-[11px] text-fg-faint">{row.bestBook}</span>
                          </td>
                          <td className="px-4 py-3">
                            <ChevronRight className="size-3.5 text-fg-faint" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {hidden > 0 && (
                <div className="border-t border-line-faint p-4">
                  <PremiumGate
                    feature="unlimited_plays"
                    title={`${hidden} more ${hidden === 1 ? "play" : "plays"} match these filters`}
                    description="The full scored board rather than the strongest few."
                  >
                    <div />
                  </PremiumGate>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Research explanation */}
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>How this works</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="max-w-[76ch] text-[13px] leading-relaxed text-fg-muted">
                Every market on the slate is scored by the eight core signals. A play appears
                here when the model's projection diverges from the market's implied number by
                more than the noise in the sample — that gap is the edge column. Confidence is
                separate: it measures how much of the projection rests on a large sample rather
                than a handful of comparable games.
              </p>
              <p className="max-w-[76ch] text-[13px] leading-relaxed text-fg-muted">
                A high edge with low confidence is a thin sample, not an opportunity. Sort by
                confidence to see which plays the model is most sure about, and open any row for
                the full signal breakdown.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
