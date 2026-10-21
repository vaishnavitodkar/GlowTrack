-- Foundational public schema required before the repair/feature migrations.
-- The repository previously began with migrations that ALTERed GlowTrack
-- tables assumed to exist in the hosted database. This migration makes a
-- fresh local database self-contained; it is deliberately additive and uses
-- CREATE TABLE IF NOT EXISTS so it does not replace existing rows/tables.
--
-- IMPORTANT: The hosted project's migration baseline is unresolved. Do not
-- apply this newly-added earlier migration to the hosted project until its
-- migration history has been reviewed and reconciled.

-- Required by the later RAG migration, which declares public.vector types.
create extension if not exists vector with schema public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  age_group text,
  gender text,
  created_at timestamptz default now(),
  onboarding_completed boolean not null default false
);

create or replace function public.handle_new_glowtrack_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_glowtrack on auth.users;
create trigger on_auth_user_created_glowtrack
  after insert on auth.users
  for each row execute function public.handle_new_glowtrack_user();

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  price numeric(10, 2),
  category text not null,
  image_url text,
  breakout_safe boolean,
  description text,
  ingredients text[],
  suitable_skin_types text[],
  suitable_concerns text[],
  fragrance_free boolean,
  affiliate_link text,
  embedding public.vector(1536),
  created_at timestamptz default now()
);

create table if not exists public.skin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skin_type text,
  reacts_easily text,
  concerns text[],
  past_breakout_reaction text,
  diagnosed_conditions text[],
  has_existing_routine text,
  goal text,
  assessment_submitted_at timestamptz,
  updated_at timestamptz
);

create table if not exists public.user_products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  custom_name text,
  routine_slot text not null default 'Both'
    check (routine_slot in ('AM', 'PM', 'Both')),
  step_order integer not null default 1,
  source text,
  added_at timestamptz
);

create table if not exists public.skin_check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feeling text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.check_ins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  check_in_date date not null default current_date,
  am_completed boolean default false,
  pm_completed boolean default false,
  unique (user_id, check_in_date)
);

create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_streak integer not null default 0 check (current_streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_check_in_date date,
  freeze_used_this_week boolean,
  updated_at timestamptz
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  cited_sources jsonb,
  created_at timestamptz default now()
);

create index if not exists user_products_user_order_idx
  on public.user_products (user_id, step_order);
create index if not exists user_products_product_idx
  on public.user_products (product_id);
create index if not exists skin_check_ins_user_created_idx
  on public.skin_check_ins (user_id, created_at desc);
create index if not exists check_ins_user_date_idx
  on public.check_ins (user_id, check_in_date desc);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.skin_profiles enable row level security;
alter table public.user_products enable row level security;
alter table public.skin_check_ins enable row level security;
alter table public.check_ins enable row level security;
alter table public.streaks enable row level security;
alter table public.chat_messages enable row level security;

grant select on public.products to authenticated;
grant select, insert, update, delete on public.profiles, public.skin_profiles,
  public.user_products, public.skin_check_ins, public.check_ins, public.streaks
  to authenticated;
grant select, insert, update, delete on public.chat_messages to authenticated;

drop policy if exists glowtrack_catalog_read on public.products;
create policy glowtrack_catalog_read on public.products
  for select to authenticated using (true);

drop policy if exists glowtrack_chat_owner_access on public.chat_messages;
create policy glowtrack_chat_owner_access on public.chat_messages
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
