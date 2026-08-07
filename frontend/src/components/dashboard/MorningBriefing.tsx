import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WidgetCard } from "./WidgetCard";
import { briefingFixture } from "@/data/dashboardFixtures";
import { ROUTES } from "@/lib/routes";

/** The written read on the slate. Preview only; the full issue lives at /briefing. */
export function MorningBriefing({ className }: { className?: string }) {
  return (
    <WidgetCard
      title="Morning Briefing"
      className={className}
      action={<Badge variant="outline">{briefingFixture.time}</Badge>}
    >
      <div className="flex h-full flex-col gap-4">
        <p className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
          {briefingFixture.issue.toUpperCase()}
        </p>

        <p className="max-w-[62ch] text-[15px] leading-relaxed text-fg">{briefingFixture.lede}</p>

        <p className="max-w-[66ch] text-[13px] leading-relaxed text-fg-muted">
          {briefingFixture.body}
        </p>

        <ul className="flex flex-col gap-2.5">
          {briefingFixture.points.map((point) => (
            <li key={point.tag} className="grid grid-cols-[64px_1fr] gap-3">
              <span className="pt-0.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint">
                {point.tag.toUpperCase()}
              </span>
              <span className="text-[12.5px] leading-relaxed text-fg-muted">{point.text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto pt-1">
          <Button variant="secondary" asChild>
            <Link to={ROUTES.briefing}>
              Read full briefing
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </WidgetCard>
  );
}
