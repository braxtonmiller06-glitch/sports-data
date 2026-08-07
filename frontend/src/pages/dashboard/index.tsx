import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { HeroCard } from "@/components/dashboard/HeroCard";
import { TopPlayCard } from "@/components/dashboard/TopPlayCard";
import { MarketPulseCard } from "@/components/dashboard/MarketPulseCard";
import { ActivityFeedCard } from "@/components/dashboard/ActivityFeedCard";
import { PerformanceCard } from "@/components/dashboard/PerformanceCard";
import { AskAtlasCard } from "@/components/dashboard/AskAtlasCard";
import { staggerContainer } from "@/lib/motion";

/**
 * Overview page.
 *
 * Layout only — every panel here is a placeholder. The grid is the contract:
 * widgets get built to these spans, so dropping a finished component in place
 * of a placeholder should not move anything around it.
 *
 * Spans: 1 column on mobile, 2 on md, a 12-column field on xl.
 */
export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-6">
        <WelcomeSection />

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-12"
        >
          <HeroCard className="md:col-span-2 xl:col-span-8" />
          <TopPlayCard className="md:col-span-1 xl:col-span-4" />

          <MarketPulseCard className="md:col-span-1 xl:col-span-7" />
          <ActivityFeedCard className="md:col-span-1 xl:col-span-5" />

          <PerformanceCard className="md:col-span-2 xl:col-span-7" />
          <AskAtlasCard className="md:col-span-2 xl:col-span-5" />
        </motion.div>
      </div>
    </AppShell>
  );
}
