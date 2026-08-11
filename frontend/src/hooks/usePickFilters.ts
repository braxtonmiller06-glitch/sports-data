import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { FilterOutput } from "../types/pick";

/**
 * The per-filter research breakdown for one pick.
 *
 * This is the only path to it. `picks.filters` is revoked from `authenticated`
 * at the column level, so the entitlement survives the client: editing the
 * bundle to ask for the column gets a permission error rather than data. The
 * `pick_filters` function is SECURITY DEFINER and checks `has_paid_access()`
 * itself, which means the answer to "may this user see the breakdown" is
 * decided in the database and merely rendered here.
 */
export interface PickFiltersState {
  filters: FilterOutput[] | null;
  loading: boolean;
  /**
   * The database refused on entitlement grounds rather than failing. Kept
   * separate from `error` because it is an expected answer for a free user and
   * should read as a paywall, not as something being broken.
   */
  forbidden: boolean;
  error: string | null;
}

const IDLE: PickFiltersState = {
  filters: null,
  loading: false,
  forbidden: false,
  error: null,
};

/** Pass `null` to stay idle -- nothing is fetched until a pick id arrives. */
export function usePickFilters(pickId: string | null): PickFiltersState {
  const [state, setState] = useState<PickFiltersState>(IDLE);

  useEffect(() => {
    if (pickId === null) {
      setState(IDLE);
      return;
    }

    // `picks.id` is a bigint. Fixture ids ("sample") are not, and sending one
    // would be a round trip that can only fail.
    const numericId = Number(pickId);
    if (!Number.isInteger(numericId)) {
      setState({ ...IDLE, error: "This pick has no stored breakdown." });
      return;
    }

    let cancelled = false;
    setState({ filters: null, loading: true, forbidden: false, error: null });

    supabase.rpc("pick_filters", { p_pick_id: numericId }).then(({ data, error }) => {
      if (cancelled) return;

      if (error) {
        // pick_filters raises 42501 (insufficient_privilege) for both "not
        // signed in" and "no subscription"; PostgREST maps that to 403.
        const forbidden = error.code === "42501" || error.code === "PGRST301";
        setState({
          filters: null,
          loading: false,
          forbidden,
          error: forbidden ? null : error.message,
        });
        return;
      }

      // The function returns the jsonb column as-is, which is SQL NULL for a
      // pick that was stored before the aggregator wrote a breakdown.
      setState({
        filters: (data as FilterOutput[] | null) ?? [],
        loading: false,
        forbidden: false,
        error: null,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [pickId]);

  return state;
}
