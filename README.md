# 칸공인중개사 홈페이지 완성본

## 1. Supabase 설정
1. Supabase 프로젝트 접속
2. SQL Editor 클릭
3. `supabase.sql` 전체 복사 후 실행
4. Project Settings > API에서 아래 2개 복사
   - Project URL
   - anon public key

## 2. Vercel 환경변수
Vercel 프로젝트 > Settings > Environment Variables에 아래 3개 추가

```bash
VITE_SUPABASE_URL=https://프로젝트주소.supabase.co
VITE_SUPABASE_ANON_KEY=anon-public-key
VITE_ADMIN_PASSWORD=3883
```

추가 후 반드시 Vercel에서 Redeploy 해야 반영됩니다.

## 3. 로컬 실행
```bash
npm install
npm run dev
```

## 4. 관리자 사용
홈페이지 오른쪽 아래 `🔒 관리자` 버튼 클릭 후 비밀번호 입력.
기본 비밀번호는 `.env` 또는 Vercel 환경변수의 `VITE_ADMIN_PASSWORD` 값입니다.

## 5. 사진 입력 방식
현재 버전은 사진을 직접 업로드하는 방식이 아니라, 이미지 URL을 한 줄씩 입력하는 방식입니다.
예: 네이버 블로그 이미지 주소, Supabase Storage 공개 URL, 직접 보유한 이미지 URL 등.

## 6. 중요한 보안 안내
이 완성본은 빠르게 실제 화면을 완성하고 매물 등록/삭제까지 되게 만든 실사용 초안입니다.
브라우저 관리자 비밀번호 방식은 고급 보안 방식이 아닙니다.
직원별 로그인, 권한관리, 이미지 직접 업로드, 완전한 보안이 필요하면 Supabase Auth + Storage + 서버 API 구조로 확장해야 합니다.
