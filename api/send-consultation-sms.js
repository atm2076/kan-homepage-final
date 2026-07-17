import crypto from 'crypto';

const SOLAPI_ENDPOINT = 'https://api.solapi.com/messages/v4/send-many/detail';

function createAuthHeader(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(16).toString('hex');
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(date + salt)
    .digest('hex');

  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

function normalizePhone(value) {
  return String(value || '').replace(/[^\d]/g, '');
}

function formatKoreanTime(value) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(safeDate).replace(/\. /g, '-').replace('.', '');
}

function text(value, fallback = '-') {
  return String(value || '').trim() || fallback;
}

function getRequestTypeLabel(type) {
  return type === 'sell' ? '매도 상담' : '임대 상담';
}

function buildMessage(payload) {
  const name = text(payload.name);
  const phone = text(payload.phone);
  const requestType = getRequestTypeLabel(payload.request_type);
  const message = text(payload.message, '상담 요청');
  const submittedAt = formatKoreanTime(payload.submitted_at);

  if (payload.request_type === 'buy') {
    return [
      '[칸공인중개사 상담접수]',
      `이름: ${name}`,
      `연락처: ${phone}`,
      `문의유형: ${requestType}`,
      `희망지역: ${text(payload.region)}`,
      `매물종류: ${text(payload.property_type)}`,
      `보증금: ${text(payload.deposit)}`,
      `월세 또는 매매예산: ${text(payload.monthly_rent || payload.budget)}`,
      `입주예정일: ${text(payload.move_in_date)}`,
      `요청내용: ${message}`,
      `접수시간: ${submittedAt}`,
    ].join('\n');
  }

  return [
    '[칸공인중개사 상담접수]',
    `이름: ${name}`,
    `연락처: ${phone}`,
    `문의유형: ${requestType}`,
    `내용: ${message}`,
    `접수시간: ${submittedAt}`,
  ].join('\n');
}

function parseSolapiResponse(rawBody) {
  if (!rawBody) return {};

  try {
    return JSON.parse(rawBody);
  } catch {
    return { message: rawBody };
  }
}

function getSolapiError(parsedBody) {
  const errorCode = parsedBody?.errorCode || parsedBody?.code || 'SOLAPI_REQUEST_FAILED';
  const errorMessage = parsedBody?.errorMessage || parsedBody?.message || 'SOLAPI request failed.';

  return { errorCode, errorMessage };
}

function buildSolapiPayload({ receiver, sender, message }) {
  return {
    messages: [
      {
        to: normalizePhone(receiver),
        from: normalizePhone(sender),
        text: message,
        autoTypeDetect: true,
      },
    ],
  };
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'POST requests only.' });
    }

    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const sender = process.env.SOLAPI_SENDER_NUMBER;
    const receiver = process.env.CONSULTATION_SMS_RECEIVER;
    const normalizedSender = normalizePhone(sender);
    const normalizedReceiver = normalizePhone(receiver);

    const missing = [
      ['SOLAPI_API_KEY', apiKey],
      ['SOLAPI_API_SECRET', apiSecret],
      ['SOLAPI_SENDER_NUMBER', normalizedSender],
      ['CONSULTATION_SMS_RECEIVER', normalizedReceiver],
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missing.length) {
      return res.status(500).json({ error: 'SMS environment variables are not configured.', missing });
    }

    const payload = req.body || {};
    const name = text(payload.name, '');
    const phone = text(payload.phone, '');
    const requestType = text(payload.request_type, '');

    if (!name || !phone || !['buy', 'sell'].includes(requestType)) {
      return res.status(400).json({ error: 'Invalid consultation payload.' });
    }

    const response = await fetch(SOLAPI_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: createAuthHeader(apiKey, apiSecret),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildSolapiPayload({
        receiver: normalizedReceiver,
        sender: normalizedSender,
        message: buildMessage(payload),
      })),
    });

    const rawBody = await response.text();
    const parsedBody = parseSolapiResponse(rawBody);

    if (!response.ok) {
      const { errorCode, errorMessage } = getSolapiError(parsedBody);
      console.error('SOLAPI consultation SMS failed.', {
        status: response.status,
        errorCode,
        errorMessage,
      });

      return res.status(502).json({
        ok: false,
        status: response.status,
        errorCode,
        errorMessage,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Consultation SMS server error.', {
      message: error instanceof Error ? error.message : 'Unknown server error.',
    });
    return res.status(500).json({ error: 'SMS server error.' });
  }
}

export const __testables = {
  buildMessage,
  buildSolapiPayload,
  getSolapiError,
  parseSolapiResponse,
};
