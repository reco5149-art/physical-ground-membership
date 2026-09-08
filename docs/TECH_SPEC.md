# 기술 명세서: 피지컬그라운드 회원관리 앱 (MVP)

| 항목 | 내용 |
|---|---|
| 문서 상태 | Draft v1.0 |
| 작성일 | 2026-09-08 |
| 관련 문서 | [PRD.md](./PRD.md) |

## 1. 아키텍처 개요

```
┌─────────────────┐        ┌──────────────────────┐
│   Next.js App    │        │       Supabase        │
│  (Vercel 배포)    │  HTTPS │ ─ Auth (이메일/비번)    │
│                  │ ──────▶│ ─ PostgreSQL DB        │
│  - 화면(App Router)│       │ ─ Row Level Security   │
│  - Server Actions │       │                        │
└─────────────────┘        └──────────────────────┘
```

- **프론트엔드 + 백엔드**: Next.js 하나로 통합. 화면 렌더링과 서버 로직(Server Actions/Route Handlers)을 같은 프로젝트에서 처리해 별도 백엔드 서버를 두지 않는다.
- **인증/DB**: Supabase가 담당. 로그인/회원가입은 **직접 구현하지 않고 Supabase Auth를 그대로 사용**한다 (이메일/비밀번호 방식).
- **배포**: GitHub 저장소를 Vercel과 연동하여 `main` 브랜치 푸시 시 자동 배포.

## 2. 기술 스택

| 구분 | 선택 | 비고 |
|---|---|---|
| 프론트엔드 프레임워크 | Next.js (App Router) | React 기반, 서버/클라이언트 컴포넌트 혼용 |
| 언어 | TypeScript | 타입 안정성 |
| 스타일링 | Tailwind CSS | 빠른 화면 구현 |
| 백엔드/DB | Supabase (PostgreSQL) | 관계형 데이터(회원-회원권-출석)에 적합 |
| 인증 | **Supabase Auth (이메일/비밀번호)** | 자체 구현 없이 검증된 서비스 사용 |
| 데이터 접근 제어 | Supabase Row Level Security (RLS) | DB 레벨에서 로그인 사용자만 접근 허용 |
| 배포(프론트) | Vercel | GitHub 연동 자동 배포 |
| 배포(DB/Auth) | Supabase Cloud | 관리형 서비스, 별도 서버 운영 불필요 |
| 버전관리 | GitHub | 기존 계정/워크플로 재사용 |

## 3. 인증 설계 (Supabase Auth)

### 3.1 왜 Supabase Auth인가

- 비밀번호 해싱, 세션/JWT 토큰 발급 및 갱신, 이메일 인증 등 보안이 중요한 영역을 직접 구현하지 않고 검증된 서비스에 위임한다.
- Next.js와의 공식 연동 라이브러리(`@supabase/ssr`)를 통해 서버 컴포넌트에서도 로그인 상태를 안전하게 확인할 수 있다.
- 이후 소셜 로그인(Google 등)이 필요해져도 설정만 추가하면 되므로 확장이 쉽다.

### 3.2 인증 흐름

1. **회원가입**: 직원이 이메일/비밀번호 입력 → `supabase.auth.signUp()` 호출 → Supabase가 계정 생성.
2. **로그인**: `supabase.auth.signInWithPassword()` 호출 → 세션 쿠키 발급.
3. **접근 제어**: Next.js 미들웨어(`middleware.ts`)에서 모든 페이지 요청 시 세션 유효성을 확인하고, 세션이 없으면 `/login`으로 리다이렉트한다.
4. **로그아웃**: `supabase.auth.signOut()` 호출.

### 3.3 데이터 접근 제어 (RLS)

- 모든 테이블(`members`, `memberships`, `attendances`)에 RLS를 활성화한다.
- 정책: `auth.role() = 'authenticated'`인 경우에만 SELECT/INSERT/UPDATE/DELETE를 허용한다 (직원 간 권한 구분은 MVP 범위 밖이므로, 로그인 여부만 검사).
- 비로그인 상태의 API 직접 호출로는 어떤 데이터도 조회/수정할 수 없다.

