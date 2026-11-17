import assert from 'node:assert/strict';
import { extractListingNumbers, monthlyTotal, describeProperty, compareProperties, isPropertyQuestion } from '../src/consultationAnswers.js';

const a = { listingNumber: 3897, title: '진평동 미니투룸', address: '구미시 진평동',
  deposit: '200', rent: '20', maintenanceFee: '10', area: '40㎡',
  floorInfo: '2층 / 4층', moveIn: '즉시입주', parking: '확인 필요',
  summary: '에어컨과 세탁기', photoUrls: ['a.jpg'], detailUrl: '/#/listing/abc' };
const b = { ...a, listingNumber: 3891, rent: '30', maintenanceFee: '7', area: '50㎡', detailUrl: '/#/listing/def' };
assert.deepEqual(extractListingNumbers('3897번 방의 장점과 3891번 비교해 줘'), [3897, 3891]);
assert.deepEqual(extractListingNumbers('매물번호 3897이 어때?'), [3897]);
assert.deepEqual(extractListingNumbers('진평동 미니투룸 추천해 줘'), []);
assert.equal(monthlyTotal(a), 30);
assert.equal(monthlyTotal({ ...a, rent: '200,000원' }), 30);
assert(describeProperty(a, '이 방 장점이 뭐야?').includes('에어컨과 세탁기'));
assert(describeProperty(a, '이 방 계약하면 유리한 점?').includes('월 30만원'));
assert(describeProperty(a, '사진 몇 장?').includes('1장'));
assert(compareProperties(a, b).includes('3891'));
assert(compareProperties(a, b).includes('37만원'));
assert(isPropertyQuestion('이 방 장점은?'));
console.log('AI listing explanation and comparison tests: ok');
