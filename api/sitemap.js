import { createClient } from '@supabase/supabase-js';

const SITE_ORIGIN = 'https://www.khanhouse.co.kr';
const PAGE_SIZE = 1000;

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export default async function handler(req, res) {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase 환경변수가 설정되지 않았습니다.');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });

    const properties = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from('properties')
        .select('id')
        .eq('status', 'published')
        .eq('availability_status', 'active')
        .eq('review_state', 'approved')
        .eq('ad_visibility', '공개')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw error;
      }

      properties.push(...(data || []));

      if (!data || data.length < PAGE_SIZE) {
        break;
      }
    }

    const urls = [
      `${SITE_ORIGIN}/`,
      ...properties
        .filter((property) => property?.id !== null && property?.id !== undefined)
        .map(
          (property) =>
            `${SITE_ORIGIN}/listing/${encodeURIComponent(String(property.id))}`
        )
    ];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls.map(
        (url) => `  <url><loc>${escapeXml(url)}</loc></url>`
      ),
      '</urlset>'
    ].join('\n');

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.setHeader(
      'Cache-Control',
      'public, max-age=0, s-maxage=300, stale-while-revalidate=3600'
    );

    return res.status(200).send(xml);
  } catch (error) {
    console.error('Sitemap generation failed:', error);

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(500).send('사이트맵 생성에 실패했습니다.');
  }
}