## 4. 데이터베이스 설계

### 4.1 ERD (개략)

```
auth.users (Supabase 기본 제공)
        │ 1
        │
        │ N
   members ──────< memberships
        │
        │ 1
        │
        │ N
   attendances
```

### 4.2 테이블 스키마

**members**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 기본키 |
| name | text | 회원 이름 |
| phone | text | 연락처 (검색 키) |
| birth_date | date | 생년월일 (nullable) |
| gender | text | 성별 (nullable) |
| memo | text | 메모 (nullable) |
| status | text | 'active' \| 'inactive' |
| created_by | uuid (FK → auth.users.id) | 등록한 직원 |
| created_at | timestamptz | 등록일시 |

**memberships**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 기본키 |
| member_id | uuid (FK → members.id) | 대상 회원 |
| type | text | 'period' \| 'count' |
| start_date | date | 시작일 |
| end_date | date | 종료일 (기간제) |
| total_count | int | 총 횟수 (횟수제) |
| remaining_count | int | 잔여 횟수 (횟수제) |
| status | text | 'active' \| 'expiring_soon' \| 'expired' (조회 시 계산 또는 배치로 갱신) |
| created_at | timestamptz | 등록일시 |

**attendances**

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | uuid (PK) | 기본키 |
| member_id | uuid (FK → members.id) | 대상 회원 |
| membership_id | uuid (FK → memberships.id, nullable) | 차감 대상 회원권 |
| checked_in_at | timestamptz | 체크인 일시 |
| checked_in_by | uuid (FK → auth.users.id) | 처리한 직원 |

> 회원권 상태(`status`)는 매 조회 시 `end_date`/`remaining_count` 기준으로 계산하는 방식(뷰 또는 애플리케이션 로직)을 우선 검토하고, 필요 시 Supabase Scheduled Function으로 배치 갱신을 추가한다.

## 5. 주요 기능별 로직

### 5.1 출석 체크 & 횟수 차감

1. 직원이 회원 이름/연락처로 검색.
2. 해당 회원의 활성 회원권 조회.
3. 체크인 시 `attendances`에 레코드 생성.
4. 회원권 타입이 `count`이면 `remaining_count`를 1 차감 (Supabase 트랜잭션 또는 Postgres 함수로 원자적 처리).
5. 당일 중복 체크인 방지: 같은 회원의 당일 `checked_in_at`이 이미 있으면 경고 표시 후 재확인.

### 5.2 회원권 상태 판정

- `period` 타입: `end_date < 오늘` → 만료, `end_date - 오늘 <= 7일` → 만료임박, 그 외 → 정상.
- `count` 타입: `remaining_count <= 0` → 만료, `remaining_count <= 2` → 만료임박, 그 외 → 정상.

### 5.3 대시보드 집계

- 오늘 출석 수: `attendances`에서 `checked_in_at`이 오늘인 레코드 count.
- 만료임박/만료 회원: `memberships` 상태 계산 결과를 기준으로 목록화.

## 6. 폴더 구조 (제안)

```
physical-ground-membership/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (dashboard)/
│   │   ├── page.tsx                 # 대시보드
│   │   ├── members/
│   │   │   ├── page.tsx             # 회원 목록
│   │   │   ├── new/page.tsx         # 회원 등록
│   │   │   └── [id]/page.tsx        # 회원 상세/수정
│   │   └── attendance/page.tsx      # 출석 체크
│   └── layout.tsx
├── lib/
│   └── supabase/
│       ├── client.ts                # 브라우저용 클라이언트
│       └── server.ts                # 서버 컴포넌트/액션용 클라이언트
├── middleware.ts                    # 인증 가드
├── docs/
│   ├── PRD.md
│   └── TECH_SPEC.md
└── supabase/
    └── migrations/                  # DB 스키마 마이그레이션 SQL
```

