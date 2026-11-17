// AI 상담은 공개 매물에 등록된 사실만 고객에게 설명합니다.
export function extractListingNumbers(message) {
  const matches = [...String(message || '').matchAll(/(?:매물\s*번호\s*[:：]?\s*(\d{3,7})|(\d{3,7})\s*번)/gu)];
  return [...new Set(matches.map((match) => Number(match[1] || match[2])).filter(Number.isFinite))].slice(0, 2);
}

function shown(value) {
  const text = String(value ?? '').trim();
  return text || '확인 필요';
}

function amount(value) {
  const text = String(value ?? '').replaceAll(',', '').trim();
  if (!text || /미정|협의|확인|문의|없음/u.test(text)) return null;
  const match = text.match(/\d+(?:\.\d+)?/u);
  if (!match) return null;
  const number = Number(match[0]);
  return /원/u.test(text) && !/만원|만\s*원/u.test(text) ? number / 10000 : number;
}

export function monthlyTotal(property) {
  const rent = amount(property?.rent);
  const management = amount(property?.maintenanceFee);
  return rent == null || management == null ? null : rent + management;
}

function basics(property) {
  return [
    `매물번호 ${shown(property.listingNumber)} · ${shown(property.title)}`,
    `소재지: ${shown(property.address)}`,
    `보증금 ${shown(property.deposit)} / 월세 ${shown(property.rent)} / 관리비 ${shown(property.maintenanceFee)}`,
    `면적: ${shown(property.area)} · 층수: ${shown(property.floorInfo)}`,
    `입주: ${shown(property.moveIn)} · 주차: ${shown(property.parking)}`
  ];
}

export function describeProperty(property, question = '') {
  if (!property) return '먼저 상담할 매물을 선택하거나 매물번호를 알려주세요.';
  const text = String(question || '');
  const name = `매물번호 ${shown(property.listingNumber)}`;
  const total = monthlyTotal(property);
  const feature = [property.summary, property.description].map((x) => String(x || '').trim()).filter(Boolean);
  const registered = feature.length ? feature.join(' / ').slice(0, 420) : '등록된 상세 설명이 없습니다.';
  const link = property.detailUrl ? `\n매물 상세보기: ${property.detailUrl}` : '';
  if (/사진/u.test(text)) {
    const count = Array.isArray(property.photoUrls) ? property.photoUrls.length : 0;
    return `${name}: 등록된 사진 ${count}장입니다. ${count ? '사진은 매물 상세페이지에서 확인하실 수 있습니다.' : '현재 사진 준비 중입니다.'}${link}`;
  }
  if (/계약|유리|비용|관리비|월세|보증금|절약/u.test(text) && !/장점/u.test(text)) {
    return [
      `${name}의 계약 전 확인사항을 공개 정보 기준으로 안내드립니다.`,
      `보증금 ${shown(property.deposit)} / 월세 ${shown(property.rent)} / 관리비 ${shown(property.maintenanceFee)}`,
      total == null ? '월 고정비 합계는 금액을 확인한 후 계산할 수 있습니다.' : `월세와 관리비 합계: 월 ${total.toLocaleString('ko-KR')}만원 (별도 공과금 제외)`,
      `입주 가능 시점: ${shown(property.moveIn)}`,
      '실제 계약 전 관리비 포함 항목, 공과금, 보증금 반환 조건, 등기사항과 계약 내용을 확인해야 합니다.',
      '계약상 유리한 조건이 있는지는 다른 후보와 비교한 후 판단할 수 있습니다.'
    ].join('\n') + link;
  }
  if (/단점|주의|불리|문제|위험/u.test(text)) {
    return [
      `${name}의 주의사항입니다. 확인되지 않은 단점은 추측하지 않겠습니다.`,
      `공개 정보: 보증금 ${shown(property.deposit)}, 월세 ${shown(property.rent)}, 관리비 ${shown(property.maintenanceFee)}`,
      `주차: ${shown(property.parking)} · 입주: ${shown(property.moveIn)}`,
      '현장 채광·소음·실제 주차 가능 여부, 관리비 포함 항목, 등기사항은 별도 확인이 필요합니다.'
    ].join('\n') + link;
  }
  if (/장점|좋은|왜|특징|추천.*이유|어떤.*방/u.test(text)) {
    const facts = [];
    if (property.area) facts.push(`등록 면적은 ${property.area}입니다.`);
    if (property.moveIn) facts.push(`입주 가능 시점은 ${property.moveIn}으로 등록되어 있습니다.`);
    if (property.parking) facts.push(`주차 정보는 ${property.parking}입니다.`);
    if (property.floorInfo) facts.push(`층수는 ${property.floorInfo}입니다.`);
    if (total != null) facts.push(`월세와 관리비 합계는 월 ${total.toLocaleString('ko-KR')}만원입니다(별도 공과금 제외).`);
    facts.push(`등록된 특징: ${registered}`);
    return [`${name}의 특징과 비교할 장점입니다.`, ...facts, '다른 방보다 더 유리한지는 보증금·관리비·면적·옵션을 함께 비교해야 합니다.'].join('\n') + link;
  }
  return [...basics(property), `등록된 특징: ${registered}`, '등록 정보는 변경될 수 있으므로 방문 및 계약 전에 재확인이 필요합니다.'].join('\n') + link;
}

export function compareProperties(first, second) {
  if (!first || !second) return '비교할 공개 매물 두 개를 확인하지 못했습니다. 예: 3897번과 3891번을 비교해 줘.';
  const firstTotal = monthlyTotal(first);
  const secondTotal = monthlyTotal(second);
  return [
    `매물번호 ${shown(first.listingNumber)}번과 ${shown(second.listingNumber)}번 비교 (등록 정보 기준)`,
    `① ${basics(first).join(' | ')}`,
    `② ${basics(second).join(' | ')}`,
    firstTotal == null || secondTotal == null
      ? '월세·관리비 총액은 등록 금액 확인 후 비교할 수 있습니다.'
      : `월세+관리비: ${shown(first.listingNumber)}번 ${firstTotal.toLocaleString('ko-KR')}만원 / ${shown(second.listingNumber)}번 ${secondTotal.toLocaleString('ko-KR')}만원 (공과금 별도)`,
    '옵션·채광·소음·관리비 포함 항목 등 확인되지 않은 조건은 현장에서 비교해야 합니다.',
    first.detailUrl ? `${shown(first.listingNumber)}번 상세: ${first.detailUrl}` : '',
    second.detailUrl ? `${shown(second.listingNumber)}번 상세: ${second.detailUrl}` : ''
  ].filter(Boolean).join('\n');
}

export function isPropertyQuestion(message) {
  return /장점|단점|특징|비교|차이|왜\s*좋|어떤\s*방|계약.*유리|유리.*계약|계약하면|주의|옵션|사진|면적|층수|관리비|입주.*가능|주차/u.test(String(message || ''));
}
