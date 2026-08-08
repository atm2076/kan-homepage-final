import assert from 'node:assert/strict';
import {
  createCanonicalIdentity,
  normalizeGumiPropertyType,
  parseGumiMoney,
  parseGumiVacancyMarkdown,
  sanitizeGumiVacancyText
} from '../src/gumiVacancyParser.js';

const sample = `
## 매물
주소: 경상북도 구미시 인의동 669-8
호실: 301호
매물종류: 미투
보증금: 100
월세: 25
관리비: 8
등록일: 2026-08-01
intSeq: 12345
전화번호: 010-1111-2222
비밀번호: 9999

## 매물
주소: 구미시 인의동 669-8
호실: 301호
매물종류: 미니투룸
보증금: 200
월세: 23
관리비: 10
등록일: 2026-08-07
intSeq: 98765

## 확인필요
주소: 구미시 진평동 12-3
호실: 확인필요
매물종류: 원룸
보증금: 200
월세: 30
`;

assert.equal(sanitizeGumiVacancyText(sample).includes('010-1111-2222'), false);
assert.equal(sanitizeGumiVacancyText(sample).includes('9999'), false);
assert.equal(normalizeGumiPropertyType('미투'), '미니투룸');
assert.equal(parseGumiMoney('관리비 없음'), 0);

const result = parseGumiVacancyMarkdown(sample);
assert.equal(result.totalCount, 3);
assert.equal(result.recent90Count, 2);
assert.equal(result.readyCount, 2);
assert.equal(result.duplicateReviewCount, 1);
assert.equal(result.errorCount, 1);
assert.equal(JSON.stringify(result.records).includes('010-1111-2222'), false);
assert.equal(JSON.stringify(result.records).includes('9999'), false);
assert.equal(result.records[0].canonicalIdentity, result.records[1].canonicalIdentity);
assert.equal(result.records[0].depositAmount, 100);
assert.equal(result.records[1].depositAmount, 200);
assert.equal(result.records[0].rentAmount, 25);
assert.equal(result.records[1].rentAmount, 23);
assert.notEqual(result.records[0].sourceIntSeq, result.records[1].sourceIntSeq);
assert.equal(result.records[2].canonicalIdentity, null);
assert.equal(
  createCanonicalIdentity({ normalizedAddress: '인의동 669-8', normalizedUnit: null, sourcePropertyType: '원룸' }),
  null
);

const thousand = Array.from({ length: 1000 }, (_, index) => `
## ${index + 1}
주소: 구미시 인의동 ${index + 1}-1
호실: 301호
매물종류: 원룸
보증금: 100
월세: 30
intSeq: ${index + 1}
`).join('\n');
const thousandResult = parseGumiVacancyMarkdown(thousand);
assert.equal(thousandResult.totalCount, 1000);
assert.equal(thousandResult.readyCount, 1000);

const cappedResult = parseGumiVacancyMarkdown(`${thousand}\n${thousand}`);
assert.equal(cappedResult.totalCount, 1000);

console.log('gumi vacancy parser tests: ok');
