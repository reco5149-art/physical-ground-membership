# Handoff: Module 03 - 회원가입/로그인 화면

## 완료 상태
- [x] 구현 완료 (단, 확인 메일 실제 수신 테스트는 Module 8 SMTP 연결 후로 이월 — 아래 "남은 이슈" 참고)

## 무엇을 했는가

### 생성/수정한 파일

| 경로 | 역할 |
|---|---|
| `app/(auth)/actions.ts` | `login` / `signup` / `logout` Server Action |
| `app/(auth)/layout.tsx` | 인증 화면 공용 레이아웃 (가운데 정렬 카드) |
| `app/(auth)/login/page.tsx` | 로그인 페이지 (redirectTo·안내 메시지 처리) |
| `app/(auth)/login/login-form.tsx` | 로그인 폼 (클라이언트 컴포넌트) |
| `app/(auth)/signup/page.tsx` | 회원가입 페이지 |
| `app/(auth)/signup/signup-form.tsx` | 가입 폼 + 가입 완료 안내 화면 |
| `app/auth/confirm/route.ts` | 가입 확인 메일 링크 처리 (`verifyOtp`) |
| `app/(dashboard)/page.tsx` | 로그아웃 버튼 추가 |
| `lib/supabase/middleware.ts` | `DEV_ONLY_PUBLIC_PATHS` 제거 (아래 참고) |
| `app/api/dev-session/route.ts` | **삭제됨** (Module 2의 임시 테스트 라우트, 약속대로 제거) |

### 주요 구현 결정

1. **Server Action 방식 채택**: 로그인/가입/로그아웃을 모두 Server Action으로 처리한다. 쿠키 기반 세션이 서버에서 정확히 설정되고, 클라이언트 JS 없이도 폼이 동작한다.
2. **계정 존재 여부 비노출**: 로그인 실패 시 "존재하지 않는 계정"과 "비밀번호 틀림"을 구분하지 않고 **동일한 문구**를 반환한다. 가입 시에도 이미 가입된 이메일인지 알려주지 않고 항상 같은 안내를 보여준다. (FINAL_QA 2.1-1/2/5)
   - 예외: `email_not_confirmed`만은 사용자가 조치할 수 있어야 하므로 별도 안내한다.
3. **오픈 리다이렉트 방어**: `redirectTo`는 쿼리로 들어오는 값이므로 그대로 쓰면 외부 사이트로 튕길 수 있다. `safeRedirectPath()`에서 `/`로 시작하되 `//`·`/\`로 시작하지 않는 내부 경로만 허용한다.
4. **서버 측 입력 검증**: 브라우저 검증은 우회 가능하므로 Server Action에서 필수값·비밀번호 일치·최소 길이(8자)를 다시 확인한다. 폼에는 `noValidate`를 두어 서버 검증 경로가 항상 타도록 했다.
5. **오류 로그 분리**: Supabase 원본 오류는 `console.error`로 서버 로그에만 남기고, 사용자 화면에는 일반화된 문구만 보여준다. (FINAL_QA 2.5-3)

## 테스트 결과

### 정상 흐름 (로컬)

| 케이스 | 결과 |
|---|---|
| 신규 가입 → 계정 생성 | `auth.users`에 `reco5149+module3test@gmail.com` 생성 확인 ✅ |
| 가입 후 로그인 → 대시보드 진입 | 세션 이메일/ID 화면 표시 ✅ |
| 로그아웃 → `/login` 이동 | ✅ |
| 로그아웃 후 보호 경로 재접근 | `/login?redirectTo=...`로 차단 ✅ |
| 보호 경로 진입 시도 → 로그인 → 원래 경로 복귀 | `/members` 요청 → 로그인 후 `/members`로 복귀 (404, Module 4에서 생성 예정) ✅ |
| 로그인 상태로 `/login`·`/signup` 접근 | 대시보드로 리다이렉트 ✅ |

### 비정상 입력 (로컬)

| 케이스 | 결과 |
|---|---|
| 빈 이메일/비밀번호로 로그인 | "이메일과 비밀번호를 모두 입력해주세요." ✅ |
| 존재하지 않는 계정으로 로그인 | "이메일 또는 비밀번호가 올바르지 않습니다." ✅ |
| 존재하는 계정 + 틀린 비밀번호 | **위와 완전히 동일한 문구** (계정 존재 여부 비노출) ✅ |
| 비밀번호 확인 불일치 | "비밀번호가 서로 일치하지 않습니다." ✅ |
| 8자 미만 비밀번호 | "비밀번호는 8자 이상이어야 합니다." ✅ |
| `?redirectTo=https://example.com/evil` 로 로그인 | 외부 이동 없이 `/`로 이동 (**오픈 리다이렉트 차단**) ✅ |
| `/auth/confirm` (파라미터 없음) | `/login?message=invalid-link` ✅ |
| `/auth/confirm?token_hash=bogus&type=signup` | `/login?message=invalid-link` ✅ |

