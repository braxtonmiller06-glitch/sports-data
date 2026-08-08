import { Fragment, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SignalStrip } from "./SignalBreakdown";
import { OpportunityDetail } from "./OpportunityDetail";
import { OpportunityActions } from "./OpportunityActions";
import { cn } from "@/lib/utils";
import type { ScoredOpportunity } from "@/lib/filter-plays";

const COLUMNS = [
  "Player",
  "Team",
  "Market",
  "Line",
  "Projection",
  "Edge",
  "Confidence",
  "Filters",
  "Best odds",
  "Action",
];

/**
 * Edge, carried by a glyph and a sign as well as a colour so the direction
 * reads without relying on hue.
 */
function EdgeCell({ edge }: { edge: number }) {
  const positive = edge >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[14px] font-semibold",
        positive ? "text-atlas" : "text-signal-crit",
      )}
    >
      <Icon aria-hidden="true" className="size-3.5" />
      <span className="tabular">
        {positive ? "+" : "−"}
        {Math.abs(edge).toFixed(1)}%
      </span>
    </span>
  );
}

/** Confidence as a number plus a meter, so magnitude is visible at a glance. */
function ConfidenceCell({ confidence }: { confidence: number }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="tabular text-[14px] font-semibold text-fg">{confidence}%</span>
      <span
        aria-hidden="true"
        className="h-1 w-14 overflow-hidden rounded-full bg-line"
      >
        <span
          className="block h-full rounded-full bg-atlas"
          style={{ width: `${confidence}%` }}
        />
      </span>
    </span>
  );
}

function SideBadge({ side }: { side: "Over" | "Under" }) {
  const Icon = side === "Over" ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-medium",
        side === "Over" ? "text-atlas" : "text-signal-warn",
      )}
    >
      <Icon aria-hidden="true" className="size-3" />
      {side.toUpperCase()}
    </span>
  );
}

/** Shared expand control, so the table and the cards behave identically. */
function SignalsToggle({
  row,
  expanded,
  onToggle,
  className,
}: {
  row: ScoredOpportunity;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={expanded}
      aria-label={`${expanded ? "Hide" : "View"} signals for ${row.player} ${row.marketLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-line bg-inset px-2 py-1",
        "text-[12px] outline-none transition-colors duration-[120ms]",
        "hover:border-line-hi hover:bg-surface-hi focus-visible:ring-1 focus-visible:ring-atlas/60",
        className,
      )}
    >
      <span className="tabular font-medium text-fg">
        {row.filtersPassed}/{row.filtersTotal}
      </span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-3 text-fg-faint transition-transform duration-[120ms]",
          expanded && "rotate-180",
        )}
      />
    </button>
  );
}

/**
 * The board.
 *
 * One dense table above `lg`, stacked research cards below it — the same rows
 * and the same actions, laid out for the width available. The card layout is a
 * genuine reflow rather than a scrolled table, so nothing overflows the page on
 * a narrow screen.
 */
export function ResultsBoard({ results }: { results: ScoredOpportunity[] }) {
  const [expanded, setExpanded] = useState<string[]>([]);

  const isExpanded = (id: string) => expanded.includes(id);
  const toggle = (id: string) =>
    setExpanded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <>
      {/* Desktop: dense research table */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1080px] border-collapse">
          <caption className="sr-only">
            Research opportunities matching the current criteria
          </caption>
          <thead>
            <tr className="border-b border-line text-left">
              {COLUMNS.map((head) => (
                <th
                  key={head}
                  scope="col"
                  className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                >
                  {head.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <Fragment key={row.id}>
                <tr
                  className={cn(
                    "border-b border-line-faint transition-colors duration-[120ms]",
                    "hover:bg-surface-hi",
                    isExpanded(row.id) && "bg-surface-hi",
                  )}
                >
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="block text-[13px] font-medium text-fg">{row.player}</span>
                    <span className="block text-[11px] text-fg-faint">{row.matchup}</span>
                  </th>
                  <td className="px-4 py-3">
                    <Badge variant="neutral" size="sm">
                      {row.team}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-[12.5px] text-fg">{row.marketLabel}</span>
                    <SideBadge side={row.side} />
                  </td>
                  <td className="tabular px-4 py-3 text-[13px] text-fg">{row.line.toFixed(1)}</td>
                  <td className="tabular px-4 py-3 text-[14px] font-semibold text-fg">
                    {row.projection.toFixed(1)}
                  </td>
                  <td className="px-4 py-3">
                    <EdgeCell edge={row.edge} />
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceCell confidence={row.confidence} />
                  </td>
                  <td className="px-4 py-3">
                    <SignalsToggle
                      row={row}
                      expanded={isExpanded(row.id)}
                      onToggle={() => toggle(row.id)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span className="tabular block text-[13px] font-medium text-fg">
                      {row.bestOdds}
                    </span>
                    <span className="block text-[11px] text-fg-faint">{row.bestBook}</span>
                  </td>
                  <td className="px-4 py-3">
                    <OpportunityActions row={row} compact className="flex-nowrap" />
                  </td>
                </tr>

                {isExpanded(row.id) && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-0">
                      <OpportunityDetail row={row} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile and tablet: stacked research cards */}
      <ul className="flex flex-col gap-3 p-3 lg:hidden">
        {results.map((row) => (
          <li
            key={row.id}
            className="overflow-hidden rounded-xl border border-line bg-inset"
          >
            <div className="flex flex-col gap-3 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-fg">{row.player}</p>
                  <p className="truncate text-[11.5px] text-fg-faint">
                    {row.team} · {row.marketLabel} · {row.matchup}
                  </p>
                </div>
                <span className="shrink-0 rounded-md border border-line bg-surface px-2 py-1 text-[11px] text-fg-muted">
                  Score{" "}
                  <span className="tabular font-medium text-fg">{row.opportunityScore}</span>
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                <SideBadge side={row.side} />
                <span className="tabular text-[15px] font-semibold text-fg">
                  {row.line.toFixed(1)}
                </span>
                <span className="ml-auto tabular text-[13px] text-fg-muted">
                  {row.bestOdds}
                  <span className="ml-1.5 text-[11px] text-fg-faint">{row.bestBook}</span>
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] tracking-wide text-fg-faint">PROJECTION</dt>
                  <dd className="tabular text-[14px] font-semibold text-fg">
                    {row.projection.toFixed(1)}
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] tracking-wide text-fg-faint">EDGE</dt>
                  <dd>
                    <EdgeCell edge={row.edge} />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] tracking-wide text-fg-faint">CONFIDENCE</dt>
                  <dd>
                    <ConfidenceCell confidence={row.confidence} />
                  </dd>
                </div>
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[10px] tracking-wide text-fg-faint">FILTERS</dt>
                  <dd>
                    <SignalsToggle
                      row={row}
                      expanded={isExpanded(row.id)}
                      onToggle={() => toggle(row.id)}
                    />
                  </dd>
                </div>
              </dl>

              <SignalStrip signals={row.activeSignals} />

              <OpportunityActions row={row} />
            </div>

            {isExpanded(row.id) && <OpportunityDetail row={row} />}
          </li>
        ))}
      </ul>
    </>
  );
}
