import fs from 'node:fs';

const source = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const start = source.indexOf('function normalizeBlogText');
const end = source.indexOf('async function copyAdvertisementText', start);
if (start < 0 || end < 0) throw new Error('네이버 블로그 생성 함수 범위를 찾지 못했습니다.');

const factory = new Function('OFFICE', `
  function cleanBlogBodyStart(text) { return String(text || '').trimStart(); }
  ${source.slice(start, end)}
  return { buildNaverBlogAd };
`);
const { buildNaverBlogAd } = factory({
  phone: '010-0000-0000',
  tel: '054-000-0000',
  broker: '테스트 중개사',
  address: '테스트 주소',
  regNo: '테스트 등록번호'
});

const fixtures = [
  {
    name: '인의동 원룸 혼합 입력',
    property: {
      title: '구미 인의동 원룸 월세',
      address: '경상북도 구미시 수출대로28길 12-4 (인의동)',
      category: '원룸',
      trade_type: '월세',
      deposit: 300,
      rent: 28,
      maintenance_fee: '10만원',
      maintenance_includes: [null, '', '인터넷', ['수도요금', '인터넷']],
      convenience: ['에어컨', null, { label: '냉장고' }, { name: '가스렌지' }],
      options: '에어컨, 세탁기',
      photos: null,
      photoUrls: [{ url: 'photo-1' }, 'photo-2'],
      photo_captions: ['1. 방 전경', null, { caption: '주방' }],
      recommended_for: null,
      legal_notice: ''
    },
    expectedTitle: '구미 인의동 원룸 월세｜300/28 · 관리비 10만원'
  },
  {
    name: '진평동 투룸 배열 입력',
    property: {
      title: '구미 진평동 투룸 월세｜500/45 진평먹자골목 인근',
      address: '경상북도 구미시 인동32길 36-18 (진평동)',
      category: '투룸',
      trade_type: '월세',
      deposit: '500',
      rent: '45',
      maintenance_fee: '10만원',
      maintenance_includes: ['인터넷', '유선방송', '인터넷'],
      convenience: ['에어컨', '냉장고'],
      photos: ['photo-1', 'photo-2'],
      photo_captions: ['1번 사진 거실', '2. 주방']
    },
    expectedTitle: '구미 진평동 투룸 월세｜500/45 · 관리비 10만원'
  },
  {
    name: '진평동 미니투룸 SEO 기본틀과 관리비',
    property: {
      listing_number: 3897,
      title: '구미 진평동 미니투룸 월세｜200/20',
      address: '경상북도 구미시 진평길 75-9 (진평동)',
      category: '미니투룸',
      trade_type: '월세',
      deposit: '200',
      rent: '20',
      maintenance_fee: '월 10만원',
      maintenance_includes: [
        '관리용역비 3만원', '유선방송 1만원', '인터넷 3만원',
        '공용전기 1만원', '수도요금 2만원'
      ],
      move_in: '즉시입주',
      floor_info: '2층 / 4층',
      room_bath: '방1/욕실1',
      main_use: '단독주택',
      structure: '철근콘크리트구조',
      photos: Array.from({ length: 15 }, (_, index) => `photo-${index + 1}`),
      convenience: ['에어컨', '세탁기', '냉장고', '반려동물 확인 필요']
    },
    expectedTitle: '구미 진평동 미니투룸 월세｜200/20 · 관리비 10만원 · 즉시입주',
    validate: (result) => {
      if (!result.body.includes('월 30만원')) throw new Error('월 합계가 누락됐습니다.');
      if (!result.body.includes('관리용역비 월 3만원')) throw new Error('검증된 관리비 내역이 누락됐습니다.');
      if (result.body.includes('반려동물 확인 필요')) throw new Error('미확인 옵션은 제외해야 합니다.');
      if (result.body.includes('매물 내부 모습')) throw new Error('확인되지 않은 사진 설명이 있습니다.');
      if (!(result.body.includes('현장사진 ①') && result.body.includes('현장사진 ③')))
        throw new Error('사진 안내가 분산되지 않았습니다.');
    }
  },
  {
    name: 'null 매물',
    property: null
  }
];

for (const fixture of fixtures) {
  const result = buildNaverBlogAd(fixture.property);
  if (!result?.title || !result?.body || !Array.isArray(result?.warnings)) {
    throw new Error(`${fixture.name}: 생성 결과 형식이 올바르지 않습니다.`);
  }
  if (fixture.expectedTitle && result.title !== fixture.expectedTitle) {
    throw new Error(`${fixture.name}: 제목이 변경되었습니다. (${result.title})`);
  }
  fixture.validate?.(result);
  console.log(`${fixture.name}: PASS (warnings=${result.warnings.length})`);
}

if (!source.includes('네이버 블로그 문구 생성 중 오류가 발생했습니다.')) {
  throw new Error('관리자 오류 안내 문구가 없습니다.');
}
