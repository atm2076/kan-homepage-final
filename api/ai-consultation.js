import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import {
  extractConsultationConditions,
  formatRecommendations,
  parseDesiredDate,
  parseDesiredTime,
  parsePhone,
  parseRecommendationNumber,
  recommendationSnapshot,
  toAiPublicProperty
} from '../src/consultationEngine.js';
import { interpretConsultationMessage } from '../src/llmConsultation.js';
import { compareProperties, describeProperty, extractListingNumbers, isPropertyQuestion } from '../src/consultationAnswers.js';

const MAX_MESSAGE_LENGTH = 1000;
const PUBLIC_SELECT = 'id,listing_number,listing_type,title,category,property_type,trade_type,address,deposit,rent,maintenance_fee,area,floor_info,direction,parking,move_in,summary,description,photos,availability_status,status,ad_visibility,review_state,updated_at';

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function serviceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://ipjppmhyxfrbocfquwos.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

async function requireAdmin(req, service) {
  const bearer = String(req.headers.authorization || '').match(/^Bearer\s+(.+)$/u)?.[1];
  if (!bearer) return null;
  const { data } = await service.auth.getUser(bearer);
  const user = data?.user;
  if (!user) return null;
  const role = String(user.app_metadata?.role || '').toLowerCase();
  const allowedEmails = String(process.env.GUMI_IMPORT_ADMIN_EMAILS || '')
    .split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
  return ['admin', 'owner'].includes(role) || allowedEmails.includes(String(user.email || '').toLowerCase()) ? user : null;
}

async function addMessage(service, conversationId, role, content) {
  const safeContent = String(content || '').slice(0, MAX_MESSAGE_LENGTH);
  const { error } = await service.from('ai_conversation_messages').insert({ conversation_id: conversationId, role, content: safeContent });
  if (error) throw error;
}

async function loadConversation(service, id, token) {
  if (!id || !token) return null;
  const { data, error } = await service.from('ai_conversations')
    .select('id,channel,status,context,customer_name,customer_phone')
    .eq('id', id).eq('access_token_hash', tokenHash(token)).maybeSingle();
  if (error) throw error;
  return data;
}

async function searchProperties(service, conditions) {
  const { data, error } = await service.rpc('ai_search_public_properties', {
    p_region: conditions.region || null,
    p_property_type: conditions.propertyType || null,
    p_max_deposit: conditions.maxDeposit ?? null,
    p_max_rent: conditions.maxRent ?? null,
    p_max_management_fee: conditions.maxManagementFee ?? null,
    p_limit: 5,
    p_parking_required: Boolean(conditions.parkingRequired)
  });
  if (error) throw error;
  return (data || []).map(toAiPublicProperty);
}

async function getPublicPropertiesByNumbers(service, numbers) {
  if (!numbers.length) return [];
  const { data, error } = await service.from('properties').select(PUBLIC_SELECT)
    .in('listing_number', numbers)
    .eq('status', 'published').eq('availability_status', 'active')
    .eq('ad_visibility', '공개').eq('review_state', 'approved');
  if (error) throw error;
  return (data || []).map(toAiPublicProperty);
}

async function getPublicPropertyById(service, id) {
  if (!id) return null;
  const { data, error } = await service.from('properties').select(PUBLIC_SELECT)
    .eq('id', id).eq('status', 'published').eq('availability_status', 'active')
    .eq('ad_visibility', '공개').eq('review_state', 'approved').maybeSingle();
  if (error) throw error;
  return data ? toAiPublicProperty(data) : null;
}

function makeSnapshot(property) {
  return recommendationSnapshot([property])[0];
}

function nextViewingQuestion(context) {
  if (!context.desiredDate) return ['desired_date', '방보기를 원하는 날짜를 알려주세요. 예: 오늘 또는 8월 10일'];
  if (!context.desiredTime) return ['desired_time', '희망 시간을 알려주세요. 예: 오후 6시'];
  if (!context.customerName) return ['customer_name', '요청을 남길 고객님 성함을 알려주세요.'];
  if (!context.customerPhone) return ['customer_phone', '담당자가 연락드릴 전화번호를 알려주세요.'];
  return [null, null];
}

