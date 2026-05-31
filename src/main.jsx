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
  convenienceText: '편의점 인근\n버스 이용 편리\n공단 출퇴근 동선',
  safetyText: '실사진 확인 매물\n직접 확인 후 안내\n공동현관',
  educationText: '생활권 학교 확인 가능\n학원가 이동 가능',
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
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556912173-3bb406ef7e77?auto=format&fit=crop&w=1200&q=80'
    ],
    map_image: '',
    map_link: 'https://map.naver.com',
    convenience: ['편의점 인근', '버스 이용 편리', '인동 생활권', '공단 출퇴근 동선'],
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
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&w=1200&q=80'
    ],
    map_image: '',
    map_link: 'https://map.naver.com',
    convenience: ['강동병원 인근', '진평동 먹자상권', '공단 출퇴근 편리'],
    safety: ['직접 확인 매물', '실사진 안내', '입주 전 상태 확인'],
    education: ['생활편의시설 인접', '직장인 추천'],
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

function App() {
  const [properties, setProperties] = useState(sampleProperties);
  const [selected, setSelected] = useState(sampleProperties[0]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState('전체');
  const [adminOpen, setAdminOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
    const list = ['전체', ...new Set(properties.map((item) => item.category).filter(Boolean))];
    return list;
  }, [properties]);

  const filtered = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return properties.filter((item) => {
      const matchCategory = category === '전체' || item.category === category;
      const text = [item.title, item.address, item.summary, item.category, item.deposit, item.rent]
        .join(' ')
        .toLowerCase();
      return matchCategory && (!q || text.includes(q));
    });
  }, [properties, keyword, category]);

  return (
    <div>
      <Header />
      <Hero />
      <main className="page-shell">
        {!isSupabaseReady && <SetupNotice />}
        {error && <ErrorNotice message={error} />}
        <section className="toolbar-section">
          <div>
            <p className="eyebrow">KAN REAL ESTATE</p>
            <h2>구미 원룸·투룸·다가구 매물</h2>
            <p className="muted">사진, 가격, 위치, 입주조건을 한눈에 확인하고 바로 상담할 수 있습니다.</p>
          </div>
          <div className="toolbar">
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="지역·가격·키워드 검색"
            />
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
          <section className="grid-layout">
            <div className="property-grid">
              {filtered.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  active={selected?.id === property.id}
                  onClick={() => setSelected(property)}
                />
              ))}
              {!filtered.length && <div className="empty-box">검색 조건에 맞는 매물이 없습니다.</div>}
            </div>
            <PropertyDetail property={selected || filtered[0]} />
          </section>
        )}
      </main>
      <Footer />
      <FloatingButtons onAdmin={() => setAdminOpen(true)} />
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

