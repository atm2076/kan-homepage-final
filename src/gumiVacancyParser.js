const SENSITIVE_LINE = /(전화|연락처|휴대폰|핸드폰|비밀번호|비번|패스워드|중개업소|부동산|담당자|소장|대표자|owner[_\s-]?phone|entrance[_\s-]?password)/iu;
const PHONE_PATTERN = /(?:\+?82[-\s]?)?0(?:10|11|16|17|18|19|2|[3-6][1-5])[-.\s]?\d{3,4}[-.\s]?\d{4}/gu;

const FIELD_ALIASES = {
  address: ['주소', '소재지', '위치'],
  unit: ['호실', '호수', '방호수', 'room'],
  propertyType: ['매물종류', '방종류', '구조', '타입'],
  deposit: ['보증금'],
  rent: ['월세'],
  managementFee: ['관리비'],
  registeredAt: ['등록일', '원본등록일', '작성일'],
  sourceIntSeq: ['intseq', '게시번호', '매물번호', '원본번호']
};

function normalizeWhitespace(value) {
  return String(value ?? '').replace(/\s+/gu, ' ').trim();
}

export function sanitizeGumiVacancyText(value) {
  return String(value ?? '')
    .split(/\r?\n/u)
    .filter((line) => !SENSITIVE_LINE.test(line))
    .map((line) => line.replace(PHONE_PATTERN, '').trimEnd())
    .join('\n');
}

