"""TRANSITION THREAT -- which team is better when the game breaks open?

Same gap as tactical_mismatch.py: counterattack frequency, progressive
carries, and transition xG all require paid tracking data with no free
equivalent. Permanent honest stub until such a source exists.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput

RICH_PATHS = ["team.counterattack_xg", "team.progressive_carries", "opponent.defensive_transition_rating"]


class TransitionThreatFilter(Filter, MissingDataMixin):
    filter_id = "soccer_transition_threat"
    sport = "soccer"
    name = "Transition Threat"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, RICH_PATHS) == 0.0:
            return self.insufficient_data(
                "no counterattack/progressive-carry tracking data source is wired in -- needs a paid provider, "
                "not available free"
            )
        return self.insufficient_data("partial transition data present but not enough to score confidently")
