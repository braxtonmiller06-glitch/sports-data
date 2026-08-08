import {
  SIGNAL_IDS,
  type AtlasSignalId,
  type Opportunity,
  type OpportunitySignal,
} from "@/data/filterPlaysFixtures";
import type { SportId } from "./sports";

/**
 * The Filter Plays engine.
 *
 * Pure functions over an `Opportunity[]`, with no React and no fixture import
 * of its own — the board is passed in. That is what lets the FastAPI response
 * replace `OPPORTUNITIES` without touching either this file or the UI, and it
 * is why the filtering is testable on its own terms.
 *
 * The pipeline runs in a fixed order: sport → date → market → edge →
 * confidence → filters passed → individual signals → sort.
 */

/* ------------------------------------------------------------- criteria -- */

export type DateRange = "today" | "tomorrow" | "next3";
export type EdgeThreshold = "any" | "5" | "10" | "15" | "20";
export type ConfidenceThreshold = "any" | "80" | "85" | "90" | "95";
export type FiltersPassedThreshold = "any" | "5" | "6" | "7" | "8";
export type SortKey = "edge" | "confidence" | "filters" | "odds";
export type SignalRequirement = "any" | "pass" | "warn" | "fail";

export interface SignalCriterion {
  /**
   * A disabled signal is dropped from scoring entirely — it stops counting
   * toward `filtersPassed` and its requirement is ignored. Turning one off
   * genuinely re-scores the board rather than just hiding a column.
   */
  enabled: boolean;
  require: SignalRequirement;
}

export interface FilterPlaysCriteria {
  date: DateRange;
  market: string;
  minEdge: EdgeThreshold;
  minConfidence: ConfidenceThreshold;
  minFiltersPassed: FiltersPassedThreshold;
  sort: SortKey;
  signals: Record<AtlasSignalId, SignalCriterion>;
}

export const DEFAULT_SIGNAL_CRITERIA: Record<AtlasSignalId, SignalCriterion> = Object.fromEntries(
  SIGNAL_IDS.map((id) => [id, { enabled: true, require: "any" as SignalRequirement }]),
) as Record<AtlasSignalId, SignalCriterion>;

/** The workspace's default state, and what Reset Filters returns to. */
export const DEFAULT_CRITERIA: FilterPlaysCriteria = {
  date: "today",
  market: "all",
  minEdge: "any",
  minConfidence: "any",
  minFiltersPassed: "any",
  sort: "edge",
  signals: DEFAULT_SIGNAL_CRITERIA,
};

/* ---------------------------------------------------------------- options -- */

export const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "next3", label: "Next 3 days" },
];

export const EDGE_OPTIONS: { value: EdgeThreshold; label: string }[] = [
  { value: "any", label: "Any edge" },
  { value: "5", label: "5%+" },
  { value: "10", label: "10%+" },
  { value: "15", label: "15%+" },
  { value: "20", label: "20%+" },
];

export const CONFIDENCE_OPTIONS: { value: ConfidenceThreshold; label: string }[] = [
  { value: "any", label: "Any confidence" },
  { value: "80", label: "80%+" },
  { value: "85", label: "85%+" },
  { value: "90", label: "90%+" },
  { value: "95", label: "95%+" },
];

export const FILTERS_PASSED_OPTIONS: { value: FiltersPassedThreshold; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "5", label: "5/8+" },
  { value: "6", label: "6/8+" },
  { value: "7", label: "7/8+" },
  { value: "8", label: "8/8" },
];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "edge", label: "Edge" },
  { value: "confidence", label: "Confidence" },
  { value: "filters", label: "Filters passed" },
  { value: "odds", label: "Best odds" },
];

export const SIGNAL_REQUIREMENT_OPTIONS: { value: SignalRequirement; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "pass", label: "Pass" },
  { value: "warn", label: "Warn" },
  { value: "fail", label: "Fail" },
];

/* ----------------------------------------------------------------- scoring -- */

export interface ScoredOpportunity extends Opportunity {
  /** Signals still switched on, in display order. */
  activeSignals: OpportunitySignal[];
  /** Passing signals among those switched on. */
  filtersPassed: number;
  /** How many signals are switched on — the denominator shown in the UI. */
  filtersTotal: number;
}

/**
 * Re-scores one opportunity against the currently enabled signals.
 *
 * `filtersPassed` is derived here rather than stored on the fixture, so the
 * count can never drift from the verdicts it claims to summarise.
 */
export function scoreOpportunity(
  opportunity: Opportunity,
  signals: Record<AtlasSignalId, SignalCriterion>,
): ScoredOpportunity {
  const activeSignals = opportunity.signals.filter((signal) => signals[signal.id]?.enabled !== false);
  return {
    ...opportunity,
    activeSignals,
    filtersPassed: activeSignals.filter((signal) => signal.status === "pass").length,
    filtersTotal: activeSignals.length,
  };
}

/**
 * American odds as a decimal payout, so "+104" and "-108" are comparable.
 * Higher is a better price for the bettor.
 */
export function oddsToDecimal(odds: string): number {
  const value = Number(odds);
  if (!Number.isFinite(value) || value === 0) return 1;
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value);
}

