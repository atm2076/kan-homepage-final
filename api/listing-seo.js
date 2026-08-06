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

function maintenance(value) {
  const raw = text(value);

  if (!raw) return '';
  if (/없음|포함|월|원/u.test(raw)) return raw;

  const number = Number(raw.replaceAll(',', ''));

  return Number.isFinite(number)
    ? `월 ${number.toLocaleString()}만원`
    : raw;
}

function absoluteUrl(value) {
  const raw = text(value);

  if (!raw) return '';
  if (/^https?:\/\//iu.test(raw)) return raw;

  return `${SITE_ORIGIN}${raw.startsWith('/') ? '' : '/'}${raw}`;
}

function makeDescription(property, priceText) {
  const summary = text(
    property.summary ||
    property.short_description
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
  const priceText = [
    property.deposit
      ? `보증금 ${money(property.deposit)}`
      : '',
    property.rent
      ? `월세 ${money(property.rent)}`
      : '',
    property.maintenance_fee
      ? `관리비 ${maintenance(property.maintenance_fee)}`
      : ''
  ]
    .filter(Boolean)
    .join(' / ');

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

    if (
      !id ||
      id.length > 120 ||
      !supabaseUrl ||
      !supabaseAnonKey
    ) {
      return res
        .status(404)
        .send('매물을 찾을 수 없습니다.');
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
        .select('*')
        .eq('id', id)
        .eq('status', 'published')
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
      text(property.title) ||
      generatedTitle ||
      '구미 부동산 매물';

    const title =
      `${baseTitle} | ${OFFICE_NAME}`
        .slice(0, 90);

    const priceText = [
      property.deposit
        ? `보증금 ${money(property.deposit)}`
        : '',
      property.rent
        ? `월세 ${money(property.rent)}`
        : ''
    ]
      .filter(Boolean)
      .join(' / ');

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