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
    home_team text not null,
    away_team text not null,

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

    -- Populated later by atlas/closing_lines.py, ~15 min before game start.
    -- Both null until then -- that's the documented reason clv_pct (and the
    -- site's CLV column) is empty until that job has run for a given pick.
    closing_decimal_odds numeric,
    clv_pct numeric,

    graded boolean not null default false,
    result text,
    graded_at timestamptz,

    -- Per-filter breakdown (SevenFieldOutput list, see backend/engine/base_filter.py)
    -- for the dashboard's expandable filter view. NOT populated by anything in
    -- this repo yet -- the engine writes its FilterFiring rows to its own
    -- SQLAlchemy DB (backend/engine/models.py), not to Supabase. Whatever
    -- produces the "day's plays" JSON loadplays.py consumes needs to include
    -- this, or a separate sync step needs to copy FilterFiring -> here. Until
    -- then this column stays null and the dashboard shows "breakdown not
    -- available" rather than fabricate filter data.
    filters jsonb,

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

-- One row per Supabase auth user, tracking subscription state for the
-- frontend's paywall gating. subscription_status is driven by Stripe
-- webhooks (backend/routes/billing.py, not yet built) -- defaults to
-- 'free' so the column has a sane value before billing exists.
create table if not exists profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    email text not null,
    subscription_status text not null default 'free',
    stripe_customer_id text,
    stripe_subscription_id text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint chk_subscription_status
        check (subscription_status in ('free', 'active', 'past_due', 'canceled'))
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email);
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

-- Row Level Security: users can only ever read their own profile.
alter table profiles enable row level security;

create policy "profiles are self-readable"
    on profiles for select
    using (auth.uid() = id);

-- Picks: readable by anyone signed in. The frontend itself decides how much
-- of a pick to *show* based on profiles.subscription_status (free vs paid
-- tiers) -- this policy only gates "signed in at all" at the database level.
-- Tighten this (e.g. hide `filters` for free users at the RLS level too)
-- once billing is live and that tradeoff matters for real.
alter table picks enable row level security;

create policy "picks are readable by authenticated users"
    on picks for select
    using (auth.role() = 'authenticated');
