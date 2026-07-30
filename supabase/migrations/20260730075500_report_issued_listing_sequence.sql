-- 삭제된 번호를 재사용하지 않으므로 다음 번호는 테이블 MAX가 아니라 시퀀스 상태로 보고한다.
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
volatile
as $$
  with duplicate_summary as (
    select coalesce(sum(number_count - 1), 0)::bigint as duplicate_count
    from (
      select count(*)::bigint as number_count
      from public.properties
      group by listing_number
      having count(*) > 1
    ) duplicates
  ),
  sequence_state as (
    select
      last_value::bigint,
      is_called
    from public.property_listing_number_seq
  )
  select
    count(*)::bigint,
    count(listing_number)::bigint,
    duplicate_summary.duplicate_count,
    coalesce(max(listing_number), 0)::bigint,
    (
      case
        when sequence_state.is_called then sequence_state.last_value + 1
        else sequence_state.last_value
      end
    )::bigint
  from public.properties
  cross join duplicate_summary
  cross join sequence_state
  group by
    duplicate_summary.duplicate_count,
    sequence_state.last_value,
    sequence_state.is_called;
$$;

grant execute on function public.get_listing_number_state()
  to anon, authenticated;
