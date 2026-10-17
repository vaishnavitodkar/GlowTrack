-- A user's product remains one row. Both is represented by one timing value
-- and expanded into the AM and PM views by the application.
alter table public.user_products
  add column if not exists custom_category text;

alter table public.user_products
  drop constraint if exists user_products_custom_category_check;

do $$
declare
  check_row record;
begin
  for check_row in
    select constraint_row.conname
    from pg_constraint constraint_row
    where constraint_row.conrelid = 'public.user_products'::regclass
      and constraint_row.contype = 'c'
      and pg_get_constraintdef(constraint_row.oid) ilike '%routine_slot%'
  loop
    execute format('alter table public.user_products drop constraint %I', check_row.conname);
  end loop;
end
$$;

alter table public.user_products
  add constraint user_products_routine_slot_check
  check (routine_slot in ('AM', 'PM', 'Both'));

-- Completion is tracked separately for the AM and PM view of one Both item.
alter table public.routine_step_completions
  drop constraint if exists routine_step_completions_routine_slot_check,
  drop constraint if exists routine_step_completions_user_id_user_product_id_completion_date_key;

alter table public.routine_step_completions
  add constraint routine_step_completions_routine_slot_check
    check (routine_slot in ('AM', 'PM')),
  add constraint routine_step_completions_product_day_slot_key
    unique (user_id, user_product_id, completion_date, routine_slot);

create or replace function public.set_routine_step_completion(
  p_user_product_id uuid,
  p_completion_date date,
  p_completed boolean,
  p_routine_slot text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  owner_id uuid := auth.uid();
  product_slot text;
  step_slot text;
  am_total integer;
  pm_total integer;
  am_done_count integer;
  pm_done_count integer;
  has_steps boolean;
  am_done boolean;
  pm_done boolean;
  current_streak integer;
begin
  if owner_id is null then raise exception 'Authentication required'; end if;
  select routine_slot into product_slot
  from public.user_products
  where id = p_user_product_id and user_id = owner_id
    and (source is null or source in ('manual', 'recommendation_accepted'));
  if product_slot is null then raise exception 'Routine step not found'; end if;

  if product_slot = 'Both' then
    if p_routine_slot is null or p_routine_slot not in ('AM', 'PM') then raise exception 'Choose AM or PM for this routine step'; end if;
    step_slot := p_routine_slot;
  else
    step_slot := product_slot;
    if p_routine_slot is distinct from step_slot then raise exception 'Routine timing has changed; refresh and try again'; end if;
  end if;

  if p_completed then
    insert into public.routine_step_completions(user_id, user_product_id, completion_date, routine_slot)
    values(owner_id, p_user_product_id, p_completion_date, step_slot)
    on conflict (user_id, user_product_id, completion_date, routine_slot) do nothing;
  else
    delete from public.routine_step_completions
    where user_id = owner_id and user_product_id = p_user_product_id
      and completion_date = p_completion_date and routine_slot = step_slot;
  end if;

  select count(*) filter (where routine_slot in ('AM', 'Both')),
         count(*) filter (where routine_slot in ('PM', 'Both'))
    into am_total, pm_total
  from public.user_products
  where user_id = owner_id and (source is null or source in ('manual', 'recommendation_accepted'));
  has_steps := am_total + pm_total > 0;

  select count(*) filter (where completion.routine_slot = 'AM'),
         count(*) filter (where completion.routine_slot = 'PM')
    into am_done_count, pm_done_count
  from public.routine_step_completions completion
  join public.user_products product on product.id = completion.user_product_id
  where completion.user_id = owner_id and completion.completion_date = p_completion_date
    and (product.source is null or product.source in ('manual', 'recommendation_accepted'))
    and (product.routine_slot = 'Both' or completion.routine_slot = product.routine_slot);

  am_done := has_steps and (am_total = 0 or am_done_count = am_total);
  pm_done := has_steps and (pm_total = 0 or pm_done_count = pm_total);
  insert into public.check_ins(user_id, check_in_date, am_completed, pm_completed)
  values(owner_id, p_completion_date, am_done, pm_done)
  on conflict (user_id, check_in_date) do update set
    am_completed = excluded.am_completed,
    pm_completed = excluded.pm_completed;

  current_streak := public.recalculate_glowtrack_streak(p_completion_date);
  return current_streak;
end;
$$;

revoke all on function public.set_routine_step_completion(uuid, date, boolean, text) from public;
grant execute on function public.set_routine_step_completion(uuid, date, boolean, text) to authenticated;

-- Keep the pre-existing RPC signature working for clients that still send
-- three arguments. Both-timed products require the new explicit routine slot.
create or replace function public.set_routine_step_completion(
  p_user_product_id uuid,
  p_completion_date date,
  p_completed boolean
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  product_slot text;
begin
  select routine_slot into product_slot
  from public.user_products
  where id = p_user_product_id and user_id = auth.uid()
    and (source is null or source in ('manual', 'recommendation_accepted'));
  if product_slot is null then raise exception 'Routine step not found'; end if;
  if product_slot = 'Both' then raise exception 'Refresh GlowTrack to track this product in AM and PM separately'; end if;
  return public.set_routine_step_completion(p_user_product_id, p_completion_date, p_completed, product_slot);
end;
$$;

revoke all on function public.set_routine_step_completion(uuid, date, boolean) from public;
grant execute on function public.set_routine_step_completion(uuid, date, boolean) to authenticated;
