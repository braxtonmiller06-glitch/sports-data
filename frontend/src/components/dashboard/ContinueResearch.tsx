import { useNavigate } from "react-router-dom";
import { Bookmark, Clock, Star, Users } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { useAccess } from "@/lib/access";
import { ROUTES } from "@/lib/routes";
import { cn } from "@/lib/utils";
import { continueResearchFixture, type ResearchEntry } from "@/data/dashboardFixtures";

const GROUPS: {
  key: keyof typeof continueResearchFixture;
  label: string;
  icon: typeof Clock;
  to: string;
}[] = [
  { key: "players", label: "Recently viewed players", icon: Users, to: ROUTES.playerLookup },
  { key: "games", label: "Recently viewed games", icon: Clock, to: ROUTES.games },
  { key: "saved", label: "Saved research", icon: Bookmark, to: ROUTES.research },
  { key: "favorites", label: "Favorites", icon: Star, to: ROUTES.research },
];

/** Free keeps the most recent session; extended history is a Medium feature. */
const FREE_VISIBLE_PER_GROUP = 2;

function EntryRow({ entry, onOpen }: { entry: ResearchEntry; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left",
        "outline-none transition-colors duration-[120ms] hover:bg-surface-hi",
      )}
    >
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[13px] text-fg">{entry.label}</span>
        <span className="truncate text-[11px] text-fg-faint">{entry.meta}</span>
      </span>
    </button>
  );
}

/** Pick back up where the last session left off. */
export function ContinueResearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { can } = useAccess();

  const fullHistory = can("extended_history");
  const hiddenCount = fullHistory
    ? 0
    : GROUPS.reduce(
        (total, group) =>
          total + Math.max(0, continueResearchFixture[group.key].length - FREE_VISIBLE_PER_GROUP),
        0,
      );

  return (
    <WidgetCard title="Continue Research" className={className} interactive={false}>
      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const all = continueResearchFixture[group.key];
          const entries = fullHistory ? all : all.slice(0, FREE_VISIBLE_PER_GROUP);

          return (
            <section key={group.key} className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-2 px-2.5 text-[10px] font-medium tracking-[0.14em] text-fg-faint">
                <Icon className="size-3" />
                {group.label.toUpperCase()}
              </h4>
              <div className="flex flex-col">
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onOpen={() => navigate(group.to)} />
                ))}
              </div>
            </section>
          );
        })}

        {hiddenCount > 0 && (
          <PremiumGate
            feature="extended_history"
            title={`${hiddenCount} more research sessions`}
            description="Your full research history rather than the most recent few."
          >
            <div />
          </PremiumGate>
        )}
      </div>
    </WidgetCard>
  );
}
