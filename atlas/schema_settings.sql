-- atlas/schema_settings.sql
--
-- Per-user preferences for the frontend Settings page (frontend/src/pages/Settings.tsx).
-- Split out from schema.sql so it can be applied to an existing database without
-- re-running the picks/profiles DDL.
--
-- Nothing here is financial: `bankroll` is a number the user types so the app can
-- turn "1 unit" into a figure they recognise. Atlas holds no funds and this column
-- is never reconciled against anything real.

create table if not exists user_settings (
    user_id uuid primary key references auth.users (id) on delete cascade,

    -- appearance
    theme text not null default 'system',
    reduce_motion boolean not null default false,

    -- odds display
    odds_format text not null default 'american',
    show_implied boolean not null default true,

    -- bankroll. unit_value is a percent when unit_mode = 'percent', otherwise a
    -- flat amount in `currency`. Kept as one column rather than two so there is
    -- no way for the pair to disagree about which one is authoritative.
    bankroll numeric not null default 0,
    unit_mode text not null default 'percent',
    unit_value numeric not null default 1,
    max_bet_units numeric not null default 3,
    currency text not null default 'USD',

    -- tracking
    auto_track boolean not null default true,
    compound_bankroll boolean not null default false,
    -- null = no limit set. Deliberately nullable rather than 0-means-off, because
    -- 0 is a legitimate (if severe) limit and shouldn't be indistinguishable.
    weekly_loss_limit_units numeric,

    -- defaults
    default_sport text,
    default_timeframe text not null default 'last10',
    hide_thin_samples boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint chk_theme
        check (theme in ('light', 'dark', 'system')),
    constraint chk_odds_format
        check (odds_format in ('american', 'decimal', 'fractional')),
    constraint chk_unit_mode
        check (unit_mode in ('percent', 'flat')),
    constraint chk_currency
        check (currency in ('USD', 'GBP', 'EUR', 'CAD', 'AUD')),
    constraint chk_default_timeframe
        check (default_timeframe in ('last5', 'last10', 'last20', 'season')),

    -- Sanity bounds. A 100% unit size or a negative bankroll is a typo, not a
    -- preference, and letting either through means the unit calculator prints
    -- nonsense somewhere far away from here.
    constraint chk_bankroll_nonneg     check (bankroll >= 0),
    constraint chk_unit_value_positive check (unit_value > 0),
    constraint chk_unit_percent_range  check (unit_mode <> 'percent' or unit_value <= 25),
    constraint chk_max_bet_units       check (max_bet_units >= 1 and max_bet_units <= 25),
    constraint chk_weekly_limit        check (weekly_loss_limit_units is null
                                              or weekly_loss_limit_units >= 0)
);

create or replace function public.touch_user_settings()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create or replace trigger user_settings_touch
    before update on user_settings
    for each row execute procedure public.touch_user_settings();

-- Give every new signup a settings row so the app reads defaults from one place
-- (the column defaults above) rather than duplicating them in TypeScript.
-- Existing users get a row on first save via the frontend's upsert.
create or replace function public.handle_new_user_settings()
returns trigger as $$
begin
    insert into public.user_settings (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
    return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created_settings
    after insert on auth.users
    for each row execute procedure public.handle_new_user_settings();

-- Row Level Security: a user can only ever see or change their own row.
-- Note there is deliberately no delete policy -- settings die with the user via
-- the on delete cascade, and there is no product reason to delete them alone.
alter table user_settings enable row level security;

create policy "settings are self-readable"
    on user_settings for select
    using (auth.uid() = user_id);

create policy "settings are self-insertable"
    on user_settings for insert
    with check (auth.uid() = user_id);

create policy "settings are self-updatable"
    on user_settings for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
