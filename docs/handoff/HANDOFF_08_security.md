# Handoff: Module 08 - 보안 체크리스트 적용

## 완료 상태
- [ ] 부분 완료 — **코드·문서로 가능한 항목은 완료**, **대시보드/계정 설정 항목은 운영자(사용자) 직접 수행 필요**

> Module 8은 성격상 절반이 Supabase/Vercel **대시보드 설정**과 **계정·비밀값·도메인** 작업이다.
> 이 항목들은 AI가 대신 수행할 수 없고(계정 설정 변경·SMTP 연결·CAPTCHA 키·도메인·비밀값 입력),
> 반드시 운영자가 직접 해야 한다. 아래 "운영자 실행 체크리스트" 참고.

## 무엇을 했는가 (코드·문서)

| 경로 | 역할 |
|---|---|
| `lib/security/rate-limit.ts` | 앱 레벨 rate limit — 슬라이딩 윈도 판정 **순수 함수**(`evaluateRateLimit`) + 인메모리 스토어(`hitRateLimit`) + 엔드포인트 기본값(`RATE_LIMITS`) |
| `lib/security/rate-limit.test.ts` | 단위 테스트 9개 (한도 경계·윈도 만료·retryAfter·키 격리) |
| `app/(auth)/actions.ts` | `login`/`signup` Server Action 진입부에 IP 기준 rate limit 적용 + `getClientIp()` 헬퍼 |
| `docs/OPERATIONS.md` | 운영 문서 — 백업/모니터링/개인정보 파기/무료 티어 전환 계획 (TECH_SPEC 8.7·8.8) |

### 주요 구현 결정

1. **rate limit 판정은 순수 함수로 분리**: 시간·저장소와 분리해 경계값을 단위 테스트로 검증(기존 모듈 패턴 동일). 저장소 구현만 바꾸면 로직 재사용 가능.
2. **로그인 5분 10회 / 가입 10분 5회**(`RATE_LIMITS`). 차단 시 남은 시간(초)을 안내한다. 차단된 요청은 카운트에 추가하지 않아(윈도가 계속 밀려 영구 차단되는 것 방지) 정해진 시간이 지나면 자동 해제된다.
3. **⚠️ 인메모리의 한계(중요)**: Vercel 서버리스는 인스턴스마다 메모리가 분리되고 콜드스타트로 초기화된다. 따라서 현재 rate limit은 **단일 인스턴스 내 best-effort 방어**다. 강한 보장이 필요하면 **Upstash Ratelimit** 등 공유 저장소 기반으로 `hitRateLimit`만 교체하면 된다(`evaluateRateLimit`은 그대로 재사용). TECH_SPEC 8.4가 이 방향을 이미 언급.
4. **비밀번호 정책**: 최종 방어선은 Supabase 대시보드(최소 길이·복잡도·유출 차단)다. 코드에는 이미 회원가입에 8자 최소 길이 1차 검증이 있어(HANDOFF_03/Module 3) 사용자 즉시 피드백을 준다. 대시보드 정책이 이보다 강하면 Supabase가 `weak_password`로 거절하고, 그 오류는 화면에 그대로 안내된다.
5. **CAPTCHA는 코드만으로 완결 불가**: hCaptcha/Turnstile은 (a)Supabase 대시보드에서 provider+secret 설정, (b)폼에 site key로 위젯 삽입, (c)토큰을 `signUp/signInWithPassword`의 `options.captchaToken`으로 전달, 3박자가 맞아야 한다. site/secret 키가 있어야 실제 동작하므로 **운영자 키 발급 후** 붙이는 것이 맞다(지금 스캐폴딩만 하면 키 없이 깨진다). 운영자 체크리스트에 절차를 남겼다.

## 코드로 검증한 보안 상태 (점검 완료)

| 항목 | 결과 |
|---|---|
| `.env*` gitignore 처리 | ✅ `.gitignore`에 `.env*`(단 `.env.example` 예외). 추적되는 비밀 env 파일 없음 |
| `service_role` 키 노출 | ✅ 추적 파일/커밋에 `service_role`·서비스 키 문자열 없음. 앱은 anon 키만 사용(`lib/supabase/*`) |
| 전 테이블 RLS 활성화 | ✅ `0001_init_schema.sql`에서 members/memberships/attendances 모두 `enable row level security` + 정책, `0002_tighten_rls_policies.sql`에서 `auth.uid() is not null`로 강화(Advisor "Always True" 노이즈 제거) |
| SECURITY DEFINER 함수 | ✅ 현재 없음(RLS 우회 함수 미사용) |
| 오픈 리다이렉트 방어 | ✅ 로그인 `redirectTo`는 내부 절대경로만 허용(`safeRedirectPath`, Module 3) |

