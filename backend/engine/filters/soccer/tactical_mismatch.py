"""TACTICAL / FORMATION MISMATCH -- does one team's structure attack the
other's weakness?

No free data source exists for formations, pressing intensity, buildup
style, or defensive block shape -- that's paid-provider territory (Opta/
StatsBomb). This filter is a permanent honest stub until such a source is
wired in: it always reports insufficient data rather than fabricate a
tactical read from box-score stats that can't actually support one.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput

RICH_PATHS = ["team.formation", "team.press_intensity", "opponent.formation", "opponent.buildup_style"]


class TacticalMismatchFilter(Filter, MissingDataMixin):
    filter_id = "soccer_tactical_mismatch"
    sport = "soccer"
    name = "Tactical / Formation Mismatch"
    category = "matchup"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, RICH_PATHS) == 0.0:
            return self.insufficient_data(
                "no formation/pressing/buildup-style data source is wired in -- this needs a paid provider "
                "(Opta/StatsBomb-class data), not available free"
            )
        # Left as a real branch for if/when richer data is added -- not reachable today.
        return self.insufficient_data("partial tactical data present but not enough to score a mismatch confidently")
