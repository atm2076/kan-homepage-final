import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase, isSupabaseReady } from './supabaseClient';
import './styles.css';

const OFFICE = {
  name: '칸공인중개사사무소',
  address: '경상북도 구미시 인의동 991-4번지 4층',
  broker: '정점식',
  phone: '010-5323-3883',
  tel: '054-474-0367',
  regNo: '제47190-2023-00014',
  blog: 'https://blog.naver.com/atm750/224293919179'
};

const defaultFilters = {
  trade: '전체',
  room: '전체',
  area: '전체',
  approval: '전체',
  floor: '전체',
  extra: '전체',
  maintenance: '전체',
  moveIn: '전체',
  parking: '전체',
  optionTags: [],
  depositMin: '',
  depositMax: '',
  rentMin: '',
  rentMax: '',
  saleMin: '',
  saleMax: ''
};

const CUSTOMER_PROPERTY_TYPES = ['전체', '원룸', '미니투룸', '투룸', '쓰리룸 이상', '아파트', '상가/사무실', '토지', '다가구매매', '원룸건물매매'];
const CUSTOMER_TRADE_TYPES = ['월세', '전세', '반전세', '매매', '단기'];
const CUSTOMER_POPULAR_KEYWORDS = [
  '구미원룸',
  '구미원룸월세',
  '구미투룸',
  '인의동 원룸',
  '진평동 원룸',
  '옥계동 원룸',
  '구평동 미니투룸',
  '공단 근처 방',
  '관리비포함 원룸',
  '즉시입주 원룸',
  '구미다가구매매',
  '구미원룸건물매매'
];
const CUSTOMER_OPTION_FILTERS = ['풀옵션', '엘리베이터', '반려동물 가능', 'LH 가능', '중기청 가능'];

function getYear(value) {
  const match = String(value || '').match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
}

function matchApprovalYear(value, filter) {
  if (filter === '전체') return true;

  const year = getYear(value);
  if (!year) return true;

  const age = new Date().getFullYear() - year;

  if (filter === '5년 이내') return age <= 5;
  if (filter === '10년 이내') return age <= 10;
  if (filter === '15년 이내') return age <= 15;
  if (filter === '15년 이상') return age >= 15;

  return true;
}
const emptyForm = {
  title: '',
  category: '원룸 월세',
  trade_type: '월세',
  address: '',
badgesText: '',
  // 임대용
  deposit: '',
  rent: '',
  maintenance_fee: '',

  // 매매용 핵심 금액
  sale_price: '',          // 매매가격
  loan_amount: '',         // 융자금
  interest_rate: '',       // 금리
  total_deposit: '',       // 보증금 총액
  acquisition_price: '',   // 인수가격 / 실인수가
  total_monthly_rent: '',  // 총월세
  monthly_interest: '',    // 월 융자이자
  net_profit: '',          // 월 순수익
  annual_net_income: '',   // 연 순수익
  return_rate: '',         // 수익률

  // 매매용 건물 정보
  total_units: '',         // 총 세대수
  rented_units: '',        // 임대중 세대수
  vacant_units: '',        // 공실 수
  room_count: '',          // 원룸 수
  mini_two_count: '',      // 미니투룸 수
  two_room_count: '',      // 투룸 수
  owner_unit: '',          // 주인세대 여부

  // 공통 정보
  area: '',
  land_area: '',           // 대지면적
  building_area: '',       // 연면적
  building_name: '',       // 건물명
  floor_info: '',
  direction: '',
  parking: '',
  move_in: '',
  approval_date: '',
  main_use: '',
  room_bath: '',
  structure: '',
  floor_count: '',
  basement_floor_count: '',
  total_floor_info: '',
  total_area: '',
  elevator: '',            // 엘리베이터 여부
  remodeling: '',          // 리모델링 여부
  roof_waterproof: '',     // 옥상방수 여부
  building_condition: '',  // 건물 관리상태

  summary: '',
  description: '',
  maintenance_includes: '',
  location_description: '',
  recommended_for: '',
  photo_captions: '',
  legal_notice: '',
  investment_point: '',    // 투자 포인트
  risk_note: '',           // 참고/주의사항

  private_memo: '',
  real_unit: '',
  entrance_password: '',
  key_location: '',
  owner_name: '',
  owner_phone: '',
  client_info: '',
  request_method: '',
  staff_memo: '',
  ad_visibility: '공개',
  internal_tags: '',
  staff_name: '',
  staff_code: '',
  created_by: '',
  updated_by: '',
  updated_at: '',
  photosText: '',
  map_image: '',
  map_link: '',
  convenienceText: '에어컨\n세탁기\n냉장고\nTV\n스타일러\n신발장\n싱크대\n도어락\n인터넷',
  safetyText: '실사진 확인 매물\n직접 확인 후 안내\n공동현관\nCCTV',
  educationText: '편의점 인근\n버스 이용 편리\n공단 출퇴근 동선',
  is_featured: false,
  status: 'pending'
};

const STATUS_LABELS = {
  pending: '임시저장',
  published: '공개중',
  hold: '보류'
};

const OPTION_PRESETS = {
  convenienceText: ['에어컨', '세탁기', '냉장고', 'TV', '인덕션', '전자레인지', '스타일러', '침대', '옷장', '신발장', '책상', '의자', '인터넷', '유선방송'],
  safetyText: ['실사진 확인 매물', '직접 확인 후 안내', '공동현관', 'CCTV', '도어락', '방범창', '화재감지기', '엘리베이터'],
  educationText: ['편의점 인근', '버스 이용 편리', '공단 출퇴근 동선', '마트 인근', '식당가 인근', '병원 인근', '학교 인근', '주차 편리', '조용한 주거지']
};

const QUICK_PROPERTY_TYPES = ['원룸', '미니투룸', '투룸', '쓰리룸 이상', '아파트', '상가/사무실', '토지', '다가구매매', '원룸건물매매'];
const QUICK_TRADE_TYPES = ['월세', '전세', '반전세', '매매'];
const MAINTENANCE_TYPES = ['관리비포함', '관리비별도', '관리비없음', '확인필요'];
const MAINTENANCE_ITEMS = ['인터넷', '유선방송', '공용전기', '수도요금', '공용청소비', '관리용역비', '승강기유지비', '주차비'];
const DIRECTION_OPTIONS = ['동향', '서향', '남향', '북향', '남동향', '남서향', '북동향', '북서향', '확인필요'];
const MOVE_IN_OPTIONS = ['즉시입주', '날짜협의', '공실 확인 필요', '현재 거주중', '날짜 직접입력'];
const PARKING_OPTIONS = ['주차가능', '주차불가', '세대당 1대 가능', '건물 앞 주차', '인근 주차 가능', '주차 확인 필요'];
const HEATING_OPTIONS = ['도시가스', '개별난방', '전기난방', '중앙난방', 'LPG', '확인필요'];
const ELEVATOR_OPTIONS = ['엘리베이터 있음', '엘리베이터 없음', '확인필요'];
const BADGE_OPTIONS = ['추천', '급매', '관리비포함', '즉시입주', '리모델링', '풀옵션', '소액투자', '수익형'];
const POST_STATUS_OPTIONS = [
  { label: '임시저장', value: 'pending' },
  { label: '공개중', value: 'published' },
  { label: '비공개', value: 'hold' },
  { label: '계약완료', value: 'hold' },
  { label: '보류', value: 'hold' },
  { label: '확인필요', value: 'pending' }
];

const PRIVATE_PROPERTY_KEYS = [
  'private_memo',
  'real_unit',
  'entrance_password',
  'key_location',
  'owner_name',
  'owner_phone',
  'client_info',
  'request_method',
  'staff_memo',
  'ad_visibility',
  'internal_tags'
];

const PUBLIC_PROPERTY_COLUMNS = [
  'id',
  'title',
  'category',
  'trade_type',
  'address',
  'badges',
  'deposit',
  'rent',
  'maintenance_fee',
  'sale_price',
  'loan_amount',
  'interest_rate',
  'total_deposit',
  'acquisition_price',
  'total_monthly_rent',
  'monthly_interest',
  'net_profit',
  'annual_net_income',
  'return_rate',
  'total_units',
  'rented_units',
  'vacant_units',
  'room_count',
  'mini_two_count',
  'two_room_count',
  'owner_unit',
  'area',
  'land_area',
  'building_area',
  'building_name',
  'floor_info',
  'direction',
  'parking',
  'move_in',
  'approval_date',
  'main_use',
  'floor_count',
  'basement_floor_count',
  'total_floor_info',
  'total_area',
  'room_bath',
  'structure',
  'elevator',
  'remodeling',
  'roof_waterproof',
  'building_condition',
  'summary',
  'description',
  'maintenance_includes',
  'location_description',
  'recommended_for',
  'photo_captions',
  'legal_notice',
  'investment_point',
  'risk_note',
  'photos',
  'map_image',
  'map_link',
  'convenience',
  'safety',
  'education',
  'is_featured',
  'status',
    'staff_name',
  'staff_code',
  'created_by',
  'updated_by',
  'updated_at',
  'created_at'
].join(',');
const ROOM_BATH_DEFAULTS = {
  원룸: '방 1 / 욕실 1',
  미니투룸: '방 1 / 욕실 1',
  투룸: '방 2 / 욕실 1',
  '쓰리룸 이상': '방 3 / 욕실 1',
  '상가/사무실': '방 0 / 욕실 1',
  아파트: '방 0 / 욕실 0',
  토지: '방 0 / 욕실 0'
};

const PHOTO_ENHANCE_LEVELS = [
  { value: 'none', label: '보정 없음', description: '원본 유지', filter: 'none' },
  { value: 'natural', label: '1단 자연보정', description: '실물에 가깝게', filter: 'brightness(1.04) contrast(1.04) saturate(1.03)' },
  { value: 'bright', label: '2단 밝은보정', description: '밝고 깔끔하게', filter: 'brightness(1.08) contrast(1.08) saturate(1.06)' },
  { value: 'strong', label: '3단 강한보정', description: '어두운 사진 보완', filter: 'brightness(1.14) contrast(1.12) saturate(1.08)' }
];

const sampleProperties = [
  {
    id: 'sample-1',
    title: '구미 인의동 원룸 월세｜200/30 관리비포함 리모델링 풀옵션',
    category: '원룸 월세',
    trade_type: '월세',
    address: '경상북도 구미시 인의동 일원',
    deposit: '200만원',
    rent: '30만원',
    maintenance_fee: '월세 포함',
    area: '약 30㎡',
    floor_info: '2층 / 총 4층',
    direction: '동향',
    parking: '건물 내 주차 가능',
    move_in: '즉시입주 협의',
    approval_date: '계약 전 확인',
    room_bath: '방1 / 욕실1',
    structure: '철근콘크리트구조',
    summary: '인동 생활권과 공단 출퇴근 동선을 함께 보기 좋은 관리비포함 원룸입니다.',
    description: '리모델링 컨디션, 풀옵션, 관리비포함 조건을 우선으로 보는 직장인·자취 수요자에게 추천드립니다.',
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1600&q=80'
    ],
    map_image: '',
    map_link: 'https://map.naver.com',
    convenience: ['에어컨', '세탁기', '냉장고', 'TV', '신발장', '도어락', '인터넷'],
    safety: ['공동현관', '실사진 확인 매물', '직접 확인 후 안내'],
    education: ['인의동 생활권', '경운대 이동 가능', '직장인 자취 추천'],
    is_featured: true,
    status: 'published',
    created_at: new Date().toISOString()
  },
  {
    id: 'sample-2',
    title: '구미 진평동 미니투룸 월세｜500/45 관리비포함 강동병원 인근',
    category: '미니투룸 월세',
    trade_type: '월세',
    address: '경상북도 구미시 진평동 일원',
    deposit: '500만원',
    rent: '45만원',
    maintenance_fee: '월세 포함',
    area: '약 35㎡',
    floor_info: '3층 / 총 4층',
    direction: '남향',
    parking: '주차 가능',
    move_in: '협의 가능',
    approval_date: '계약 전 확인',
    room_bath: '방1.5 / 욕실1',
    structure: '철근콘크리트구조',
    summary: '강동병원 인근 생활권, 국가산단 출퇴근 동선이 좋은 미니투룸입니다.',
    description: '원룸보다 넓은 구조를 찾는 직장인, 1인 넓은 방 선호 고객에게 적합합니다.',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=80',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1600&q=80'
    ],
    map_image: '',
    map_link: 'https://map.naver.com',
    convenience: ['에어컨', '세탁기', '냉장고', '싱크대'],
    safety: ['직접 확인 매물', '실사진 안내', '입주 전 상태 확인'],
    education: ['강동병원 인근', '진평동 먹자상권', '공단 출퇴근 편리'],
    is_featured: false,
    status: 'published',
    created_at: new Date(Date.now() - 1000000).toISOString()
  }
];

function linesToArray(value) {
  return String(value || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeDuplicateAddress(value) {
  return String(value || '')
    .replace(/\([^)]*\)/g, '')
    .replace(/경상북도/g, '경북')
    .replace(/대한민국/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/^경북/, '')
    .toLowerCase();
}

function normalizeDuplicateUnit(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const hoMatch = raw.match(/(\d+)\s*호/);
  if (hoMatch) return hoMatch[1];
  const numbers = raw.match(/\d+/g);
  if (!numbers?.length) return '';
  return numbers[numbers.length - 1];
}

function getPropertyDuplicateParts(property = {}) {
  const addressUnitSource = String(property.address || '').includes('호') ? property.address : '';
  const unitSource = [property.real_unit, property.unit, property.detail_address, property.floor_info, addressUnitSource].filter(Boolean).join(' ');
  return {
    address: normalizeDuplicateAddress(property.address),
    unit: normalizeDuplicateUnit(unitSource),
    category: String(property.category || '').replace(/\s+/g, '').toLowerCase(),
    tradeType: String(property.trade_type || '').replace(/\s+/g, '').toLowerCase()
  };
}

function getPublicFloorInfo(value) {
  return String(value || '')
    .replace(/\s*\/?\s*내부호수\s*:\s*\d+\s*호?/g, '')
    .trim();
}

function getPropertyDuplicateKey(property = {}) {
  const parts = getPropertyDuplicateParts(property);
  return `${parts.address}|${parts.unit}|${parts.category}|${parts.tradeType}`;
}

function toPublicProperty(property = {}) {
  const clean = { ...property };
  PRIVATE_PROPERTY_KEYS.forEach((key) => {
    delete clean[key];
  });
  return clean;
}

function toPublicProperties(list = []) {
  return list.map(toPublicProperty);
}

function findDuplicateProperty(target, list = [], ignoreId) {
  const targetParts = getPropertyDuplicateParts(target);
  if (!targetParts.address || !targetParts.category || !targetParts.tradeType) return null;

  return list.find((item) => {
    if (ignoreId && String(item.id) === String(ignoreId)) return false;
    const parts = getPropertyDuplicateParts(item);
    if (!parts.address || !parts.category || !parts.tradeType) return false;
    const sameBase =
      parts.address === targetParts.address &&
      parts.category === targetParts.category &&
      parts.tradeType === targetParts.tradeType;
    if (!sameBase) return false;
    if (!targetParts.unit || !parts.unit) return true;
    return parts.unit === targetParts.unit;
  }) || null;
}

function dedupePublicProperties(list = []) {
  const seen = new Set();
  return list.filter((item) => {
    if ((item.status || 'published') !== 'published') return true;
    const parts = getPropertyDuplicateParts(item);
    if (!parts.unit) return true;
    const key = getPropertyDuplicateKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function arrayToLines(value) {
  return Array.isArray(value) ? value.join('\n') : '';
}

function normalizeBulkKey(key) {
  return String(key || '')
    .replace(/[\s_\-\/·.()]/g, '')
    .toLowerCase();
}

function cleanBulkValue(value) {
  return String(value || '')
    .replace(/^[-•▶▷*]+\s*/g, '')
    .trim();
}

function parseBulkText(text) {
  const keyMap = {
    제목: 'title',
    매물명: 'title',
    물건명: 'title',
    카테고리: 'category',
    매물종류: 'category',
    거래형태: 'trade_type',
    거래유형: 'trade_type',
    주소: 'address',
    소재지: 'address',
    보증금: 'deposit',
    월세: 'rent',
    관리비: 'maintenance_fee',
    매매가: 'sale_price',
    매매가격: 'sale_price',
    매도가: 'sale_price',
    융자: 'loan_amount',
    융자금: 'loan_amount',
    대출: 'loan_amount',
    대출금: 'loan_amount',
    금리: 'interest_rate',
    보증금총액: 'total_deposit',
    총보증금: 'total_deposit',
    임대보증금: 'total_deposit',
    인수가: 'acquisition_price',
    인수가격: 'acquisition_price',
    실인수가: 'acquisition_price',
    실투자금: 'acquisition_price',
    투자금: 'acquisition_price',
    총월세: 'total_monthly_rent',
    월세수입: 'total_monthly_rent',
    월임대료: 'total_monthly_rent',
    월이자: 'monthly_interest',
    융자이자: 'monthly_interest',
    은행이자: 'monthly_interest',
    월순수익: 'net_profit',
    순수익: 'net_profit',
    월수익: 'net_profit',
    연순수익: 'annual_net_income',
    수익률: 'return_rate',
    총세대수: 'total_units',
    세대수: 'total_units',
    총가구수: 'total_units',
    임대중세대수: 'rented_units',
    임대중: 'rented_units',
    공실수: 'vacant_units',
    공실: 'vacant_units',
    원룸수: 'room_count',
    원룸: 'room_count',
    미니투룸수: 'mini_two_count',
    미투수: 'mini_two_count',
    투룸수: 'two_room_count',
    투룸: 'two_room_count',
    주인세대: 'owner_unit',
    면적: 'area',
    전용면적: 'area',
    대지면적: 'land_area',
    대지: 'land_area',
    연면적: 'building_area',
    건물면적: 'building_area',
    층수: 'floor_info',
    총층: 'floor_info',
    방향: 'direction',
    방욕실: 'room_bath',
    방화장실: 'room_bath',
    세대현황: 'room_bath',
    구성: 'room_bath',
    주차: 'parking',
    입주: 'move_in',
    입주가능일: 'move_in',
    사용승인일: 'approval_date',
    준공일: 'approval_date',
    구조: 'structure',
    엘리베이터: 'elevator',
    승강기: 'elevator',
    리모델링: 'remodeling',
    옥상방수: 'roof_waterproof',
    건물관리상태: 'building_condition',
    짧은설명: 'summary',
    요약: 'summary',
    한줄설명: 'summary',
    한줄요약: 'summary',
    상세설명: 'description',
    설명: 'description',
    관리비포함항목: 'maintenance_includes',
    관리비항목: 'maintenance_includes',
    위치설명: 'location_description',
    위치생활권: 'location_description',
    추천대상: 'recommended_for',
    사진설명: 'photo_captions',
    중개대상물표시광고사항: 'legal_notice',
    표시광고사항: 'legal_notice',
    투자포인트: 'investment_point',
    참고주의사항: 'risk_note',
    주의사항: 'risk_note',
    참고사항: 'risk_note',
    비공개메모: 'private_memo',
    실제호수: 'real_unit',
    호수: 'real_unit',
    공동현관비밀번호: 'entrance_password',
    비밀번호: 'entrance_password',
    열쇠위치: 'key_location',
    집주인이름: 'owner_name',
    집주인: 'owner_name',
    집주인연락처: 'owner_phone',
    집주인전화번호: 'owner_phone',
    집주인전화: 'owner_phone',
    의뢰인정보: 'client_info',
    중개의뢰받은방법: 'request_method',
    의뢰방법: 'request_method',
    담당직원메모: 'staff_memo',
    광고노출여부: 'ad_visibility',
    내부관심태그: 'internal_tags',
    지도이미지url: 'map_image',
    지도이미지: 'map_image',
    지도링크: 'map_link',
    지도url: 'map_link',
    옵션편의: 'convenienceText',
    옵션: 'convenienceText',
    편의: 'convenienceText',
    안전시설: 'safetyText',
    생활권: 'educationText',
    주변시설: 'educationText'
  };

  const next = {};
  const lines = String(text || '').split(/\r?\n/);
  let currentLongField = '';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const match = line.match(/^([^:=：]{1,30})\s*[:=：]\s*(.*)$/);
    if (match) {
      const key = normalizeBulkKey(match[1]);
      const field = keyMap[key];
      const value = cleanBulkValue(match[2]);

      if (field) {
        if (['description', 'maintenance_includes', 'location_description', 'recommended_for', 'photo_captions', 'legal_notice', 'investment_point', 'risk_note', 'private_memo', 'client_info', 'staff_memo', 'internal_tags', 'convenienceText', 'safetyText', 'educationText'].includes(field)) {
          next[field] = next[field] ? `${next[field]}\n${value}` : value;
          currentLongField = field;
        } else {
          next[field] = value;
          currentLongField = '';
        }
      }
      continue;
    }

    if (currentLongField) {
      next[currentLongField] = next[currentLongField]
        ? `${next[currentLongField]}\n${cleanBulkValue(line)}`
        : cleanBulkValue(line);
    }
  }

  if (next.sale_price || next.acquisition_price || next.total_monthly_rent || next.net_profit) {
    next.trade_type = next.trade_type || '매매';
    next.category = next.category || '원룸건물매매';
  }

  return next;
}

function propertyToForm(property) {
  return {
    ...emptyForm,
    ...property,
    photosText: arrayToLines(property.photos),
    convenienceText: arrayToLines(property.convenience),
    safetyText: arrayToLines(property.safety),
    educationText: arrayToLines(property.education),
    badgesText: arrayToLines(property.badges),
  };
}
function getBadgeClassName(badge) {
  const text = String(badge || '').trim();

  if (text.includes('급매') || text.includes('가격인하')) return 'badge-hot';
  if (text.includes('추천')) return 'badge-recommend';
  if (text.includes('수익형')) return 'badge-purple';
  if (text.includes('소액투자') || text.includes('투자금')) return 'badge-gold';
  if (text.includes('즉시입주')) return 'badge-green';
  if (text.includes('관리비')) return 'badge-teal';
  if (text.includes('상가')) return 'badge-gray';
  if (text.includes('리모델링')) return 'badge-orange';
  if (text.includes('신축')) return 'badge-sky';
  if (text.includes('반전세')) return 'badge-purple';
  if (text.includes('실사진') || text.includes('확인')) return 'badge-gray';

  return 'badge-default';
}
function getPropertyBadges(property) {
  const savedBadges = Array.isArray(property.badges) ? property.badges : [];
  const cleanedBadges = savedBadges
    .map((badge) => String(badge).trim())
    .filter(Boolean);

  const baseBadges =
    cleanedBadges.length > 0
      ? cleanedBadges
      : property.is_featured
      ? ['추천']
      : [];

  return [...new Set(baseBadges)];
}
function BadgeList({ property }) {
  const badges = getPropertyBadges(property);
  if (!badges.length) return null;

  return (
    <div className="property-badge-row">
      {badges.map((badge) => (
        <span key={badge} className={`property-badge ${getBadgeClassName(badge)}`}>
          {badge}
        </span>
      ))}
    </div>
  );
}

function hasPrivateAdminInfo(property = {}) {
  return [
    property.private_memo,
    property.real_unit,
    property.entrance_password,
    property.key_location,
    property.owner_name,
    property.owner_phone,
    property.client_info,
    property.request_method,
    property.staff_memo,
    property.internal_tags
  ].some((value) => String(value || '').trim());
}

function formToPayload(form) {
  return {
    title: form.title.trim(),
    category: form.category.trim(),
    trade_type: form.trade_type.trim(),
    address: form.address.trim(),
badges: linesToArray(form.badgesText),
    deposit: (form.deposit || '').trim(),
    rent: (form.rent || '').trim(),
    maintenance_fee: (form.maintenance_fee || '').trim(),

    sale_price: (form.sale_price || '').trim(),
    loan_amount: (form.loan_amount || '').trim(),
    interest_rate: (form.interest_rate || '').trim(),
    total_deposit: (form.total_deposit || '').trim(),
    acquisition_price: (form.acquisition_price || '').trim(),
    total_monthly_rent: (form.total_monthly_rent || '').trim(),
    monthly_interest: (form.monthly_interest || '').trim(),
    net_profit: (form.net_profit || '').trim(),
    annual_net_income: (form.annual_net_income || '').trim(),
    return_rate: (form.return_rate || '').trim(),

    total_units: (form.total_units || '').trim(),
    rented_units: (form.rented_units || '').trim(),
    vacant_units: (form.vacant_units || '').trim(),
    room_count: (form.room_count || '').trim(),
    mini_two_count: (form.mini_two_count || '').trim(),
    two_room_count: (form.two_room_count || '').trim(),
    owner_unit: (form.owner_unit || '').trim(),

    area: (form.area || '').trim(),
    land_area: (form.land_area || '').trim(),
    building_area: (form.building_area || '').trim(),
    building_name: (form.building_name || '').trim(),
    floor_info: (form.floor_info || '').trim(),
    direction: (form.direction || '').trim(),
    parking: (form.parking || '').trim(),
    move_in: (form.move_in || '').trim(),
    approval_date: (form.approval_date || '').trim(),
    main_use: (form.main_use || '').trim(),
    floor_count: (form.floor_count || '').trim(),
    basement_floor_count: (form.basement_floor_count || '').trim(),
    total_floor_info: (form.total_floor_info || '').trim(),
    total_area: (form.total_area || '').trim(),
    room_bath: (form.room_bath || '').trim(),
    structure: (form.structure || '').trim(),
    elevator: (form.elevator || '').trim(),
    remodeling: (form.remodeling || '').trim(),
    roof_waterproof: (form.roof_waterproof || '').trim(),
    building_condition: (form.building_condition || '').trim(),

    summary: (form.summary || '').trim(),
    description: (form.description || '').trim(),
    maintenance_includes: (form.maintenance_includes || '').trim(),
    location_description: (form.location_description || '').trim(),
    recommended_for: (form.recommended_for || '').trim(),
    photo_captions: (form.photo_captions || '').trim(),
    legal_notice: (form.legal_notice || '').trim(),
    investment_point: (form.investment_point || '').trim(),
    risk_note: (form.risk_note || '').trim(),

    private_memo: (form.private_memo || '').trim(),
    real_unit: (form.real_unit || '').trim(),
    entrance_password: (form.entrance_password || '').trim(),
    key_location: (form.key_location || '').trim(),
    owner_name: (form.owner_name || '').trim(),
    owner_phone: (form.owner_phone || '').trim(),
    client_info: (form.client_info || '').trim(),
    request_method: (form.request_method || '').trim(),
    staff_memo: (form.staff_memo || '').trim(),
    ad_visibility: form.ad_visibility || '공개',
    internal_tags: (form.internal_tags || '').trim(),

    photos: linesToArray(form.photosText),
    map_image: (form.map_image || '').trim(),
    map_link: (form.map_link || '').trim(),
    convenience: linesToArray(form.convenienceText),
    safety: linesToArray(form.safetyText),
    education: linesToArray(form.educationText),
    is_featured: Boolean(form.is_featured),
    status: form.status || 'pending'
  };
}
function formatMoneyPair(property) {
  const deposit = property?.deposit || '-';
  const rent = property?.rent || '-';
  return `${deposit} / ${rent}`;
}

function buildInquiryMessage(property) {
  const title = property?.title || '매물';
  const price = formatMoneyPair(property);
  return `[칸공인중개사 문의] ${title}\n가격: ${price}\n위치: ${property?.address || ''}\n이 매물 상담 원합니다.`;
}

function shortAddress(address) {
  if (!address) return '위치 계약 전 확인';
  return address.replace('경상북도 ', '').replace('구미시 ', '구미 ');
}
function formatAmount(value) {
  if (!value) return '-';

  const raw = String(value).trim();

  if (raw.includes('억') || raw.includes('만원')) {
    return raw;
  }

  const cleaned = raw
    .replaceAll(',', '')
    .replaceAll('원', '')
    .replaceAll('약', '')
    .trim();

  const num = Number(cleaned);

  if (Number.isNaN(num)) return raw;

  if (num >= 10000) {
    const eok = Math.floor(num / 10000);
    const man = num % 10000;

    if (man === 0) return `${eok}억원`;
    return `${eok}억 ${man.toLocaleString()}만원`;
  }

  return `${num.toLocaleString()}만원`;
}

function normalizeManwon(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.includes('만원') || raw.includes('억') || raw.includes('원')) return raw;
  return `${raw}만원`;
}

function getMaintenanceInfo(value) {
  const raw = String(value || '').trim();
  if (!raw) return { display: '관리비 확인 필요', includedItems: [] };

  const itemMatch = raw.match(/포함 항목:\s*([^)]+)/);
  const includedItems = itemMatch
    ? itemMatch[1].split(',').map((item) => item.trim()).filter(Boolean)
    : [];
  const display = raw.replace(/\s*\(포함 항목:[^)]+\)/, '').trim();

  return { display: display || raw, includedItems };
}

