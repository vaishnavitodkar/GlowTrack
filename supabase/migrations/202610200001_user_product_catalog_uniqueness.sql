-- A catalog product may appear at most once in one user's saved products.
-- AM and PM usage are represented by one row with routine_slot = 'Both'.
-- Manual products keep product_id NULL and are unaffected by this index.
create unique index if not exists user_products_user_product_unique
  on public.user_products (user_id, product_id)
  where product_id is not null;
