import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { WidgetCard } from "./WidgetCard";
import { slateFixture } from "@/data/dashboardFixtures";
import { ROUTES } from "@/lib/routes";

/** What is on the board today, at a glance. */
export function SlateSummary({ className }: { className?: string }) {
  return (
    <WidgetCard
      title="Today's Slate"
      className={className}
      action={
        <Link
          to={ROUTES.slate}
          className="inline-flex items-center gap-1 rounded-md text-[11px] font-medium text-fg-muted outline-none transition-colors duration-[120ms] hover:text-atlas"
        >
          View slate
          <ChevronRight className="size-3" />
        </Link>
      }
      contentClassName="p-0"
    >
      <dl className="flex flex-col">
        {slateFixture.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 border-b border-line-faint px-5 py-3 last:border-b-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <dt className="text-[13px] font-medium text-fg">{stat.label}</dt>
              <dd className="truncate text-[11px] text-fg-faint">{stat.detail}</dd>
            </div>
            <span className="shrink-0 text-base font-semibold text-fg">{stat.value}</span>
          </div>
        ))}
      </dl>
    </WidgetCard>
  );
}
