import type { Pick } from "../types/pick";

// Illustrative sample for the landing page and as a dashboard fallback --
// shaped exactly like a real aggregator.run() result, not fabricated numbers
// pretending to be a real historical pick.
export const samplePick: Pick = {
  id: "sample",
  sport: "wnba",
  subject: "A. Wilson",
  market_type: "player_points_over",
  line: 21.5,
  side: "OVER",
  decimal_odds: 1.91,
  model_probability: 0.61,
  market_probability: 0.52,
  edge: 0.09,
  confidence: 71,
  verdict: "PLAYABLE",
  filters: [
    {
      filter_id: "wnba_matchup_fit",
      name: "Matchup Fit",
      signal: "STRONG_OVER",
      strength: 0.72,
      confidence: 85,
      evidence: [
        "opponent def rating 107.5 vs league avg 102.0 (worse than average defense)",
        "player draws 45% of shots at the rim vs a weak rim-defense opponent",
      ],
      red_flags: [],
    },
    {
      filter_id: "wnba_usage_role_elasticity",
      name: "Usage & Role Elasticity",
      signal: "LEAN_OVER",
      strength: 0.56,
      confidence: 56,
      evidence: ["with starting PG out historically: usage 24.0% -> 29.5%"],
      red_flags: ["small sample: only 3 historical games with this exact absence"],
    },
    {
      filter_id: "wnba_volume_edge",
      name: "Volume Edge",
      signal: "LEAN_OVER",
      strength: 0.53,
      confidence: 65,
      evidence: ["fga: season avg 14.0 -> last 5 avg 15.5"],
      red_flags: [],
    },
    {
      filter_id: "wnba_shooting_sustainability",
      name: "Shooting Sustainability",
      signal: "NEUTRAL",
      strength: 0.0,
      confidence: 40,
      evidence: ["season 3P% 36.0% vs last-5 3P% 36.4% on 5.5 attempts/game"],
      red_flags: [],
    },
    {
      filter_id: "wnba_price_vs_projection",
      name: "Price vs True Projection",
      signal: "LEAN_OVER",
      strength: 0.55,
      confidence: 65,
      evidence: ["model projects 24.0 points vs market line 21.5 (+1.38 std devs, 7-game sample stdev)"],
      red_flags: [],
    },
  ],
};
