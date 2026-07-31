"""WEATHER & ENVIRONMENT -- does the environment materially change the game?

No live weather fetcher is wired into the app yet (the spec's stack doesn't
include one). Open-Meteo (free, no API key) is the obvious fit when that
gets built -- this filter is written against the `weather` context block it
would populate, and degrades to insufficient-data until then.
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

CORE_PATHS = ["weather.is_dome"]
WIND_THRESHOLD_MPH = 15.0
PRECIP_THRESHOLD = 0.3  # inches/hour-equivalent
COLD_THRESHOLD_F = 25.0

_PASS_STATS = {"pass_yards", "receptions", "receiving_yards", "receiving_touchdowns", "completions"}
_KICKING_STATS = {"field_goals"}


class WeatherEnvironmentFilter(Filter, MissingDataMixin):
    filter_id = "nfl_weather_environment"
    sport = "nfl"
    name = "Weather & Environment"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if self.data_completeness(ctx, CORE_PATHS) < 1.0:
            return self.insufficient_data("no weather data source wired in yet (needs a live weather fetcher)")

        if ctx.get("weather.is_dome"):
            return self.void("game is in a dome -- weather is not a factor")

        stat = ctx.get("model.stat")
        wind = ctx.get("weather.wind_mph", 0.0)
        precip = ctx.get("weather.precip", 0.0)
        temp = ctx.get("weather.temp_f", 60.0)

        strength = 0.0
        evidence = []
        mechanisms = []

        if stat in _PASS_STATS and wind >= WIND_THRESHOLD_MPH:
            strength -= min((wind - WIND_THRESHOLD_MPH) / 15.0, 1.0)
            mechanisms.append(f"wind {wind:.0f} mph disrupts passing accuracy/deep ball")
        if precip >= PRECIP_THRESHOLD:
            strength -= 0.3
            mechanisms.append(f"precipitation ({precip:.1f}) affects ball security and footing")
        if stat in _KICKING_STATS and (wind >= WIND_THRESHOLD_MPH or temp <= COLD_THRESHOLD_F):
            strength -= 0.4
            mechanisms.append("wind/cold reduces field-goal range and accuracy")

        if not mechanisms:
            return self.void("no specific weather mechanism affects this market's stat")

        strength = max(-1.0, strength)
        evidence.append("; ".join(mechanisms))

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=55.0,
            evidence=evidence,
            red_flags=[],
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
