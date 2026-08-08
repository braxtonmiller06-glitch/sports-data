import { useState } from "react";
import { Check, CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FilterStatus } from "@/data/dashboardFixtures";
import type { OpportunitySignal } from "@/data/filterPlaysFixtures";

/**
 * Status is carried by an icon and a text label as well as a colour, so the
 * verdict survives greyscale, low vision and colour blindness. Colour is the
 * third channel here, never the only one.
 */
export const SIGNAL_STATUS: Record<
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
 * A compact eight-signal strip — the at-a-glance version, used inside a dense
 * row where the full reasoning panel would not fit.
 */
export function SignalStrip({
  signals,
  className,
}: {
  signals: OpportunitySignal[];
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-1", className)}>
      {signals.map((signal) => {
        const status = SIGNAL_STATUS[signal.status];
        const Icon = status.icon;
        return (
          <li key={signal.id}>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px]",
                status.chip,
              )}
              // The visible text is an abbreviation, so the full verdict is
              // spelled out for assistive technology.
              title={`${signal.name}: ${status.label}`}
            >
              <Icon aria-hidden="true" className={cn("size-2.5", status.text)} />
              <span className="sr-only">
                {signal.name}: {status.label}.{" "}
              </span>
              <span aria-hidden="true" className="text-fg-muted">
                {signal.name}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * The full reasoning layer for one opportunity.
 *
 * Never tier-gated, by the same product rule the dashboard follows: the
 * reasoning is what Atlas is for, and research that hides why it reached a
 * conclusion is just a tout. Free users get this in full.
 */
export function SignalBreakdown({ signals }: { signals: OpportunitySignal[] }) {
  const [selectedId, setSelectedId] = useState<string>(signals[0]?.id ?? "");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activeId = hoveredId ?? selectedId;
  const active = signals.find((s) => s.id === activeId) ?? signals[0];

  if (!active) {
    return (
      <p className="text-[12px] text-fg-muted">
        Every signal has been switched off, so there is no reasoning left to show.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <h4 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          WHY THIS IS ON THE BOARD
        </h4>
        <span className="text-[11px] text-fg-faint">
          Select a signal for the reasoning behind it
        </span>
      </div>

      <ul className="flex flex-wrap gap-2">
        {signals.map((signal) => {
          const status = SIGNAL_STATUS[signal.status];
          const Icon = status.icon;
          const isActive = signal.id === activeId;

          return (
            <li key={signal.id}>
              <button
                type="button"
                aria-pressed={signal.id === selectedId}
                onClick={() => setSelectedId(signal.id)}
                onMouseEnter={() => setHoveredId(signal.id)}
                onMouseLeave={() => setHoveredId(null)}
                onFocus={() => setHoveredId(signal.id)}
                onBlur={() => setHoveredId(null)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5",
                  "text-[12px] font-medium text-fg outline-none",
                  "transition-colors duration-[120ms] focus-visible:ring-1 focus-visible:ring-atlas/60",
                  status.chip,
                  isActive && "ring-1 ring-line-hi",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-3.5", status.text)} />
                {signal.name}
                <span className={cn("ml-0.5 text-[9px] tracking-wide", status.text)}>
                  {status.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div aria-live="polite" className="rounded-lg border border-line bg-inset p-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden="true"
            className={cn("size-1.5 rounded-full", SIGNAL_STATUS[active.status].dot)}
          />
          <span className="text-[12px] font-medium text-fg">{active.name}</span>
          <span
            className={cn(
              "text-[10px] font-medium tracking-wide",
              SIGNAL_STATUS[active.status].text,
            )}
          >
            {SIGNAL_STATUS[active.status].label}
          </span>
          <span className="text-[11px] text-fg-faint">· {active.headline}</span>
        </div>
        <p className="mt-2 max-w-[70ch] text-[12.5px] leading-relaxed text-fg-muted">
          {active.explanation}
        </p>
      </div>
    </div>
  );
}
