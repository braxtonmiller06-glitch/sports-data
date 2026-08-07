import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeHeader } from "@/components/dashboard/WelcomeHeader";
import { OpportunityScore } from "@/components/dashboard/OpportunityScore";
import { SlateSummary } from "@/components/dashboard/SlateSummary";
import { TopResearchPlay } from "@/components/dashboard/TopResearchPlay";
import { MarketPulse } from "@/components/dashboard/MarketPulse";
import { LiveActivityFeed } from "@/components/dashboard/LiveActivityFeed";
import { QuickAccess } from "@/components/dashboard/QuickAccess";
import { PerformanceSnapshot } from "@/components/dashboard/PerformanceSnapshot";
import { MorningBriefing } from "@/components/dashboard/MorningBriefing";
import { ContinueResearch } from "@/components/dashboard/ContinueResearch";
import { AskAtlas } from "@/components/dashboard/AskAtlas";
import { staggerContainer } from "@/lib/motion";

/**
 * The command center.
 *
 * Reading order answers three questions in sequence: what is happening right
 * now (slate, opportunity, market pulse, activity), what should I look at next
 * (top play, quick access, continue research), and what happened (performance).
 *
 * Grid: one column on mobile, two from md, a 12-column field from xl. Every
 * module is a standalone component that takes only a span className, so the
 * layout can be rearranged here without touching a widget.
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <motion.div variants={staggerContainer} className="flex flex-col gap-5">
        {/* Row 1 — orientation */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <WelcomeHeader className="md:col-span-2 xl:col-span-5" />
          <OpportunityScore className="md:col-span-1 xl:col-span-3" />
          <SlateSummary className="md:col-span-1 xl:col-span-4" />
        </div>

        {/* Row 2 — what is happening right now */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <TopResearchPlay className="md:col-span-2 xl:col-span-6" />
          <MarketPulse className="md:col-span-1 xl:col-span-3" />
          <LiveActivityFeed className="md:col-span-1 xl:col-span-3" />
        </div>

        {/* Row 3 — where to go, and how it has gone */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <QuickAccess className="md:col-span-2 xl:col-span-8" />
          <PerformanceSnapshot className="md:col-span-2 xl:col-span-4" />
        </div>

        {/* Row 4 — reading and returning */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12">
          <MorningBriefing className="md:col-span-2 xl:col-span-5" />
          <ContinueResearch className="md:col-span-1 xl:col-span-3" />
          <AskAtlas className="md:col-span-1 xl:col-span-4" />
        </div>
      </motion.div>
    </AppShell>
  );
}
