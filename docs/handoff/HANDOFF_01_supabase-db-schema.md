# Handoff: Module 01 - Supabase 프로젝트 & DB 스키마

## 완료 상태
- [x] 구현 완료

## 무엇을 했는가

### Supabase 프로젝트 생성
- 조직: `reco5149-art's Org` (Free 플랜), 프로젝트: `physical-ground-membership`
- 리전: **Northeast Asia (Seoul)** — 국내 사용자 기준 최단 거리
- DB 비밀번호: 대시보드의 "Generate a password"로 자동 생성 (값은 문서에 기록하지 않음)
- 프로젝트 생성 시 보안 옵션 **"Automatically expose new tables" 해제** — 새 테이블이 자동으로 Data API 역할에 노출되지 않게 하고, 필요한 권한만 마이그레이션에서 명시적으로 부여하는 방식 채택 (TECH_SPEC 8.5 권한 최소화)

### 마이그레이션 파일
- `supabase/migrations/0001_init_schema.sql`
  - `members`, `memberships`, `attendances` 3개 테이블 (컬럼 구성은 TECH_SPEC.md 4.2절과 동일)
  - 검색용 인덱스: `members(name)`, `members(phone)`, `memberships(member_id)`, `attendances(member_id)`, `attendances(checked_in_at)`
  - CHECK 제약: status 값 검증, 기간제는 end_date 필수, 횟수제는 total_count > 0 필수, end_date >= start_date, remaining_count >= 0
  - FK: `members.created_by`/`attendances.checked_in_by` → `auth.users(id)` (on delete set null), `memberships.member_id`/`attendances.member_id` → `members(id)` (on delete cascade)
  - 3개 테이블 모두 RLS 활성화
  - `authenticated` 역할에만 SELECT/INSERT/UPDATE/DELETE 권한 부여 (**anon에는 어떤 권한도 부여하지 않음**)
- `supabase/migrations/0002_tighten_rls_policies.sql`
  - 0001의 `using (true) with check (true)` 정책을 `using ((select auth.uid()) is not null)` 형태로 교체
  - 이유: 동작은 동일하지만 Security Advisor가 "RLS Policy Always True" 경고로 잡아서, FINAL_QA_CHECKLIST 3.2절의 "경고 0건" 기준을 충족하고 진짜 경고가 묻히지 않도록 노이즈 제거
  - 정책 이름: `staff_full_access_members` / `_memberships` / `_attendances`

두 마이그레이션 모두 Supabase 대시보드 SQL 편집기에서 실행 완료.

## 테스트 결과

### 스키마 검증 (SQL 편집기)
- `information_schema.columns` 조회 → 3개 테이블 22개 컬럼이 TECH_SPEC과 정확히 일치 확인
- `pg_class.relrowsecurity` 조회 → 3개 테이블 모두 `true` (RLS 활성)

### RLS 실제 동작 검증 (REST API 직접 호출)
테스트 계정(`reco5149+module1test@gmail.com`)을 만들어 실제 API로 검증했다.

| 케이스 | 결과 |
|---|---|
| 비로그인(publishable key만) SELECT members | **401 permission denied** (차단됨) |
| 비로그인 INSERT members | **401 permission denied** (차단됨) |
| 로그인 상태 SELECT members | 200 |
| 로그인 상태 INSERT member | 201 |
| 로그인 상태 INSERT membership (횟수제, 정상) | 201 |
| 횟수제인데 total_count 누락 | 400 `memberships_count_requires_total` 위반 |
| 종료일 < 시작일 | 400 `memberships_end_after_start` 위반 |
| 잘못된 status 값(`deleted`)으로 UPDATE | 400 `members_status_check` 위반 |
| attendance INSERT | 201 |
| member DELETE → 연관 membership/attendance CASCADE 삭제 | 204, 3개 테이블 모두 빈 상태 확인 |

정책 교체(0002) 후에도 위 동작(비로그인 401 / 로그인 200·201)이 동일함을 재확인했고, 테스트 데이터는 전부 삭제해 현재 3개 테이블은 비어 있다.

### Security Advisor
- 최초: 경고 4건 (RLS Policy Always True × 3, Leaked Password Protection Disabled × 1)
- 0002 적용 후 재실행: **에러 0건 / 경고 1건**
- 남은 1건 = `Leaked Password Protection Disabled` → TECH_SPEC 8.3 항목으로 **Module 8에서 처리 예정** (의도된 미결)

## 다음 모듈 시작 시 필요한 정보

- **프로젝트 참조(ref)**: `xfnlckoowyajsmzmmhdn`
- **API URL**: `https://xfnlckoowyajsmzmmhdn.supabase.co`
- **Publishable key(구 anon key)**: Supabase 대시보드 → Settings → API Keys 에서 확인 (공개 가능한 키). Module 2에서 `.env.local`과 Vercel 환경변수 `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`(또는 publishable key용 변수명)로 등록할 것.
- **Secret key**: 이번 모듈에서 사용하지 않았고 앞으로도 최소화 원칙 유지 (RLS + publishable key만으로 MVP 기능 구현 가능함을 이번 테스트로 확인함).
- **테이블/정책 상태**: 3개 테이블 + 각 테이블당 정책 1개(`staff_full_access_*`), authenticated 전용 권한. anon 권한 없음.
- **테스트 계정**: `reco5149+module1test@gmail.com` (Auth에 남아 있음). Module 3에서 실제 가입 플로우를 테스트할 때 정리하거나 그대로 재사용할 것. 이 계정은 이메일 확인을 SQL로 강제 처리(`auth.users.email_confirmed_at` 갱신)한 상태다.
- **알려진 이슈/주의**:
  - Supabase 대시보드의 SQL 편집기는 브라우저 자동화의 키보드 단축키(Ctrl+A 등)가 잘 먹지 않는다. 내용 교체 시 주의 필요.
  - `Confirm email` 설정은 현재 **켜져 있는 상태**(기본값)로 유지했다. Module 3에서 가입 화면을 테스트할 때 확인 메일 수신이 필요하며, 커스텀 SMTP는 Module 8에서 붙인다.
  - Vercel CLI는 이 PC에서 사용 불가(컴퓨터 이름 한글 이슈) — 웹 대시보드 사용.

## 다음 모듈
- Module 2 - Next.js ↔ Supabase 연동 & 인증 가드: [TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md#module-2--nextjs--supabase-연동--인증-가드)
