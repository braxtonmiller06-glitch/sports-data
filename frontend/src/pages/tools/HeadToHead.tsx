import { useState } from "react";
import { motion } from "framer-motion";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  DATE_OPTIONS,
  H2H_MEETINGS,
  H2H_SUMMARY,
  H2H_TEAM_OPTIONS,
  SPORT_OPTIONS,
} from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "head-to-head")!;

const SUMMARY_TILES = [
  { label: "Series record", value: H2H_SUMMARY.record, detail: "Last 10 meetings" },
  { label: "Average total", value: H2H_SUMMARY.avgTotal.toFixed(1), detail: "Points per meeting" },
  { label: "Average margin", value: H2H_SUMMARY.avgMargin.toFixed(1), detail: "Points" },
  { label: "Over rate", value: `${H2H_SUMMARY.overRate}%`, detail: "vs closing total" },
  { label: "Pace", value: H2H_SUMMARY.pace.toFixed(1), detail: "Possessions per 48" },
];

export default function HeadToHeadPage() {
  const [sport, setSport] = useState("nba");
  const [date, setDate] = useState("today");
  const [teamA, setTeamA] = useState("min");
  const [teamB, setTeamB] = useState("den");

  const sameTeam = teamA === teamB;

  return (
    <ToolShell
      tool={TOOL}
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Team A" options={H2H_TEAM_OPTIONS} value={teamA} onChange={(e) => setTeamA(e.target.value)} />
          <Select label="Team B" options={H2H_TEAM_OPTIONS} value={teamB} onChange={(e) => setTeamB(e.target.value)} />
        </>
      }
    >
      {sameTeam ? (
        <motion.div variants={cardVariants}>
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
              <p className="text-[13px] font-medium text-fg">Pick two different teams.</p>
              <p className="max-w-sm text-[12px] text-fg-muted">
                Head to head compares one side against another — choose a different opponent in
                the Team B control above.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Matchup summary */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-12">
            <Card>
              <CardHeader>
                <CardTitle>
                  {H2H_SUMMARY.teamA} vs {H2H_SUMMARY.teamB}
                </CardTitle>
                <Badge variant="outline" className="ml-auto">
                  Last 10 meetings
                </Badge>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                  {SUMMARY_TILES.map((tile) => (
                    <div
                      key={tile.label}
                      className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-3.5"
                    >
                      <dt className="text-[10px] font-medium tracking-wide text-fg-faint">
                        {tile.label}
                      </dt>
                      <dd className="text-lg font-semibold tracking-tight text-fg">{tile.value}</dd>
                      <span className="text-[11px] text-fg-faint">{tile.detail}</span>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </motion.div>

          {/* Meeting history */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-8">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Meeting history</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr className="border-b border-line text-left">
                        {["Date", "Result", "Total", "Closing", "vs close"].map((head) => (
                          <th
                            key={head}
                            className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                          >
                            {head.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {H2H_MEETINGS.map((meeting) => {
                        const over = meeting.total > meeting.closingTotal;
                        return (
                          <tr
                            key={meeting.id}
                            className="border-b border-line-faint transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi"
                          >
                            <td className="px-4 py-3 text-[12px] text-fg-muted">{meeting.date}</td>
                            <td className="px-4 py-3 text-[13px] font-medium text-fg">
                              {meeting.result}
                            </td>
                            <td className="tabular px-4 py-3 text-[13px] text-fg">{meeting.total}</td>
                            <td className="tabular px-4 py-3 text-[13px] text-fg-muted">
                              {meeting.closingTotal}
                            </td>
                            <td
                              className={cn(
                                "px-4 py-3 text-[12px] font-medium",
                                over ? "text-atlas" : "text-signal-crit",
                              )}
                            >
                              {meeting.note}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle>Split-level comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <PremiumGate
                  feature="head_to_head"
                  title="Full split comparison"
                  description="Lineup-level splits, rest-adjusted rates and player-vs-player history across the series."
                >
                  <div className="flex flex-col gap-2.5">
                    {[
                      "Starters vs starters: MIN +3.4 net",
                      "Bench units: DEN +6.1 net",
                      "Rest-adjusted pace: 99.8 vs 101.4",
                    ].map((line) => (
                      <div
                        key={line}
                        className="rounded-lg border border-line bg-inset px-3 py-2.5 text-[12px] text-fg-muted"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                </PremiumGate>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>What this tells you</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  Ten meetings is a small sample, and rosters change between them. Series history
                  is most useful for pace and style — how these two teams tend to play each other
                  — and least useful as a direct predictor of a result.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </ToolShell>
  );
}
