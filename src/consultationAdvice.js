// Evidence-based answers to follow-up questions about a recommended listing.
const number = (v) => { const m=String(v??'').replaceAll(',','').match(/\d+(?:\.\d+)?/);return m?Number(m[0]):null; };
export function consultationQuestionKind(message) {
 const t=String(message||'');
 if (/비교|다른\s*방|다른\s*매물|더\s*좋|차이/u.test(t)) return 'compare';
 if (/계약|유리|안전|보증금\s*반환|위험|손해|확답|확실/u.test(t)) return 'contract';
 if (/장점|단점|왜\s*좋|좋은\s*방|추천\s*이유|어떤\s*방|특징/u.test(t)) return 'explain';
 return null;
}
export function explainSelectedProperty(selected, alternatives=[], kind='explain') {
 if (!selected) return '어느 매물인지 먼저 선택해 주세요. 추천 목록의 1번, 2번처럼 번호를 알려주시면 실제 등록 정보를 기준으로 설명하겠습니다.';
 const name=selected.listingNumber ? '매물번호 '+selected.listingNumber : (selected.title||'선택한 매물');
 const lines=[name+'의 등록 정보를 기준으로 안내드립니다.'];
 const deposit=number(selected.deposit),rent=number(selected.rent),fee=number(selected.maintenanceFee);
 if (kind==='compare') {
   const others=alternatives.filter(p=>String(p.propertyId)!==String(selected.propertyId)).slice(0,3);
   if (!others.length) return lines.concat('현재 비교할 다른 추천 매물이 없습니다. 동일 지역의 다른 공개 매물을 조회한 뒤 비교해야 정확합니다.').join('\n');
   for(const p of others) {
     const pr=number(p.rent),pf=number(p.maintenanceFee);
     const diff=rent!==null&&fee!==null&&pr!==null&&pf!==null ? '월세+관리비 기준 '+Math.abs(rent+fee-pr-pf)+'만원 '+(rent+fee<pr+pf?'저렴합니다':rent+fee>pr+pf?'높습니다':'차이가 없습니다') : '총 주거비 비교에 필요한 정보가 부족합니다';
     lines.push((p.listingNumber||p.title||'다른 매물')+'과 비교: '+diff+'. 면적·옵션·위치까지 확인해야 우열을 판단할 수 있습니다.');
   }
 } else {
   if(deposit!==null) lines.push('등록 보증금: '+deposit+'만원');
   if(rent!==null&&fee!==null) lines.push('월세와 관리비 합계: 월 '+(rent+fee)+'만원(별도 공과금 여부 확인 필요)');
   if(selected.area) lines.push('등록 면적: '+selected.area);
   if(selected.floorInfo) lines.push('층수: '+selected.floorInfo);
   if(selected.parking) lines.push('주차: '+selected.parking);
   if(selected.moveIn) lines.push('입주 가능일: '+selected.moveIn);
   if(selected.summary) lines.push('등록 설명: '+String(selected.summary).slice(0,220));
   if(kind==='contract') lines.push('계약의 유불리는 총 주거비와 초기 비용뿐 아니라 등기사항, 임대 권한, 선순위 권리, 관리비 내역, 계약 특약을 확인해야 판단할 수 있습니다. 현재 자료만으로 안전한 계약이라고 확답할 수 없습니다.');
   else lines.push('장점은 고객님의 예산·통근·주차·입주일 조건과 맞는 부분입니다. 확인되지 않은 채광·소음·건물 상태는 좋다고 단정하지 않겠습니다.');
 }
 lines.push('최종 계약 가능 여부와 현장 상태는 담당 공인중개사의 확인이 필요합니다.');
 return lines.join('\n');
}
