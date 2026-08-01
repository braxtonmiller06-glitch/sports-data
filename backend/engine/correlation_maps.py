"""Per-sport causal groups: filters that are largely restating the same
underlying cause shouldn't each count as a fully independent signal.

Example from spec: PACE -> MORE POSSESSIONS -> MORE OPPORTUNITY -> MORE
VOLUME is one causal chain, not four independent ones. A raw count of 8
fired filters where 3 are really "opportunity exists" restated three ways
should score closer to 5 independent signals than 8.

Decay formula: within a causal group of n fired filters, the group counts
as `1 + (n-1) * GROUP_DECAY` independent-equivalent units instead of n.
GROUP_DECAY=1/3 means a group of 4 correlated filters counts as 1 + 3*(1/3)
= 2.0 independent units. Filters not listed in any group for their sport are
standalone and always count as 1 full independent unit.
"""

GROUP_DECAY = 1.0 / 3.0

CORRELATION_GROUPS: dict[str, dict[str, list[str]]] = {
    "wnba": {
        # game/team-level possession supply feeding this player's individual volume trend
        "opportunity_volume_chain": ["wnba_pace_possession", "wnba_volume_edge"],
        # both are "opponent's defense is structurally weak against this specific attribute"
        "defensive_matchup_chain": ["wnba_matchup_fit", "wnba_positional_mismatch"],
        # both are "who's actually on the floor and how the role shifts as a result"
        "role_shift_chain": ["wnba_usage_role_elasticity", "wnba_lineup_on_off"],
    },
    "nfl": {
        # pressure rate is the RESULT; OL/DL win rate is the MECHANISM behind it
        "pressure_chain": ["nfl_qb_pressure_stress", "nfl_ol_vs_dl"],
        # all three are downstream of "this defense's coverage scheme creates/limits separation"
        "coverage_chain": ["nfl_coverage_matchup", "nfl_coverage_scheme_vs_qb", "nfl_man_vs_zone_route"],
        # both are "how much opportunity does this player get"
        "volume_chain": ["nfl_expected_volume", "nfl_red_zone_role"],
        # game script sets rushing volume; box count sets rushing efficiency -- same rushing-environment root
        "run_game_chain": ["nfl_rb_run_fit", "nfl_game_script"],
    },
    "mlb": {
        # both are "will this pitcher generate swings and misses" -- lineup-specific vs. overall
        "stuff_chain": ["mlb_arsenal_vs_lineup", "mlb_whiff_profile"],
        # command drives pitch efficiency, which drives how long the starter stays in
        "workload_chain": ["mlb_command_bb_risk", "mlb_the_leash"],
        # park factor amplifies whatever the quality of contact already is
        "contact_environment_chain": ["mlb_ballpark_weather", "mlb_batted_ball_quality"],
    },
    "soccer": {},
}


def causal_group_for(sport: str, filter_id: str) -> str | None:
    groups = CORRELATION_GROUPS.get(sport, {})
    for group_id, members in groups.items():
        if filter_id in members:
            return group_id
    return None