## 7. 배포 및 CI/CD

1. GitHub 저장소 생성 및 Vercel 프로젝트 연동 (GitHub 로그인으로 Import).
2. Supabase 프로젝트 생성 후 URL/anon key를 Vercel 환경변수로 등록 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
3. `main` 브랜치에 푸시하면 Vercel이 자동으로 빌드/배포.
4. DB 스키마 변경은 `supabase/migrations`에 SQL로 기록하고 Supabase CLI 또는 대시보드 SQL 편집기로 적용.

## 8. 운영 전 보안 체크리스트 (Go-Live 전 필수 확인)

실제 서비스 오픈 전, 개발 단계의 기본 설정을 그대로 두면 안 되는 항목들이다. 아래 항목은 **배포 직전 마지막 점검**으로 반드시 확인한다.

### 8.1 비밀 키·토큰 관리

- Supabase는 두 종류의 키를 발급한다.
  - `anon` key: 공개해도 되는 키. 브라우저/클라이언트 코드에 사용 (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). RLS 정책으로 보호된다.
  - `service_role` key: **RLS를 완전히 우회하는 마스터 키**. 절대 클라이언트(브라우저) 코드나 `NEXT_PUBLIC_` 접두어 환경변수로 노출하면 안 되며, 서버 전용 코드(Server Actions, Route Handlers)에서만 `SUPABASE_SERVICE_ROLE_KEY`로 사용한다. MVP 기능(회원/회원권/출석)은 사실 RLS + anon key만으로 충분히 구현 가능하므로, **service_role key 사용 자체를 최소화**하는 것이 원칙이다.
  - `.env*` 파일은 반드시 `.gitignore`에 포함해 GitHub 저장소에 커밋되지 않도록 한다.
  - 배포 전 체크: GitHub 저장소, 커밋 이력, 클라이언트 번들(`.next` 빌드 결과)에 `service_role` key나 그 외 비밀 값이 포함되어 있지 않은지 확인한다.
  - **키가 한 번이라도 노출됐다면(커밋 이력에 남았거나, 공개 채널에 붙여넣었거나) 즉시 Supabase 대시보드(Project Settings → API)에서 재발급(rotate)한다.** 재발급 시 기존 배포에 반영된 환경변수도 함께 갱신해야 한다.

### 8.2 이메일 확인(Email Confirmation) + 커스텀 SMTP

- Supabase 프로젝트 기본 설정은 개발 편의를 위해 이메일 확인이 꺼져 있거나, 켜져 있어도 Supabase 내장 메일 발송(낮은 발송 한도, 스팸함으로 분류될 가능성)을 사용한다.
- **실 운영 전 확인/설정할 것**:
  1. Authentication → Providers → Email에서 **"Confirm email"을 켠다.** (꺼두면 존재하지 않는/타인의 이메일로도 가입이 무제한으로 가능해진다.)
  2. Authentication → Settings(SMTP Settings)에서 **커스텀 SMTP를 연결**한다. Resend, SendGrid, Amazon SES, Postmark 중 하나를 선택 (소규모 MVP에는 무료 티어가 넉넉한 **Resend** 추천).
  3. 가입 → 실제 확인 메일 수신 → 확인 링크 클릭까지 엔드투엔드로 한 번 테스트한다.

### 8.3 비밀번호 정책 & 유출 비밀번호 차단

- 기본 최소 길이(6자)만으로는 약하다. Authentication → Providers → Email의 Password 설정에서:
  1. **최소 길이를 8자 이상으로 상향**하고, 가능하면 문자+숫자+특수문자 조합을 요구하는 복잡도 규칙을 켠다.
  2. **유출 비밀번호 차단(Leaked password protection, HaveIBeenPwned 연동)을 켠다.** 이미 유출 이력이 있는 비밀번호로는 가입/변경이 불가능해진다.
