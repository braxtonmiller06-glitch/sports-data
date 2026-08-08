import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResearchFilters } from "@/components/dashboard/ResearchFilters";
import { PlayerSearchHeader } from "@/components/player-lookup/PlayerSearchHeader";
import { PlayerContextStrip } from "@/components/player-lookup/PlayerContextStrip";
import { PropSummary } from "@/components/player-lookup/PropSummary";
import { PerformanceChart } from "@/components/player-lookup/PerformanceChart";
import { LookupFilterPanel } from "@/components/player-lookup/LookupFilterPanel";
import { SportsbookPanel } from "@/components/player-lookup/SportsbookPanel";
import { SeasonBaselinePanel } from "@/components/player-lookup/SeasonBaseline";
import { ResearchActions } from "@/components/player-lookup/ResearchActions";
import {
  ClosingLineValue,
  EdgeDecomposition,
  SituationalSplits,
} from "@/components/player-lookup/PremiumResearch";
import { usePlayerLookup } from "@/hooks/usePlayerLookup";
import { cardVariants, staggerContainer } from "@/lib/motion";

/**
 * Player Lookup — the detailed research screen the dashboard and tools lead
 * into.
 *
 * All state lives in usePlayerLookup, and every figure on the page is derived
 * from the filtered game log rather than read from a canned summary. Changing
 * the player, the stat, the line or any filter re-derives the summary, the
 * chart and the sample together.
 */
export default function PlayerLookupPage() {
  const lookup = usePlayerLookup();
  const { player, stat, side, line, stats } = lookup;

  return (
    <AppShell>
      <motion.div variants={staggerContainer} className="flex flex-col gap-5">
        {/* 1 — search + identity */}
        <motion.section variants={cardVariants} className="flex flex-col gap-5 border-b border-line pb-5">
          <PlayerSearchHeader player={player} onSelect={lookup.selectPlayer} />
          {/* 2 — next-game context */}
          <PlayerContextStrip player={player} />
        </motion.section>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* 5 — filters */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-3">
            <LookupFilterPanel
              stat={stat}
              onStatChange={lookup.selectStat}
              filters={lookup.filters}
              onFilterChange={lookup.setFilter}
              onClearFilter={lookup.clearFilter}
              onReset={lookup.resetFilters}
              activeFilters={lookup.activeFilters}
              opponentOptions={lookup.opponentOptions}
              sampleSize={stats.sample}
            />
          </motion.div>

          <div className="flex min-w-0 flex-col gap-5 xl:col-span-9">
            {/* 3 — prop summary */}
            <motion.div variants={cardVariants}>
              <PropSummary
                stat={stat}
                line={line}
                lineIsCustom={lookup.lineIsCustom}
                onNudgeLine={lookup.nudgeLine}
                onResetLine={lookup.resetLine}
                side={side}
                onSideChange={lookup.setSide}
                overOdds={lookup.market.overOdds}
                underOdds={lookup.market.underOdds}
                stats={stats}
              />
            </motion.div>

            {/* 4 — performance chart */}
            <motion.div variants={cardVariants}>
              <PerformanceChart games={lookup.chartGames} stat={stat} line={line} />
            </motion.div>

            {/* 9 — actions */}
            <motion.div variants={cardVariants}>
              <ResearchActions
                playerId={player.id}
                playerName={player.name}
                stat={stat}
                side={side}
                line={line}
              />
            </motion.div>
          </div>

          {/* 6 — the eight signals, open at every tier */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-8">
            <Card className="h-full">
              <CardHeader>
                <CardTitle>Atlas research signals</CardTitle>
                <span className="ml-auto text-[11px] text-fg-faint">
                  Open on every plan
                </span>
              </CardHeader>
              <CardContent>
                <ResearchFilters filters={player.signals} />
              </CardContent>
            </Card>
          </motion.div>

          {/* 10 — season baseline */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-4">
            <SeasonBaselinePanel baseline={player.baseline} />
          </motion.div>

          {/* 8 — sportsbooks */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-7">
            <SportsbookPanel books={player.books} side={side} />
          </motion.div>

          {/* 7 — premium research */}
          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-5">
            <SituationalSplits />
          </motion.div>

          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-7">
            <EdgeDecomposition />
          </motion.div>

          <motion.div variants={cardVariants} className="min-w-0 xl:col-span-5">
            <ClosingLineValue />
          </motion.div>
        </div>
      </motion.div>
    </AppShell>
  );
}
