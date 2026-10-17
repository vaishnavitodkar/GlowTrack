-- GlowTrack account scoping, profile uniqueness, and local reminder settings.
-- Duplicate skin_profiles rows are merged only when assessment and goal
-- values are complementary or identical; conflicts and dependent foreign keys
-- stop the migration without changing those rows.

-- Manual products have no catalog product_id. This is a no-op when the column
-- is already nullable.
alter table public.user_products alter column product_id drop not null;

-- Keep one canonical skin profile for each account before enforcing uniqueness.
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
    select 1 from public.skin_profiles where user_id is not null group by user_id having count(*) > 1
  ) and exists (
    select 1 from pg_constraint
    where contype = 'f' and confrelid = 'public.skin_profiles'::regclass
  ) then
    raise exception 'A table references skin_profiles rows. Inspect those relationships before consolidating duplicate profiles.';
  end if;

  if exists (
    select 1 from public.skin_profiles where user_id is not null group by user_id having count(*) > 1
  ) and exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'skin_profiles'
      and column_name not in ('id', 'user_id', 'skin_type', 'reacts_easily', 'concerns',
        'past_breakout_reaction', 'has_existing_routine', 'goal', 'created_at', 'updated_at',
        'assessment_submitted_at')
  ) then
    raise exception 'skin_profiles has additional columns not covered by the safe duplicate merge. Inspect the schema and preserve those values before applying this migration.';
  end if;

  if exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct skin_type) filter (where skin_type is not null) > 1
  ) or exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct reacts_easily) filter (where reacts_easily is not null) > 1
  ) or exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct concerns) filter (where concerns is not null and cardinality(concerns) > 0) > 1
  ) or exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct past_breakout_reaction) filter (where past_breakout_reaction is not null) > 1
  ) or exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct has_existing_routine) filter (where has_existing_routine is not null) > 1
  ) or exists (
    select user_id from public.skin_profiles where user_id is not null group by user_id
    having count(distinct goal) filter (where goal is not null) > 1
  ) then
    raise exception 'Duplicate skin_profiles rows contain conflicting assessment or goal values. Review the duplicate diagnostic and reconcile those owners before applying this migration.';
  end if;

  if exists (
    select 1 from public.skin_profiles where user_id is not null group by user_id having count(*) > 1
  ) then
    with ranked as (
      select ctid, user_id,
        row_number() over (
          partition by user_id
          order by ((skin_type is not null)::int + (reacts_easily is not null)::int +
                    (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int +
                    (goal is not null)::int) desc, ctid
        ) as row_number
      from public.skin_profiles where user_id is not null
    )
    update public.skin_profiles as canonical
    set skin_type = coalesce(canonical.skin_type, (
          select value.skin_type from public.skin_profiles as value
          where value.user_id = canonical.user_id and value.skin_type is not null order by value.ctid limit 1
        )),
        reacts_easily = coalesce(canonical.reacts_easily, (
          select value.reacts_easily from public.skin_profiles as value
          where value.user_id = canonical.user_id and value.reacts_easily is not null order by value.ctid limit 1
        )),
        concerns = case
          when coalesce(cardinality(canonical.concerns), 0) > 0 then canonical.concerns
          else coalesce((
            select value.concerns from public.skin_profiles as value
            where value.user_id = canonical.user_id and coalesce(cardinality(value.concerns), 0) > 0 order by value.ctid limit 1
          ), canonical.concerns)
        end,
        past_breakout_reaction = coalesce(canonical.past_breakout_reaction, (
          select value.past_breakout_reaction from public.skin_profiles as value
          where value.user_id = canonical.user_id and value.past_breakout_reaction is not null order by value.ctid limit 1
        )),
        has_existing_routine = coalesce(canonical.has_existing_routine, (
          select value.has_existing_routine from public.skin_profiles as value
          where value.user_id = canonical.user_id and value.has_existing_routine is not null order by value.ctid limit 1
        )),
        goal = coalesce(canonical.goal, (
          select value.goal from public.skin_profiles as value
          where value.user_id = canonical.user_id and value.goal is not null order by value.ctid limit 1
        ))
    where canonical.ctid in (select ctid from ranked where row_number = 1);

    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'skin_profiles' and column_name = 'created_at') then
      execute $merge$update public.skin_profiles as canonical
        set created_at = (select min(value.created_at) from public.skin_profiles as value where value.user_id = canonical.user_id)
        where canonical.ctid in (select ctid from (select ctid, row_number() over (partition by user_id order by ((skin_type is not null)::int + (reacts_easily is not null)::int + (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int + (goal is not null)::int) desc, ctid) as ranked from public.skin_profiles where user_id is not null) as canonical_rows where row_number = 1)$merge$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'skin_profiles' and column_name = 'updated_at') then
      execute $merge$update public.skin_profiles as canonical
        set updated_at = (select max(value.updated_at) from public.skin_profiles as value where value.user_id = canonical.user_id)
        where canonical.ctid in (select ctid from (select ctid, row_number() over (partition by user_id order by ((skin_type is not null)::int + (reacts_easily is not null)::int + (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int + (goal is not null)::int) desc, ctid) as ranked from public.skin_profiles where user_id is not null) as canonical_rows where row_number = 1)$merge$;
    end if;
    if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'skin_profiles' and column_name = 'assessment_submitted_at') then
      execute $merge$update public.skin_profiles as canonical
        set assessment_submitted_at = coalesce(canonical.assessment_submitted_at, (select min(value.assessment_submitted_at) from public.skin_profiles as value where value.user_id = canonical.user_id))
        where canonical.ctid in (select ctid from (select ctid, row_number() over (partition by user_id order by ((skin_type is not null)::int + (reacts_easily is not null)::int + (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int + (goal is not null)::int) desc, ctid) as ranked from public.skin_profiles where user_id is not null) as canonical_rows where row_number = 1)$merge$;
    end if;

    with ranked as (
      select ctid, row_number() over (
        partition by user_id
        order by ((skin_type is not null)::int + (reacts_easily is not null)::int +
                  (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int +
                  (goal is not null)::int) desc, ctid
      ) as row_number
      from public.skin_profiles where user_id is not null
    )
    delete from public.skin_profiles as duplicate using ranked
    where duplicate.ctid = ranked.ctid and ranked.row_number > 1;
  end if;

  create unique index if not exists skin_profiles_user_id_uidx on public.skin_profiles (user_id);
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
