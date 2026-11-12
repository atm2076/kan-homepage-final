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
    expectedTitle: '구미 인의동 원룸 월세 300/28｜관리비 포함 월 38만원'
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
      representative_location: '진평먹자골목 인근',
      photos: ['photo-1', 'photo-2'],
      photo_captions: ['1번 사진 거실', '2. 주방']
    },
    expectedTitle: '구미 진평동 투룸 월세 500/45｜진평먹자골목 인근 · 관리비 포함 월 55만원'
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
  console.log(`${fixture.name}: PASS (warnings=${result.warnings.length})`);
}

if (!source.includes('네이버 블로그 문구 생성 중 오류가 발생했습니다.')) {
  throw new Error('관리자 오류 안내 문구가 없습니다.');
}

const listing3896 = buildNaverBlogAd({
  address: '경상북도 구미시 상사서로25길 16-12 (사곡동)',
  category: '미니투룸',
  trade_type: '월세',
  deposit: 200,
  rent: 25,
  maintenance_fee: '10만원',
  move_in: '즉시입주',
  representative_location: '사곡역 도보 약 5분',
  photos: Array.from({ length: 12 }, (_, index) => `photo-${index + 1}`)
});
if (!listing3896.title.includes('사곡역 도보 약 5분') || !listing3896.body.includes('월 35만원')) {
  throw new Error('3896번 글의 위치 또는 월세와 관리비 합계가 빠졌습니다.');
}
const photoPositions = [...listing3896.body.matchAll(/📷 (\d+)번 사진/gu)];
if (photoPositions.length !== 12 ||
    photoPositions.some((match, index) => Number(match[1]) !== index + 1) ||
    photoPositions[0].index > listing3896.body.indexOf('매물 기본정보') ||
    photoPositions[11].index < listing3896.body.indexOf('위치와 생활권')) {
  throw new Error('3896번 사진의 순서 또는 분산 배치가 올바르지 않습니다.');
}
if (!buildNaverBlogAd(fixtures[0].property).body.includes('https://www.khanhouse.co.kr/gumi-one-room')) {
  throw new Error('구미 원룸 글에서 원룸 안내 페이지 링크가 빠졌습니다.');
}
