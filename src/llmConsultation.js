const INTERPRET_SCHEMA = {
  type: 'object', additionalProperties: false,
  properties: {
    intent: { type: 'string', enum: ['search', 'select', 'viewing', 'photo_question', 'general'] },
    region: { type: ['string', 'null'] },
    propertyType: { type: ['string', 'null'], enum: ['원룸', '미니투룸', '투룸', '주인세대', null] },
    maxDeposit: { type: ['number', 'null'] }, maxRent: { type: ['number', 'null'] },
    maxManagementFee: { type: ['number', 'null'] }, recommendationNumber: { type: ['integer', 'null'] },
    cheaper: { type: 'boolean' }, parkingRequired: { type: 'boolean' }
  },
  required: ['intent', 'region', 'propertyType', 'maxDeposit', 'maxRent', 'maxManagementFee', 'recommendationNumber', 'cheaper', 'parkingRequired']
};

function responseText(response) {
  return (response?.output || []).flatMap((item) => item?.content || []).map((item) => item?.text || '').join('').trim();
}

async function requestStructured({ apiKey, model, name, schema, input, safetyIdentifier }) {
  if (!apiKey) return null;
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model, store: false, safety_identifier: safetyIdentifier,
      input, max_output_tokens: 500,
      text: { format: { type: 'json_schema', name, strict: true, schema } }
    })
  });
  if (!response.ok) throw new Error(`llm_http_${response.status}`);
  return JSON.parse(responseText(await response.json()));
}

export async function interpretConsultationMessage({ apiKey, model, message, context, safetyIdentifier }) {
  return requestStructured({
    apiKey, model, name: 'property_consultation_intent', schema: INTERPRET_SCHEMA, safetyIdentifier,
    input: [{ role: 'system', content: `한국어 부동산 상담 의도와 검색조건만 구조화한다. 매물 사실을 만들지 않는다. '미투'는 미니투룸이다. 이전 조건은 참고하되 현재 말이 수정하면 현재 말을 우선한다.` },
      { role: 'user', content: JSON.stringify({ previousConditions: context?.conditions || {}, currentMessage: String(message || '').slice(0, 1000) }) }]
  });
}

export async function naturalizeSafeLead({ apiKey, model, message, resultCount, safetyIdentifier }) {
  const schema = { type: 'object', additionalProperties: false, properties: { lead: { type: 'string', maxLength: 120 } }, required: ['lead'] };
  const result = await requestStructured({
    apiKey, model, name: 'property_consultation_lead', schema, safetyIdentifier,
    input: [{ role: 'system', content: '친절한 한국어 부동산 상담 한 문장만 작성한다. 주소, 가격, 호실, 매물번호 등 매물 사실은 절대 쓰지 않는다. 예약 확정 표현도 금지한다.' },
      { role: 'user', content: JSON.stringify({ customerMessage: String(message || '').slice(0, 500), verifiedResultCount: resultCount }) }]
  });
  return String(result?.lead || '').replace(/[\r\n]+/gu, ' ').slice(0, 120);
}

export const LLM_INTERPRET_SCHEMA = INTERPRET_SCHEMA;
