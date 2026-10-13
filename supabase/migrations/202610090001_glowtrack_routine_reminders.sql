-- GlowTrack account scoping, profile uniqueness, and local reminder settings.
-- This migration deliberately does not delete or rewrite existing user data.

-- Manual products have no catalog product_id. This is a no-op when the column
-- is already nullable.
alter table public.user_products alter column product_id drop not null;

-- The app's user_id conflict upserts require a unique user_id. Abort without
-- changing profile rows if duplicates exist; inspect/backup/reconcile them
-- before rerunning this migration.
do $$
declare
  user_id_attnum smallint;
begin
  select attnum into user_id_attnum
  from pg_attribute
  where attrelid = 'public.skin_profiles'::regclass
    and attname = 'user_id'
    and not attisdropped;

  if exists (
    select 1
    from pg_index
    where indrelid = 'public.skin_profiles'::regclass
      and indisunique
      and indisvalid
      and indpred is null
      and indexprs is null
      and indnkeyatts = 1
      and indkey[0] = user_id_attnum
  ) then
    -- A primary key, unique constraint, or standalone unique index already
    -- supports the app's ON CONFLICT (user_id) upserts.
    return;
  end if;

  if exists (
    select 1 from public.skin_profiles
    where user_id is not null
    group by user_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate skin_profiles.user_id values exist. Back up and reconcile these rows before applying the unique index.';
  end if;
  create unique index if not exists skin_profiles_user_id_uidx
    on public.skin_profiles (user_id);
end
$$;

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  am_enabled boolean not null default false,
  am_time time not null default '08:00',
  pm_enabled boolean not null default false,
  pm_time time not null default '21:30',
  updated_at timestamptz not null default now()
);

alter table public.reminder_preferences
  add column if not exists am_enabled boolean not null default false,
  add column if not exists am_time time not null default '08:00',
  add column if not exists pm_enabled boolean not null default false,
  add column if not exists pm_time time not null default '21:30',
  add column if not exists updated_at timestamptz not null default now();

-- Add owner access plus a restrictive owner guard to every private user table.
-- This retains existing policies while ensuring none can expose another user's
-- rows. Catalog products remain outside this list and can be shared/read-only.
do $$
declare
  owned_table record;
begin
  for owned_table in
    select * from (values
      ('profiles', 'id'),
      ('skin_profiles', 'user_id'),
      ('user_products', 'user_id'),
      ('skin_check_ins', 'user_id'),
      ('check_ins', 'user_id'),
      ('streaks', 'user_id'),
      ('reminder_preferences', 'user_id')
    ) as owned(tablename, user_column)
  loop
    execute format('alter table public.%I enable row level security', owned_table.tablename);
    execute format('drop policy if exists glowtrack_owner_guard on public.%I', owned_table.tablename);
    execute format(
      'create policy glowtrack_owner_guard on public.%I as restrictive for all to public using (auth.uid() = %I) with check (auth.uid() = %I)',
      owned_table.tablename, owned_table.user_column, owned_table.user_column
    );
    execute format('drop policy if exists glowtrack_owner_access on public.%I', owned_table.tablename);
    execute format(
      'create policy glowtrack_owner_access on public.%I as permissive for all to authenticated using (auth.uid() = %I) with check (auth.uid() = %I)',
      owned_table.tablename, owned_table.user_column, owned_table.user_column
    );
  end loop;
end
$$;
