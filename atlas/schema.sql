-- atlas/schema.sql
--
-- No Supabase picks table existed before this task, so this defines one.
-- loadplays.py's local validate_pick() mirrors these constraints exactly --
-- keep the two in sync if either changes.
--
-- external_event_id is nullable by design: the spec says grading falls
-- back to fuzzy team-name matching without it, which only makes sense if
-- the column tolerates NULL. loadplays.py still tries to populate it for
-- every pick and prints a warning (not a hard failure) when it can't find
-- a BALLDONTLIE match.

create table if not exists picks (
    id bigint generated always as identity primary key,

    sport text not null,
    market_type text not null,
    subject text not null,

    external_event_id text,

    line numeric,
    selection_side text not null,
    three_way boolean not null default false,

    decimal_odds numeric not null,
    model_probability numeric not null,
    market_probability numeric not null,
    edge numeric not null,
    confidence numeric not null,
    verdict text not null,
    stake numeric,

    settles_at timestamptz not null,
    created_at timestamptz not null default now(),

    graded boolean not null default false,
    result text,
    graded_at timestamptz,

    constraint chk_selection_side_two_way
        check (three_way or selection_side in ('home', 'away', 'over', 'under')),
    constraint chk_selection_side_three_way
        check (not three_way or selection_side in ('home', 'draw', 'away')),
    constraint chk_decimal_odds_positive
        check (decimal_odds > 1.0),
    constraint chk_model_probability_range
        check (model_probability >= 0.0 and model_probability <= 1.0),
    constraint chk_market_probability_range
        check (market_probability >= 0.0 and market_probability <= 1.0),
    constraint chk_verdict
        check (verdict in ('PASS', 'LEAN', 'PLAYABLE', 'BET')),
    constraint chk_result
        check (result is null or result in ('WIN', 'LOSS', 'PUSH'))
);

create index if not exists idx_picks_external_event_id on picks (external_event_id);
create index if not exists idx_picks_settles_at on picks (settles_at);
