import { createClient } from '@supabase/supabase-js';

const SITE_ORIGIN = 'https://www.khanhouse.co.kr';
const OFFICE_NAME = '칸공인중개사';

function text(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

function escapeHtml(value) {
  return text(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toList(...sources) {
  const result = [];

  const append = (value) => {
    if (value === null || value === undefined || value === '') return;

    if (Array.isArray(value)) {
      value.forEach(append);
      return;
    }

    if (typeof value === 'object') {
      Object.values(value).forEach(append);
      return;
    }

    const raw = String(value).trim();
    if (!raw) return;

    if (
      (raw.startsWith('[') && raw.endsWith(']')) ||
      (raw.startsWith('{') && raw.endsWith('}'))
    ) {
      try {
        append(JSON.parse(raw));
        return;
      } catch {
        // 일반 문자열로 계속 처리
      }
    }

    raw
      .split(/\r?\n|\s*,\s*/u)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => result.push(item));
  };

  sources.forEach(append);
  return [...new Set(result)];
}

function money(value) {
  const raw = text(value);

  if (!raw) return '';
  if (/억|만|원/u.test(raw)) return raw;

  const number = Number(raw.replaceAll(',', ''));

  return Number.isFinite(number)
    ? `${number.toLocaleString()}만원`
    : raw;
}

export function formatListingMaintenance(value) {
  const raw = text(value);
  if (!raw) return '';
  // 입력 값이 이미 '관리비 10만원 별도'이면 중복 접두어를 붙이지 않습니다.
  if (raw.startsWith('관리비')) return raw;
  if (/없음/u.test(raw)) return '관리비 없음';
  if (/확인|미정|협의/u.test(raw)) return '관리비 확인 필요';
  if (/월세\s*포함/u.test(raw)) return '관리비 월세 포함';
  if (/포함/u.test(raw) && !/\d/u.test(raw)) return '관리비 포함';
  if (/원|월|포함|별도/u.test(raw)) return `관리비 ${raw}`;

  const number = Number(raw.replaceAll(',', ''));
  return Number.isFinite(number)
    ? `관리비 월 ${number.toLocaleString()}만원`
    : `관리비 ${raw}`;
}

function absoluteUrl(value) {
  const raw = text(value);

  if (!raw) return '';
  if (/^https?:\/\//iu.test(raw)) return raw;

  return `${SITE_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

export function buildListingSeoTitle(property) {
  const address = text(property.address);
  const supplied = text(property.title);
  const city = /구미시|구미/u.test(address) ? '구미'
    : /칠곡군/u.test(address) ? '칠곡'
    : /김천시/u.test(address) ? '김천'
    : /포항시/u.test(address) ? '포항'
    : /대구/u.test(address) ? '대구'
    : '';
  const district = address.match(
    /(?:^|[\s(])([가-힣0-9]+(?:동|읍|면))(?=[\s),]|$)/u
  )?.[1] || '';
  const base = supplied || [
    text(property.category || property.main_use),
    text(property.trade_type)
  ].filter(Boolean).join(' ') || '부동산 매물';
  const prefix = [
    city && !base.includes(city) ? city : '',
    district && !base.includes(district) ? district : ''
  ].filter(Boolean).join(' ');
  return [prefix, base].filter(Boolean).join(' ');
}

function makeDescription(property, priceText) {
  const summary = text(
    property.summary ||
    property.short_description ||
    property.description
  );

  const parts = [
    summary,
    text(property.address),
    priceText,
    property.area
      ? `면적 ${text(property.area)}`
      : '',
    property.move_in
      ? `입주 ${text(property.move_in)}`
      : ''
  ].filter(Boolean);

  return text(parts.join('. ')).slice(0, 170);
}

function replaceSeo(
  html,
  {
    title,
    description,
    canonical,
    image,
    robots = 'index,follow,max-image-preview:large'
  }
) {
  let result = String(html || '');

  result = result.replace(
    /<title\b[^>]*>[\s\S]*?<\/title>/iu,
    `<title>${escapeHtml(title)}</title>`
  );

  result = result
    .replace(
      /<meta\b[^>]*\bname=["']description["'][^>]*>/giu,
      ''
    )
    .replace(
      /<meta\b[^>]*\bname=["']robots["'][^>]*>/giu,
      ''
    )
    .replace(
      /<link\b[^>]*\brel=["']canonical["'][^>]*>/giu,
      ''
    )
    .replace(
      /<meta\b[^>]*(?:property|name)=["'](?:og:[^"']+|twitter:[^"']+)["'][^>]*>/giu,
      ''
    );

  const tags = [
    `<meta name="description" content="${escapeHtml(description)}" />`,
    `<meta name="robots" content="${escapeHtml(robots)}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:type" content="article" />`,
    `<meta property="og:locale" content="ko_KR" />`,
    `<meta property="og:site_name" content="${OFFICE_NAME}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    image
      ? `<meta property="og:image" content="${escapeHtml(image)}" />`
      : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image
      ? `<meta name="twitter:image" content="${escapeHtml(image)}" />`
      : ''
  ]
    .filter(Boolean)
    .join('\n    ');

  return result.replace(
    /<\/head>/iu,
    `    ${tags}\n  </head>`
  );
}

function injectSnapshot(html, snapshot) {
  const rootPattern =
    /<div\s+id=["']root["']\s*>[\s\S]*?<\/div>/iu;

  if (rootPattern.test(html)) {
    return html.replace(
      rootPattern,
      `<div id="root">${snapshot}</div>`
    );
  }

  return html.replace(
    /<body\b[^>]*>/iu,
    (match) => `${match}${snapshot}`
  );
}

async function getShellHtml() {
  const deploymentOrigin = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : SITE_ORIGIN;

  const response = await fetch(`${deploymentOrigin}/`, {
    headers: {
      'User-Agent': 'KhanListingSEO/1.0'
    },
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(
      `기본 HTML 조회 실패: ${response.status}`
    );
  }

  return response.text();
}

function makeSnapshot(
  property,
  title,
  description,
  image
) {
  const priceText = property.trade_type === '매매'
    ? [property.sale_price ? `매매가 ${money(property.sale_price)}` : ''].filter(Boolean).join(' / ')
    : [
        property.deposit ? `보증금 ${money(property.deposit)}` : '',
        property.rent ? `월세 ${money(property.rent)}` : '',
        property.maintenance_fee ? formatListingMaintenance(property.maintenance_fee) : ''
      ].filter(Boolean).join(' / ');

  const rows = [
    ['매물번호', property.listing_number],
    ['소재지', property.address],
    ['매물종류', property.category],
    ['거래형태', property.trade_type],
    ['가격', priceText],
    ['면적', property.area],
    [
      '층수',
      property.total_floor_info ||
      property.floor_info
    ],
    ['방/욕실', property.room_bath],
    ['방향', property.direction],
    ['주차', property.parking],
    ['입주가능일', property.move_in],
    ['사용승인일', property.approval_date]
  ].filter(([, value]) => text(value));

  const displayTitle = title.replace(
    /\s*\|\s*칸공인중개사\s*$/u,
    ''
  );

  return [
    '<main id="seo-listing-snapshot">',
    `  <h1>${escapeHtml(displayTitle)}</h1>`,
    `  <p>${escapeHtml(description)}</p>`,
    text(property.description)
      ? `  <section aria-label="매물 상세설명"><h2>매물 상세설명</h2><p>${escapeHtml(text(property.description).slice(0, 1400))}</p></section>`
      : '',
    image
      ? `  <img src="${escapeHtml(image)}" alt="${escapeHtml(displayTitle)}" />`
      : '',
    '  <dl>',
    ...rows.flatMap(([label, value]) => [
      `    <dt>${escapeHtml(label)}</dt>`,
      `    <dd>${escapeHtml(value)}</dd>`
    ]),
    '  </dl>',
    '</main>'
  ]
    .filter(Boolean)
    .join('\n');
}

export default async function handler(req, res) {
  const requestMethod = req.method || 'GET';

  if (!['GET', 'HEAD'].includes(requestMethod)) {
    res.setHeader('Allow', 'GET, HEAD');

    return res
      .status(405)
      .send('Method Not Allowed');
  }

  try {
    const id = text(req.query?.id);

    const supabaseUrl =
      process.env.VITE_SUPABASE_URL;

    const supabaseAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY;

    if (!id || id.length > 120) {
      return res.status(404).send('매물을 찾을 수 없습니다.');
    }
    // A temporary service configuration failure must not signal a deleted listing.
    if (!supabaseUrl || !supabaseAnonKey) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('Retry-After', '300');
      return res.status(503).send('매물 정보를 일시적으로 확인할 수 없습니다.');
    }

    const supabase = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    );

    const { data: property, error } =
      await supabase
        .from('properties')
        .select('id,listing_number,listing_type,title,category,trade_type,address,badges,deposit,rent,maintenance_fee,sale_price,area,land_area,building_area,building_name,floor_info,direction,parking,move_in,approval_date,main_use,room_bath,structure,elevator,summary,description,maintenance_includes,location_description,recommended_for,legal_notice,photos,map_image,map_link,convenience,safety,education,is_featured,status,availability_status,review_state,updated_at,created_at')
        .eq('id', id)
        .eq('status', 'published')
        .eq('availability_status', 'active')
        .eq('review_state', 'approved')
        .eq('ad_visibility', '공개')
        .maybeSingle();

    if (error) {
      throw error;
    }

    const shellHtml = await getShellHtml();

    const canonical =
      `${SITE_ORIGIN}/listing/${encodeURIComponent(id)}`;

    if (!property) {
      const notFoundTitle =
        `매물을 찾을 수 없습니다 | ${OFFICE_NAME}`;

      const notFoundDescription =
        '요청한 매물이 없거나 공개가 종료되었습니다.';

      const notFoundSnapshot = [
        '<main id="seo-listing-snapshot">',
        `  <h1>${escapeHtml(notFoundTitle)}</h1>`,
        `  <p>${escapeHtml(notFoundDescription)}</p>`,
        '</main>'
      ].join('\n');

      const notFoundHtml = injectSnapshot(
        replaceSeo(shellHtml, {
          title: notFoundTitle,
          description: notFoundDescription,
          canonical,
          image: '',
          robots: 'noindex,follow'
        }),
        notFoundSnapshot
      );

      res.setHeader(
        'Content-Type',
        'text/html; charset=utf-8'
      );

      res.setHeader(
        'X-Robots-Tag',
        'noindex, follow'
      );

      res.setHeader(
        'Cache-Control',
        'public, max-age=0, s-maxage=60'
      );

      return res
        .status(404)
        .send(
          requestMethod === 'HEAD'
            ? ''
            : notFoundHtml
        );
    }

    const propertyType = text(
      property.category ||
      property.main_use ||
      '부동산 매물'
    );

    const tradeType = text(
      property.trade_type
    );

    const rentalPrice = [
      money(property.deposit),
      money(property.rent)
    ]
      .filter(Boolean)
      .join('/');

    const locationName =
      text(property.address).match(
        /([가-힣0-9]+동|[가-힣0-9]+읍|[가-힣0-9]+면)/u
      )?.[1] || '';

    const generatedTitle = [
      locationName,
      propertyType,
      tradeType,
      rentalPrice
    ]
      .filter(Boolean)
      .join(' ');

    const baseTitle =
      buildListingSeoTitle(property) ||
      generatedTitle ||
      '부동산 매물';

    const title =
      `${baseTitle} | ${OFFICE_NAME}`
        .slice(0, 90);

    const priceText = tradeType === '매매'
      ? (property.sale_price ? `매매가 ${money(property.sale_price)}` : '')
      : [
          property.deposit ? `보증금 ${money(property.deposit)}` : '',
          property.rent ? `월세 ${money(property.rent)}` : ''
        ].filter(Boolean).join(' / ');

    const description =
      makeDescription(property, priceText) ||
      `${baseTitle} 상세정보`;

    const image = absoluteUrl(
      toList(
        property.original_compressed_urls,
        property.photos,
        property.photo_urls,
        property.photoUrls
      )[0]
    );

    const snapshot = makeSnapshot(
      property,
      title,
      description,
      image
    );

    const html = injectSnapshot(
      replaceSeo(shellHtml, {
        title,
        description,
        canonical,
        image
      }),
      snapshot
    );

    res.setHeader(
      'Content-Type',
      'text/html; charset=utf-8'
    );

    res.setHeader(
      'Content-Language',
      'ko'
    );

    res.setHeader(
      'X-Robots-Tag',
      'index, follow'
    );

    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
    );

    return res
      .status(200)
      .send(
        requestMethod === 'HEAD'
          ? ''
          : html
      );
  } catch (error) {
    console.error(
      'Listing SEO generation failed:',
      error
    );

    res.setHeader(
      'Content-Type',
      'text/plain; charset=utf-8'
    );

    return res
      .status(500)
      .send('매물 상세페이지 생성에 실패했습니다.');
  }
}
