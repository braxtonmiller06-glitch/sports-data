import { Activity, ArrowLeftRight, Brain, TrendingUp, UserX } from "lucide-react";
import { LivePulse } from "@/components/ui/live-pulse";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WidgetCard } from "./WidgetCard";
import { cn } from "@/lib/utils";
import { activityFixture, type ActivityKind } from "@/data/dashboardFixtures";

const KIND: Record<ActivityKind, { icon: typeof Activity; tone: string }> = {
  line: { icon: ArrowLeftRight, tone: "text-fg-muted" },
  sharp: { icon: TrendingUp, tone: "text-atlas" },
  injury: { icon: UserX, tone: "text-signal-crit" },
  model: { icon: Brain, tone: "text-atlas" },
  steam: { icon: Activity, tone: "text-signal-warn" },
};

/** Everything that has changed today, newest first. Each row opens the detail. */
export function LiveActivityFeed({ className }: { className?: string }) {
  return (
    <WidgetCard
      title="Live Activity"
      className={className}
      action={<LivePulse tone="live" label="Streaming" />}
      contentClassName="flex min-h-0 flex-col p-0"
      interactive={false}
    >
      {/* min-h-0 + h-full so the feed fills whatever height the row settles at,
          instead of leaving dead space under a fixed-height box. */}
      <ScrollArea className="h-full min-h-[320px]">
        <ul className="flex flex-col">
          {activityFixture.map((event) => {
            const { icon: Icon, tone } = KIND[event.kind];
            return (
              <li key={event.id}>
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-line-faint px-5 py-3 text-left",
                    "outline-none transition-colors duration-[120ms] hover:bg-surface-hi",
                  )}
                >
                  <span className="tabular w-10 shrink-0 pt-0.5 font-mono text-[11px] text-fg-faint">
                    {event.time}
                  </span>
                  <Icon className={cn("mt-0.5 size-3.5 shrink-0", tone)} />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-[13px] font-medium text-fg">{event.title}</span>
                    <span className="truncate text-[11px] text-fg-faint">{event.detail}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </ScrollArea>
    </WidgetCard>
  );
}