function normalizeCustomerCategory(value = '') {
  return String(value).replace(/\s+/g, '').replace(/\u00B7/g, '').replace(/·/g, '').toLowerCase();
}

function matchCustomerCategory(property, selectedCategory) {
  if (!selectedCategory || selectedCategory === '전체') return true;
  const categoryText = normalizeCustomerCategory(`${property.category || ''} ${property.title || ''}`);
  const selected = normalizeCustomerCategory(selectedCategory);

  if (selected === '원룸') return categoryText.includes('원룸') && !categoryText.includes('건물');
  if (selected === '미니투룸') return categoryText.includes('미니투룸') || categoryText.includes('미투');
  if (selected === '투룸') return categoryText.includes('투룸') && !categoryText.includes('미니투룸');
  if (selected.includes('쓰리룸')) return categoryText.includes('쓰리룸') || categoryText.includes('3룸') || categoryText.includes('쓰리');
  if (selected.includes('상가')) return categoryText.includes('상가') || categoryText.includes('사무실');
  if (selected.includes('다가구')) return categoryText.includes('다가구');
  if (selected.includes('원룸건물')) return categoryText.includes('원룸건물') || categoryText.includes('원룸빌딩');

  return categoryText.includes(selected);
}

function parseManwon(value) {
  const text = String(value || '').replaceAll(',', '').trim();
  if (!text) return null;
  const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/);
  const manMatch = text.match(/(\d+(?:\.\d+)?)\s*만/);
  if (eokMatch) {
    return Math.round(Number(eokMatch[1]) * 10000 + (manMatch ? Number(manMatch[1]) : 0));
  }
  const numberMatch = text.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return null;
  return Math.round(Number(numberMatch[0]));
}

function matchRange(value, min, max) {
  const amount = parseManwon(value);
  const minValue = parseManwon(min);
  const maxValue = parseManwon(max);
  if (amount === null) return !minValue && !maxValue;
  if (minValue !== null && amount < minValue) return false;
  if (maxValue !== null && amount > maxValue) return false;
  return true;
}

