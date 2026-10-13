-- Read-only checks to run in the Supabase SQL Editor before applying the
-- migration. Results include account IDs only; do not share them publicly.

-- Duplicate skin profile owners. The migration stops if this returns rows.
select user_id, count(*) as row_count
from public.skin_profiles
where user_id is not null
group by user_id
having count(*) > 1
order by row_count desc;

-- Primary/unique constraints and indexes that can satisfy the app's
-- ON CONFLICT (user_id) target. No assessment data is returned by this query.
select constraint_row.conname as constraint_name,
       pg_get_constraintdef(constraint_row.oid) as definition
from pg_constraint as constraint_row
where constraint_row.conrelid = 'public.skin_profiles'::regclass
  and constraint_row.contype in ('p', 'u')
union all
select index_row.indexrelid::regclass::text as constraint_name,
       pg_get_indexdef(index_row.indexrelid) as definition
from pg_index as index_row
where index_row.indrelid = 'public.skin_profiles'::regclass
  and index_row.indisunique
  and index_row.indisvalid
  and index_row.indpred is null
  and index_row.indexprs is null
order by 1;

-- Auth users whose app profile row is missing. No rows are inserted here.
select auth_user.id
from auth.users as auth_user
left join public.profiles as profile on profile.id = auth_user.id
where profile.id is null;

-- Actual columns and nullability for tables referenced by the app/migration.
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'profiles', 'skin_profiles', 'user_products', 'products',
    'skin_check_ins', 'check_ins', 'streaks', 'reminder_preferences'
  )
order by table_name, ordinal_position;

-- Existing RLS state and policy definitions. The migration adds named owner
-- access/guard policies while retaining the other policies.
select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'skin_profiles', 'user_products', 'skin_check_ins',
    'check_ins', 'streaks', 'reminder_preferences'
  )
order by tablename, policyname;

-- Count existing recommended rows; the migration/app will not delete them.
select source, count(*) as row_count
from public.user_products
group by source
order by source;
