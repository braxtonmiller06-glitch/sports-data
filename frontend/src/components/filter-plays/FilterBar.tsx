import { useState } from "react";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { ATLAS_SIGNALS, type AtlasSignalId } from "@/data/filterPlaysFixtures";
import {
  CONFIDENCE_OPTIONS,
  EDGE_OPTIONS,
  FILTERS_PASSED_OPTIONS,
  SIGNAL_REQUIREMENT_OPTIONS,
  SORT_OPTIONS,
  type FilterPlaysCriteria,
  type SignalRequirement,
} from "@/lib/filter-plays";
import { cn } from "@/lib/utils";

interface Props {
  criteria: FilterPlaysCriteria;
  onField: <K extends keyof FilterPlaysCriteria>(key: K, value: FilterPlaysCriteria[K]) => void;
  onSignalRequirement: (id: AtlasSignalId, require: SignalRequirement) => void;
  onToggleSignal: (id: AtlasSignalId) => void;
  onReset: () => void;
  signalsChanged: number;
}

/**
 * The research criteria.
 *
 * Four primary controls stay on screen because they are the ones that change
 * every session; the eight per-signal controls sit behind a disclosure so the
 * default view is a board rather than a form.
 */
export function FilterBar({
  criteria,
  onField,
  onSignalRequirement,
  onToggleSignal,
  onReset,
  signalsChanged,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Select
          label="Min edge"
          options={EDGE_OPTIONS}
          value={criteria.minEdge}
          onChange={(e) => onField("minEdge", e.target.value as FilterPlaysCriteria["minEdge"])}
        />
        <Select
          label="Min confidence"
          options={CONFIDENCE_OPTIONS}
          value={criteria.minConfidence}
          onChange={(e) =>
            onField("minConfidence", e.target.value as FilterPlaysCriteria["minConfidence"])
          }
        />
        <Select
          label="Filters passed"
          options={FILTERS_PASSED_OPTIONS}
          value={criteria.minFiltersPassed}
          onChange={(e) =>
            onField(
              "minFiltersPassed",
              e.target.value as FilterPlaysCriteria["minFiltersPassed"],
            )
          }
        />
        <Select
          label="Sort by"
          options={SORT_OPTIONS}
          value={criteria.sort}
          onChange={(e) => onField("sort", e.target.value as FilterPlaysCriteria["sort"])}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="advanced-signal-filters"
          className={cn(
            "inline-flex items-center gap-2 rounded-lg border border-line bg-inset px-3 py-2",
            "text-[12.5px] font-medium text-fg outline-none transition-colors duration-[120ms]",
            "hover:border-line-hi hover:bg-surface-hi focus-visible:ring-1 focus-visible:ring-atlas/60",
          )}
        >
          <SlidersHorizontal aria-hidden="true" className="size-3.5 text-fg-faint" />
          Advanced filters
          {signalsChanged > 0 && (
            <Badge variant="atlas" size="sm">
              {signalsChanged}
            </Badge>
          )}
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-3.5 text-fg-faint transition-transform duration-[120ms]",
              open && "rotate-180",
            )}
          />
        </button>

        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw />
          Reset filters
        </Button>
      </div>

      {open && (
        <div id="advanced-signal-filters">
          <PremiumGate
            feature="expanded_filters"
            title="Filter the board by individual Atlas signals"
            description="Require a pass on the signals you care about, or drop one from scoring entirely and watch the board re-rank around it."
          >
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-inset p-4">
              <p className="max-w-[76ch] text-[11.5px] leading-relaxed text-fg-faint">
                Require a verdict on any signal, or switch one off to remove it from scoring —
                a disabled signal stops counting toward the filters-passed total, so the whole
                board re-ranks.
              </p>

              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {ATLAS_SIGNALS.map((signal) => {
                  const state = criteria.signals[signal.id];
                  return (
                    <li
                      key={signal.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-lg border bg-surface p-3",
                        "transition-colors duration-[120ms]",
                        state.enabled ? "border-line" : "border-line-faint opacity-60",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[12.5px] font-medium text-fg">
                          {signal.label}
                        </span>
                        <button
                          type="button"
                          role="switch"
                          aria-checked={state.enabled}
                          aria-label={`${state.enabled ? "Disable" : "Enable"} the ${signal.label} signal`}
                          onClick={() => onToggleSignal(signal.id)}
                          className={cn(
                            "relative h-4 w-7 shrink-0 rounded-full outline-none",
                            "transition-colors duration-[120ms] focus-visible:ring-1 focus-visible:ring-atlas/60",
                            state.enabled ? "bg-atlas" : "bg-line-hi",
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              "absolute top-0.5 size-3 rounded-full bg-canvas",
                              "transition-transform duration-[120ms]",
                              state.enabled ? "translate-x-3.5" : "translate-x-0.5",
                            )}
                          />
                        </button>
                      </div>

                      <Select
                        aria-label={`${signal.label} verdict required`}
                        options={SIGNAL_REQUIREMENT_OPTIONS}
                        value={state.require}
                        disabled={!state.enabled}
                        onChange={(e) =>
                          onSignalRequirement(signal.id, e.target.value as SignalRequirement)
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            </div>
          </PremiumGate>
        </div>
      )}
    </div>
  );
}
