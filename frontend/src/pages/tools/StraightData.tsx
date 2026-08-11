import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PremiumGate } from "@/components/subscription/PremiumGate";
import { useAccess } from "@/lib/access";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { DATA_TRENDS, DATE_OPTIONS, SPORT_OPTIONS } from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "straight-data")!;

const SIGNIFICANCE_OPTIONS = [
  { value: "all", label: "Any significance" },
  { value: "high", label: "High only" },
  { value: "medium", label: "Medium and up" },
];

const SIG_TONE: Record<string, string> = {
  high: "text-atlas",
  medium: "text-signal-warn",
  low: "text-fg-faint",
};

const RANK = { high: 3, medium: 2, low: 1 } as const;

export default function StraightDataPage() {
  const { can, requestUpgrade } = useAccess();
  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");
  const [significance, setSignificance] = useState("all");
  const [sortDesc, setSortDesc] = useState(true);

  const rows = useMemo(() => {
    const min = significance === "high" ? 3 : significance === "medium" ? 2 : 1;
    return DATA_TRENDS.filter((row) => RANK[row.significance] >= min).sort((a, b) =>
      sortDesc ? b.hitRate - a.hitRate : a.hitRate - b.hitRate,
    );
  }, [significance, sortDesc]);

  const canExport = can("data_export");

  return (
    <ToolShell
      tool={TOOL}
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
          <Select label="Significance" options={SIGNIFICANCE_OPTIONS} value={significance} onChange={(e) => setSignificance(e.target.value)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.div variants={cardVariants} className="min-w-0 xl:col-span-9">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Statistical trends</CardTitle>
              <Badge variant="outline">{rows.length} trends</Badge>
              <div className="ml-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => (canExport ? undefined : requestUpgrade("data_export"))}
                >
                  <Download />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr className="border-b border-line text-left">
                      {["Subject", "Trend", "Sample", "Hit rate", "Streak", "Significance"].map((head) => (
                        <th
                          key={head}
                          className={cn(
                            "px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint",
                            head === "Hit rate" && "cursor-pointer select-none hover:text-fg",
                          )}
                          onClick={head === "Hit rate" ? () => setSortDesc((v) => !v) : undefined}
                        >
                          {head.toUpperCase()}
                          {head === "Hit rate" && <span className="ml-1">{sortDesc ? "↓" : "↑"}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-line-faint transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi"
                      >
                        <td className="px-4 py-3 text-[13px] font-medium text-fg">{row.subject}</td>
                        <td className="px-4 py-3 text-[12px] text-fg-muted">{row.trend}</td>
                        <td className="px-4 py-3 text-[11px] text-fg-faint">{row.sample}</td>
                        <td className="tabular px-4 py-3 text-[13px] font-semibold text-fg">
                          {row.hitRate.toFixed(1)}%
                        </td>
                        <td className="px-4 py-3 text-[12px] text-fg-muted">{row.streak}</td>
                        <td
                          className={cn(
                            "px-4 py-3 text-[11px] font-medium tracking-wide",
                            SIG_TONE[row.significance],
                          )}
                        >
                          {row.significance.toUpperCase()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Full dataset</CardTitle>
            </CardHeader>
            <CardContent>
              <PremiumGate
                feature="data_export"
                title="Export and raw access"
                description="Download any view as CSV, or pull the same rows through the API."
              >
                <p className="text-[13px] leading-relaxed text-fg-muted">
                  Export is enabled on your plan. Use the button above to download the current
                  filtered view.
                </p>
              </PremiumGate>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>On reading trends</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                A hit rate without a sample size is noise. Significance here accounts for both —
                a 73% rate over 15 games rates higher than 80% over five. Streaks are shown
                because people ask for them, but they carry almost no predictive weight on their
                own.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
