-- Run this in Supabase SQL editor
-- Extensions (pgcrypto is available by default in Supabase)

-- Tables
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price integer not null default 69,
  stock integer not null default 0,
  diameter_mm integer,
  image_url text,
  description text,
  category_slug text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint fk_products_category_slug foreign key (category_slug)
    references public.categories(slug) on update cascade on delete restrict
);

-- Admin allowlist
create table if not exists public.admin_users (
  email text primary key
);

-- RLS
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.admin_users enable row level security;

-- Public can read only active categories/products
create policy if not exists "public categories read" on public.categories
  for select using (active);

create policy if not exists "public products read" on public.products
  for select using (active);

-- Only allow admins (by email allowlist) to write
create policy if not exists "admins read admin_users" on public.admin_users
  for select using (auth.role() = 'authenticated');

create policy if not exists "admins manage categories" on public.categories
  for insert with check (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;
create policy if not exists "admins update categories" on public.categories
  for update using (exists (select 1 from public.admin_users u where u.email = auth.email()))
  with check (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;
create policy if not exists "admins delete categories" on public.categories
  for delete using (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;

create policy if not exists "admins manage products" on public.products
  for insert with check (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;
create policy if not exists "admins update products" on public.products
  for update using (exists (select 1 from public.admin_users u where u.email = auth.email()))
  with check (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;
create policy if not exists "admins delete products" on public.products
  for delete using (exists (select 1 from public.admin_users u where u.email = auth.email()))
  to authenticated;

-- Seed categories
insert into public.categories (slug, name) values
  ('love', 'Náramek lásky'),
  ('hope', 'Náramek naděje'),
  ('joy', 'Náramek radosti'),
  ('friendship', 'Náramek přátelství'),
  ('help', 'Náramek pomoci'),
  ('luck', 'Náramek štěstí')
on conflict (slug) do nothing;

-- Example add admin (replace email)
-- insert into public.admin_users(email) values ('detidetem.eu@gmail.com');


