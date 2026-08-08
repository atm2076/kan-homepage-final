begin;

-- Gumi vacancy imports are additive. Existing property rows keep their id and listing_number.
alter table public.properties
  add column if not exists listing_type text,
  add column if not exists availability_status text,
  add column if not exists review_state text;

update public.properties
set
  listing_type = coalesce(listing_type, 'normal'),
  availability_status = coalesce(availability_status, 'active'),
  review_state = coalesce(review_state, case when status = 'published' then 'approved' else 'pending_review' end)
where listing_type is null
   or availability_status is null
   or review_state is null;

alter table public.properties
  alter column listing_type set default 'normal',
  alter column availability_status set default 'active',
  alter column review_state set default 'approved';

create table if not exists public.gumi_import_batches (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'open' check (status in ('open', 'finalizing', 'completed', 'cancelled', 'failed')),
  chunk_count integer not null default 0,
  total_count integer not null default 0,
  new_count integer not null default 0,
  updated_count integer not null default 0,
  unchanged_count integer not null default 0,
  duplicate_count integer not null default 0,
  error_count integer not null default 0,
  missing_count integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_by uuid references auth.users(id),
  finalized_by uuid references auth.users(id)
);

create table if not exists public.property_sources (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  source_type text not null default 'gumi_vacancy',
  canonical_identity text,
  normalized_address text not null,
  normalized_unit text,
  source_property_type text not null,
  source_registered_at date,
  deposit_amount numeric,
  rent_amount numeric,
  management_fee_amount numeric,
  source_status text not null default 'active' check (source_status in ('active', 'missing', 'unavailable', 'expired')),
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_seen_batch_id uuid references public.gumi_import_batches(id),
  promoted_at timestamptz,
  change_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists property_sources_canonical_identity_unique
  on public.property_sources (source_type, canonical_identity)
  where canonical_identity is not null and normalized_unit is not null;

create index if not exists property_sources_property_id_idx
  on public.property_sources (property_id);

create index if not exists property_sources_last_seen_batch_idx
  on public.property_sources (last_seen_batch_id, source_status);

create table if not exists public.property_source_ids (
  id bigint generated always as identity primary key,
  property_source_id uuid not null references public.property_sources(id) on delete cascade,
  source_type text not null,
  source_int_seq bigint not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  first_seen_batch_id uuid references public.gumi_import_batches(id),
  last_seen_batch_id uuid references public.gumi_import_batches(id),
  unique (source_type, source_int_seq)
);

create table if not exists public.gumi_import_batch_items (
  id bigint generated always as identity primary key,
  batch_id uuid not null references public.gumi_import_batches(id) on delete cascade,
  property_source_id uuid references public.property_sources(id) on delete set null,
  source_key text not null,
  action text not null check (action in ('new', 'updated', 'unchanged', 'reactivated', 'duplicate_review', 'error')),
  changes jsonb not null default '{}'::jsonb,
  sanitized_payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz not null default now(),
  unique (batch_id, source_key)
);

create table if not exists public.property_source_alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  property_source_id uuid not null references public.property_sources(id) on delete cascade,
  alert_type text not null,
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);

alter table public.gumi_import_batches enable row level security;
alter table public.property_sources enable row level security;
alter table public.property_source_ids enable row level security;
alter table public.gumi_import_batch_items enable row level security;
alter table public.property_source_alerts enable row level security;

revoke all on public.gumi_import_batches from anon, authenticated;
revoke all on public.property_sources from anon, authenticated;
revoke all on public.property_source_ids from anon, authenticated;
revoke all on public.gumi_import_batch_items from anon, authenticated;
revoke all on public.property_source_alerts from anon, authenticated;

grant all on public.gumi_import_batches to service_role;
grant all on public.property_sources to service_role;
grant all on public.property_source_ids to service_role;
grant all on public.gumi_import_batch_items to service_role;
grant all on public.property_source_alerts to service_role;

create or replace function public.gumi_create_import_batch(p_user_id uuid)
returns public.gumi_import_batches
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.gumi_import_batches;
begin
  insert into public.gumi_import_batches (created_by)
  values (p_user_id)
  returning * into result;
  return result;
