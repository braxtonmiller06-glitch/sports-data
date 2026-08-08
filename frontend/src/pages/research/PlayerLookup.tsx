import { useState } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabPanel } from "@/components/ui/tabs";
import { ResearchFilters } from "@/components/dashboard/ResearchFilters";
import { PlayerSearchHeader } from "@/components/player-lookup/PlayerSearchHeader";
import { PlayerContextStrip } from "@/components/player-lookup/PlayerContextStrip";
import { PropSummary } from "@/components/player-lookup/PropSummary";
import { PerformanceChart } from "@/components/player-lookup/PerformanceChart";
import {
  ActiveFilterChips,
  AdvancedFilters,
  PrimaryFilters,
} from "@/components/player-lookup/FilterControls";
import { SportComingSoon } from "@/components/player-lookup/SportComingSoon";
import { SportsbookPanel } from "@/components/player-lookup/SportsbookPanel";
import { SeasonBaselinePanel } from "@/components/player-lookup/SeasonBaseline";
import { ResearchActions } from "@/components/player-lookup/ResearchActions";
import {
  ClosingLineValue,
  EdgeDecomposition,
  SituationalSplits,
} from "@/components/player-lookup/PremiumResearch";
import {
  AtlasAiPanel,
  FullAnalysisPanel,
  GameLogPanel,
  HistoricalPerformancePanel,
  LineMovementPanel,
  MatchupContextPanel,
  PlayerHeadToHeadPanel,
} from "@/components/player-lookup/TabPanels";
import { usePlayerLookup } from "@/hooks/usePlayerLookup";
import { STAT_LABEL } from "@/data/playerLookupFixtures";
import { cardVariants, staggerContainer } from "@/lib/motion";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "performance", label: "Performance" },
  { id: "matchup", label: "Matchup" },
  { id: "odds", label: "Odds" },
  { id: "research", label: "Research" },
];

/**
 * Player Lookup.
 *
 * Restructured around tabs: the page previously stacked every research section
 * vertically, which meant twelve selects and nine panels competing on first
 * paint. Nothing was removed — the same content is grouped by the question it
 * answers, with four primary filters on screen and the rest behind Advanced.
 */
export default function PlayerLookupPage() {
  const lookup = usePlayerLookup();
  const { player, stat, side, line, stats, sportConfig, sportSupported } = lookup;
  const [tab, setTab] = useState("overview");

  return (
    <AppShell>
      <motion.div variants={staggerContainer} className="flex flex-col gap-5">
        {/* Header: title, search, identity. The sport scope lives in the top
            navigation — one global selector, not a second copy per page. */}
        <motion.section variants={cardVariants} className="flex flex-col gap-4">
          <h1 className="text-[11px] font-medium tracking-[0.18em] text-fg-faint">
            PLAYER LOOKUP
          </h1>

          {sportSupported ? (
            <PlayerSearchHeader
              player={player}
              roster={lookup.roster}
              onSelect={lookup.selectPlayer}
            />
          ) : null}

          {lookup.unavailableMarket && (
            <p
              role="status"
              className="rounded-lg border border-line bg-inset px-3.5 py-2.5 text-[12px] leading-relaxed text-fg-muted"
            >
              <span className="font-medium text-fg">{lookup.unavailableMarket}</span> is not
              charted in Player Lookup yet — showing {STAT_LABEL[stat]} for {player.name}{" "}
              instead.
            </p>
          )}
        </motion.section>

        {!sportSupported ? (
          <motion.div variants={cardVariants}>
            <SportComingSoon config={sportConfig} />
          </motion.div>
        ) : (
          <>
            {/* Next-game context */}
            <motion.section variants={cardVariants} className="border-b border-line pb-5">
              <PlayerContextStrip player={player} />
            </motion.section>

            {/* Primary filters + chips + advanced */}
            <motion.section variants={cardVariants} className="flex flex-col gap-3">
              <PrimaryFilters
                stat={stat}
                onStatChange={lookup.selectStat}
                filters={lookup.filters}
                onFilterChange={lookup.setFilter}
                opponentOptions={lookup.opponentOptions}
              />
              <div className="flex flex-wrap items-center gap-3">
                <AdvancedFilters
                  filters={lookup.filters}
                  onFilterChange={lookup.setFilter}
                  opponentOptions={lookup.opponentOptions}
                  activeCount={lookup.advancedActiveCount}
                />
                <ActiveFilterChips
                  activeFilters={lookup.activeFilters}
                  onClear={lookup.clearFilter}
                  onReset={lookup.resetFilters}
                />
              </div>
            </motion.section>

            {/* Tabs */}
            <motion.div variants={cardVariants} className="flex flex-col gap-5">
              <Tabs tabs={TABS} active={tab} onChange={setTab} />

              <TabPanel id="overview" active={tab}>
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
                <PerformanceChart games={lookup.chartGames} stat={stat} line={line} />
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="min-w-0 xl:col-span-8">
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
                  </div>
                  <div className="min-w-0 xl:col-span-4">
                    <SeasonBaselinePanel baseline={player.baseline} />
                  </div>
                </div>
                <SportsbookPanel books={player.books} side={side} />
                <ResearchActions
                  playerId={player.id}
                  playerName={player.name}
                  sport={lookup.sport}
                  stat={stat}
                  side={side}
                  line={line}
                  odds={side === "over" ? lookup.market.overOdds : lookup.market.underOdds}
                />
              </TabPanel>

              <TabPanel id="performance" active={tab}>
                <GameLogPanel games={lookup.chartGames} stat={stat} line={line} />
                <HistoricalPerformancePanel />
                <SituationalSplits />
              </TabPanel>

              <TabPanel id="matchup" active={tab}>
                <MatchupContextPanel player={player} />
                <PlayerHeadToHeadPanel stat={stat} />
                <SituationalSplits />
              </TabPanel>

              <TabPanel id="odds" active={tab}>
                <SportsbookPanel books={player.books} side={side} />
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="min-w-0 xl:col-span-7">
                    <LineMovementPanel />
                  </div>
                  <div className="min-w-0 xl:col-span-5">
                    <ClosingLineValue />
                  </div>
                </div>
              </TabPanel>

              <TabPanel id="research" active={tab}>
                <Card>
                  <CardHeader>
                    <CardTitle>Atlas research signals</CardTitle>
                    <span className="ml-auto text-[11px] text-fg-faint">Open on every plan</span>
                  </CardHeader>
                  <CardContent>
                    <ResearchFilters filters={player.signals} />
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
                  <div className="min-w-0 xl:col-span-7">
                    <EdgeDecomposition />
                  </div>
                  <div className="min-w-0 xl:col-span-5">
                    <FullAnalysisPanel player={player} stat={stat} />
                  </div>
                </div>
                <AtlasAiPanel />
              </TabPanel>
            </motion.div>
          </>
        )}
      </motion.div>
    </AppShell>
  );
}
