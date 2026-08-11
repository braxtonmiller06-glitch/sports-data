#!/usr/bin/env python3
"""Discover what a BALLDONTLIE key can actually do.

The endpoint registry in backend/fetchers/balldontlie.py was written without
access to the live API -- the build environment has no egress to
api.balldontlie.io -- so every path and tier in it is a hypothesis. This script
is the experiment: it calls each registered endpoint once with your real key and
reports what came back.

Two things it settles that nothing else can:

  1. Which leagues exist. NBA is served from /v1 and the others from
     /<league>/v1, and WNBA coverage in particular has never been confirmed --
     which matters because NBA and WNBA are the two sports Atlas implements.
  2. What your plan includes. A 401/403 here is not a bug, it is the answer:
     that endpoint is above your tier.

Usage:
    export BALLDONTLIE_API_KEY=...
    export BALLDONTLIE_TIER=free|all-star|goat     # throttles to the plan
    python scripts/probe_balldontlie.py            # probe everything
    python scripts/probe_balldontlie.py nba wnba   # probe named leagues
    python scripts/probe_balldontlie.py --json     # machine-readable output

Every call is throttled to the plan's rate limit, so a full run on the free
tier (5 req/min) takes several minutes by design. Probe one league at a time if
that matters.
"""
import json
import sys
from typing import Any

sys.path.insert(0, __file__.rsplit("/scripts/", 1)[0])

from backend.fetchers import balldontlie as bdl  # noqa: E402

# Minimal arguments for endpoints that reject an empty query. Kept tiny on
# purpose: the probe is checking reachability and shape, not pulling data.
SAMPLE_PARAMS: dict[str, dict[str, Any]] = {
    "players": {"per_page": 1},
    "games": {"per_page": 1},
    "teams": {},
    "active_players": {"per_page": 1},
    "leaders": {"stat_type": "pts"},
}

OK, DENIED, MISSING, ERROR = "OK", "DENIED", "MISSING", "ERROR"


def probe_one(league: str, ep: bdl.Endpoint) -> dict[str, Any]:
    params = SAMPLE_PARAMS.get(ep.name, {"per_page": 1})
    result: dict[str, Any] = {
        "league": league,
        "endpoint": ep.name,
        "path": f"{bdl.LEAGUE_PREFIX.get(league, '?')}{ep.path}",
        "believed_min_tier": ep.min_tier,
    }
    try:
        payload = bdl.fetch(league, ep.name, params)
    except bdl.BallDontLieAuthError as exc:
        # The informative outcome: the route exists, the plan does not reach it.
        result.update(status=DENIED, detail=f"{exc.status_code}", sample_keys=[])
        return result
    except bdl.BallDontLieError as exc:
        status = MISSING if getattr(exc, "status_code", None) == 404 else ERROR
        result.update(status=status, detail=str(exc)[:160], sample_keys=[])
        return result

    rows = payload.get("data")
    first = rows[0] if isinstance(rows, list) and rows else {}
    result.update(
        status=OK,
        detail=f"{len(rows) if isinstance(rows, list) else '?'} row(s)",
        # The field names are the useful part: they are what a normalizer has
        # to map, and guessing them is what produced the existing unverified
        # client in atlas/balldontlie.py.
        sample_keys=sorted(first.keys()) if isinstance(first, dict) else [],
    )
    return result


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv

    leagues = args or list(bdl.LEAGUE_PREFIX)
    unknown = [lg for lg in leagues if lg not in bdl.LEAGUE_PREFIX]
    if unknown:
        print(f"unknown league(s): {', '.join(unknown)}", file=sys.stderr)
        print(f"known: {', '.join(bdl.LEAGUE_PREFIX)}", file=sys.stderr)
        return 2

    try:
        bdl.api_key()
    except bdl.BallDontLieError as exc:
        print(f"{exc}\n\nSet it and re-run:\n    export BALLDONTLIE_API_KEY=...", file=sys.stderr)
        return 2

    results = []
    for league in leagues:
        if not as_json:
            print(f"\n=== {league.upper()}  ({bdl.LEAGUE_PREFIX[league]}) ===", flush=True)
        for ep in bdl.ENDPOINTS.get(league, ()):
            row = probe_one(league, ep)
            results.append(row)
            if not as_json:
                print(
                    f"  {row['status']:<7} {ep.name:<18} {row['path']:<28} {row['detail']}",
                    flush=True,
                )
                if row["sample_keys"]:
                    print(f"          fields: {', '.join(row['sample_keys'][:14])}", flush=True)

    if as_json:
        print(json.dumps(results, indent=2))
        return 0

    ok = [r for r in results if r["status"] == OK]
    denied = [r for r in results if r["status"] == DENIED]
    broken = [r for r in results if r["status"] in (MISSING, ERROR)]

    print(f"\n{'=' * 60}")
    print(f"reachable on this key : {len(ok)}")
    print(f"above this plan       : {len(denied)}")
    print(f"wrong path / error    : {len(broken)}")

    if broken:
        print("\nThese need the registry corrected in backend/fetchers/balldontlie.py:")
        for r in broken:
            print(f"  {r['league']}/{r['endpoint']}  {r['path']}  -> {r['detail']}")

    working_leagues = sorted({r["league"] for r in ok})
    print(f"\nleagues with at least one working endpoint: {', '.join(working_leagues) or 'none'}")
    if "wnba" not in working_leagues:
        print(
            "\nNote: no WNBA endpoint answered. Atlas implements NBA and WNBA, so if\n"
            "WNBA is genuinely absent from BALLDONTLIE that sport needs a different\n"
            "source rather than a corrected path."
        )
    return 0 if not broken else 1


if __name__ == "__main__":
    raise SystemExit(main())