end;
$$;

create or replace function public.gumi_import_chunk(p_batch_id uuid, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  batch_status text;
  item jsonb;
  source_row public.property_sources;
  alias_source_id uuid;
  property_row public.properties;
  identity_value text;
  source_key_value text;
  item_action text;
  item_changes jsonb;
  item_int_seq bigint;
  previous_source_status text;
begin
  select status into batch_status
  from public.gumi_import_batches
  where id = p_batch_id
  for update;

  if batch_status is distinct from 'open' then
    raise exception 'batch is not open';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1000 then
    raise exception 'a chunk must be a JSON array of at most 1000 records';
  end if;

  for item in select value from jsonb_array_elements(p_items)
  loop
    source_row := null;
    property_row := null;
    alias_source_id := null;
    previous_source_status := null;
    identity_value := nullif(item->>'canonicalIdentity', '');
    item_int_seq := nullif(item->>'sourceIntSeq', '')::bigint;
    source_key_value := case
      when item_int_seq is not null then 'intseq:' || item_int_seq::text
      when identity_value is not null then 'canonical:' || identity_value
      else 'review:' || coalesce(item->>'rowNumber', gen_random_uuid()::text)
    end;

    if identity_value is null
       or nullif(item->>'normalizedAddress', '') is null
       or nullif(item->>'unit', '') is null
       or nullif(item->>'sourcePropertyType', '') is null then
      insert into public.gumi_import_batch_items
        (batch_id, source_key, action, sanitized_payload, changes)
      values
        (p_batch_id, source_key_value, 'duplicate_review', item - 'raw', jsonb_build_object('reason', 'canonical_identity_incomplete'))
      on conflict (batch_id, source_key) do update
        set action = excluded.action,
            sanitized_payload = excluded.sanitized_payload,
            changes = excluded.changes,
            processed_at = now();
      continue;
    end if;

    select * into source_row
    from public.property_sources
    where source_type = 'gumi_vacancy'
      and canonical_identity = identity_value
    for update;

    if source_row.id is null and item_int_seq is not null then
      select property_source_id into alias_source_id
      from public.property_source_ids
      where source_type = 'gumi_vacancy'
        and source_int_seq = item_int_seq;

      if alias_source_id is not null then
        select * into source_row
        from public.property_sources
        where id = alias_source_id
        for update;

        if source_row.canonical_identity is distinct from identity_value then
          insert into public.gumi_import_batch_items
            (batch_id, property_source_id, source_key, action, sanitized_payload, changes)
          values
            (p_batch_id, source_row.id, source_key_value, 'duplicate_review', item - 'raw', jsonb_build_object('reason', 'intseq_identity_conflict'))
          on conflict (batch_id, source_key) do update
            set action = excluded.action,
                sanitized_payload = excluded.sanitized_payload,
                changes = excluded.changes,
                processed_at = now();
          continue;
        end if;
      end if;
    end if;

    if source_row.id is null then
      insert into public.properties (
        title, category, property_type, trade_type, address, real_unit,
        deposit, rent, maintenance_fee, photos, image_count,
        listing_type, availability_status, review_state, status, ad_visibility,
        created_by_role, created_by, updated_by
      ) values (
        concat_ws(' ', item->>'address', (item->>'unit') || '호', item->>'sourcePropertyType'),
        case item->>'sourcePropertyType' when '미니투룸' then '미니투룸' else item->>'sourcePropertyType' end,
        item->>'sourcePropertyType', '월세', item->>'address', (item->>'unit') || '호',
        coalesce(item->>'depositAmount', ''), coalesce(item->>'rentAmount', ''), coalesce(item->>'managementFeeAmount', ''),
        '[]'::jsonb, 0,
        'quick', 'active', 'pending_review', 'pending', '비공개',
        'import', '구미공실', '구미공실'
      ) returning * into property_row;

      insert into public.property_sources (
        property_id, canonical_identity, normalized_address, normalized_unit,
        source_property_type, source_registered_at, deposit_amount, rent_amount,
        management_fee_amount, last_seen_batch_id
      ) values (
        property_row.id, identity_value, item->>'normalizedAddress', item->>'unit',
        item->>'sourcePropertyType', nullif(item->>'sourceRegisteredAt', '')::date,
        nullif(item->>'depositAmount', '')::numeric,
        nullif(item->>'rentAmount', '')::numeric,
        nullif(item->>'managementFeeAmount', '')::numeric,
        p_batch_id
      ) returning * into source_row;
      item_action := 'new';
      item_changes := '{}'::jsonb;
    else
      previous_source_status := source_row.source_status;
      item_changes := jsonb_strip_nulls(jsonb_build_object(
        'deposit', case when source_row.deposit_amount is distinct from nullif(item->>'depositAmount', '')::numeric
          then jsonb_build_object('before', source_row.deposit_amount, 'after', nullif(item->>'depositAmount', '')::numeric) end,
        'rent', case when source_row.rent_amount is distinct from nullif(item->>'rentAmount', '')::numeric
          then jsonb_build_object('before', source_row.rent_amount, 'after', nullif(item->>'rentAmount', '')::numeric) end,
        'managementFee', case when source_row.management_fee_amount is distinct from nullif(item->>'managementFeeAmount', '')::numeric
          then jsonb_build_object('before', source_row.management_fee_amount, 'after', nullif(item->>'managementFeeAmount', '')::numeric) end
      ));

      update public.property_sources
      set source_registered_at = coalesce(nullif(item->>'sourceRegisteredAt', '')::date, source_registered_at),
          deposit_amount = nullif(item->>'depositAmount', '')::numeric,
          rent_amount = nullif(item->>'rentAmount', '')::numeric,
          management_fee_amount = nullif(item->>'managementFeeAmount', '')::numeric,
          source_status = 'active',
          last_seen_at = now(),
          last_seen_batch_id = p_batch_id,
          change_summary = item_changes,
          updated_at = now()
      where id = source_row.id
      returning * into source_row;

      select * into property_row from public.properties where id = source_row.property_id for update;
      if property_row.listing_type = 'quick' then
        update public.properties
        set deposit = coalesce(item->>'depositAmount', deposit),
            rent = coalesce(item->>'rentAmount', rent),
            maintenance_fee = coalesce(item->>'managementFeeAmount', maintenance_fee),
            availability_status = 'active',
            updated_at = now()
        where id = property_row.id;
      else
        update public.properties
        set availability_status = 'active', updated_at = now()
        where id = property_row.id;
      end if;
      if property_row.listing_type = 'normal' and (item_changes <> '{}'::jsonb or previous_source_status <> 'active') then
        insert into public.property_source_alerts
          (property_id, property_source_id, alert_type, before_value, after_value)
        values
          (property_row.id, source_row.id, 'source_change', '{}'::jsonb, item_changes || jsonb_build_object('sourceStatus', 'active'));
      end if;

      item_action := case
        when previous_source_status <> 'active' then 'reactivated'
        when item_changes <> '{}'::jsonb then 'updated'
        else 'unchanged'
      end;
    end if;

    if item_int_seq is not null then
      insert into public.property_source_ids (
        property_source_id, source_type, source_int_seq, first_seen_batch_id, last_seen_batch_id
      ) values (
        source_row.id, 'gumi_vacancy', item_int_seq, p_batch_id, p_batch_id
      ) on conflict (source_type, source_int_seq) do update
        set last_seen_at = now(), last_seen_batch_id = excluded.last_seen_batch_id;
    end if;

    insert into public.gumi_import_batch_items
      (batch_id, property_source_id, source_key, action, changes, sanitized_payload)
    values
      (p_batch_id, source_row.id, source_key_value, item_action, item_changes, item - 'raw')
    on conflict (batch_id, source_key) do update
      set property_source_id = excluded.property_source_id,
          action = excluded.action,
          changes = excluded.changes,
          sanitized_payload = excluded.sanitized_payload,
          processed_at = now();
  end loop;

  update public.gumi_import_batches batch
  set chunk_count = chunk_count + 1,
      total_count = summary.total_count,
      new_count = summary.new_count,
      updated_count = summary.updated_count,
      unchanged_count = summary.unchanged_count,
      duplicate_count = summary.duplicate_count,
      error_count = summary.error_count
  from (
    select
      count(*)::integer total_count,
      count(*) filter (where action = 'new')::integer new_count,
      count(*) filter (where action in ('updated', 'reactivated'))::integer updated_count,
      count(*) filter (where action = 'unchanged')::integer unchanged_count,
      count(*) filter (where action = 'duplicate_review')::integer duplicate_count,
      count(*) filter (where action = 'error')::integer error_count
    from public.gumi_import_batch_items
    where batch_id = p_batch_id
  ) summary
  where batch.id = p_batch_id;

  return (select to_jsonb(batch) from public.gumi_import_batches batch where id = p_batch_id);
end;
$$;

create or replace function public.gumi_batch_finalize_preview(p_batch_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with current_batch as (
    select * from public.gumi_import_batches where id = p_batch_id
  ), previous_batch as (
    select * from public.gumi_import_batches
    where status = 'completed' and id <> p_batch_id
    order by completed_at desc nulls last
    limit 1
  )
  select jsonb_build_object(
    'batchId', current_batch.id,
    'status', current_batch.status,
    'currentTotal', current_batch.total_count,
    'previousTotal', coalesce(previous_batch.total_count, 0),
    'difference', current_batch.total_count - coalesce(previous_batch.total_count, 0),
    'dropRatio', case when coalesce(previous_batch.total_count, 0) > 0
      then round((previous_batch.total_count - current_batch.total_count)::numeric / previous_batch.total_count, 4)
      else 0 end,
    'requiresStrongConfirmation', coalesce(previous_batch.total_count, 0) > 0
      and current_batch.total_count < previous_batch.total_count * 0.85
  )
  from current_batch
  left join previous_batch on true;
$$;

create or replace function public.gumi_finalize_import_batch(
  p_batch_id uuid,
  p_user_id uuid,
  p_force boolean default false,
  p_confirmation text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  preview jsonb;
  missing_total integer;
begin
  perform pg_advisory_xact_lock(hashtext('gumi-vacancy-finalize'));
  preview := public.gumi_batch_finalize_preview(p_batch_id);
  if preview->>'status' <> 'open' then raise exception 'batch is not open'; end if;
  if (preview->>'currentTotal')::integer = 0 then raise exception 'empty batch cannot be finalized'; end if;
  if (preview->>'requiresStrongConfirmation')::boolean
     and not (p_force and p_confirmation = '전체 가져오기 완료') then
    raise exception 'batch count dropped by 15 percent or more; strong confirmation required';
  end if;

  update public.gumi_import_batches set status = 'finalizing' where id = p_batch_id;

  with missing_sources as (
    update public.property_sources source
    set source_status = 'missing', updated_at = now()
    where source.source_type = 'gumi_vacancy'
      and source.source_status = 'active'
      and source.last_seen_batch_id is distinct from p_batch_id
    returning source.*
  ), hidden_properties as (
    update public.properties property
    set availability_status = 'missing', updated_at = now()
    from missing_sources source
    where property.id = source.property_id
    returning property.id
  ), normal_alerts as (
    insert into public.property_source_alerts
      (property_id, property_source_id, alert_type, after_value)
    select source.property_id, source.id, 'source_missing', jsonb_build_object('sourceStatus', 'missing')
    from missing_sources source
    join public.properties property on property.id = source.property_id
    where property.listing_type = 'normal'
    returning id
  )
  select count(*)::integer into missing_total from missing_sources;

  update public.gumi_import_batches
  set status = 'completed', completed_at = now(), finalized_by = p_user_id, missing_count = missing_total
  where id = p_batch_id;

  return public.gumi_batch_finalize_preview(p_batch_id) || jsonb_build_object('missingCount', missing_total, 'status', 'completed');
end;
$$;

create or replace function public.gumi_approve_quick_property(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  property_row public.properties;
  missing_fields text[] := '{}';
begin
  select * into property_row from public.properties where id = p_property_id for update;
  if property_row.id is null or property_row.listing_type <> 'quick' then raise exception 'quick property not found'; end if;
  if not exists (
    select 1 from public.property_sources
    where property_id = p_property_id and source_type = 'gumi_vacancy' and source_status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'missingFields', jsonb_build_array('active_source'));
  end if;
  if nullif(trim(property_row.address), '') is null then missing_fields := array_append(missing_fields, 'address'); end if;
  if nullif(trim(property_row.real_unit), '') is null then missing_fields := array_append(missing_fields, 'real_unit'); end if;
  if nullif(trim(property_row.category), '') is null then missing_fields := array_append(missing_fields, 'category'); end if;
  if nullif(trim(property_row.deposit), '') is null then missing_fields := array_append(missing_fields, 'deposit'); end if;
  if nullif(trim(property_row.rent), '') is null then missing_fields := array_append(missing_fields, 'rent'); end if;
  if nullif(trim(property_row.maintenance_fee), '') is null then missing_fields := array_append(missing_fields, 'maintenance_fee'); end if;
  if nullif(trim(property_row.area), '') is null then missing_fields := array_append(missing_fields, 'area'); end if;
  if nullif(trim(property_row.floor_info), '') is null then missing_fields := array_append(missing_fields, 'floor_info'); end if;
  if nullif(trim(property_row.direction), '') is null then missing_fields := array_append(missing_fields, 'direction'); end if;
  if nullif(trim(property_row.parking), '') is null then missing_fields := array_append(missing_fields, 'parking'); end if;
  if nullif(trim(property_row.move_in), '') is null then missing_fields := array_append(missing_fields, 'move_in'); end if;
  if nullif(trim(property_row.approval_date), '') is null then missing_fields := array_append(missing_fields, 'approval_date'); end if;
  if nullif(trim(property_row.legal_notice), '') is null then missing_fields := array_append(missing_fields, 'legal_notice'); end if;

  if array_length(missing_fields, 1) is not null then
    return jsonb_build_object('ok', false, 'missingFields', to_jsonb(missing_fields));
  end if;

  update public.properties
  set status = 'published', ad_visibility = '공개', review_state = 'approved', availability_status = 'active', updated_at = now()
  where id = p_property_id;
  return jsonb_build_object('ok', true, 'propertyId', p_property_id);
end;
$$;

create or replace function public.gumi_expire_stale_quick_properties()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  expired_total integer;
begin
  with expired_sources as (
    update public.property_sources source
    set source_status = 'expired', updated_at = now()
    where source.source_type = 'gumi_vacancy'
      and source.promoted_at is null
      and source.source_status = 'active'
      and source.last_seen_at < now() - interval '90 days'
    returning source.property_id
  ), expired_properties as (
    update public.properties property
    set availability_status = 'expired', updated_at = now()
    from expired_sources source
    where property.id = source.property_id and property.listing_type = 'quick'
    returning property.id
  )
  select count(*)::integer into expired_total from expired_properties;
  return expired_total;
end;
$$;

revoke all on function public.gumi_create_import_batch(uuid) from public, anon, authenticated;
revoke all on function public.gumi_import_chunk(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.gumi_batch_finalize_preview(uuid) from public, anon, authenticated;
revoke all on function public.gumi_finalize_import_batch(uuid, uuid, boolean, text) from public, anon, authenticated;
revoke all on function public.gumi_approve_quick_property(uuid) from public, anon, authenticated;
revoke all on function public.gumi_expire_stale_quick_properties() from public, anon, authenticated;

grant execute on function public.gumi_create_import_batch(uuid) to service_role;
grant execute on function public.gumi_import_chunk(uuid, jsonb) to service_role;
grant execute on function public.gumi_batch_finalize_preview(uuid) to service_role;
grant execute on function public.gumi_finalize_import_batch(uuid, uuid, boolean, text) to service_role;
grant execute on function public.gumi_approve_quick_property(uuid) to service_role;
grant execute on function public.gumi_expire_stale_quick_properties() to service_role;

commit;
