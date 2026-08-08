# Production 배포 및 rollback 절차

## 사전 조건

- Supabase project ref와 CLI access token
- DB password 또는 연결 가능한 migration 권한
- production 서버의 `SUPABASE_SERVICE_ROLE_KEY`
- `GUMI_IMPORT_ADMIN_EMAILS` 또는 Auth 사용자의 `app_metadata.role=admin|owner`
- Vercel 프로젝트 권한

비밀값은 브라우저 환경변수나 `VITE_` 접두사에 넣지 않는다.

## 백업

migration 전에 Supabase의 point-in-time recovery/수동 backup 가능 상태와 최근
복구 시점을 확인한다. 추가로 영향을 받는 기존 테이블을 별도 schema에 복사한다.

```sql
begin;
create schema if not exists pre_gumi_import_backup;
create table pre_gumi_import_backup.properties_20260808 as table public.properties;
commit;
```

신규 테이블은 migration 전에는 존재하지 않으므로 기존 `properties`가 핵심 rollback
대상이다. backup 행 수와 `properties` 행 수가 같은지 확인한 뒤 진행한다.

## 적용

두 migration은 각각 transaction 경계 안에서 실행한다. 첫 migration 성공 후 공개
조회가 정상인지 확인하고 두 번째 migration을 실행한다. 오류 발생 시 해당 transaction은
rollback하고 코드 배포를 중단한다.

## rollback

코드 배포를 이전 commit으로 되돌린 후, 신규 함수와 테이블을 의존성 역순으로 제거한다.
기존 `properties`의 세 신규 컬럼은 즉시 삭제하지 않는다. 데이터 보존 후 이전 코드가
무시하도록 두는 것이 안전하다. 기존 행 손상이 확인된 경우에만 maintenance window에서
backup과 현재 데이터를 비교한 뒤 선택 복구한다. 전체 테이블 덮어쓰기는 금지한다.
