begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

insert into auth.users (id, email)
values
  ('123e4567-e89b-12d3-a456-426614174000', 'finance-user-one@example.test'),
  ('987fcdeb-51a2-43d7-9012-345678901234', 'finance-user-two@example.test');

insert into public.profiles (user_id, currency, theme)
values ('987fcdeb-51a2-43d7-9012-345678901234', 'EUR', 'dark');

insert into public.categories (user_id, type, name, color)
values ('987fcdeb-51a2-43d7-9012-345678901234', 'expense', 'Comida', '#e76f51');

insert into public.transactions (user_id, id, type, description, amount, category, date)
values ('987fcdeb-51a2-43d7-9012-345678901234', 'user-two-transaction', 'expense', 'Compra de prueba', 12.50, 'Comida', current_date);

insert into public.budgets (user_id, id, category, period_start, amount)
values ('987fcdeb-51a2-43d7-9012-345678901234', 'user-two-budget', 'Comida', date_trunc('month', current_date)::date, 100.00);

set local role authenticated;
set local request.jwt.claim.sub = '123e4567-e89b-12d3-a456-426614174000';

select extensions.results_eq(
  $$select count(*)::bigint from public.profiles$$,
  array[0::bigint],
  'User one cannot read user two profiles'
);
select extensions.results_eq(
  $$select count(*)::bigint from public.categories$$,
  array[0::bigint],
  'User one cannot read user two categories'
);
select extensions.results_eq(
  $$select count(*)::bigint from public.transactions$$,
  array[0::bigint],
  'User one cannot read user two transactions'
);
select extensions.results_eq(
  $$select count(*)::bigint from public.budgets$$,
  array[0::bigint],
  'User one cannot read user two budgets'
);

select extensions.results_eq(
  $$insert into public.profiles (user_id, currency, theme)
    values ('123e4567-e89b-12d3-a456-426614174000', 'COP', 'system')
    returning currency$$,
  array['COP'::text],
  'User one can insert their profile'
);
select extensions.results_eq(
  $$insert into public.categories (user_id, type, name, color)
    values ('123e4567-e89b-12d3-a456-426614174000', 'expense', 'Comida', '#e76f51')
    returning name$$,
  array['Comida'::text],
  'User one can insert their category'
);
select extensions.results_eq(
  $$insert into public.transactions (user_id, id, type, description, amount, category, date)
    values ('123e4567-e89b-12d3-a456-426614174000', 'user-one-transaction', 'expense', 'Almuerzo', 8.25, 'Comida', current_date)
    returning id$$,
  array['user-one-transaction'::text],
  'User one can insert their transaction'
);
select extensions.results_eq(
  $$insert into public.budgets (user_id, id, category, period_start, amount)
    values ('123e4567-e89b-12d3-a456-426614174000', 'user-one-budget', 'Comida', date_trunc('month', current_date)::date, 150.00)
    returning id$$,
  array['user-one-budget'::text],
  'User one can insert their budget'
);

select extensions.results_eq(
  $$update public.profiles set currency = 'USD' where user_id = '123e4567-e89b-12d3-a456-426614174000' returning currency$$,
  array['USD'::text],
  'User one can update their profile'
);
select extensions.results_eq(
  $$update public.categories set color = '#123456' where user_id = '123e4567-e89b-12d3-a456-426614174000' returning color$$,
  array['#123456'::text],
  'User one can update their category'
);
select extensions.results_eq(
  $$update public.transactions set description = 'Almuerzo actualizado' where id = 'user-one-transaction' returning description$$,
  array['Almuerzo actualizado'::text],
  'User one can update their transaction'
);
select extensions.results_eq(
  $$update public.budgets set amount = 175.00 where id = 'user-one-budget' returning amount$$,
  array[175.00::numeric],
  'User one can update their budget'
);

select extensions.throws_ok(
  $$insert into public.profiles (user_id, currency, theme) values ('987fcdeb-51a2-43d7-9012-345678901234', 'USD', 'light')$$,
  '42501', null, 'User one cannot insert user two profile'
);
select extensions.throws_ok(
  $$insert into public.categories (user_id, type, name, color) values ('987fcdeb-51a2-43d7-9012-345678901234', 'expense', 'Transporte', '#457b9d')$$,
  '42501', null, 'User one cannot insert user two category'
);
select extensions.throws_ok(
  $$insert into public.transactions (user_id, id, type, description, amount, category, date) values ('987fcdeb-51a2-43d7-9012-345678901234', 'attack-transaction', 'expense', 'No autorizado', 1.00, 'Comida', current_date)$$,
  '42501', null, 'User one cannot insert user two transaction'
);
select extensions.throws_ok(
  $$insert into public.budgets (user_id, id, category, period_start, amount) values ('987fcdeb-51a2-43d7-9012-345678901234', 'attack-budget', 'Comida', date_trunc('month', current_date)::date, 1.00)$$,
  '42501', null, 'User one cannot insert user two budget'
);

select extensions.is_empty(
  $$update public.profiles set currency = 'USD' where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning user_id$$,
  'User one cannot update user two profile'
);
select extensions.is_empty(
  $$update public.categories set color = '#000000' where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning name$$,
  'User one cannot update user two category'
);
select extensions.is_empty(
  $$update public.transactions set description = 'No autorizado' where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning id$$,
  'User one cannot update user two transaction'
);
select extensions.is_empty(
  $$update public.budgets set amount = 1 where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning id$$,
  'User one cannot update user two budget'
);

select extensions.is_empty(
  $$delete from public.profiles where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning user_id$$,
  'User one cannot delete user two profile'
);
select extensions.is_empty(
  $$delete from public.categories where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning name$$,
  'User one cannot delete user two category'
);
select extensions.is_empty(
  $$delete from public.transactions where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning id$$,
  'User one cannot delete user two transaction'
);
select extensions.is_empty(
  $$delete from public.budgets where user_id = '987fcdeb-51a2-43d7-9012-345678901234' returning id$$,
  'User one cannot delete user two budget'
);

select extensions.results_eq(
  $$delete from public.transactions where id = 'user-one-transaction' returning id$$,
  array['user-one-transaction'::text],
  'User one can delete their transaction'
);
select extensions.results_eq(
  $$delete from public.budgets where id = 'user-one-budget' returning id$$,
  array['user-one-budget'::text],
  'User one can delete their budget'
);
select extensions.results_eq(
  $$delete from public.categories where user_id = '123e4567-e89b-12d3-a456-426614174000' returning name$$,
  array['Comida'::text],
  'User one can delete their category'
);
select extensions.results_eq(
  $$delete from public.profiles where user_id = '123e4567-e89b-12d3-a456-426614174000' returning user_id$$,
  array['123e4567-e89b-12d3-a456-426614174000'::uuid],
  'User one can delete their profile'
);

reset role;
set local role authenticated;
set local request.jwt.claim.sub = '987fcdeb-51a2-43d7-9012-345678901234';

select extensions.results_eq(
  $$select currency from public.profiles where user_id = '987fcdeb-51a2-43d7-9012-345678901234'$$,
  array['EUR'::text],
  'User two profile remains unchanged'
);
select extensions.results_eq(
  $$select description from public.transactions where id = 'user-two-transaction'$$,
  array['Compra de prueba'::text],
  'User two transaction remains unchanged'
);
select extensions.results_eq(
  $$select amount from public.budgets where id = 'user-two-budget'$$,
  array[100.00::numeric],
  'User two budget remains unchanged'
);

select * from extensions.finish();
rollback;
