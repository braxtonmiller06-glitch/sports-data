"""BALLPARK / WEATHER INTERACTION -- does the environment amplify or
suppress the matchup? Park factor is real and API-Sports-adjacent data;
live wind/weather has no fetcher wired in yet (same gap as NFL's).
"""
from backend.engine.base_filter import Filter, MissingDataMixin, PickContext, SevenFieldOutput
from backend.engine.scoring_utils import signal_from_strength

PARK_FACTOR_NEUTRAL = 100.0
PARK_FACTOR_SPREAD = 15.0
WIND_OUT_THRESHOLD = 12.0


class BallparkWeatherFilter(Filter, MissingDataMixin):
    filter_id = "mlb_ballpark_weather"
    sport = "mlb"
    name = "Ballpark / Weather Interaction"
    category = "context"

    def analyze(self, ctx: PickContext) -> SevenFieldOutput:
        if not ctx.has("ballpark.park_factor"):
            return self.insufficient_data("no ballpark park-factor data available")

        park_factor = ctx.get("ballpark.park_factor")
        strength = max(-1.0, min(1.0, (park_factor - PARK_FACTOR_NEUTRAL) / PARK_FACTOR_SPREAD))
        evidence = [f"park factor {park_factor:.0f} (100 = neutral)"]

        red_flags = []
        if ctx.get("ballpark.is_dome"):
            evidence.append("dome -- weather is not a factor, park factor alone drives this signal")
        elif ctx.has("weather.wind_mph") and ctx.has("weather.wind_direction"):
            wind = ctx.get("weather.wind_mph")
            direction = ctx.get("weather.wind_direction")
            if wind >= WIND_OUT_THRESHOLD and direction == "out":
                strength = min(strength + 0.3, 1.0)
                evidence.append(f"wind {wind:.0f} mph blowing out")
            elif wind >= WIND_OUT_THRESHOLD and direction == "in":
                strength = max(strength - 0.3, -1.0)
                evidence.append(f"wind {wind:.0f} mph blowing in")
        else:
            red_flags.append("no live wind data available -- park-factor read only")

        return SevenFieldOutput(
            filter_id=self.filter_id,
            signal=signal_from_strength(strength),
            strength=strength,
            confidence=45.0 if red_flags else 60.0,
            evidence=evidence,
            red_flags=red_flags,
            historical_accuracy=self.historical_accuracy,
            current_weight=self.current_weight,
        )
