-- 칸공인중개사 홈페이지 매물 테이블
-- Supabase > SQL Editor > New query > 아래 전체 붙여넣기 > Run

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text default '원룸 월세',
  trade_type text default '월세',
  address text default '',
  deposit text default '',
  rent text default '',
  maintenance_fee text default '',
  area text default '',
  building_name text default '',
  floor_info text default '',
  direction text default '',
  parking text default '',
  move_in text default '',
  approval_date text default '',
  room_bath text default '',
  structure text default '',
  summary text default '',
  description text default '',
  photos text[] default '{}',
  map_image text default '',
  map_link text default '',
  convenience text[] default '{}',
  safety text[] default '{}',
  education text[] default '{}',
  is_featured boolean default false,
  status text default 'published' check (status in ('pending', 'published', 'hold')),
  created_at timestamptz default now()
);

alter table public.properties
  add column if not exists status text default 'published'
  check (status in ('pending', 'published', 'hold'));

alter table public.properties
  add column if not exists badges text[] default '{}',
  add column if not exists sale_price text default '',
  add column if not exists loan_amount text default '',
  add column if not exists interest_rate text default '',
  add column if not exists total_deposit text default '',
  add column if not exists acquisition_price text default '',
  add column if not exists total_monthly_rent text default '',
  add column if not exists monthly_interest text default '',
  add column if not exists net_profit text default '',
  add column if not exists annual_net_income text default '',
  add column if not exists return_rate text default '',
  add column if not exists total_units text default '',
  add column if not exists rented_units text default '',
  add column if not exists vacant_units text default '',
  add column if not exists room_count text default '',
  add column if not exists mini_two_count text default '',
  add column if not exists two_room_count text default '',
  add column if not exists owner_unit text default '',
  add column if not exists land_area text default '',
  add column if not exists building_area text default '',
  add column if not exists main_use text default '',
  add column if not exists floor_count text default '',
  add column if not exists basement_floor_count text default '',
  add column if not exists total_floor_info text default '',
  add column if not exists total_area text default '',
  add column if not exists elevator text default '',
  add column if not exists remodeling text default '',
  add column if not exists roof_waterproof text default '',
  add column if not exists building_condition text default '',
  add column if not exists maintenance_includes text default '',
  add column if not exists location_description text default '',
  add column if not exists building_name text default '',
  add column if not exists recommended_for text default '',
  add column if not exists photo_captions text default '',
  add column if not exists legal_notice text default '',
  add column if not exists investment_point text default '',
  add column if not exists risk_note text default '',
  add column if not exists private_memo text default '',
  add column if not exists real_unit text default '',
  add column if not exists entrance_password text default '',
  add column if not exists key_location text default '',
  add column if not exists owner_name text default '',
  add column if not exists owner_phone text default '',
  add column if not exists client_info text default '',
  add column if not exists request_method text default '',
  add column if not exists staff_memo text default '',
  add column if not exists ad_visibility text default '공개',
  add column if not exists internal_tags text default '';

update public.properties
set status = 'published'
where status is null;

-- 빠른 실사용용 설정입니다.
-- 매물은 공개 광고자료라 읽기는 전체 허용합니다.
-- 등록/수정/삭제도 브라우저 관리자 화면에서 처리하기 위해 anon 권한을 허용합니다.
-- 더 강한 보안이 필요하면 Supabase Auth/서버 API 방식으로 바꾸는 것이 맞습니다.
alter table public.properties disable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.properties to anon, authenticated;

insert into public.properties (
  title, category, trade_type, address, deposit, rent, maintenance_fee, area, floor_info,
  direction, parking, move_in, approval_date, room_bath, structure, summary, description,
  photos, map_image, map_link, convenience, safety, education, is_featured, status
) values (
  '구미 인의동 원룸 월세｜200/30 관리비포함 리모델링 풀옵션',
  '원룸 월세',
  '월세',
  '경상북도 구미시 인의동 일원',
  '200만원',
  '30만원',
  '월세 포함',
  '약 30㎡',
  '2층 / 총 4층',
  '동향',
  '건물 내 주차 가능',
  '즉시입주 협의',
  '계약 전 확인',
  '방1 / 욕실1',
  '철근콘크리트구조',
  '인동 생활권과 공단 출퇴근 동선을 함께 보기 좋은 관리비포함 원룸입니다.',
  '리모델링 컨디션, 풀옵션, 관리비포함 조건을 우선으로 보는 직장인·자취 수요자에게 추천드립니다.',
  array[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1200&q=80'
  ],
  '',
  'https://map.naver.com',
  array['편의점 인근', '버스 이용 편리', '인동 생활권', '공단 출퇴근 동선'],
  array['공동현관', '실사진 확인 매물', '직접 확인 후 안내'],
  array['인의동 생활권', '경운대 이동 가능', '직장인 자취 추천'],
  true,
  'published'
) on conflict do nothing;
