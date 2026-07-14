import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const mainSource = readFileSync(resolve(repoRoot, 'src/main.jsx'), 'utf8');

function publicColumnsBlock() {
  const match = mainSource.match(/const PUBLIC_PROPERTY_COLUMNS = \[([\s\S]*?)\]\.join\(','\);/);
  assert.ok(match, 'PUBLIC_PROPERTY_COLUMNS block must exist');
  return match[1];
}

function assertSourceInvariant() {
  const columns = publicColumnsBlock();
  assert.match(columns, /'latitude'/, 'PUBLIC_PROPERTY_COLUMNS must include latitude');
  assert.match(columns, /'longitude'/, 'PUBLIC_PROPERTY_COLUMNS must include longitude');
  assert.match(mainSource, /async function saveProperty/, 'saveProperty must be the final save path');
  assert.match(mainSource, /geocodeAddressWithNaver\(nextAddress\)/, 'saveProperty must geocode before saving');
  assert.match(mainSource, /select\('id,latitude,longitude,status,address'\)/, 'saveProperty must return saved coordinates');
  assert.match(mainSource, /저장 후 좌표 확인 실패/, 'saveProperty must verify saved coordinates');
  assert.match(mainSource, /<form className="property-form" onSubmit=\{saveProperty\}>/, 'admin form must submit through saveProperty');
  assert.match(mainSource, /saveProperty\(null, true\)/, 'duplicate override must still use saveProperty');
}

function normalizeCoordinatePair(latValue, lngValue) {
  if (String(latValue ?? '').trim() === '' || String(lngValue ?? '').trim() === '') return null;
  const lat = Number(latValue);
  const lng = Number(lngValue);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

async function savePropertyCore({ form, editingProperty = null, geocode }) {
  const payload = {
    title: form.title,
    address: form.address,
    status: form.status || 'pending',
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,
    geocode_status: form.geocode_status || '',
    geocoded_at: form.geocoded_at || null,
    coords_source: form.coords_source || ''
  };

  const previousAddress = String(editingProperty?.address || '').trim();
  const nextAddress = String(payload.address || '').trim();
  const payloadCoords = normalizeCoordinatePair(payload.latitude, payload.longitude);
  const addressChanged = Boolean(editingProperty && previousAddress && nextAddress && previousAddress !== nextAddress);
  const needsGeocode = Boolean(nextAddress && (!payloadCoords || addressChanged));

  if (needsGeocode) {
    const coords = await geocode(nextAddress);
    if (coords) {
      payload.latitude = coords.lat;
      payload.longitude = coords.lng;
      payload.geocode_status = 'success';
      payload.geocoded_at = '2026-07-14T00:00:00.000Z';
      payload.coords_source = coords.source;
    } else {
      payload.latitude = null;
      payload.longitude = null;
      payload.geocode_status = 'failed';
      payload.geocoded_at = '2026-07-14T00:00:00.000Z';
      payload.coords_source = 'none';
    }
  }

  const verifiedCoords = normalizeCoordinatePair(payload.latitude, payload.longitude);
  if (payload.status === 'published' && payload.address && !verifiedCoords) {
    throw new Error('저장 후 좌표 확인 실패');
  }

  return payload;
}

function parseBulkTextForTest(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (!value) continue;
    if (key.includes('매물명')) result.title = value;
    if (key.includes('주소')) result.address = value;
    if (key.includes('공개')) result.status = 'published';
  }
  return result;
}

function buildMarkerItems(properties) {
  const publicColumns = publicColumnsBlock();
  assert.match(publicColumns, /'latitude'/);
  assert.match(publicColumns, /'longitude'/);
  return properties
    .filter((property) => property.status === 'published')
    .map((property) => ({
      id: property.id,
      point: normalizeCoordinatePair(property.latitude, property.longitude)
    }))
    .filter((item) => item.point);
}

const geocode = async (address) => {
  if (address.includes('인동22길 7-8')) return { lat: 36.09622, lng: 128.4274759, source: 'test_geocoder' };
  if (address.includes('인동20길 1')) return { lat: 36.097, lng: 128.428, source: 'test_geocoder' };
  return null;
};

assertSourceInvariant();

const normalSaved = await savePropertyCore({
  form: {
    title: '일반등록 테스트',
    address: '경상북도 구미시 인동22길 7-8',
    status: 'published'
  },
  geocode
});
assert.equal(normalSaved.geocode_status, 'success', '일반등록 후 좌표 생성');
assert.ok(normalizeCoordinatePair(normalSaved.latitude, normalSaved.longitude), '일반등록 latitude/longitude 저장');

const bulkForm = {
  ...parseBulkTextForTest('매물명: 일괄입력 테스트\n주소: 경상북도 구미시 인동22길 7-8\n공개: published'),
  status: 'published'
};
const bulkSaved = await savePropertyCore({ form: bulkForm, geocode });
assert.equal(bulkSaved.geocode_status, 'success', '일괄입력 후 좌표 생성');
assert.ok(normalizeCoordinatePair(bulkSaved.latitude, bulkSaved.longitude), '일괄입력 latitude/longitude 저장');

const edited = await savePropertyCore({
  form: {
    title: '주소수정 테스트',
    address: '경상북도 구미시 인동20길 1',
    status: 'published',
    latitude: 36.09622,
    longitude: 128.4274759
  },
  editingProperty: {
    address: '경상북도 구미시 인동22길 7-8'
  },
  geocode
});
assert.equal(edited.geocode_status, 'success', '주소 수정 후 좌표 갱신');
assert.notEqual(edited.latitude, 36.09622, '주소 변경 시 latitude가 갱신되어야 함');
assert.notEqual(edited.longitude, 128.4274759, '주소 변경 시 longitude가 갱신되어야 함');

const markers = buildMarkerItems([
  { id: 'hidden', status: 'pending', latitude: 36, longitude: 128 },
  { id: 'published-with-coords', status: 'published', latitude: normalSaved.latitude, longitude: normalSaved.longitude }
]);
assert.deepEqual(markers.map((item) => item.id), ['published-with-coords'], '공개 매물이 지도 마커 목록에 포함');

console.log('map geocode regression tests passed');
