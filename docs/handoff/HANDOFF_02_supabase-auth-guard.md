# Handoff: Module 02 - Next.js ↔ Supabase 연동 & 인증 가드

## 완료 상태
- [x] 구현 완료

## 무엇을 했는가

### 패키지
- `@supabase/supabase-js`, `@supabase/ssr` 설치 (npm audit 취약점 0건)

### 생성/수정한 파일

| 경로 | 역할 |
|---|---|
| `.env.local` | 로컬 개발용 Supabase URL/키 (**커밋 안 됨**) |
| `.env.example` | 필요한 환경변수 이름만 기록한 예시 파일 (커밋됨) |
| `.gitignore` | `.env*` 규칙에 `!.env.example` 예외 추가 |
| `lib/supabase/client.ts` | 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트 |
| `lib/supabase/server.ts` | 서버 컴포넌트/Server Action/Route Handler용 클라이언트 (쿠키 기반) |
| `lib/supabase/middleware.ts` | 세션 갱신 + 인증 가드 본체 |
| `middleware.ts` | Next.js 미들웨어 진입점 (정적 파일 제외 matcher) |
| `app/(dashboard)/page.tsx` | 보호된 대시보드 자리표시자 — 현재 세션의 이메일/사용자 ID 표시 |
| `app/(auth)/login/page.tsx` | 로그인 페이지 자리표시자 (실제 폼은 Module 3) |
| `app/api/dev-session/route.ts` | **개발 전용 임시** 로그인/로그아웃 API (테스트용, Module 3에서 삭제) |
| `app/layout.tsx` | metadata 한국어화, `lang="ko"` |
| `app/page.tsx` | 삭제 (`app/(dashboard)/page.tsx`가 `/` 를 담당) |

### 주요 구현 결정

1. **인증 가드 정책**: `PUBLIC_PATHS = ['/login', '/signup', '/auth']` 외 모든 경로는 로그인 필요. 비로그인 시 `/login?redirectTo=<원래경로>` 로 리다이렉트하여 Module 3에서 로그인 후 복귀 처리를 붙일 수 있게 했다.
2. **API 경로는 리다이렉트 대신 401 JSON**: 처음엔 모든 경로를 동일하게 리다이렉트했는데, 그러면 API 호출 시 클라이언트가 로그인 HTML을 JSON으로 파싱하다 깨진다. `/api/*` 는 `{"error":"Unauthorized"}` + 401을 반환하도록 분기했다. (FINAL_QA 2.5-3 "에러 응답이 이상하게 나가지 않을 것"과도 연결)
3. **로그인 상태에서 `/login`·`/signup` 접근 시 대시보드로 리다이렉트** (FINAL_QA 2.1-8 대비).
4. **`supabase.auth.getUser()` 사용** (getSession 아님): 쿠키 내용을 그대로 신뢰하지 않고 Supabase 서버에 사용자 유효성을 검증하기 위함.
5. **임시 dev 라우트의 이중 안전장치**: `app/api/dev-session/route.ts`는 (a) `NODE_ENV === 'production'`이면 404를 반환하고, (b) 미들웨어의 dev 전용 공개 경로 목록도 개발 환경에서만 적용된다. 자격증명은 코드에 하드코딩하지 않고 요청 body로 받는다.

## 테스트 결과

### 로컬 (http://localhost:3210)

| 케이스 | 기대 | 결과 |
|---|---|---|
| 비로그인 `/` | 로그인으로 리다이렉트 | 307 → `/login?redirectTo=%2F` ✅ |
| 비로그인 `/members`, `/attendance`, `/members/abc` | 리다이렉트 | 307 + redirectTo 파라미터 정확 ✅ |
| 비로그인 `/login` | 200 | 200 ✅ |
| 비로그인 `/api/whatever` | 401 JSON | `{"error":"Unauthorized"}` ✅ |
| 임시 API로 로그인 | 세션 쿠키 발급 | `sb-xfnlckoowyajsmzmmhdn-auth-token` 발급 ✅ |
| 로그인 상태 `/` | 200 + 세션 정보 표시 | 200, 화면에 이메일·사용자 ID 렌더링 확인 ✅ |
| 로그인 상태 `/members` | 404 (아직 없는 페이지) | 404 — 가드는 통과, 페이지만 없음 ✅ |
| 로그인 상태 `/login` | 대시보드로 | 307 → `/` ✅ |
| 로그아웃 후 `/` | 다시 차단 | `/login?redirectTo=%2F` ✅ |

