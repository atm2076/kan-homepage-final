import React, { useEffect, useMemo, useState } from 'react';
import { parseGumiVacancyMarkdown } from './gumiVacancyParser';

const CONFIRMATION_TEXT = '전체 가져오기 완료';

function Stat({ label, value }) {
  return <div className="gumi-import-stat"><span>{label}</span><strong>{value ?? 0}</strong></div>;
}

export default function GumiVacancyImport({ supabase, onReload }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [session, setSession] = useState(null);
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [batch, setBatch] = useState(null);
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState('');
  const [quickReview, setQuickReview] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase?.auth.getSession().then(({ data }) => {
      if (mounted) setSession(data?.session || null);
    });
    const { data: subscription } = supabase?.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession)) || {};
    return () => {
      mounted = false;
      subscription?.subscription?.unsubscribe?.();
    };
  }, [supabase]);

  const stats = useMemo(() => ({
    total: analysis?.totalCount || 0,
    recent90: analysis?.recent90Count || 0,
    ready: analysis?.readyCount || 0,
    duplicate: analysis?.duplicateReviewCount || 0,
    errors: analysis?.errorCount || 0
  }), [analysis]);

  async function callApi(payload) {
    const token = session?.access_token;
    if (!token) throw new Error('별도의 Supabase Auth 관리자 로그인이 필요합니다.');
    const response = await fetch('/api/gumi-vacancy-import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    const result = await response.json();
    if (!response.ok || result?.ok === false) {
      const error = new Error(result?.error || '요청에 실패했습니다.');
      error.payload = result;
      throw error;
    }
    return result;
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPassword('');
    setBusy(false);
    setMessage(error ? `로그인 실패: ${error.message}` : '안전한 import 관리자 로그인이 완료됐습니다.');
  }

  function analyze() {
    const result = parseGumiVacancyMarkdown(text, { maxRecords: 1000 });
    setAnalysis(result);
    setPreview(null);
    setMessage(`${result.totalCount}건을 분석했습니다. 원본 텍스트는 브라우저 메모리에만 있으며 서버로 전송되지 않습니다.`);
  }

  async function run(label, operation) {
    setBusy(true);
    setMessage(label);
    try {
      await operation();
    } catch (error) {
      setMessage(error?.message || '작업에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  }

  function startBatch() {
    return run('전체 갱신 batch를 생성하고 있습니다.', async () => {
      const result = await callApi({ action: 'create_batch' });
      setBatch(result.batch);
      setPreview(null);
      setMessage(`Batch ${result.batch.id}가 생성됐습니다. 1,000건씩 계속 추가할 수 있습니다.`);
    });
  }

  function resumeBatch() {
    return run('열린 전체 갱신 작업을 확인하고 있습니다.', async () => {
      const result = await callApi({ action: 'get_open_batch' });
      setBatch(result.batch || null);
      setPreview(null);
      setMessage(result.batch ? `열린 Batch ${result.batch.id}를 재개했습니다.` : '재개할 열린 batch가 없습니다.');
    });
  }

  function importChunk() {
    if (!batch?.id || !analysis?.records?.length) return;
    return run('현재 chunk를 저장하고 있습니다.', async () => {
      const result = await callApi({ action: 'import_chunk', batchId: batch.id, records: analysis.records });
      setBatch(result.batch);
      setText('');
      setAnalysis(null);
      setPreview(null);
      setMessage('현재 chunk를 저장했습니다. 이 단계에서는 기존 매물을 missing 처리하지 않습니다.');
    });
  }

  function loadFinalizePreview() {
    if (!batch?.id) return;
    return run('완료 전 건수 차이를 확인하고 있습니다.', async () => {
      const result = await callApi({ action: 'finalize_preview', batchId: batch.id });
      setPreview(result.preview);
      setMessage(result.preview.requiresStrongConfirmation
        ? '이전 batch 대비 15% 이상 감소했습니다. missing 처리 전 강한 재확인이 필요합니다.'
        : '건수 검토가 완료됐습니다.');
    });
  }

  function finalizeBatch() {
    if (!batch?.id || !preview) return;
    const force = Boolean(preview.requiresStrongConfirmation);
    return run('전체 batch를 완료하고 있습니다.', async () => {
      const result = await callApi({
        action: 'finalize',
        batchId: batch.id,
        force,
        confirmation: force ? confirmation : ''
      });
      setBatch((current) => ({ ...current, ...result.result, status: 'completed' }));
      setMessage(`전체 가져오기가 완료됐습니다. missing ${result.result.missingCount || 0}건.`);
      setConfirmation('');
      await onReload?.();
    });
  }

  function loadQuickReview() {
    return run('검수대기 간편매물을 불러오고 있습니다.', async () => {
      const result = await callApi({ action: 'list_quick_review' });
      setQuickReview(result.properties || []);
      setMessage(`검수대기 간편매물 ${result.properties?.length || 0}건을 불러왔습니다.`);
    });
  }

  function approveQuick(propertyId) {
    return run('필수 공개정보를 확인하고 있습니다.', async () => {
      try {
        await callApi({ action: 'approve_quick', propertyId });
        setQuickReview((items) => items.filter((item) => item.id !== propertyId));
        setMessage('간편매물을 최소정보 기준으로 공개했습니다. 사진은 없어도 사진 준비중으로 노출됩니다.');
        await onReload?.();
      } catch (error) {
        const fields = error?.payload?.missingFields;
        throw new Error(Array.isArray(fields)
          ? `공개 필수정보가 부족합니다: ${fields.join(', ')}`
          : error.message);
      }
    });
  }

  return (
    <section className="gumi-import-page">
      <div className="gumi-import-header">
        <div><p className="section-eyebrow">GUMI VACANCY</p><h2>구미공실 가져오기</h2></div>
        <span className={`gumi-auth-chip ${session ? 'ok' : 'warn'}`}>{session ? '서버 검증 로그인됨' : '쓰기 잠김'}</span>
      </div>

      {!session && (
        <form className="gumi-auth-form" onSubmit={signIn}>
          <strong>Supabase Auth 관리자 로그인</strong>
          <p>기존 Vite 관리자 비밀번호는 사용할 수 없습니다. 서버가 검증하는 관리자 계정이 없으면 write API는 차단됩니다.</p>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="관리자 이메일" required />
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="관리자 비밀번호" required />
          <button type="submit" disabled={busy}>안전한 관리자 로그인</button>
        </form>
      )}

      <div className="gumi-batch-toolbar">
        <button type="button" onClick={startBatch} disabled={!session || busy || batch?.status === 'open'}>전체 갱신 작업 시작</button>
        <button type="button" onClick={resumeBatch} disabled={!session || busy}>열린 작업 재개</button>
        <span>현재 batch: {batch?.id || '없음'}</span>
        <span>상태: {batch?.status || '-'}</span>
      </div>

      <textarea
        className="gumi-import-textarea"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={18}
        placeholder="구미공실 자료를 한 번에 최대 1,000건 붙여넣으세요. 원본은 저장하거나 서버로 보내지 않습니다."
      />
      <div className="gumi-import-actions">
        <button type="button" onClick={analyze} disabled={!text.trim() || busy}>분석하기</button>
        <button type="button" onClick={importChunk} disabled={!session || !batch?.id || batch.status !== 'open' || !analysis?.records?.length || busy}>현재 1,000건 추가</button>
      </div>

      <div className="gumi-import-stats">
        <Stat label="분석 전체" value={stats.total} />
        <Stat label="최근 90일" value={stats.recent90} />
        <Stat label="저장 가능" value={stats.ready} />
        <Stat label="중복확인 필요" value={stats.duplicate} />
        <Stat label="오류" value={stats.errors} />
        <Stat label="Batch 누적" value={batch?.total_count} />
        <Stat label="신규" value={batch?.new_count} />
        <Stat label="갱신" value={batch?.updated_count} />
      </div>

      {analysis?.records?.length > 0 && (
        <div className="gumi-preview-table-wrap"><table className="gumi-preview-table"><thead><tr><th>#</th><th>주소</th><th>호실</th><th>종류</th><th>보증금/월세</th><th>판정</th></tr></thead><tbody>
          {analysis.records.slice(0, 100).map((item) => <tr key={`${item.rowNumber}-${item.sourceIntSeq || item.canonicalIdentity}`}><td>{item.rowNumber}</td><td>{item.address || '-'}</td><td>{item.unit || '불확실'}</td><td>{item.sourcePropertyType || '-'}</td><td>{item.depositAmount ?? '-'} / {item.rentAmount ?? '-'}</td><td>{item.disposition}</td></tr>)}
        </tbody></table>{analysis.records.length > 100 && <p>미리보기는 앞 100건만 표시합니다.</p>}</div>
      )}

      {batch?.status === 'open' && (
        <section className="gumi-finalize-panel">
          <h3>전체 가져오기 완료</h3>
          <p>이 버튼을 누르기 전에는 기존 quick 매물을 missing 처리하지 않습니다.</p>
          <button type="button" onClick={loadFinalizePreview} disabled={busy}>이전 batch와 건수 비교</button>
          {preview && <div className={preview.requiresStrongConfirmation ? 'gumi-drop-warning' : 'gumi-count-preview'}>
            <p>이번 batch: <strong>{preview.currentTotal}</strong></p><p>이전 completed batch: <strong>{preview.previousTotal}</strong></p><p>차이: <strong>{preview.difference}</strong></p><p>감소율: <strong>{Math.max(0, Number(preview.dropRatio || 0) * 100).toFixed(1)}%</strong></p>
            {preview.requiresStrongConfirmation && <><strong>15% 이상 급감했습니다. 자료 누락 여부를 다시 확인하세요.</strong><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={CONFIRMATION_TEXT} /></>}
            <button type="button" onClick={finalizeBatch} disabled={busy || (preview.requiresStrongConfirmation && confirmation !== CONFIRMATION_TEXT)}>전체 가져오기 완료 확정</button>
          </div>}
        </section>
      )}

      <section className="gumi-quick-review"><div><h3>최소정보 미충족 간편매물 검수</h3><button type="button" onClick={loadQuickReview} disabled={!session || busy}>검수대기 불러오기</button></div>
        {quickReview.map((property) => <article key={property.id}><div><strong>매물번호 {property.listing_number} · {property.title}</strong><p>{property.address} / {property.real_unit || '호실 미확인'} · {property.deposit}/{property.rent}</p>{property.missing_fields?.length > 0 && <p className="gumi-missing-fields">공개 필수정보 부족: {property.missing_fields.join(', ')}</p>}</div><button type="button" onClick={() => approveQuick(property.id)} disabled={busy || property.missing_fields?.length > 0}>필수정보 확인 후 공개</button></article>)}
      </section>
      <p className="status-text" role="status">{message}</p>
    </section>
  );
}