async function saveAssistant(service, conversationId, reply, context, extra = {}) {
  await addMessage(service, conversationId, 'assistant', reply);
  const { error } = await service.from('ai_conversations').update({ context, updated_at: new Date().toISOString(), ...extra }).eq('id', conversationId);
  if (error) throw error;
  return reply;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST만 허용됩니다.' });
  const service = serviceClient();
  if (!service) return send(res, 503, {
    ok: false,
    error: process.env.SUPABASE_SERVICE_ROLE_KEY
      ? '상담 서버 구성이 완료되지 않았습니다.'
      : '상담 서버의 Supabase 서버 키가 설정되지 않았습니다.'
  });
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = String(body.action || '');

  try {
    if (action.startsWith('admin_')) {
      const admin = await requireAdmin(req, service);
      if (!admin) return send(res, 403, { ok: false, error: '서버 검증 관리자 권한이 필요합니다.' });
      if (action === 'admin_list_viewing_requests') {
        const { data, error } = await service.from('viewing_requests')
          .select('id,conversation_id,property_id,customer_name,customer_phone,desired_date,desired_time,customer_conditions,consultation_summary,channel,staff_status,created_at,properties(listing_number,title,address)')
          .order('created_at', { ascending: false }).limit(200);
        if (error) throw error;
        return send(res, 200, { ok: true, requests: data || [], newCount: (data || []).filter((item) => item.staff_status === 'new').length });
      }
      if (action === 'admin_update_viewing_request') {
        const allowed = ['contacted', 'confirmed', 'completed', 'cancelled'];
        if (!allowed.includes(body.staffStatus)) return send(res, 400, { ok: false, error: '허용되지 않는 상태입니다.' });
        const { data, error } = await service.from('viewing_requests')
          .update({ staff_status: body.staffStatus, assigned_to: admin.id, updated_at: new Date().toISOString() })
          .eq('id', body.requestId).select('id,staff_status').single();
        if (error) throw error;
        return send(res, 200, { ok: true, request: data });
      }
    }

    if (action === 'sms_inbound') {
      const configuredSecret = process.env.SMS_ADAPTER_SECRET;
      if (!configuredSecret || req.headers['x-sms-adapter-secret'] !== configuredSecret) {
        return send(res, 503, { ok: false, error: 'SMS adapter가 연결되지 않았습니다.' });
      }
      return send(res, 501, { ok: false, error: 'SMS 업체 adapter 구현이 필요합니다.' });
    }

    if (action === 'start') {
      const accessToken = crypto.randomBytes(32).toString('base64url');
      const context = { conditions: {}, selectedPropertyId: body.propertyId || null, awaitingField: null };
      const { data: conversation, error } = await service.from('ai_conversations')
        .insert({ channel: 'web', access_token_hash: tokenHash(accessToken), context })
        .select('id,status').single();
      if (error) throw error;
      let reply = '안녕하세요. 현재 등록된 공실 중에서 조건에 맞는 매물을 찾아드릴게요. 원하시는 지역을 알려주세요.';
      if (body.propertyId) {
        const { data: property } = await service.from('properties').select(PUBLIC_SELECT)
          .eq('id', body.propertyId).eq('status', 'published').eq('availability_status', 'active')
          .eq('ad_visibility', '공개').eq('review_state', 'approved').maybeSingle();
        if (property) {
          context.selectedPropertyId = property.id;
          context.selectedPropertySnapshot = recommendationSnapshot([toAiPublicProperty(property)])[0];
          reply = `매물번호 ${property.listing_number} 상담을 시작할게요. 궁금한 점이나 방보기 희망 날짜를 말씀해주세요.`;
        }
      }
      await saveAssistant(service, conversation.id, reply, context);
      return send(res, 200, { ok: true, conversationId: conversation.id, accessToken, reply });
    }

    if (action === 'history') {
      const conversation = await loadConversation(service, body.conversationId, body.accessToken);
      if (!conversation || conversation.status === 'closed') return send(res, 401, { ok: false, error: '유효하지 않은 상담입니다.' });
      const { data, error } = await service.from('ai_conversation_messages')
        .select('role,content').eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false }).limit(30);
      if (error) throw error;
      const messages = (data || []).reverse().map((item) => ({ role: item.role, content: item.content }));
      const last = messages.at(-1);
      if (last?.role === 'assistant' && Array.isArray(conversation.context?.recommendations)) {
        last.recommendations = conversation.context.recommendations;
      }
      return send(res, 200, { ok: true, messages });
    }

    if (action === 'message') {
      const message = String(body.message || '').trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!message) return send(res, 400, { ok: false, error: '메시지를 입력해주세요.' });
      const conversation = await loadConversation(service, body.conversationId, body.accessToken);
      if (!conversation || conversation.status === 'closed') return send(res, 401, { ok: false, error: '유효하지 않은 상담입니다.' });
      await addMessage(service, conversation.id, 'customer', message);
      const context = { ...(conversation.context || {}) };
      const llmOptions = {
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.OPENAI_CONSULTATION_MODEL || 'gpt-5.4-nano',
        message,
        context,
        safetyIdentifier: tokenHash(conversation.id).slice(0, 32)
      };
      let llmIntent = null;
      try { llmIntent = await interpretConsultationMessage(llmOptions); } catch (error) {
        console.warn('consultation llm unavailable', { stage: 'intent', code: error?.message || 'unknown' });
        llmIntent = null;
      }

      if (context.awaitingField === 'desired_date') context.desiredDate = parseDesiredDate(message);
      if (context.awaitingField === 'desired_time') context.desiredTime = parseDesiredTime(message);
      if (context.awaitingField === 'customer_name' && !parsePhone(message)) context.customerName = message.slice(0, 50);
      if (context.awaitingField === 'customer_phone') context.customerPhone = parsePhone(message);
      context.desiredDate ||= parseDesiredDate(message);
      context.desiredTime ||= parseDesiredTime(message);
      context.customerPhone ||= parsePhone(message);

      const recommendationNumber = parseRecommendationNumber(message) || llmIntent?.recommendationNumber || null;
      let selectedRecommendation = null;
      if (recommendationNumber) {
        const { data: recommendation } = await service.from('ai_recommendations')
          .select('id,property_id,snapshot').eq('conversation_id', conversation.id)
          .eq('recommendation_number', recommendationNumber).maybeSingle();
        if (recommendation) {
          selectedRecommendation = recommendation;
          context.selectedRecommendationId = recommendation.id;
          context.selectedPropertyId = recommendation.property_id;
          context.selectedPropertySnapshot = recommendation.snapshot;
        }
      }

      // 매물번호 직접 질문, 비교, 직전 추천 매물의 장점 등은 금액 입력 없이 응답합니다.
      const listingNumbers = extractListingNumbers(message);
      const comparisonRequested = /비교|차이|어느\s*(방|쪽).*좋/u.test(message);
      // 새 매물 검색에 포함된 '월세/주차/사진'은 설명 질문으로 오인하지 않습니다.
      const freshSearch = /추천|찾아|보여\s*줘|있어\s*요|있나|더\s*싼|저렴|다른\s*방|조건.*방/u.test(message);
      const questionRequested = !freshSearch && (
        (isPropertyQuestion(message) && Boolean(context.selectedPropertyId || listingNumbers.length))
        || Boolean(selectedRecommendation && /이\s*방|해당\s*방/u.test(message))
      );
      if (comparisonRequested || questionRequested || listingNumbers.length) {
        const numbered = await getPublicPropertiesByNumbers(service, listingNumbers);
        const numberedMap = new Map(numbered.map((property) => [Number(property.listing_number), property]));
        const ordered = listingNumbers.map((number) => numberedMap.get(number)).filter(Boolean);
        if (comparisonRequested) {
          const candidates = ordered.length >= 2 ? ordered : [];
          if (candidates.length < 2 && Array.isArray(context.recommendations)) {
            for (const candidate of context.recommendations) {
              if (candidates.some((item) => item.id === candidate.propertyId)) continue;
              const fresh = await getPublicPropertyById(service, candidate.propertyId);
              if (fresh) candidates.push(fresh);
              if (candidates.length >= 2) break;
            }
          }
          const reply = candidates.length >= 2
            ? compareProperties(makeSnapshot(candidates[0]), makeSnapshot(candidates[1]))
            : '공개 중인 비교 매물 두 개를 확인하지 못했습니다. 예: 3897번과 3891번을 비교해 줘.';
          await saveAssistant(service, conversation.id, reply, context);
          return send(res, 200, { ok: true, reply });
        }
        const property = ordered[0]
          || (!listingNumbers.length ? await getPublicPropertyById(service, context.selectedPropertyId) : null);
        if (property) {
          context.selectedPropertyId = property.id;
          context.selectedPropertySnapshot = makeSnapshot(property);
          const reply = describeProperty(context.selectedPropertySnapshot, message);
          await saveAssistant(service, conversation.id, reply, context);
          return send(res, 200, { ok: true, reply });
        }
        if (listingNumbers.length || questionRequested) {
          const reply = listingNumbers.length
            ? '요청하신 매물번호는 현재 공개 중인 공실에서 확인되지 않습니다. 번호를 확인하거나 다른 매물을 추천받아 보세요.'
            : '설명할 매물을 먼저 선택해 주세요. 매물번호를 입력하거나 지역과 방 종류를 말씀하시면 추천해 드립니다.';
          await saveAssistant(service, conversation.id, reply, context);
          return send(res, 200, { ok: true, reply });
        }
      }

      const viewingIntent = /보고\s*싶|방\s*보기|보러\s*가|예약|방문\s*(신청|예약|하고\s*싶)/u.test(message)
        || llmIntent?.intent === 'viewing'
        || Boolean(context.awaitingField);
      if (context.viewingRequestId && viewingIntent) {
        const reply = '기존 방보기 요청이 접수되어 있습니다. 담당자가 확인 후 안내드립니다.';
        await saveAssistant(service, conversation.id, reply, context);
        return send(res, 200, { ok: true, reply, viewingRequestId: context.viewingRequestId });
      }
      if (viewingIntent && !context.selectedPropertyId) {
        const reply = '방보기를 원하시는 매물을 선택해 주세요. 예: 1번 방을 보고 싶어요.';
        await saveAssistant(service, conversation.id, reply, context);
        return send(res, 200, { ok: true, reply });
      }
      if (viewingIntent && context.selectedPropertyId) {
        const [field, question] = nextViewingQuestion(context);
        if (field) {
          context.awaitingField = field;
          const reply = await saveAssistant(service, conversation.id, question, context);
          return send(res, 200, { ok: true, reply, viewingPending: true });
        }
        context.awaitingField = null;
        const summary = `${context.customerName} 고객 · ${context.desiredDate} ${context.desiredTime} · 선택 매물 ${context.selectedPropertySnapshot?.listingNumber || context.selectedPropertyId}`;
        const { data: request, error } = await service.from('viewing_requests').insert({
          conversation_id: conversation.id,
          property_id: context.selectedPropertyId,
          recommendation_id: context.selectedRecommendationId || null,
          customer_name: context.customerName,
          customer_phone: context.customerPhone,
          desired_date: context.desiredDate,
          desired_time: context.desiredTime,
          customer_conditions: context.conditions || {},
          consultation_summary: summary,
          channel: conversation.channel
        }).select('id').single();
        if (error) throw error;
        context.viewingRequestId = request.id;
        const reply = '방보기 요청이 접수되었습니다. 담당자가 확인 후 안내드립니다.';
        await saveAssistant(service, conversation.id, reply, context, { status: 'viewing_requested', customer_name: context.customerName, customer_phone: context.customerPhone });
        return send(res, 200, { ok: true, reply, viewingRequestId: request.id });
      }

      context.conditions = extractConsultationConditions(message, context.conditions || {});
      if (llmIntent) {
        for (const [key, value] of Object.entries({
          region: llmIntent.region, propertyType: llmIntent.propertyType,
          maxDeposit: llmIntent.maxDeposit, maxRent: llmIntent.maxRent,
          maxManagementFee: llmIntent.maxManagementFee
        })) if (value !== null && value !== undefined) context.conditions[key] = value;
        if (llmIntent.parkingRequired) context.conditions.parkingRequired = true;
        if (llmIntent.cheaper) {
          const selectedRent = Number(String(context.selectedPropertySnapshot?.rent ?? '').replaceAll(',', '').match(/\d+(?:\.\d+)?/u)?.[0]);
          const currentRent = Number(context.conditions.maxRent);
          const baseline = Number.isFinite(selectedRent) ? selectedRent : currentRent;
          if (Number.isFinite(baseline)) context.conditions.maxRent = Math.max(0, baseline - 1);
        }
      }
      // 금액은 선택 조건입니다. 지역 또는 방 종류 하나만 알아도 추천합니다.
      const missingQuestion = !context.conditions.region && !context.conditions.propertyType
        ? '지역이나 방 종류를 알려주세요. 예: 진평동 미니투룸 추천해 줘. 보증금·월세는 입력하지 않아도 됩니다.'
        : null;
      if (missingQuestion) {
        const reply = await saveAssistant(service, conversation.id, missingQuestion, context);
        return send(res, 200, { ok: true, reply });
      }

      const properties = await searchProperties(service, context.conditions);
      const snapshot = recommendationSnapshot(properties);
      await service.from('ai_recommendations').delete().eq('conversation_id', conversation.id);
      if (snapshot.length) {
        const { error } = await service.from('ai_recommendations').insert(snapshot.map((item) => ({
          conversation_id: conversation.id,
          recommendation_number: item.recommendationNumber,
          property_id: item.propertyId,
          snapshot: item
        })));
        if (error) throw error;
      }
      context.recommendations = snapshot;
      // 검증된 목록을 바로 보냅니다. 두 번째 LLM 호출로 응답이 지연되지 않습니다.
      const reply = await saveAssistant(service, conversation.id, formatRecommendations(snapshot), context);
      return send(res, 200, { ok: true, reply, recommendations: snapshot });
    }

    return send(res, 400, { ok: false, error: '지원하지 않는 action입니다.' });
  } catch (error) {
    console.error('consultation operation failed', { action, code: error?.code || null });
    return send(res, 500, { ok: false, error: '상담 처리 중 오류가 발생했습니다.' });
  }
}
