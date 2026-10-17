-- Consolidate complementary legacy assessment/goal rows, then enforce one
-- immutable skincare assessment per authenticated user. This fails closed if
-- values conflict or another table references a row that would be removed.
do $$
begin
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
    select user_id
    from public.skin_profiles
    where user_id is not null
    group by user_id
    having count(*) filter (where skin_type is not null) > 1
       and count(distinct skin_type) filter (where skin_type is not null) > 1
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
end
$$;

do $$
begin
  if exists (
    select 1 from public.skin_profiles
    where user_id is not null
    group by user_id having count(*) > 1
  ) then
    with ranked as (
      select ctid, user_id,
        row_number() over (
          partition by user_id
          order by ((skin_type is not null)::int + (reacts_easily is not null)::int +
                    (past_breakout_reaction is not null)::int + (has_existing_routine is not null)::int +
                    (goal is not null)::int) desc,
                   ctid
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
    delete from public.skin_profiles as duplicate
    using ranked
    where duplicate.ctid = ranked.ctid and ranked.row_number > 1;
  end if;
end
$$;

create unique index if not exists skin_profiles_user_id_uidx
  on public.skin_profiles (user_id);

alter table public.skin_profiles
  add column if not exists assessment_submitted_at timestamptz;

update public.skin_profiles
set assessment_submitted_at = coalesce(assessment_submitted_at, now())
where skin_type is not null or goal is not null;

alter table public.skin_profiles enable row level security;
drop policy if exists glowtrack_assessment_owner_guard on public.skin_profiles;
create policy glowtrack_assessment_owner_guard
  on public.skin_profiles as restrictive for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.guard_skin_assessment_once()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if auth.uid() is not null and auth.uid() <> new.user_id then
    raise exception 'Assessment owner must match the authenticated user.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.skin_type is null or new.reacts_easily is null
       or new.past_breakout_reaction is null or new.has_existing_routine is null
       or coalesce(array_length(new.concerns, 1), 0) = 0 then
      raise exception 'Complete the required skincare assessment before saving.' using errcode = '23514';
    end if;
    new.assessment_submitted_at := coalesce(new.assessment_submitted_at, now());
  elsif old.assessment_submitted_at is not null and (
    new.skin_type is distinct from old.skin_type or
    new.reacts_easily is distinct from old.reacts_easily or
    new.concerns is distinct from old.concerns or
    new.past_breakout_reaction is distinct from old.past_breakout_reaction or
    new.has_existing_routine is distinct from old.has_existing_routine or
    new.assessment_submitted_at is distinct from old.assessment_submitted_at
  ) then
    raise exception 'A submitted skincare assessment cannot be changed.' using errcode = '23514';
  end if;

  return new;
end
$$;

drop trigger if exists guard_skin_assessment_once on public.skin_profiles;
create trigger guard_skin_assessment_once
  before insert or update on public.skin_profiles
  for each row execute function public.guard_skin_assessment_once();