- 브라우저 콘솔 에러 0건, 서버 로그 에러 0건
- `npx tsc --noEmit` 통과, `npm run lint` 통과, `npm run build` 성공

### 프로덕션 (https://physical-ground-membership.vercel.app)

| 케이스 | 결과 |
|---|---|
| 비로그인 `/`, `/members` | 307 → `/login?redirectTo=...` ✅ |
| `/login` | 200 ✅ |
| `/api/dev-session` | **401** (미들웨어가 먼저 차단) — 라우트 자체의 404 가드와 함께 이중 차단 ✅ |

### 보안 점검 (TECH_SPEC 8.1 / FINAL_QA 3.3 관련)
- `.env.local`이 커밋되지 않음을 커밋 전 확인
- 스테이징된 diff에 `sb_secret` / `service_role` / 실제 키 문자열 없음 확인
- 빌드 산출물 검사: `.next/static`(브라우저로 나가는 번들)에 `sb_secret` **없음**. `.next/cache`에서 잡힌 문자열은 Supabase 라이브러리의 안내 문구(오탐)이며 `.next`는 gitignore 대상.
- publishable key는 설계상 공개 키이므로 Vercel 환경변수도 Secret이 아닌 **Config** 타입으로 등록

### Vercel 환경변수
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 두 개를 **All Environments**(Production/Preview/Development)에 Config 타입으로 등록 완료

## 다음 모듈 시작 시 필요한 정보

- **로그인 페이지 경로**: `/login` (자리표시자 존재). 미들웨어가 이미 `redirectTo` 쿼리 파라미터를 넘겨주므로, Module 3의 로그인 폼은 로그인 성공 후 `redirectTo` 값으로 이동시키면 된다.
- **회원가입 페이지 경로**: `/signup` — 아직 파일 없음. 미들웨어 공개 경로에는 이미 포함되어 있으니 페이지만 만들면 된다.
- **사용할 클라이언트**: 폼(클라이언트 컴포넌트)에서는 `lib/supabase/client.ts`의 `createClient()`, Server Action에서는 `lib/supabase/server.ts`의 `await createClient()`.
- **⚠️ 삭제할 것**: 실제 로그인/로그아웃 UI가 완성되면 `app/api/dev-session/route.ts` 파일과 `lib/supabase/middleware.ts`의 `DEV_ONLY_PUBLIC_PATHS` 항목을 **함께 제거**할 것.
- **테스트 계정**: `reco5149+module1test@gmail.com` (Module 1에서 생성, 이메일 확인 완료 상태). 비밀번호는 저장소/문서에 기록하지 않았으며 Module 1 작업자가 보유.
- **Confirm email 설정**: 현재 **켜져 있음**. Module 3에서 새 계정으로 가입 테스트 시 확인 메일이 필요하다. 내장 메일은 발송 한도가 낮으므로, 테스트가 막히면 Module 1처럼 SQL로 `auth.users.email_confirmed_at`을 갱신하거나 Module 8의 커스텀 SMTP 작업을 앞당기는 것을 검토.
- **알려진 제약**: Vercel CLI 사용 불가(컴퓨터 이름 한글 이슈) → 웹 대시보드 사용. Supabase SQL 편집기는 브라우저 자동화 단축키가 잘 안 먹힘.

## 다음 모듈
- Module 3 - 회원가입/로그인 화면: [TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md#module-3--회원가입로그인-화면)
