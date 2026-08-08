import { useCallback, useMemo, useState } from "react";
import {
  OPPORTUNITIES,
  marketsForSport,
  sportHasBoard,
  type AtlasSignalId,
} from "@/data/filterPlaysFixtures";
import {
  DEFAULT_CRITERIA,
  activeSignalCount,
  filterPlays,
  hasActiveCriteria,
  type FilterPlaysCriteria,
  type SignalRequirement,
} from "@/lib/filter-plays";
import { useSport } from "@/lib/sport-context";

/**
 * Filter Plays state.
 *
 * The sport is deliberately absent from the criteria object: it belongs to the
 * global SportProvider, and this hook reads it rather than keeping a second
 * copy. Everything else is local to the workspace.
 *
 * Going live means changing the `OPPORTUNITIES` import to a fetch and giving
 * this hook a loading state. Nothing above it moves.
 */
export function useFilterPlays() {
  const { sport, config: sportConfig } = useSport();
  const [criteria, setCriteria] = useState<FilterPlaysCriteria>(DEFAULT_CRITERIA);

  const markets = useMemo(() => marketsForSport(sport), [sport]);

  /**
   * Markets are sport-specific, so a selection made under NBA may not exist
   * under WNBA. Deriving rather than clearing in an effect means the board is
   * never briefly filtered by a market this sport does not have.
   */
  const market = useMemo(
    () => (markets.some((m) => m.value === criteria.market) ? criteria.market : "all"),
    [markets, criteria.market],
  );

  const effectiveCriteria = useMemo<FilterPlaysCriteria>(
    () => ({ ...criteria, market }),
    [criteria, market],
  );

  const { results, total } = useMemo(
    () => filterPlays(OPPORTUNITIES, sport, effectiveCriteria),
    [sport, effectiveCriteria],
  );

  const setField = useCallback(
    <K extends keyof FilterPlaysCriteria>(key: K, value: FilterPlaysCriteria[K]) => {
      setCriteria((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const setSignalRequirement = useCallback((id: AtlasSignalId, require: SignalRequirement) => {
    setCriteria((prev) => ({
      ...prev,
      signals: { ...prev.signals, [id]: { ...prev.signals[id], require } },
    }));
  }, []);

  const toggleSignal = useCallback((id: AtlasSignalId) => {
    setCriteria((prev) => ({
      ...prev,
      signals: {
        ...prev.signals,
        [id]: { ...prev.signals[id], enabled: !prev.signals[id].enabled },
      },
    }));
  }, []);

  const reset = useCallback(() => setCriteria(DEFAULT_CRITERIA), []);

  return {
    // scope
    sport,
    sportConfig,
    sportSupported: sportConfig.implemented && sportHasBoard(sport),
    markets,
    // criteria
    criteria: effectiveCriteria,
    setField,
    setSignalRequirement,
    toggleSignal,
    reset,
    filtersActive: hasActiveCriteria(effectiveCriteria),
    signalsChanged: activeSignalCount(effectiveCriteria),
    // derived
    results,
    total,
  };
}
