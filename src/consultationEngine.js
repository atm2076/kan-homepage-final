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

function priceRange(text, label, fallbackLabel = false) {
  const labelled = text.match(new RegExp(`(?:최대\\s*)?${label}\\s*(?:은|는|이|가)?\\s*(\\d[\\d,]*)\\s*(만원)?\\s*(이하|까지|정도)?`, 'u'))
    || text.match(new RegExp(`최대\\s*${label}\\s*(\\d[\\d,]*)`, 'u'));
  const bare = fallbackLabel
    ? text.match(/^\s*(?:최대\s*)?(\d[\d,]*)\s*(?:만원)?\s*(이하|까지|정도)?\s*$/u)
    : null;
  const match = labelled || bare;
  if (!match) return null;
  const amount = Number(match[1].replaceAll(',', ''));
  const modifier = match[3] || match[2] || '';
  const isMaximum = /최대/u.test(match[0]) || modifier === '이하' || modifier === '까지';
  const margin = label === '보증금' ? 300 : 10;
  return isMaximum
    ? { min: 0, max: amount }
    : { min: Math.max(0, amount - margin), max: amount + margin };
}

function numberNear(text, label) {
  const match = text.match(new RegExp(`${label}\\s*(?:은|는|이|가|까지|이하|약|정도)?\\s*(\\d[\\d,]*)`, 'u'));
  return match ? Number(match[1].replaceAll(',', '')) : null;
}

// 지역명이 아닌 '하면', '있으면'을 동네로 오인하지 않도록 실제 구미·인근 지명만 허용합니다.
const LOCAL_REGIONS = [
  '선주원남동', '상모사곡동', '형곡1동', '형곡2동', '신평1동', '신평2동',
  '인의동', '진평동', '구평동', '황상동', '사곡동', '원평동', '옥계동',
  '봉곡동', '형곡동', '송정동', '광평동', '임은동', '오태동', '상모동',
  '도량동', '신평동', '비산동', '공단동', '지산동', '신동', '구포동',
  '양호동', '임수동', '시미동', '부곡동', '금전동', '남통동', '선기동',
  '거의동', '수점동', '선산읍', '고아읍', '산동읍', '무을면',
  '옥성면', '도개면', '해평면', '장천면',
  '왜관읍', '석적읍', '북삼읍', '약목면', '기산면', '동명면',
  '인동'
];

function detectLocalRegion(message) {
  const text = String(message || '');
  return LOCAL_REGIONS.find((name) => text.includes(name)) || null;
}

export function extractConsultationConditions(message, previous = {}) {
  const text = String(message || '').trim();
  const region = detectLocalRegion(text)
    || (LOCAL_REGIONS.includes(previous.region) ? previous.region : null);
  const propertyType = /주인세대/u.test(text) ? '주인세대'
    : /미니?투룸|미투/u.test(text) ? '미니투룸'
      : /투룸/u.test(text) ? '투룸'
        : /원룸/u.test(text) ? '원룸' : previous.propertyType || null;
  const depositRange = priceRange(text, '보증금', previous.maxDeposit == null);
  const rentRange = priceRange(text, '월세', previous.maxDeposit != null && previous.maxRent == null);
  return {
    ...previous,
    region,
    propertyType,
    minDeposit: depositRange?.min ?? previous.minDeposit ?? null,
    maxDeposit: depositRange?.max ?? previous.maxDeposit ?? null,
    minRent: rentRange?.min ?? previous.minRent ?? null,
    maxRent: rentRange?.max ?? previous.maxRent ?? null,
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
    .filter((item) => conditions.minDeposit == null || (numeric(item.deposit) != null && numeric(item.deposit) >= conditions.minDeposit))
    .filter((item) => conditions.maxDeposit == null || (numeric(item.deposit) != null && numeric(item.deposit) <= conditions.maxDeposit))
    .filter((item) => conditions.minRent == null || (numeric(item.rent) != null && numeric(item.rent) >= conditions.minRent))
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
    propertyType: property.property_type || property.category,
    area: property.area,
    floorInfo: property.floor_info,
    direction: property.direction,
    parking: property.parking,
    moveIn: property.move_in,
    summary: property.summary,
    description: property.description,
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