### 품질 게이트
- `npx tsc --noEmit` 통과, `npm run lint` 통과, `npm run build` 성공
- 브라우저 콘솔 에러 0건

### Supabase 설정 변경
- **Redirect URLs 등록** (기존 0개 → 2개):
  - `https://physical-ground-membership.vercel.app/auth/confirm`
  - `http://localhost:3210/auth/confirm`
- **Confirm email**: 테스트를 위해 일시적으로 껐다가 **다시 켰음**. 종료 시점 상태를 API로 검증함 (`/auth/v1/settings` → `mailer_autoconfirm: false` = 확인 필수 ON). ✅

## 남은 이슈 / 다음 모듈이 알아야 할 것

1. **⚠️ 확인 메일 실제 수신 테스트 미완 (Module 8로 이월)**
   - Supabase **내장 메일 발송이 시간당 2~3통으로 제한**되어(`over_email_send_rate_limit`) 가입 시 메일 발송이 실패하고, 그러면 **가입 자체가 롤백되어 계정이 생성되지 않는다.**
   - 그래서 E2E 검증을 위해 `Confirm email`을 잠시 끄고 가입 → 로그인 → 로그아웃까지 확인한 뒤 설정을 원복했다.
   - 즉 **"확인 메일 수신 → 링크 클릭 → 가입 완료"의 해피패스는 아직 실제로 검증되지 않았다.** 코드(`/auth/confirm`)와 잘못된 링크 처리는 검증 완료.
   - **Module 8에서 커스텀 SMTP(Resend 등)를 붙인 직후, 반드시 이 해피패스를 실제 메일로 1회 검증할 것.** (TECH_SPEC 8.2 3번 항목과 동일)
   - 현재 상태 그대로 운영에 올리면 **신규 직원 가입이 메일 한도 때문에 실패할 수 있다.** SMTP 연결 전에는 오픈하지 말 것.

2. **테스트 계정 2개가 남아 있음**
   - `reco5149+module1test@gmail.com` (Module 1 생성)
   - `reco5149+module3test@gmail.com` (Module 3 생성, 비밀번호는 문서에 기록하지 않음)
   - 두 계정 모두 확인 완료 상태이며 로그인 가능. 운영 오픈 전(Module 9)에 정리할지 결정할 것.

3. **Site URL 미설정**: Redirect URLs는 등록했지만 `Site URL`은 아직 기본값이다. 커스텀 도메인이 정해지는 Module 9에서 함께 확정할 것. (TECH_SPEC 8.6)

4. **다음 모듈에서 바로 쓸 수 있는 것**
   - 인증 가드가 이미 모든 경로를 보호하므로, Module 4는 `/members` 페이지만 만들면 로그인한 직원에게만 보인다.
   - 서버 컴포넌트/액션에서 `await createClient()` (`lib/supabase/server.ts`)로 현재 직원의 세션이 담긴 Supabase 클라이언트를 얻을 수 있다. `members.created_by`에는 `(await supabase.auth.getUser()).data.user?.id`를 넣으면 된다.
   - 대시보드 헤더(로그아웃 버튼 포함)는 현재 `app/(dashboard)/page.tsx`에 인라인으로 있다. Module 4에서 페이지가 늘어나면 `app/(dashboard)/layout.tsx`로 옮기는 것을 권장.

## 다음 모듈
- Module 4 - 회원 목록/등록/상세/수정 (회원 CRUD): [TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md#module-4--회원-목록등록상세수정-회원-crud)
