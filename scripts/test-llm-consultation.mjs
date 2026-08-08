import assert from 'node:assert/strict';
import { interpretConsultationMessage, naturalizeSafeLead } from '../src/llmConsultation.js';

const originalFetch = globalThis.fetch;
const requests = [];
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body); requests.push(body);
  const payload = body.text.format.name === 'property_consultation_intent'
    ? { intent: 'search', region: null, propertyType: null, maxDeposit: null, maxRent: null, maxManagementFee: null, recommendationNumber: null, cheaper: true, parkingRequired: true }
    : { lead: '조건을 반영해 현재 확인되는 매물을 다시 찾아봤어요.' };
  return { ok: true, json: async () => ({ output: [{ content: [{ text: JSON.stringify(payload) }] }] }) };
};

const intent = await interpretConsultationMessage({ apiKey: 'test-key', model: 'test-model', message: '조금 더 싼 거 중 주차되는 방?', context: { conditions: { region: '인의동', maxRent: 30 } }, safetyIdentifier: 'safe-id' });
assert.equal(intent.cheaper, true); assert.equal(intent.parkingRequired, true);
const lead = await naturalizeSafeLead({ apiKey: 'test-key', model: 'test-model', message: '찾아줘', resultCount: 3, safetyIdentifier: 'safe-id' });
assert(lead.includes('현재'));
assert.equal(requests.every((body) => body.store === false), true);
assert.equal(JSON.stringify(requests).includes('owner_phone'), false);
globalThis.fetch = originalFetch;

console.log('llm consultation guardrail tests: ok');