export function normalizeGumiAddress(value) {
  return normalizeWhitespace(value)
    .replace(/^(대한민국\s*)?(경상북도|경북)\s*/u, '')
    .replace(/^구미시\s*/u, '')
    .replace(/[()\[\],]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeGumiUnit(value) {
  const raw = normalizeWhitespace(value).replace(/[()\[\]]/gu, '');
  if (!raw || /미상|없음|확인|문의|불명|미정/iu.test(raw)) return null;
  const match = raw.match(/(?:^|\s|층)(\d{1,5})\s*호?(?:\s|$)/u) || raw.match(/^(\d{1,5})\s*호?$/u);
  return match ? String(Number(match[1])) : null;
}

export function normalizeGumiPropertyType(value) {
  const text = normalizeWhitespace(value).replace(/\s+/gu, '');
  if (/주인세대/u.test(text)) return '주인세대';
  if (/미니?투룸|미투/u.test(text)) return '미니투룸';
  if (/투룸/u.test(text)) return '투룸';
  if (/원룸/u.test(text)) return '원룸';
  return null;
}

export function parseGumiMoney(value) {
  const text = normalizeWhitespace(value).replace(/,/gu, '');
  if (/없음|무료/iu.test(text)) return 0;
  if (!text || /문의|협의|미정/iu.test(text)) return null;
  const match = text.match(/-?\d+(?:\.\d+)?/u);
  return match ? Number(match[0]) : null;
}

function normalizeDate(value) {
  const text = normalizeWhitespace(value);
  const match = text.match(/(20\d{2})[.\-/년\s]+(\d{1,2})[.\-/월\s]+(\d{1,2})/u);
  if (!match) return null;
  const month = String(Number(match[2])).padStart(2, '0');
  const day = String(Number(match[3])).padStart(2, '0');
  return `${match[1]}-${month}-${day}`;
}

function readLabel(block, aliases) {
  for (const alias of aliases) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const match = block.match(new RegExp(`(?:^|\\n)\\s*(?:[-*#>]\\s*)?${escaped}\\s*[:：=|-]\\s*([^\\n]+)`, 'iu'));
    if (match) return normalizeWhitespace(match[1]);
  }
  return '';
}

function splitRecords(sanitized) {
  const lines = sanitized.split(/\r?\n/u);
  const blocks = [];
  let current = [];
  const startsRecord = (line) => /^\s*(?:#{1,6}\s+|[-=]{3,}\s*$)/u.test(line);
  const hasIdentityMarker = (items) => /(?:intseq|게시번호|매물번호|원본번호)\s*[:：=|-]/iu.test(items.join('\n'));

  for (const line of lines) {
    if (startsRecord(line) && current.some((item) => item.trim()) && hasIdentityMarker(current)) {
      blocks.push(current.join('\n'));
      current = [];
    }
    current.push(line);
    if (!line.trim() && hasIdentityMarker(current) && current.filter((item) => item.trim()).length >= 4) {
      blocks.push(current.join('\n'));
      current = [];
    }
  }
  if (current.some((item) => item.trim())) blocks.push(current.join('\n'));
  return blocks.filter((block) => block.trim());
}

function fallbackAddress(block) {
  const match = block.match(/((?:경상북도|경북)?\s*구미시\s+[^\n,|]+?(?:로|길|동|읍|면)\s*\d+(?:-\d+)?)/u)
    || block.match(/([가-힣]+(?:동|읍|면)\s+\d+(?:-\d+)?)/u);
  return match ? normalizeWhitespace(match[1]) : '';
}

function fallbackUnit(block) {
  const match = block.match(/(?:호실|호수|방)\s*[:：=|-]?\s*(\d{1,5})\s*호?/u)
    || block.match(/(?:^|\s)(\d{3,5})\s*호(?:\s|$)/u);
  return match ? match[1] : '';
}

function fallbackPrice(block) {
  const match = block.match(/(?:보증금\s*)?(\d[\d,]*)\s*[\/|-]\s*(\d[\d,]*)/u);
  return match ? { deposit: match[1], rent: match[2] } : {};
}

export function createCanonicalIdentity({ normalizedAddress, normalizedUnit, sourcePropertyType }) {
  if (!normalizedAddress || !normalizedUnit || !sourcePropertyType) return null;
  return `${normalizedAddress}|${normalizedUnit}|${sourcePropertyType}`;
}

export function parseGumiVacancyMarkdown(input, { maxRecords = 1000 } = {}) {
  const sanitized = sanitizeGumiVacancyText(input);
  const blocks = splitRecords(sanitized).slice(0, maxRecords);
  const records = blocks.map((block, index) => {
    const priceFallback = fallbackPrice(block);
    const address = readLabel(block, FIELD_ALIASES.address) || fallbackAddress(block);
    const unit = readLabel(block, FIELD_ALIASES.unit) || fallbackUnit(block);
    const propertyTypeRaw = readLabel(block, FIELD_ALIASES.propertyType) || block;
    const normalizedAddress = normalizeGumiAddress(address);
    const normalizedUnit = normalizeGumiUnit(unit);
    const sourcePropertyType = normalizeGumiPropertyType(propertyTypeRaw);
    const sourceIntSeqText = readLabel(block, FIELD_ALIASES.sourceIntSeq);
    const sourceIntSeqMatch = sourceIntSeqText.match(/\d+/u);
    const sourceIntSeq = sourceIntSeqMatch ? Number(sourceIntSeqMatch[0]) : null;
    const registeredAt = normalizeDate(readLabel(block, FIELD_ALIASES.registeredAt) || block);
    const depositAmount = parseGumiMoney(readLabel(block, FIELD_ALIASES.deposit) || priceFallback.deposit);
    const rentAmount = parseGumiMoney(readLabel(block, FIELD_ALIASES.rent) || priceFallback.rent);
    const managementFeeAmount = parseGumiMoney(readLabel(block, FIELD_ALIASES.managementFee));
    const canonicalIdentity = createCanonicalIdentity({ normalizedAddress, normalizedUnit, sourcePropertyType });
    const errors = [];
    if (!normalizedAddress) errors.push('address_missing');
    if (!sourcePropertyType) errors.push('property_type_missing');
    if (!normalizedUnit) errors.push('unit_uncertain');

    return {
      rowNumber: index + 1,
      address,
      normalizedAddress,
      unit: normalizedUnit,
      sourcePropertyType,
      depositAmount,
      rentAmount,
      managementFeeAmount,
      sourceRegisteredAt: registeredAt,
      sourceIntSeq,
      canonicalIdentity,
      disposition: canonicalIdentity ? 'ready' : 'duplicate_review',
      errors
    };
  });

  return {
    totalCount: records.length,
    recent90Count: records.filter((item) => {
      if (!item.sourceRegisteredAt) return false;
      const cutoff = new Date();
      cutoff.setHours(0, 0, 0, 0);
      cutoff.setDate(cutoff.getDate() - 90);
      return new Date(`${item.sourceRegisteredAt}T00:00:00`) >= cutoff;
    }).length,
    readyCount: records.filter((item) => item.disposition === 'ready').length,
    duplicateReviewCount: records.filter((item) => item.disposition === 'duplicate_review').length,
    errorCount: records.filter((item) => item.errors.length > 0).length,
    records
  };
}