## 테스트 결과

### 단위 테스트 (`npm test`) — 총 78개 전부 통과 (기존 69 + 이번 9)
`evaluateRateLimit`/`hitRateLimit` 검증: 한도 직전 허용·한도 도달 차단·윈도 만료 후 재허용·`retryAfterMs` 계산·키(IP)별 격리·정확히 windowMs 경계.

### 브라우저 E2E (로컬, 실제 Supabase)
로그아웃 후 `/login`에서 잘못된 비밀번호로 연속 시도:

| 시도 | 결과 |
|---|---|
| 1~10회 | "이메일 또는 비밀번호가 올바르지 않습니다." (limiter 통과 → Supabase 인증 거부) |
| **11회** | **"로그인 시도가 너무 많습니다. 281초 후 다시 시도해주세요."** (앱 limiter가 Supabase 호출 전에 차단) |

콘솔/서버 에러 없음. `npm test` ✅ · `npm run lint` ✅ · `npm run build` ✅.

> 참고: 이 검증으로 테스트 계정(`reco5149+module3test@…`) 세션이 로그아웃되었다. 다시 로그인하면 복구된다.

## 운영자 실행 체크리스트 (대시보드/계정 — AI가 대신 못 하는 것)

배포 직전에 아래를 **직접** 수행하고 각 항목을 확인한다. (TECH_SPEC 8.9 요약표와 대응)

### Supabase 대시보드
1. **이메일 확인 ON** — Authentication → Providers → Email → "Confirm email" 켜기.
2. **커스텀 SMTP 연결** — Authentication → SMTP Settings. Resend(권장)/SendGrid/SES/Postmark 중 하나. **⚠️ Module 3에서 이월된 필수 항목**: 붙인 직후 "가입 → 확인 메일 수신 → 링크 클릭 → 로그인" 해피패스를 **실제 메일로 1회 검증**. 이 검증 전에는 실사용자 오픈 금지. (Supabase 내장 메일은 시간당 2~3통 한도로 가입이 실패·롤백됨 — HANDOFF_03)
3. **비밀번호 정책 강화** — Authentication → Providers → Email: 최소 길이 8자 이상 + 복잡도 규칙.
4. **유출 비밀번호 차단 ON** — 같은 화면의 Leaked password protection(HaveIBeenPwned).
5. **CAPTCHA** — Authentication → Settings에서 hCaptcha/Turnstile provider + secret 설정 → site key로 폼에 위젯 삽입 → 토큰을 `options.captchaToken`으로 전달(코드 작업 동반, 키 발급 후 진행).
6. **Security Advisor 실행** — Database → Advisors(또는 Reports). 경고 0건 확인(스키마 변경 때마다 재실행).
7. **Site URL / Redirect URLs** — Authentication → URL Configuration을 운영 도메인으로 설정, `localhost` 제거.

### Vercel / 도메인
8. **커스텀 도메인 + HTTPS** — Vercel에 도메인 연결, 인증서 정상 확인(Module 9와 연동).
9. **환경변수 확인** — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`만 설정(서버 전용 비밀값을 `NEXT_PUBLIC_`으로 노출하지 말 것).

### 키 위생
10. 키가 한 번이라도 노출됐다면 Supabase → Project Settings → API에서 **재발급(rotate)** 후 배포 환경변수 갱신.

## 다음 모듈이 알아야 할 것
- **테스트 인프라**: `npm test`는 `scripts/register.mjs`(별칭 로더)를 `--import`로 로드한다(Module 7 도입). `scripts/` 두 파일 유지 필요.
- **DB 상태 변화 없음**: 회원/회원권/출석 데이터는 Module 6 이후 그대로.
- **rate limit 운영 전 결정 사항**: 실 트래픽·서버리스 인스턴스 수를 보고 인메모리 유지 vs Upstash 전환을 정한다.
- **CAPTCHA/SMTP는 Module 9(도메인 확정) 전후로 마무리** — Site URL이 확정돼야 확인 메일 링크가 올바른 도메인으로 돌아온다.

## 다음 모듈
- Module 9 - 배포 마무리 & 운영 준비: [TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md#module-9--배포-마무리--운영-준비)
