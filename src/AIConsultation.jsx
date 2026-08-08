import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'kanAiConsultation';

async function post(payload, token) {
  const response = await fetch('/api/ai-consultation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(payload)
  });
  const responseText = await response.text();
  let result = null;
  try { result = responseText ? JSON.parse(responseText) : null; } catch { result = null; }
  if (!response.ok || result?.ok === false) throw new Error(result?.error || '상담 요청에 실패했습니다.');
  return result;
}

export function openAiConsultation(propertyId = null) {
  window.dispatchEvent(new CustomEvent('kan:ai-open', { detail: { propertyId } }));
}

export default function AIConsultation() {
  const [open, setOpen] = useState(false);
  const [conversation, setConversation] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
  });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    const listener = (event) => {
      setOpen(true);
      if (event.detail?.propertyId) start(event.detail.propertyId, true);
    };
    window.addEventListener('kan:ai-open', listener);
    return () => window.removeEventListener('kan:ai-open', listener);
  }, [conversation]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function start(propertyId = null, force = false) {
    if (conversation && !force) return conversation;
    setBusy(true);
    try {
      const result = await post({ action: 'start', propertyId });
      const next = { conversationId: result.conversationId, accessToken: result.accessToken };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setConversation(next);
      setMessages([{ role: 'assistant', content: result.reply }]);
      return next;
    } catch (error) {
      setMessages([{ role: 'assistant', content: error.message }]);
      return null;
    } finally { setBusy(false); }
  }

  async function toggle() {
    setOpen((value) => !value);
    if (!conversation) await start();
  }

  async function submit(event) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    let active = conversation;
    if (!active) active = await start();
    if (!active) return;
    setInput('');
    setMessages((items) => [...items, { role: 'customer', content: message }]);
    setBusy(true);
    try {
      const result = await post({ action: 'message', ...active, message });
      setMessages((items) => [...items, { role: 'assistant', content: result.reply, recommendations: result.recommendations || [] }]);
    } catch (error) {
      setMessages((items) => [...items, { role: 'assistant', content: error.message }]);
    } finally { setBusy(false); }
  }

  function reset() {
    sessionStorage.removeItem(STORAGE_KEY);
    setConversation(null);
    setMessages([]);
    start();
  }

  return <>
    <button type="button" className="ai-consultation-fab" onClick={toggle}>AI 매물상담</button>
    {open && <aside className="ai-consultation-panel" aria-label="AI 매물상담">
      <header><div><strong>칸 AI 매물상담</strong><small>현재 공개 공실만 검색합니다</small></div><button type="button" onClick={() => setOpen(false)}>×</button></header>
      <div className="ai-consultation-messages">
        {!messages.length && <p className="ai-message assistant">상담을 시작하고 있습니다.</p>}
        {messages.map((message, index) => message.recommendations?.length
          ? <div key={`${message.role}-${index}`} className={`ai-message ${message.role}`}>
            {message.recommendations.map((recommendation) => <a key={recommendation.propertyId} href={recommendation.detailUrl}>
              {recommendation.recommendationNumber}. {recommendation.address} · 보증금 {recommendation.deposit || '-'} / 월세 {recommendation.rent || '-'}{recommendation.photoStatus === 'preparing' ? ' · 사진 준비중' : ''}
            </a>)}
          </div>
          : <p key={`${message.role}-${index}`} className={`ai-message ${message.role}`}>{message.content}</p>)}
        {busy && <p className="ai-message assistant">확인 중입니다…</p>}
        <div ref={endRef} />
      </div>
      <form onSubmit={submit}><input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1000} placeholder="예: 인의동 미투 보증금 300 월세 30" /><button disabled={busy}>전송</button></form>
      <button type="button" className="ai-new-chat" onClick={reset}>새 상담 시작</button>
    </aside>}
  </>;
}

export function AIConsultationCallout() {
  return <section className="ai-consultation-callout"><div><strong>원하는 매물을 못 찾으셨나요?</strong><p>AI가 현재 등록된 공실에서 조건에 맞는 방을 찾아드립니다.</p></div><button type="button" onClick={() => openAiConsultation()}>AI에게 찾아달라고 하기</button></section>;
}

export function ViewingRequestsAdmin({ supabase, onCount }) {
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function call(payload) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('구미공실 메뉴에서 Supabase Auth 관리자 로그인이 필요합니다.');
    return post(payload, token);
  }

  async function load() {
    setBusy(true);
    try {
      const result = await call({ action: 'admin_list_viewing_requests' });
      setItems(result.requests || []);
      onCount?.(result.newCount || 0);
      setMessage(`신규 ${result.newCount || 0}건 / 전체 ${result.requests?.length || 0}건`);
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  }

  async function update(id, staffStatus) {
    setBusy(true);
    try {
      await call({ action: 'admin_update_viewing_request', requestId: id, staffStatus });
      await load();
    } catch (error) { setMessage(error.message); setBusy(false); }
  }

  useEffect(() => { load(); }, []);

  return <section className="viewing-admin"><div className="viewing-admin-head"><h3>방보기 요청</h3><button type="button" onClick={load} disabled={busy}>새로고침</button></div><p>{message}</p>
    {items.map((item) => <article key={item.id}><div><strong>{item.customer_name} · {item.customer_phone}</strong><p>{item.desired_date} {String(item.desired_time).slice(0, 5)} · 매물번호 {item.properties?.listing_number || '-'}</p><p>{item.properties?.address || ''}</p><small>{item.consultation_summary}</small></div><select value={item.staff_status} onChange={(event) => update(item.id, event.target.value)} disabled={busy}><option value="new">신규</option><option value="contacted">연락함</option><option value="confirmed">일정확정</option><option value="completed">완료</option><option value="cancelled">취소</option></select></article>)}
  </section>;
}
