-- Supabase schema for TON wallet assignment (Vercel-compatible)
-- Run this in Supabase SQL editor

begin;

create table if not exists wallet_pool (
  id bigserial primary key,
  address text not null unique,
  seed text not null,
  assigned boolean not null default false,
  assigned_user_id text,
  assigned_at timestamptz
);

create table if not exists users (
  user_id text primary key,
  address text unique,
  seed text
);

-- Atomic assignment function: idempotent per user
create or replace function assign_wallet(p_user_id text)
returns table(address text, seed text)
language plpgsql
as $$
declare
  v_address text;
  v_seed text;
begin
  -- If already assigned, return existing
  if exists (select 1 from users where user_id = p_user_id) then
    return query select u.address, u.seed from users u where u.user_id = p_user_id;
    return;
  end if;

  -- Lock one free wallet row without blocking others
  select w.address, w.seed
    into v_address, v_seed
  from wallet_pool w
  where w.assigned = false
  for update skip locked
  limit 1;

  if v_address is null then
    raise exception 'NO_WALLET_AVAILABLE';
  end if;

  update wallet_pool
     set assigned = true,
         assigned_user_id = p_user_id,
         assigned_at = now()
   where wallet_pool.address = v_address;

  insert into users(user_id, address, seed)
  values (p_user_id, v_address, v_seed)
  on conflict (user_id) do nothing;

  return query select v_address, v_seed;
end;
$$;

commit;


