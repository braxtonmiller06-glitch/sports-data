import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ROUTES } from "@/lib/routes";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { BRIEFING_SECTIONS, DATE_OPTIONS, SPORT_OPTIONS } from "@/data/toolsFixtures";
import { briefingFixture } from "@/data/dashboardFixtures";

const TOOL = TOOLS.find((t) => t.id === "morning-briefing")!;

export default function MorningBriefingPage() {
  const navigate = useNavigate();
  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");

  return (
    <ToolShell
      tool={TOOL}
      lastUpdated="Published 6:00 AM ET"
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Issue" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* The briefing itself — open at every tier. */}
        <motion.article variants={cardVariants} className="min-w-0 xl:col-span-8">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{briefingFixture.issue}</CardTitle>
              <Badge variant="outline" className="ml-auto">
                Friday, August 7
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              <p className="max-w-[68ch] text-[16px] leading-relaxed text-fg">
                {briefingFixture.lede}
              </p>

              {BRIEFING_SECTIONS.map((section) => (
                <section key={section.heading} className="flex flex-col gap-2">
                  <h3 className="text-[10px] font-medium tracking-[0.16em] text-fg-faint">
                    {section.heading.toUpperCase()}
                  </h3>
                  <p className="max-w-[72ch] text-[13.5px] leading-relaxed text-fg-muted">
                    {section.body}
                  </p>
                </section>
              ))}
            </CardContent>
          </Card>
        </motion.article>

        <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              {briefingFixture.points.map((point) => (
                <div
                  key={point.tag}
                  className="flex flex-col gap-1.5 rounded-lg border border-line bg-inset p-3"
                >
                  <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
                    {point.tag.toUpperCase()}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-fg-muted">{point.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Referenced in this issue</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {[
                { label: "Anthony Edwards over 27.5", to: ROUTES.playerLookup },
                { label: "Minnesota at Denver", to: ROUTES.headToHead },
                { label: "Today's filtered board", to: ROUTES.filterPlays },
              ].map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigate(link.to)}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-line-faint px-5 py-3 text-left",
                    "outline-none transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-hi",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate text-[13px] text-fg">{link.label}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-fg-faint" />
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
