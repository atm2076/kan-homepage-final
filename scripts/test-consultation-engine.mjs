import assert from 'node:assert/strict';
import {
  assertNoPrivatePropertyFields,
  extractConsultationConditions,
  filterAndRankProperties,
  formatRecommendations,
  parseDesiredDate,
  parseDesiredTime,
  parsePhone,
  parseRecommendationNumber,
  recommendationSnapshot,
  toAiPublicProperty
} from '../src/consultationEngine.js';

const base = { status: 'published', availability_status: 'active', ad_visibility: '공개', review_state: 'approved', property_type: '미니투룸', address: '인의동 669-8', deposit: '300', rent: '30', maintenance_fee: '8', updated_at: '2026-08-08' };
const rows = [
  { ...base, id: 'normal', listing_number: 1, listing_type: 'normal', photos: ['n.jpg'], owner_phone: '010-secret', entrance_password: '1234' },
  { ...base, id: 'quick-photo', listing_number: 2, listing_type: 'quick', photos: ['q.jpg'], private_memo: 'secret' },
  { ...base, id: 'quick-empty', listing_number: 3, listing_type: 'quick', photos: [] },
  { ...base, id: 'missing', listing_number: 4, listing_type: 'normal', photos: ['x.jpg'], availability_status: 'missing' }
];
const conditions = extractConsultationConditions('인의동 보증금 300 이하 월세 30 정도 미투 있어요?');
assert.deepEqual(conditions, { region: '인의동', propertyType: '미니투룸', maxDeposit: 300, maxRent: 30, maxManagementFee: null });
const results = filterAndRankProperties(rows, conditions);
assert.deepEqual(results.map((row) => row.id), ['normal', 'quick-photo', 'quick-empty']);
assert(results.every(assertNoPrivatePropertyFields));
assert(!JSON.stringify(results).includes('010-secret'));
const snapshot = recommendationSnapshot(results);
assert.deepEqual(snapshot[0].photoUrls, ['n.jpg']);
assert.equal(snapshot[1].propertyId, 'quick-photo');
assert.equal(snapshot.find((item) => item.recommendationNumber === 2).propertyId, 'quick-photo');
assert.equal(parseRecommendationNumber('2번 보고 싶어요'), 2);
assert(formatRecommendations(snapshot).includes('사진 준비중'));
assert.equal(formatRecommendations([]), '현재 등록된 매물에서는 조건에 맞는 방이 없습니다. 보증금이나 월세 범위를 넓히거나 인근 지역도 함께 찾아볼까요?');
assert.equal(parsePhone('010-1234-5678'), '01012345678');
assert.equal(parseDesiredDate('오늘 6시', new Date('2026-08-08T03:00:00Z')), '2026-08-08');
assert.equal(parseDesiredTime('오후 6시'), '18:00');
assert.equal(parseDesiredTime('오늘 6시에 볼래요'), '18:00');
assert.deepEqual(Object.keys(toAiPublicProperty(rows[0])).includes('owner_phone'), false);

const parkingResults = filterAndRankProperties([{ ...base, id: 'no-parking', listing_type: 'quick', photos: [], parking: '불가능' }, { ...base, id: 'parking', listing_type: 'quick', photos: [], parking: '가능' }], { ...conditions, parkingRequired: true });
assert.deepEqual(parkingResults.map((item) => item.id), ['parking']);

console.log('consultation engine tests: ok');
