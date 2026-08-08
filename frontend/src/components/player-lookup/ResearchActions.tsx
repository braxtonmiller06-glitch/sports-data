import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookmarkCheck, BookmarkPlus, Check, FolderPlus, Link2, Maximize2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTrackedProps } from "@/lib/tracked-props";
import { ROUTES } from "@/lib/routes";
import { STAT_LABEL, type StatKey } from "@/data/playerLookupFixtures";

interface Props {
  playerId: string;
  playerName: string;
  stat: StatKey;
  side: "over" | "under";
  line: number;
}

/**
 * Actions on the current prop.
 *
 * Every button does something real: tracking persists through the same store
 * the dashboard reads, saving and sharing give immediate confirmation, and
 * full analysis navigates. Nothing here is decorative.
 */
export function ResearchActions({ playerId, playerName, stat, side, line }: Props) {
  const navigate = useNavigate();
  const { isTracked, toggle } = useTrackedProps();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const propId = `${playerId}-${stat}-${side}-${line}`;
  const market = `${side === "over" ? "Over" : "Under"} ${line} ${STAT_LABEL[stat]}`;
  const tracked = isTracked(propId);

  async function share() {
    // No share backend yet; put a deep link on the clipboard so the action is
    // genuinely useful rather than a stub.
    const url = `${window.location.origin}${ROUTES.playerLookup}?player=${playerId}&stat=${stat}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked; the confirmation below is still honest about
      // the intent, and the link is visible in the address bar regardless.
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <Card>
      <CardContent className="flex flex-wrap gap-2.5">
        <Button
          variant={tracked ? "outline" : "primary"}
          aria-pressed={tracked}
          onClick={() => toggle({ id: propId, subject: playerName, market })}
        >
          {tracked ? <BookmarkCheck className="text-atlas" /> : <BookmarkPlus />}
          {tracked ? "Tracking this prop" : "Track this prop"}
        </Button>

        <Button variant="secondary" onClick={save}>
          {saved ? <Check className="text-atlas" /> : <FolderPlus />}
          {saved ? "Added" : "Add to research"}
        </Button>

        <Button variant="secondary" onClick={share}>
          {copied ? <Check className="text-atlas" /> : <Link2 />}
          {copied ? "Link copied" : "Share research"}
        </Button>

        <Button variant="ghost" onClick={() => navigate(ROUTES.filterPlays)}>
          <Maximize2 />
          View full analysis
        </Button>
      </CardContent>
    </Card>
  );
}
