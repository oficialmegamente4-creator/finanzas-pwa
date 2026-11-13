create schema if not exists private;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.touch_updated_at() to authenticated;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  currency text not null default 'USD' check (currency in ('USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN')),
  theme text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  name text not null check (char_length(trim(name)) between 1 and 80),
  color text not null default '#64748b' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, type, name)
);

create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  type text not null check (type in ('income', 'expense')),
  description text not null check (char_length(trim(description)) between 1 and 80),
  amount numeric(14, 2) not null check (amount > 0),
  category text not null,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  constraint transactions_owned_category_fk
    foreign key (user_id, type, category)
    references public.categories (user_id, type, name)
    on update cascade
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, date desc, created_at desc);

create table if not exists public.budgets (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  category_type text not null default 'expense' check (category_type = 'expense'),
  category text not null,
  period_start date not null check (extract(day from period_start) = 1),
  amount numeric(14, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id),
  unique (user_id, category, period_start),
  constraint budgets_owned_category_fk
    foreign key (user_id, category_type, category)
    references public.categories (user_id, type, name)
);

create index if not exists budgets_user_period_idx
  on public.budgets (user_id, period_start desc);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

drop trigger if exists transactions_touch_updated_at on public.transactions;
create trigger transactions_touch_updated_at
  before update on public.transactions
  for each row execute function private.touch_updated_at();

drop trigger if exists budgets_touch_updated_at on public.budgets;
create trigger budgets_touch_updated_at
  before update on public.budgets
  for each row execute function private.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets enable row level security;

revoke all on table public.profiles, public.categories, public.transactions, public.budgets from public, anon, authenticated;
grant select, insert, update, delete on table public.profiles, public.categories, public.transactions, public.budgets to authenticated;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists categories_select_own on public.categories;
create policy categories_select_own on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists categories_insert_own on public.categories;
create policy categories_insert_own on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists categories_update_own on public.categories;
create policy categories_update_own on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists categories_delete_own on public.categories;
create policy categories_delete_own on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists transactions_select_own on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists transactions_insert_own on public.transactions;
create policy transactions_insert_own on public.transactions
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists transactions_update_own on public.transactions;
create policy transactions_update_own on public.transactions
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists transactions_delete_own on public.transactions;
create policy transactions_delete_own on public.transactions
  for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists budgets_select_own on public.budgets;
create policy budgets_select_own on public.budgets
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists budgets_insert_own on public.budgets;
create policy budgets_insert_own on public.budgets
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists budgets_update_own on public.budgets;
create policy budgets_update_own on public.budgets
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
drop policy if exists budgets_delete_own on public.budgets;
create policy budgets_delete_own on public.budgets
  for delete to authenticated using ((select auth.uid()) = user_id);

create or replace function public.clear_my_finance_data()
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.transactions where user_id = current_user_id;
  delete from public.budgets where user_id = current_user_id;
  delete from public.categories where user_id = current_user_id;
  delete from public.profiles where user_id = current_user_id;
end;
$$;

create or replace function public.replace_my_finance_data(
  p_transactions jsonb,
  p_budgets jsonb,
  p_currency text,
  p_theme text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(p_transactions) <> 'array' then
    raise exception 'Transactions must be a JSON array';
  end if;
  if jsonb_typeof(p_budgets) <> 'array' then
    raise exception 'Budgets must be a JSON array';
  end if;

  insert into public.profiles (user_id, currency, theme)
  values (current_user_id, p_currency, p_theme)
  on conflict (user_id) do update
    set currency = excluded.currency,
        theme = excluded.theme;

  delete from public.transactions where user_id = current_user_id;
  delete from public.budgets where user_id = current_user_id;

  insert into public.transactions (user_id, id, type, description, amount, category, date, created_at)
  select current_user_id, item.id, item.type, item.description, item.amount,
         item.category, item.date, coalesce(item.created_at, now())
  from pg_catalog.jsonb_to_recordset(p_transactions) as item(
    id text,
    type text,
    description text,
    amount numeric,
    category text,
    date date,
    created_at timestamptz
  );

  insert into public.budgets (user_id, id, category_type, category, period_start, amount, created_at)
  select current_user_id, item.id, 'expense', item.category, item.period_start, item.amount, coalesce(item.created_at, now())
  from pg_catalog.jsonb_to_recordset(p_budgets) as item(
    id text,
    category text,
    period_start date,
    amount numeric,
    created_at timestamptz
  );
end;
$$;

revoke all on function public.clear_my_finance_data() from public, anon;
revoke all on function public.replace_my_finance_data(jsonb, jsonb, text, text) from public, anon;
grant execute on function public.clear_my_finance_data() to authenticated;
grant execute on function public.replace_my_finance_data(jsonb, jsonb, text, text) to authenticated;
