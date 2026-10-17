-- Store the category selected for manually added products so AM and PM
-- routines can report which of the four core steps the user already has.
alter table public.user_products
  add column if not exists custom_category text;

alter table public.user_products
  drop constraint if exists user_products_custom_category_check;
