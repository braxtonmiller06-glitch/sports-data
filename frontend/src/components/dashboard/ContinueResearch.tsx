import { Bookmark, Clock, Star, Users } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import { continueResearchFixture, type ResearchEntry } from "@/data/dashboardFixtures";

const GROUPS: { key: keyof typeof continueResearchFixture; label: string; icon: typeof Clock }[] = [
  { key: "players", label: "Recently viewed players", icon: Users },
  { key: "games", label: "Recently viewed games", icon: Clock },
  { key: "saved", label: "Saved research", icon: Bookmark },
  { key: "favorites", label: "Favorites", icon: Star },
];

function EntryRow({ entry }: { entry: ResearchEntry }) {
  return (
    <button
      type="button"
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
  return (
    <WidgetCard title="Continue Research" className={className} interactive={false}>
      <div className="flex flex-col gap-5">
        {GROUPS.map((group) => {
          const Icon = group.icon;
          const entries = continueResearchFixture[group.key];
          return (
            <section key={group.key} className="flex flex-col gap-1.5">
              <h4 className="flex items-center gap-2 px-2.5 text-[10px] font-medium tracking-[0.14em] text-fg-faint">
                <Icon className="size-3" />
                {group.label.toUpperCase()}
              </h4>
              <div className="flex flex-col">
                {entries.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </WidgetCard>
  );
}
