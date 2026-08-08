import { createClient } from '@supabase/supabase-js';

const MAX_CHUNK_RECORDS = 1000;
const MAX_REQUEST_BYTES = 2_500_000;
const QUICK_PUBLIC_REQUIRED_FIELDS = ['address', 'real_unit', 'category', 'deposit', 'rent', 'maintenance_fee', 'area', 'floor_info', 'direction', 'parking', 'move_in', 'approval_date', 'legal_notice'];

function missingQuickPublicFields(property = {}) {
  return QUICK_PUBLIC_REQUIRED_FIELDS.filter((field) => !String(property[field] ?? '').trim());
}

function send(res, status, payload) {
  res.setHeader('Cache-Control', 'no-store');
  return res.status(status).json(payload);
}

function createServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function requireImportAdmin(req, service) {
  const authorization = String(req.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return { error: 'Supabase Auth 로그인이 필요합니다.', status: 401 };

  const { data, error } = await service.auth.getUser(token);
  if (error || !data?.user) return { error: '관리자 세션을 확인할 수 없습니다.', status: 401 };

  const user = data.user;
  const role = String(user.app_metadata?.role || '').toLowerCase();
  const allowlist = String(process.env.GUMI_IMPORT_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const allowed = ['admin', 'owner'].includes(role) || allowlist.includes(String(user.email || '').toLowerCase());
  if (!allowed) return { error: '구미공실 import 관리자 권한이 없습니다.', status: 403 };
  return { user };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { ok: false, error: 'POST만 허용됩니다.' });
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_REQUEST_BYTES) return send(res, 413, { ok: false, error: '요청 크기가 너무 큽니다.' });

  const service = createServiceClient();
  if (!service) {
    return send(res, 503, {
      ok: false,
      error: '서버 전용 Supabase 인증이 구성되지 않아 write API가 비활성화되어 있습니다.'
    });
  }

  const auth = await requireImportAdmin(req, service);
  if (auth.error) return send(res, auth.status, { ok: false, error: auth.error });

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const action = String(body.action || '');

  try {
    if (action === 'create_batch') {
      const { data, error } = await service.rpc('gumi_create_import_batch', { p_user_id: auth.user.id });
      if (error) throw error;
      return send(res, 200, { ok: true, batch: data });
    }

    if (action === 'get_batch') {
      const { data, error } = await service
        .from('gumi_import_batches')
        .select('id,status,chunk_count,total_count,new_count,updated_count,unchanged_count,duplicate_count,error_count,missing_count,started_at,completed_at')
        .eq('id', body.batchId)
        .maybeSingle();
      if (error) throw error;
      return send(res, 200, { ok: true, batch: data });
    }

    if (action === 'get_open_batch') {
      const { data, error } = await service
        .from('gumi_import_batches')
        .select('id,status,chunk_count,total_count,new_count,updated_count,unchanged_count,duplicate_count,error_count,missing_count,started_at,completed_at')
        .eq('status', 'open')
        .eq('created_by', auth.user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return send(res, 200, { ok: true, batch: data });
    }

    if (action === 'import_chunk') {
      const records = Array.isArray(body.records) ? body.records : [];
      if (!records.length || records.length > MAX_CHUNK_RECORDS) {
        return send(res, 400, { ok: false, error: 'chunk는 1~1,000건이어야 합니다.' });
      }
      const safeRecords = records.map((record) => ({
        rowNumber: record.rowNumber,
        address: record.address,
        normalizedAddress: record.normalizedAddress,
        unit: record.unit,
        sourcePropertyType: record.sourcePropertyType,
        depositAmount: record.depositAmount,
        rentAmount: record.rentAmount,
        managementFeeAmount: record.managementFeeAmount,
        sourceRegisteredAt: record.sourceRegisteredAt,
        sourceIntSeq: record.sourceIntSeq,
        canonicalIdentity: record.canonicalIdentity,
        disposition: record.disposition,
        errors: Array.isArray(record.errors) ? record.errors.slice(0, 10) : []
      }));
      const { data, error } = await service.rpc('gumi_import_chunk', {
        p_batch_id: body.batchId,
        p_items: safeRecords
      });
      if (error) throw error;
      return send(res, 200, { ok: true, batch: data });
    }

    if (action === 'finalize_preview') {
      const { data, error } = await service.rpc('gumi_batch_finalize_preview', { p_batch_id: body.batchId });
      if (error) throw error;
      return send(res, 200, { ok: true, preview: data });
    }

    if (action === 'finalize') {
      const force = Boolean(body.force);
      const confirmation = String(body.confirmation || '');
      if (force && confirmation !== '전체 가져오기 완료') {
        return send(res, 400, { ok: false, error: '강한 확인 문구가 일치하지 않습니다.' });
      }
      const { data, error } = await service.rpc('gumi_finalize_import_batch', {
        p_batch_id: body.batchId,
        p_user_id: auth.user.id,
        p_force: force,
        p_confirmation: confirmation
      });
      if (error) throw error;
      return send(res, 200, { ok: true, result: data });
    }

    if (action === 'list_quick_review') {
      const { data, error } = await service
        .from('properties')
        .select('id,listing_number,title,address,real_unit,category,deposit,rent,maintenance_fee,area,floor_info,direction,parking,move_in,approval_date,legal_notice,status,ad_visibility,review_state,availability_status')
        .eq('listing_type', 'quick')
        .eq('review_state', 'pending_review')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return send(res, 200, { ok: true, properties: (data || []).map((property) => ({ ...property, missing_fields: missingQuickPublicFields(property) })) });
    }

    if (action === 'approve_quick') {
      const { data, error } = await service.rpc('gumi_approve_quick_property', { p_property_id: body.propertyId });
      if (error) throw error;
      return send(res, data?.ok ? 200 : 409, data);
    }

    if (action === 'enrich_quick' || action === 'promote_quick') {
      const propertyId = String(body.propertyId || '');
      const input = body.property && typeof body.property === 'object' ? body.property : {};
      const allowedFields = [
        'title', 'category', 'property_type', 'trade_type', 'address', 'badges', 'deposit', 'rent',
        'maintenance_fee', 'sale_price', 'loan_amount', 'interest_rate', 'total_deposit',
        'acquisition_price', 'total_monthly_rent', 'monthly_interest', 'net_profit', 'annual_net_income',
        'return_rate', 'total_units', 'rented_units', 'vacant_units', 'room_count', 'mini_two_count',
        'two_room_count', 'owner_unit', 'area', 'land_area', 'building_area', 'building_name',
        'floor_info', 'direction', 'parking', 'move_in', 'approval_date', 'main_use', 'floor_count',
        'basement_floor_count', 'total_floor_info', 'total_area', 'room_bath', 'structure', 'elevator',
        'remodeling', 'roof_waterproof', 'building_condition', 'summary', 'description',
        'maintenance_includes', 'location_description', 'recommended_for', 'photo_captions',
        'legal_notice', 'investment_point', 'risk_note', 'photos', 'map_image', 'map_link',
        'convenience', 'safety', 'education', 'is_featured', 'latitude', 'longitude', 'geocode_status',
        'geocoded_at', 'private_memo', 'real_unit', 'entrance_password', 'key_location', 'owner_name',
        'owner_phone', 'client_info', 'request_method', 'staff_memo', 'internal_tags', 'staff_name',
        'staff_code', 'created_by', 'updated_by'
      ];
      const hasUsefulValue = (value) => {
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'string') return value.trim().length > 0;
        return value !== null && value !== undefined;
      };
      const update = Object.fromEntries(allowedFields
        .filter((field) => field !== 'photos' && Object.hasOwn(input, field) && hasUsefulValue(input[field]))
        .map((field) => [field, input[field]]));

      const { data: existing, error: existingError } = await service
        .from('properties')
        .select('id,listing_type,photos,address,real_unit,category,deposit,rent,area,floor_info,direction,parking,move_in,availability_status')
        .eq('id', propertyId)
        .maybeSingle();
      if (existingError) throw existingError;
      if (!existing || existing.listing_type !== 'quick') {
        return send(res, 409, { ok: false, error: '승격 가능한 quick 매물이 아닙니다.' });
      }

      const mergedPhotos = [...new Set([
        ...(Array.isArray(existing.photos) ? existing.photos : []),
        ...(Array.isArray(input.photos) ? input.photos : [])
      ].filter((value) => typeof value === 'string' && value.trim()))];
      if (mergedPhotos.length) update.photos = mergedPhotos;

      const merged = { ...existing, ...update, photos: mergedPhotos };
      const minimumPublicReady = missingQuickPublicFields(merged).length === 0;
      const normalReady = mergedPhotos.length > 0 && ['area', 'floor_info', 'direction', 'parking', 'move_in']
        .every((field) => String(merged[field] ?? '').trim());
      update.listing_type = normalReady ? 'normal' : 'quick';
      update.availability_status = existing.availability_status === 'missing' ? 'missing' : 'active';
      update.status = minimumPublicReady && update.availability_status === 'active' ? 'published' : 'pending';
      update.ad_visibility = minimumPublicReady && update.availability_status === 'active' ? '공개' : '비공개';
      update.review_state = minimumPublicReady ? 'approved' : 'pending_review';
      update.updated_at = new Date().toISOString();

      const { data: promoted, error: promoteError } = await service
        .from('properties')
        .update(update)
        .eq('id', propertyId)
        .eq('listing_type', 'quick')
        .select('id,listing_number,listing_type,status,review_state')
        .single();
      if (promoteError) throw promoteError;
      if (normalReady) {
        const { error: sourceError } = await service
          .from('property_sources')
          .update({ promoted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('property_id', propertyId)
          .eq('source_type', 'gumi_vacancy');
        if (sourceError) throw sourceError;
      }
      return send(res, 200, { ok: true, property: promoted });
    }

    return send(res, 400, { ok: false, error: '지원하지 않는 action입니다.' });
  } catch (error) {
    // Do not log request bodies or imported source text.
    console.error('gumi import operation failed', { action, code: error?.code || null });
    return send(res, 500, { ok: false, error: error?.message || '가져오기 작업에 실패했습니다.' });
  }
}