- 이 옵션들은 Supabase 프로젝트 생성 직후에는 기본값(약한 정책)으로 되어 있으므로, 개발 중이 아니라 **배포 직전에 한 번 더 대시보드에서 직접 확인**한다.

### 8.4 남용 방어 (가입/요청 봇 차단)

- **CAPTCHA**: Authentication → Settings에서 CAPTCHA(hCaptcha 또는 Turnstile) 연동을 켜고, 회원가입/로그인 폼에 위젯을 붙인다. 사람 확인 없이는 가입 자체가 API로 자동화되지 않도록 막는다.
- **Rate limit**: Supabase Auth는 이메일 발송/가입 시도 등에 기본 rate limit이 있지만, 우리 앱의 API(Route Handlers/Server Actions)에도 IP 또는 계정 기준 요청 제한을 추가로 둔다 (예: 로그인 시도, 회원 검색 API 등 반복 호출 가능한 엔드포인트). Vercel의 경우 Edge Middleware나 별도 rate-limit 라이브러리(Upstash Ratelimit 등)로 구현 가능하다.
- 목적: 봇에 의한 대량 가입, 무차별 로그인 시도(brute force), 회원 검색 API를 이용한 개인정보 스크래핑을 막는다.

### 8.5 접근 제어 재점검 (RLS & 권한 최소화)

- **모든 테이블에 RLS 활성화 확인**: `members`, `memberships`, `attendances`는 물론, 앞으로 추가되는 테이블도 생성 즉시 RLS를 켠다. RLS가 꺼진 테이블은 `anon`/`authenticated` 역할 모두에게 기본적으로 전체 공개되므로 반드시 확인한다.
- **서버 권한(SECURITY DEFINER) 함수 최소화**: Postgres 함수를 `SECURITY DEFINER`(호출자가 아닌 함수 소유자 권한으로 실행)로 만들 경우, 그 함수는 RLS를 우회할 수 있다. 이런 함수는 꼭 필요한 경우(예: 출석 체크 시 잔여 횟수 원자적 차감)에만 만들고, 함수 내부에서 호출자가 로그인한 사용자인지 다시 한번 확인하는 로직을 넣는다.
- **Security Advisor 정기 실행**: Supabase 대시보드의 Advisor(Database → Advisors, 또는 Reports 내 Security Advisor)를 배포 전, 그리고 이후 스키마 변경 때마다 실행해 RLS 누락, 과도한 권한 등의 경고를 확인하고 해소한다.

### 8.6 도메인·주소 설정

