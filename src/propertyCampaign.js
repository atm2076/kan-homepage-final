import { explainSelectedProperty } from './consultationAdvice.js';

// A single evidence-based description is reused by consultation and ad drafts.
// Generated drafts are NOT automatically published.
export function buildPropertyCampaign(property, alternatives = []) {
  if (!property?.propertyId || !property?.listingNumber) throw new Error('매물번호와 매물 ID가 필요합니다.');
  const location = String(property.address || '').trim();
  const title = String(property.title || '매물 안내').trim();
  const intro = [location, title].filter(Boolean).join(' | ');
  const explanation = explainSelectedProperty(property, alternatives, 'explain');
  const comparison = explainSelectedProperty(property, alternatives, 'compare');
  const caution = '실제 매물 상태와 계약 조건은 담당 공인중개사를 통해 재확인하세요.';
  const link = property.detailUrl || '/#/listing/' + encodeURIComponent(property.propertyId);
  const facts = explanation + '\n' + caution;
  return {
    propertyId: property.propertyId,
    listingNumber: property.listingNumber,
    status: 'draft',
    approvalRequired: true,
    source: 'verified-listing-snapshot',
    blog: { title: intro, body: intro + '\n\n' + facts + '\n\n[다른 매물과 비교]\n' + comparison + '\n\n상세 매물: ' + link },
    instagram: { caption: intro + '\n' + facts + '\n매물번호 ' + property.listingNumber, mediaRequired: true },
    facebook: { text: intro + '\n' + facts + '\n' + link, mediaRequired: true },
    youtube: { title: intro.slice(0,100), description: facts + '\n' + link, videoRequired: true },
    tiktok: { script: '이 매물을 선택하면 어떤 점이 좋을까요?\n' + facts, videoRequired: true },
    warnings: ['매물 공개 상태와 사실관계 재확인 필요', '채널별 광고 표시·계정 권한·게시 정책 검증 필요']
  };
}
