-- INSERT 한 건당 시퀀스를 정확히 한 번만 소비한다.
-- 번호는 클라이언트 입력과 관계없이 BEFORE INSERT 트리거가 발급한다.
alter table public.properties
  alter column listing_number drop default;

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
