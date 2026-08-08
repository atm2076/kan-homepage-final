begin;

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'web' check (channel in ('web', 'sms')),
  access_token_hash text not null,
  status text not null default 'active' check (status in ('active', 'viewing_requested', 'handed_off', 'closed')),
  context jsonb not null default '{}'::jsonb,
  customer_name text,
  customer_phone text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_conversation_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('customer', 'assistant', 'system')),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  recommendation_number integer not null check (recommendation_number between 1 and 5),
  property_id uuid not null references public.properties(id),
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  unique (conversation_id, recommendation_number)
);

create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id),
  property_id uuid not null references public.properties(id),
  recommendation_id uuid references public.ai_recommendations(id),
  customer_name text not null,
  customer_phone text not null,
  desired_date date not null,
  desired_time time not null,
  customer_conditions jsonb not null default '{}'::jsonb,
  consultation_summary text not null default '',
  channel text not null default 'web' check (channel in ('web', 'sms')),
  staff_status text not null default 'new' check (staff_status in ('new', 'contacted', 'confirmed', 'completed', 'cancelled')),
  assigned_to uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_messages_conversation_idx on public.ai_conversation_messages(conversation_id, created_at);
create index if not exists ai_recommendations_conversation_idx on public.ai_recommendations(conversation_id, recommendation_number);
create index if not exists viewing_requests_status_idx on public.viewing_requests(staff_status, created_at desc);

alter table public.ai_conversations enable row level security;
alter table public.ai_conversation_messages enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.viewing_requests enable row level security;

revoke all on public.ai_conversations from public, anon, authenticated;
revoke all on public.ai_conversation_messages from public, anon, authenticated;
revoke all on public.ai_recommendations from public, anon, authenticated;
revoke all on public.viewing_requests from public, anon, authenticated;
grant all on public.ai_conversations to service_role;
grant all on public.ai_conversation_messages to service_role;
grant all on public.ai_recommendations to service_role;
grant all on public.viewing_requests to service_role;

-- The AI can only receive this deliberately public projection.
create or replace function public.ai_search_public_properties(
  p_region text default null,
  p_property_type text default null,
  p_max_deposit numeric default null,
  p_max_rent numeric default null,
  p_max_management_fee numeric default null,
  p_limit integer default 5,
  p_parking_required boolean default false
)
returns table (
  id uuid, listing_number bigint, listing_type text, title text, category text,
  property_type text, trade_type text, address text, deposit text, rent text,
  maintenance_fee text, area text, floor_info text, direction text, parking text,
  move_in text, summary text, description text, photos jsonb, availability_status text,
  status text, ad_visibility text, review_state text, updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.listing_number, p.listing_type, p.title, p.category,
    p.property_type, p.trade_type, p.address, p.deposit, p.rent,
    p.maintenance_fee, p.area, p.floor_info, p.direction, p.parking,
    p.move_in, p.summary, p.description, p.photos, p.availability_status,
    p.status, p.ad_visibility, p.review_state, p.updated_at
  from public.properties p
  where p.status = 'published'
    and p.availability_status = 'active'
    and p.ad_visibility = '공개'
    and p.review_state = 'approved'
    and (p_region is null or p.address ilike '%' || p_region || '%')
    and (p_property_type is null or coalesce(p.property_type, p.category, '') ilike '%' || p_property_type || '%')
    and (p_max_deposit is null or nullif(regexp_replace(coalesce(p.deposit, ''), '[^0-9.]', '', 'g'), '')::numeric <= p_max_deposit)
    and (p_max_rent is null or nullif(regexp_replace(coalesce(p.rent, ''), '[^0-9.]', '', 'g'), '')::numeric <= p_max_rent)
    and (p_max_management_fee is null or nullif(regexp_replace(coalesce(p.maintenance_fee, ''), '[^0-9.]', '', 'g'), '')::numeric <= p_max_management_fee)
    and (not p_parking_required or (p.parking !~ '불가능' and p.parking ~ '(가능|주차[[:space:]]*[1-9])'))
  order by case
      when p.listing_type = 'normal' and jsonb_array_length(coalesce(p.photos, '[]'::jsonb)) > 0 then 1
      when p.listing_type = 'quick' and jsonb_array_length(coalesce(p.photos, '[]'::jsonb)) > 0 then 2
      else 3 end,
    p.updated_at desc
  limit least(5, greatest(1, coalesce(p_limit, 5)));
$$;

revoke all on function public.ai_search_public_properties(text,text,numeric,numeric,numeric,integer,boolean) from public, anon, authenticated;
grant execute on function public.ai_search_public_properties(text,text,numeric,numeric,numeric,integer,boolean) to service_role;

commit;
