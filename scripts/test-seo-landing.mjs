import assert from 'node:assert/strict';
import { getSeoLanding, SEO_LANDING_PAGES, SEO_LANDING_URLS, selectSeoLandingProperties } from '../src/seoLandingConfig.js';
import { renderPage } from '../api/seo-landing.js';

const allPages = SEO_LANDING_PAGES;
assert.equal(allPages.length, 4);
assert.equal(SEO_LANDING_URLS.length, 4);
assert.equal(getSeoLanding('missing'), null);
const base = {
  id: '00000000-0000-4000-8000-000000000001',
  listing_number: 3903, title: '진평동 원룸',
  category: '원룸', property_type: '원룸', trade_type: '월세',
  address: '경북 구미시 진평동 인동32길',
  deposit: '200', rent: '20', maintenance_fee: '10',
  updated_at: '2026-11-17T00:00:00Z',
  status: 'published', availability_status: 'active',
  ad_visibility: '공개', review_state: 'approved',
  photos: ['https://example.com/room.jpg']
};
const published = [
  base,
  { ...base, id: 'two-room', category: '투룸', property_type: '투룸', title: '인의동 투룸' },
  { ...base, id: 'jinpyeong-mini', category: '미니투룸', property_type: '미니투룸' },
  { ...base, id: 'sale', category: '다가구주택', property_type: '다가구주택', trade_type: '매매', title: '구미 다가구주택' },
  { ...base, id: 'private', ad_visibility: '비공개' },
  { ...base, id: 'expired', availability_status: 'missing' },
  { ...base, id: 'out-of-region', address: '경북 칠곡군 석적읍' },
  { ...base, id: 'malicious', title: '<script>alert(1)</script>', listing_number: 4000 }
];
const one = selectSeoLandingProperties(getSeoLanding('gumi-one-room'), published);
assert.deepEqual(one.map((x) => x.id).sort(), [base.id, 'malicious'].sort());
assert.deepEqual(selectSeoLandingProperties(getSeoLanding('jinpyeong-mini-two-room'), published).map(x=>x.id), ['jinpyeong-mini']);
assert.deepEqual(selectSeoLandingProperties(getSeoLanding('gumi-two-room'), published).map(x=>x.id), ['two-room']);
assert.deepEqual(selectSeoLandingProperties(getSeoLanding('gumi-rental-building-sale'), published).map(x=>x.id), ['sale']);
const html = renderPage(getSeoLanding('gumi-one-room'), one);
assert(html.includes('<h1>구미원룸 월세 매물 찾기</h1>'));
assert(html.includes('href="https://www.khanhouse.co.kr/gumi-one-room"'));
assert(html.includes('https://blog.naver.com/atm750'));
assert(html.includes('application/ld+json'));
assert(html.includes('매물번호 3903'));
assert(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
assert(!html.includes('<script>alert(1)</script>'));
assert(!html.includes('비공개'));
assert(!html.includes('out-of-region'));
const empty = renderPage(getSeoLanding('gumi-one-room'), []);
assert(empty.includes('공개된 조건 일치 매물이 없습니다'));
console.log('SEO pages, public listing filters, and HTML escaping: ok');
