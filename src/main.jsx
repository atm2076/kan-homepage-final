import React, { useEffect, useMemo, useState } from 'react';
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
  is_featured: false
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
    educationText: arrayToLines(property.education)
  };
}

function formToPayload(form) {
  return {
    title: form.title.trim(),
    category: form.category.trim(),
    trade_type: form.trade_type.trim(),
    address: form.address.trim(),

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
    is_featured: Boolean(form.is_featured)
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

function App() {
  const [properties, setProperties] = useState(sampleProperties);
  const [selected, setSelected] = useState(sampleProperties[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('전체');
  const [filters, setFilters] = useState(defaultFilters);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const showAdminAccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('admin') === '1';

  async function loadProperties() {
    setError('');
    setLoading(true);

    if (!isSupabaseReady) {
      setProperties(sampleProperties);
      setSelected((prev) => prev || sampleProperties[0]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('properties')
      .select('*')
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setProperties(sampleProperties);
      setSelected(sampleProperties[0]);
    } else {
      const list = data?.length ? data : sampleProperties;
      setProperties(list);
      setSelected((prev) => list.find((item) => item.id === prev?.id) || list[0]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProperties();
  }, []);

  const categories = useMemo(() => {
    const fixed = ['전체', '원룸 월세', '미니투룸 월세', '투룸 월세', '다가구매매', '원룸건물매매', '상가/사무실'];
    const fromData = properties.map((item) => item.category).filter(Boolean);
    return [...new Set([...fixed, ...fromData])];
  }, [properties]);

  const filtered = useMemo(() => {
  const q = keyword.trim().toLowerCase();

  return properties.filter((item) => {
    const matchCategory = category === '전체' || item.category === category;

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

    const matchTrade =
      filters.trade === '전체' ||
      text.includes(filters.trade.toLowerCase());

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

    const matchExtra =
      filters.extra === '전체' ||
      (filters.extra === '관리비 포함' && String(item.maintenance_fee || '').includes('포함')) ||
      (filters.extra === '주차 가능' && text.includes('주차')) ||
      (filters.extra === '엘리베이터' && text.includes('엘리베이터')) ||
      (filters.extra === '복층' && text.includes('복층'));

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
      <Hero keyword={keyword} setKeyword={setKeyword} />
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
      <FloatingButtons />
      {adminOpen && (
        <AdminModal
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

function Hero({ keyword, setKeyword }) {
  return (
    <section className="hero" id="top">
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="hero-badge">구미 원룸 · 투룸 · 다가구 · 수익형 부동산 전문</p>
        <h1>구미 원룸·투룸 월세부터<br />다가구·원룸건물 매매까지</h1>
        <p className="hero-lead">
  실사진 매물만 선별해 가격·관리비·입주조건까지 빠르게 확인하세요.
</p>
        <div className="hero-search">
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="지역·가격·매물명 검색" />
          <a href="#properties">매물검색</a>
        </div>
        <div className="hero-actions">
          <a className="primary-btn" href={`tel:${OFFICE.phone}`}>전화상담 {OFFICE.phone}</a>
          <a className="secondary-btn" href={`sms:${OFFICE.phone}`}>문자문의</a>
        </div>
      </div>
   <div className="hero-map-card">
  <strong>구미·칠곡 매물 지도</strong>
  <p>지역을 누르면 해당 매물만 바로 볼 수 있습니다.</p>

  <div className="mini-map">
    <button type="button" className="map-pin pin-gumi" onClick={() => setKeyword("구미")}>
      구미 전지역
    </button>

    <button type="button" className="map-pin pin-room" onClick={() => setKeyword("원룸 미니투룸 투룸 쓰리룸 월세")}>
      원룸·투룸
    </button>

    <button type="button" className="map-pin pin-invest" onClick={() => setKeyword("수익형 다가구 원룸건물 매매")}>
      수익형
    </button>

    <button type="button" className="map-pin pin-chilgok" onClick={() => setKeyword("칠곡 북삼 석적 중리")}>
      칠곡·북삼·석적
    </button>
  </div>
</div>
    </section>
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
        <option value="전체">월세/전세</option>
        <option value="월세">월세</option>
        <option value="전세">전세</option>
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
  const cover = property.photos?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80';
  return (
    <button className={`property-list-item ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="list-thumb">
        <img src={cover} alt={property.title} />
        {property.is_featured && <span>추천</span>}
      </div>
      <div className="list-info">
        <p>{property.category} · {shortAddress(property.address)}</p>
        <h3>{property.title}</h3>
        {(property.category?.includes('매매') || property.trade_type === '매매') ? (
          <div className="list-price"><b>매매가 {property.sale_price || '-'}</b> <em>총월세 {property.total_monthly_rent || '-'}</em></div>
        ) : (
          <div className="list-price"><b>{property.deposit || '-'}</b> / <b>{property.rent || '-'}</b> <em>{property.maintenance_fee || ''}</em></div>
        )}
        <div className="mini-facts">
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
      ['관리비', property.maintenance_fee || '계약 전 확인'],
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
              {related.map((item) => (
                <button key={item.id} className="related-card" onClick={() => onSelect(item)}>
                  <img src={item.photos?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'} alt={item.title} />
                  <span>{shortAddress(item.address)}</span>
                  <strong>{item.title}</strong>
                  <em>{(item.category?.includes('매매') || item.trade_type === '매매') ? `매매가 ${item.sale_price || '-'}` : `${item.deposit || '-'} / ${item.rent || '-'}`}</em>
                </button>
              ))}
              {!related.length && <p className="muted">등록된 다른 매물이 없습니다.</p>}
            </div>
          </section>

          <section className="legal-box content-card">
            <h2>중개대상물 표시·광고 안내</h2>
            <p>상호명: {OFFICE.name}</p>
            <p>소재지: {OFFICE.address}</p>
            <p>대표공인중개사: {OFFICE.broker}</p>
            <p>등록번호: {OFFICE.regNo}</p>
            <p>연락처: {OFFICE.phone} / {OFFICE.tel}</p>
            <p>※ 세부 조건은 계약 전 현장 및 공부서류 확인 후 최종 안내드립니다.</p>
          </section>
        </article>

        <aside className="sticky-contact-card">
          <div className="badge-line">
            {property.is_featured && <span>추천</span>}
            <span>{property.category}</span>
            <span>{property.trade_type}</span>
          </div>
          <h1>{property.title}</h1>
         <div className="big-price">
  {(property.category?.includes('매매') || property.trade_type === '매매') ? (
    <>
      <span>매매가 {property.sale_price || property.deposit || '-'}</span>
      <strong>총월세 {property.total_monthly_rent || property.rent || '-'}</strong>
      {property.acquisition_price && <em>실인수가 {property.acquisition_price}</em>}
      {property.net_profit && <em>월순수익 {property.net_profit}</em>}
    </>
  ) : (
    <>
      <span>보증금 {property.deposit || '-'}</span>
      <strong>월세 {property.rent || '-'}</strong>
   {property.maintenance_fee && <em>{property.maintenance_fee}</em>}
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

function AdminModal({ isAdmin, setIsAdmin, onClose, properties, reload }) {
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [bulkText, setBulkText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '3883';
  const photoUrls = linesToArray(form.photosText);

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
    setStatus('선택한 매물을 수정 중입니다.');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setBulkText('');
    setStatus('새 매물 등록 상태입니다.');
  }

  async function uploadPhotoFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith('image/'));

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

  async function saveProperty(e) {
    e.preventDefault();
    setStatus('저장 중입니다.');

    if (!form.title.trim()) {
      setStatus('제목은 필수입니다.');
      return;
    }

    if (!isSupabaseReady) {
      setStatus('Supabase 환경변수 연결 전에는 실제 저장이 되지 않습니다.');
      return;
    }

    const payload = formToPayload(form);
    const request = editingId
      ? supabase.from('properties').update(payload).eq('id', editingId)
      : supabase.from('properties').insert(payload);

    const { error } = await request;
    if (error) {
      setStatus(`저장 실패: ${error.message}`);
      return;
    }

    setStatus(editingId ? '수정 완료되었습니다.' : '등록 완료되었습니다.');
    resetForm();
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

        {!isAdmin ? (
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
                <h3>{editingId ? '매물 수정' : '간단 매물 등록'}</h3>
                <button type="button" className="small-btn" onClick={resetForm}>새 등록</button>
              </div>

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

              <section className="admin-section-block priority-block">
                <h4>1. 기본정보</h4>
                <Field label="제목" value={form.title} onChange={(v) => updateField('title', v)} placeholder="예: 진평초등 앞 리모델링 원룸임대" />
                <div className="two-cols">
                  <SelectField label="매물종류" value={form.category} onChange={(v) => updateField('category', v)} options={['원룸 월세', '미니투룸 월세', '투룸 월세', '다가구매매', '원룸건물매매', '상가/사무실']} />
                  <SelectField label="거래형태" value={form.trade_type} onChange={(v) => updateField('trade_type', v)} options={['월세', '전세', '매매', '반전세', '단기임대']} />
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

              <section className="admin-section-block">
                <h4>2. 사진등록</h4>
                <PhotoUploader photos={photoUrls} onUpload={uploadPhotoFiles} onRemove={removePhoto} onMove={movePhoto} />
                <details className="manual-url-box">
                  <summary>사진 주소 직접 확인/수정</summary>
                  <TextArea label="업로드된 사진 URL — 한 줄에 1개씩" value={form.photosText} onChange={(v) => updateField('photosText', v)} rows={4} />
                </details>
              </section>

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
                <TextArea label="옵션/편의 — 한 줄에 1개씩" value={form.convenienceText} onChange={(v) => updateField('convenienceText', v)} />
                <TextArea label="안전시설 — 한 줄에 1개씩" value={form.safetyText} onChange={(v) => updateField('safetyText', v)} />
                <TextArea label="생활권 — 한 줄에 1개씩" value={form.educationText} onChange={(v) => updateField('educationText', v)} />
              </details>

              <label className="check-line">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} />
                추천 매물로 표시
              </label>
              <button className="primary-btn submit-btn" type="submit">{editingId ? '수정 저장' : '매물 등록하기'}</button>
              <p className="status-text">{status}</p>
            </form>

            <div className="admin-list">
              <h3>등록 매물</h3>
              {properties.map((property) => (
                <div className="admin-list-item" key={property.id}>
                  <strong>{property.title}</strong>
                  <span>{(property.category?.includes('매매') || property.trade_type === '매매') ? `매매가 ${property.sale_price || '-'} / 총월세 ${property.total_monthly_rent || '-'}` : `${property.deposit || '-'} / ${property.rent || '-'}`}</span>
                  <div>
                    <button onClick={() => startEdit(property)}>수정</button>
                    <button onClick={() => deleteProperty(property.id)}>삭제</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PhotoUploader({ photos, onUpload, onRemove, onMove }) {
  const [dragging, setDragging] = useState(false);

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
        <input type="file" accept="image/*" multiple onChange={(e) => { onUpload(e.target.files); e.target.value = ''; }} />
      </div>

      {photos.length > 0 && (
        <div className="upload-preview-grid">
          {photos.map((src, index) => (
            <div key={`${src}-${index}`} className="upload-preview-item">
              <img src={src} alt={`업로드 사진 ${index + 1}`} />
              <small>{index + 1}번 사진</small>
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

function Field({ label, value, onChange, placeholder = '' }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
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