/** Decimal payout back to an American price. */
function impliedToAmerican(probability: number): string {
  const p = Math.min(0.98, Math.max(0.02, probability));
  const value = p >= 0.5 ? -((100 * p) / (1 - p)) : (100 * (1 - p)) / p;
  return `${value > 0 ? "+" : ""}${Math.round(value)}`;
}

/**
 * Where this price is likely to close.
 *
 * A fixture-grade approximation: the market is assumed to absorb roughly half
 * the modelled edge by close. The real number comes from the closing-line job
 * that already records actual closes — this is a stand-in with the right shape,
 * not a projection anyone should trade on.
 */
export function projectedClose(opportunity: Opportunity): string {
  const implied = 1 / oddsToDecimal(opportunity.bestOdds);
  return impliedToAmerican(implied * (1 + opportunity.edge / 200));
}

/** Expected closing line value, in percentage points against the entry price. */
export function expectedClv(opportunity: Opportunity): number {
  const entry = oddsToDecimal(opportunity.bestOdds);
  const close = oddsToDecimal(projectedClose(opportunity));
  return (entry / close - 1) * 100;
}

/* --------------------------------------------------------------- pipeline -- */

function withinDateRange(opportunity: Opportunity, range: DateRange): boolean {
  if (range === "today") return opportunity.dayOffset === 0;
  if (range === "tomorrow") return opportunity.dayOffset === 1;
  return opportunity.dayOffset <= 2;
}

function meetsFiltersPassed(
  scored: ScoredOpportunity,
  threshold: FiltersPassedThreshold,
): boolean {
  if (threshold === "any") return true;
  if (scored.filtersTotal === 0) return false;
  // Expressed as a ratio so the threshold still means something when the user
  // has switched signals off — "7/8+" on a six-signal board asks for the same
  // proportion, not an impossible seven out of six.
  return scored.filtersPassed / scored.filtersTotal >= Number(threshold) / SIGNAL_IDS.length;
}

function comparator(sort: SortKey) {
  return (a: ScoredOpportunity, b: ScoredOpportunity): number => {
    switch (sort) {
      case "confidence":
        return b.confidence - a.confidence || b.edge - a.edge;
      case "filters":
        return (
          b.filtersPassed - a.filtersPassed ||
          b.opportunityScore - a.opportunityScore ||
          b.edge - a.edge
        );
      case "odds":
        return oddsToDecimal(b.bestOdds) - oddsToDecimal(a.bestOdds) || b.edge - a.edge;
      default:
        return b.edge - a.edge || b.confidence - a.confidence;
    }
  };
}

export interface FilterPlaysResult {
  /** Rows surviving every criterion, sorted. */
  results: ScoredOpportunity[];
  /**
   * The slate the results were drawn from — everything for this sport and date
   * before the research criteria narrowed it. This is the Y in "showing X of Y".
   */
  total: number;
}

/**
 * Runs the full pipeline. Sport comes from the global scope rather than the
 * criteria object, because it is owned by SportProvider and not by this tool.
 */
export function filterPlays(
  board: Opportunity[],
  sport: SportId,
  criteria: FilterPlaysCriteria,
): FilterPlaysResult {
  // 1–2. Sport, then date. Together these define the slate under inspection.
  const slate = board.filter(
    (row) => row.sport === sport && withinDateRange(row, criteria.date),
  );

  const results = slate
    // 3. Market.
    .filter((row) => criteria.market === "all" || row.market === criteria.market)
    // 4. Edge.
    .filter((row) => criteria.minEdge === "any" || row.edge >= Number(criteria.minEdge))
    // 5. Confidence.
    .filter(
      (row) => criteria.minConfidence === "any" || row.confidence >= Number(criteria.minConfidence),
    )
    // 6–7. Re-score against enabled signals, then apply the pass threshold.
    .map((row) => scoreOpportunity(row, criteria.signals))
    .filter((row) => meetsFiltersPassed(row, criteria.minFiltersPassed))
    // 8. Individual signal requirements.
    .filter((row) =>
      row.activeSignals.every((signal) => {
        const requirement = criteria.signals[signal.id]?.require ?? "any";
        return requirement === "any" || signal.status === requirement;
      }),
    )
    // 9. Sort.
    .sort(comparator(criteria.sort));

  return { results, total: slate.length };
}

/**
 * Whether anything beyond the slate scope is narrowing the board — drives the
 * choice between "X opportunities found" and "Showing X of Y opportunities".
 */
export function hasActiveCriteria(criteria: FilterPlaysCriteria): boolean {
  if (
    criteria.market !== DEFAULT_CRITERIA.market ||
    criteria.minEdge !== DEFAULT_CRITERIA.minEdge ||
    criteria.minConfidence !== DEFAULT_CRITERIA.minConfidence ||
    criteria.minFiltersPassed !== DEFAULT_CRITERIA.minFiltersPassed
  ) {
    return true;
  }
  return SIGNAL_IDS.some(
    (id) => !criteria.signals[id].enabled || criteria.signals[id].require !== "any",
  );
}

/** How many signal controls are away from their default. Shown on the toggle. */
export function activeSignalCount(criteria: FilterPlaysCriteria): number {
  return SIGNAL_IDS.filter(
    (id) => !criteria.signals[id].enabled || criteria.signals[id].require !== "any",
  ).length;
}
