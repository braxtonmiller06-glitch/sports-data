"""GAME-SCRIPT ENGINE -- what game script does the matchup create?
Leading teams lean rush-heavy; trailing teams lean pass-heavy.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength, strength_from_z

CORE_PATHS = ["game.spread"]
SPREAD_SPREAD = 7.0  # points of spread treated as one "unit"

_PASS_STATS = {"pass_yards", "receptions", "receiving_yards", "receiving_touchdowns", "completions"}
_RUSH_STATS = {"rush_yards", "rushing_touchdowns", "carries"}


class GameScriptFilter(Filter, MissingDataMixin):
    filter_id = "nfl_game_script"
    sport = "nfl"
    name = "Game-Script Engine"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        stat = ctx.get("model.stat")
        if stat not in _PASS_STATS and stat not in _RUSH_STATS:
            return self.insufficient_data(f"no game-script mapping for market stat '{stat}'")

        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("missing game spread")

        spread = ctx.get("game.spread")  # positive = this team favored
        script_z = spread / SPREAD_SPREAD

        if stat in _RUSH_STATS:
            # favored (positive spread) -> leads more -> runs more -> OVER for rush volume
            strength = strength_from_z(script_z)
            mechanism = "favorites protect leads by running more"
        else:
            # favored teams pass less when protecting a lead; underdogs pass more chasing
            strength = strength_from_z(-script_z)
            mechanism = "trailing teams abandon the run and pass more to catch up"

        evidence = [f"spread {spread:+.1f} ({mechanism})"]

        red_flags = []
        total = ctx.get("game.total")
        if total is not None and total < 40.0:
            red_flags.append(f"low game total ({total:.1f}) -- overall play volume may be suppressed regardless of script")
            strength *= 0.7

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=55.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
