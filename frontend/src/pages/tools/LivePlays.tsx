import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/ui/sparkline";
import { DeltaTag, LivePulse } from "@/components/ui/live-pulse";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { useAccess } from "@/lib/access";
import { ROUTES } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DATE_OPTIONS, LIVE_PLAYS, SPORT_OPTIONS } from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "live-plays")!;

const STATUS: Record<string, { label: string; tone: string }> = {
  steam: { label: "Steam", tone: "text-atlas" },
  holding: { label: "Holding", tone: "text-fg-muted" },
  fading: { label: "Fading", tone: "text-signal-crit" },
};

const STATUS_OPTIONS = [
  { value: "all", label: "All movement" },
  { value: "steam", label: "Steam only" },
  { value: "fading", label: "Fading only" },
  { value: "holding", label: "Holding only" },
];

export default function LivePlaysPage() {
  const navigate = useNavigate();
  const { can } = useAccess();
  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");
  const [status, setStatus] = useState("all");

  const rows = useMemo(
    () => LIVE_PLAYS.filter((row) => status === "all" || row.status === status),
    [status],
  );

  const alertsUnlocked = can("live_plays_alerts");

  return (
    <ToolShell
      tool={TOOL}
      lastUpdated="Ticking · last update 4s ago"
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Movement" options={STATUS_OPTIONS} value={status} onChange={(e) => setStatus(e.target.value)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Live markets</CardTitle>
              <Badge variant="outline">{rows.length} tracked</Badge>
              <div className="ml-auto">
                <LivePulse tone="live" label="Streaming" />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="flex flex-col">
                {rows.map((row) => {
                  const moved = row.currentLine - row.openLine;
                  const trend = moved > 0 ? "up" : moved < 0 ? "down" : "flat";
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        onClick={() => navigate(ROUTES.playerLookup)}
                        className={cn(
                          "flex w-full items-center gap-4 border-b border-line-faint px-5 py-4 text-left",
                          "outline-none transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi",
                        )}
                      >
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate text-[13px] font-medium text-fg">
                            {row.player}
                          </span>
                          <span className="truncate text-[11px] text-fg-faint">
                            {row.market} · {row.matchup} · {row.gameClock}
                          </span>
                        </div>

                        <div className="hidden w-24 shrink-0 sm:block">
                          <Sparkline
                            data={row.movement}
                            trend={trend}
                            label={`${row.player} line movement`}
                            className="h-6"
                          />
                        </div>

                        <div className="shrink-0 text-right">
                          <span className="tabular block text-[13px] font-semibold text-fg">
                            {row.currentLine}
                          </span>
                          <span className="tabular block text-[11px] text-fg-faint">
                            open {row.openLine}
                          </span>
                        </div>

                        <div className="w-20 shrink-0 text-right">
                          <DeltaTag
                            delta={moved === 0 ? "0.0" : `${moved > 0 ? "+" : ""}${moved.toFixed(1)}`}
                            trend={trend}
                          />
                          <span
                            className={cn(
                              "mt-1 block text-[10px] font-medium tracking-wide",
                              STATUS[row.status].tone,
                            )}
                          >
                            {STATUS[row.status].label.toUpperCase()}
                          </span>
                        </div>

                        <ChevronRight className="size-3.5 shrink-0 text-fg-faint" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <PremiumGate
                feature="live_plays_alerts"
                title="Live alerts"
                description="Get notified the moment a tracked market steams or reverses, rather than checking the board."
              >
                <div className="flex flex-col gap-2.5">
                  {["Edwards points crossed 28.0", "MIN/DEN total fell below 220", "Skenes Ks steamed at 4 books"].map(
                    (alert) => (
                      <div
                        key={alert}
                        className="flex items-start gap-2.5 rounded-lg border border-line bg-inset px-3 py-2.5"
                      >
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-atlas" />
                        <span className="text-[12px] leading-relaxed text-fg-muted">{alert}</span>
                      </div>
                    ),
                  )}
                </div>
              </PremiumGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Reading this board</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                <span className="text-atlas">Steam</span> means several books moved the same
                direction inside a short window — usually respected money.{" "}
                <span className="text-signal-crit">Fading</span> means the number is drifting back
                toward the open. <span className="text-fg">Holding</span> means the market has
                absorbed whatever came in and settled.
              </p>
              {!alertsUnlocked && (
                <p className="mt-3 text-[11px] leading-relaxed text-fg-faint">
                  The board itself is open to every tier. Alerts are what Medium adds.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
