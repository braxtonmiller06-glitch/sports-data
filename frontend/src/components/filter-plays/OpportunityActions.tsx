import { useNavigate } from "react-router-dom";
import { ArrowRight, BookmarkCheck, BookmarkPlus, Check, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildResearchHref } from "@/lib/research-link";
import { useSavedResearch } from "@/lib/saved-research";
import { useTrackedProps } from "@/lib/tracked-props";
import { cn } from "@/lib/utils";
import type { ScoredOpportunity } from "@/lib/filter-plays";

/** ISO date for the slate day this opportunity belongs to. */
function slateDate(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

/** A stable id for one opportunity, shared by both stores so they agree. */
export function opportunityKey(row: ScoredOpportunity): string {
  return `${row.playerId}-${row.market}-${row.side.toLowerCase()}-${row.line}`;
}

/**
 * Track, save and open — the three things a user does with a row.
 *
 * Both stores are the app's existing ones: tracking writes to the same
 * `tracked-props` store the dashboard reads, and saving writes to the shared
 * `saved-research` store rather than a Filter Plays-only list.
 */
export function OpportunityActions({
  row,
  size = "sm",
  compact = false,
  className,
}: {
  row: ScoredOpportunity;
  size?: "sm" | "md";
  /** Icon-only Track and Save, for the dense table's action column. */
  compact?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  const { isTracked, toggle } = useTrackedProps();
  const { isSaved, toggle: toggleSaved } = useSavedResearch();

  const id = opportunityKey(row);
  const tracked = isTracked(id);
  const saved = isSaved(id);
  const href = buildResearchHref(row);
  const marketLabel = `${row.side} ${row.line} ${row.marketLabel}`;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      <Button
        size={compact ? "icon-sm" : size}
        variant={tracked ? "outline" : "secondary"}
        aria-pressed={tracked}
        title={tracked ? "Tracking" : "Track this play"}
        aria-label={
          tracked
            ? `Stop tracking ${row.player} ${marketLabel}`
            : `Track ${row.player} ${marketLabel}`
        }
        onClick={() =>
          toggle({
            id,
            subject: row.player,
            market: marketLabel,
            sport: row.sport,
            line: row.line,
            odds: row.bestOdds,
            date: slateDate(row.dayOffset),
          })
        }
      >
        {tracked ? <BookmarkCheck className="text-atlas" /> : <BookmarkPlus />}
        {compact ? null : tracked ? "Tracking" : "Track"}
      </Button>

      <Button
        size={compact ? "icon-sm" : size}
        variant={saved ? "outline" : "secondary"}
        aria-pressed={saved}
        title={saved ? "Saved to research" : "Save to research"}
        aria-label={
          saved
            ? `Remove ${row.player} ${marketLabel} from saved research`
            : `Save ${row.player} ${marketLabel} to research`
        }
        onClick={() =>
          toggleSaved({
            id,
            playerId: row.playerId,
            playerName: row.player,
            sport: row.sport,
            market: row.market,
            marketLabel: row.marketLabel,
            side: row.side,
            line: row.line,
            odds: row.bestOdds,
            date: slateDate(row.dayOffset),
            source: "filter-plays",
            href,
          })
        }
      >
        {saved ? <Check className="text-atlas" /> : <FolderPlus />}
        {compact ? null : saved ? "Saved" : "Save"}
      </Button>

      <Button
        size={size}
        variant="primary"
        aria-label={`View research for ${row.player} ${marketLabel}`}
        onClick={() => navigate(href)}
      >
        View Research
        <ArrowRight />
      </Button>
    </div>
  );
}