function parseAreaM2(value) {
  const match = String(value || '').replaceAll(',', '').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getPublicSearchText(item = {}) {
  return [
    item.title,
    item.address,
    item.summary,
    item.description,
    item.location_description,
    item.recommended_for,
    item.category,
    item.trade_type,
    item.deposit,
    item.rent,
    item.maintenance_fee,
    item.area,
    item.floor_info,
    item.direction,
    item.parking,
    item.move_in,
    item.approval_date,
    item.room_bath,
    item.structure,
    item.sale_price,
    item.total_monthly_rent,
    item.net_profit,
    item.return_rate,
    item.investment_point,
    item.risk_note,
    ...(item.convenience || []),
    ...(item.safety || []),
    ...(item.education || [])
  ].join(' ').toLowerCase();
}

function matchesCustomerFilters(item, keyword, category, filters) {
  const q = String(keyword || '').trim().toLowerCase();
  const text = getPublicSearchText(item);
  const compactText = text.replace(/\s+/g, '');
  const tradeValue = String(item.trade_type || '').trim();
  const optionTags = Array.isArray(filters.optionTags) ? filters.optionTags : [];

  const matchKeyword = !q || text.includes(q) || compactText.includes(q.replace(/\s+/g, ''));
  const matchCategory = matchCustomerCategory(item, category);
  const matchTrade =
    filters.trade === '전체' ||
    tradeValue === filters.trade ||
    (filters.trade === '단기' && tradeValue.includes('단기'));

  const matchMaintenance =
    filters.maintenance === '전체' ||
    (filters.maintenance === '관리비포함' && (String(item.maintenance_fee || '').includes('포함') || compactText.includes('관리비포함'))) ||
    (filters.maintenance === '관리비별도' && (String(item.maintenance_fee || '').includes('별도') || compactText.includes('관리비별도')));

  const matchMoveIn =
    filters.moveIn === '전체' ||
    (filters.moveIn === '즉시입주' && (String(item.move_in || '').includes('즉시') || compactText.includes('즉시입주'))) ||
    (filters.moveIn === '협의가능' && (String(item.move_in || '').includes('협의') || compactText.includes('협의가능')));

  const matchParking =
    filters.parking === '전체' ||
    (filters.parking === '가능' && compactText.includes('주차') && !compactText.includes('주차불가')) ||
    (filters.parking === '불가능' && compactText.includes('주차불가')) ||
    (filters.parking === '확인필요' && (compactText.includes('주차확인') || compactText.includes('확인필요')));

  const matchOptions = optionTags.every((option) => {
    const key = option.replace(/\s+/g, '');
    if (key === '풀옵션') return compactText.includes('풀옵션') || (item.convenience || []).length >= 5;
    if (key === '엘리베이터') return compactText.includes('엘리베이터') || compactText.includes('승강기');
    if (key === '반려동물가능') return compactText.includes('반려동물') || compactText.includes('애견') || compactText.includes('반려');
    if (key === 'LH가능') return compactText.includes('lh') || compactText.includes('lh가능');
    if (key === '중기청가능') return compactText.includes('중기청');
    return compactText.includes(key.toLowerCase());
  });

  const matchDeposit = matchRange(item.deposit, filters.depositMin, filters.depositMax);
  const matchRent = matchRange(item.rent, filters.rentMin, filters.rentMax);
  const matchSale = matchRange(item.sale_price || item.deposit, filters.saleMin, filters.saleMax);
  const matchApproval = matchApprovalYear(item.approval_date, filters.approval);
  const areaValue = parseAreaM2(item.area);
  const matchArea =
    filters.area === '전체' ||
    areaValue === null ||
    (filters.area === '20㎡ 이하' && areaValue <= 20) ||
    (filters.area === '20~40㎡' && areaValue >= 20 && areaValue <= 40) ||
    (filters.area === '40㎡ 이상' && areaValue >= 40);
  const floorText = String(item.floor_info || '').toLowerCase();
  const matchFloor =
    filters.floor === '전체' ||
    (filters.floor === '1층' && floorText.includes('1층')) ||
    (filters.floor === '2층이상' && /[2-9]층|[1-9][0-9]층/.test(floorText)) ||
    (filters.floor === '반지하' && text.includes('반지하')) ||
    (filters.floor === '옥탑' && text.includes('옥탑'));

  return matchKeyword && matchCategory && matchTrade && matchMaintenance && matchMoveIn && matchParking && matchOptions && matchDeposit && matchRent && matchSale && matchApproval && matchArea && matchFloor;
}

function formatMaintenanceFee(value) {
  const { display } = getMaintenanceInfo(value);
  if (!display) return '관리비 확인 필요';
  if (display.startsWith('관리비 ')) return display.replace(/^관리비\s+/, '관리비 ');
  if (display === '관리비 포함' || display === '관리비 없음' || display === '관리비 확인 필요') return display;
  if (display.includes('포함')) return '관리비 포함';
  if (display.includes('없음')) return '관리비 없음';
  if (display.includes('확인')) return '관리비 확인 필요';
  if (display.includes('별도')) return `관리비 ${display}`;
  return `관리비 ${formatMoney(display)}`;
}

function getSaleDisplay(property) {
  return {
    investment:
      property.acquisition_price ||
      property.takeover_price ||
      property.investment_price ||
      property.investment_amount ||
      property.real_investment ||
      property.actual_investment ||
      property.required_cash ||
      '',
    totalRent:
      property.total_monthly_rent ||
      property.rent ||
      '',
    salePrice:
      property.sale_price ||
      property.deposit ||
      '',
    netProfit:
      property.net_profit ||
      property.monthly_profit ||
      property.net_income ||
      ''
  };
}
function App() {
  const queryMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin');
    if (adminParam === 'staff') return 'staff';
    if (adminParam === 'owner') return 'admin';
    if (adminParam === '1') return 'admin';
    if (params.get('staff') === '1') return 'staff';
    return '';
  }, []);
  const [properties, setProperties] = useState(sampleProperties);
  const [selected, setSelected] = useState(sampleProperties[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('전체');
  const [filters, setFilters] = useState(defaultFilters);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(Boolean(queryMode));
  const [portalMode, setPortalMode] = useState(queryMode);
  const [isAdmin, setIsAdmin] = useState(false);
  const canManageAll = portalMode === 'admin' && isAdmin;
  const isAdminRoute = portalMode === 'admin' || portalMode === 'staff';

  async function loadProperties() {
    setError('');
    setLoading(true);

    if (!isSupabaseReady) {
      const previewList = canManageAll ? sampleProperties : toPublicProperties(sampleProperties.filter((item) => item.status === 'published'));
      const visibleList = canManageAll ? previewList : dedupePublicProperties(previewList);
      setProperties(visibleList);
      setSelected((prev) => visibleList.find((item) => item.id === prev?.id) || visibleList[0]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('properties')
      .select(canManageAll ? '*' : PUBLIC_PROPERTY_COLUMNS)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!canManageAll) {
      query = query.eq('status', 'published');
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      const fallbackList = canManageAll ? sampleProperties : toPublicProperties(sampleProperties.filter((item) => item.status === 'published'));
      const visibleList = canManageAll ? fallbackList : dedupePublicProperties(fallbackList);
      setProperties(visibleList);
      setSelected(visibleList[0]);
    } else {
      const fallbackList = canManageAll ? sampleProperties : toPublicProperties(sampleProperties.filter((item) => item.status === 'published'));
      const rawList = data?.length ? data : fallbackList;
      const list = canManageAll ? rawList : dedupePublicProperties(toPublicProperties(rawList));
      setProperties(list);
      setSelected((prev) => list.find((item) => item.id === prev?.id) || list[0]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProperties();
  }, [canManageAll]);

  const categories = useMemo(() => {
    return CUSTOMER_PROPERTY_TYPES;
  }, [properties]);

   const filtered = useMemo(() => {
    return properties.filter((item) => matchesCustomerFilters(item, keyword, category, filters));
  }, [properties, keyword, category, filters]);

  function selectProperty(property) {
    setSelected(property);
    const target = document.getElementById('property-detail');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const isManagementMode = isAdminRoute && isAdmin;
  const isOwnerAdmin = portalMode === 'admin' && isAdmin;

function handleQuickEditProperty(property) {
  setSelected(property);
  setAdminOpen(true);
  alert('관리자 화면에서 해당 매물의 수정 버튼을 눌러 이어서 수정하세요.');
}

async function handleQuickHoldProperty(property) {
  if (!isSupabaseReady) {
    alert('Supabase 연결 전에는 상태 변경이 되지 않습니다.');
    return;
  }

  const ok = window.confirm('이 매물을 보류 상태로 바꿀까요?');
  if (!ok) return;

  const { error } = await supabase
    .from('properties')
    .update({ status: 'hold' })
    .eq('id', property.id);

  if (error) {
    alert(`보류 처리 실패: ${error.message}`);
    return;
  }

  await loadProperties();
}

async function handleQuickDeleteProperty(property) {
  if (!isOwnerAdmin) {
    alert('삭제는 대표 관리자만 가능합니다.');
    return;
  }

  if (!isSupabaseReady) {
    alert('Supabase 연결 전에는 삭제가 되지 않습니다.');
    return;
  }

  const ok = window.confirm('이 매물을 삭제할까요? 삭제 후 복구가 어렵습니다.');
  if (!ok) return;

  const { error } = await supabase
    .from('properties')
    .delete()
    .eq('id', property.id);

  if (error) {
    alert(`삭제 실패: ${error.message}`);
    return;
  }

  await loadProperties();
}

  return (
 <div className={isAdminRoute && adminOpen ? 'admin-app-mode' : undefined}>
    <Header
  portalMode={portalMode}
  isAdminRoute={isAdminRoute}
  onOpenAdmin={() => setAdminOpen(true)}
/>
     <Hero
  keyword={keyword}
  setKeyword={setKeyword}
  setCategory={setCategory}
  setFilters={setFilters}
       setSelected={setSelected}
/>
      <main className="page-shell">
        {!isSupabaseReady && <SetupNotice />}
        {error && <ErrorNotice message={error} />}
        <CategoryStrip categories={categories} category={category} setCategory={setCategory} />

        {loading ? (
          <div className="empty-box">매물을 불러오는 중입니다.</div>
        ) : (
          <>
            <CustomerListingSection
              properties={filtered}
              selected={selected}
              category={category}
              setCategory={setCategory}
              keyword={keyword}
              setKeyword={setKeyword}
              filters={filters}
              setFilters={setFilters}
              filterSheetOpen={filterSheetOpen}
              setFilterSheetOpen={setFilterSheetOpen}
              onSelect={selectProperty}
                isManagementMode={isManagementMode}
  isOwnerAdmin={isOwnerAdmin}
  onEditProperty={handleQuickEditProperty}
  onHoldProperty={handleQuickHoldProperty}
  onDeleteProperty={handleQuickDeleteProperty}
            />
            <PropertyDetail
              property={selected || filtered[0]}
              allProperties={properties}
              onSelect={selectProperty}
            />
            <CustomerMapView
              properties={filtered.length ? filtered : properties}
              selected={selected || filtered[0] || properties[0]}
              onSelect={setSelected}
              keyword={keyword}
              setKeyword={setKeyword}
              category={category}
              setCategory={setCategory}
              filters={filters}
              setFilters={setFilters}
            />
          </>
        )}
      </main>
      <Footer />
      <FloatingButtons />
      {adminOpen && (
        <AdminModal
          mode={portalMode}
          setMode={setPortalMode}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
         onClose={() => setAdminOpen(false)}
          properties={properties}
          reload={loadProperties}
        />
      )}
    </div>
  );
}

function Header({ portalMode, isAdminRoute, onOpenAdmin }) {
  return (
   <header className="site-header">
  <div className="top-contact">
    <a className="top-phone" href={`tel:${OFFICE.phone}`}>
      ☎ {OFFICE.phone}
    </a>

    <a className="brand top-brand" href="#top" aria-label="칸공인중개사 홈">
      <div className="logo-mark">KHAN</div>
      <div className="brand-text-line">
        <strong>{OFFICE.name}</strong>
        <span>구미 원룸 · 투룸 · 다가구 · 수익형 부동산 전문</span>
      </div>
    </a>

    <nav className="top-nav">
      <a href="#properties">원룸/투룸</a>
      <a href="#property-detail">매물상세</a>
      <a href={OFFICE.blog} target="_blank" rel="noreferrer">블로그</a>
{isAdminRoute ? (
  <button type="button" onClick={onOpenAdmin}>
    {portalMode === 'staff' ? '직원 등록 열기' : '관리자 모드 열기'}
  </button>
) : (
  <a href="#request">매물의뢰</a>
)}
    </nav>
  </div>
</header>
  );
}


function Hero({ keyword, setKeyword, setCategory, setFilters, setSelected }) {
  return (
    <section className="hero" id="top">
      <div className="hero-overlay" />

      <div className="hero-content">
       <p className="hero-badge">구미 원룸·투룸 3,000여 개 · 수익형 매물 150여 개 상담 가능</p>
<h1>구미 방 찾을 때,<br />칸에서 먼저 확인하세요</h1>
<p className="hero-lead">
  원룸·미니투룸·투룸 월세부터 다가구 매매·수익형 부동산까지 조건별로 빠르게 안내합니다.
</p>

        <div className="hero-search">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="인의동 원룸, 진평동 투룸, 옥계동 월세 검색"
          />
          <a href="#properties">매물검색</a>
        </div>

        <div className="hero-actions">
          <a className="primary-btn" href={`tel:${OFFICE.phone}`}>전화상담 {OFFICE.phone}</a>
          <a className="secondary-btn" href={`sms:${OFFICE.phone}`}>문자문의</a>
        </div>
      </div>

      <div className="hero-map-card map-dashboard-card">
        <div className="map-card-head">
          <div className="map-card-icon">⌖</div>
          <div>
            <strong>구미·칠곡 매물 지도</strong>
            <p>원하는 지역과 매물 유형을 빠르게 선택해보세요.</p>
          </div>
        </div>

        <div className="map-control-row">
          <div className="map-search-box">
            <span>⌕</span>
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="인의동 원룸, 진평동 투룸, 옥계동 월세 검색"
            />
          </div>
          <button type="button" onClick={() => setKeyword(keyword.trim())}>
            검색
          </button>
        </div>

      <NaverMapBox
  setKeyword={setKeyword}
  setCategory={setCategory}
  setFilters={setFilters}
        setSelected={setSelected}
/>
        <a className="hero-map-page-link" href="#map-view">지도에서 가까운 방 찾기</a>
      </div>
    </section>
  );
}  
const NAVER_MAP_CLIENT_ID = 'lbmpj85ec5';

const KAN_MAP_AREAS = [
  {
    label: '구미 전지역',
    count: '3,000+',
    keyword: '구미',
    lat: 36.1195,
    lng: 128.3446,
  },
  {
    label: '원룸·투룸',
    count: '2,400+',
    keyword: '원룸',
    lat: 36.1092,
    lng: 128.4196,
  },
  {
    label: '북삼',
    count: '300+',
    keyword: '북삼',
    lat: 36.0647,
    lng: 128.3478,
  },
  {
    label: '석적·중리',
    count: '260+',
    keyword: '석적',
    lat: 36.0757,
    lng: 128.4078,
  },
  {
    label: '수익형 부동산',
    count: '150+',
    keyword: '수익형',
    lat: 36.1217,
    lng: 128.3643,
  },
];

function loadNaverMapScript() {
  return new Promise((resolve, reject) => {
    if (window.naver?.maps) {
      resolve();
      return;
    }

    const existingScript = document.getElementById('naver-map-script');
    if (existingScript) {
      existingScript.addEventListener('load', resolve);
      existingScript.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.id = 'naver-map-script';
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${NAVER_MAP_CLIENT_ID}`;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

function NaverMapBox({ setKeyword, setCategory, setFilters, setSelected }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let isMounted = true;

    const clearMarkers = () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };

    const getZoomStage = (zoom) => {
      if (zoom >= 15) return 'property';
      if (zoom >= 12) return 'dong';
      return 'area';
    };

    const AREA_MARKERS = [
      { label: '구미권', count: '3,000+', keyword: '구미', lat: 36.1195, lng: 128.3446, zoom: 12 },
      { label: '인동·진평', count: '720+', keyword: '진평', lat: 36.1075, lng: 128.4245, zoom: 13 },
      { label: '옥계·산동', count: '480+', keyword: '옥계', lat: 36.1437, lng: 128.4205, zoom: 13 },
      { label: '북삼', count: '300+', keyword: '북삼', lat: 36.0647, lng: 128.3478, zoom: 13 },
      { label: '석적·중리', count: '260+', keyword: '석적', lat: 36.0757, lng: 128.4078, zoom: 13 },
      { label: '수익형', count: '150+', keyword: '수익형', lat: 36.1217, lng: 128.3643, zoom: 13 },
    ];

    const DONG_MARKERS = [
      { label: '인의동', count: '210', keyword: '인의동', lat: 36.1032, lng: 128.4282, zoom: 15 },
      { label: '진평동', count: '180', keyword: '진평동', lat: 36.1008, lng: 128.4218, zoom: 15 },
      { label: '구평동', count: '130', keyword: '구평동', lat: 36.0938, lng: 128.4318, zoom: 15 },
      { label: '옥계동', count: '220', keyword: '옥계동', lat: 36.1395, lng: 128.4208, zoom: 15 },
      { label: '공단권', count: '350', keyword: '공단', lat: 36.1168, lng: 128.3828, zoom: 15 },
      { label: '북삼읍', count: '300', keyword: '북삼', lat: 36.0647, lng: 128.3478, zoom: 15 },
      { label: '석적읍', count: '260', keyword: '석적', lat: 36.0757, lng: 128.4078, zoom: 15 },
    ];

    const PROPERTY_MARKERS = [
      { label: '진평동 원룸', count: '8', keyword: '진평동 원룸', lat: 36.1008, lng: 128.4218 },
      { label: '인의동 원룸', count: '6', keyword: '인의동 원룸', lat: 36.1032, lng: 128.4282 },
      { label: '구평동 투룸', count: '4', keyword: '구평동 투룸', lat: 36.0938, lng: 128.4318 },
      { label: '옥계동 원룸', count: '7', keyword: '옥계동 원룸', lat: 36.1395, lng: 128.4208 },
      { label: '북삼 투룸', count: '5', keyword: '북삼 투룸', lat: 36.0647, lng: 128.3478 },
      { label: '석적 원룸', count: '3', keyword: '석적 원룸', lat: 36.0757, lng: 128.4078 },
      { label: '다가구 매매', count: '2', keyword: '다가구매매', lat: 36.1217, lng: 128.3643 },
    ];

    const getMarkersByStage = (stage) => {
      if (stage === 'property') return PROPERTY_MARKERS;
      if (stage === 'dong') return DONG_MARKERS;
      return AREA_MARKERS;
    };

    const renderMarkers = (map, naver) => {
      clearMarkers();

      const zoom = map.getZoom();
      const stage = getZoomStage(zoom);
      const markers = getMarkersByStage(stage);

      markers.forEach((item) => {
        const marker = new naver.maps.Marker({
          position: new naver.maps.LatLng(item.lat, item.lng),
          map,
          icon: {
            content: `
              <div class="naver-count-marker naver-cluster-marker ${stage}">
                <span>${item.count}</span>
                <strong>${item.label}</strong>
              </div>
            `,
            size: new naver.maps.Size(92, 78),
            anchor: new naver.maps.Point(46, 39),
          },
        });

        naver.maps.Event.addListener(marker, 'click', () => {
          setKeyword(item.keyword);

if (typeof setCategory === 'function') {
  setCategory('전체');
}

if (typeof setFilters === 'function') {
  setFilters((prev) => ({
    ...prev,
    trade: '전체',
    room: '전체',
    approval: '전체',
    floor: '전체',
    extra: '전체',
  }));
}
if (typeof setSelected === 'function') {
  setSelected(null);
}
if (stage === 'area' || stage === 'dong') {
  map.panTo(new naver.maps.LatLng(item.lat, item.lng));
  map.setZoom(item.zoom || zoom + 2);
  return;
}
          if (stage === 'area' || stage === 'dong') {
            map.panTo(new naver.maps.LatLng(item.lat, item.lng));
            map.setZoom(item.zoom || zoom + 2);
            return;
          }

          const listSection =
            document.querySelector('.property-layout') ||
            document.querySelector('.property-list') ||
            document.querySelector('.listing-section');

          if (listSection) {
            listSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        });

        markersRef.current.push(marker);
      });
    };

    loadNaverMapScript()
      .then(() => {
        if (!isMounted || !mapElementRef.current || !window.naver?.maps) return;

        const naver = window.naver;

        const map = new naver.maps.Map(mapElementRef.current, {
          center: new naver.maps.LatLng(36.1195, 128.3446),
          zoom: 11,
          minZoom: 9,
          maxZoom: 17,
          zoomControl: true,
          zoomControlOptions: {
            position: naver.maps.Position.TOP_RIGHT,
          },
        });

        mapRef.current = map;
        renderMarkers(map, naver);

        naver.maps.Event.addListener(map, 'zoom_changed', () => {
          renderMarkers(map, naver);
        });
      })
      .catch((error) => {
        console.error('네이버지도 로딩 오류:', error);
      });

    return () => {
      isMounted = false;
      clearMarkers();
    };
  }, [setKeyword]);

  return (
    <div className="naver-map-wrap">
      <div ref={mapElementRef} className="naver-real-map" />
      <p className="map-help-text">
        숫자 마커를 누르면 지역별 매물을 확인할 수 있습니다.
      </p>
    </div>
  );
}

const CUSTOMER_MAP_AREAS = [
  { key: '인의동', lat: 36.1032, lng: 128.4282, x: 64, y: 51 },
  { key: '진평동', lat: 36.1008, lng: 128.4218, x: 59, y: 54 },
  { key: '구평동', lat: 36.0938, lng: 128.4318, x: 68, y: 59 },
  { key: '옥계동', lat: 36.1395, lng: 128.4208, x: 58, y: 35 },
  { key: '공단', lat: 36.1168, lng: 128.3828, x: 43, y: 50 },
  { key: '북삼', lat: 36.0647, lng: 128.3478, x: 31, y: 72 },
  { key: '석적', lat: 36.0757, lng: 128.4078, x: 54, y: 70 },
  { key: '칠곡', lat: 36.0647, lng: 128.3478, x: 30, y: 76 },
  { key: '구미', lat: 36.1195, lng: 128.3446, x: 36, y: 45 }
];

function getPropertyMapPoint(property = {}, index = 0) {
  const text = `${property.address || ''} ${property.title || ''}`;
  const base = CUSTOMER_MAP_AREAS.find((area) => text.includes(area.key)) || CUSTOMER_MAP_AREAS[CUSTOMER_MAP_AREAS.length - 1];
  const offset = ((index % 5) - 2) * 0.004;
  return {
    lat: base.lat + offset,
    lng: base.lng + ((index % 3) - 1) * 0.004,
    x: Math.min(86, Math.max(14, base.x + ((index % 5) - 2) * 3)),
    y: Math.min(84, Math.max(16, base.y + ((index % 4) - 1) * 4))
  };
}

function getCustomerMarkerClass(property = {}) {
  const badges = getPropertyBadges(property).join(' ');
  const text = `${badges} ${property.category || ''} ${property.maintenance_fee || ''}`;
  if (text.includes('급매')) return 'hot';
  if (text.includes('수익형') || text.includes('건물') || text.includes('다가구')) return 'profit';
  if (text.includes('관리비')) return 'maintenance';
  if (property.is_featured || text.includes('추천')) return 'featured';
  return 'default';
}

function getMapMarkerLabel(property = {}) {
  if (property.category?.includes('매매') || property.trade_type === '매매') {
    return formatAmount(property.sale_price || getSaleDisplay(property).salePrice || property.deposit);
  }
  return property.rent ? `월 ${formatAmount(property.rent)}` : '문의';
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function CustomerMapView({ properties, selected, onSelect, keyword, setKeyword, category, setCategory, filters, setFilters }) {
  const mapElementRef = useRef(null);
  const markersRef = useRef([]);
  const mapRef = useRef(null);
  const [activeTab, setActiveTab] = useState('');
  const selectedProperty = properties.find((item) => item.id === selected?.id) || properties[0];
  const markerItems = useMemo(() => properties.slice(0, 60).map((property, index) => ({
    property,
    point: getPropertyMapPoint(property, index),
    markerClass: getCustomerMarkerClass(property)
  })), [properties]);

  useEffect(() => {
    let mounted = true;

    const clearMarkers = () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
    };

    loadNaverMapScript()
      .then(() => {
        if (!mounted || !mapElementRef.current || !window.naver?.maps) return;
        const naver = window.naver;
        const map = mapRef.current || new naver.maps.Map(mapElementRef.current, {
          center: new naver.maps.LatLng(36.1195, 128.3906),
          zoom: 12,
          minZoom: 10,
          maxZoom: 17,
          zoomControl: true,
          zoomControlOptions: { position: naver.maps.Position.TOP_RIGHT }
        });

        mapRef.current = map;

const resizeCustomerMap = () => {
  if (!mapElementRef.current) return;

  const width = mapElementRef.current.clientWidth;
  const height = mapElementRef.current.clientHeight;

  if (width > 0 && height > 0) {
    map.setSize(new naver.maps.Size(width, height));
    naver.maps.Event.trigger(map, 'resize');
    map.setCenter(new naver.maps.LatLng(36.1195, 128.3906));
  }
};

requestAnimationFrame(resizeCustomerMap);
setTimeout(resizeCustomerMap, 300);
setTimeout(resizeCustomerMap, 900);

clearMarkers();
   markerItems.forEach(({ property, point, markerClass }) => {
          const marker = new naver.maps.Marker({
            position: new naver.maps.LatLng(point.lat, point.lng),
            map,
            icon: {
              content: `<div class="customer-map-naver-marker ${markerClass}"><span>${escapeHtml(getMapMarkerLabel(property))}</span></div>`,
              size: new naver.maps.Size(86, 40),
              anchor: new naver.maps.Point(43, 20)
            }
          });
          naver.maps.Event.addListener(marker, 'click', () => onSelect(property));
          markersRef.current.push(marker);
        });
      })
      .catch(() => {});

    return () => {
      mounted = false;
      clearMarkers();
    };
  }, [markerItems, onSelect]);

  const applyMapFilter = (key, value) => {
    if (key === 'category') setCategory(value);
    else setFilters((prev) => ({ ...prev, [key]: value }));
    setActiveTab('');
  };

  return (
    <section className="customer-map-view" id="map-view">
      <div className="customer-map-canvas">
        <div ref={mapElementRef} className="customer-real-map" />
        <div className="customer-map-topbar">
          <div className="map-search-inline">
            <span>⌕</span>
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="인의동 원룸, 진평동 투룸, 옥계동 월세 검색" />
          </div>
          <MapFilterDropdown label="전체" onClick={() => { setCategory('전체'); setFilters(defaultFilters); }} />
          <MapFilterDropdown label="매물 종류" active={activeTab === 'type'} onClick={() => setActiveTab(activeTab === 'type' ? '' : 'type')} />
          <MapFilterDropdown label="거래 유형/가격" active={activeTab === 'trade'} onClick={() => setActiveTab(activeTab === 'trade' ? '' : 'trade')} />
          <MapFilterDropdown label="평형" active={activeTab === 'area'} onClick={() => setActiveTab(activeTab === 'area' ? '' : 'area')} />
          <MapFilterDropdown label="층수" active={activeTab === 'floor'} onClick={() => setActiveTab(activeTab === 'floor' ? '' : 'floor')} />
          <MapFilterDropdown label="사용승인일" active={activeTab === 'approval'} onClick={() => setActiveTab(activeTab === 'approval' ? '' : 'approval')} />
          <MapFilterDropdown label="기타 조건" active={activeTab === 'extra'} onClick={() => setActiveTab(activeTab === 'extra' ? '' : 'extra')} />
        </div>

        {activeTab && (
          <div className="map-filter-popover">
            {activeTab === 'type' && CUSTOMER_PROPERTY_TYPES.filter((item) => item !== '전체').map((item) => (
              <button key={item} type="button" onClick={() => applyMapFilter('category', item)}>{item}</button>
            ))}
            {activeTab === 'trade' && CUSTOMER_TRADE_TYPES.map((item) => (
              <button key={item} type="button" onClick={() => applyMapFilter('trade', item)}>{item}</button>
            ))}
            {activeTab === 'area' && ['전체', '20㎡ 이하', '20~40㎡', '40㎡ 이상'].map((item) => (
              <button key={item} type="button" onClick={() => applyMapFilter('area', item)}>{item}</button>
            ))}
            {activeTab === 'floor' && ['전체', '1층', '2층이상', '반지하', '옥탑'].map((item) => (
              <button key={item} type="button" onClick={() => applyMapFilter('floor', item)}>{item}</button>
            ))}
            {activeTab === 'approval' && ['전체', '5년 이내', '10년 이내', '15년 이내', '15년 이상'].map((item) => (
              <button key={item} type="button" onClick={() => applyMapFilter('approval', item)}>{item}</button>
            ))}
            {activeTab === 'extra' && ['관리비포함', '즉시입주', '주차가능', '풀옵션', '엘리베이터', 'LH 가능', '중기청 가능'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (item === '관리비포함') applyMapFilter('maintenance', '관리비포함');
                  else if (item === '즉시입주') applyMapFilter('moveIn', '즉시입주');
                  else if (item === '주차가능') applyMapFilter('parking', '가능');
                  else setFilters((prev) => ({ ...prev, optionTags: [...new Set([...(prev.optionTags || []), item])] }));
                  setActiveTab('');
                }}
              >
                {item}
              </button>
            ))}
          </div>
        )}

      </div>

      <MapPropertyPanel property={selectedProperty} />
    </section>
  );
}

function MapFilterDropdown({ label, active, onClick }) {
  return (
    <button type="button" className={`map-filter-button ${active ? 'active' : ''}`} onClick={onClick}>
      {label}
    </button>
  );
}

function MapPropertyPanel({ property }) {
  if (!property) {
    return <aside className="map-property-panel empty-box">지도에서 매물을 선택하세요.</aside>;
  }

  const cover = property.photos?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1000&q=80';
  const isSale = property.category?.includes('매매') || property.trade_type === '매매';
  const inquiryBody = encodeURIComponent(buildInquiryMessage(property));
  const photoCount = property.photos?.length || 0;

  return (
    <aside className="map-property-panel">
      <div className="map-panel-scroll">
        <div className="map-panel-photo">
          <img src={cover} alt={property.title || '매물 대표사진'} />
          <span>사진 {photoCount || 1}</span>
        </div>
        <div className="badge-line">
          <BadgeList property={property} />
          <span>{property.category || '매물'}</span>
          <span>{property.trade_type || '거래형태 확인'}</span>
        </div>
        <h2>{isSale ? `매매가 ${formatAmount(getSaleDisplay(property).salePrice)}` : `보증금 ${formatAmount(property.deposit)} / 월세 ${formatAmount(property.rent)}`}</h2>
        <p className="map-panel-address">{shortAddress(property.address)}</p>
        <div className="map-panel-facts">
          <span>{formatMaintenanceFee(property.maintenance_fee)}</span>
          <span>전용 {property.area || '확인'}</span>
          <span>{property.room_bath || '방/욕실 확인'}</span>
          <span>{getPublicFloorInfo(property.floor_info) || '층수 확인'}</span>
          {property.category?.includes('상가') && <span>권리금 상담 확인</span>}
        </div>
        <p className="lead-text">{property.summary || '상담 시 조건을 빠르게 안내드립니다.'}</p>
        <TextLines value={property.description} fallback="사진과 조건을 확인하시고 전화 또는 문자로 문의주시면 현장 상황과 입주 가능 여부를 안내드립니다." />
        <div className="map-panel-meta">
          <span>등록일 {property.created_at ? new Date(property.created_at).toLocaleDateString('ko-KR') : '확인 중'}</span>
          <span>관심 {property.is_featured ? '추천 매물' : '상담 가능'}</span>
        </div>
      </div>
      <div className="map-panel-actions">
        <a href={`tel:${OFFICE.phone}`}>전화문의</a>
        <a href={`sms:${OFFICE.phone}?body=${inquiryBody}`}>문자문의</a>
      </div>
    </aside>
  );
}
function CategoryStrip({ categories, category, setCategory }) {
  return (
    <section className="category-strip">
      {categories.map((name) => (
        <button key={name} className={category === name ? 'active' : ''} onClick={() => setCategory(name)}>
          {name}
        </button>
      ))}
    </section>
  );
}
function FilterBar({ filters, setFilters, onReset }) {
  const update = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="filter-strip">
     <select value={filters.trade} onChange={(e) => update('trade', e.target.value)}>
  <option value="전체">거래형태</option>
  <option value="월세">월세</option>
  <option value="반전세">반전세</option>
  <option value="전세">전세</option>
  <option value="매매">매매</option>
       <option value="매매">매매</option>
</select>

      <select value={filters.room} onChange={(e) => update('room', e.target.value)}>
        <option value="전체">방크기</option>
        <option value="원룸">원룸</option>
        <option value="미니투룸">미니투룸</option>
        <option value="투룸">투룸</option>
        <option value="쓰리룸">쓰리룸</option>
      </select>

      <select value={filters.approval} onChange={(e) => update('approval', e.target.value)}>
        <option value="전체">사용승인일</option>
        <option value="5년 이내">5년 이내</option>
        <option value="10년 이내">10년 이내</option>
        <option value="15년 이내">15년 이내</option>
        <option value="15년 이상">15년 이상</option>
      </select>

      <select value={filters.floor} onChange={(e) => update('floor', e.target.value)}>
        <option value="전체">층수</option>
        <option value="1층">1층</option>
        <option value="2층이상">2층이상</option>
        <option value="반지하">반지하</option>
        <option value="옥탑">옥탑</option>
      </select>

     <select value={filters.extra} onChange={(e) => update('extra', e.target.value)}>
  <option value="전체">추가필터</option>
  <option value="관리비 포함">관리비 포함</option>
  <option value="즉시입주">즉시입주</option>
  <option value="리모델링">리모델링</option>
  <option value="풀옵션">풀옵션</option>
  <option value="주차 가능">주차 가능</option>
  <option value="엘리베이터">엘리베이터</option>
  <option value="복층">복층</option>
</select>

      <button type="button" onClick={onReset} className="reset-filter-btn">
        초기화
      </button>
    </div>
  );
}

function CustomerListingSection({
  properties,
  selected,
  category,
  setCategory,
  keyword,
  setKeyword,
  filters,
  setFilters,
  filterSheetOpen,
  setFilterSheetOpen,
  onSelect,
  isManagementMode = false,
  isOwnerAdmin = false,
  onEditProperty,
  onHoldProperty,
  onDeleteProperty
}) {
  const resetAll = () => {
    setCategory('전체');
    setFilters(defaultFilters);
  };

  const applyPopularKeyword = (nextKeyword) => {
    setKeyword(nextKeyword);
    const target = document.getElementById('properties');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section className="customer-market-section" id="properties">
      <div className="customer-market-head">
        <div>
          <p className="eyebrow">KhAN PROPERTY PLATFORM</p>
          <h2>구미·칠곡 원룸·투룸·다가구 매물</h2>
          <p className="muted">검색, 필터, 지도 보기까지 한 화면에서 빠르게 확인하세요.</p>
        </div>
        <a className="map-view-button" href="#map-view">지도에서 가까운 방 찾기</a>
      </div>

      <div className="customer-search-panel">
        <div className="customer-search-box">
          <span>⌕</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="인의동 원룸, 진평동 투룸, 옥계동 월세 검색"
          />
          <button type="button" className="mobile-filter-open" onClick={() => setFilterSheetOpen(true)}>필터</button>
        </div>
        <div className="popular-keyword-row">
          {CUSTOMER_POPULAR_KEYWORDS.map((item) => (
            <button key={item} type="button" onClick={() => applyPopularKeyword(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="customer-market-layout">
        <aside className="customer-filter-sidebar">
          <CustomerFilterControls
            category={category}
            setCategory={setCategory}
            filters={filters}
            setFilters={setFilters}
            onReset={resetAll}
          />
        </aside>

        <div className="customer-results-panel">
          <div className="customer-results-top">
            <strong>{category === '전체' ? '전체 매물' : category}</strong>
            <span>{properties.length}개 매물</span>
          </div>
          <div className="customer-property-grid">
            {properties.map((property) => (
             <PropertyListItem
  key={property.id}
  property={property}
  active={selected?.id === property.id}
  onClick={() => onSelect(property)}
  isManagementMode={isManagementMode}
  isOwnerAdmin={isOwnerAdmin}
  onEdit={onEditProperty}
  onHold={onHoldProperty}
  onDelete={onDeleteProperty}
/>
            ))}
            {!properties.length && <div className="empty-box">검색 조건에 맞는 매물이 없습니다.</div>}
          </div>
        </div>
      </div>

      {filterSheetOpen && (
        <div className="filter-sheet-backdrop" onClick={() => setFilterSheetOpen(false)}>
          <div className="filter-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="filter-sheet-head">
              <strong>상세 필터</strong>
              <button type="button" onClick={() => setFilterSheetOpen(false)}>닫기</button>
            </div>
            <CustomerFilterControls
              category={category}
              setCategory={setCategory}
              filters={filters}
              setFilters={setFilters}
              onReset={resetAll}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function CustomerFilterControls({ category, setCategory, filters, setFilters, onReset, compact = false }) {
  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleOption = (option) => {
    setFilters((prev) => {
      const current = Array.isArray(prev.optionTags) ? prev.optionTags : [];
      const next = current.includes(option)
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, optionTags: next };
    });
  };

  const optionTags = Array.isArray(filters.optionTags) ? filters.optionTags : [];

  return (
    <div className={`customer-filter-controls ${compact ? 'compact' : ''}`}>
      <FilterChipGroup label="매물 종류" value={category} options={CUSTOMER_PROPERTY_TYPES} onChange={setCategory} />
      <FilterChipGroup label="거래 형태" value={filters.trade} options={['전체', ...CUSTOMER_TRADE_TYPES]} onChange={(value) => updateFilter('trade', value)} />
      <FilterChipGroup label="관리비" value={filters.maintenance} options={['전체', '관리비포함', '관리비별도']} onChange={(value) => updateFilter('maintenance', value)} />
      <FilterChipGroup label="입주 가능일" value={filters.moveIn} options={['전체', '즉시입주', '협의가능']} onChange={(value) => updateFilter('moveIn', value)} />
      <FilterChipGroup label="주차" value={filters.parking} options={['전체', '가능', '불가능', '확인필요']} onChange={(value) => updateFilter('parking', value)} />

      <div className="customer-filter-block">
        <h3>옵션</h3>
        <div className="filter-chip-wrap">
          {CUSTOMER_OPTION_FILTERS.map((option) => (
            <button
              key={option}
              type="button"
              className={optionTags.includes(option) ? 'active' : ''}
              onClick={() => toggleOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="customer-filter-block">
        <h3>가격 조건</h3>
        <PriceRange label="보증금" min={filters.depositMin} max={filters.depositMax} onMin={(value) => updateFilter('depositMin', value)} onMax={(value) => updateFilter('depositMax', value)} />
        <PriceRange label="월세" min={filters.rentMin} max={filters.rentMax} onMin={(value) => updateFilter('rentMin', value)} onMax={(value) => updateFilter('rentMax', value)} />
        <PriceRange label="매매가" min={filters.saleMin} max={filters.saleMax} onMin={(value) => updateFilter('saleMin', value)} onMax={(value) => updateFilter('saleMax', value)} />
      </div>

      <div className="customer-filter-actions">
        <button type="button" onClick={onReset}>필터 초기화</button>
      </div>
    </div>
  );
}

function FilterChipGroup({ label, value, options, onChange }) {
  return (
    <div className="customer-filter-block">
      <h3>{label}</h3>
      <div className="filter-chip-wrap">
        {options.map((option) => (
          <button key={option} type="button" className={value === option ? 'active' : ''} onClick={() => onChange(option)}>
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceRange({ label, min, max, onMin, onMax }) {
  return (
    <div className="price-range-row">
      <span>{label}</span>
      <input value={min || ''} onChange={(e) => onMin(e.target.value)} inputMode="numeric" placeholder="최소" />
      <input value={max || ''} onChange={(e) => onMax(e.target.value)} inputMode="numeric" placeholder="최대" />
    </div>
  );
}

function SetupNotice() {
  return (
    <div className="notice warning">
      <strong>Supabase 연결 전 미리보기 상태입니다.</strong>
      <span>Vercel 환경변수 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 넣으면 실제 DB 매물로 전환됩니다.</span>
    </div>
  );
}

function ErrorNotice({ message }) {
  return (
    <div className="notice error">
      <strong>DB 연결 확인 필요</strong>
      <span>{message}</span>
    </div>
  );
}
function PropertyListItem({ property, active, onClick, isManagementMode = false, isOwnerAdmin = false, onEdit, onHold, onDelete }) {
  const cover =
    property.photos?.[0] ||
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80';

  const isSale =
    property.category?.includes('매매') ||
    property.trade_type === '매매';

  const formatMoney = (value) => {
    if (!value) return '-';

    const raw = String(value).trim();

    if (raw.includes('억')) {
      return raw;
    }

    const cleaned = raw
      .replaceAll(',', '')
      .replaceAll('만원', '')
      .replaceAll('원', '')
      .replaceAll('약', '')
      .trim();

    const num = Number(cleaned);

    if (Number.isNaN(num)) return raw;

    if (num >= 10000) {
      const eok = Math.floor(num / 10000);
      const man = num % 10000;

      if (man === 0) {
        return `${eok}억원`;
      }

      return `${eok}억 ${man.toLocaleString()}만원`;
    }

    return `${num.toLocaleString()}만원`;
  };

  const investment =
    property.investment_price ||
    property.investment_amount ||
    property.acquisition_price ||
    property.takeover_price ||
    property.takeover_amount ||
    property.real_investment ||
    property.actual_investment ||
    property.purchase_fund ||
    property.invest_price ||
    property.required_cash ||
    property.takeover_amount_text;

  const netIncome =
    property.monthly_net_income ||
    property.net_monthly_income ||
    property.net_profit ||
    property.monthly_profit ||
    property.net_income ||
    property.monthly_surplus ||
    property.net_monthly_profit;
  const inquiryBody = encodeURIComponent(buildInquiryMessage(property));
  const moveInText = String(property.move_in || '').includes('즉시') ? '즉시입주' : (property.move_in || '입주 협의');
  const maintenanceText = formatMaintenanceFee(property.maintenance_fee);
  const regionText = shortAddress(property.address);

  return (
    <article className={`property-list-item customer-property-card ${active ? 'active' : ''}`}>
      <button type="button" className="property-card-main" onClick={onClick}>
        <div className="list-thumb">
          <img src={cover} alt={property.title} />
          <BadgeList property={property} />
        </div>

        <div className="list-info mobile-card-text">
          <p className="customer-card-region">{regionText}</p>
          <div className="customer-card-type-row">
            <span>{property.category || '매물'}</span>
            <span>{property.trade_type || '거래형태 확인'}</span>
          </div>

        {isSale ? (
          <div className="list-price">
            <b>매매가 {formatAmount(getSaleDisplay(property).salePrice || property.sale_price || property.deposit)}</b>
          </div>
        ) : (
          <div className="list-price">
            <b>
              보증금 {formatMoney(property.deposit)} / 월세 {formatMoney(property.rent || property.monthly_rent)}
            </b>
           <em>{maintenanceText}</em>
          </div>
        )}

          <p className="customer-card-summary">{property.summary || '조건 확인 후 빠르게 안내드립니다.'}</p>

          <div className="mini-facts mobile-card-extra-info">
            <span>{maintenanceText}</span>
            <span>{moveInText}</span>
        </div>
        </div>
      </button>
      <div className="property-card-actions">
  {isManagementMode ? (
    <>
      <button type="button" onClick={(e) => { e.stopPropagation(); onEdit?.(property); }}>
        수정
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onHold?.(property); }}>
        보류
      </button>
      {isOwnerAdmin && (
        <button type="button" onClick={(e) => { e.stopPropagation(); onDelete?.(property); }}>
          삭제
        </button>
      )}
    </>
  ) : (
    <>
      <a href={`tel:${OFFICE.phone}`}>전화</a>
      <a href={`sms:${OFFICE.phone}?body=${inquiryBody}`}>문자</a>
    </>
  )}
</div>
    </article>
  );
}

function PropertyDetail({ property, allProperties = [], onSelect }) {
  const [activePhoto, setActivePhoto] = useState(0);

  useEffect(() => {
    setActivePhoto(0);
  }, [property?.id]);

  if (!property) {
    return <section id="property-detail" className="detail-empty empty-box">매물을 선택하세요.</section>;
  }

  const photos = property.photos?.length ? property.photos : [];
  const mainPhoto = photos[activePhoto] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1600&q=80';
  const inquiryBody = encodeURIComponent(buildInquiryMessage(property));
  const related = allProperties.filter((item) => item.id !== property.id).slice(0, 4);
  const hasMap = Boolean(property.map_image || property.map_link);
const isSaleProperty = property.category?.includes('매매') || property.trade_type === '매매';
const maintenanceInfo = getMaintenanceInfo(property.maintenance_fee);
const publicMaintenanceItems = linesToArray(property.maintenance_includes).length
  ? linesToArray(property.maintenance_includes)
  : maintenanceInfo.includedItems;
const locationLines = linesToArray(property.location_description).length
  ? linesToArray(property.location_description)
  : property.education || [];
const heatingText = (property.convenience || [])
  .map((item) => String(item || ''))
  .find((item) => item.startsWith('난방:'))
  ?.replace('난방:', '')
  .trim();

const infoRows = isSaleProperty
  ? [
      ['소재지', property.address || '계약 전 확인'],
      ['거래유형', property.trade_type || '매매'],
      ['매물종류', property.category || '계약 전 확인'],

      ['매매가', property.sale_price || property.deposit || '계약 전 확인'],
      ['융자금', property.loan_amount || '계약 전 확인'],
      ['보증금 총액', property.total_deposit || '계약 전 확인'],
      ['실인수가', property.acquisition_price || '계약 전 확인'],
      ['총월세', property.total_monthly_rent || property.rent || '계약 전 확인'],
      ['월이자', property.monthly_interest || '계약 전 확인'],
      ['월순수익', property.net_profit || '계약 전 확인'],
      ['수익률', property.return_rate || '계약 전 확인'],

      ['면적', property.area || '계약 전 확인'],
      ['대지면적', property.land_area || '계약 전 확인'],
      ['연면적', property.building_area || '계약 전 확인'],
      ['총층', getPublicFloorInfo(property.floor_info) || '계약 전 확인'],
      ['세대현황', property.room_bath || '계약 전 확인'],
      ['총 세대수', property.total_units || '계약 전 확인'],
      ['임대중 세대수', property.rented_units || '계약 전 확인'],
      ['공실 수', property.vacant_units || '계약 전 확인'],
      ['주차', property.parking || '계약 전 확인'],
      ['난방', heatingText || '계약 전 확인'],
      ['엘리베이터', property.elevator || '계약 전 확인'],
      ['사용승인일', property.approval_date || '계약 전 확인'],
      ['구조', property.structure || '계약 전 확인'],
    ]
  : [
      ['소재지', property.address || '계약 전 확인'],
      ['거래유형', property.trade_type || '계약 전 확인'],
      ['매물종류', property.category || '계약 전 확인'],
      ['보증금', property.deposit || '계약 전 확인'],
      ['월세', property.rent || '계약 전 확인'],
      ['관리비', maintenanceInfo.display || '계약 전 확인'],
      ...(maintenanceInfo.includedItems.length ? [['관리비 포함 항목', maintenanceInfo.includedItems.join(', ')]] : []),
      ['면적', property.area || '계약 전 확인'],
      ['층수', getPublicFloorInfo(property.floor_info) || '계약 전 확인'],
      ['방/욕실', property.room_bath || '계약 전 확인'],
      ['방향', property.direction || '계약 전 확인'],
      ['주차', property.parking || '계약 전 확인'],
      ['난방', heatingText || '계약 전 확인'],
      ['엘리베이터', property.elevator || '계약 전 확인'],
      ['입주가능일', property.move_in || '계약 전 확인'],
      ['사용승인일', property.approval_date || '계약 전 확인'],
      ['구조', property.structure || '계약 전 확인'],
    ];
  return (
    <section id="property-detail" className="detail-platform">
      <nav className="detail-tabs">
        <a href="#detail-gallery">사진</a>
        <a href="#detail-info">매물 정보</a>
        <a href="#detail-desc">매물 설명</a>
        <a href="#detail-options">옵션 정보</a>
        {hasMap && <a href="#detail-location">위치</a>}
        <a href="#detail-related">다른 매물</a>
      </nav>

      <div className="detail-body-layout">
        <article className="detail-main">
          <section id="detail-gallery" className="gallery-card">
            <div className="gallery-main">
              <img src={mainPhoto} alt={`${property.title} 대표사진`} />
              <div className="photo-count">{photos.length ? `${activePhoto + 1}/${photos.length}` : '사진 준비중'}</div>
              {photos.length > 1 && (
                <>
                  <button type="button" className="gallery-arrow left" onClick={() => setActivePhoto((prev) => (prev - 1 + photos.length) % photos.length)}>‹</button>
                  <button type="button" className="gallery-arrow right" onClick={() => setActivePhoto((prev) => (prev + 1) % photos.length)}>›</button>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="thumb-row">
                {photos.map((src, index) => (
                  <button key={`${src}-${index}`} className={activePhoto === index ? 'active' : ''} onClick={() => setActivePhoto(index)}>
                    <img src={src} alt={`${property.title} 썸네일 ${index + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="content-card public-summary-card">
            <p className="section-eyebrow">PRICE</p>
            <h2>{isSaleProperty ? `매매가 ${formatAmount(getSaleDisplay(property).salePrice)}` : `보증금 ${formatAmount(property.deposit)} / 월세 ${formatAmount(property.rent)}`}</h2>
            {property.maintenance_fee && <p>{formatMaintenanceFee(property.maintenance_fee)}</p>}
            <p className="side-address">📍 {property.address || '위치 계약 전 확인'}</p>
            <p className="lead-text">{property.summary || '가격, 위치, 입주조건을 확인 후 안내드리는 매물입니다.'}</p>
          </section>

          <section id="detail-info" className="content-card">
            <div className="content-title-row">
              <h2>기본 조건표</h2>
              <span>실사진 · 직접 확인 매물</span>
            </div>
            <div className="info-table">
              {infoRows.map(([label, value]) => (
                <div key={label} className="info-row">
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <section id="detail-desc" className="content-card description-card">
            <h2>상세 설명</h2>
            <p>{property.description || '사진과 조건을 확인하시고 전화 또는 문자로 문의주시면 현장 상황과 입주 가능 여부를 바로 안내드리겠습니다.'}</p>
            {property.recommended_for && (
              <div className="check-points">
                <strong>추천 대상</strong>
                <TextLines value={property.recommended_for} />
              </div>
            )}
            {(property.investment_point || property.risk_note) && (
              <div className="check-points">
                {property.investment_point && (
                  <>
                    <strong>투자 포인트</strong>
                    <p>{property.investment_point}</p>
                  </>
                )}
                {property.risk_note && (
                  <>
                    <strong>참고/주의사항</strong>
                    <p>{property.risk_note}</p>
                  </>
                )}
              </div>
            )}
            <div className="check-points">
              <strong>Check Point</strong>
              <ul>
                <li>실사진 기준으로 상태를 확인하고 안내드립니다.</li>
                <li>보증금, 월세, 관리비 조건은 계약 전 최종 확인합니다.</li>
                <li>출퇴근 동선과 생활권을 함께 비교해드립니다.</li>
              </ul>
            </div>
          </section>

          <section id="detail-options" className="content-card">
            <h2>옵션</h2>
            <IconGrid items={property.convenience} fallback={['에어컨', '세탁기', '냉장고', '인터넷']} />
          </section>

          <section className="content-card">
            <h2>관리비 포함 항목</h2>
            <TagList items={publicMaintenanceItems} />
          </section>

          <section className="content-card">
            <h2>위치/생활권</h2>
            <TextLines value={property.location_description} fallback="정확한 위치와 생활권은 상담 시 안내드립니다." />
            <div className="sub-grid-block">
              <div>
                <h3>안전시설</h3>
                <TagList items={property.safety} />
              </div>
              <div>
                <h3>생활권</h3>
                <TagList items={locationLines} />
              </div>
            </div>
          </section>

          <section className="content-card">
            <h2>사진별 설명</h2>
            <PhotoCaptionList photos={photos} captions={property.photo_captions} />
            {!linesToArray(property.photo_captions).length && <p className="muted">사진별 설명은 상담 시 추가로 안내드립니다.</p>}
          </section>

          {hasMap && (
            <section id="detail-location" className="content-card">
              <h2>위치 및 주변시설</h2>
              {property.map_image && <img className="map-image" src={property.map_image} alt="매물 위치 지도" />}
              {property.map_link && <a className="map-link" href={property.map_link} target="_blank" rel="noreferrer">지도 바로가기</a>}
            </section>
          )}

          <section className="content-card detail-contact-section">
            <h2>문의</h2>
            <div className="side-actions">
              <a className="primary-btn" href={`tel:${OFFICE.phone}`}>전화상담</a>
              <a className="secondary-btn" href={`sms:${OFFICE.phone}?body=${inquiryBody}`}>문자문의</a>
            </div>
          </section>

          <section id="detail-related" className="content-card">
            <section className="detail-map-section">
  <div className="detail-map-head">
    <div>
      <p className="section-eyebrow">LOCATION</p>
      <h2>매물 위치 안내</h2>
      <p>정확한 위치는 상담 시 안내드리며, 생활권과 주변 환경을 함께 확인하실 수 있습니다.</p>
    </div>

    <a
      className="map-link-button"
      href={`https://map.naver.com/p/search/${encodeURIComponent(property?.address || OFFICE.address)}`}
      target="_blank"
      rel="noreferrer"
    >
      네이버지도 열기
    </a>
  </div>

  <div className="map-preview-box real-map-box">
  <iframe
    title="매물 위치 지도"
    src={`https://maps.google.com/maps?q=${encodeURIComponent(property?.address || OFFICE.address)}&output=embed`}
    loading="lazy"
    referrerPolicy="no-referrer-when-downgrade"
  />
</div>
</section>
            <h2>구미시의 다른 매물</h2>
            <div className="related-grid">
             {related.map((item) => {
  const relatedSale =
    item.category?.includes('매매') || item.trade_type === '매매';

  const saleDisplay = getSaleDisplay(item);

  const relatedPhoto =
    item.photos?.[0] ||
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80';

  const maintenanceText = item.maintenance_fee ? formatMaintenanceFee(item.maintenance_fee) : '';

  return (
    <button
      key={item.id}
      className="related-card related-simple-card"
      onClick={() => onSelect(item)}
    >
      <img src={relatedPhoto} alt={item.title || '추천 매물'} />

      <div className="related-simple-info">
        <span className="related-simple-meta">
          {item.category || item.trade_type || '매물'} · {shortAddress(item.address)}
        </span>

        <strong className="related-simple-title">
          {item.title}
        </strong>

        {relatedSale ? (
          <em className="related-simple-price">
            투자금 {formatAmount(saleDisplay.investment)} · 월순수익 {formatAmount(saleDisplay.netProfit)}
          </em>
        ) : (
          <>
            <em className="related-simple-price">
              보증금 {formatAmount(item.deposit)} / 월세 {formatAmount(item.rent)}
            </em>
            {maintenanceText && (
              <span className="related-simple-maintenance">
                {maintenanceText}
              </span>
            )}
          </>
        )}
      </div>
    </button>
  );
})}
              {!related.length && <p className="muted">등록된 다른 매물이 없습니다.</p>}
            </div>
          </section>

          <section className="legal-box content-card">
            <h2>중개대상물 표시·광고 안내</h2>
            <p>중개대상물 종류: {property.category || '계약 전 확인'}</p>
            <p>거래형태: {property.trade_type || '계약 전 확인'}</p>
            <p>소재지: {property.address || '계약 전 확인'}</p>
            <p>가격: {isSaleProperty ? `매매가 ${property.sale_price || property.deposit || '계약 전 확인'}` : `보증금 ${property.deposit || '-'} / 월세 ${property.rent || '-'}`}</p>
            <p>관리비: {maintenanceInfo.display || '계약 전 확인'}</p>
            {maintenanceInfo.includedItems.length > 0 && <p>관리비 포함 항목: {maintenanceInfo.includedItems.join(', ')}</p>}
            <p>층수: {getPublicFloorInfo(property.floor_info) || '계약 전 확인'}</p>
            <p>방/욕실: {property.room_bath || '계약 전 확인'}</p>
            <p>사용승인일: {property.approval_date || '계약 전 확인'}</p>
            <p>주차: {property.parking || '계약 전 확인'}</p>
            <p>난방: {heatingText || '계약 전 확인'}</p>
            <p>엘리베이터: {property.elevator || '계약 전 확인'}</p>
            <p>방향: {property.direction || '계약 전 확인'}</p>
            <p>입주가능일: {property.move_in || '계약 전 확인'}</p>
            <p>상호명: {OFFICE.name}</p>
            <p>소재지: {OFFICE.address}</p>
            <p>대표공인중개사: {OFFICE.broker}</p>
            <p>등록번호: {OFFICE.regNo}</p>
            <p>연락처: {OFFICE.phone} / {OFFICE.tel}</p>
            {property.legal_notice && <TextLines value={property.legal_notice} />}
            <p>※ 세부 조건은 계약 전 현장 및 공부서류 확인 후 최종 안내드립니다.</p>
          </section>
        </article>

        <aside className="sticky-contact-card">
          <img
  className="sticky-card-photo"
  src={
    property.photos?.[0] ||
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=900&q=80'
  }
  alt={property.title || '매물 대표사진'}
/>
          <div className="badge-line">
         <BadgeList property={property} />
            <span>{property.category}</span>
            <span>{property.trade_type}</span>
          </div>
          <h1>{property.title}</h1>
         <div className="big-price">
  {(property.category?.includes('매매') || property.trade_type === '매매') ? (
   <>
  <span>투자금 {formatAmount(getSaleDisplay(property).investment)}</span>
  <strong>총월세 {formatAmount(getSaleDisplay(property).totalRent)}</strong>
  <em>매매가 {formatAmount(getSaleDisplay(property).salePrice)}</em>
  <em>월순수익 {formatAmount(getSaleDisplay(property).netProfit)}</em>
</>
  ) : (
    <>
      <span>보증금 {property.deposit || '-'}</span>
      <strong>월세 {property.rent || '-'}</strong>
   {property.maintenance_fee && <em>{formatMaintenanceFee(property.maintenance_fee)}</em>}
    </>
  )}
</div>
          <p className="side-address">📍 {property.address || '위치 계약 전 확인'}</p>
          <div className="side-facts">
            <span>🏠 {property.category || '-'}</span>
            <span>📐 {property.area || '-'}</span>
            <span>🚪 {property.room_bath || '-'}</span>
            <span>🏢 {getPublicFloorInfo(property.floor_info) || '-'}</span>
          </div>
          <div className="side-actions">
            <a className="primary-btn" href={`tel:${OFFICE.phone}`}>전화상담</a>
            <a className="secondary-btn" href={`sms:${OFFICE.phone}?body=${inquiryBody}`}>문자문의</a>
          </div>
          <div className="office-mini-card">
            <div className="agent-avatar">KhAN</div>
            <div>
              <strong>{OFFICE.name}</strong>
              <p>대표 {OFFICE.broker}</p>
              <a href={`tel:${OFFICE.phone}`}>{OFFICE.phone}</a>
            </div>
          </div>
          <a className="blog-link" href={OFFICE.blog} target="_blank" rel="noreferrer">구미 원룸 월세 전체 안내 보기</a>
        </aside>
      </div>
    </section>
  );
}

function IconGrid({ items = [], fallback = [] }) {
  const list = items?.length ? items : fallback;
  return (
    <div className="option-grid">
      {list.map((item) => (
        <div key={item} className="option-item">
          <span>{optionIcon(item)}</span>
          <strong>{item}</strong>
        </div>
      ))}
    </div>
  );
}

function TagList({ items = [] }) {
  const list = items?.length ? items : ['계약 전 확인 후 안내'];
  return (
    <div className="tag-list">
      {list.map((item) => <span key={item}>{item}</span>)}
    </div>
  );
}

function TextLines({ value, fallback = '' }) {
  const lines = linesToArray(value);
  if (!lines.length && !fallback) return null;
  const visibleLines = lines.length ? lines : [fallback];
  return (
    <div className="text-lines">
      {visibleLines.map((line, index) => <p key={`${line}-${index}`}>{line}</p>)}
    </div>
  );
}

function PhotoCaptionList({ photos = [], captions = '' }) {
  const captionLines = linesToArray(captions);
  if (!captionLines.length) return null;
  return (
    <div className="photo-caption-list">
      {captionLines.map((caption, index) => (
        <div key={`${caption}-${index}`} className="photo-caption-item">
          <span>{photos[index] ? `${index + 1}번 사진` : '사진 설명'}</span>
          <p>{caption}</p>
        </div>
      ))}
    </div>
  );
}

function optionIcon(label) {
  const text = String(label);
  if (text.includes('에어컨')) return '❄️';
  if (text.includes('세탁')) return '🧺';
  if (text.includes('냉장')) return '🧊';
  if (text.includes('TV') || text.includes('티비')) return '📺';
  if (text.includes('침대')) return '🛏️';
  if (text.includes('신발')) return '👟';
  if (text.includes('싱크') || text.includes('주방')) return '🍽️';
  if (text.includes('도어') || text.includes('현관')) return '🔐';
  if (text.includes('CCTV')) return '📹';
  if (text.includes('인터넷')) return '📶';
  if (text.includes('주차')) return '🅿️';
  return '✓';
}

function AddressLedgerSearchSection({
  title = '2. 주소검색',
  form,
  updateField,
  addressResults,
  setAddressResults,
  addressSearching,
  handleAddressSearch,
  selectedAddressItem,
  setSelectedAddressItem,
  selectedAddressLabel,
  buildingLedgerSearching,
  fetchBuildingLedger,
  ledgerPreviewItems,
  status,
  setStatus
}) {
  const visibleStatus = status && (status.includes('주소') || status.includes('건축물대장'));
  const isPositiveStatus = status?.includes('완료') || status?.includes('자동 입력') || status?.includes('선택했습니다');

  return (
    <section className="quick-field-section">
      <h4>{title}</h4>
      <div className="address-search-wrap">
        <div className="address-search-grid">
          <Field
            label="주소"
            value={form.address}
            onChange={(value) => {
              updateField('address', value);
              setSelectedAddressItem(null);
              setAddressResults([]);
            }}
            placeholder="예: 구미시 진평동 1052-1"
          />
          <div className="address-button-row">
            <button type="button" className="address-search-button" onClick={handleAddressSearch} disabled={addressSearching}>
              {addressSearching ? '검색중...' : '주소검색'}
            </button>
          </div>
        </div>

        {addressResults.length > 0 && (
          <div className="address-result-list">
            {addressResults.map((item, index) => (
              <button
                key={`${item.bdMgtSn || item.roadAddr || item.jibunAddr}-${index}`}
                type="button"
                className="address-result-item"
                onClick={() => {
                  updateField('address', item.roadAddr || item.jibunAddr || '');
                  setSelectedAddressItem(item);
                  setAddressResults([]);
                  setStatus('주소를 선택했습니다. 건축물대장 조회를 진행할 수 있습니다.');
                }}
              >
                <strong>{item.roadAddr || '도로명주소 없음'}</strong>
                <span>{item.jibunAddr || '지번주소 없음'}</span>
                {item.zipNo && <em>{item.zipNo}</em>}
              </button>
            ))}
          </div>
        )}

        <div className={`selected-address-box ${selectedAddressItem ? 'ready' : ''}`}>
          <div>
            <span>{selectedAddressItem ? '선택한 주소' : '주소 검색 결과를 선택하면 건축물대장 조회가 가능합니다.'}</span>
            {selectedAddressItem && <strong>{selectedAddressLabel}</strong>}
          </div>
          <button type="button" className="address-search-button ledger-button" onClick={() => fetchBuildingLedger()} disabled={buildingLedgerSearching || !selectedAddressItem}>
            {buildingLedgerSearching ? '대장조회중...' : '건축물대장 조회'}
          </button>
        </div>

        {visibleStatus && (
          <p className={`ledger-status-message ${isPositiveStatus ? 'ok' : 'warn'}`}>
            {status}
          </p>
        )}

        {selectedAddressItem && ledgerPreviewItems.length > 0 && (
          <div className="ledger-preview-grid" aria-label="건축물대장 자동 입력 항목">
            {ledgerPreviewItems.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function AdminModal({ mode, setMode, isAdmin, setIsAdmin, onClose, properties, reload }) {
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [staffSavedItems, setStaffSavedItems] = useState([]);
  const [staffProperties, setStaffProperties] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [adminDetailProperty, setAdminDetailProperty] = useState(null);
  const [adminDetailTab, setAdminDetailTab] = useState('public');
  const [photoEnhanceLevel, setPhotoEnhanceLevel] = useState('bright');
  const [photoEnhanceMode, setPhotoEnhanceMode] = useState('batch');
  const [photoEnhanceByUrl, setPhotoEnhanceByUrl] = useState({});
  const [photoSourceByUrl, setPhotoSourceByUrl] = useState({});
const [photoWatermark, setPhotoWatermark] = useState(true);
  const [entryMode, setEntryMode] = useState('detail');
  const [staffStep, setStaffStep] = useState(0);
    const [currentStaff, setCurrentStaff] = useState(null);
  const [staffView, setStaffView] = useState('register');
const [quickRoomType, setQuickRoomType] = useState('원룸');
  const [quickTradeType, setQuickTradeType] = useState('월세');
  const [maintenanceType, setMaintenanceType] = useState('관리비별도');
  const [maintenanceItemsText, setMaintenanceItemsText] = useState('');
  const [quickFloor, setQuickFloor] = useState('');
  const [quickTotalFloor, setQuickTotalFloor] = useState('');
  const [quickUnit, setQuickUnit] = useState('');
  const [quickShowUnit, setQuickShowUnit] = useState(false);
  const [quickRoomCount, setQuickRoomCount] = useState('1');
  const [quickBathCount, setQuickBathCount] = useState('1');
  const [directionChoice, setDirectionChoice] = useState('확인필요');
  const [moveInChoice, setMoveInChoice] = useState('즉시입주');
  const [moveInDate, setMoveInDate] = useState('');
  const [parkingChoice, setParkingChoice] = useState('주차 확인 필요');
  const [parkingTotal, setParkingTotal] = useState('');
  const [parkingPerUnit, setParkingPerUnit] = useState('');
  const [parkingMemo, setParkingMemo] = useState('');
  const [heatingChoice, setHeatingChoice] = useState('확인필요');
  const [elevatorChoice, setElevatorChoice] = useState('확인필요');
  const [postStatusLabel, setPostStatusLabel] = useState(POST_STATUS_OPTIONS[0].label);
  const [addressResults, setAddressResults] = useState([]);
const [addressSearching, setAddressSearching] = useState(false);
  const [selectedAddressItem, setSelectedAddressItem] = useState(null);
const [buildingLedgerSearching, setBuildingLedgerSearching] = useState(false);
  const [detailFieldsOpen, setDetailFieldsOpen] = useState(false);
  const [quickTitleKeyword, setQuickTitleKeyword] = useState('');
  const [publishTab, setPublishTab] = useState('');
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || ['3', '8', '8', '3'].join('');
  const staffPassword = import.meta.env.VITE_STAFF_PASSWORD || ['0', '0', '0', '0'].join('');
  const isStaffMode = mode === 'staff';
  const isAdminMode = mode === 'admin';
  const canEditExisting = isAdminMode && isAdmin;
  const accessLabel = isStaffMode ? '직원용 관리자' : isAdminMode ? '대표 관리자' : '권한 선택';
  const photoUrls = linesToArray(form.photosText);
const quickMissingItems = [
  !isStaffMode && !form.title && '제목',
  !form.address && '주소',
  quickTradeType === '매매' ? (!form.sale_price && '매매가') : (!form.deposit && '보증금'),
  quickTradeType !== '매매' && !form.rent && '월세',
  !(form.room_bath || ROOM_BATH_DEFAULTS[quickRoomType]) && '방/욕실',
  photoUrls.length === 0 && '사진',
].filter(Boolean);

const quickReady = quickMissingItems.length === 0;
  const myStaffProperties = isStaffMode && currentStaff?.code
 ? staffProperties.filter((item) => String(item.staff_code || '') === String(currentStaff.code))
  : [];
const staffWizardSteps = [
  '주소검색',
  '호수선택',
  '매물종류 선택',
  '거래형태 선택',
  '가격 입력',
  '관리비 선택',
  '사진 등록',
  '입주일 선택',
  '주차 선택',
  '최종확인'
];

function goStaffStep(nextStep) {
  setStaffStep(Math.max(0, Math.min(staffWizardSteps.length - 1, nextStep)));
}

function formatLedgerDate(value) {
  const text = String(value || '').trim();
  const digits = text.replace(/\D/g, '');

  if (digits.length !== 8) return text;

  const year = digits.slice(0, 4);
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));

  if (!month || !day) return text;

  return `${year}년 ${month}월 ${day}일`;
}

const selectedAddressLabel = selectedAddressItem ? (selectedAddressItem.roadAddr || selectedAddressItem.jibunAddr || form.address) : '';
const ledgerPreviewItems = [
  ['사용승인일', form.approval_date],
  ['주용도', form.main_use],
  ['구조', form.structure],
  ['총층수', form.total_floor_info || form.floor_info || (form.floor_count ? `지상 ${form.floor_count}층` : '')],
  ['주차대수', form.parking],
  ['건물명', form.building_name],
  ['전용면적', form.area],
  ['지상층수', form.floor_count ? `${form.floor_count}층` : ''],
  ['지하층수', form.basement_floor_count ? `${form.basement_floor_count}층` : ''],
  ['연면적', form.total_area],
  ['건축면적', form.building_area],
  ['대지면적', form.land_area]
].filter(([, value]) => String(value || '').trim());

  useEffect(() => {
    if (isStaffMode) {
      setEntryMode('simple');
    } else if (isAdminMode) {
      setEntryMode('detail');
    }
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        category: isStaffMode ? quickRoomType : prev.category,
        trade_type: isStaffMode ? quickTradeType : prev.trade_type,
        room_bath: isStaffMode ? (prev.room_bath || ROOM_BATH_DEFAULTS[quickRoomType] || '') : prev.room_bath,
        status: isAdminMode ? 'published' : 'pending'
      }));
    }
  }, [editingId, isAdminMode, isStaffMode, quickRoomType, quickTradeType]);

  useEffect(() => {
    if (!isStaffMode || editingId) return;
    const defaults = ROOM_BATH_DEFAULTS[quickRoomType]?.match(/방\s*(\d+)\s*\/\s*욕실\s*(\d+)/);
    if (!defaults) return;
    setQuickRoomCount(defaults[1]);
    setQuickBathCount(defaults[2]);
    updateField('room_bath', `방 ${defaults[1]} / 욕실 ${defaults[2]}`);
  }, [quickRoomType, isStaffMode, editingId]);

  function chooseMode(nextMode) {
    setMode(nextMode);
    setIsAdmin(false);
    setPassword('');
    setStatus('');
    setStaffStep(0);
    const url = new URL(window.location.href);
    url.searchParams.delete('staff');
    url.searchParams.delete('admin');
    url.searchParams.set(nextMode, '1');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
async function loadStaffProperties(staffCode) {
if (!isSupabaseReady || !staffCode) {
setStaffProperties([]);
return;
}

const { data, error } = await supabase
.from('properties')
.select('*')
.eq('staff_code', staffCode)
.order('created_at', { ascending: false });

if (error) {
setStaffProperties([]);
setStatus(`내 매물 불러오기 실패: ${error.message}`);
return;
}

setStaffProperties(data || []);
}
    async function login(e) {
    e.preventDefault();
    const expectedPassword = isStaffMode ? staffPassword : adminPassword;
   if (password === expectedPassword) {
  if (isStaffMode && (!form.staff_name.trim() || !form.staff_code.trim())) {
    setStatus('담당자 이름과 담당자 코드를 입력해주세요.');
    return;
  }

  if (isStaffMode) {
    setCurrentStaff({
      name: form.staff_name.trim(),
      code: form.staff_code.trim()
    });
    await loadStaffProperties(form.staff_code.trim());
    setStaffView('register');
  } else {
    setCurrentStaff(null);
  }

  setIsAdmin(true);
  setStatus(isStaffMode ? `${form.staff_name.trim()}님 직원용 관리자 모드로 들어왔습니다.` : '대표 관리자 모드로 들어왔습니다.');
} else {
      setStatus('비밀번호가 맞지 않습니다.');
    }
  }

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }
  async function handleAddressSearch() {
    const keyword = form.address?.trim();

    if (!keyword || keyword.length < 2) {
      setStatus('주소를 2글자 이상 입력해주세요.');
      return;
    }

    try {
      setAddressSearching(true);
      setAddressResults([]);
      setSelectedAddressItem(null);

      const response = await fetch(`/api/search-address?keyword=${encodeURIComponent(keyword)}`);
      const data = await response.json();

      if (!response.ok) {
        setStatus(data.error || '주소 검색 중 오류가 발생했습니다.');
        return;
      }

      const results = data.results || [];
      setAddressResults(results);
      setStatus(results.length ? '주소 검색 결과를 선택해주세요.' : '검색된 주소가 없습니다. 동/번지를 다시 확인해주세요.');
    } catch (error) {
      setStatus('주소 검색 서버 연결 중 오류가 발생했습니다.');
    } finally {
      setAddressSearching(false);
    }
  }
  async function fetchBuildingLedger(addressItem = selectedAddressItem) {
    const isClickEvent = addressItem && typeof addressItem.preventDefault === 'function';
    if (isClickEvent) addressItem.preventDefault();

    const targetAddressItem = isClickEvent ? selectedAddressItem : (addressItem || selectedAddressItem);

    if (!targetAddressItem) {
      setStatus('먼저 주소검색 후 주소를 선택해주세요.');
      return;
    }

    const jibunText = targetAddressItem.jibunAddr || '';
    const lotMatch = jibunText.match(/(산\s*)?(\d+)(?:-(\d+))?\s*$/);
    const admCd = targetAddressItem.admCd;
    const lnbrMnnm = targetAddressItem.lnbrMnnm || lotMatch?.[2];
    const lnbrSlno = targetAddressItem.lnbrSlno || lotMatch?.[3] || '0';
    const mtYn = targetAddressItem.mtYn || (lotMatch?.[1] ? '1' : '0');

    if (!admCd || !lnbrMnnm) {
      setStatus('건축물대장 조회에 필요한 법정동/번지 정보가 부족합니다.');
      return;
    }

    try {
      setBuildingLedgerSearching(true);
      setStatus('건축물대장 조회 중입니다...');

      const query = new URLSearchParams({ admCd, lnbrMnnm, lnbrSlno, mtYn });
      const response = await fetch(`/api/building-ledger?${query.toString()}`);
      const data = await response.json();

      if (!response.ok || !data.ok) {
        setStatus(data.message || '건축물대장 조회 중 오류가 발생했습니다.');
        return;
      }

      if (!data.summary) {
        setStatus('건축물대장 정보가 없습니다. 주소 또는 번지를 확인해주세요.');
        return;
      }

      const s = data.summary;
      const ledgerText = (...keys) => {
        const value = keys.map((key) => s?.[key]).find((item) => item !== undefined && item !== null && String(item).trim() !== '');
        return String(value || '').trim();
      };
      const withAreaUnit = (value) => {
        const text = String(value || '').trim();
        if (!text) return '';
        return /㎡|평|m2|m²/i.test(text) ? text : `${text}㎡`;
      };
      const approvalDate = formatLedgerDate(ledgerText('사용승인일', 'useAprDay', 'approval_date'));
      const mainUse = ledgerText('주용도', 'mainPurpsCdNm', 'main_use');
      const structure = ledgerText('구조', 'strctCdNm', 'structure');
      const groundFloors = ledgerText('지상층수', 'grndFlrCnt', 'floor_count');
      const basementFloors = ledgerText('지하층수', 'ugrndFlrCnt', 'basement_floor_count');
      const totalArea = withAreaUnit(ledgerText('연면적', 'totArea', 'total_area'));
      const buildingArea = withAreaUnit(ledgerText('건축면적', 'archArea', 'building_area'));
      const landArea = withAreaUnit(ledgerText('대지면적', 'platArea', 'land_area'));
      const exclusiveArea = withAreaUnit(ledgerText('전용면적', '전유부전용면적', '전유면적', 'exclusive_area'));
      const buildingName = ledgerText('건물명', '건물명칭', 'bldNm', 'building_name');
      const parkingSpaces = ledgerText('주차대수', 'parking');
      const quickTotalFloorValue = groundFloors.replace(/[^0-9.]/g, '') || groundFloors;
      const parkingValue = parkingSpaces.replace(/[^0-9.]/g, '') || parkingSpaces;
      const hasParkingCount = Boolean(parkingValue && parkingValue !== '0');
      const totalFloorInfo = [
        groundFloors ? `지상 ${groundFloors}층` : '',
        basementFloors && basementFloors !== '0' ? `지하 ${basementFloors}층` : ''
      ].filter(Boolean).join(' / ');
      const publicFloorInfo = [
        quickFloor ? `${quickFloor}층` : '',
        quickTotalFloorValue ? `총 ${quickTotalFloorValue}층` : '',
        basementFloors && basementFloors !== '0' ? `지하 ${basementFloors}층` : ''
      ].filter(Boolean).join(' / ');
      const parkingText = hasParkingCount ? `총 ${parkingValue}대` : '';

      if (quickTotalFloorValue) setQuickTotalFloor(quickTotalFloorValue);
      if (hasParkingCount) {
        setParkingTotal(parkingValue);
        setParkingChoice('주차가능');
      }

      setForm((prev) => ({
        ...prev,
        approval_date: approvalDate || prev.approval_date,
        main_use: mainUse || prev.main_use,
        structure: structure || prev.structure,
        floor_count: groundFloors || prev.floor_count,
        basement_floor_count: basementFloors || prev.basement_floor_count,
        total_floor_info: totalFloorInfo || prev.total_floor_info,
        floor_info: publicFloorInfo || totalFloorInfo || prev.floor_info,
        total_area: totalArea || prev.total_area,
        building_area: buildingArea || prev.building_area,
        land_area: landArea || prev.land_area,
        parking: parkingText || prev.parking,
        building_name: buildingName || prev.building_name,
        area: exclusiveArea || ''
      }));

      setDetailFieldsOpen(true);
      setStatus(`건축물대장 정보가 자동 입력되었습니다. ${buildingName || mainUse || '상세정보'} 값을 확인해주세요.`);
    } catch (error) {
      setStatus(`건축물대장 서버 연결 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setBuildingLedgerSearching(false);
    }
  }
  function applyBulkInput() {
    const parsed = parseBulkText(bulkText);

    if (!Object.keys(parsed).length) {
      setStatus('일괄입력 자료를 읽지 못했습니다. 예: 매매가: 91000 형식으로 넣어주세요.');
      return;
    }

    setForm((prev) => ({ ...prev, ...parsed }));
    setStatus(`일괄입력 ${Object.keys(parsed).length}개 항목을 자동 채웠습니다. 사진 확인 후 저장을 누르세요.`);
  }
// 당근 업로드용 CSV 다운로드 함수
// 당근 원본 양식 맞춤 CSV 다운로드 함수
function handleDaangnExcelDownload() {
  const payload = typeof formToPayload === 'function' ? formToPayload(form) : form;

  const clean = (value) => {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/\r?\n+/g, ' / ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const toManwon = (value) => {
    const text = clean(value).replaceAll(',', '');
    if (!text) return '';

    const eokMatch = text.match(/(\d+(?:\.\d+)?)\s*억/);
    const manMatch = text.match(/(\d+(?:\.\d+)?)\s*만/);

    if (eokMatch) {
      const eok = Number(eokMatch[1]) * 10000;
      const man = manMatch ? Number(manMatch[1]) : 0;
      return String(Math.round(eok + man));
    }

    const numberMatch = text.match(/\d+(?:\.\d+)?/);
    return numberMatch ? numberMatch[0] : '';
  };

  const getRoomBath = () => {
    const text = clean(payload.room_bath || form.room_bath);
    const match =
      text.match(/방\s*(\d+).*욕실\s*(\d+)/) ||
      text.match(/(\d+)\s*\/\s*(\d+)/);

    return {
      room: match ? match[1] : '1',
      bath: match ? match[2] : '1'
    };
  };

  const getFloor = () => {
    const floorText = clean(payload.floor_info || form.floor_info);
    const totalText = clean(payload.total_floor_info || form.total_floor_info);

    const floorMatch = floorText.match(/(\d+)\s*층/);
    const totalMatch =
      floorText.match(/총\s*(\d+)\s*층/) ||
      totalText.match(/지상\s*(\d+)\s*층/) ||
      totalText.match(/총\s*(\d+)\s*층/);

    return {
      floor: floorMatch ? floorMatch[1] : '',
      totalFloor: totalMatch ? totalMatch[1] : ''
    };
  };

  const getYear = () => {
    const text = clean(payload.approval_date || form.approval_date);
    const match = text.match(/(19|20)\d{2}/);
    return match ? match[0] : '';
  };

  const getMaintenanceType = () => {
    const text = clean(payload.maintenance_fee || form.maintenance_fee);

    if (!text) return '확인 필요';
    if (text.includes('없음')) return '관리비 없음';
    return '정액 관리비';
  };

  const getMaintenanceItems = () => {
    const direct = clean(payload.maintenance_includes || form.maintenance_includes || maintenanceItemsText);
    if (direct) return direct;

    const text = clean(payload.maintenance_fee || form.maintenance_fee);
    const match = text.match(/포함 항목:\s*([^)]+)/);
    if (match) return clean(match[1]);

    return '';
  };

  const getParking = () => {
    const text = clean(payload.parking || form.parking);

    if (text.includes('불가')) return '불가능';
    if (text.includes('가능') || text.includes('대')) return '가능';
    return '확인 필요';
  };

  const getDirection = () => {
    const text = clean(payload.direction || form.direction)
      .replace('/ 주출입구 기준', '')
      .replace('주출입구 기준', '')
      .trim();

    return text || '주출입구';
  };

  const getOptions = () => {
    const convenience = Array.isArray(payload.convenience)
      ? payload.convenience
      : linesToArray(form.convenienceText);

    return convenience
      .map((item) => clean(item).replace(/^난방:\s*/, ''))
      .filter(Boolean)
      .join(', ');
  };

  const getPropertyType = () => {
    const text = clean(payload.category || form.category || '');

    if (text.includes('미니투룸')) return '미니투룸';
    if (text.includes('투룸')) return '투룸';
    if (text.includes('상가')) return '상가';
    if (text.includes('토지')) return '토지';
    if (text.includes('다가구') || text.includes('원룸건물')) return '다가구';
    if (text.includes('아파트')) return '아파트';
    return '원룸';
  };

  const getTradeType = () => {
    const text = clean(payload.trade_type || form.trade_type || '');

    if (text.includes('매매')) return '매매';
    if (text.includes('전세')) return '전세';
    if (text.includes('단기')) return '단기';
    return '월세';
  };

  const roomBath = getRoomBath();
  const floor = getFloor();
  const tradeType = getTradeType();

  const priceValue =
    tradeType === '매매'
      ? toManwon(payload.sale_price || form.sale_price)
      : toManwon(payload.deposit || form.deposit);

  const monthlyRentValue =
    tradeType === '월세' || tradeType === '단기'
      ? toManwon(payload.rent || form.rent)
      : '';

  const description = [
    payload.title || form.title,
    payload.summary || form.summary,
    payload.description || form.description,
    payload.location_description || form.location_description,
    payload.recommended_for || form.recommended_for,
    payload.investment_point || form.investment_point,
    payload.risk_note || form.risk_note
  ]
    .map(clean)
    .filter(Boolean)
    .join(' / ');

  const headers = [
    '매물유형',
    '거래유형',
    '보증금/매매가(만원)',
    '월세(만원)',
    '주소',
    '상세주소',
    '면적(㎡)',
    '방 수',
    '욕실 수',
    '층',
    '총 층',
    '향',
    '입주가능일',
    '관리비 유형',
    '총 관리비(만원)',
    '관리비 포함항목',
    '관리비 기준',
    '관리비 실비근거',
    '관리비 확인일자 사유',
    '주차',
    '반려동물',
    '대출',
    '옵션',
    '건축년도',
    '매물 설명',
    '메모',
    '토지 지목',
    '용도지역',
    '권리금(만원)',
    '건물용도'
  ];

  const rowData = [
    getPropertyType(),
    tradeType,
    priceValue,
    monthlyRentValue,
    clean(payload.address || form.address),
    clean(payload.real_unit || form.real_unit || quickUnit),
    toManwon(payload.area || form.area),
    roomBath.room,
    roomBath.bath,
    floor.floor,
    floor.totalFloor,
    getDirection(),
    clean(payload.move_in || form.move_in) || '즉시입주',
    getMaintenanceType(),
    toManwon(payload.maintenance_fee || form.maintenance_fee),
    getMaintenanceItems(),
    '직접 월 기재',
    '세대별 사용량 또는 계약 내용 기준',
    '확인 필요',
    getParking(),
    '확인 필요',
    '확인 필요',
    getOptions(),
    getYear(),
    description,
    clean(payload.private_memo || form.private_memo),
    clean(payload.land_category || form.land_category),
    clean(payload.zoning || form.zoning),
    toManwon(payload.premium || form.premium),
    clean(payload.main_use || form.main_use)
  ];

  const escapeCSV = (value) => {
    const text = clean(value);

    if (text.includes(',') || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }

    return text;
  };

  const csvContent =
    '\uFEFF' +
    headers.map(escapeCSV).join(',') +
    '\n' +
    rowData.map(escapeCSV).join(',');

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const filename = `daangn-property-${yyyy}${mm}${dd}.csv`;

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8;'
  });

  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  setStatus('당근 원본 양식에 맞춘 CSV 파일을 다운로드했습니다.');
}
function compactPublishText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function getPublishDong(address) {
  const text = compactPublishText(address)
    .replace('경상북도', '')
    .replace('구미시', '')
    .trim();

  const match = text.match(/([가-힣0-9]+(?:동|읍|면|리))/);
  return match ? match[1] : '';
}

function getPublishPropertyType(data) {
  const category = compactPublishText(data.category || quickRoomType || '원룸');
  const cleaned = category
    .replace(/월세|전세|반전세|매매|단기임대|단기/g, '')
    .trim();

  return cleaned || category || '원룸';
}

function formatPublishMoney(value) {
  const text = compactPublishText(value);
  return text ? normalizeManwon(text) : '-';
}

function getPublishPriceText(data) {
  const tradeType = compactPublishText(data.trade_type || quickTradeType || '월세');

  if (tradeType.includes('매매')) {
    return `매매가 ${formatPublishMoney(data.sale_price || data.deposit)}`;
  }

  if (tradeType.includes('전세') && !tradeType.includes('반전세')) {
    return `전세금 ${formatPublishMoney(data.deposit)}`;
  }

  if (tradeType.includes('반전세')) {
    return `반전세 ${formatPublishMoney(data.deposit)} / 월세 ${formatPublishMoney(data.rent)}`;
  }

  return `보증금 ${formatPublishMoney(data.deposit)} / 월세 ${formatPublishMoney(data.rent)}`;
}

function makePublishTag(value) {
  return String(value || '')
    .replace(/[#\s]/g, '')
    .replace(/[^0-9A-Za-z가-힣_]/g, '');
}

function getPublishSnapshot() {
  const category = isStaffMode ? quickRoomType : (form.category || quickRoomType || '원룸');
  const tradeType = isStaffMode ? quickTradeType : (form.trade_type || quickTradeType || '월세');

  const floorInfo = isStaffMode
    ? [
        quickShowUnit && quickUnit ? quickUnit : '',
        quickFloor ? `${quickFloor}층` : '',
        quickTotalFloor ? `총 ${quickTotalFloor}층` : ''
      ].filter(Boolean).join(' / ')
    : form.floor_info;

  const moveInText = isStaffMode
    ? (moveInChoice === '날짜 직접입력' ? (moveInDate || '날짜협의') : moveInChoice)
    : form.move_in;

  const parkingText = isStaffMode
    ? [
        parkingTotal ? `총 ${parkingTotal}대` : '',
        parkingPerUnit ? `세대당 ${parkingPerUnit}대` : '',
        parkingChoice,
        parkingMemo
      ].filter(Boolean).join(' / ')
    : form.parking;

  const directionText = isStaffMode
    ? `${directionChoice} / 주출입구 기준`
    : form.direction;

  const maintenanceText = isStaffMode
    ? maintenanceType
    : form.maintenance_fee;

  return {
    ...form,
    category,
    trade_type: tradeType,
    floor_info: floorInfo || form.floor_info,
    move_in: moveInText || form.move_in,
    parking: parkingText || form.parking,
    direction: directionText || form.direction,
    maintenance_fee: maintenanceText || form.maintenance_fee,
    room_bath: form.room_bath || ROOM_BATH_DEFAULTS[category] || '',
    photos: linesToArray(form.photosText)
  };
}

function buildPublishTags(data, extraTags = []) {
  const dong = getPublishDong(data.address);
  const propertyType = getPublishPropertyType(data);
  const tradeType = compactPublishText(data.trade_type || '월세');

  const seeds = [
    '구미원룸',
    tradeType.includes('월세') ? '구미원룸월세' : '',
    `구미${propertyType}`,
    dong ? `${dong}${propertyType}` : '',
    dong ? `구미${dong}${propertyType}` : '',
    `${propertyType}${tradeType}`,
    '구미부동산',
    '칸공인중개사',
    ...extraTags
  ];

  return [...new Set(seeds.map(makePublishTag).filter(Boolean))]
    .map((tag) => `#${tag}`)
    .join(' ');
}

function buildBlogPublishData() {
  const data = getPublishSnapshot();
  const dong = getPublishDong(data.address);
  const locationTitle = dong ? `구미 ${dong}` : '구미';
  const propertyType = getPublishPropertyType(data);
  const tradeType = compactPublishText(data.trade_type || '월세');
  const priceText = getPublishPriceText(data);
  const photos = Array.isArray(data.photos) ? data.photos : linesToArray(data.photosText);
  const options = [
    ...linesToArray(data.convenienceText),
    ...linesToArray(data.safetyText),
    ...linesToArray(data.educationText)
  ].filter(Boolean);

  const title = `${locationTitle} ${propertyType} ${tradeType}｜추천 매물`;

  const body = [
    title,
    '',
    '안녕하세요. 칸공인중개사사무소입니다.',
    `${locationTitle}에서 바로 안내 가능한 ${propertyType} ${tradeType} 추천 매물입니다.`,
    '',
    '■ 매물 핵심정보',
    `- 가격: ${priceText}`,
    `- 관리비: ${data.maintenance_fee || '확인 필요'}`,
    `- 면적: ${data.area || '확인 필요'}`,
    `- 층수: ${data.floor_info || '확인 필요'}`,
    `- 방향: ${data.direction || '확인 필요'}`,
    `- 주차: ${data.parking || '확인 필요'}`,
    `- 입주가능일: ${data.move_in || '즉시입주 협의'}`,
    `- 방/욕실: ${data.room_bath || '확인 필요'}`,
    '',
    '■ 옵션',
    options.length ? options.join(', ') : '옵션 확인 필요',
    '',
    '■ 위치설명',
    data.location_description || data.address || '위치 상담 시 상세 안내',
    '',
    '■ 상세설명',
    data.description || data.summary || '실사진 확인 후 빠르게 안내드립니다.',
    '',
    '■ 사진 URL',
    photos.length ? photos.map((url, index) => `${index + 1}. ${url}`).join('\n') : '사진 URL 없음',
    '',
    '■ 중개사무소 정보',
    '칸공인중개사사무소',
    '대표: 정점식',
    '등록번호: 제47190-2023-00014',
    '주소: 경상북도 구미시 인의동 991-4번지 4층',
    '연락처: 010-5323-3883 / 054-474-0367'
  ].join('\n');

  return {
    title,
    body,
    tags: buildPublishTags(data, ['구미방구하기', '구미자취방'])
  };
}

function buildInstagramPublishData() {
  const data = getPublishSnapshot();
  const dong = getPublishDong(data.address);
  const locationTitle = dong ? `구미 ${dong}` : '구미';
  const propertyType = getPublishPropertyType(data);
  const tradeType = compactPublishText(data.trade_type || '월세');
  const priceText = getPublishPriceText(data);
  const photos = Array.isArray(data.photos) ? data.photos : linesToArray(data.photosText);

  const body = [
    `🔥 ${locationTitle} ${propertyType} ${tradeType}`,
    priceText,
    `📍 위치: ${data.address || locationTitle}`,
    `📐 면적: ${data.area || '확인 필요'}`,
    `🏢 층수: ${data.floor_info || '확인 필요'}`,
    `🚗 주차: ${data.parking || '확인 필요'}`,
    `🗓 입주: ${data.move_in || '즉시입주 협의'}`,
    data.summary ? `✨ ${data.summary}` : '✨ 실사진 확인 매물, 빠른 안내 가능합니다.',
    `문의 ${OFFICE.phone}`
  ].join('\n');

  return {
    body,
    tags: buildPublishTags(data, ['구미월세', '구미방구하기', '구미자취방']),
    photos: photos.join('\n')
  };
}

function handleCopy(label, text) {
  const copyText = String(text || '').trim();

  if (!copyText) {
    setStatus(`${label} 내용이 없습니다.`);
    return;
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(copyText)
      .then(() => setStatus(`${label} 복사 완료했습니다.`))
      .catch(() => setStatus(`${label} 복사에 실패했습니다. 내용을 직접 선택해서 복사해주세요.`));
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = copyText;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand('copy');
    setStatus(`${label} 복사 완료했습니다.`);
  } catch (error) {
    setStatus(`${label} 복사에 실패했습니다. 내용을 직접 선택해서 복사해주세요.`);
  } finally {
    document.body.removeChild(textarea);
  }
}

const blogPublishData = buildBlogPublishData();
const instagramPublishData = buildInstagramPublishData();
function startEdit(property) {
  if (
    isStaffMode &&
    (
      !currentStaff?.code ||
      String(property.staff_code || '') !== String(currentStaff.code)
    )
  ) {
    setStatus('본인이 등록한 매물만 수정할 수 있습니다.');
    return;
  }

  setEditingId(property.id);
  setStaffView('register');
setStaffStep(0);
  setDuplicateWarning(null);
    setAdminDetailProperty(property);
    setAdminDetailTab('public');
    setForm(propertyToForm(property));
    setQuickRoomType(property.category || '원룸');
    setQuickTradeType(property.trade_type || '월세');
    const maintenance = getMaintenanceInfo(property.maintenance_fee);
    if (maintenance.display.includes('포함')) setMaintenanceType('관리비포함');
    else if (maintenance.display.includes('없음')) setMaintenanceType('관리비없음');
    else if (maintenance.display.includes('확인')) setMaintenanceType('확인필요');
    else setMaintenanceType('관리비별도');
    setMaintenanceItemsText(maintenance.includedItems.join('\n'));
    const floorText = String(property.floor_info || '');
    setQuickShowUnit(/호/.test(floorText));
    setQuickUnit(
      property.real_unit ||
      floorText.match(/내부호수\s*:\s*(\d+\s*호?)/)?.[1]?.replace(/\s+/g, '') ||
      floorText.match(/(\d+\s*호)/)?.[1]?.replace(/\s+/g, '') ||
      ''
    );
    setQuickFloor(floorText.match(/(\d+)\s*층/)?.[1] || '');
    setQuickTotalFloor(floorText.match(/총\s*(\d+)\s*층/)?.[1] || '');
    const roomBathMatch = String(property.room_bath || '').match(/방\s*(\d+).*욕실\s*(\d+)|(\d+)\s*\/\s*(\d+)/);
    setQuickRoomCount(roomBathMatch?.[1] || roomBathMatch?.[3] || '');
    setQuickBathCount(roomBathMatch?.[2] || roomBathMatch?.[4] || '');
    setDirectionChoice(String(property.direction || '').replace(' / 주출입구 기준', '') || '확인필요');
    setMoveInChoice(property.move_in?.match(/\d{4}/) ? '날짜 직접입력' : (property.move_in || '즉시입주'));
    setMoveInDate(property.move_in?.match(/\d{4}/) ? property.move_in : '');
    setParkingChoice(property.parking || '주차 확인 필요');
    setHeatingChoice(linesToArray(property.convenience).find((item) => item.startsWith('난방:'))?.replace('난방:', '').trim() || '확인필요');
    setElevatorChoice(property.elevator || '확인필요');
    setPostStatusLabel(property.status === 'published' ? '공개중' : property.status === 'hold' ? '비공개' : '임시저장');
    setAddressResults([]);
    setSelectedAddressItem(null);
    setDetailFieldsOpen(true);
    setStatus('선택한 매물을 수정 중입니다.');
  }

  function resetForm() {
    setEditingId(null);
    setForm({ ...emptyForm, status: isAdminMode ? 'published' : 'pending' });
    setBulkText('');
    setQuickRoomType('원룸');
    setQuickTradeType('월세');
    setMaintenanceType('관리비별도');
    setMaintenanceItemsText('');
    setQuickFloor('');
    setQuickTotalFloor('');
    setQuickUnit('');
    setQuickShowUnit(false);
    setQuickRoomCount('1');
    setQuickBathCount('1');
    setDirectionChoice('확인필요');
    setMoveInChoice('즉시입주');
    setMoveInDate('');
    setParkingChoice('주차 확인 필요');
    setParkingTotal('');
    setParkingPerUnit('');
    setParkingMemo('');
    setHeatingChoice('확인필요');
    setElevatorChoice('확인필요');
    setPostStatusLabel(POST_STATUS_OPTIONS[0].label);
    setPhotoEnhanceByUrl({});
    setPhotoSourceByUrl({});
    setDuplicateWarning(null);
    setStaffStep(0);
    setAdminDetailProperty(null);
    setAdminDetailTab('public');
    setAddressResults([]);
    setSelectedAddressItem(null);
    setDetailFieldsOpen(false);
    setStatus('새 매물 등록 상태입니다.');
  }
function autoEditPhoto(file, options = {}) {
  const { enhanceLevel = 'bright', watermark = true } = options;
  const enhanceConfig = PHOTO_ENHANCE_LEVELS.find((level) => level.value === enhanceLevel) || PHOTO_ENHANCE_LEVELS[2];
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (event) => {
      img.onload = () => {
        const maxWidth = 1600;
        const maxHeight = 1200;

        let width = img.width;
        let height = img.height;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = width;
        canvas.height = height;

        // 선택된 강도로 밝기 / 대비 / 채도 보정
        ctx.filter = enhanceConfig.filter;
        ctx.drawImage(img, 0, 0, width, height);
        ctx.filter = 'none';
if (watermark) {
      // 워터마크 글씨만 중앙 하단에 표시
const fontSize = Math.max(28, Math.round(width * 0.03));
ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
ctx.font = `bold ${fontSize}px sans-serif`;
ctx.textAlign = 'center';
ctx.textBaseline = 'bottom';

ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
ctx.shadowBlur = 4;
ctx.shadowOffsetX = 1;
ctx.shadowOffsetY = 1;

ctx.fillText(
  '칸공인중개사 010-5323-3883',
  width / 2,
  height - 20
);

ctx.shadowColor = 'transparent';
ctx.shadowBlur = 0;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;
}
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('사진 자동편집 실패'));
              return;
            }

            const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg';

            const editedFile = new File([blob], newName, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });

            resolve(editedFile);
          },
          'image/jpeg',
          0.82
        );
      };

      img.onerror = reject;
      img.src = event.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
  async function uploadPhotoFiles(fileList) {
   const originalFiles = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));
const files = await Promise.all(
  originalFiles.map((file) =>
    autoEditPhoto(file, {
      enhanceLevel: photoEnhanceLevel,
      watermark: photoWatermark,
    })
  )
);

    if (!files.length) {
      setStatus('업로드할 사진 파일이 없습니다. JPG, PNG 같은 이미지 파일을 선택하세요.');
      return;
    }

    if (!isSupabaseReady) {
      setStatus('Supabase 연결 전에는 사진 업로드가 되지 않습니다.');
      return;
    }

    setStatus(`사진 ${files.length}장을 업로드 중입니다. 잠시 기다려주세요.`);

    const uploadedUrls = [];

    for (const [index, file] of files.entries()) {
      const rawExt = file.name.split('.').pop() || 'jpg';
      const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
      const uniqueId =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const filePath = `properties/${uniqueId}-${index}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('property-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'image/jpeg'
        });

      if (uploadError) {
        setStatus(`사진 업로드 실패: ${uploadError.message}`);
        return;
      }

      const { data } = supabase.storage.from('property-images').getPublicUrl(filePath);
      if (data?.publicUrl) uploadedUrls.push({ url: data.publicUrl, originalFile: originalFiles[index] });
    }

    setForm((prev) => {
      const before = linesToArray(prev.photosText);
      return { ...prev, photosText: [...before, ...uploadedUrls.map((item) => item.url)].join('\n') };
    });
    setPhotoEnhanceByUrl((prev) => ({
      ...prev,
      ...Object.fromEntries(uploadedUrls.map((item) => [item.url, photoEnhanceLevel]))
    }));
    setPhotoSourceByUrl((prev) => ({
      ...prev,
      ...Object.fromEntries(uploadedUrls.map((item) => [item.url, item.originalFile]))
    }));

    setStatus(`사진 ${uploadedUrls.length}장 업로드 완료. 매물 등록/수정 저장을 눌러야 홈페이지에 최종 반영됩니다.`);
  }

  async function reprocessPhoto(src, nextLevel) {
    const originalFile = photoSourceByUrl[src];
    if (!originalFile) {
      setPhotoEnhanceByUrl((prev) => ({ ...prev, [src]: nextLevel }));
      setStatus('이 사진은 기존 URL 사진이라 새 보정값만 표시됩니다. 새로 업로드한 사진만 다시 보정할 수 있습니다.');
      return;
    }

    if (!isSupabaseReady) {
      setStatus('Supabase 연결 전에는 사진별 재보정 업로드가 되지 않습니다.');
      return;
    }

    setStatus('선택한 사진만 다시 보정 중입니다.');
    const editedFile = await autoEditPhoto(originalFile, {
      enhanceLevel: nextLevel,
      watermark: photoWatermark,
    });
    const uniqueId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const filePath = `properties/${uniqueId}-reedit.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('property-images')
      .upload(filePath, editedFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg'
      });
    if (uploadError) {
      setStatus(`사진 재보정 실패: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from('property-images').getPublicUrl(filePath);
    const nextUrl = data?.publicUrl;
    if (!nextUrl) {
      setStatus('사진 재보정 URL 생성에 실패했습니다.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      photosText: linesToArray(prev.photosText).map((url) => (url === src ? nextUrl : url)).join('\n')
    }));
    setPhotoSourceByUrl((prev) => {
      const next = { ...prev, [nextUrl]: originalFile };
      delete next[src];
      return next;
    });
    setPhotoEnhanceByUrl((prev) => {
      const next = { ...prev, [nextUrl]: nextLevel };
      delete next[src];
      return next;
    });
    setStatus('선택한 사진만 다시 보정했습니다.');
  }

  function removePhoto(index) {
    setForm((prev) => {
      const next = linesToArray(prev.photosText);
      next.splice(index, 1);
      return { ...prev, photosText: next.join('\n') };
    });
  }

  function movePhoto(index, direction) {
    setForm((prev) => {
      const next = linesToArray(prev.photosText);
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return { ...prev, photosText: next.join('\n') };
    });
  }
function reorderPhoto(fromIndex, toIndex) {
  if (fromIndex === toIndex) return;

  setForm((prev) => {
    const next = linesToArray(prev.photosText);
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

    return { ...prev, photosText: next.join('\n') };
  });
}
  async function saveProperty(e, forceDuplicateSave = false) {
    e?.preventDefault?.();
    setStatus('저장 중입니다.');
    if (forceDuplicateSave) setDuplicateWarning(null);

    const maintenanceAmount = normalizeManwon(form.maintenance_fee);
    const maintenanceItems = linesToArray(maintenanceItemsText);
    const maintenanceItemSuffix = maintenanceItems.length ? ` (포함 항목: ${maintenanceItems.join(', ')})` : '';
    const maintenanceText =
      maintenanceType === '관리비포함'
        ? `관리비 ${maintenanceAmount ? `${maintenanceAmount} 포함` : '포함'}${maintenanceItemSuffix}`
        : maintenanceType === '관리비별도'
        ? (maintenanceAmount ? `관리비 ${maintenanceAmount} 별도${maintenanceItemSuffix}` : `관리비 확인 필요${maintenanceItemSuffix}`)
        : maintenanceType === '관리비없음'
        ? '관리비 없음'
        : '관리비 확인 필요';
    const floorInfo = [
      quickShowUnit && quickUnit ? quickUnit : '',
      quickFloor ? `${quickFloor}층` : '',
      quickTotalFloor ? `총 ${quickTotalFloor}층` : ''
    ].filter(Boolean).join(' / ');
    const storedFloorInfo = floorInfo;
    const roomBathText = quickRoomCount || quickBathCount ? `방 ${quickRoomCount || 0} / 욕실 ${quickBathCount || 0}` : '';
    const directionText = `${directionChoice} / 주출입구 기준`;
    const moveInText = moveInChoice === '날짜 직접입력' ? (moveInDate || '날짜협의') : moveInChoice;
    const parkingText = [
      parkingTotal ? `총 ${parkingTotal}대` : '',
      parkingPerUnit ? `세대당 ${parkingPerUnit}대` : '',
      parkingChoice,
      parkingMemo
    ].filter(Boolean).join(' / ');
    const staffStatusValue = isStaffMode ? 'pending' : (POST_STATUS_OPTIONS.find((item) => item.label === postStatusLabel)?.value || 'pending');
    const finalCategory = isStaffMode ? quickRoomType : (form.category || quickRoomType);
    const finalTradeType = isStaffMode ? quickTradeType : (form.trade_type || quickTradeType);
    const finalRoomBath = isStaffMode ? (roomBathText || ROOM_BATH_DEFAULTS[finalCategory] || '') : (form.room_bath || ROOM_BATH_DEFAULTS[finalCategory] || '');
    const staffTitle = [
      quickTitleKeyword,
      finalCategory,
      finalTradeType,
      finalTradeType !== '매매' && form.deposit && form.rent ? `${form.deposit}/${form.rent}` : '',
      finalTradeType === '매매' && form.sale_price ? `매매 ${form.sale_price}` : '',
      maintenanceType === '관리비포함' ? '관리비포함' : '',
    ].filter(Boolean).join(' ');
    const saveForm = isStaffMode
      ? {
          ...form,
          title: form.title?.trim() || staffTitle || '직원 등록 매물',
          category: finalCategory,
          trade_type: finalTradeType,
          room_bath: finalRoomBath,
          maintenance_fee: maintenanceText,
          floor_info: storedFloorInfo || form.floor_info,
          real_unit: quickUnit || form.real_unit,
          convenienceText: [...new Set([...linesToArray(form.convenienceText), ...maintenanceItems, heatingChoice !== '확인필요' ? `난방: ${heatingChoice}` : ''])].join('\n'),
          maintenance_includes: form.maintenance_includes || maintenanceItems.join('\n'),
          move_in: moveInText,
          direction: directionText,
          parking: parkingText || '주차 확인 필요',
          elevator: elevatorChoice,
          summary: form.summary || '직원이 현장에서 등록한 검수대기 매물입니다.',
          private_memo: form.private_memo,
          status: staffStatusValue,
        }
      : form;

    if (!saveForm.title.trim()) {
      setStatus('제목은 필수입니다.');
      return;
    }

    if (!isSupabaseReady) {
      setStatus('Supabase 환경변수 연결 전에는 실제 저장이 되지 않습니다.');
      return;
    }

    const payload = {
  ...formToPayload(saveForm),
  status: isStaffMode ? staffStatusValue : (saveForm.status || 'published'),
  staff_name: isStaffMode ? (currentStaff?.name || saveForm.staff_name || '직원') : (saveForm.staff_name || ''),
staff_code: isStaffMode ? (currentStaff?.code || saveForm.staff_code || 'staff') : (saveForm.staff_code || ''),
created_by: editingId ? (saveForm.created_by || currentStaff?.name || '') : (isStaffMode ? (currentStaff?.name || saveForm.staff_name || '직원') : '대표'),
updated_by: isStaffMode ? (currentStaff?.name || saveForm.staff_name || '직원') : '대표',
  updated_at: new Date().toISOString()
};

    if (!forceDuplicateSave) {
      const { data: duplicateSource, error: duplicateError } = await supabase
        .from('properties')
        .select(canEditExisting ? '*' : 'id,title,address,category,trade_type,floor_info,real_unit,status,created_at')
        .order('created_at', { ascending: false });
      const duplicateList = duplicateError ? properties : (duplicateSource || []);
      const duplicate = findDuplicateProperty(payload, duplicateList, editingId);
      if (duplicate) {
        const targetParts = getPropertyDuplicateParts(payload);
        const duplicateParts = getPropertyDuplicateParts(duplicate);
        const hasUnit = Boolean(targetParts.unit && duplicateParts.unit);
        if (isStaffMode && hasUnit) {
          setDuplicateWarning(null);
          setStatus('이미 같은 주소와 같은 호수의 매물이 등록되어 있습니다.\n기존 매물을 확인한 뒤 수정하거나 대표 관리자에게 문의해주세요.');
          return;
        }
        const message = hasUnit
          ? '동일 주소/동일 호수의 매물이 이미 있습니다.\n기존 매물을 수정하시겠습니까, 그래도 새로 등록하시겠습니까?'
          : '같은 주소의 매물이 이미 있습니다. 같은 매물인지 확인해주세요.';
        if (isAdminMode) {
          setDuplicateWarning({ duplicate, message, hasUnit });
          setStatus(message);
          return;
        }
        setStatus(message);
      }
    }
    
const request = editingId && canEditExisting
  ? supabase.from('properties').update(payload).eq('id', editingId)
  : editingId && isStaffMode && currentStaff?.code
    ? supabase
        .from('properties')
        .update(payload)
        .eq('id', editingId)
        .eq('staff_code', currentStaff.code)
    : supabase.from('properties').insert(payload);

   const { error } = await request;
    if (error) {
      setStatus(`저장 실패: ${error.message}`);
      return;
    }

    if (isStaffMode) {
      setStaffSavedItems((prev) => [
        {
          title: saveForm.title,
          address: saveForm.address,
          status: 'pending',
          createdAt: new Date().toLocaleString('ko-KR')
        },
        ...prev
      ]);
    }
    setStatus(isStaffMode ? '임시저장 완료되었습니다. 대표 검수 후 홈페이지에 노출됩니다.' : (editingId ? '수정 완료되었습니다.' : '등록 완료되었습니다.'));
   resetForm();
await reload();

if (isStaffMode && currentStaff?.code) {
  await loadStaffProperties(currentStaff.code);
}
}
  async function changePropertyStatus(id, nextStatus) {
    if (!canEditExisting) {
      setStatus('대표 관리자만 공개상태를 변경할 수 있습니다.');
      return;
    }
    if (!isSupabaseReady) {
      setStatus('Supabase 연결 전에는 상태 변경이 되지 않습니다.');
      return;
    }
    const { error } = await supabase.from('properties').update({ status: nextStatus }).eq('id', id);
    if (error) {
      setStatus(`상태 변경 실패: ${error.message}`);
      return;
    }
    setStatus(`${STATUS_LABELS[nextStatus]} 상태로 변경했습니다.`);
    await reload();
  }

  async function deleteProperty(id) {
    if (!canEditExisting) {
      setStatus('대표 관리자만 매물을 삭제할 수 있습니다.');
      return;
    }
    if (!isSupabaseReady) {
      setStatus('Supabase 연결 전에는 삭제가 되지 않습니다.');
      return;
    }
    const ok = window.confirm('이 매물을 삭제할까요?');
    if (!ok) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (error) {
      setStatus(`삭제 실패: ${error.message}`);
      return;
    }
    setStatus('삭제 완료되었습니다.');
    await reload();
  }

  return (
    <div className="modal-backdrop">
      <div className="admin-modal">
        <div className="modal-head">
          <div>
            <p className="eyebrow">ADMIN</p>
            <h2>매물 관리자</h2>
          </div>
          <button className="icon-btn" onClick={onClose}>×</button>
        </div>
        {mode && (
          <div className="access-mode-badge">
            현재 접속: <strong>{accessLabel}</strong>
          </div>
        )}

        {!mode ? (
          <div className="mode-choice">
            <button type="button" onClick={() => chooseMode('staff')}>
              <strong>직원 간단등록</strong>
              <span>현장에서 사진, 주소, 보증금, 월세, 관리비, 간단 메모만 빠르게 저장합니다.</span>
            </button>
            <button type="button" onClick={() => chooseMode('admin')}>
              <strong>대표 관리자</strong>
              <span>기존 비밀번호로 로그인해 검수대기 매물을 수정, 승인, 보류, 삭제합니다.</span>
            </button>
          </div>
        ) : !isAdmin ? (
             <form className="login-box" onSubmit={login}>
            <label>{isStaffMode ? '직원용 비밀번호' : '대표 관리자 비밀번호'}</label>

            {isStaffMode && (
              <>
                <label>담당자 이름</label>
                <input
                  type="text"
                  value={form.staff_name}
                  onChange={(e) => updateField('staff_name', e.target.value)}
                  placeholder="예: 김실장"
                />

                <label>담당자 코드</label>
                <input
                  type="text"
                  value={form.staff_code}
                  onChange={(e) => updateField('staff_code', e.target.value)}
                  placeholder="예: 1001"
                />
              </>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
            />

            <button className="primary-btn" type="submit">
              {isStaffMode ? '직원용 관리자 들어가기' : '대표 관리자 들어가기'}
            </button>

            <p className="status-text">
              {status || '접속 권한을 확인합니다. 관리자 비밀번호를 입력해주세요.'}
            </p>
          </form>
        ) : (
          <div className="admin-grid simple-admin-grid">
            <form className="property-form" onSubmit={saveProperty}>
              <div className="form-topline">
                <h3>{editingId ? '매물 수정' : isStaffMode ? '직원 간단등록' : '간단 매물 등록'}</h3>
                <button type="button" className="small-btn" onClick={resetForm}>새 등록</button>
              </div>

              {isStaffMode && (
                <div className="notice warning compact-notice">
                  직원이 저장한 매물은 검수대기로 저장되며, 검토 완료 후 손님용 홈페이지와 지도에 노출됩니다.
                </div>
              )}
              {isStaffMode && (
                <div className="entry-mode-tabs">
                  <button
                    type="button"
                    className={staffView === 'register' ? 'active' : ''}
                    onClick={() => setStaffView('register')}
                  >
                    새 매물 등록
                  </button>
                  <button
                    type="button"
                    className={staffView === 'mine' ? 'active' : ''}
                    onClick={() => setStaffView('mine')}
                  >
                    내가 올린 매물
                  </button>
                </div>
              )}
              {isAdminMode && (
              <section className="admin-section-block priority-block">
                <h4>0. 매물자료 일괄입력</h4>
                <TextArea
                  label="자료를 통째로 붙여넣기"
                  value={bulkText}
                  onChange={setBulkText}
                  rows={8}
                  placeholder={`예:
매물명: 아르고
주소: 경상북도 구미시 인의동 990-9
매매가: 91000
융자금: 41000
보증금총액: 42200
인수가격: 7800
총월세: 498
월순수익: 327
수익률: 50.3`}
                />
                <button type="button" className="primary-btn" onClick={applyBulkInput}>일괄입력 자동 채우기</button>
                <p className="muted">사진은 위/아래 사진등록에서 올리고, 매물자료는 이 칸에 통째로 붙여넣은 뒤 자동 채우기를 누르면 됩니다.</p>
              </section>
              )}
{false && isAdminMode && (
<div className="entry-mode-tabs">
  <button
    type="button"
    className={entryMode === 'simple' ? 'active' : ''}
    onClick={() => setEntryMode('simple')}
  >
    간단 매물 등록
  </button>

  <button
    type="button"
    className={entryMode === 'detail' ? 'active' : ''}
    onClick={() => setEntryMode('detail')}
  >
    상세 등록
  </button>
</div>
)}
               {isStaffMode && staffView === 'register' && (
                  <section className="staff-step-register">
                  <div className="staff-step-head">
                    <div>
                      <span className="staff-step-count">{staffStep + 1}/10</span>
                      <h4>{staffWizardSteps[staffStep]}</h4>
                    </div>
                    <div className="staff-progress-track">
                      <span style={{ width: `${((staffStep + 1) / staffWizardSteps.length) * 100}%` }} />
                    </div>
                  </div>

                  <div className="staff-step-card">
                    {staffStep === 0 && (
                      <AddressLedgerSearchSection
                        title="주소검색"
                        form={form}
                        updateField={updateField}
                        addressResults={addressResults}
                        setAddressResults={setAddressResults}
                        addressSearching={addressSearching}
                        handleAddressSearch={handleAddressSearch}
                        selectedAddressItem={selectedAddressItem}
                        setSelectedAddressItem={setSelectedAddressItem}
                        selectedAddressLabel={selectedAddressLabel}
                        buildingLedgerSearching={buildingLedgerSearching}
                        fetchBuildingLedger={fetchBuildingLedger}
                        ledgerPreviewItems={ledgerPreviewItems}
                        status={status}
                        setStatus={setStatus}
                      />
                    )}

                    {staffStep === 1 && (
                      <section className="staff-question">
                        <h3>호수를 선택해주세요</h3>
                        <div className="two-cols">
                          <Field label="호수" value={quickUnit} onChange={setQuickUnit} placeholder="예: 303호" inputMode="numeric" />
                          <NumberField label="해당층" value={quickFloor} onChange={setQuickFloor} placeholder="예: 3" suffix="층" />
                        </div>
                        <label className="check-line quick-check-line">
                          <input type="checkbox" checked={quickShowUnit} onChange={(e) => setQuickShowUnit(e.target.checked)} />
                          호수 공개
                        </label>
                      </section>
                    )}

                    {staffStep === 2 && (
                      <section className="staff-question">
                        <h3>매물종류를 선택해주세요</h3>
                        <ButtonChoiceGroup
                          label="매물종류"
                          value={quickRoomType}
                          options={['원룸', '미니투룸', '투룸', '쓰리룸 이상', '상가/사무실', '아파트', '토지']}
                          onChange={(type) => {
                            setQuickRoomType(type);
                            updateField('category', type);
                            if (ROOM_BATH_DEFAULTS[type]) updateField('room_bath', ROOM_BATH_DEFAULTS[type]);
                            updateField('move_in', form.move_in || '즉시입주 협의');
                            updateField('direction', form.direction || '주출입구 기준 확인 필요');
                          }}
                        />
                      </section>
                    )}

                    {staffStep === 3 && (
                      <section className="staff-question">
                        <h3>거래형태를 선택해주세요</h3>
                        <ButtonChoiceGroup
                          label="거래형태"
                          value={quickTradeType}
                          options={['월세', '반전세', '전세', '매매', '단기']}
                          onChange={(type) => {
                            setQuickTradeType(type);
                            updateField('trade_type', type);
                            if (type === '전세') updateField('rent', '0');
                          }}
                        />
                      </section>
                    )}

                    {staffStep === 4 && (
                      <section className="staff-question">
                        <h3>가격을 입력해주세요</h3>
                        {quickTradeType === '매매' ? (
                          <div className="two-cols">
                            <NumberField label="매매가" value={form.sale_price} onChange={(v) => updateField('sale_price', v)} placeholder="예: 91000" />
                            <NumberField label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="예: 300" />
                          </div>
                        ) : (
                          <div className="two-cols">
                            <NumberField label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="예: 300" />
                            <NumberField label="월세" value={form.rent} onChange={(v) => updateField('rent', v)} placeholder="예: 40" disabled={quickTradeType === '전세'} />
                          </div>
                        )}
                      </section>
                    )}

                    {staffStep === 5 && (
                      <section className="staff-question">
                        <h3>관리비를 선택해주세요</h3>
                        <ButtonChoiceGroup
                          label="관리비"
                          value={maintenanceType === '관리비포함' ? '포함' : '별도'}
                          options={['포함', '별도']}
                          onChange={(type) => setMaintenanceType(type === '포함' ? '관리비포함' : '관리비별도')}
                        />
                        {maintenanceType !== '관리비포함' && (
                          <NumberField label="관리비 금액" value={form.maintenance_fee} onChange={(v) => updateField('maintenance_fee', v)} placeholder="예: 5" />
                        )}
                      </section>
                    )}

                    {staffStep === 6 && (
                      <section className="staff-question">
                        <h3>사진을 등록해주세요</h3>
                        <PhotoUploader
                          photos={photoUrls}
                          onUpload={uploadPhotoFiles}
                          onRemove={removePhoto}
                          onMove={movePhoto}
                          onReorder={reorderPhoto}
                          showEnhanceControls={true}
                          enhanceMode={photoEnhanceMode}
                          onChangeEnhanceMode={setPhotoEnhanceMode}
                          enhanceLevel={photoEnhanceLevel}
                          photoEnhanceByUrl={photoEnhanceByUrl}
                          onChangePhotoEnhance={reprocessPhoto}
                          watermarkEnabled={photoWatermark}
                          onChangeEnhanceLevel={setPhotoEnhanceLevel}
                          onToggleWatermark={setPhotoWatermark}
                        />
                      </section>
                    )}

                    {staffStep === 7 && (
                      <section className="staff-question">
                        <h3>입주일을 선택해주세요</h3>
                        <ButtonChoiceGroup
                          label="입주일"
                          value={moveInChoice === '날짜 직접입력' ? '날짜선택' : moveInChoice === '날짜협의' ? '협의가능' : moveInChoice}
                          options={['즉시입주', '협의가능', '날짜선택']}
                          onChange={(type) => {
                            if (type === '날짜선택') setMoveInChoice('날짜 직접입력');
                            else if (type === '협의가능') setMoveInChoice('날짜협의');
                            else setMoveInChoice('즉시입주');
                          }}
                        />
                        {moveInChoice === '날짜 직접입력' && (
                          <Field label="입주 가능 날짜" value={moveInDate} onChange={setMoveInDate} placeholder="예: 2026년 6월 20일" />
                        )}
                      </section>
                    )}

                    {staffStep === 8 && (
                      <section className="staff-question">
                        <h3>주차 가능 여부를 선택해주세요</h3>
                        <ButtonChoiceGroup
                          label="주차"
                          value={parkingChoice.includes('가능') && !parkingChoice.includes('불가') ? '가능' : parkingChoice.includes('불가') ? '불가능' : '확인필요'}
                          options={['가능', '불가능', '확인필요']}
                          onChange={(type) => setParkingChoice(type === '가능' ? '주차가능' : type === '불가능' ? '주차불가' : '주차 확인 필요')}
                        />
                      </section>
                    )}

                    {staffStep === 9 && (
                      <section className="staff-question">
                        <h3>최종확인 후 등록해주세요</h3>
                        <div className={quickReady ? 'quick-status ok' : 'quick-status warn'}>
                          {quickReady ? '기본 확인 완료: 대표 검수대기로 저장됩니다.' : `필수 확인 필요: ${quickMissingItems.join(', ')}`}
                        </div>
                        <div className="quick-check-grid">
                          <div><span>주소</span><strong>{form.address || '주소 미입력'}</strong></div>
                          <div><span>호수</span><strong>{[quickShowUnit && quickUnit ? quickUnit : '', quickFloor ? `${quickFloor}층` : ''].filter(Boolean).join(' / ') || '미입력'}</strong></div>
                          <div><span>매물/거래</span><strong>{quickRoomType} / {quickTradeType}</strong></div>
                          <div><span>가격</span><strong>{quickTradeType === '매매' ? `매매가 ${form.sale_price || '-'}만원` : `보증금 ${form.deposit || '-'} / 월세 ${form.rent || '-'}`}</strong></div>
                          <div><span>관리비</span><strong>{maintenanceType === '관리비포함' ? '포함' : `별도 ${form.maintenance_fee || '-'}만원`}</strong></div>
                          <div><span>사진</span><strong>{photoUrls.length}장</strong></div>
                          <div><span>입주일</span><strong>{moveInChoice === '날짜 직접입력' ? moveInDate || '날짜 미입력' : moveInChoice}</strong></div>
                          <div><span>주차</span><strong>{parkingChoice}</strong></div>
                          <div><span>사용승인일</span><strong>{form.approval_date || '-'}</strong></div>
                          <div><span>건축용도</span><strong>{form.main_use || '-'}</strong></div>
                          <div><span>총층수</span><strong>{form.floor_count || quickTotalFloor || '-'}</strong></div>
                          <div><span>건물명</span><strong>{form.building_name || '-'}</strong></div>
                        </div>
                      </section>
                    )}
                  </div>

                                   <div className="staff-step-actions">
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => goStaffStep(staffStep - 1)}
                      disabled={staffStep === 0}
                    >
                      이전
                    </button>

                    {staffStep < 9 ? (
                      <button
                        key="staff-next-button"
                        type="button"
                        className="primary-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          goStaffStep(staffStep + 1);
                        }}
                      >
                        다음
                      </button>
                    ) : (
                      <button
                        key="staff-submit-button"
                        className="primary-btn"
                        type="submit"
                        disabled={!quickReady}
                        aria-disabled={!quickReady}
                        title={
                          !quickReady
                            ? `필수 확인 필요: ${quickMissingItems.join(', ')}`
                            : '대표 검수대기로 등록'
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        {quickReady ? '등록하기' : '필수값 입력 필요'}
                      </button>
                    )}
                  </div>
                </section>
              )}
              {isStaffMode && staffView === 'mine' && (
                <section className="admin-list staff-my-list">
                  <h3>내가 올린 매물</h3>

                  <p className="muted">
                    {currentStaff?.name || '직원'} · 담당자 코드 {currentStaff?.code || '-'}
                  </p>

                  {myStaffProperties.length ? (
                    myStaffProperties.map((property) => (
                      <div className="admin-list-item" key={property.id}>
                        <div className="admin-item-title">
                          <strong>{property.title || '제목 없는 매물'}</strong>

                 <em className={`status-chip status-${property.status || 'pending'}`}>
{STATUS_LABELS[property.status || 'pending'] || property.status} </em>

</div>

<span>
  {property.address || '주소 미입력'}
  {' · '}
  {(property.category?.includes('매매') || property.trade_type === '매매')
    ? `매매가 ${property.sale_price || '-'}`
    : `${property.deposit || '-'} / ${property.rent || '-'}`}
</span>
                        <div>
  <button
    type="button"
    className="small-btn"
    onClick={() => startEdit(property)}
  >
    수정
  </button>
</div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-box">
                      이 담당자 코드로 등록된 매물이 아직 없습니다.
                    </div>
                  )}
                </section>
              )}

              {entryMode === 'simple' && !isStaffMode && (
  <section className="admin-section-block priority-block">
    <h4>{isAdminMode ? '간단 매물 등록' : '직원 간단 등록'}</h4>
    <p className="muted">
      {isAdminMode
        ? '사진, 주소검색, 기본 조건을 빠르게 입력하고 필요하면 상세 등록에서 전체 항목을 보완합니다.'
        : '현장에서 사진을 먼저 올리고, 버튼 선택과 숫자 입력만으로 빠르게 검수대기 매물을 저장합니다.'}
    </p>

    <section className="quick-field-section">
      <h4>1. 사진 등록</h4>
      <PhotoUploader
        photos={photoUrls}
        onUpload={uploadPhotoFiles}
        onRemove={removePhoto}
        onMove={movePhoto}
        onReorder={reorderPhoto}
        enhanceMode={photoEnhanceMode}
        onChangeEnhanceMode={setPhotoEnhanceMode}
        enhanceLevel={photoEnhanceLevel}
        photoEnhanceByUrl={photoEnhanceByUrl}
        onChangePhotoEnhance={reprocessPhoto}
        watermarkEnabled={photoWatermark}
        onChangeEnhanceLevel={setPhotoEnhanceLevel}
        onToggleWatermark={setPhotoWatermark}
      />
    </section>

    <AddressLedgerSearchSection
      title="2. 주소검색"
      form={form}
      updateField={updateField}
      addressResults={addressResults}
      setAddressResults={setAddressResults}
      addressSearching={addressSearching}
      handleAddressSearch={handleAddressSearch}
      selectedAddressItem={selectedAddressItem}
      setSelectedAddressItem={setSelectedAddressItem}
      selectedAddressLabel={selectedAddressLabel}
      buildingLedgerSearching={buildingLedgerSearching}
      fetchBuildingLedger={fetchBuildingLedger}
      ledgerPreviewItems={ledgerPreviewItems}
      status={status}
      setStatus={setStatus}
    />

    <ButtonChoiceGroup
      label="3. 매물종류"
      value={quickRoomType}
      options={QUICK_PROPERTY_TYPES}
      onChange={(type) => {
        setQuickRoomType(type);
        updateField('category', type);
        if (ROOM_BATH_DEFAULTS[type]) updateField('room_bath', ROOM_BATH_DEFAULTS[type]);
        updateField('move_in', form.move_in || '즉시입주 협의');
        updateField('direction', form.direction || '주출입구 기준 확인 필요');
      }}
    />

    <ButtonChoiceGroup
      label="4. 거래형태"
      value={quickTradeType}
      options={QUICK_TRADE_TYPES}
      onChange={(type) => {
        setQuickTradeType(type);
        updateField('trade_type', type);
      }}
    />
    <section className="quick-field-section">
      <h4>5. 가격 입력</h4>
      {quickTradeType === '매매' ? (
        <>
          <div className="three-cols">
            <NumberField label="매매가" value={form.sale_price} onChange={(v) => updateField('sale_price', v)} placeholder="예: 91000" />
            <NumberField label="융자금" value={form.loan_amount} onChange={(v) => updateField('loan_amount', v)} placeholder="예: 41000" />
            <NumberField label="총보증금" value={form.total_deposit} onChange={(v) => updateField('total_deposit', v)} placeholder="예: 42200" />
          </div>
          <div className="three-cols">
            <NumberField label="월세수입" value={form.total_monthly_rent} onChange={(v) => updateField('total_monthly_rent', v)} placeholder="예: 498" />
            <NumberField label="월순수입" value={form.net_profit} onChange={(v) => updateField('net_profit', v)} placeholder="예: 327" />
            <NumberField label="인수금/실투자금" value={form.acquisition_price} onChange={(v) => updateField('acquisition_price', v)} placeholder="예: 7800" />
          </div>
        </>
      ) : (
        <div className="three-cols">
          <NumberField label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="예: 300" />
          <NumberField label="월세" value={form.rent} onChange={(v) => updateField('rent', v)} placeholder="예: 40" />
          <NumberField
            label="관리비 금액"
            value={form.maintenance_fee}
            onChange={(v) => updateField('maintenance_fee', v)}
            placeholder="예: 5"
            disabled={maintenanceType === '관리비없음' || maintenanceType === '확인필요'}
          />
        </div>
      )}
    </section>

    <ButtonChoiceGroup
      label="6. 관리비 구분"
      value={maintenanceType}
      options={MAINTENANCE_TYPES}
      onChange={setMaintenanceType}
    />

    <SelectableOptionGroup
      label="관리비 포함 항목"
      value={maintenanceItemsText}
      options={MAINTENANCE_ITEMS}
      onChange={setMaintenanceItemsText}
      placeholder="예: 정화조비, 건물청소비"
    />

    <section className="quick-field-section">
      <h4>7. 층 / 호수</h4>
      <div className="three-cols">
        <NumberField label="해당층" value={quickFloor} onChange={setQuickFloor} placeholder="예: 3" suffix="층" />
        <NumberField label="총층" value={quickTotalFloor} onChange={setQuickTotalFloor} placeholder="예: 4" suffix="층" />
        <Field label="호수" value={quickUnit} onChange={setQuickUnit} placeholder="예: 303호" inputMode="numeric" />
      </div>
      <label className="check-line quick-check-line">
        <input type="checkbox" checked={quickShowUnit} onChange={(e) => setQuickShowUnit(e.target.checked)} />
        호수 공개
      </label>
    </section>

    {isAdminMode && (
    <section className="quick-field-section">
      <h4>8. 방 / 욕실</h4>
      <div className="two-cols">
        <NumberField label="방 수" value={quickRoomCount} onChange={setQuickRoomCount} placeholder="예: 1" suffix="개" />
        <NumberField label="욕실 수" value={quickBathCount} onChange={setQuickBathCount} placeholder="예: 1" suffix="개" />
      </div>
    </section>
    )}

    {isAdminMode && (
    <ButtonChoiceGroup
      label="11. 방향"
      value={directionChoice}
      options={DIRECTION_OPTIONS}
      onChange={setDirectionChoice}
    />
    )}
    {isAdminMode && (
    <p className="muted quick-helper-text">방향 기준: 주출입구 기준</p>
    )}

    <ButtonChoiceGroup
      label="12. 입주가능일"
      value={moveInChoice}
      options={MOVE_IN_OPTIONS}
      onChange={setMoveInChoice}
    />
    {moveInChoice === '날짜 직접입력' && (
      <section className="quick-field-section">
        <Field label="입주 가능 날짜" value={moveInDate} onChange={setMoveInDate} placeholder="예: 2026년 6월 20일 이후" />
      </section>
    )}

    <ButtonChoiceGroup
      label="13. 주차"
      value={parkingChoice}
      options={PARKING_OPTIONS}
      onChange={setParkingChoice}
    />
    <section className="quick-field-section">
      <div className="three-cols">
        <NumberField label="총 주차대수" value={parkingTotal} onChange={setParkingTotal} placeholder="예: 8" suffix="대" />
        <NumberField label="세대당 주차대수" value={parkingPerUnit} onChange={setParkingPerUnit} placeholder="예: 1" suffix="대" />
        <Field label="주차 메모" value={parkingMemo} onChange={setParkingMemo} placeholder="예: 건물 앞 주차 가능" />
      </div>
    </section>

    {isAdminMode && (
    <ButtonChoiceGroup
      label="14. 난방"
      value={heatingChoice}
      options={HEATING_OPTIONS}
      onChange={setHeatingChoice}
    />
    )}

    {isAdminMode && (
    <ButtonChoiceGroup
      label="엘리베이터"
      value={elevatorChoice}
      options={ELEVATOR_OPTIONS}
      onChange={setElevatorChoice}
    />
    )}

    <section className="quick-field-section">
      <h4>{isStaffMode ? '비공개 메모' : '제목 키워드와 메모'}</h4>
      {isAdminMode && (
      <div className="quick-title-keyword-row">
        <p className="quick-label">제목 키워드 삽입</p>
        {['리모델링', '단기임대', '저렴한', '넓은', '즉시입주', '풀옵션'].map((keyword) => (
          <button key={keyword} type="button" className={quickTitleKeyword === keyword ? 'active' : ''} onClick={() => setQuickTitleKeyword(keyword)}>
            {keyword}
          </button>
        ))}
        <button type="button" className={quickTitleKeyword === '' ? 'active' : ''} onClick={() => setQuickTitleKeyword('')}>
          선택안함
        </button>
      </div>
      )}
      <TextArea
        label={isStaffMode ? '비공개 메모' : '한줄 요약'}
        value={isStaffMode ? form.private_memo : form.summary}
        onChange={(v) => updateField(isStaffMode ? 'private_memo' : 'summary', v)}
        rows={3}
        placeholder={isStaffMode ? '예: 집주인 통화 필요, 현관 비번 확인 전, 사진 추가 필요' : '예: 리모델링, 즉시입주, 주차가능, 공단 출퇴근 편리'}
      />
    </section>

    {isAdminMode && (
    <SelectableOptionGroup
      label="옵션/편의"
      value={form.convenienceText}
      options={OPTION_PRESETS.convenienceText}
      onChange={(v) => updateField('convenienceText', v)}
      placeholder="예: 건조기, 공기청정기"
    />
    )}

    {isAdminMode && (
    <SelectableOptionGroup
      label="안전시설"
      value={form.safetyText}
      options={OPTION_PRESETS.safetyText}
      onChange={(v) => updateField('safetyText', v)}
      placeholder="예: 보안등, 관리실"
    />
    )}

    {isAdminMode && (
    <SelectableOptionGroup
      label="생활권"
      value={form.educationText}
      options={OPTION_PRESETS.educationText}
      onChange={(v) => updateField('educationText', v)}
      placeholder="예: 역세권, 산책로 인근"
    />
    )}

    {isAdminMode && (
    <SelectableOptionGroup
      label="19. 매물 배지"
      value={form.badgesText}
      options={BADGE_OPTIONS}
      onChange={(v) => updateField('badgesText', v)}
      placeholder="예: 반전세가능"
    />
    )}

    <ButtonChoiceGroup
      label="게시상태"
      value={postStatusLabel}
      options={isStaffMode ? [POST_STATUS_OPTIONS[0].label] : POST_STATUS_OPTIONS.map((item) => item.label)}
      onChange={(nextStatus) => {
        if (isStaffMode) {
          setPostStatusLabel(POST_STATUS_OPTIONS[0].label);
          return;
        }
        setPostStatusLabel(nextStatus);
      }}
    />

  </section>
)}
              {entryMode === 'detail' && (
              <section className="admin-section-block priority-block">
                <h4>1. 기본정보</h4>
                <Field label="제목" value={form.title} onChange={(v) => updateField('title', v)} placeholder="예: 진평초등 앞 리모델링 원룸임대" />
                <div className="two-cols">
                
                <SelectField label="매물종류" value={form.category} onChange={(v) => updateField('category', v)} options={['원룸', '미니투룸', '투룸', '쓰리룸 이상', '다가구 매매', '상가·사무실']} />
<SelectField label="거래형태" value={form.trade_type} onChange={(v) => updateField('trade_type', v)} options={['월세', '반전세', '전세', '매매', '단기임대']} />
                </div>
                <AddressLedgerSearchSection
                  title="주소검색"
                  form={form}
                  updateField={updateField}
                  addressResults={addressResults}
                  setAddressResults={setAddressResults}
                  addressSearching={addressSearching}
                  handleAddressSearch={handleAddressSearch}
                  selectedAddressItem={selectedAddressItem}
                  setSelectedAddressItem={setSelectedAddressItem}
                  selectedAddressLabel={selectedAddressLabel}
                  buildingLedgerSearching={buildingLedgerSearching}
                  fetchBuildingLedger={fetchBuildingLedger}
                  ledgerPreviewItems={ledgerPreviewItems}
                  status={status}
                  setStatus={setStatus}
                />
               {(form.category?.includes('매매') || form.trade_type === '매매') ? (
  <div className="admin-sale-box">
    <h4>매매 수익 정보</h4>

    <div className="three-cols">
      <Field label="매매가격" value={form.sale_price || ''} onChange={(v) => updateField('sale_price', v)} placeholder="91000만원" />
      <Field label="융자금" value={form.loan_amount || ''} onChange={(v) => updateField('loan_amount', v)} placeholder="41000만원" />
      <Field label="금리" value={form.interest_rate || ''} onChange={(v) => updateField('interest_rate', v)} placeholder="5%" />
    </div>

    <div className="three-cols">
      <Field label="보증금 총액" value={form.total_deposit || ''} onChange={(v) => updateField('total_deposit', v)} placeholder="42200만원" />
      <Field label="인수가격" value={form.acquisition_price || ''} onChange={(v) => updateField('acquisition_price', v)} placeholder="7800만원" />
      <Field label="총월세" value={form.total_monthly_rent || ''} onChange={(v) => updateField('total_monthly_rent', v)} placeholder="498만원" />
    </div>

    <div className="three-cols">
      <Field label="융자이자" value={form.monthly_interest || ''} onChange={(v) => updateField('monthly_interest', v)} placeholder="171만원" />
      <Field label="월 순수익" value={form.net_profit || ''} onChange={(v) => updateField('net_profit', v)} placeholder="327만원" />
      <Field label="수익률" value={form.return_rate || ''} onChange={(v) => updateField('return_rate', v)} placeholder="50.3%" />
    </div>
  </div>
) : (
  <div className="three-cols">
    <Field label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="300만원" />
    <Field label="월세" value={form.rent} onChange={(v) => updateField('rent', v)} placeholder="35만원" />
    <Field label="관리비" value={form.maintenance_fee} onChange={(v) => updateField('maintenance_fee', v)} placeholder="관리비포함" />
  </div>
)}
                <TextArea label="짧은 설명" value={form.summary} onChange={(v) => updateField('summary', v)} rows={3} placeholder="위치, 장점, 입주조건을 짧게 입력" />
              </section>
)}
              {isAdminMode && (
              <section className="admin-section-block quick-check-box">
  <h4>입력자료 한눈에 확인</h4>
  <p className="muted">
    저장하기 전에 제목, 가격, 주소, 방/욕실, 사진 수를 한 번에 확인하세요.
  </p>
<div className={quickReady ? 'quick-status ok' : 'quick-status warn'}>
  {quickReady
    ? '기본 확인 완료: 저장 전 상세 내용만 한 번 더 확인하세요.'
    : `필수 확인 필요: ${quickMissingItems.join(', ')}`}
</div>
  <div className="quick-check-grid">
    <div>
      <span>제목</span>
      <strong>{form.title || '제목 미입력'}</strong>
    </div>

    <div>
      <span>매물종류</span>
      <strong>{isStaffMode ? quickRoomType : (form.category || '미입력')}</strong>
    </div>

    <div>
      <span>거래형태</span>
      <strong>{isStaffMode ? quickTradeType : (form.trade_type || '미입력')}</strong>
    </div>

    <div>
      <span>주소</span>
      <strong>{form.address || '주소 미입력'}</strong>
    </div>

    <div>
      <span>층/호</span>
      <strong>{isStaffMode ? [quickShowUnit && quickUnit ? quickUnit : '', quickFloor ? `${quickFloor}층` : '', quickTotalFloor ? `총 ${quickTotalFloor}층` : ''].filter(Boolean).join(' / ') || '미입력' : (form.floor_info || '미입력')}</strong>
    </div>

    <div>
      <span>보증금 / 월세</span>
      <strong>{form.deposit || '-'} / {form.rent || '-'}</strong>
    </div>

    <div>
      <span>관리비</span>
      <strong>{isStaffMode ? maintenanceType : (form.maintenance_fee || '월세에 포함')}</strong>
    </div>

    <div>
      <span>방/욕실</span>
      <strong>{form.room_bath || '미입력'}</strong>
    </div>

    <div>
      <span>입주가능일</span>
      <strong>{form.move_in || '즉시입주 협의'}</strong>
    </div>

    <div>
      <span>방향</span>
      <strong>{form.direction || '주출입구 기준 확인 필요'}</strong>
    </div>

    <div>
      <span>주차</span>
      <strong>{form.parking || '확인 필요'}</strong>
    </div>

 <div>
  <span>사진</span>
  <strong>{photoUrls.length}장</strong>
</div>
</div>

<div style={{ marginTop: '14px' }}>
  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
    <button
      type="button"
      onClick={handleDaangnExcelDownload}
      style={{ backgroundColor: '#FF7E36', color: 'white', padding: '8px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
    >
      당근
    </button>

    <button
      type="button"
      onClick={() => setPublishTab(publishTab === 'blog' ? '' : 'blog')}
      style={{ backgroundColor: '#173f73', color: 'white', padding: '8px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
    >
      블로그
    </button>

    <button
      type="button"
      onClick={() => setPublishTab(publishTab === 'instagram' ? '' : 'instagram')}
      style={{ backgroundColor: '#222', color: 'white', padding: '8px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
    >
      인스타
    </button>

    <button
      type="button"
      onClick={() => setPublishTab(publishTab === 'all' ? '' : 'all')}
      style={{ backgroundColor: '#0f766e', color: 'white', padding: '8px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
    >
      전체
    </button>
  </div>

  {publishTab && (
    <div style={{ marginTop: '14px', padding: '14px', border: '1px solid #d8dee9', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
      {publishTab === 'all' && (
        <div style={{ marginBottom: '14px', textAlign: 'right' }}>
          <button
            type="button"
            onClick={handleDaangnExcelDownload}
            style={{ backgroundColor: '#FF7E36', color: 'white', padding: '8px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            당근 CSV 다운로드
          </button>
        </div>
      )}

      {(publishTab === 'blog' || publishTab === 'all') && (
        <section style={{ marginBottom: '16px' }}>
          <h4>블로그 발행자료</h4>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <button type="button" onClick={() => handleCopy('블로그 제목', blogPublishData.title)}>제목 복사</button>
            <button type="button" onClick={() => handleCopy('블로그 본문', blogPublishData.body)}>본문 복사</button>
            <button type="button" onClick={() => handleCopy('블로그 태그', blogPublishData.tags)}>태그 복사</button>
          </div>

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>제목</label>
          <textarea readOnly value={blogPublishData.title} rows={2} style={{ width: '100%', padding: '8px' }} />

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>본문</label>
          <textarea readOnly value={blogPublishData.body} rows={12} style={{ width: '100%', padding: '8px' }} />

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>태그</label>
          <textarea readOnly value={blogPublishData.tags} rows={3} style={{ width: '100%', padding: '8px' }} />
        </section>
      )}

      {(publishTab === 'instagram' || publishTab === 'all') && (
        <section>
          <h4>인스타 발행자료</h4>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <button type="button" onClick={() => handleCopy('인스타 문구', instagramPublishData.body)}>문구 복사</button>
            <button type="button" onClick={() => handleCopy('인스타 태그', instagramPublishData.tags)}>태그 복사</button>
            <button type="button" onClick={() => handleCopy('사진 URL', instagramPublishData.photos)}>사진 URL 복사</button>
          </div>

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>문구</label>
          <textarea readOnly value={instagramPublishData.body} rows={8} style={{ width: '100%', padding: '8px' }} />

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>태그</label>
          <textarea readOnly value={instagramPublishData.tags} rows={3} style={{ width: '100%', padding: '8px' }} />

          <label style={{ display: 'block', fontWeight: 'bold', marginTop: '8px' }}>사진 URL</label>
          <textarea readOnly value={instagramPublishData.photos} rows={5} style={{ width: '100%', padding: '8px' }} />
        </section>
      )}
    </div>
  )}
</div>

</section>
              )}
              {isAdminMode && (
              <section className="admin-section-block">
                <h4>2. 사진등록</h4>
              <PhotoUploader
  photos={photoUrls}
  onUpload={uploadPhotoFiles}
  onRemove={removePhoto}
  onMove={movePhoto}
  onReorder={reorderPhoto}
  enhanceMode={photoEnhanceMode}
  onChangeEnhanceMode={setPhotoEnhanceMode}
  enhanceLevel={photoEnhanceLevel}
  photoEnhanceByUrl={photoEnhanceByUrl}
  onChangePhotoEnhance={reprocessPhoto}
  watermarkEnabled={photoWatermark}
  onChangeEnhanceLevel={setPhotoEnhanceLevel}
  onToggleWatermark={setPhotoWatermark}
/>
                <details className="manual-url-box">
                  <summary>사진 주소 직접 확인/수정</summary>
                  <TextArea label="업로드된 사진 URL — 한 줄에 1개씩" value={form.photosText} onChange={(v) => updateField('photosText', v)} rows={4} />
                </details>
              </section>
              )}

              {isAdminMode && (
              <details className="admin-details" open={detailFieldsOpen || Boolean(editingId)} onToggle={(event) => setDetailFieldsOpen(event.currentTarget.open)}>
                <summary>3. 상세정보 더 입력하기</summary>
                <div className="two-cols">
                  <Field label="면적" value={form.area} onChange={(v) => updateField('area', v)} placeholder="30㎡" />
                  <Field
                    label="총층수"
                    value={form.total_floor_info || form.floor_info}
                    onChange={(v) => setForm((prev) => ({ ...prev, total_floor_info: v, floor_info: v }))}
                    placeholder="지상 4층 / 지하 1층"
                  />
                </div>
                <div className="three-cols">
                  <Field label="방향" value={form.direction} onChange={(v) => updateField('direction', v)} placeholder="남향" />
                  <Field label="방/욕실" value={form.room_bath} onChange={(v) => updateField('room_bath', v)} placeholder="1/1" />
                  <Field label="주차" value={form.parking} onChange={(v) => updateField('parking', v)} placeholder="8대" />
                </div>
                <div className="two-cols">
                  <Field label="건물명" value={form.building_name || ''} onChange={(v) => updateField('building_name', v)} placeholder="예: 칸빌" />
                  <Field label="입주" value={form.move_in} onChange={(v) => updateField('move_in', v)} placeholder="즉시" />
                </div>
                <div className="three-cols">
                  <Field label="사용승인일" value={form.approval_date} onChange={(v) => updateField('approval_date', v)} placeholder="2007년 10월 25일" />
                  <Field label="구조" value={form.structure} onChange={(v) => updateField('structure', v)} placeholder="철근콘크리트구조" />
                  <Field label="주용도" value={form.main_use} onChange={(v) => updateField('main_use', v)} placeholder="다가구주택" />
                </div>
                <div className="two-cols">
                  <Field label="지상층수" value={form.floor_count} onChange={(v) => updateField('floor_count', v)} placeholder="4" />
                  <Field label="지하층수" value={form.basement_floor_count} onChange={(v) => updateField('basement_floor_count', v)} placeholder="0" />
                </div>

{(form.category?.includes('매매') || form.trade_type === '매매') && (
  <div className="admin-sale-box">
    <h4>매매 건물 정보</h4>
    <div className="three-cols">
      <Field label="총 세대수" value={form.total_units || ''} onChange={(v) => updateField('total_units', v)} placeholder="19세대" />
      <Field label="임대중 세대수" value={form.rented_units || ''} onChange={(v) => updateField('rented_units', v)} placeholder="18세대" />
      <Field label="공실 수" value={form.vacant_units || ''} onChange={(v) => updateField('vacant_units', v)} placeholder="1세대" />
    </div>

    <div className="three-cols">
      <Field label="대지면적" value={form.land_area || ''} onChange={(v) => updateField('land_area', v)} placeholder="281㎡" />
      <Field label="연면적" value={form.building_area || ''} onChange={(v) => updateField('building_area', v)} placeholder="450㎡" />
      <Field label="엘리베이터" value={form.elevator || ''} onChange={(v) => updateField('elevator', v)} placeholder="없음" />
    </div>

    <div className="three-cols">
      <Field label="리모델링" value={form.remodeling || ''} onChange={(v) => updateField('remodeling', v)} placeholder="전체 리모델링" />
      <Field label="옥상방수" value={form.roof_waterproof || ''} onChange={(v) => updateField('roof_waterproof', v)} placeholder="완료" />
      <Field label="건물관리상태" value={form.building_condition || ''} onChange={(v) => updateField('building_condition', v)} placeholder="양호" />
    </div>
<TextArea
  label="투자 포인트"
  value={form.investment_point || ''}
  onChange={(v) => updateField('investment_point', v)}
  rows={3}
  placeholder="임대수요, 위치, 수익성, 리모델링 상태 등"
/>

<TextArea
  label="참고/주의사항"
  value={form.risk_note || ''}
  onChange={(v) => updateField('risk_note', v)}
  rows={3}
  placeholder="융자, 공실, 수리 필요사항 등"
/>
</div>
)}

<TextArea
  label="상세설명"
  value={form.description}
  onChange={(v) => updateField('description', v)}
  rows={4}
/>
                    <div className="two-cols">
                  <Field label="지도 이미지 URL" value={form.map_image} onChange={(v) => updateField('map_image', v)} />
                  <Field label="지도 링크" value={form.map_link} onChange={(v) => updateField('map_link', v)} />
                </div>
                <SelectableOptionGroup
                  label="옵션/편의"
                  value={form.convenienceText}
                  options={OPTION_PRESETS.convenienceText}
                  onChange={(v) => updateField('convenienceText', v)}
                  placeholder="예: 건조기, 공기청정기"
                />
                <SelectableOptionGroup
                  label="안전시설"
                  value={form.safetyText}
                  options={OPTION_PRESETS.safetyText}
                  onChange={(v) => updateField('safetyText', v)}
                  placeholder="예: 보안등, 관리실"
                />
                <SelectableOptionGroup
                  label="생활권"
                  value={form.educationText}
                  options={OPTION_PRESETS.educationText}
                  onChange={(v) => updateField('educationText', v)}
                  placeholder="예: 역세권, 산책로 인근"
                />
              </details>
              )}
{isAdminMode && (
  <section className="admin-section-block public-private-fields">
    <h4>4. 공개용 정보</h4>
    <TextArea label="한줄 요약" value={form.summary} onChange={(v) => updateField('summary', v)} rows={2} placeholder="손님 상세 화면 상단에 보일 짧은 요약" />
    <TextArea label="상세 설명" value={form.description} onChange={(v) => updateField('description', v)} rows={4} placeholder="구조, 상태, 장점, 입주 조건 등 공개 가능한 설명" />
    <TextArea label="관리비 포함 항목" value={form.maintenance_includes} onChange={(v) => updateField('maintenance_includes', v)} rows={3} placeholder="인터넷&#10;공용전기&#10;수도요금" />
    <SelectableOptionGroup
      label="옵션"
      value={form.convenienceText}
      options={OPTION_PRESETS.convenienceText}
      onChange={(v) => updateField('convenienceText', v)}
      placeholder="예: 건조기, 공기청정기"
    />
    <TextArea label="위치 설명" value={form.location_description} onChange={(v) => updateField('location_description', v)} rows={3} placeholder="공단 출퇴근, 버스, 편의점, 생활권 등" />
    <TextArea label="추천 대상" value={form.recommended_for} onChange={(v) => updateField('recommended_for', v)} rows={3} placeholder="직장인 1인 거주, 넓은 투룸 선호 고객 등" />
    <TextArea label="사진 설명" value={form.photo_captions} onChange={(v) => updateField('photo_captions', v)} rows={4} placeholder="한 줄에 사진 1장 설명&#10;예: 거실 전경&#10;예: 주방과 옵션 상태" />
    <TextArea label="중개대상물 표시·광고 사항" value={form.legal_notice} onChange={(v) => updateField('legal_notice', v)} rows={4} placeholder="추가로 고지할 표시·광고 사항" />
  </section>
)}
{isAdminMode && (
  <section className="admin-section-block private-admin-fields">
    <h4>5. 비공개 관리자용 정보</h4>
    <TextArea label="비공개 메모" value={form.private_memo} onChange={(v) => updateField('private_memo', v)} rows={4} placeholder="손님용 화면에는 절대 표시되지 않습니다." />
    <div className="three-cols">
      <Field label="실제 호수" value={form.real_unit} onChange={(v) => updateField('real_unit', v)} placeholder="예: 303호" />
      <Field label="공동현관 비밀번호" value={form.entrance_password} onChange={(v) => updateField('entrance_password', v)} placeholder="예: 1234*" />
      <Field label="열쇠 위치" value={form.key_location} onChange={(v) => updateField('key_location', v)} placeholder="예: 우편함, 사무실 보관" />
    </div>
    <div className="three-cols">
      <Field label="집주인 이름" value={form.owner_name} onChange={(v) => updateField('owner_name', v)} placeholder="예: 홍길동" />
      <Field label="집주인 연락처" value={form.owner_phone} onChange={(v) => updateField('owner_phone', v)} placeholder="예: 010-0000-0000" />
      <Field label="중개의뢰 받은 방법" value={form.request_method} onChange={(v) => updateField('request_method', v)} placeholder="예: 전화, 방문, 블로그" />
    </div>
    <TextArea label="의뢰인 정보" value={form.client_info} onChange={(v) => updateField('client_info', v)} rows={3} />
    <TextArea label="담당 직원 메모" value={form.staff_memo} onChange={(v) => updateField('staff_memo', v)} rows={3} />
    <div className="two-cols">
      <SelectField label="광고 노출 여부" value={form.ad_visibility} onChange={(v) => updateField('ad_visibility', v)} options={['공개', '비공개', '검수대기', '광고중지']} />
      <Field label="내부 관심 태그" value={form.internal_tags} onChange={(v) => updateField('internal_tags', v)} placeholder="예: 급확인, 집주인직접, 재방문필요" />
    </div>
  </section>
)}
{isAdminMode && (
<div className="featured-badge-line">
  <label className="check-line">
    <input
      type="checkbox"
      checked={form.is_featured}
      onChange={(e) => updateField('is_featured', e.target.checked)}
    />
    추천 매물로 표시
  </label>

  <label className="badge-select-inline">
    <span>대표 배지</span>
    <select
      value={(form.badgesText || '').split('\n').map((v) => v.trim()).filter(Boolean)[0] || ''}
      onChange={(e) => {
        const selected = e.target.value;
        const lines = (form.badgesText || '').split('\n').map((v) => v.trim()).filter(Boolean);
        const rest = lines.slice(1).filter((v) => v !== selected);
        updateField('badgesText', selected ? [selected, ...rest].join('\n') : rest.join('\n'));
      }}
    >
      <option value="">선택안함</option>
      <option value="추천">추천</option>
      <option value="급매">급매</option>
      <option value="수익형">수익형</option>
      <option value="소액투자">소액투자</option>
      <option value="즉시입주">즉시입주</option>
      <option value="관리비포함">관리비포함</option>
      <option value="상가">상가</option>
      <option value="신축급">신축급</option>
      <option value="리모델링">리모델링</option>
    </select>
  </label>
</div>
)}
             
              {isAdminMode && (
              <label className="form-field full">
  <span>매물 뱃지</span>
  <textarea
    value={form.badgesText || ''}
    onChange={(e) => updateField('badgesText', e.target.value)}
    placeholder={`한 줄에 하나씩 입력
추천
급매
관리비포함
즉시입주
반전세가능
수익형`}
    rows={5}
  />
</label>
              )}
              {isAdminMode && (
                <label className="field">
                  <span>게시 상태</span>
                  <select value={form.status || 'pending'} onChange={(e) => updateField('status', e.target.value)}>
                    {POST_STATUS_OPTIONS.map((item) => (
                      <option key={`${item.label}-${item.value}`} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </label>
              )}
              {false && isStaffMode && (
                <section className="admin-section-block quick-check-box staff-review-box">
                  <h4>입력자료 한눈에 확인</h4>
                  <p className="muted">저장하기 전에 현장 입력값과 누락된 항목을 마지막으로 확인하세요.</p>
                  <div className={quickReady ? 'quick-status ok' : 'quick-status warn'}>
                    {quickReady ? '기본 확인 완료: 대표 검수대기로 저장됩니다.' : `필수 확인 필요: ${quickMissingItems.join(', ')}`}
                  </div>
                  <div className="quick-check-grid">
                    <div><span>사진</span><strong>{photoUrls.length}장</strong></div>
                    <div><span>주소</span><strong>{form.address || '주소 미입력'}</strong></div>
                    <div><span>매물/거래</span><strong>{quickRoomType} / {quickTradeType}</strong></div>
                    <div><span>가격</span><strong>{quickTradeType === '매매' ? `매매가 ${form.sale_price || '-'}만원` : `보증금 ${form.deposit || '-'} / 월세 ${form.rent || '-'}`}</strong></div>
                    <div><span>관리비</span><strong>{maintenanceType}{form.maintenance_fee && maintenanceType !== '관리비없음' && maintenanceType !== '확인필요' ? ` ${form.maintenance_fee}만원` : ''}</strong></div>
                    <div><span>관리비 항목</span><strong>{linesToArray(maintenanceItemsText).join(', ') || '선택 없음'}</strong></div>
                    <div><span>층/호수</span><strong>{[quickShowUnit && quickUnit ? quickUnit : '', quickFloor ? `${quickFloor}층` : '', quickTotalFloor ? `총 ${quickTotalFloor}층` : ''].filter(Boolean).join(' / ') || '미입력'}</strong></div>
                    <div><span>방/욕실</span><strong>방 {quickRoomCount || 0} / 욕실 {quickBathCount || 0}</strong></div>
                    <div><span>방향/입주</span><strong>{directionChoice} / {moveInChoice === '날짜 직접입력' ? (moveInDate || '날짜 미입력') : moveInChoice}</strong></div>
                    <div><span>주차</span><strong>{[parkingChoice, parkingTotal ? `총 ${parkingTotal}대` : '', parkingPerUnit ? `세대당 ${parkingPerUnit}대` : ''].filter(Boolean).join(' / ')}</strong></div>
                    <div><span>난방/엘리베이터</span><strong>{heatingChoice} / {elevatorChoice}</strong></div>
                    <div><span>게시상태</span><strong>{postStatusLabel}로 저장</strong></div>
                  </div>
                </section>
              )}
              {isAdminMode && duplicateWarning && (
                <section className="admin-section-block duplicate-warning-box">
                  <h4>중복 매물 확인</h4>
                  <p>{duplicateWarning.message}</p>
                  <div className="duplicate-warning-actions">
                    <button
                      type="button"
                      className="small-btn"
                      onClick={() => {
                        startEdit(duplicateWarning.duplicate);
                        setDuplicateWarning(null);
                      }}
                    >
                      기존 매물 보기
                    </button>
                    <button type="button" className="primary-btn" onClick={() => saveProperty(null, true)}>
                      새로 등록 계속
                    </button>
                    <button type="button" className="small-btn" onClick={() => setDuplicateWarning(null)}>
                      취소
                    </button>
                  </div>
                </section>
              )}
              {!isStaffMode && (
                <button className="primary-btn submit-btn" type="submit">{editingId ? '수정 저장' : '매물 등록하기'}</button>
              )}
              <p className="status-text">{status}</p>
            </form>

            {false && isStaffMode && (
              <div className="admin-list staff-draft-list">
                <h3>임시저장된 내가 등록한 매물 목록</h3>
                {staffSavedItems.length ? (
                  staffSavedItems.map((item, index) => (
                    <div className="admin-list-item" key={`${item.createdAt}-${index}`}>
                      <div className="admin-item-title">
                        <strong>{item.title}</strong>
                        <em className="status-chip status-pending">임시저장</em>
                      </div>
                      <span>{item.address || '주소 미입력'} · {item.createdAt}</span>
                    </div>
                  ))
                ) : (
                  <div className="empty-box">이번 접속에서 임시저장한 매물이 아직 없습니다.</div>
                )}
              </div>
            )}

            {canEditExisting && (
            <div className="admin-list">
              <h3>등록 매물</h3>
              <AdminPropertyTabs property={adminDetailProperty} activeTab={adminDetailTab} setActiveTab={setAdminDetailTab} />
              {properties.map((property) => (
                <div className="admin-list-item" key={property.id}>
                  <div className="admin-item-title">
                    <strong>{property.title}</strong>
                    <em className={`status-chip status-${property.status || 'pending'}`}>
                      {STATUS_LABELS[property.status || 'pending'] || property.status}
                    </em>
                    {hasPrivateAdminInfo(property) && (
                      <button
                        type="button"
                        className="memo-icon-button"
                        title="비공개 메모 보기"
                        onClick={() => {
                          setAdminDetailProperty(property);
                          setAdminDetailTab('memo');
                        }}
                      >
                        메모
                      </button>
                    )}
                  </div>
                  <span>{(property.category?.includes('매매') || property.trade_type === '매매') ? `매매가 ${property.sale_price || '-'} / 총월세 ${property.total_monthly_rent || '-'}` : `${property.deposit || '-'} / ${property.rent || '-'}`}</span>
                  <div>
                    <button onClick={() => { setAdminDetailProperty(property); setAdminDetailTab('public'); }}>상세</button>
                    <button onClick={() => startEdit(property)}>수정</button>
                    <button onClick={() => changePropertyStatus(property.id, 'published')}>승인</button>
                    <button onClick={() => changePropertyStatus(property.id, 'hold')}>보류</button>
                    <button onClick={() => changePropertyStatus(property.id, 'pending')}>대기</button>
                    <button onClick={() => deleteProperty(property.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
function toTextList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);

  return String(value || '')
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getDaangnPrice(property) {
  const isSale =
    property.category?.includes('매매') ||
    property.trade_type === '매매';

  if (isSale) {
    return `매매 ${property.sale_price || '가격협의'}만원`;
  }

  if (property.trade_type === '전세') {
    return `전세 ${property.deposit || '가격협의'}만원`;
  }

  return `보증금 ${property.deposit || '-'}만원 / 월세 ${property.rent || '-'}만원`;
}

function buildDaangnAd(property) {
  const propertyType = [
    property.category,
    property.trade_type
  ].filter(Boolean).join(' ');

  const price = getDaangnPrice(property);

  const options = toTextList(property.convenience)
    .slice(0, 12)
    .join(', ');

  const titleBase =
    property.title ||
    `${property.address || '구미'} ${propertyType}`;

  const title = `${titleBase}｜${price}`.slice(0, 60);

  const body = [
    `🏠 ${propertyType || '구미 부동산 매물'}`,
    `📍 ${property.address || '구미시'}`,
    `💰 ${price}`,
    `관리비: ${property.maintenance_fee || '확인 필요'}`,
    '',
    property.summary || '',
    '',
    `구조: ${property.room_bath || property.structure || '확인 필요'}`,
    `면적: ${property.area || '확인 필요'}`,
    `층수: ${property.floor_info || property.total_floor_info || '확인 필요'}`,
    `방향: ${property.direction || '확인 필요'}`,
    `입주가능일: ${property.move_in || '협의 가능'}`,
    `주차: ${property.parking || '확인 필요'}`,
    options ? `옵션: ${options}` : '',
    property.location_description
      ? `생활권: ${property.location_description}`
      : '',
    '',
    '✅ 실사진 직접 확인 매물',
    '✅ 허위매물 없이 확인 후 안내드립니다.',
    '',
    `문의: ${OFFICE.phone}`,
    '',
    '【중개대상물 표시·광고 사항】',
    `중개대상물 종류: ${property.category || '확인 필요'}`,
    `거래형태: ${property.trade_type || '확인 필요'}`,
    `소재지: ${property.address || '확인 필요'}`,
    `거래가격: ${price}`,
    `관리비: ${property.maintenance_fee || '확인 필요'}`,
    `면적: ${property.area || '확인 필요'}`,
    `총층수/해당층: ${property.total_floor_info || property.floor_info || '확인 필요'}`,
    `방향: ${property.direction || '확인 필요'}`,
    `입주가능일: ${property.move_in || '협의 가능'}`,
    `주차: ${property.parking || '확인 필요'}`,
    `사용승인일: ${property.approval_date || '확인 필요'}`,
    '',
    `상호명: ${OFFICE.name}`,
    `소재지: ${OFFICE.address}`,
    `대표공인중개사: ${OFFICE.broker}`,
    `등록번호: ${OFFICE.regNo}`,
    `연락처: ${OFFICE.phone} / ${OFFICE.tel}`
  ]
    .filter((line) => line !== '')
    .join('\n');

  return { title, body };
}
function buildDaangnRegistrationHelper(property) {
  const allText = [
    property.category,
    property.trade_type,
    property.summary,
    property.description,
    property.structure,
    property.elevator,
    property.parking,
    ...(Array.isArray(property.convenience)
      ? property.convenience
      : []),
    ...(Array.isArray(property.safety)
      ? property.safety
      : [])
  ]
    .filter(Boolean)
    .join(' ');

  const normalizeMoney = (value) => {
    const text = String(value || '').trim();

    if (!text) return '확인 필요';

    return /^\d+(\.\d+)?$/.test(text)
      ? `${text}만원`
      : text;
  };

  const roomBathText = String(
    property.room_bath || ''
  );

  const roomMatch = roomBathText.match(/방\s*(\d+)/);
  const bathMatch = roomBathText.match(/욕실\s*(\d+)/);

  const rooms = roomMatch
    ? `${roomMatch[1]}개`
    : '확인 필요';

  const baths = bathMatch
    ? `${bathMatch[1]}개`
    : '확인 필요';

  const maintenanceItems = toTextList(
    property.maintenance_includes
  );

  const options = toTextList(
    property.convenience
  );

  const hasOption = (keyword) =>
    options.some((item) =>
      String(item).includes(keyword)
    ) || allText.includes(keyword);

  const maintenanceFee = normalizeMoney(
    property.maintenance_fee
  );

  const tradeType =
    property.trade_type || '확인 필요';

  const category =
    property.category || '확인 필요';

  const isSale =
    String(category).includes('매매') ||
    tradeType === '매매';

  const priceItems = isSale
    ? [
        ['거래유형', '매매'],
        [
          '매매가격',
          normalizeMoney(property.sale_price)
        ]
      ]
    : [
        ['거래유형', tradeType],
        [
          '보증금',
          normalizeMoney(property.deposit)
        ],
        [
          '월세',
          tradeType === '전세'
            ? '해당 없음'
            : normalizeMoney(property.rent)
        ]
      ];

  const maintenanceStatus = (keyword) => {
    const matched = maintenanceItems.some(
      (item) => String(item).includes(keyword)
    );

    return matched
      ? '관리비 포함'
      : '사용량만큼 또는 확인 필요';
  };

  const sections = [
    {
      title: '1. 기본정보',
      items: [
        ['주소', property.address || '확인 필요'],
        ['매물 종류', category],
        [
          '건축물 용도',
          property.main_use || '확인 필요'
        ],
        [
          '전용면적',
          property.area || '확인 필요'
        ],
        ['공급면적', '확인 필요']
      ]
    },
    {
      title: '2. 가격',
      items: priceItems
    },
    {
      title: '3. 매물정보',
      items: [
        [
          '사용승인일',
          property.approval_date || '확인 필요'
        ],
        ['방 수', rooms],
        ['욕실 수', baths],
        [
          '총층',
          property.floor_count ||
          property.total_floor_info ||
          '확인 필요'
        ],
        [
          '해당층',
          property.floor_info || '확인 필요'
        ],
        [
          '방향',
          property.direction || '확인 필요'
        ],
        ['대출 가능 여부', '확인 필요'],
        [
          '반려동물',
          allText.includes('반려동물 가능')
            ? '가능'
            : '확인 필요'
        ]
      ]
    },
    {
      title: '4. 시설정보',
      items: [
        [
          '복층',
          allText.includes('복층')
            ? '해당'
            : '해당 없음 또는 확인 필요'
        ],
        [
          '옥탑',
          allText.includes('옥탑')
            ? '해당'
            : '해당 없음 또는 확인 필요'
        ],
        [
          '엘리베이터',
          hasOption('엘리베이터') ||
          String(property.elevator || '').includes('있음')
            ? '있음'
            : '없음 또는 확인 필요'
        ],
        [
          '세탁기',
          hasOption('세탁기') ? '있음' : '확인 필요'
        ],
        [
          '냉장고',
          hasOption('냉장고') ? '있음' : '확인 필요'
        ],
        [
          '에어컨',
          hasOption('에어컨') ? '있음' : '확인 필요'
        ],
        [
          '전자레인지',
          hasOption('전자레인지')
            ? '있음'
            : '확인 필요'
        ],
        [
          '가스레인지',
          hasOption('가스레인지')
            ? '있음'
            : '확인 필요'
        ],
        [
          '인덕션',
          hasOption('인덕션') ? '있음' : '확인 필요'
        ],
        [
          '침대',
          hasOption('침대') ? '있음' : '확인 필요'
        ]
      ]
    },
    {
      title: '5. 관리비',
      items: [
        ['공용 관리비', maintenanceFee],
        [
          '관리비 포함 항목',
          maintenanceItems.length
            ? maintenanceItems.join(', ')
            : '확인 필요'
        ],
        ['전기료', maintenanceStatus('전기')],
        ['수도료', maintenanceStatus('수도')],
        ['가스비', maintenanceStatus('가스')],
        ['난방비', maintenanceStatus('난방')],
        ['인터넷비', maintenanceStatus('인터넷')],
        ['TV·유선방송', maintenanceStatus('유선')]
      ]
    },
    {
      title: '6. 상세정보',
      items: [
        [
          '입주가능일',
          property.move_in || '협의 가능'
        ],
        [
          '위치 한줄평',
          property.location_description ||
          '확인 필요'
        ],
        [
          '상세 설명',
          property.description ||
          property.summary ||
          '확인 필요'
        ],
        [
          '주차',
          property.parking || '확인 필요'
        ]
      ]
    },
    {
      title: '7. 사진',
      items: [
        [
          '등록된 사진',
          Array.isArray(property.photos)
            ? `${property.photos.length}장`
            : '확인 필요'
        ],
        ['평면도', '등록 여부 확인 필요']
      ]
    }
  ];

  const copyText = sections
    .map((section) => {
      const lines = section.items.map(
        ([label, value]) =>
          `${label}: ${value}`
      );

      return [
        `[${section.title}]`,
        ...lines
      ].join('\n');
    })
    .join('\n\n');

  return {
    sections,
    copyText
  };
}
function buildNaverBlogAd(property) {
  const address = String(property.address || '경상북도 구미시').trim();

  const neighborhood =
    address
      .split(/\s+/)
      .find((word) => /[동읍면리]$/.test(word)) || '구미';

  const category = String(property.category || '원룸').trim();
  const tradeType = String(property.trade_type || '월세').trim();

  const roomType =
    category
      .replace(/월세|전세|반전세|매매|단기임대|단기/g, '')
      .trim() || '원룸';

  const price = getDaangnPrice(property);

  const rawMaintenance = String(
    property.maintenance_fee || ''
  ).trim();

  const maintenance = !rawMaintenance
    ? '확인 필요'
    : /^\d+(\.\d+)?$/.test(rawMaintenance)
      ? `${rawMaintenance}만원`
      : rawMaintenance;

  const options = toTextList(property.convenience).slice(0, 15);
  const safety = toTextList(property.safety).slice(0, 8);
  const living = toTextList(property.education).slice(0, 8);
  const badges = toTextList(property.badges).slice(0, 3);

  const photos = Array.isArray(property.photos)
    ? property.photos
    : toTextList(property.photos);

  const photoPlaces = [
    '건물 외관과 주차공간',
    '현관과 신발장',
    '방 전체 구조',
    '침실과 수납공간',
    '주방과 싱크대',
    '욕실 내부',
    '세탁공간과 베란다',
    '채광과 창문',
    '주요 옵션',
    '생활공간 전체'
  ];

  const photoCaptions =
    photos.length > 0
      ? photos.map((_, index) => {
          const place =
            photoPlaces[index] || `내부 공간 ${index + 1}`;

          return `${index + 1}. 구미 ${neighborhood} ${roomType} ${place}`;
        })
      : ['사진 등록 후 사진 수에 맞춰 설명을 작성해주세요.'];

  const isRentalRoom =
    /(원룸|미니투룸|투룸|쓰리룸)/.test(roomType) &&
    !/매매/.test(`${tradeType} ${category}`);

  const title = [
    '구미',
    neighborhood,
    roomType,
    tradeType,
    price,
    badges.join(' ')
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  const hubLinkBlock = isRentalRoom
    ? [
        '',
        '📌 구미 원룸 월세를 여러 지역으로 비교해보고 싶다면?',
        '인의동, 진평동, 구평동, 인동, 공단 인근 매물도 함께 비교해보실 수 있습니다.',
        '👉 구미 원룸 월세 전체 안내 보러가기',
        OFFICE.blog
      ]
    : [];

  const legalNotice =
    property.legal_notice ||
    [
      '【중개대상물 표시·광고 사항】',
      `중개대상물 종류: ${category || '확인 필요'}`,
      `거래형태: ${tradeType || '확인 필요'}`,
      `소재지: ${address || '확인 필요'}`,
      `거래가격: ${price}`,
      `관리비: ${maintenance}`,
      `면적: ${property.area || '확인 필요'}`,
      `해당층/총층: ${
        property.floor_info ||
        property.total_floor_info ||
        '확인 필요'
      }`,
      `방/욕실: ${property.room_bath || '확인 필요'}`,
      `방향: ${property.direction || '확인 필요'}`,
      `입주가능일: ${property.move_in || '협의 가능'}`,
      `주차: ${property.parking || '확인 필요'}`,
      `사용승인일: ${property.approval_date || '확인 필요'}`,
      '',
      `상호명: ${OFFICE.name}`,
      `중개사무소 소재지: ${OFFICE.address}`,
      `대표공인중개사: ${OFFICE.broker}`,
      `등록번호: ${OFFICE.regNo}`,
      `연락처: ${OFFICE.phone} / ${OFFICE.tel}`
    ].join('\n');

  const body = [
    `구미 ${neighborhood} ${roomType} ${tradeType} 매물입니다.`,
    `${price}, 관리비 ${maintenance} 조건입니다.`,
    property.summary ||
      '실사진을 직접 확인한 매물로 자세하게 안내해드립니다.',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🏠 매물 기본정보',
    '━━━━━━━━━━━━━━━━━━',
    `지역: ${address}`,
    `매물종류: ${roomType}`,
    `거래형태: ${tradeType}`,
    `가격: ${price}`,
    `관리비: ${maintenance}`,
    `관리비 포함 항목: ${
      property.maintenance_includes || '확인 필요'
    }`,
    `면적: ${property.area || '확인 필요'}`,
    `층수: ${
      property.floor_info ||
      property.total_floor_info ||
      '확인 필요'
    }`,
    `방/욕실: ${property.room_bath || '확인 필요'}`,
    `방향: ${property.direction || '확인 필요'}`,
    `입주가능일: ${property.move_in || '협의 가능'}`,
    `주차: ${property.parking || '확인 필요'}`,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '⭐ 매물 핵심정리',
    '━━━━━━━━━━━━━━━━━━',
    property.description ||
      property.summary ||
      '현장에서 직접 확인한 실사진 매물입니다.',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '📍 위치와 생활권',
    '━━━━━━━━━━━━━━━━━━',
    property.location_description ||
      '구미 주요 생활권과 출퇴근 동선을 확인해주세요.',
    living.length
      ? living.map((item) => `✓ ${item}`).join('\n')
      : '',
    ...hubLinkBlock,
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🛋 옵션과 내부 상태',
    '━━━━━━━━━━━━━━━━━━',
    options.length
      ? options.map((item) => `✓ ${item}`).join('\n')
      : '옵션은 상담 시 확인해주세요.',
    safety.length
      ? safety.map((item) => `✓ ${item}`).join('\n')
      : '',
    '',
    '━━━━━━━━━━━━━━━━━━',
    '📷 사진별 설명',
    '━━━━━━━━━━━━━━━━━━',
    photoCaptions.join('\n\n'),
    '',
    '━━━━━━━━━━━━━━━━━━',
    '🙋 이런 분께 추천드립니다',
    '━━━━━━━━━━━━━━━━━━',
    property.recommended_for ||
      [
        `✓ 구미 ${neighborhood}에서 방을 찾는 분`,
        '✓ 출퇴근이 편리한 매물을 찾는 분',
        '✓ 실사진으로 확인한 매물을 찾는 분'
      ].join('\n'),
    '',
    '━━━━━━━━━━━━━━━━━━',
    '📞 문의 및 방 보기',
    '━━━━━━━━━━━━━━━━━━',
    '실사진을 직접 확인한 매물입니다.',
    '현재 공실 여부와 입주 가능일은 상담 시 다시 확인해드립니다.',
    `전화·문자 문의: ${OFFICE.phone}`,
    '',
    legalNotice
  ]
    .filter((line) => line !== '')
    .join('\n');

  const rawTags = [
    '#구미부동산',
    `#구미${roomType.replace(/\s+/g, '')}`,
    `#${neighborhood}${roomType.replace(/\s+/g, '')}`,
    `#구미${neighborhood}${roomType.replace(/\s+/g, '')}`,
    `#구미${tradeType.replace(/\s+/g, '')}`,
    isRentalRoom ? '#구미원룸' : '',
    isRentalRoom ? '#구미원룸월세' : '',
    isRentalRoom ? '#구미자취방' : '',
    '#칸공인중개사'
  ].filter(Boolean);

  const tags = [...new Set(rawTags)].join(' ');

  return { title, body, tags };
}
async function copyAdvertisementText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  }
}
function AdminPropertyTabs({ property, activeTab, setActiveTab }) {
  const [daangnOpen, setDaangnOpen] = useState(false);
  const [daangnHelperOpen, setDaangnHelperOpen] = useState(false);
const [blogOpen, setBlogOpen] = useState(false);

const [copyStatus, setCopyStatus] = useState('');
  const [helperCopyStatus, setHelperCopyStatus] = useState('');
const [blogCopyStatus, setBlogCopyStatus] = useState('');
useEffect(() => {
if (!property || activeTab !== 'ad') return;

const {
private_memo,
real_unit,
entrance_password,
key_location,
owner_name,
owner_phone,
client_info,
request_method,
staff_memo,
internal_tags,
...advertisingProperty
} = property;

window.localStorage.setItem(
'kanAdConnectorProperty',
JSON.stringify(advertisingProperty)
);
}, [property, activeTab]);

  if (!property) {
    return <div className="admin-property-tabs empty-box">관리할 매물을 선택하면 공개정보와 비공개정보를 탭으로 확인할 수 있습니다.</div>;
  }

  const tabs = [
    { key: 'public', label: '공개정보' },
    { key: 'memo', label: '비공개 메모' },
    { key: 'client', label: '의뢰인 정보' },
    { key: 'ad', label: '광고관리' }
  ];

  return (
    <section className="admin-property-tabs">
      <div className="admin-property-tabs-head">
        <div>
          <p className="eyebrow">ADMIN DETAIL</p>
          <h3>{property.title || '선택한 매물'}</h3>
        </div>
        {hasPrivateAdminInfo(property) && <span className="memo-dot">메모 있음</span>}
      </div>
      <div className="admin-detail-tab-buttons">
        {tabs.map((tab) => (
          <button key={tab.key} type="button" className={activeTab === tab.key ? 'active' : ''} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'public' && (
        <div className="admin-detail-panel">
          <InfoLine label="가격" value={(property.category?.includes('매매') || property.trade_type === '매매') ? `매매가 ${property.sale_price || '-'}` : `보증금 ${property.deposit || '-'} / 월세 ${property.rent || '-'}`} />
          <InfoLine label="위치" value={property.address} />
          <InfoLine label="한줄 요약" value={property.summary} />
          <InfoLine label="상세 설명" value={property.description} multiline />
          <InfoLine label="관리비 포함 항목" value={property.maintenance_includes || getMaintenanceInfo(property.maintenance_fee).includedItems.join(', ')} />
          <InfoLine label="옵션" value={(property.convenience || []).join(', ')} />
          <InfoLine label="위치 설명" value={property.location_description} multiline />
          <InfoLine label="추천 대상" value={property.recommended_for} multiline />
          <InfoLine label="사진 설명" value={property.photo_captions} multiline />
          <InfoLine label="표시·광고 사항" value={property.legal_notice} multiline />
        </div>
      )}

      {activeTab === 'memo' && (
        <div className="admin-detail-panel private-panel">
          <InfoLine label="비공개 메모" value={property.private_memo} multiline />
          <InfoLine label="실제 호수" value={property.real_unit} />
          <InfoLine label="공동현관 비밀번호" value={property.entrance_password} />
          <InfoLine label="열쇠 위치" value={property.key_location} />
          <InfoLine label="담당 직원 메모" value={property.staff_memo} multiline />
          <InfoLine label="내부 관심 태그" value={property.internal_tags} />
        </div>
      )}

      {activeTab === 'client' && (
        <div className="admin-detail-panel private-panel">
          <InfoLine label="집주인 이름" value={property.owner_name} />
          <InfoLine label="집주인 연락처" value={property.owner_phone} />
          <InfoLine label="의뢰인 정보" value={property.client_info} multiline />
          <InfoLine label="중개의뢰 받은 방법" value={property.request_method} />
        </div>
      )}

      {activeTab === 'ad' && (
  <div className="admin-detail-panel">
    <InfoLine
      label="게시 상태"
      value={STATUS_LABELS[property.status || 'pending'] || property.status}
    />
    <InfoLine
      label="광고 노출 여부"
      value={property.ad_visibility || '공개'}
    />
    <InfoLine
      label="추천 매물"
      value={property.is_featured ? '추천 표시' : '일반 매물'}
    />
    <InfoLine
      label="배지"
      value={(property.badges || []).join(', ')}
    />

    <button
      type="button"
      className="primary-btn"
      style={{ marginTop: '16px' }}
      onClick={() => {
        setDaangnOpen((prev) => !prev);
        setCopyStatus('');
      }}
    >
      {daangnOpen ? '당근 광고 닫기' : '당근용 광고 만들기'}
    </button>

    {daangnOpen && (() => {
      const daangnAd = buildDaangnAd(property);

      return (
        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            border: '1px solid #ead5b8',
            borderRadius: '16px',
            background: '#fffaf3'
          }}
        >
          <strong>당근 광고 제목</strong>

          <textarea
            readOnly
            value={daangnAd.title}
            rows={2}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginTop: '8px',
              padding: '12px',
              borderRadius: '10px'
            }}
          />

          <button
            type="button"
            className="small-btn"
            onClick={async () => {
              const copied = await copyAdvertisementText(daangnAd.title);
              setCopyStatus(copied ? '제목 복사 완료' : '복사 실패');
            }}
          >
            제목 복사
          </button>

          <strong style={{ display: 'block', marginTop: '18px' }}>
            당근 광고 본문
          </strong>

          <textarea
            readOnly
            value={daangnAd.body}
            rows={22}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              marginTop: '8px',
              padding: '12px',
              borderRadius: '10px',
              lineHeight: '1.6'
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              marginTop: '10px'
            }}
          >
            <button
              type="button"
              className="small-btn"
              onClick={async () => {
                const copied = await copyAdvertisementText(daangnAd.body);
                setCopyStatus(copied ? '본문 복사 완료' : '복사 실패');
              }}
            >
              본문 복사
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={async () => {
                const copied = await copyAdvertisementText(
                  `${daangnAd.title}\n\n${daangnAd.body}`
                );
                setCopyStatus(
                  copied ? '제목과 본문 전체 복사 완료' : '복사 실패'
                );
              }}
            >
              전체 복사
            </button>
          </div>

          {copyStatus && (
            <p className="status-text">{copyStatus}</p>
          )}
        </div>
      );
    })()}
    <div
  style={{
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb'
  }}
>
  <button
    type="button"
    className="primary-btn"
    onClick={() => {
      setDaangnHelperOpen((prev) => !prev);
      setHelperCopyStatus('');
    }}
  >
    {daangnHelperOpen
      ? '당근 등록 도우미 닫기'
      : '당근 등록 도우미'}
  </button>

  {daangnHelperOpen && (() => {
    const helper =
      buildDaangnRegistrationHelper(property);

    return (
      <div
        style={{
          marginTop: '16px',
          padding: '16px',
          border: '1px solid #f1c89a',
          borderRadius: '16px',
          background: '#fff9f2'
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap'
          }}
        >
          <strong>당근 매물등록 입력값</strong>

          <button
            type="button"
            className="primary-btn"
            onClick={async () => {
              const copied =
                await copyAdvertisementText(
                  helper.copyText
                );

              setHelperCopyStatus(
                copied
                  ? '당근 등록내용 전체 복사 완료'
                  : '복사 실패'
              );
            }}
          >
            전체 복사
          </button>
        </div>

        {helper.sections.map((section) => (
          <div
            key={section.title}
            style={{
              marginTop: '16px',
              padding: '14px',
              border: '1px solid #eadfd2',
              borderRadius: '12px',
              background: '#ffffff'
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px'
              }}
            >
              <strong>{section.title}</strong>

              <button
                type="button"
                className="small-btn"
                onClick={async () => {
                  const sectionText = [
                    `[${section.title}]`,
                    ...section.items.map(
                      ([label, value]) =>
                        `${label}: ${value}`
                    )
                  ].join('\n');

                  const copied =
                    await copyAdvertisementText(
                      sectionText
                    );

                  setHelperCopyStatus(
                    copied
                      ? `${section.title} 복사 완료`
                      : '복사 실패'
                  );
                }}
              >
                단계 복사
              </button>
            </div>

            {section.items.map(
              ([label, value]) => (
                <div
                  key={`${section.title}-${label}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 0',
                    borderTop: '1px solid #f0f0f0'
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <strong
                      style={{
                        display: 'block',
                        fontSize: '13px'
                      }}
                    >
                      {label}
                    </strong>

                    <span
                      style={{
                        display: 'block',
                        marginTop: '3px',
                        fontSize: '14px',
                        wordBreak: 'break-word'
                      }}
                    >
                      {String(value || '확인 필요')}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="small-btn"
                    onClick={async () => {
                      const copied =
                        await copyAdvertisementText(
                          String(value || '확인 필요')
                        );

                      setHelperCopyStatus(
                        copied
                          ? `${label} 복사 완료`
                          : '복사 실패'
                      );
                    }}
                  >
                    복사
                  </button>
                </div>
              )
            )}
          </div>
        ))}

        {helperCopyStatus && (
          <p className="status-text">
            {helperCopyStatus}
          </p>
        )}
      </div>
    );
  })()}
</div>
        <div
      style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #e5e7eb'
      }}
    >
      <button
        type="button"
        className="primary-btn"
        onClick={() => {
          setBlogOpen((prev) => !prev);
          setBlogCopyStatus('');
        }}
      >
        {blogOpen
          ? '네이버 블로그 광고 닫기'
          : '네이버 블로그용 만들기'}
      </button>

      {blogOpen && (() => {
        const blogAd = buildNaverBlogAd(property);

        return (
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              border: '1px solid #b9dfc5',
              borderRadius: '16px',
              background: '#f5fff8'
            }}
          >
            <strong>네이버 블로그 제목</strong>

            <textarea
              readOnly
              value={blogAd.title}
              rows={2}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '8px',
                padding: '12px',
                borderRadius: '10px'
              }}
            />

            <button
              type="button"
              className="small-btn"
              onClick={async () => {
                const copied =
                  await copyAdvertisementText(blogAd.title);

                setBlogCopyStatus(
                  copied
                    ? '블로그 제목 복사 완료'
                    : '복사 실패'
                );
              }}
            >
              제목 복사
            </button>

            <strong
              style={{
                display: 'block',
                marginTop: '18px'
              }}
            >
              네이버 블로그 본문
            </strong>

            <textarea
              readOnly
              value={blogAd.body}
              rows={30}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '8px',
                padding: '12px',
                borderRadius: '10px',
                lineHeight: '1.6'
              }}
            />

            <button
              type="button"
              className="small-btn"
              onClick={async () => {
                const copied =
                  await copyAdvertisementText(blogAd.body);

                setBlogCopyStatus(
                  copied
                    ? '블로그 본문 복사 완료'
                    : '복사 실패'
                );
              }}
            >
              본문 복사
            </button>

            <strong
              style={{
                display: 'block',
                marginTop: '18px'
              }}
            >
              네이버 블로그 태그
            </strong>

            <textarea
              readOnly
              value={blogAd.tags}
              rows={4}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                marginTop: '8px',
                padding: '12px',
                borderRadius: '10px'
              }}
            />

            <div
              style={{
                display: 'flex',
                gap: '8px',
                flexWrap: 'wrap',
                marginTop: '10px'
              }}
            >
              <button
                type="button"
                className="small-btn"
                onClick={async () => {
                  const copied =
                    await copyAdvertisementText(blogAd.tags);

                  setBlogCopyStatus(
                    copied
                      ? '블로그 태그 복사 완료'
                      : '복사 실패'
                  );
                }}
              >
                태그 복사
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={async () => {
                  const copied =
                    await copyAdvertisementText(
                      `${blogAd.title}\n\n${blogAd.body}\n\n${blogAd.tags}`
                    );

                  setBlogCopyStatus(
                    copied
                      ? '블로그 전체 원고 복사 완료'
                      : '복사 실패'
                  );
                }}
              >
                전체 복사
              </button>

              <button
                type="button"
                className="small-btn"
                onClick={() => {
                  window.open(
                    'https://blog.naver.com/atm750',
                    '_blank',
                    'noopener,noreferrer'
                  );
                }}
              >
                네이버 블로그 열기
              </button>
            </div>

            {blogCopyStatus && (
              <p className="status-text">
                {blogCopyStatus}
              </p>
            )}
          </div>
        );
      })()}
    </div>
  </div>
)}
    </section>
  );
}

function InfoLine({ label, value, multiline = false }) {
  const text = String(value || '').trim();
  return (
    <div className={`admin-info-line ${multiline ? 'multiline' : ''}`}>
      <span>{label}</span>
      <strong>{text || '미입력'}</strong>
    </div>
  );
}

function PhotoUploader({
  photos,
  onUpload,
  onRemove,
  onMove,
  onReorder,
  showEnhanceControls = true,
  enhanceMode = 'batch',
  onChangeEnhanceMode = () => {},
  enhanceLevel = 'bright',
  photoEnhanceByUrl = {},
  onChangePhotoEnhance = () => {},
  watermarkEnabled = true,
  onChangeEnhanceLevel = () => {},
  onToggleWatermark = () => {},
}) {
  const [dragging, setDragging] = useState(false);
const [dragIndex, setDragIndex] = useState(null);
  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    onUpload(e.dataTransfer.files);
  }

  return (
    <section className="photo-uploader field">
      {showEnhanceControls && (
      <div className="photo-enhance-panel">
        <div className="option-group-head">
          <strong>사진 보정 방식</strong>
        </div>
        <div className="photo-enhance-buttons photo-mode-buttons">
          <button
            type="button"
            className={enhanceMode === 'batch' ? 'selected' : ''}
            onClick={() => onChangeEnhanceMode('batch')}
          >
            전체 일괄보정
          </button>
          <button
            type="button"
            className={enhanceMode === 'individual' ? 'selected' : ''}
            onClick={() => onChangeEnhanceMode('individual')}
          >
            사진별 개별보정
          </button>
        </div>
        <div className="option-group-head">
          <strong>사진 보정 강도</strong>
        </div>
        <div className="photo-enhance-buttons">
          {PHOTO_ENHANCE_LEVELS.map((level) => (
            <button
              key={level.value}
              type="button"
              className={enhanceLevel === level.value ? 'selected' : ''}
              onClick={() => onChangeEnhanceLevel(level.value)}
            >
              {level.label}
            </button>
          ))}
        </div>
        <div className="photo-enhance-help">
          {PHOTO_ENHANCE_LEVELS.map((level) => (
            <span key={level.value}>
              <strong>{level.label.replace('보정 없음', '보정 없음').replace('1단 자연보정', '1단').replace('2단 밝은보정', '2단').replace('3단 강한보정', '3단')}:</strong> {level.description}
            </span>
          ))}
        </div>
      </div>
      )}
      <div
        className={`upload-dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <strong>사진을 여기에 드래그하거나 아래 버튼으로 선택하세요.</strong>
        <p className="muted">여러 장을 한 번에 올릴 수 있습니다. 첫 번째 사진이 대표사진입니다.</p>
        <div className="photo-edit-options">
  <label>
    <input
      type="checkbox"
      checked={watermarkEnabled}
      onChange={(e) => onToggleWatermark(e.target.checked)}
    />
    워터마크 삽입
  </label>
</div>
        <input type="file" accept="image/*" multiple onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
      </div>

      {photos.length > 0 && (
        <div className="upload-preview-grid">
          {photos.map((src, index) => (
<div
  key={`${src}-${index}`}
  className="upload-preview-item"
  draggable={true}
  onDragStart={(e) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  }}
  onDragOver={(e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }}
  onDrop={(e) => {
    e.preventDefault();

    const fromText = e.dataTransfer.getData('text/plain');
    const fromIndex = dragIndex !== null ? dragIndex : Number(fromText);

    if (Number.isNaN(fromIndex)) return;
    if (fromIndex === index) return;

    onReorder(fromIndex, index);
    setDragIndex(null);
  }}
  onDragEnd={() => setDragIndex(null)}
>
             <img src={src} alt={`업로드 사진 ${index + 1}`} draggable={false} />
             <small>{index === 0 ? '대표사진' : `${index + 1}번 사진`}</small>
              {enhanceMode === 'individual' && (
                <div className="photo-item-enhance">
                  {PHOTO_ENHANCE_LEVELS.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      className={(photoEnhanceByUrl[src] || enhanceLevel) === level.value ? 'selected' : ''}
                      onClick={() => onChangePhotoEnhance(src, level.value)}
                    >
                      {level.value === 'none' ? '보정 없음' : level.label.replace(' 자연보정', '').replace(' 밝은보정', '').replace(' 강한보정', '')}
                    </button>
                  ))}
                </div>
              )}
              <div>
                <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0}>앞</button>
                <button type="button" onClick={() => onMove(index, 1)} disabled={index === photos.length - 1}>뒤</button>
                <button type="button" onClick={() => onRemove(index)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ButtonChoiceGroup({ label, value, options, onChange }) {
  return (
    <section className="quick-choice-group">
      <div className="option-group-head">
        <strong>{label}</strong>
      </div>
      <div className="option-button-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={value === option ? 'selected' : ''}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}

function NumberField({ label, value, onChange, placeholder = '', suffix = '만원', disabled = false }) {
  return (
    <label className={`field quick-number-field ${disabled ? 'disabled' : ''}`}>
      <span>{label}</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        disabled={disabled}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
      />
      {value && !disabled && <em>{value}{suffix}</em>}
    </label>
  );
}

function Field({ label, value, onChange, placeholder = '', inputMode }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input inputMode={inputMode} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function SelectableOptionGroup({ label, value, options, onChange, placeholder = '직접 추가 입력' }) {
  const [customValue, setCustomValue] = useState('');
  const selected = linesToArray(value);

  function setSelected(next) {
    onChange([...new Set(next.map((item) => String(item).trim()).filter(Boolean))].join('\n'));
  }

  function toggleOption(option) {
    if (selected.includes(option)) {
      setSelected(selected.filter((item) => item !== option));
    } else {
      setSelected([...selected, option]);
    }
  }

  function addCustomOption() {
    const item = customValue.trim();
    if (!item) return;
    setSelected([...selected, item]);
    setCustomValue('');
  }

  return (
    <section className="selectable-option-group">
      <div className="option-group-head">
        <strong>{label}</strong>
        <span>{selected.length}개 선택</span>
      </div>
      <div className="option-button-grid">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            className={selected.includes(option) ? 'selected' : ''}
            onClick={() => toggleOption(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <div className="option-custom-row">
        <input
          value={customValue}
          onChange={(e) => setCustomValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addCustomOption();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" onClick={addCustomOption}>추가</button>
      </div>
      {selected.length > 0 && (
        <div className="selected-option-list">
          {selected.map((item) => (
            <button key={item} type="button" onClick={() => toggleOption(item)}>
              {item} ×
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function FloatingButtons() {
  return (
    <div className="floating-buttons consumer-only">
      <a href={`tel:${OFFICE.phone}`}>전화</a>
      <a href={`sms:${OFFICE.phone}`}>문자</a>
    </div>
  );
}

function Footer() {
  return (
    <footer id="request" className="site-footer">
      <div>
        <h2>매물 접수와 상담 문의</h2>
        <p>원룸·투룸 임대, 다가구·원룸건물 매매, 수익형 부동산 투자 상담을 도와드립니다.</p>
      </div>
      <div className="footer-info">
        <p>{OFFICE.name}</p>
        <p>{OFFICE.address}</p>
        <p>대표공인중개사 {OFFICE.broker} · 등록번호 {OFFICE.regNo}</p>
        <p>{OFFICE.phone} / {OFFICE.tel}</p>
      </div>
    </footer>
  );
}

createRoot(document.getElementById('root')).render(<App />);
