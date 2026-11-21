import { createClient } from '@supabase/supabase-js';
import { getSeoLanding, SEO_LANDING_PAGES, selectSeoLandingProperties } from '../src/seoLandingConfig.js';

const ORIGIN = 'https://www.khanhouse.co.kr';
const BLOG = 'https://blog.naver.com/atm750';
const OFFICE = {
  name: '칸공인중개사사무소',
  address: '경상북도 구미시 인의동 991-4 4층',
  phone: '054-474-0367',
  mobile: '010-5323-3883',
  broker: '정점식',
  registration: '제47190-2023-00014'
};

const SELECT = 'id,listing_number,title,category,property_type,trade_type,address,deposit,rent,maintenance_fee,sale_price,area,floor_info,parking,move_in,summary,photos,status,availability_status,ad_visibility,review_state,updated_at';
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/gu, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

function jsonLd(value) {
  return JSON.stringify(value).replace(/</gu, '\\u003c');
}

function text(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function money(value) {
  const raw = text(value);
  if (!raw) return '문의';
  if (/억|만원|원/u.test(raw)) return raw;
  const number = Number(raw.replaceAll(',', ''));
  return Number.isFinite(number) ? `${number.toLocaleString('ko-KR')}만원` : raw;
}

function maintenanceLabel(value) {
  const raw = text(value);
  if (!raw) return '관리비 확인 필요';
  if (/^관리비/u.test(raw)) return raw;
  return `관리비 ${money(raw)}`;
}

function linkFor(property) {
  return `${ORIGIN}/listing/${encodeURIComponent(String(property.id))}`;
}

function photos(property) {
  let source = property.photos;
  if (typeof source === 'string') {
    try { source = JSON.parse(source); } catch { source = []; }
  }
  if (!Array.isArray(source)) return [];
  return source
    .map((value) => typeof value === 'string' ? value : '')
    .filter((value) => /^https:\/\//iu.test(value))
    .slice(0, 3);
}

function navigation(active) {
  return `<nav aria-label="매물 종류별 검색" class="nav"><a href="/">홈페이지</a>${SEO_LANDING_PAGES.map((page) =>
    `<a href="/${page.slug}"${page.slug === active ? ' aria-current="page"' : ''}>${escapeHtml(page.heading)}</a>`
  ).join('')}<a href="${BLOG}" target="_blank" rel="noopener noreferrer">네이버 블로그</a></nav>`;
}

function renderCard(property, sale) {
  const href = linkFor(property);
  const image = photos(property)[0];
  const originalHeadline = text(property.title) || [property.address, property.category].map(text).filter(Boolean).join(' ');
  const district = text(property.address).match(/(?:^|[\s(])([가-힣0-9]+(?:동|읍|면))(?=[\s),]|$)/u)?.[1] || '';
  const prefix = /구미/u.test(originalHeadline) ? '' : [
    '구미',
    district && !originalHeadline.includes(district) ? district : ''
  ].filter(Boolean).join(' ');
  const headline = [prefix, originalHeadline].filter(Boolean).join(' ');
  const price = sale
    ? `매매가 ${money(property.sale_price || property.deposit)}`
    : `보증금 ${money(property.deposit)} · 월세 ${money(property.rent)} · ${maintenanceLabel(property.maintenance_fee)}`;
  return `<article class="property">
    <a href="${escapeHtml(href)}" class="image">${image
      ? `<img src="${escapeHtml(image)}" loading="lazy" alt="${escapeHtml(headline || '매물 사진')}" />`
      : '<span>상세 사진 확인</span>'}</a>
    <div class="info">
      <p class="eyebrow">매물번호 ${escapeHtml(property.listing_number || '확인 필요')}</p>
      <h3><a href="${escapeHtml(href)}">${escapeHtml(headline || '공개 매물 정보')}</a></h3>
      <p class="price">${escapeHtml(price)}</p>
      <p>${escapeHtml(property.address || '주소 확인 필요')}</p>
      <p class="muted">${escapeHtml([property.area && `면적 ${text(property.area)}`, property.floor_info && `층수 ${text(property.floor_info)}`, property.move_in && `입주 ${text(property.move_in)}`].filter(Boolean).join(' · '))}</p>
      <a class="details" href="${escapeHtml(href)}">사진·상세 정보 확인</a>
    </div>
  </article>`;
}

export function renderPage(page, listings) {
  const canonical = `${ORIGIN}/${page.slug}`;
  const listItems = listings.map((item, index) => ({
    '@type': 'ListItem', position: index + 1, url: linkFor(item),
    name: text(item.title) || `매물번호 ${item.listing_number}`
  }));
  const schemas = [
    {
      '@context': 'https://schema.org', '@type': 'RealEstateAgent',
      '@id': `${ORIGIN}/#business`,
      name: OFFICE.name,
      url: ORIGIN,
      telephone: OFFICE.phone,
      address: {
        '@type': 'PostalAddress', streetAddress: OFFICE.address,
        addressLocality: '구미시', addressRegion: '경상북도', addressCountry: 'KR'
      },
      areaServed: { '@type': 'City', name: '구미시' },
      sameAs: [BLOG]
    },
    {
      '@context': 'https://schema.org', '@type': 'CollectionPage',
      '@id': `${canonical}#page`,
      url: canonical, name: page.heading, description: page.description,
      inLanguage: 'ko-KR',
      about: { '@id': `${ORIGIN}/#business` },
      mainEntity: {
        '@type': 'ItemList', numberOfItems: listings.length, itemListElement: listItems
      }
    },
    {
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '홈', item: `${ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: page.heading, item: canonical }
      ]
    }
  ];
  const sale = page.mode === 'building-sale';
  const cards = listings.length
    ? listings.map((item) => renderCard(item, sale)).join('\n')
    : '<p class="empty">현재 홈페이지에 공개된 조건 일치 매물이 없습니다. 등록 상태는 수시로 바뀔 수 있으므로 전화로 확인해 주세요.</p>';
  const updated = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric'
  }).format(new Date());
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(page.title)}</title>
<meta name="description" content="${escapeHtml(page.description)}" />
<meta name="robots" content="index,follow,max-image-preview:large" />
<link rel="canonical" href="${escapeHtml(canonical)}" />
<meta property="og:type" content="website" />
<meta property="og:locale" content="ko_KR" />
<meta property="og:site_name" content="칸공인중개사" />
<meta property="og:title" content="${escapeHtml(page.title)}" />
<meta property="og:description" content="${escapeHtml(page.description)}" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
${schemas.map((schema) => `<script type="application/ld+json">${jsonLd(schema)}</script>`).join('\n')}
<style>
:root{color-scheme:light;font-family:system-ui,-apple-system,"Noto Sans KR","Malgun Gothic",sans-serif;color:#172737;background:#f8fafc}
*{box-sizing:border-box}body{margin:0;line-height:1.65}a{color:#115e89}a:hover{text-decoration:underline}
.container{max-width:1120px;padding:0 22px;margin:auto}.top{background:#082c47;color:white}.top .container{padding-top:17px;padding-bottom:17px;display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap}
.top a{color:white}.brand{font-weight:800;font-size:1.2rem;text-decoration:none}.nav{display:flex;flex-wrap:wrap;gap:9px;margin:18px 0}.nav a{font-size:.88rem;text-decoration:none;background:#e7eff5;color:#21415b;padding:6px 10px;border-radius:9px}.nav a[aria-current]{background:#0f506f;color:white}
.hero{background:linear-gradient(120deg,#103e5a,#17688a);color:white;padding:48px 0}.hero h1{font-size:clamp(1.75rem,3.4vw,2.6rem);line-height:1.35;margin:0 0 14px}.hero p{max-width:880px}.eyebrow{font-size:.84rem;color:#596e80}.hero .eyebrow{color:#c8eafa}.action{display:inline-block;background:#fff;color:#135475;font-weight:700;border-radius:9px;padding:10px 15px;text-decoration:none;margin:8px 9px 0 0}.muted{font-size:.87rem;color:#667585}
section.block{padding:31px 0}.block h2{font-size:1.4rem;margin:0 0 10px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:19px}.property{overflow:hidden;border:1px solid #dce6eb;border-radius:13px;background:white;box-shadow:0 2px 10px #18354a0d}
.property .image{height:180px;display:grid;place-items:center;background:#eaf1f5;color:#617688}.property img{width:100%;height:180px;object-fit:cover}.property .info{padding:17px}.property h3{margin:5px 0 10px;font-size:1.1rem}.property h3 a{color:#143d57;text-decoration:none}.property p{margin:6px 0}.price{color:#075d8a;font-weight:750}.details{display:inline-block;margin-top:10px;font-weight:700}
.notice,.empty{background:#eef5fa;border-radius:13px;padding:17px}.faq details{background:#fff;border:1px solid #e0e6ea;border-radius:12px;padding:13px 17px;margin:10px 0}.faq summary{cursor:pointer;font-weight:700}
ul{padding-left:23px}.footer{margin-top:35px;border-top:1px solid #dfe8ed;background:#eef3f6;padding:26px 0;font-size:.92rem}
@media(max-width:640px){.container{padding:0 15px}.hero{padding:32px 0}.property .image,.property img{height:160px}}
</style>
</head>
<body>
<header class="top"><div class="container"><a class="brand" href="/">칸공인중개사</a><span>대표공인중개사 ${escapeHtml(OFFICE.broker)} · <a href="tel:${OFFICE.phone}">${OFFICE.phone}</a></span></div></header>
<div class="container">${navigation(page.slug)}</div>
<section class="hero"><div class="container"><p class="eyebrow">경상북도 구미시 · 실등록 공개 매물 안내</p><h1>${escapeHtml(page.heading)}</h1><p>${escapeHtml(page.summary)}</p><a class="action" href="/">홈페이지에서 전체 매물 찾기</a><a class="action" href="${BLOG}" target="_blank" rel="noopener noreferrer">칸공인중개사 네이버 블로그</a></div></section>
<main class="container">
<section class="block"><h2>현재 공개 매물</h2><p class="muted">${escapeHtml(updated)} 기준 페이지 조회 시 공개·활성·승인 상태로 확인된 매물입니다. 가격·공실 여부는 변동될 수 있으며 모든 공과금과 실제 계약조건은 재확인해야 합니다.</p><div class="grid">${cards}</div></section>
<section class="block"><h2>${escapeHtml(page.heading)} 선택 가이드</h2><ul>${page.criteria.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><div class="notice">칸공인중개사는 구미시 인의동에서 원룸·미니투룸·투룸 임대와 다가구·원룸건물 매매 상담을 제공합니다. 현재 공개된 매물과 블로그의 현장 설명을 함께 확인하고, 계약 전에는 공적 장부 및 실제 조건을 확인해 주세요.</div></section>
<section class="block faq"><h2>자주 묻는 질문</h2>${page.faq.map(([q,a]) => `<details><summary>${escapeHtml(q)}</summary><p>${escapeHtml(a)}</p></details>`).join('')}</section>
<section class="block"><h2>다른 지역·매물 종류도 찾아보세요</h2>${navigation(page.slug)}</section>
</main>
<footer class="footer"><div class="container"><strong>${escapeHtml(OFFICE.name)}</strong><p>대표 ${escapeHtml(OFFICE.broker)} · 중개사무소 등록번호 ${escapeHtml(OFFICE.registration)}<br />${escapeHtml(OFFICE.address)} · 전화 ${escapeHtml(OFFICE.phone)} / ${escapeHtml(OFFICE.mobile)}</p><p><a href="/">공식 홈페이지</a> · <a href="${BLOG}" target="_blank" rel="noopener noreferrer">네이버 블로그</a></p></div></footer>
</body></html>`;
}

export default async function handler(req, res) {
  if (!['GET', 'HEAD'].includes(req.method || 'GET')) {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).send('Method Not Allowed');
  }
  const page = getSeoLanding(String(req.query?.slug || ''));
  if (!page) return res.status(404).send('페이지를 찾을 수 없습니다.');
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('매물 데이터를 확인할 수 없습니다.');
  }
  try {
    const service = createClient(url, key, { auth: {
      persistSession: false, autoRefreshToken: false, detectSessionInUrl: false
    } });
    let query = service.from('properties').select(SELECT)
      .eq('status', 'published').eq('availability_status', 'active')
      .eq('ad_visibility', '공개').eq('review_state', 'approved');
    if (page.mode === 'jinpyeong-mini') query = query.ilike('address', '%진평동%');
    if (page.mode === 'one-room') query = query.or('category.ilike.%원룸%,property_type.ilike.%원룸%');
    if (page.mode === 'jinpyeong-mini') query = query.or('category.ilike.%미니투룸%,property_type.ilike.%미니투룸%');
    if (page.mode === 'two-room') query = query.or('category.ilike.%투룸%,property_type.ilike.%투룸%');
    if (page.mode === 'building-sale') query = query.or('category.ilike.%다가구%,category.ilike.%원룸건물%,property_type.ilike.%다가구%,property_type.ilike.%원룸건물%');
    const { data, error } = await query.order('updated_at', { ascending: false }).limit(300);
    if (error) throw error;
    const listings = selectSeoLandingProperties(page, data || []);
    const html = renderPage(page, listings);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Language', 'ko');
    res.setHeader('X-Robots-Tag', 'index, follow');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600');
    return res.status(200).send(req.method === 'HEAD' ? '' : html);
  } catch (error) {
    console.error('SEO landing page generation failed', { page: page.slug, code: error?.code || null });
    res.setHeader('Cache-Control', 'no-store');
    return res.status(503).send('매물 데이터를 확인할 수 없습니다.');
  }
}