- **커스텀 도메인 + HTTPS**: Vercel에 커스텀 도메인(예: `admin.physicalground.co.kr` 등)을 연결하고 HTTPS(Vercel이 자동 발급하는 Let's Encrypt 인증서)가 정상 적용되는지 확인한다.
- **Supabase Auth의 Site URL / Redirect URLs**: Authentication → URL Configuration에서 `Site URL`을 실제 배포 주소로 설정하고, `Redirect URLs` 허용 목록에도 동일 주소(및 필요한 경로)를 등록한다. 이 설정이 개발 중 사용한 `localhost` 등으로 남아 있으면, 이메일 확인 링크나 로그인 후 리다이렉트가 엉뚱한 주소로 연결된다.
- 배포 전 체크: 실제 도메인으로 접속 → 회원가입 → 확인 메일의 링크가 정확히 운영 도메인으로 돌아오는지 테스트한다.

### 8.7 운영 기본기

- **백업**: Supabase 대시보드에서 자동 백업(Point-in-Time Recovery는 유료 플랜) 또는 최소한 정기적인 수동 백업(`pg_dump` 등) 방법을 정해둔다.
- **로그·모니터링**: Supabase의 Logs(Auth/DB/API 로그)와 Vercel의 배포/함수 로그를 어디서 확인할지, 오류 발생 시 누가 어떻게 알아채는지(예: Vercel/Supabase 대시보드를 주기적으로 확인, 또는 이후 Sentry 등 에러 트래킹 도구 도입)를 정한다.
- **개인정보 보관·파기 정책**: 회원의 이름, 연락처, 생년월일 등 개인정보를 얼마나 보관할지, 회원 탈퇴/데이터 삭제 요청 시 어떻게 처리할지(하드 삭제 vs `status = inactive` 처리 후 일정 기간 뒤 파기 등)를 운영 정책으로 문서화한다.

### 8.8 무료 티어의 한계 인지

- **Supabase 무료 플랜**: 일정 기간 미사용 시 프로젝트가 일시정지(pause)되어 첫 요청 시 재기동(콜드 스타트) 지연이 발생할 수 있다. 실사용이 시작되면 유료 플랜 전환 시점을 미리 계획한다.
- **Vercel 무료 플랜**: 함수 실행 시간/대역폭 등에 한도가 있다. 트래픽이 늘면 Pro 플랜 전환을 검토한다.
- **이메일 발송(SMTP)**: Resend 등 무료 티어는 월 발송 한도가 있으므로(예: 월 3,000통 수준), 회원 수가 늘어나면 발송량을 모니터링하고 유료 플랜 또는 발송량이 큰 서비스로 전환할 준비를 해둔다.
- 목표는 "무료로 영원히 운영"이 아니라 "MVP 검증까지는 무료로, 실사용 규모가 확인되면 유료/전용 인프라로 전환"임을 처음부터 전제한다.

### 8.9 체크리스트 요약

| 항목 | 확인 방법 | 완료 기준 |
|---|---|---|
| service_role key 미노출 | 저장소/커밋 이력/클라이언트 번들 검색 | 어디에도 없음 |
| 키 노출 이력 시 재발급 | Supabase 대시보드 API 설정 | 재발급 + 배포 환경변수 갱신 완료 |
| 이메일 확인 활성화 | Auth → Providers → Email | Confirm email ON |
| 커스텀 SMTP 연결 | Auth → SMTP Settings | 실제 메일 수신 테스트 성공 |
| 비밀번호 정책 강화 | Auth → Providers → Email | 최소 8자 이상 + 복잡도 규칙 |
| 유출 비밀번호 차단 | Auth → Providers → Email | Leaked password protection ON |
| CAPTCHA 적용 | Auth → Settings (CAPTCHA) + 가입/로그인 폼 | 위젯 노출 및 검증 동작 확인 |
| API rate limit | 로그인/검색 등 주요 엔드포인트 | 반복 요청 시 제한 동작 확인 |
| 전 테이블 RLS 활성화 | Database → Advisors (Security Advisor) | 경고 0건 |
| SECURITY DEFINER 함수 최소화 | 함수 목록 검토 | 꼭 필요한 함수만 존재, 내부 권한 재확인 로직 포함 |
| 커스텀 도메인 + HTTPS | 실제 도메인 접속 | 정상 접속 및 인증서 유효 |
| Site URL / Redirect URLs | Auth → URL Configuration | 운영 도메인으로 설정, localhost 등 제거 |
| 백업 방안 확정 | 운영 문서 | 백업 주기/방법 문서화 |
| 로그·모니터링 체계 | 운영 문서 | 확인 주체/방법 문서화 |
| 개인정보 보관·파기 정책 | 운영 문서 | 정책 문서화 |
| 무료 티어 한계 인지 및 전환 계획 | 운영 문서 | 전환 기준/시점 문서화 |

## 9. 향후 확장 시 고려사항

- **결제 연동**: Stripe 또는 국내 PG(토스페이먼츠 등) 추가 시 `memberships`에 결제 상태 컬럼 추가.
- **알림 발송**: Supabase Edge Function + 외부 알림톡/SMS API 연동.
- **회원 셀프 서비스**: 별도 역할(role) 컬럼을 `auth.users`에 매핑해 회원용 화면 분리.
- **다지점 지원**: `branches` 테이블 추가 후 모든 테이블에 `branch_id` 도입, RLS 정책을 지점 단위로 확장.
