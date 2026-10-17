-- Manual products need a category for AM/PM routine grouping and ordering.
-- This forward migration repairs installations where the earlier category
-- migration was recorded or skipped without applying the column to the table.
alter table public.user_products
  add column if not exists custom_category text;
