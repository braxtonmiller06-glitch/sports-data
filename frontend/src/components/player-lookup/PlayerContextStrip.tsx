import { cn } from "@/lib/utils";
import type { PlayerFixture } from "@/data/playerLookupFixtures";

/** Everything about the next game that shapes a projection, in one row. */
export function PlayerContextStrip({ player }: { player: PlayerFixture }) {
  const g = player.nextGame;

  const cells = [
    { label: "Opponent", value: g.opponent, detail: g.opponentName },
    { label: "Opp pace", value: g.opponentPace.toFixed(1), detail: `${ordinal(g.opponentPaceRank)} fastest` },
    { label: "Opp defense", value: g.opponentDefRating.toFixed(1), detail: `${ordinal(g.opponentDefRank)} rated` },
    { label: "Days rest", value: String(g.daysRest), detail: g.daysRest >= 2 ? "Rested" : "Short rest" },
    { label: "Venue", value: g.homeAway === "home" ? "Home" : "Away", detail: g.homeAway === "home" ? "No travel" : "On the road" },
    { label: "Season minutes", value: player.seasonMinutes.toFixed(1), detail: "Per game" },
    { label: "Usage rate", value: `${player.usageRate.toFixed(1)}%`, detail: "Season" },
  ];

  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 xl:grid-cols-7">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className={cn(
            "flex flex-col gap-1.5 rounded-lg border border-line bg-inset px-3.5 py-3",
          )}
        >
          <dt className="text-[10px] font-medium tracking-wide text-fg-faint">{cell.label}</dt>
          <dd className="text-[15px] font-semibold tracking-tight text-fg">{cell.value}</dd>
          <span className="truncate text-[11px] text-fg-faint">{cell.detail}</span>
        </div>
      ))}
    </dl>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
