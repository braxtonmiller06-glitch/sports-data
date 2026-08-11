import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { useAccess } from "@/lib/access";
import { ROUTES } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  BOARD_METRICS,
  BOARD_PLAYERS,
  DATE_OPTIONS,
  SPORT_OPTIONS,
  type BoardPlayer,
} from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "player-board")!;

/** Free compares the top of the board; the full grid is a Medium feature. */
const FREE_VISIBLE_ROWS = 3;

type MetricKey = (typeof BOARD_METRICS)[number]["key"];

export default function PlayerBoardPage() {
  const navigate = useNavigate();
  const { can } = useAccess();
  const [sport, setSport] = useState("nba");
  const [date, setDate] = useState("today");
  const [sortKey, setSortKey] = useState<MetricKey>("projection");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(
    () =>
      [...BOARD_PLAYERS].sort((a, b) => {
        const delta = (a[sortKey] as number) - (b[sortKey] as number);
        return sortDesc ? -delta : delta;
      }),
    [sortKey, sortDesc],
  );

  const full = can("player_props");
  const visible = full ? rows : rows.slice(0, FREE_VISIBLE_ROWS);
  const hidden = rows.length - visible.length;

  function sortBy(key: MetricKey) {
    if (key === sortKey) setSortDesc((v) => !v);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  // Highest value per metric, so the leader in each column can be marked.
  const leaders = useMemo(() => {
    const map = {} as Record<MetricKey, number>;
    for (const metric of BOARD_METRICS) {
      map[metric.key] = Math.max(...rows.map((r) => r[metric.key] as number));
    }
    return map;
  }, [rows]);

  return (
    <ToolShell
      tool={TOOL}
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select
            label="Sort by"
            options={BOARD_METRICS.map((m) => ({ value: m.key, label: m.label }))}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MetricKey)}
          />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Comparison board</CardTitle>
              <Badge variant="outline">{visible.length} players</Badge>
              <span className="ml-auto text-[11px] text-fg-faint">
                Click a column to sort · click a row to open the player
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint">
                        PLAYER
                      </th>
                      {BOARD_METRICS.map((metric) => (
                        <th
                          key={metric.key}
                          onClick={() => sortBy(metric.key)}
                          className={cn(
                            "cursor-pointer select-none px-4 py-2.5 text-right",
                            "text-[10px] font-medium tracking-[0.12em] transition-colors duration-[120ms]",
                            sortKey === metric.key ? "text-atlas" : "text-fg-faint hover:text-fg",
                          )}
                        >
                          {metric.label}
                          {sortKey === metric.key && <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row: BoardPlayer) => (
                      <tr
                        key={row.id}
                        onClick={() => navigate(ROUTES.playerLookup)}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(e) => e.key === "Enter" && navigate(ROUTES.playerLookup)}
                        className={cn(
                          "cursor-pointer border-b border-line-faint outline-none last:border-b-0",
                          "transition-colors duration-[120ms] hover:bg-surface-hi focus-visible:bg-surface-hi",
                        )}
                      >
                        <td className="px-4 py-3">
                          <span className="block text-[13px] font-medium text-fg">{row.player}</span>
                          <span className="block text-[11px] text-fg-faint">{row.team}</span>
                        </td>
                        {BOARD_METRICS.map((metric) => {
                          const value = row[metric.key] as number;
                          const isLeader = value === leaders[metric.key];
                          return (
                            <td
                              key={metric.key}
                              className={cn(
                                "tabular px-4 py-3 text-right text-[13px]",
                                isLeader ? "font-semibold text-atlas" : "text-fg",
                                metric.key === "edge" && value < 0 && "text-signal-crit",
                              )}
                            >
                              {metric.key === "edge" && value > 0 ? "+" : ""}
                              {value.toFixed(1)}
                              {metric.suffix}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {hidden > 0 && (
                <div className="border-t border-line-faint p-4">
                  <PremiumGate
                    feature="player_props"
                    title={`${hidden} more players on this board`}
                    description="Compare the full rotation rather than the top of the sheet."
                  >
                    <div />
                  </PremiumGate>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-12">
          <Card>
            <CardHeader>
              <CardTitle>Reading the board</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="max-w-[76ch] text-[13px] leading-relaxed text-fg-muted">
                Green marks the leader in each column. Minutes and usage are the two inputs
                everything else depends on — a player with a high projection but middling minutes
                is carrying an assumption about role that may not hold. Compare those two columns
                first, then read the edge.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
