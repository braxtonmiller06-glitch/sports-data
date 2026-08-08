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

-- Cross-run de-duplication. atlas/loadplays.py de-dupes within a single file,
-- but nothing stopped the same file being loaded twice -- which double-counts
-- every pick in the record and the P/L. This is the guard that actually holds.
--
-- The settles_at date is part of the key on purpose: an MLB series plays the
-- same two teams three nights running, and those are three different picks,
-- not one repeated. NULLS NOT DISTINCT so that two picks with a null `line`
-- (moneylines) still collide -- by default Postgres treats each NULL as
-- unique, which would let every moneyline through twice.
--
-- If this fails to create, the table already contains duplicates. Find them:
--   select sport, home_team, away_team, market_type, subject, selection_side,
--          line, settles_at::date, count(*)
--     from picks group by 1,2,3,4,5,6,7,8 having count(*) > 1;
create unique index if not exists uq_picks_dedupe
    on picks (sport, home_team, away_team, market_type, subject,
              selection_side, line, (settles_at::date))
    nulls not distinct;

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
-- SECURITY DEFINER runs as the function's owner (a superuser), so an
-- unqualified name inside it resolves against the *caller's* search_path.
-- Anyone who can create objects in a schema earlier in that path can shadow
-- a table or operator here and have it execute with the owner's privileges.
-- Pinning search_path closes that; Supabase's database linter flags exactly
-- this ("function_search_path_mutable"). pg_temp goes last because it is
-- otherwise searched first and is writable by any session.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
    insert into public.profiles (id, email)
    values (new.id, new.email)
    on conflict (id) do nothing;
    return new;
end;
$$;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user();

/* ------------------------------------------------------------ entitlement -- */

-- Subscription state for the calling user, or 'free' when no row exists.
--
-- SECURITY DEFINER so the lookup does not itself depend on the profiles
-- SELECT policy: an entitlement check that can be starved of rows by the
-- caller's own RLS is not an entitlement check.
create or replace function public.current_subscription_status()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select coalesce(
        (select p.subscription_status
           from public.profiles p
          where p.id = (select auth.uid())),
        'free'
    );
$$;

-- The single definition of "has paid access". Every entitlement decision in
-- the database goes through this, so repricing a tier is a change here rather
-- than a search across policies.
create or replace function public.has_paid_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select public.current_subscription_status() = 'active';
$$;

revoke all on function public.current_subscription_status() from public, anon;
revoke all on function public.has_paid_access() from public, anon;
grant execute on function public.has_paid_access() to authenticated;

/* ------------------------------------------------------------------- RLS -- */

-- Policies are dropped first so this file is re-runnable against a live
-- database. Postgres has no CREATE POLICY IF NOT EXISTS, and a schema file
-- that errors on second run is a schema file nobody applies.
--
-- auth.uid() is wrapped in a scalar subquery throughout: called bare it is
-- re-evaluated once per row, which is what Supabase's auth_rls_initplan lint
-- flags. `to authenticated` replaces the older `auth.role() = 'authenticated'`
-- test -- the role is matched by the policy's target rather than by a
-- per-row expression.

alter table profiles enable row level security;

drop policy if exists "profiles are self-readable" on profiles;
create policy "profiles are self-readable"
    on profiles for select
    to authenticated
    using ((select auth.uid()) = id);

-- A user may correct their own email and nothing else.
--
-- The subscription columns are withheld by the column grant below, not by
-- this policy. RLS gates rows, never columns: without the grant, "update your
-- own row" would include "set your own subscription_status to active", which
-- is the whole paywall.
drop policy if exists "profiles are self-updatable" on profiles;
create policy "profiles are self-updatable"
    on profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

revoke all on public.profiles from anon, authenticated;
-- Stripe identifiers are deliberately absent: the browser never needs them,
-- and they are useful to an attacker enumerating a billing account.
grant select (id, email, subscription_status, created_at, updated_at)
    on public.profiles to authenticated;
grant update (email) on public.profiles to authenticated;

-- Picks: every row is readable by any signed-in user, except the premium
-- research breakdown.
alter table picks enable row level security;

drop policy if exists "picks are readable by authenticated users" on picks;
create policy "picks are readable by authenticated users"
    on picks for select
    to authenticated
    using (true);

-- Writes are service-role only. The service role bypasses RLS, so the absence
-- of a write policy already blocks users; these revokes state it at the
-- privilege level too, so a future permissive policy cannot silently widen
-- what a user may write.
revoke all on public.picks from anon, authenticated;
grant select (
    id, sport, market_type, subject, home_team, away_team, external_event_id,
    line, selection_side, three_way, decimal_odds, model_probability,
    market_probability, edge, confidence, verdict, stake, settles_at,
    created_at, closing_decimal_odds, clv_pct, graded, result, graded_at
) on public.picks to authenticated;

-- `filters` is deliberately excluded from that grant. It is the per-filter
-- research breakdown -- the thing a subscription actually buys. Column-level
-- privileges are the only enforcement that survives the client: a free user
-- asking PostgREST for select=filters gets a permission error, not a row.
-- The paid path is the function below.
create or replace function public.pick_filters(p_pick_id bigint)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
    v_filters jsonb;
begin
    -- 42501 = insufficient_privilege. PostgREST maps it to 403, which is what
    -- the caller should see: the row exists, the entitlement does not.
    if (select auth.uid()) is null then
        raise exception 'authentication required'
            using errcode = '42501';
    end if;

    if not public.has_paid_access() then
        raise exception 'subscription required'
            using errcode = '42501';
    end if;

    select p.filters into v_filters
      from public.picks p
     where p.id = p_pick_id;

    return v_filters;
end;
$$;

revoke all on function public.pick_filters(bigint) from public, anon;
grant execute on function public.pick_filters(bigint) to authenticated;

/* ----------------------------------------------------------------- views -- */

-- A view executes with its owner's privileges unless created with
-- security_invoker, which means a view over an RLS-protected table hands out
-- exactly what the policy underneath was written to withhold. Supabase's
-- database linter reports this as `security_definer_view`.
--
-- This runs over every view in `public` rather than a named list on purpose:
-- the live database contains at least one view that is not defined in this
-- repository (public.graded_picks), and an object nobody can see in review is
-- precisely the one that needs the guarantee.
do $$
declare
    v record;
begin
    for v in select viewname from pg_views where schemaname = 'public'
    loop
        execute format('alter view public.%I set (security_invoker = on)', v.viewname);
    end loop;
end
$$;
