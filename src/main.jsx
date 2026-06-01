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

const emptyForm = {
  title: '',
  category: '원룸 월세',
  trade_type: '월세',
  address: '',
  deposit: '',
  rent: '',
  maintenance_fee: '',
  area: '',
  floor_info: '',
  direction: '',
  parking: '',
  move_in: '',
  approval_date: '',
  room_bath: '',
  structure: '',
  summary: '',
  description: '',
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
    deposit: form.deposit.trim(),
    rent: form.rent.trim(),
    maintenance_fee: form.maintenance_fee.trim(),
    area: form.area.trim(),
    floor_info: form.floor_info.trim(),
    direction: form.direction.trim(),
    parking: form.parking.trim(),
    move_in: form.move_in.trim(),
    approval_date: form.approval_date.trim(),
    room_bath: form.room_bath.trim(),
    structure: form.structure.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    photos: linesToArray(form.photosText),
    map_image: form.map_image.trim(),
    map_link: form.map_link.trim(),
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
      const text = [item.title, item.address, item.summary, item.category, item.deposit, item.rent, item.maintenance_fee]
        .join(' ')
        .toLowerCase();
      return matchCategory && (!q || text.includes(q));
    });
  }, [properties, keyword, category]);

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

        <section className="section-head" id="properties">
          <div>
            <p className="eyebrow">KAN PROPERTY PLATFORM</p>
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
        <a href={`tel:${OFFICE.phone}`}>☎ {OFFICE.phone}</a>
        <span>{OFFICE.name}</span>
      </div>
      <div className="brand-row">
        <a className="brand" href="#top" aria-label="칸공인중개사 홈">
          <div className="logo-mark">KAN</div>
          <div>
            <strong>{OFFICE.name}</strong>
            <span>구미 원룸·투룸·다가구매매 전문</span>
          </div>
        </a>
        <nav>
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
        <p>
          현장에서 확인한 실사진 매물만 정리합니다. 가격, 관리비, 입주조건을 빠르게 보고 바로 상담하세요.
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
      <div className="hero-region-card">
        <strong>구미 전문 생활권</strong>
        <span>인의동</span>
        <span>진평동</span>
        <span>구평동</span>
        <span>옥계동</span>
        <span>석적·중리</span>
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
        <div className="list-price"><b>{property.deposit || '-'}</b> / <b>{property.rent || '-'}</b> <em>{property.maintenance_fee || ''}</em></div>
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

  const infoRows = [
    ['소재지', property.address || '계약 전 확인'],
    ['거래유형', property.trade_type || '계약 전 확인'],
    ['매물종류', property.category || '계약 전 확인'],
    ['보증금', property.deposit || '계약 전 확인'],
    ['월세/매매가', property.rent || '계약 전 확인'],
    ['관리비', property.maintenance_fee || '계약 전 확인'],
    ['면적', property.area || '계약 전 확인'],
    ['층수', property.floor_info || '계약 전 확인'],
    ['방/욕실', property.room_bath || '계약 전 확인'],
    ['방향', property.direction || '계약 전 확인'],
    ['주차', property.parking || '계약 전 확인'],
    ['입주가능일', property.move_in || '계약 전 확인'],
    ['사용승인일', property.approval_date || '계약 전 확인'],
    ['구조', property.structure || '계약 전 확인']
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
            <h2>구미시의 다른 매물</h2>
            <div className="related-grid">
              {related.map((item) => (
                <button key={item.id} className="related-card" onClick={() => onSelect(item)}>
                  <img src={item.photos?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'} alt={item.title} />
                  <span>{shortAddress(item.address)}</span>
                  <strong>{item.title}</strong>
                  <em>{item.deposit || '-'} / {item.rent || '-'}</em>
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
            <span>보증금 {property.deposit || '-'}</span>
            <strong>월세/가격 {property.rent || '-'}</strong>
            {property.maintenance_fee && <em>관리비 {property.maintenance_fee}</em>}
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
            <div className="agent-avatar">KAN</div>
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

  function startEdit(property) {
    setEditingId(property.id);
    setForm(propertyToForm(property));
    setStatus('선택한 매물을 수정 중입니다.');
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
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
                <h4>1. 기본정보</h4>
                <Field label="제목" value={form.title} onChange={(v) => updateField('title', v)} placeholder="예: 진평초등 앞 리모델링 원룸임대" />
                <div className="two-cols">
                  <SelectField label="매물종류" value={form.category} onChange={(v) => updateField('category', v)} options={['원룸 월세', '미니투룸 월세', '투룸 월세', '다가구매매', '원룸건물매매', '상가/사무실']} />
                  <SelectField label="거래형태" value={form.trade_type} onChange={(v) => updateField('trade_type', v)} options={['월세', '전세', '매매', '반전세', '단기임대']} />
                </div>
                <Field label="주소" value={form.address} onChange={(v) => updateField('address', v)} placeholder="경상북도 구미시 진평동 1052-1" />
                <div className="three-cols">
                  <Field label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} placeholder="300만원" />
                  <Field label="월세/매매가" value={form.rent} onChange={(v) => updateField('rent', v)} placeholder="35만원" />
                  <Field label="관리비" value={form.maintenance_fee} onChange={(v) => updateField('maintenance_fee', v)} placeholder="관리비포함" />
                </div>
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
                  <Field label="구조" value={form.structure} onChange={(v) => updateField('structure', v)} placeholder="분리형 원룸" />
                </div>
                <TextArea label="상세설명" value={form.description} onChange={(v) => updateField('description', v)} rows={4} />
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
                  <span>{property.deposit} / {property.rent}</span>
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
