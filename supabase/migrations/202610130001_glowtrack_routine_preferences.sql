-- Add user-supplied product directions and per-user skincare reminder settings.
-- This migration only adds a nullable field and a new table; it preserves all
-- existing products and does not alter assessment data or existing RLS rules.

alter table public.user_products
  add column if not exists usage_instructions text;

create table if not exists public.reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  am_enabled boolean not null default false,
  am_time time not null default '08:00',
  pm_enabled boolean not null default false,
  pm_time time not null default '21:30',
  updated_at timestamptz not null default now()
);

alter table public.reminder_preferences enable row level security;
grant select, insert, update, delete on public.reminder_preferences to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reminder_preferences'
      and policyname = 'glowtrack_reminder_owner_access'
  ) then
    create policy glowtrack_reminder_owner_access
      on public.reminder_preferences
      for all to authenticated
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
