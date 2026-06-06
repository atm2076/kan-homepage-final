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
  approval: '전체',
  floor: '전체',
  extra: '전체'
};

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
  floor_info: '',
  direction: '',
  parking: '',
  move_in: '',
  approval_date: '',
  room_bath: '',
  structure: '',
  elevator: '',            // 엘리베이터 여부
  remodeling: '',          // 리모델링 여부
  roof_waterproof: '',     // 옥상방수 여부
  building_condition: '',  // 건물 관리상태

  summary: '',
  description: '',
  investment_point: '',    // 투자 포인트
  risk_note: '',           // 참고/주의사항

  photosText: '',
  map_image: '',
  map_link: '',
  convenienceText: '에어컨\n세탁기\n냉장고\nTV\n신발장\n싱크대\n도어락\n인터넷',
  safetyText: '실사진 확인 매물\n직접 확인 후 안내\n공동현관\nCCTV',
  educationText: '편의점 인근\n버스 이용 편리\n공단 출퇴근 동선',
  is_featured: false,
  status: 'pending'
};

const STATUS_LABELS = {
  pending: '검수대기',
  published: '승인',
  hold: '보류'
};

const OPTION_PRESETS = {
  convenienceText: ['에어컨', '세탁기', '냉장고', 'TV', '인덕션', '전자레인지', '침대', '옷장', '신발장', '책상', '의자', '인터넷', '유선방송'],
  safetyText: ['실사진 확인 매물', '직접 확인 후 안내', '공동현관', 'CCTV', '도어락', '방범창', '화재감지기', '엘리베이터'],
  educationText: ['편의점 인근', '버스 이용 편리', '공단 출퇴근 동선', '마트 인근', '식당가 인근', '병원 인근', '학교 인근', '주차 편리', '조용한 주거지']
};

