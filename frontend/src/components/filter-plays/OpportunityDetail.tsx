import { Gauge } from "lucide-react";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { SignalBreakdown, SIGNAL_STATUS } from "./SignalBreakdown";
import { expectedClv, projectedClose, type ScoredOpportunity } from "@/lib/filter-plays";
import { cn } from "@/lib/utils";

/**
 * Opportunity Score.
 *
 * Deliberately separated from confidence, and labelled so the difference is
 * legible rather than implied: confidence is how sure the model is of the
 * projection, this is how good the opportunity is overall once price, sample
 * and volatility are taken together. A thin edge the model is certain about
 * scores low here; that is the point of having both numbers.
 */
function ScorePanel({ row }: { row: ScoredOpportunity }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-inset p-4">
      <div className="flex items-center gap-2">
        <Gauge aria-hidden="true" className="size-3.5 text-atlas" />
        <h4 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          OPPORTUNITY SCORE
        </h4>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="tabular text-3xl font-semibold tracking-tight text-fg">
          {row.opportunityScore}
        </span>
        <span className="text-[13px] text-fg-faint">/ 100</span>
      </div>

      <p className="text-[11px] leading-relaxed text-fg-muted">
        Overall quality of the research opportunity — price, sample and volatility together.
        Separate from confidence, which only measures the projection.
      </p>

      <dl className="grid grid-cols-2 gap-2">
        {[
          { label: "Edge", value: `${row.edge > 0 ? "+" : ""}${row.edge.toFixed(1)}%` },
          { label: "Confidence", value: `${row.confidence}%` },
          { label: "Filters", value: `${row.filtersPassed}/${row.filtersTotal}` },
          { label: "Volatility", value: row.volatility },
        ].map((factor) => (
          <div
            key={factor.label}
            className="flex flex-col gap-0.5 rounded-md border border-line bg-surface px-2.5 py-2"
          >
            <dt className="text-[10px] tracking-wide text-fg-faint">{factor.label}</dt>
            <dd className="tabular text-[13px] font-medium text-fg">{factor.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Elite surface: how the edge is built, and where the risk is concentrated. */
function AdvancedResearch({ row }: { row: ScoredOpportunity }) {
  const gap = row.projection - row.line;
  const clv = expectedClv(row);
  const risks = row.activeSignals.filter((signal) => signal.status !== "pass");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h5 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          EDGE DECOMPOSITION
        </h5>
        <dl className="flex flex-col gap-px overflow-hidden rounded-lg border border-line">
          {[
            { label: "Market line", value: row.line.toFixed(1) },
            { label: "Atlas projection", value: row.projection.toFixed(1) },
            {
              label: "Gap",
              value: `${gap > 0 ? "+" : ""}${gap.toFixed(1)}`,
              accent: true,
            },
            { label: "Implied edge", value: `${row.edge > 0 ? "+" : ""}${row.edge.toFixed(1)}%`, accent: true },
            { label: "Entry price", value: row.bestOdds },
            { label: "Projected close", value: projectedClose(row) },
            {
              label: "Expected CLV",
              value: `${clv > 0 ? "+" : ""}${clv.toFixed(1)}%`,
              accent: true,
            },
          ].map((line) => (
            <div
              key={line.label}
              className="flex items-center justify-between gap-3 bg-inset px-3 py-2"
            >
              <dt className="text-[12px] text-fg-muted">{line.label}</dt>
              <dd
                className={cn(
                  "tabular text-[12.5px] font-medium",
                  line.accent ? "text-atlas" : "text-fg",
                )}
              >
                {line.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-[11px] leading-relaxed text-fg-faint">
          Projected close and CLV are modelled from the entry price and the edge. They are
          replaced by the closing-line job's recorded numbers once this reads from the API.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h5 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          RISK CONCENTRATION
        </h5>
        {risks.length === 0 ? (
          <p className="text-[12px] text-fg-muted">
            Every enabled signal passes. There is no single flagged risk carrying this row.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {risks.map((signal) => {
              const status = SIGNAL_STATUS[signal.status];
              const Icon = status.icon;
              return (
                <li
                  key={signal.id}
                  className="flex items-start gap-2 rounded-lg border border-line bg-inset px-3 py-2"
                >
                  <Icon aria-hidden="true" className={cn("mt-0.5 size-3.5 shrink-0", status.text)} />
                  <span className="min-w-0">
                    <span className="text-[12px] font-medium text-fg">{signal.name}</span>
                    <span className={cn("ml-1.5 text-[10px] tracking-wide", status.text)}>
                      {status.label}
                    </span>
                    <span className="block text-[11.5px] leading-relaxed text-fg-muted">
                      {signal.headline}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * The expanded research panel for one opportunity.
 *
 * Free sees the summary, the score and all eight signals with their full
 * reasoning. Elite adds the decomposition. Nothing is ever a blank space — the
 * locked block renders a description of what sits behind it.
 */
export function OpportunityDetail({ row }: { row: ScoredOpportunity }) {
  return (
    <div className="flex flex-col gap-5 border-t border-line-faint bg-canvas/40 p-4 sm:p-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <div className="flex flex-col gap-4">
            <p className="max-w-[78ch] text-[13px] leading-relaxed text-fg-muted">
              {row.summary}
            </p>
            <SignalBreakdown signals={row.activeSignals} />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 xl:col-span-4">
          <ScorePanel row={row} />
          <PremiumGate
            feature="premium_insights"
            title="Edge decomposition and closing line value"
            description="How the edge is built line by line, the projected close, and where the risk on this row is concentrated."
          >
            <AdvancedResearch row={row} />
          </PremiumGate>
        </div>
      </div>
    </div>
  );
}
