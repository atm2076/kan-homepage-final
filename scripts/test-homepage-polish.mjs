import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { formatListingMaintenance } from '../api/listing-seo.js';

assert.equal(formatListingMaintenance('관리비 10만원 별도'), '관리비 10만원 별도');
assert.equal(formatListingMaintenance('10만원 별도'), '관리비 10만원 별도');
assert.equal(formatListingMaintenance('10'), '관리비 월 10만원');
assert.equal(formatListingMaintenance('관리비 포함'), '관리비 포함');
assert.equal(formatListingMaintenance('관리비 없음'), '관리비 없음');
assert.equal(formatListingMaintenance(''), '');

const main = readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
assert(!main.includes('useState(sampleProperties)'));
assert(main.includes('const rawList = data || [];'));
assert(main.includes('import.meta.env.DEV && canManageAll ? sampleProperties : []'));
assert(main.includes("blog: 'https://blog.naver.com/atm750'"));

// 직원 등록 화면은 기존 한 화면 간단등록으로 유지합니다.
assert(main.includes('const STAFF_REGISTRATION_CLASSIC = true;'));
assert(main.includes("useState(mode === 'staff' ? 'simple' : 'detail')"));
assert(main.includes("staffView === 'register' && !STAFF_REGISTRATION_CLASSIC"));
assert(main.includes("entryMode === 'simple' && (!isStaffMode || (STAFF_REGISTRATION_CLASSIC && staffView === 'register'))"));
assert(main.includes("isStaffMode ? '대표 검수대기로 등록'"));


const workerCode = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');
const events = {};
const store = new Map();
const saved = [];
const cache = {
  addAll: async () => {},
  put: async (key, response) => {
    saved.push(typeof key === 'string' ? key : key.url);
    store.set(typeof key === 'string' ? key : key.url, response);
  }
};
const caches = {
  open: async () => cache,
  match: async (key) => store.get(typeof key === 'string' ? key : key.url),
  keys: async () => ['khan-homepage-pwa-v3'],
  delete: async () => true
};
let failNetwork = false;
const fetch = async (request) => {
  if (failNetwork) throw new Error('offline');
  return new Response('<html>response:'+request.url+'</html>', {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
};
const self = {
  location: { origin: 'https://www.khanhouse.co.kr' },
  addEventListener: (name, fn) => { events[name] = fn; },
  skipWaiting: () => {},
  clients: { claim: () => {} }
};
vm.runInNewContext(workerCode, { self, caches, fetch, URL, Response, Set }, { filename: 'sw.js' });
assert.equal(typeof events.fetch, 'function');

async function visit(path, mode = 'navigate') {
  let promise;
  events.fetch({
    request: {
      method: 'GET',
      mode,
      url: 'https://www.khanhouse.co.kr' + path
    },
    respondWith: (value) => { promise = value; }
  });
  if (!promise) return null;
  const response = await promise;
  await new Promise((resolve) => setImmediate(resolve));
  return response;
}

// 검색 전용 페이지를 먼저 방문해도 홈페이지 '/' 캐시는 덮어쓰면 안 됩니다.
const landing = await visit('/gumi-one-room');
assert.equal(landing.status, 200);
assert.equal(saved.length, 0);
const home = await visit('/');
assert.equal(home.status, 200);
assert.deepEqual(saved, ['/']);
await visit('/listing/123');
assert.deepEqual(saved, ['/']);
await visit('/property-photo.jpg', 'cors');
assert.deepEqual(saved, ['/']);

// 오프라인 상세페이지에 홈페이지를 대신 표시하면 안 됩니다.
failNetwork = true;
const offlineListing = await visit('/listing/123');
assert.equal(offlineListing.status, 503);
const offlineHome = await visit('/');
assert.equal(offlineHome.status, 200);
console.log('Homepage final polish: SW cache, truthful listings, fees and blog link OK');