const QUICK_PROPERTY_TYPES = ['원룸', '미니투룸', '투룸', '쓰리룸 이상', '상가/사무실', '다가구매매', '원룸건물매매'];
const QUICK_TRADE_TYPES = ['월세', '전세', '반전세', '매매'];
const MAINTENANCE_TYPES = ['관리비포함', '관리비별도', '관리비없음', '확인필요'];
const MAINTENANCE_ITEMS = ['인터넷', '유선방송', '공용전기', '수도요금', '공용청소비', '관리용역비', '승강기유지비', '주차비'];
const ROOM_BATH_DEFAULTS = {
  원룸: '방 1 / 욕실 1',
  미니투룸: '방 1 / 욕실 1',
  투룸: '방 2 / 욕실 1',
  '쓰리룸 이상': '방 3 / 욕실 1',
  '상가/사무실': '방 0 / 욕실 1'
};

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
    상세설명: 'description',
    설명: 'description',
    투자포인트: 'investment_point',
    참고주의사항: 'risk_note',
    주의사항: 'risk_note',
    참고사항: 'risk_note',
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
        if (['description', 'investment_point', 'risk_note', 'convenienceText', 'safetyText', 'educationText'].includes(field)) {
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
    floor_info: (form.floor_info || '').trim(),
    direction: (form.direction || '').trim(),
    parking: (form.parking || '').trim(),
    move_in: (form.move_in || '').trim(),
    approval_date: (form.approval_date || '').trim(),
    room_bath: (form.room_bath || '').trim(),
    structure: (form.structure || '').trim(),
    elevator: (form.elevator || '').trim(),
    remodeling: (form.remodeling || '').trim(),
    roof_waterproof: (form.roof_waterproof || '').trim(),
    building_condition: (form.building_condition || '').trim(),

    summary: (form.summary || '').trim(),
    description: (form.description || '').trim(),
    investment_point: (form.investment_point || '').trim(),
    risk_note: (form.risk_note || '').trim(),

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

function formatMaintenanceFee(value) {
  const { display } = getMaintenanceInfo(value);
  if (!display) return '관리비 확인 필요';
  if (display.startsWith('관리비')) return display;
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
    if (params.get('admin') === '1') return 'admin';
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
  const [adminOpen, setAdminOpen] = useState(Boolean(queryMode));
  const [portalMode, setPortalMode] = useState(queryMode);
  const [isAdmin, setIsAdmin] = useState(false);
  const canManageAll = portalMode === 'admin' && isAdmin;
const showAdminAccess = true;

  async function loadProperties() {
    setError('');
    setLoading(true);

    if (!isSupabaseReady) {
      const previewList = canManageAll ? sampleProperties : sampleProperties.filter((item) => item.status === 'published');
      setProperties(previewList);
      setSelected((prev) => previewList.find((item) => item.id === prev?.id) || previewList[0]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('properties')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (!canManageAll) {
      query = query.eq('status', 'published');
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      const fallbackList = canManageAll ? sampleProperties : sampleProperties.filter((item) => item.status === 'published');
      setProperties(fallbackList);
      setSelected(fallbackList[0]);
    } else {
      const fallbackList = canManageAll ? sampleProperties : sampleProperties.filter((item) => item.status === 'published');
      const list = data?.length ? data : fallbackList;
      setProperties(list);
      setSelected((prev) => list.find((item) => item.id === prev?.id) || list[0]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProperties();
  }, [canManageAll]);

  const categories = useMemo(() => {
  const fixed = ['전체', '원룸', '미니투룸', '투룸', '다가구 매매', '상가·사무실'];
return fixed;
  }, [properties]);

  const filtered = useMemo(() => {
  const q = keyword.trim().toLowerCase();

  return properties.filter((item) => {
   const normalizeCategory = (value = '') =>
 String(value).replace(/\s+/g, '').replace(/\u00B7/g, '/');

const matchCategory =
  category === '전체' || normalizeCategory(item.category) === normalizeCategory(category);

    const text = [
      item.title,
      item.address,
      item.summary,
      item.description,
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
      item.loan_amount,
      item.interest_rate,
      item.total_deposit,
      item.acquisition_price,
      item.total_monthly_rent,
      item.monthly_interest,
      item.net_profit,
      item.return_rate,
      item.total_units,
      item.rented_units,
      item.vacant_units,
      item.land_area,
      item.building_area,
      item.investment_point,
      item.risk_note,
      ...(item.convenience || []),
      ...(item.safety || []),
      ...(item.education || [])
    ]
      .join(' ')
      .toLowerCase();

    const matchKeyword = !q || text.includes(q);

   const tradeValue = String(item.trade_type || '').trim();

const matchTrade =
  filters.trade === '전체' || tradeValue === filters.trade;

    const matchRoom =
      filters.room === '전체' ||
      text.includes(filters.room.toLowerCase());

    const matchApproval = matchApprovalYear(item.approval_date, filters.approval);

    const floorText = String(item.floor_info || '').toLowerCase();

    const matchFloor =
      filters.floor === '전체' ||
      (filters.floor === '1층' && floorText.includes('1층')) ||
      (filters.floor === '2층이상' && /[2-9]층|[1-9][0-9]층/.test(floorText)) ||
      (filters.floor === '반지하' && text.includes('반지하')) ||
      (filters.floor === '옥탑' && text.includes('옥탑'));

   const compactText = String(text).replace(/\s+/g, '');

const matchExtra =
  filters.extra === '전체' ||
  (filters.extra === '관리비 포함' &&
    (String(item.maintenance_fee || '').includes('포함') || compactText.includes('관리비포함'))) ||
  (filters.extra === '즉시입주' &&
    (String(item.move_in || '').includes('즉시') || compactText.includes('즉시입주'))) ||
  (filters.extra === '리모델링' && compactText.includes('리모델링')) ||
  (filters.extra === '풀옵션' && compactText.includes('풀옵션')) ||
  (filters.extra === '주차 가능' && compactText.includes('주차')) ||
  (filters.extra === '엘리베이터' && compactText.includes('엘리베이터')) ||
  (filters.extra === '복층' && compactText.includes('복층'));

    return (
      matchCategory &&
      matchKeyword &&
      matchTrade &&
      matchRoom &&
      matchApproval &&
      matchFloor &&
      matchExtra
    );
  });
}, [properties, keyword, category, filters]);

  function selectProperty(property) {
    setSelected(property);
    const target = document.getElementById('property-detail');
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div>
      <Header showAdminAccess={showAdminAccess} onAdmin={() => setAdminOpen(true)} />
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
<FilterBar
  filters={filters}
  setFilters={setFilters}
  onReset={() => setFilters(defaultFilters)}
/>
        <section className="section-head" id="properties">
          <div>
            <p className="eyebrow">KhAN PROPERTY PLATFORM</p>
            <h2>구미 원룸·투룸·다가구 매물</h2>
            <p className="muted">사진, 가격, 위치, 입주조건을 확인하고 바로 전화·문자 상담할 수 있습니다.</p>
          </div>
          <div className="toolbar compact-toolbar">
            <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="지역·가격·키워드 검색" />
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              {categories.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </section>

        {loading ? (
          <div className="empty-box">매물을 불러오는 중입니다.</div>
        ) : (
          <section className="platform-layout">
            <div className="list-panel">
              <div className="list-title-row">
                <strong>{category === '전체' ? '전체 매물' : category}</strong>
                <span>{filtered.length}개</span>
              </div>
              <div className="property-list">
                {filtered.map((property) => (
                  <PropertyListItem
                    key={property.id}
                    property={property}
                    active={selected?.id === property.id}
                    onClick={() => selectProperty(property)}
                  />
                ))}
                {!filtered.length && <div className="empty-box">검색 조건에 맞는 매물이 없습니다.</div>}
              </div>
            </div>

            <PropertyDetail
              property={selected || filtered[0]}
              allProperties={properties}
              onSelect={selectProperty}
            />
          </section>
        )}
      </main>
      <Footer />
      <FloatingButtons onAdmin={() => setAdminOpen(true)} />
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

function Header({ showAdminAccess, onAdmin }) {
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
      <a href="#request">매물의뢰</a>
      {showAdminAccess && <button type="button" onClick={onAdmin}>관리자</button>}
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
       <p className="hero-badge">구미 임대 3,000여 개 · 매매/수익형 150여 개 상담 가능</p>
<h1>구미 방 찾을 때,<br />칸에서 먼저 확인하세요</h1>
<p className="hero-lead">
  원룸·미니투룸·투룸 월세부터 다가구 매매·수익형 부동산까지 조건별로 빠르게 안내합니다.
</p>

        <div className="hero-search">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="지역·가격·매물명 검색"
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
              placeholder="지역명, 매물명, 동/읍/면 검색"
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
        지도의 숫자 마커를 누르면 지역이 확대되고, 마지막 단계에서 매물목록이 연결됩니다.
      </p>
    </div>
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
function PropertyListItem({ property, active, onClick }) {
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

  return (
    <button
      className={`property-list-item ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="list-thumb">
        <img src={cover} alt={property.title} />
    <BadgeList property={property} />
      </div>

     <div className="list-info mobile-card-text">
        <p>{property.category} · {shortAddress(property.address)}</p>
        <h3>{property.title}</h3>

        {isSale ? (
          <div className="list-price">
           {(() => {
  const saleDisplay = getSaleDisplay(property);

  return (
    <>
  <>
  <span className="sale-main-price">
    투자금 {formatAmount(saleDisplay.investment)} · 월순수익 {formatAmount(saleDisplay.netProfit)}
  </span>
  <span className="sale-sub-price">
    매매가 {formatAmount(saleDisplay.salePrice)} · 총월세 {formatAmount(saleDisplay.totalRent)}
  </span>
</>
    </>
  );
})()}
          </div>
        ) : (
          <div className="list-price">
            <b>
              보증금 {formatMoney(property.deposit)} / 월세 {formatMoney(property.rent || property.monthly_rent)}
            </b>
           <em>{formatMaintenanceFee(property.maintenance_fee)}</em>
          </div>
        )}

       <div className="mini-facts mobile-card-extra-info">
          <span>{property.area || '면적 확인'}</span>
          <span>{property.room_bath || '방/욕실 확인'}</span>
          <span>{property.floor_info || '층수 확인'}</span>
        </div>
      </div>
    </button>
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
      ['총층', property.floor_info || '계약 전 확인'],
      ['세대현황', property.room_bath || '계약 전 확인'],
      ['총 세대수', property.total_units || '계약 전 확인'],
      ['임대중 세대수', property.rented_units || '계약 전 확인'],
      ['공실 수', property.vacant_units || '계약 전 확인'],
      ['주차', property.parking || '계약 전 확인'],
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
      ['층수', property.floor_info || '계약 전 확인'],
      ['방/욕실', property.room_bath || '계약 전 확인'],
      ['방향', property.direction || '계약 전 확인'],
      ['주차', property.parking || '계약 전 확인'],
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

          <section id="detail-info" className="content-card">
            <div className="content-title-row">
              <h2>매물 정보</h2>
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
            <h2>매물 설명</h2>
            <p className="lead-text">{property.summary || '가격, 위치, 입주조건을 확인 후 안내드리는 매물입니다.'}</p>
            <p>{property.description || '사진과 조건을 확인하시고 전화 또는 문자로 문의주시면 현장 상황과 입주 가능 여부를 바로 안내드리겠습니다.'}</p>
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
            <h2>옵션 정보</h2>
            <IconGrid items={property.convenience} fallback={['에어컨', '세탁기', '냉장고', '인터넷']} />
            <div className="sub-grid-block">
              <div>
                <h3>안전시설</h3>
                <TagList items={property.safety} />
              </div>
              <div>
                <h3>생활권</h3>
                <TagList items={property.education} />
              </div>
            </div>
          </section>

          {hasMap && (
            <section id="detail-location" className="content-card">
              <h2>위치 및 주변시설</h2>
              {property.map_image && <img className="map-image" src={property.map_image} alt="매물 위치 지도" />}
              {property.map_link && <a className="map-link" href={property.map_link} target="_blank" rel="noreferrer">지도 바로가기</a>}
            </section>
          )}

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
            <p>층수: {property.floor_info || '계약 전 확인'}</p>
            <p>방/욕실: {property.room_bath || '계약 전 확인'}</p>
            <p>사용승인일: {property.approval_date || '계약 전 확인'}</p>
            <p>주차: {property.parking || '계약 전 확인'}</p>
            <p>방향: {property.direction || '계약 전 확인'}</p>
            <p>입주가능일: {property.move_in || '계약 전 확인'}</p>
            <p>상호명: {OFFICE.name}</p>
            <p>소재지: {OFFICE.address}</p>
            <p>대표공인중개사: {OFFICE.broker}</p>
            <p>등록번호: {OFFICE.regNo}</p>
            <p>연락처: {OFFICE.phone} / {OFFICE.tel}</p>
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
            <span>🏢 {property.floor_info || '-'}</span>
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

function AdminModal({ mode, setMode, isAdmin, setIsAdmin, onClose, properties, reload }) {
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const [photoAutoEdit, setPhotoAutoEdit] = useState(true);
const [photoWatermark, setPhotoWatermark] = useState(true);
  const [entryMode, setEntryMode] = useState('simple');
const [quickRoomType, setQuickRoomType] = useState('원룸');
  const [quickTradeType, setQuickTradeType] = useState('월세');
  const [maintenanceType, setMaintenanceType] = useState('관리비별도');
  const [maintenanceItemsText, setMaintenanceItemsText] = useState('');
  const [quickFloor, setQuickFloor] = useState('');
  const [quickTotalFloor, setQuickTotalFloor] = useState('');
  const [quickUnit, setQuickUnit] = useState('');
  const [quickShowUnit, setQuickShowUnit] = useState(false);
  const [addressResults, setAddressResults] = useState([]);
const [addressSearching, setAddressSearching] = useState(false);
  const [selectedAddressItem, setSelectedAddressItem] = useState(null);
const [buildingLedgerSearching, setBuildingLedgerSearching] = useState(false);
  const [quickTitleKeyword, setQuickTitleKeyword] = useState('');
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '3883';
  const isStaffMode = mode === 'staff';
  const isAdminMode = mode === 'admin';
  const canEditExisting = isAdminMode && isAdmin;
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

  useEffect(() => {
    if (isStaffMode) {
      setEntryMode('simple');
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

  function chooseMode(nextMode) {
    setMode(nextMode);
    setStatus('');
    const url = new URL(window.location.href);
    url.searchParams.delete('staff');
    url.searchParams.delete('admin');
    url.searchParams.set(nextMode, '1');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function login(e) {
    e.preventDefault();
    if (password === adminPassword) {
      setIsAdmin(true);
      setStatus('관리자 모드로 들어왔습니다.');
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

    setAddressResults(data.results || []);

    if (!data.results || data.results.length === 0) {
      setStatus('검색된 주소가 없습니다. 동/번지를 다시 확인해주세요.');
    }
  } catch (error) {
    setStatus('주소 검색 서버 연결 중 오류가 발생했습니다.');
  } finally {
    setAddressSearching(false);
  }
}
  async function fetchBuildingLedger() {
  if (!selectedAddressItem) {
    setStatus('먼저 주소검색 후 주소를 선택해주세요.');
    return;
  }

  const jibunText = selectedAddressItem.jibunAddr || '';
  const lotMatch = jibunText.match(/(산\s*)?(\d+)(?:-(\d+))?\s*$/);

  const admCd = selectedAddressItem.admCd;
  const lnbrMnnm = selectedAddressItem.lnbrMnnm || lotMatch?.[2];
  const lnbrSlno = selectedAddressItem.lnbrSlno || lotMatch?.[3] || '0';
  const mtYn = selectedAddressItem.mtYn || (lotMatch?.[1] ? '1' : '0');

  if (!admCd || !lnbrMnnm) {
    setStatus('건축물대장 조회에 필요한 법정동/번지 정보가 부족합니다.');
    return;
  }

  try {
    setBuildingLedgerSearching(true);
    setStatus('건축물대장 조회 중입니다...');

    const query = new URLSearchParams({
      admCd,
      lnbrMnnm,
      lnbrSlno,
      mtYn
    });

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

    updateField('approval_date', s.사용승인일 || '');
    updateField('main_use', s.주용도 || '');
    updateField('structure', s.구조 || '');
    updateField('floor_count', s.지상층수 || '');
    updateField('basement_floor_count', s.지하층수 || '');
    updateField('total_floor_info', `지상 ${s.지상층수 || 0}층 / 지하 ${s.지하층수 || 0}층`);
    updateField('total_area', s.연면적 || '');
    updateField('building_area', s.건축면적 || '');
    updateField('land_area', s.대지면적 || '');
    updateField('parking', s.주차대수 ? `${s.주차대수}대` : '');

    setStatus(
      `건축물대장 조회 완료: ${s.주용도 || ''} / ${s.구조 || ''} / 사용승인일 ${s.사용승인일 || ''}`
    );
  } catch (error) {
    setStatus('건축물대장 서버 연결 중 오류가 발생했습니다.');
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

  function startEdit(property) {
    setEditingId(property.id);
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
    setQuickUnit(floorText.match(/(\d+\s*호)/)?.[1]?.replace(/\s+/g, '') || '');
    setQuickFloor(floorText.match(/(\d+)\s*층/)?.[1] || '');
    setQuickTotalFloor(floorText.match(/총\s*(\d+)\s*층/)?.[1] || '');
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
    setStatus('새 매물 등록 상태입니다.');
  }
function autoEditPhoto(file, options = {}) {
  const { autoEdit = true, watermark = true } = options;
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

        // 밝기 / 대비 / 채도 자동 보정
        ctx.filter = autoEdit ? 'brightness(1.08) contrast(1.08) saturate(1.06)' : 'none';
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
      autoEdit: photoAutoEdit,
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
      if (data?.publicUrl) uploadedUrls.push(data.publicUrl);
    }

    setForm((prev) => {
      const before = linesToArray(prev.photosText);
      return { ...prev, photosText: [...before, ...uploadedUrls].join('\n') };
    });

    setStatus(`사진 ${uploadedUrls.length}장 업로드 완료. 매물 등록/수정 저장을 눌러야 홈페이지에 최종 반영됩니다.`);
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
  async function saveProperty(e) {
    e.preventDefault();
    setStatus('저장 중입니다.');

    const maintenanceAmount = normalizeManwon(form.maintenance_fee);
    const maintenanceItems = linesToArray(maintenanceItemsText);
    const maintenanceItemSuffix = maintenanceItems.length ? ` (포함 항목: ${maintenanceItems.join(', ')})` : '';
    const maintenanceText =
      maintenanceType === '관리비포함'
        ? `관리비 포함${maintenanceItemSuffix}`
        : maintenanceType === '관리비별도'
        ? `관리비 ${maintenanceAmount || '확인 필요'} 별도${maintenanceItemSuffix}`
        : maintenanceType === '관리비없음'
        ? '관리비 없음'
        : '관리비 확인 필요';
    const floorInfo = [
      quickShowUnit && quickUnit ? quickUnit : '',
      quickFloor ? `${quickFloor}층` : '',
      quickTotalFloor ? `총 ${quickTotalFloor}층` : ''
    ].filter(Boolean).join(' / ');
    const finalCategory = isStaffMode ? quickRoomType : (form.category || quickRoomType);
    const finalTradeType = isStaffMode ? quickTradeType : (form.trade_type || quickTradeType);
    const finalRoomBath = form.room_bath || ROOM_BATH_DEFAULTS[finalCategory] || '';
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
          floor_info: floorInfo || form.floor_info,
          convenienceText: [...new Set([...linesToArray(form.convenienceText), ...maintenanceItems])].join('\n'),
          move_in: form.move_in || '즉시입주 협의',
          direction: form.direction || '주출입구 기준 확인 필요',
          parking: form.parking || '확인 필요',
          summary: form.summary || '직원이 현장에서 등록한 검수대기 매물입니다.',
          status: 'pending',
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
      status: isStaffMode ? 'pending' : (saveForm.status || 'published')
    };
    const request = editingId
      ? supabase.from('properties').update(payload).eq('id', editingId)
      : supabase.from('properties').insert(payload);

    const { error } = await request;
    if (error) {
      setStatus(`저장 실패: ${error.message}`);
      return;
    }

    setStatus(isStaffMode ? '등록 완료되었습니다. 대표 검수 후 홈페이지에 노출됩니다.' : (editingId ? '수정 완료되었습니다.' : '등록 완료되었습니다.'));
    resetForm();
    await reload();
  }

  async function changePropertyStatus(id, nextStatus) {
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
        ) : isAdminMode && !isAdmin ? (
          <form className="login-box" onSubmit={login}>
            <label>관리자 비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 입력" />
            <button className="primary-btn" type="submit">관리자 들어가기</button>
            <p className="status-text">{status || '기본 비밀번호는 3883입니다. Vercel 환경변수에서 변경할 수 있습니다.'}</p>
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
                  직원이 저장한 매물은 검수대기로 저장되며, 대표 승인 후 손님용 홈페이지와 지도에 노출됩니다.
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
{isAdminMode && (
<div className="entry-mode-tabs">
  <button
    type="button"
    className={entryMode === 'simple' ? 'active' : ''}
    onClick={() => setEntryMode('simple')}
  >
    직원 간단 등록
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
              {entryMode === 'simple' && (
  <section className="admin-section-block priority-block">
    <h4>직원 간단 등록</h4>
    <p className="muted">
      현장에서 사진을 먼저 올리고, 버튼 선택과 숫자 입력만으로 빠르게 검수대기 매물을 저장합니다.
    </p>

    <section className="quick-field-section">
      <h4>1. 사진 등록</h4>
      <PhotoUploader
        photos={photoUrls}
        onUpload={uploadPhotoFiles}
        onRemove={removePhoto}
        onMove={movePhoto}
        onReorder={reorderPhoto}
        autoEditEnabled={photoAutoEdit}
        watermarkEnabled={photoWatermark}
        onToggleAutoEdit={setPhotoAutoEdit}
        onToggleWatermark={setPhotoWatermark}
      />
    </section>

    <section className="quick-field-section">
      <h4>2. 주소검색</h4>
      <div className="address-search-wrap">
        <Field
          label="주소"
          value={form.address}
          onChange={(v) => updateField('address', v)}
          placeholder="예: 구미시 진평동 1052-1"
        />
        <button type="button" className="address-search-button" onClick={handleAddressSearch} disabled={addressSearching}>
          {addressSearching ? '검색중...' : '주소검색'}
        </button>
        <button type="button" className="address-search-button" onClick={fetchBuildingLedger} disabled={buildingLedgerSearching || !selectedAddressItem}>
          {buildingLedgerSearching ? '대장조회중...' : '건축물대장 조회'}
        </button>
        {addressResults.length > 0 && (
          <div className="address-result-list">
            {addressResults.map((item, index) => (
              <button
                key={`${item.bdMgtSn}-${index}`}
                type="button"
                className="address-result-item"
                onClick={() => {
                  updateField('address', item.roadAddr || item.jibunAddr);
                  setSelectedAddressItem(item);
                  setAddressResults([]);
                  setStatus('주소를 선택했습니다. 건축물대장 조회를 진행할 수 있습니다.');
                }}
              >
                <strong>{item.roadAddr}</strong>
                <span>{item.jibunAddr}</span>
                <em>{item.zipNo}</em>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>

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
        <div className="three-cols">
          <NumberField label="매매가" value={form.sale_price} onChange={(v) => updateField('sale_price', v)} placeholder="예: 91000" />
          <NumberField label="융자금" value={form.loan_amount} onChange={(v) => updateField('loan_amount', v)} placeholder="예: 41000" />
          <NumberField label="총보증금" value={form.total_deposit} onChange={(v) => updateField('total_deposit', v)} placeholder="예: 42200" />
          <NumberField label="월세수입" value={form.total_monthly_rent} onChange={(v) => updateField('total_monthly_rent', v)} placeholder="예: 498" />
          <NumberField label="월순수입" value={form.net_profit} onChange={(v) => updateField('net_profit', v)} placeholder="예: 327" />
          <NumberField label="인수금/실투자금" value={form.acquisition_price} onChange={(v) => updateField('acquisition_price', v)} placeholder="예: 7800" />
        </div>
      ) : (
        <div className="three-cols">
          <NumberField label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="예: 300" />
          <NumberField label="월세" value={form.rent} onChange={(v) => updateField('rent', v)} placeholder="예: 40" />
          <NumberField label="관리비 금액" value={form.maintenance_fee} onChange={(v) => updateField('maintenance_fee', v)} placeholder="예: 5" />
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

    <section className="quick-field-section">
      <h4>8. 방 / 욕실</h4>
      <Field label="방 / 욕실" value={form.room_bath} onChange={(v) => updateField('room_bath', v)} placeholder="예: 방 1 / 욕실 1" />
    </section>

    <section className="quick-field-section">
      <h4>제목 키워드와 메모</h4>
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
      <TextArea
        label="간단 메모"
        value={form.summary}
        onChange={(v) => updateField('summary', v)}
        rows={3}
        placeholder="예: 리모델링, 즉시입주, 주차가능, 공단 출퇴근 편리"
      />
    </section>

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
                <Field label="주소" value={form.address} onChange={(v) => updateField('address', v)} placeholder="경상북도 구미시 진평동 1052-1" />
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
</section>
              {isAdminMode && (
              <section className="admin-section-block">
                <h4>2. 사진등록</h4>
              <PhotoUploader
  photos={photoUrls}
  onUpload={uploadPhotoFiles}
  onRemove={removePhoto}
  onMove={movePhoto}
  onReorder={reorderPhoto}
  autoEditEnabled={photoAutoEdit}
  watermarkEnabled={photoWatermark}
  onToggleAutoEdit={setPhotoAutoEdit}
  onToggleWatermark={setPhotoWatermark}
/>
                <details className="manual-url-box">
                  <summary>사진 주소 직접 확인/수정</summary>
                  <TextArea label="업로드된 사진 URL — 한 줄에 1개씩" value={form.photosText} onChange={(v) => updateField('photosText', v)} rows={4} />
                </details>
              </section>
              )}

              {isAdminMode && (
              <details className="admin-details" open={Boolean(editingId)}>
                <summary>3. 상세정보 더 입력하기</summary>
                <div className="two-cols">
                  <Field label="면적" value={form.area} onChange={(v) => updateField('area', v)} placeholder="30㎡" />
                  <Field label="층수" value={form.floor_info} onChange={(v) => updateField('floor_info', v)} placeholder="2층 / 총 4층" />
                </div>
                <div className="three-cols">
                  <Field label="방향" value={form.direction} onChange={(v) => updateField('direction', v)} placeholder="남향" />
                  <Field label="방/욕실" value={form.room_bath} onChange={(v) => updateField('room_bath', v)} placeholder="1/1" />
                  <Field label="주차" value={form.parking} onChange={(v) => updateField('parking', v)} placeholder="8대" />
                </div>
                <div className="three-cols">
  <Field label="입주" value={form.move_in} onChange={(v) => updateField('move_in', v)} placeholder="즉시" />
  <Field label="사용승인일" value={form.approval_date} onChange={(v) => updateField('approval_date', v)} placeholder="2007년 10월 25일" />
  <Field label="구조" value={form.structure} onChange={(v) => updateField('structure', v)} placeholder="철근콘크리트구조" />
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
                    <option value="pending">검수대기</option>
                    <option value="published">승인</option>
                    <option value="hold">보류</option>
                  </select>
                </label>
              )}
              <button className="primary-btn submit-btn" type="submit">{editingId ? '수정 저장' : '매물 등록하기'}</button>
              <p className="status-text">{status}</p>
            </form>

            {canEditExisting && (
            <div className="admin-list">
              <h3>등록 매물</h3>
              {properties.map((property) => (
                <div className="admin-list-item" key={property.id}>
                  <div className="admin-item-title">
                    <strong>{property.title}</strong>
                    <em className={`status-chip status-${property.status || 'pending'}`}>
                      {STATUS_LABELS[property.status || 'pending'] || property.status}
                    </em>
                  </div>
                  <span>{(property.category?.includes('매매') || property.trade_type === '매매') ? `매매가 ${property.sale_price || '-'} / 총월세 ${property.total_monthly_rent || '-'}` : `${property.deposit || '-'} / ${property.rent || '-'}`}</span>
                  <div>
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

function PhotoUploader({
  photos,
  onUpload,
  onRemove,
  onMove,
  onReorder,
  autoEditEnabled = true,
  watermarkEnabled = true,
  onToggleAutoEdit = () => {},
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
      checked={autoEditEnabled}
      onChange={(e) => onToggleAutoEdit(e.target.checked)}
    />
    사진 자동 보정 적용
  </label>

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

function NumberField({ label, value, onChange, placeholder = '', suffix = '만원' }) {
  return (
    <label className="field quick-number-field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        pattern="[0-9]*"
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ''))}
      />
      {value && <em>{value}{suffix}</em>}
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

function FloatingButtons({ onAdmin }) {
  return (
    <div className="floating-buttons consumer-only">
      <a href={`tel:${OFFICE.phone}`}>전화</a>
      <a href={`sms:${OFFICE.phone}`}>문자</a>
      <button type="button" onClick={onAdmin}>관리자</button>
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

