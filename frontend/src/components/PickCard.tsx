import { useState } from "react";
import type { FilterOutput, Pick } from "../types/pick";
import { usePickFilters } from "../hooks/usePickFilters";
import { VerdictBadge } from "./VerdictBadge";

const SIGNAL_COLOR: Record<FilterOutput["signal"], string> = {
  STRONG_OVER: "text-edge-400",
  LEAN_OVER: "text-edge-300",
  NEUTRAL: "text-ink-400",
  LEAN_UNDER: "text-danger-500",
  STRONG_UNDER: "text-danger-500",
};

function StrengthBar({ strength }: { strength: number }) {
  const pct = Math.round(Math.abs(strength) * 100);
  const positive = strength >= 0;
  return (
    <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-ink-700">
      <div
        className={`h-full ${positive ? "bg-edge-500" : "bg-danger-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function FilterRow({ filter }: { filter: FilterOutput }) {
  return (
    <div className="border-t border-ink-800 py-3 first:border-t-0">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-ink-100">{filter.name}</span>
        <div className="flex items-center gap-2">
          <StrengthBar strength={filter.strength} />
          <span className={`w-24 text-right text-xs font-semibold ${SIGNAL_COLOR[filter.signal]}`}>
            {filter.signal.replace("_", " ")}
          </span>
          <span className="w-14 text-right text-xs text-ink-400">{filter.confidence}% conf</span>
        </div>
      </div>
      {filter.evidence.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-ink-400">
          {filter.evidence.map((e) => (
            <li key={e}>— {e}</li>
          ))}
        </ul>
      )}
      {filter.red_flags.length > 0 && (
        <ul className="mt-1.5 space-y-0.5 text-xs text-warn-500">
          {filter.red_flags.map((f) => (
            <li key={f}>⚠ {f}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PickCard({ pick, locked = false }: { pick: Pick; locked?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const edgePct = (pick.edge * 100).toFixed(1);

  // A breakdown carried on the pick itself (the illustrative sample) renders
  // without a round trip. Anything from the database has to come through the
  // RPC, and only once the user actually opens the section -- fetching a
  // breakdown per card on mount would be one request per row of the dashboard.
  const inlineFilters = pick.filters;
  const remote = usePickFilters(
    expanded && !locked && inlineFilters === undefined ? pick.id : null,
  );
  const filters = inlineFilters ?? remote.filters;

  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-900 shadow-xl shadow-black/20">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            <span className="rounded bg-ink-800 px-1.5 py-0.5">{pick.sport}</span>
            <span>{pick.market_type.replace(/_/g, " ")}</span>
          </div>
          <div className="mt-1 text-lg font-bold text-ink-50">
            {pick.subject} {pick.side} {pick.line ?? ""}
          </div>
          <div className="mt-0.5 text-sm text-ink-400">
            Model {(pick.model_probability * 100).toFixed(0)}% vs Market {(pick.market_probability * 100).toFixed(0)}%
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-extrabold text-edge-400">+{edgePct}%</div>
            <div className="text-xs text-ink-400">edge</div>
          </div>
          <VerdictBadge verdict={pick.verdict} />
        </div>
      </div>

      {locked ? (
        <div className="flex items-center justify-between border-t border-ink-800 px-5 py-3 text-sm">
          <span className="flex items-center gap-1.5 text-ink-500">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="5" y="11" width="14" height="9" rx="1.5" />
              <path d="M8 11V8a4 4 0 118 0v3" />
            </svg>
            Filter breakdown locked
          </span>
          <a href="/#pricing" className="font-semibold text-edge-400 hover:underline">
            Upgrade to see it
          </a>
        </div>
      ) : (
        <>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center justify-between border-t border-ink-800 px-5 py-3 text-sm font-medium text-ink-300 hover:text-ink-50"
          >
            <span>
              {/* The count is unknown until the breakdown is fetched, so the
                  closed state names the section rather than quoting a number
                  the client has not been given. */}
              {filters ? `${filters.length} filters fired` : "Filter breakdown"} ·{" "}
              {expanded ? "Hide" : "Show"}
            </span>
            <svg
              viewBox="0 0 24 24"
              className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {expanded && (
            <div className="px-5 pb-5">
              {remote.loading ? (
                <p className="py-3 text-sm text-ink-500">Loading breakdown…</p>
              ) : remote.forbidden ? (
                <p className="py-3 text-sm text-ink-500">
                  The filter breakdown is part of a paid plan.{" "}
                  <a href="/#pricing" className="font-semibold text-edge-400 hover:underline">
                    See plans
                  </a>
                </p>
              ) : remote.error ? (
                <p className="py-3 text-sm text-danger-500">
                  Couldn't load the breakdown: {remote.error}
                </p>
              ) : !filters || filters.length === 0 ? (
                <p className="py-3 text-sm text-ink-500">Breakdown not available for this pick yet.</p>
              ) : (
                filters.map((f) => <FilterRow key={f.filter_id} filter={f} />)
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
