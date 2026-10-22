-- Reconcile pre-existing local tables that were skipped by the foundational
-- CREATE TABLE IF NOT EXISTS migration. This migration is additive: it does not
-- rewrite or remove existing user, product, or embedding data.

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists onboarding_completed boolean not null default false;

alter table public.skin_profiles
  add column if not exists diagnosed_conditions text[];

alter table public.products
  add column if not exists image_url text,
  add column if not exists embedding public.vector(1536);
