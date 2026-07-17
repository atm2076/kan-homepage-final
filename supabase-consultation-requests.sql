-- Consultation request table for the homepage REQUEST section.
-- Apply this in Supabase SQL editor after reviewing.

create extension if not exists pgcrypto;

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  request_type text not null check (request_type in ('buy', 'sell')),
  name text not null,
  phone text not null,
  region text,
  property_type text,
  deposit text,
  monthly_rent text,
  budget text,
  move_in_date text,
  property_address text,
  desired_price text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.consultation_requests enable row level security;

revoke all on public.consultation_requests from anon;
revoke all on public.consultation_requests from authenticated;

grant insert on public.consultation_requests to anon;
grant insert, select on public.consultation_requests to authenticated;

drop policy if exists "Visitors can create consultation requests" on public.consultation_requests;
drop policy if exists "Authenticated admins can read consultation requests" on public.consultation_requests;

create policy "Visitors can create consultation requests"
  on public.consultation_requests
  for insert
  to anon, authenticated
  with check (
    request_type in ('buy', 'sell')
    and length(trim(name)) > 0
    and length(trim(phone)) > 0
  );

create policy "Authenticated admins can read consultation requests"
  on public.consultation_requests
  for select
  to authenticated
  using (true);

comment on table public.consultation_requests is 'Homepage consultation requests submitted from the REQUEST section.';