"""HOME/AWAY & TRAVEL PROFILE -- does location materially change
performance? Prefer underlying performance splits over raw W/D/L records.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

GOAL_DIFF_SPREAD = 0.6


class HomeAwayTravelFilter(Filter, MissingDataMixin):
    filter_id = "soccer_home_away_travel"
    sport = "soccer"
    name = "Home/Away & Travel Profile"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        is_home = ctx.get("game.is_home") if ctx.has("game.is_home") else None
        if is_home is None:
            return self.insufficient_data("no home/away designation for this fixture")

        record_key = "home_record" if is_home else "away_record"
        record = ctx.data.get("team", {}).get(record_key)
        if not record:
            return self.insufficient_data(f"missing {record_key} split data")

        games = record.get("wins", 0) + record.get("draws", 0) + record.get("losses", 0)
        if games == 0:
            return self.insufficient_data(f"no games played in the {record_key} split yet")

        goal_diff_per_game = (record.get("goals_scored", 0) - record.get("goals_conceded", 0)) / games
        overall_gd = ctx.data.get("team", {}).get("season_goal_diff_per_game", 0.0)
        strength = max(-1.0, min(1.0, (goal_diff_per_game - overall_gd) / GOAL_DIFF_SPREAD))

        location = "home" if is_home else "away"
        evidence = [
            f"{location} goal difference/game: {goal_diff_per_game:+.2f} over {games} games "
            f"vs overall season {overall_gd:+.2f}"
        ]

        red_flags = []
        if games < 5:
            red_flags.append(f"small sample: only {games} {location} games this season")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=50.0 if games >= 5 else 30.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
