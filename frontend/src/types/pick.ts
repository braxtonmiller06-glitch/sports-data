// Mirrors backend/engine/base_filter.py's SevenFieldOutput and
// backend/engine/aggregator.py's AggregationResult shapes.

export interface FilterOutput {
  filter_id: string;
  name: string;
  signal: "STRONG_OVER" | "LEAN_OVER" | "NEUTRAL" | "LEAN_UNDER" | "STRONG_UNDER";
  strength: number;
  confidence: number;
  evidence: string[];
  red_flags: string[];
}

export interface Pick {
  id: string;
  sport: string;
  subject: string;
  market_type: string;
  line: number | null;
  side: "OVER" | "UNDER" | "HOME" | "AWAY" | "DRAW";
  decimal_odds: number;
  model_probability: number;
  market_probability: number;
  edge: number;
  confidence: number;
  verdict: "BET" | "PLAYABLE" | "LEAN" | "PASS";
  /**
   * Absent on anything loaded from the `picks` table.
   *
   * The database withholds this column from `authenticated` -- it is what a
   * subscription buys -- so it never arrives with the row. Entitled callers
   * fetch it separately through the `pick_filters` RPC (see usePickFilters).
   * It stays on the type for fixtures that carry a breakdown inline, which is
   * why it is optional rather than removed.
   */
  filters?: FilterOutput[];
}
