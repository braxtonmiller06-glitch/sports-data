-- atlas/schema_research.sql
--
-- Server-side homes for the two things a user accumulates by using Atlas:
-- the props they are tracking and the research they have saved.
--
-- Both lived in localStorage until now. That made them per-device and
-- unrecoverable: clearing site data, switching to a phone, or opening the app
-- in another browser lost the lot, with no copy anywhere. The UI said
-- "Tracking" and "Saved", which reads as a promise the storage could not keep.
--
-- Split out from schema.sql and schema_settings.sql for the same reason those
-- are split: this can be applied to a live database on its own.

/* -------------------------------------------------------- tracked props -- */

create table if not exists tracked_props (
    -- Client-generated and stable: player-market-side-line. The client needs
    -- to answer "is this tracked?" before any round trip, which it cannot do
    -- against a server-assigned id.
    id text not null,
    user_id uuid not null references auth.users (id) on delete cascade,

    subject text not null,
    market text not null,

    sport text,
    line numeric,
    odds text,
    -- The slate day this prop belongs to, not the day it was tracked.
    event_date date,

    added_at timestamptz not null default now(),

    -- Composite key rather than a surrogate: it makes "one row per prop per
    -- user" a constraint the database enforces instead of a rule the client
    -- remembers, and two users tracking the same prop stay independent.
    primary key (user_id, id)
);

create index if not exists idx_tracked_props_user_added
    on tracked_props (user_id, added_at desc);

/* ------------------------------------------------------- saved research -- */

create table if not exists saved_research (
    id text not null,
    user_id uuid not null references auth.users (id) on delete cascade,

    player_id text not null,
    player_name text not null,
    sport text not null,
    market text not null,
    market_label text not null,
    side text not null,
    line numeric not null,
    odds text,
    event_date date,

    -- Which surface it was saved from, so the research flow can group by origin.
    source text not null,
    -- Deep link that restores the exact Player Lookup state. Stored rather than
    -- rebuilt so an old row still opens correctly after the URL format changes.
    href text not null,

    saved_at timestamptz not null default now(),

    primary key (user_id, id),

    constraint chk_saved_research_source
        check (source in ('filter-plays', 'player-lookup'))
);

create index if not exists idx_saved_research_user_saved
    on saved_research (user_id, saved_at desc);

/* ------------------------------------------------------------------- RLS -- */

-- Both tables are strictly per-user. Unlike user_settings these do get a
-- delete policy: untracking a prop and removing saved research are ordinary
-- actions, not account deletion.
--
-- auth.uid() is wrapped in a scalar subquery so it evaluates once per
-- statement rather than once per row (auth_rls_initplan).

alter table tracked_props enable row level security;

drop policy if exists "tracked props are self-readable" on tracked_props;
create policy "tracked props are self-readable"
    on tracked_props for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "tracked props are self-insertable" on tracked_props;
create policy "tracked props are self-insertable"
    on tracked_props for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "tracked props are self-updatable" on tracked_props;
create policy "tracked props are self-updatable"
    on tracked_props for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "tracked props are self-deletable" on tracked_props;
create policy "tracked props are self-deletable"
    on tracked_props for delete
    to authenticated
    using ((select auth.uid()) = user_id);

alter table saved_research enable row level security;

drop policy if exists "saved research is self-readable" on saved_research;
create policy "saved research is self-readable"
    on saved_research for select
    to authenticated
    using ((select auth.uid()) = user_id);

drop policy if exists "saved research is self-insertable" on saved_research;
create policy "saved research is self-insertable"
    on saved_research for insert
    to authenticated
    with check ((select auth.uid()) = user_id);

drop policy if exists "saved research is self-updatable" on saved_research;
create policy "saved research is self-updatable"
    on saved_research for update
    to authenticated
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);

drop policy if exists "saved research is self-deletable" on saved_research;
create policy "saved research is self-deletable"
    on saved_research for delete
    to authenticated
    using ((select auth.uid()) = user_id);

revoke all on public.tracked_props from anon, authenticated;
grant select, insert, update, delete on public.tracked_props to authenticated;

revoke all on public.saved_research from anon, authenticated;
grant select, insert, update, delete on public.saved_research to authenticated;