function Header() {
  return (
    <header className="site-header">
      <div className="brand">
        <div className="logo-mark">KAN</div>
        <div>
          <strong>{OFFICE.name}</strong>
          <span>구미 원룸·투룸·다가구매매 전문 상담</span>
        </div>
      </div>
      <nav>
        <a href={`tel:${OFFICE.phone}`}>전화상담</a>
        <a href={OFFICE.blog} target="_blank" rel="noreferrer">구미 원룸 안내</a>
      </nav>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero">
      <div className="hero-overlay" />
      <div className="hero-content">
        <p className="hero-badge">구미 인동 · 인의동 · 진평동 · 구평동 · 옥계동</p>
        <h1>구미 원룸 월세부터 수익형 다가구 매매까지<br />현장에서 확인한 매물만 안내합니다.</h1>
        <p>
          가격, 관리비, 위치, 사진, 입주조건을 정확하게 확인하고 상담하세요.
          임대 손님과 투자 매수자를 연결하는 칸공인중개사 홈페이지입니다.
        </p>
        <div className="hero-actions">
          <a className="primary-btn" href={`tel:${OFFICE.phone}`}>010-5323-3883 전화상담</a>
          <a className="secondary-btn" href="#request">매물의뢰하기</a>
        </div>
      </div>
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

function PropertyCard({ property, active, onClick }) {
  const cover = property.photos?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80';
  return (
    <button className={`property-card ${active ? 'active' : ''}`} onClick={onClick}>
      <div className="thumb-wrap">
        <img src={cover} alt={property.title} />
        {property.is_featured && <span className="featured-chip">추천</span>}
      </div>
      <div className="card-body">
        <div className="chips">
          <span>{property.category}</span>
          <span>{property.trade_type}</span>
        </div>
        <h3>{property.title}</h3>
        <p>{property.summary}</p>
        <div className="price-line">
          <strong>{property.deposit || '-'} / {property.rent || '-'}</strong>
          <span>{property.maintenance_fee}</span>
        </div>
      </div>
    </button>
  );
}

function PropertyDetail({ property }) {
  const [open, setOpen] = useState({ convenience: false, safety: false, education: false });

  useEffect(() => {
    setOpen({ convenience: false, safety: false, education: false });
  }, [property?.id]);

  if (!property) {
    return <aside className="detail-panel empty-box">매물을 선택하세요.</aside>;
  }

  const facts = [
    ['소재지', property.address],
    ['임대조건', `${property.deposit || '-'} / ${property.rent || '-'}`],
    ['관리비', property.maintenance_fee],
    ['면적', property.area],
    ['층수', property.floor_info],
    ['방향', property.direction],
    ['방/욕실', property.room_bath],
    ['주차', property.parking],
    ['입주', property.move_in],
    ['사용승인일', property.approval_date],
    ['구조', property.structure]
  ];

  return (
    <aside className="detail-panel">
      <div className="detail-head">
        <div>
          <p className="eyebrow">SELECTED PROPERTY</p>
          <h2>{property.title}</h2>
          <p>{property.description || property.summary}</p>
        </div>
        <a className="call-btn" href={`tel:${OFFICE.phone}`}>전화상담</a>
      </div>

      <div className="fact-grid">
        {facts.map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value || '계약 전 확인'}</strong>
          </div>
        ))}
      </div>

      <section className="photo-section">
        <h3>매물 사진</h3>
        <div className="photo-list">
          {(property.photos?.length ? property.photos : []).map((src, index) => (
            <figure key={`${src}-${index}`}>
              <img src={src} alt={`${property.title} 사진 ${index + 1}`} />
              <figcaption>{index + 1}. {property.category} 실사진 확인</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="map-section">
        <h3>위치 안내</h3>
        {property.map_image ? (
          <img className="map-image" src={property.map_image} alt="매물 지도" />
        ) : (
          <div className="map-placeholder">지도 이미지를 등록하면 이 영역에 표시됩니다.</div>
        )}
        {property.map_link && <a className="map-link" href={property.map_link} target="_blank" rel="noreferrer">지도 바로가기</a>}
      </section>

      <Accordion
        title="편의시설"
        open={open.convenience}
        onClick={() => setOpen((prev) => ({ ...prev, convenience: !prev.convenience }))}
        items={property.convenience}
      />
      <Accordion
        title="안전시설"
        open={open.safety}
        onClick={() => setOpen((prev) => ({ ...prev, safety: !prev.safety }))}
        items={property.safety}
      />
      <Accordion
        title="교육·생활권"
        open={open.education}
        onClick={() => setOpen((prev) => ({ ...prev, education: !prev.education }))}
        items={property.education}
      />

      <section className="legal-box">
        <h3>중개대상물 표시·광고 안내</h3>
        <p>상호명: {OFFICE.name}</p>
        <p>소재지: {OFFICE.address}</p>
        <p>대표공인중개사: {OFFICE.broker}</p>
        <p>등록번호: {OFFICE.regNo}</p>
        <p>연락처: {OFFICE.phone} / {OFFICE.tel}</p>
        <p>※ 세부 조건은 계약 전 현장 및 공부서류 확인 후 최종 안내드립니다.</p>
      </section>
    </aside>
  );
}

function Accordion({ title, open, onClick, items = [] }) {
  return (
    <section className="accordion">
      <button onClick={onClick}>
        <span>{title}</span>
        <strong>{open ? '닫기' : '보기'}</strong>
      </button>
      {open && (
        <ul>
          {(items?.length ? items : ['계약 전 확인 후 안내']).map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </section>
  );
}

function AdminModal({ isAdmin, setIsAdmin, onClose, properties, reload }) {
  const [password, setPassword] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [status, setStatus] = useState('');
  const adminPassword = import.meta.env.VITE_ADMIN_PASSWORD || '3883';

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
          <div className="admin-grid">
            <form className="property-form" onSubmit={saveProperty}>
              <div className="form-topline">
                <h3>{editingId ? '매물 수정' : '새 매물 등록'}</h3>
                <button type="button" className="small-btn" onClick={resetForm}>새 등록</button>
              </div>

              <Field label="제목" value={form.title} onChange={(v) => updateField('title', v)} />
              <div className="two-cols">
                <Field label="카테고리" value={form.category} onChange={(v) => updateField('category', v)} />
                <Field label="거래형태" value={form.trade_type} onChange={(v) => updateField('trade_type', v)} />
              </div>
              <Field label="주소" value={form.address} onChange={(v) => updateField('address', v)} />
              <div className="three-cols">
                <Field label="보증금" value={form.deposit} onChange={(v) => updateField('deposit', v)} />
                <Field label="월세/매매가" value={form.rent} onChange={(v) => updateField('rent', v)} />
                <Field label="관리비" value={form.maintenance_fee} onChange={(v) => updateField('maintenance_fee', v)} />
              </div>
              <div className="two-cols">
                <Field label="면적" value={form.area} onChange={(v) => updateField('area', v)} />
                <Field label="층수" value={form.floor_info} onChange={(v) => updateField('floor_info', v)} />
              </div>
              <div className="three-cols">
                <Field label="방향" value={form.direction} onChange={(v) => updateField('direction', v)} />
                <Field label="방/욕실" value={form.room_bath} onChange={(v) => updateField('room_bath', v)} />
                <Field label="주차" value={form.parking} onChange={(v) => updateField('parking', v)} />
              </div>
              <div className="three-cols">
                <Field label="입주" value={form.move_in} onChange={(v) => updateField('move_in', v)} />
                <Field label="사용승인일" value={form.approval_date} onChange={(v) => updateField('approval_date', v)} />
                <Field label="구조" value={form.structure} onChange={(v) => updateField('structure', v)} />
              </div>
              <TextArea label="요약" value={form.summary} onChange={(v) => updateField('summary', v)} />
              <TextArea label="상세설명" value={form.description} onChange={(v) => updateField('description', v)} />
              <TextArea label="사진 URL — 한 줄에 1개씩" value={form.photosText} onChange={(v) => updateField('photosText', v)} rows={5} />
              <div className="two-cols">
                <Field label="지도 이미지 URL" value={form.map_image} onChange={(v) => updateField('map_image', v)} />
                <Field label="지도 링크" value={form.map_link} onChange={(v) => updateField('map_link', v)} />
              </div>
              <TextArea label="편의시설 — 한 줄에 1개씩" value={form.convenienceText} onChange={(v) => updateField('convenienceText', v)} />
              <TextArea label="안전시설 — 한 줄에 1개씩" value={form.safetyText} onChange={(v) => updateField('safetyText', v)} />
              <TextArea label="교육·생활권 — 한 줄에 1개씩" value={form.educationText} onChange={(v) => updateField('educationText', v)} />
              <label className="check-line">
                <input type="checkbox" checked={form.is_featured} onChange={(e) => updateField('is_featured', e.target.checked)} />
                추천 매물로 표시
              </label>
              <button className="primary-btn" type="submit">{editingId ? '수정 저장' : '매물 등록'}</button>
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

function Field({ label, value, onChange }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea rows={rows} value={value || ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function FloatingButtons({ onAdmin }) {
  return (
    <div className="floating-buttons">
      <a href={`tel:${OFFICE.phone}`}>전화</a>
      <a href={`sms:${OFFICE.phone}`}>문자</a>
      <button onClick={onAdmin}>🔒 관리자</button>
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
