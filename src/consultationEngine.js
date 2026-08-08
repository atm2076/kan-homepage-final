const PRIVATE_KEYS = new Set([
  'owner_phone', 'entrance_password', 'client_info', 'private_memo', 'owner_name',
  'key_location', 'staff_memo', 'internal_tags', 'source_payload', 'source_int_seq'
]);

export const AI_PUBLIC_PROPERTY_FIELDS = [
  'id', 'listing_number', 'listing_type', 'title', 'category', 'property_type', 'trade_type',
  'address', 'deposit', 'rent', 'maintenance_fee', 'area', 'floor_info', 'direction', 'parking',
  'move_in', 'summary', 'description', 'photos', 'availability_status', 'status', 'ad_visibility',
  'review_state', 'updated_at'
];

export function toAiPublicProperty(property = {}) {
  const result = {};
  for (const field of AI_PUBLIC_PROPERTY_FIELDS) {
    if (Object.hasOwn(property, field)) result[field] = property[field];
  }
  return result;
}

export function assertNoPrivatePropertyFields(property = {}) {
  return Object.keys(property).every((key) => !PRIVATE_KEYS.has(key));
}

function numberNear(text, label) {
  const match = text.match(new RegExp(`${label}\\s*(?:은|는|이|가|까지|이하|약|정도)?\\s*(\\d[\\d,]*)`, 'u'));
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

export function extractConsultationConditions(message, previous = {}) {
  const text = String(message || '').trim();
  const region = text.match(/([가-힣]{1,12}(?:동|읍|면))/u)?.[1] || previous.region || null;
  const propertyType = /주인세대/u.test(text) ? '주인세대'
    : /미니?투룸|미투/u.test(text) ? '미니투룸'
      : /투룸/u.test(text) ? '투룸'
        : /원룸/u.test(text) ? '원룸' : previous.propertyType || null;
  return {
    ...previous,
    region,
    propertyType,
    maxDeposit: numberNear(text, '보증금') ?? previous.maxDeposit ?? null,
    maxRent: numberNear(text, '월세') ?? previous.maxRent ?? null,
    maxManagementFee: numberNear(text, '관리비') ?? previous.maxManagementFee ?? null
  };
}

function numeric(value) {
  const parsed = Number(String(value ?? '').replaceAll(',', '').match(/\d+(?:\.\d+)?/u)?.[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function photoCount(property) {
  return Array.isArray(property.photos) ? property.photos.filter(Boolean).length : 0;
}

export function recommendationTier(property) {
  const photos = photoCount(property);
  if (property.listing_type === 'normal' && photos > 0) return 1;
  if (property.listing_type === 'quick' && photos > 0) return 2;
  return 3;
}

export function filterAndRankProperties(properties, conditions, limit = 5) {
  return properties
    .map(toAiPublicProperty)
    .filter((item) => item.status === 'published'
      && item.availability_status === 'active'
      && item.ad_visibility === '공개'
      && item.review_state === 'approved')
    .filter((item) => !conditions.region || String(item.address || '').includes(conditions.region))
    .filter((item) => !conditions.propertyType || String(item.property_type || item.category || '').includes(conditions.propertyType))
    .filter((item) => conditions.maxDeposit == null || (numeric(item.deposit) != null && numeric(item.deposit) <= conditions.maxDeposit))
    .filter((item) => conditions.maxRent == null || (numeric(item.rent) != null && numeric(item.rent) <= conditions.maxRent))
    .filter((item) => conditions.maxManagementFee == null || (numeric(item.maintenance_fee) != null && numeric(item.maintenance_fee) <= conditions.maxManagementFee))
    .filter((item) => !conditions.parkingRequired || (!/불가능/u.test(String(item.parking || '')) && /가능|주차\s*[1-9]/u.test(String(item.parking || ''))))
    .sort((a, b) => recommendationTier(a) - recommendationTier(b)
      || String(b.updated_at || '').localeCompare(String(a.updated_at || '')))
    .slice(0, Math.min(5, Math.max(3, limit)));
}

export function recommendationSnapshot(properties) {
  return properties.map((property, index) => ({
    recommendationNumber: index + 1,
    propertyId: property.id,
    listingNumber: property.listing_number,
    title: property.title,
    address: property.address,
    deposit: property.deposit,
    rent: property.rent,
    maintenanceFee: property.maintenance_fee,
    listingType: property.listing_type,
    photoStatus: photoCount(property) > 0 ? 'available' : 'preparing',
    photoUrls: Array.isArray(property.photos) ? property.photos.filter(Boolean).slice(0, 10) : [],
    detailUrl: `/#/listing/${property.id}`
  }));
}

export function formatRecommendations(snapshot) {
  if (!snapshot.length) {
    return '현재 등록된 매물에서는 조건에 맞는 방이 없습니다. 보증금이나 월세 범위를 넓히거나 인근 지역도 함께 찾아볼까요?';
  }
  return `현재 확인되는 매물입니다.\n${snapshot.map((item) => `${item.recommendationNumber}. ${item.address} · 보증금 ${item.deposit || '-'} / 월세 ${item.rent || '-'}${item.photoStatus === 'preparing' ? ' · 사진 준비중' : ''}\n${item.detailUrl}`).join('\n')}`;
}

export function parseRecommendationNumber(message) {
  const match = String(message || '').match(/(?:^|\s)([1-5])\s*번/u);
  return match ? Number(match[1]) : null;
}

export function parsePhone(message) {
  return String(message || '').match(/01[016789][-.\s]?\d{3,4}[-.\s]?\d{4}/u)?.[0]?.replace(/[-.\s]/gu, '') || null;
}

export function parseDesiredDate(message, now = new Date()) {
  const text = String(message || '');
  const date = new Date(now);
  if (/내일/u.test(text)) date.setDate(date.getDate() + 1);
  else if (!/오늘/u.test(text)) {
    const match = text.match(/(?:(\d{4})[.-])?(\d{1,2})[./월]\s*(\d{1,2})일?/u);
    if (!match) return null;
    date.setFullYear(match[1] ? Number(match[1]) : date.getFullYear(), Number(match[2]) - 1, Number(match[3]));
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDesiredTime(message) {
  const match = String(message || '').match(/(?:(오전|오후)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/u);
  if (!match) return null;
  let hour = Number(match[2]);
  if (match[1] === '오후' && hour < 12) hour += 12;
  if (match[1] === '오전' && hour === 12) hour = 0;
  if (!match[1] && hour >= 1 && hour <= 7) hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(Number(match[3] || 0)).padStart(2, '0')}`;
}
