# AI 매물 상담 운영 설계

## 공개 매물 검색 범위

상담 엔진은 `status = published`, `ad_visibility = 공개`,
`availability_status = active`, `review_state = approved` 조건을 모두 만족하는
매물만 검색한다. `listing_type = quick`은 제외 조건이 아니다.

`missing`, `unavailable`, `expired`, 비공개, 검수대기 매물은 모델 입력과 추천
후보에 포함하지 않는다. 공개 검색용 projection/view에는 내부 전화번호, 출입
비밀번호, 고객정보, 비공개 메모 등 사적 필드를 포함하지 않는다.

## 추천 순위

조건 일치도와 가격 적합도가 같은 경우 다음 순서로 정렬한다.

1. 사진이 하나 이상인 `normal`
2. 사진이 하나 이상인 `quick`
3. 사진이 없는 active/public `quick`

사진이 없는 quick은 후보에서 제외하지 않으며 응답에 `사진 준비중`을 명시한다.
사진이 일부라도 있으면 등록된 사진을 즉시 사용하고 사진 수 부족으로 감점하거나
비공개 처리하지 않는다.

권장 정렬 키는 다음과 같다.

```sql
order by
  case
    when listing_type = 'normal' and cardinality(photos) > 0 then 1
    when listing_type = 'quick' and cardinality(photos) > 0 then 2
    else 3
  end,
  updated_at desc
```

## 구미공실 생명주기 연동

- active quick은 공개 후보가 되며, 법정 표시정보 검증을 통과해 published/public/approved가 된 뒤 공개 검색 대상이 된다.
- 사진과 상세정보는 동일한 `properties.id`에 점진적으로 추가한다.
- 사진과 핵심 상세정보가 충분해지면 동일 행을 `normal`로 승격한다.
- 승격 전후 `properties.id`, `listing_number`, 상세 URL은 변하지 않는다.
- 전체 동기화 완료 후 원본에서 사라진 호실은 quick/normal 여부와 관계없이
  `availability_status = missing`이 되어 홈페이지와 AI 검색에서 즉시 제외된다.
  normal의 사진과 상세정보는 보존되며 source 변경 알림도 함께 남긴다.
- 다음 batch에서 다시 확인되면 `active`로 복구되어 다시 검색할 수 있다.

## 상담 응답 규칙

고객 조건이 부족하면 지역, 방 종류, 보증금, 월세, 입주일 순으로 한 번에 하나씩
확인한다. 추천 결과에는 공개 정보만 넣고, 방보기 의사가 확인되면 기존 상담 상태를
직원 인계 상태로 전환한다. 웹 채팅과 SMS 어댑터는 동일한 검색·대화 엔진을 사용한다.
