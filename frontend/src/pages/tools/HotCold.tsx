import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Flame, Snowflake } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { ROUTES } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DATE_OPTIONS, FORM_ENTRIES, SPORT_OPTIONS, type FormEntry } from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "hot-cold")!;

const WINDOW_OPTIONS = [
  { value: "5", label: "Last 5 games" },
  { value: "10", label: "Last 10 games" },
  { value: "20", label: "Last 20 games" },
];

function FormRow({ entry, onOpen }: { entry: FormEntry; onOpen: () => void }) {
  const hot = entry.form === "hot";
  // Bar is scaled against a 40% deviation ceiling so the extremes stay readable.
  const width = Math.min(Math.abs(entry.delta) / 40, 1) * 100;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-4 border-b border-line-faint px-5 py-3.5 text-left",
        "outline-none transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi",
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate text-[13px] font-medium text-fg">{entry.player}</span>
        <span className="truncate text-[11px] text-fg-faint">
          {entry.team} · {entry.metric} · {entry.games}
        </span>
      </div>

      <div className="hidden w-28 shrink-0 sm:block">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-inset">
          <div
            className={cn("h-full rounded-full", hot ? "bg-atlas" : "bg-signal-crit")}
            style={{ width: `${width}%` }}
          />
        </div>
      </div>

      <div className="w-28 shrink-0 text-right">
        <span className="tabular block text-[13px] font-semibold text-fg">
          {entry.recent.toFixed(1)}
        </span>
        <span className="tabular block text-[11px] text-fg-faint">
          base {entry.baseline.toFixed(1)}
        </span>
      </div>

      <span
        className={cn(
          "tabular w-16 shrink-0 text-right text-[13px] font-semibold",
          hot ? "text-atlas" : "text-signal-crit",
        )}
      >
        {entry.delta > 0 ? "+" : ""}
        {entry.delta.toFixed(1)}%
      </span>
    </button>
  );
}

export default function HotColdPage() {
  const navigate = useNavigate();
  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");
  const [window, setWindow] = useState("5");
  const [view, setView] = useState<"both" | "hot" | "cold">("both");

  const hot = useMemo(() => FORM_ENTRIES.filter((e) => e.form === "hot"), []);
  const cold = useMemo(() => FORM_ENTRIES.filter((e) => e.form === "cold"), []);

  return (
    <ToolShell
      tool={TOOL}
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Window" options={WINDOW_OPTIONS} value={window} onChange={(e) => setWindow(e.target.value)} />
          <Select
            label="View"
            options={[
              { value: "both", label: "Hot and cold" },
              { value: "hot", label: "Hot only" },
              { value: "cold", label: "Cold only" },
            ]}
            value={view}
            onChange={(e) => setView(e.target.value as typeof view)}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {view !== "cold" && (
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <Flame className="size-4 text-atlas" />
                <CardTitle>Running hot</CardTitle>
                <Badge variant="atlas" className="ml-auto">
                  {hot.length}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {hot.map((entry) => (
                  <FormRow key={entry.id} entry={entry} onOpen={() => navigate(ROUTES.playerLookup)} />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {view !== "hot" && (
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-6">
            <Card className="h-full">
              <CardHeader>
                <Snowflake className="size-4 text-signal-crit" />
                <CardTitle>Running cold</CardTitle>
                <Badge variant="critical" className="ml-auto">
                  {cold.length}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                {cold.map((entry) => (
                  <FormRow key={entry.id} entry={entry} onOpen={() => navigate(ROUTES.playerLookup)} />
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle>What form actually tells you</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="max-w-[76ch] text-[13px] leading-relaxed text-fg-muted">
                Deviation from baseline is a starting point, not a conclusion. A player 20% above
                his season rate over five games is usually showing variance, not a new level —
                shooting percentages regress hard, and five games is a small sample.
              </p>
              <p className="max-w-[76ch] text-[13px] leading-relaxed text-fg-muted">
                The deviations worth acting on are the ones with a mechanism behind them: a usage
                change after an injury, a rotation change, a role change. Open any player to see
                whether the run is explained or simply noisy.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-4">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Longer windows</CardTitle>
            </CardHeader>
            <CardContent>
              <PremiumGate
                feature="extended_history"
                title="20+ game windows"
                description="Deviation measured against a full-season baseline, where the signal separates from the noise."
              >
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  Extended windows are available on your plan. Switch the window control above to
                  compare against a longer baseline.
                </p>
              </PremiumGate>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
