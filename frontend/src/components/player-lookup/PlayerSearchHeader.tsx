import { useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LivePulse } from "@/components/ui/live-pulse";
import { cn } from "@/lib/utils";
import { type PlayerFixture } from "@/data/playerLookupFixtures";

interface Props {
  player: PlayerFixture;
  /**
   * The players in scope — the current sport's roster, not every fixture.
   * Searching across all leagues offered results the page would then reject,
   * because selecting one outside the active sport falls back immediately.
   */
  roster: PlayerFixture[];
  onSelect: (id: string) => void;
}

/**
 * Player identity plus the control that changes it.
 *
 * The search filters the fixture roster live and commits on click; the current
 * player stays visible the whole time so switching never leaves the header
 * empty.
 */
export function PlayerSearchHeader({ player, roster, onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.team.toLowerCase().includes(q) ||
        p.teamName.toLowerCase().includes(q) ||
        p.position.toLowerCase().includes(q),
    );
  }, [query, roster]);

  function choose(id: string) {
    onSelect(id);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Search */}
      <div className="relative">
        <div
          className={cn(
            "flex items-center gap-3 rounded-xl border bg-inset px-4",
            "transition-colors duration-[180ms]",
            open ? "border-atlas/50" : "border-line hover:border-line-hi",
          )}
        >
          <Search className="size-4 shrink-0 text-fg-faint" />
          <label htmlFor="player-search" className="sr-only">
            Search for a player
          </label>
          <input
            id="player-search"
            type="text"
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search a player, team or position..."
            className="min-w-0 flex-1 bg-transparent py-3.5 text-[15px] text-fg outline-none placeholder:text-fg-faint"
          />
          {(query || open) && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setOpen(false);
              }}
              aria-label="Close search"
              className="shrink-0 rounded-md p-1 text-fg-faint outline-none transition-colors duration-[120ms] hover:bg-surface-hi hover:text-fg"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {open && (
          <ul
            className={cn(
              "absolute inset-x-0 top-[calc(100%+6px)] z-30 max-h-72 overflow-y-auto",
              "scrollbar-atlas rounded-xl border border-line bg-surface-hi p-1.5 shadow-xl shadow-black/50",
            )}
          >
            {results.length === 0 && (
              <li className="px-3 py-4 text-center text-[12px] text-fg-muted">
                No players match “{query}”.
              </li>
            )}
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => choose(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left",
                    "outline-none transition-colors duration-[120ms] hover:bg-surface-hover focus-visible:bg-surface-hover",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-inset font-mono text-[10px] text-fg-muted">
                    {p.number}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium text-fg">{p.name}</span>
                    <span className="truncate text-[11px] text-fg-faint">
                      {p.team} · {p.position} · {p.league}
                    </span>
                  </span>
                  {p.id === player.id && <Check className="size-3.5 shrink-0 text-atlas" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Identity */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-line bg-surface font-mono text-base font-semibold text-atlas">
            {player.number}
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold tracking-tight text-fg">{player.name}</h2>
            <p className="mt-1 text-[13px] text-fg-muted">
              {player.teamName}
              <span className="mx-2 text-fg-faint">·</span>
              {player.position}
              <span className="mx-2 text-fg-faint">·</span>
              <Badge variant="neutral" className="align-middle">
                {player.league}
              </Badge>
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <LivePulse tone="live" label="Next game" />
          <span className="text-[13px] font-medium text-fg">
            {player.nextGame.homeAway === "home" ? "vs" : "at"} {player.nextGame.opponentName}
          </span>
          <span className="text-[11px] text-fg-faint">
            {player.nextGame.tipoff} · {player.nextGame.daysRest} days rest
          </span>
        </div>
      </div>
    </div>
  );
}
