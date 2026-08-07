import { useState } from "react";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterStatus, PlayFilter } from "@/data/dashboardFixtures";

const STATUS: Record<
  FilterStatus,
  { label: string; icon: typeof Check; chip: string; text: string; dot: string }
> = {
  pass: {
    label: "PASS",
    icon: Check,
    chip: "border-atlas/25 bg-atlas/8 hover:border-atlas/50 hover:bg-atlas/12",
    text: "text-atlas",
    dot: "bg-atlas",
  },
  warn: {
    label: "WARN",
    icon: TriangleAlert,
    chip: "border-signal-warn/30 bg-signal-warn/10 hover:border-signal-warn/55",
    text: "text-signal-warn",
    dot: "bg-signal-warn",
  },
  fail: {
    label: "FAIL",
    icon: CircleAlert,
    chip: "border-signal-crit/30 bg-signal-crit/10 hover:border-signal-crit/55",
    text: "text-signal-crit",
    dot: "bg-signal-crit",
  },
};

/**
 * The eight core signals behind a play.
 *
 * Never tier-gated, by product rule: the reasoning is the thing Atlas is for,
 * and a research tool that hides why it reached a conclusion is just a tout.
 *
 * Each chip owns its own selection state and reveals a full explanation on
 * hover, focus, or click. The panel below is a real region rather than a
 * tooltip so the reasoning is reachable by keyboard and on touch, where hover
 * does not exist.
 */
export function ResearchFilters({
  filters,
  className,
}: {
  filters: PlayFilter[];
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState<string>(filters[0]?.id ?? "");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeId = hoveredId ?? selectedId;
  const active = filters.find((f) => f.id === activeId) ?? filters[0];

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          WHY WE LIKE IT
        </h4>
        <span className="text-[11px] text-fg-faint">
          Select a signal for the reasoning behind it
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {filters.map((filter) => {
          const status = STATUS[filter.status];
          const Icon = status.icon;
          const isActive = filter.id === activeId;

          return (
            <li key={filter.id}>
              <button
                type="button"
                aria-pressed={filter.id === selectedId}
                onClick={() => setSelectedId(filter.id)}
                onMouseEnter={() => setHoveredId(filter.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(filter.id)}
                onBlur={() => setHoveredId(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                  "text-[12px] font-medium text-fg outline-none",
                  "transition-colors duration-[120ms]",
                  status.chip,
                  isActive && "ring-1 ring-line-hi",
                )}
              >
                <Icon className={cn("size-3.5", status.text)} />
                {filter.name}
                <span className={cn("ml-0.5 text-[9px] tracking-wide", status.text)}>
                  {status.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {active && (
        <div
          // Announced on change so keyboard and screen-reader users get the
          // explanation without having to hunt for where it appeared.
          aria-live="polite"
          className="rounded-lg border border-line bg-inset p-3.5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-1.5 rounded-full", STATUS[active.status].dot)}
            />
            <span className="text-[12px] font-medium text-fg">{active.name}</span>
            <span className={cn("text-[10px] font-medium tracking-wide", STATUS[active.status].text)}>
              {STATUS[active.status].label}
            </span>
            <span className="text-[11px] text-fg-faint">· {active.headline}</span>
          </div>
          <p className="mt-2 max-w-[70ch] text-[12.5px] leading-relaxed text-fg-muted">
            {active.explanation}
          </p>
        </div>
      )}
    </div>
  );
}
