-- 모든 매물이 공유하는 단일 숫자 매물번호 체계
create sequence if not exists public.property_listing_number_seq
  as bigint
  minvalue 1
  start with 1
  increment by 1
  no cycle;

alter table public.properties
  add column if not exists listing_number bigint;

do $$
declare
  listing_type text;
begin
  select data_type
    into listing_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'properties'
    and column_name = 'listing_number';

  if listing_type is not null and listing_type <> 'bigint' then
    alter table public.properties
      alter column listing_number drop default;
    alter table public.properties
      alter column listing_number type bigint
      using (
        case
          when listing_number::text ~ '^[1-9][0-9]*$'
            then listing_number::text::bigint
          else null
        end
      );
  end if;
end
$$;

-- 정상 숫자 번호는 유지하고, 중복 번호는 가장 먼저 생성된 매물만 보존한다.
with duplicate_numbers as (
  select
    id,
    row_number() over (
      partition by listing_number
      order by created_at nulls last, id
    ) as duplicate_order
  from public.properties
  where listing_number is not null
    and listing_number > 0
)
update public.properties as property
set listing_number = null
from duplicate_numbers
where property.id = duplicate_numbers.id
  and duplicate_numbers.duplicate_order > 1;

update public.properties
set listing_number = null
where listing_number is not null
  and listing_number <= 0;

do $$
declare
  current_max bigint;
  target record;
begin
  select coalesce(max(listing_number), 0)
    into current_max
  from public.properties;

  if current_max > 0 then
    perform setval('public.property_listing_number_seq', current_max, true);
  else
    perform setval('public.property_listing_number_seq', 1, false);
  end if;

  for target in
    select id
    from public.properties
    where listing_number is null
    order by created_at nulls last, id
  loop
    update public.properties
    set listing_number = nextval('public.property_listing_number_seq')
    where id = target.id;
  end loop;
end
$$;

alter table public.properties
  alter column listing_number
  set default nextval('public.property_listing_number_seq');

alter table public.properties
  alter column listing_number
  set not null;

create unique index if not exists properties_listing_number_unique
  on public.properties (listing_number);

create or replace function public.assign_property_listing_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.listing_number := nextval('public.property_listing_number_seq');
  return new;
end;
$$;

drop trigger if exists properties_assign_listing_number on public.properties;
create trigger properties_assign_listing_number
before insert on public.properties
for each row
execute function public.assign_property_listing_number();

create or replace function public.preserve_property_listing_number()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.listing_number is distinct from old.listing_number then
    raise exception 'listing_number cannot be changed after creation';
  end if;
  return new;
end;
$$;

drop trigger if exists properties_preserve_listing_number on public.properties;
create trigger properties_preserve_listing_number
before update on public.properties
for each row
execute function public.preserve_property_listing_number();

grant usage, select on sequence public.property_listing_number_seq
  to anon, authenticated;

create or replace function public.get_listing_number_state()
returns table (
  property_count bigint,
  numbered_count bigint,
  duplicate_count bigint,
  current_max bigint,
  next_number bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with duplicate_summary as (
    select coalesce(sum(number_count - 1), 0)::bigint as duplicate_count
    from (
      select count(*)::bigint as number_count
      from public.properties
      group by listing_number
      having count(*) > 1
    ) duplicates
  )
  select
    count(*)::bigint,
    count(listing_number)::bigint,
    duplicate_summary.duplicate_count,
    coalesce(max(listing_number), 0)::bigint,
    (coalesce(max(listing_number), 0) + 1)::bigint
  from public.properties
  cross join duplicate_summary
  group by duplicate_summary.duplicate_count;
$$;

grant execute on function public.get_listing_number_state()
  to anon, authenticated;
