# 배포 런북 (Deployment / Go-Live)

| 항목 | 내용 |
|---|---|
| 문서 상태 | Draft v1.0 |
| 작성일 | 2026-09-08 |
| 관련 문서 | [TECH_SPEC.md](./TECH_SPEC.md) 7·8절, [FINAL_QA_CHECKLIST.md](./FINAL_QA_CHECKLIST.md), [OPERATIONS.md](./OPERATIONS.md), [handoff/HANDOFF_08_security.md](./handoff/HANDOFF_08_security.md) |

> 이 문서는 실제 오픈(Go-Live)까지의 절차를 한곳에 모은 것이다.
> **[코드]** 표시는 저장소/자동배포로 이미 처리된 것, **[운영자]** 표시는 사장님/운영자가
> Supabase·Vercel **대시보드에서 직접** 해야 하는 것(계정·비밀값·도메인이라 AI가 대신 못 함)이다.

## 1. 현재 배포 상태

- **[코드]** 저장소: `github.com/reco5149-art/physical-ground-membership` (private), 브랜치 `main`.
- **[코드]** 배포: Vercel가 `main` 푸시를 자동 빌드/배포. 기본 도메인 **https://physical-ground-membership.vercel.app** 접속 가능(HTTPS 정상, 로그인 화면 렌더링 확인).
- **[코드]** Module 0~8 반영 완료(대시보드·출석·회원권·회원 CRUD·인증·rate limit). 최신 푸시(`047b7da`)로 Modules 7·8 배포 트리거됨.
- **[운영자 확인]** Vercel 대시보드 → Deployments에서 최신 커밋(`047b7da`)이 **Ready** 상태인지 한 번 확인.

## 2. 배포 파이프라인 (참고)

```
로컬 커밋 → git push origin main → GitHub → Vercel 자동 빌드/배포 → 기본 도메인 반영
```

- DB 스키마 변경은 `supabase/migrations/*.sql`로 기록하고 Supabase SQL 편집기(또는 CLI)로 적용한다(자동 반영 아님).
- 환경변수(아래 3절)는 Vercel 프로젝트 설정에 등록되어 있어야 빌드가 정상 동작한다.

## 3. 환경변수 (Vercel Project → Settings → Environment Variables)

| 변수 | 값 출처 | 공개 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | 공개(클라이언트 노출 OK) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 같은 화면 | 공개(RLS로 보호) |

- **[운영자]** 서버 전용 비밀값(`service_role` 등)을 `NEXT_PUBLIC_` 접두어로 넣지 말 것. 현재 앱은 anon 키만으로 동작하므로 service_role은 등록 불필요.
- 로컬 개발은 `.env.example`을 `.env.local`로 복사해 값 채움(`.env*`는 gitignore됨).

## 4. Go-Live 전 [운영자] 대시보드 체크리스트

> 상세 절차는 [HANDOFF_08](./handoff/HANDOFF_08_security.md) "운영자 실행 체크리스트" 참고. 요약:

### 4.1 Supabase — 인증/보안 (필수)
- [ ] **이메일 확인 ON** (Auth → Providers → Email → Confirm email)
- [ ] **커스텀 SMTP 연결** (Resend 권장) + **가입→확인메일→링크→로그인 실메일 1회 검증**
      ⚠️ **이 검증 전에는 실사용자 오픈 금지** (Module 3부터 이월된 최우선 항목)
- [ ] **비밀번호 정책** 최소 8자 + 복잡도
- [ ] **유출 비밀번호 차단 ON** (Leaked password protection)
- [ ] **CAPTCHA** provider+키 설정 후 폼에 위젯 연결(코드 동반, 키 발급 후)
- [ ] **Security Advisor 실행 → 경고 0건** (Database → Advisors)
- [ ] **Site URL / Redirect URLs** 를 운영 도메인으로 설정, `localhost` 제거
      (특히 `<도메인>/auth/confirm` 을 Redirect URLs에 추가 — 확인 메일 링크 복귀 지점)

### 4.2 Vercel — 도메인
- [ ] **커스텀 도메인 연결** + HTTPS 인증서 정상 (예: `admin.physicalground.co.kr`)
- [ ] 도메인 변경 시 4.1의 Site URL/Redirect URLs도 함께 갱신

### 4.3 키 위생
- [ ] 키 노출 이력이 있으면 Supabase → Project Settings → API에서 **재발급** 후 Vercel 환경변수 갱신

## 5. Go-Live 최종 QA (프로덕션 도메인에서 [운영자] 수행)

**전체 플로우 1회 통과** + **[FINAL_QA_CHECKLIST.md](./FINAL_QA_CHECKLIST.md)** 3개 영역(정상/예외/보안) 점검.
로그인 계정과 실제 조작이 필요해 AI가 대신 수행할 수 없다. 핵심만:

- 가입 → 확인메일 → 로그인 → 회원 등록 → 회원권 등록 → 출석 체크 → 대시보드 숫자 검산 → 로그아웃/재로그인
- 비로그인으로 `/members` 직접 접근 → 로그인으로 리다이렉트되는지
- 비로그인 상태에서 anon 키로 REST API(`/rest/v1/members`) 직접 호출 → 데이터 안 나오는지(RLS)
- 로그인 실패 반복 → 일정 횟수 후 차단(앱 rate limit, 아래 6절)
- FINAL_QA_CHECKLIST 4절 Go/No-Go 표를 모두 채우고 5절 사인오프

## 6. 자동 점검으로 이미 확인된 항목 (코드/저장소)

| 항목 | 상태 | 근거 |
|---|---|---|
| 프로덕션 접속 + HTTPS | ✅ | 기본 도메인 `/login` 렌더링·HTTPS 확인 |
| 빌드/타입체크/린트 | ✅ | `npm run build` · `tsc` · `eslint` 통과 |
| 단위 테스트 | ✅ | `npm test` 78개 통과 |
| 의존성 취약점(High/Critical) | ✅ | `npm audit` 0건 |
| 디버그/임시 라우트 제거 | ✅ | 라우트 인벤토리 정상(임시 dev 라우트는 Module 3에서 제거) |
| 비밀키 미커밋 · `.env` gitignore | ✅ | HANDOFF_08 점검 |
| 전 테이블 RLS 활성화(마이그레이션) | ✅ | `0001`/`0002` 마이그레이션 |
| 앱 레벨 rate limit(로그인/가입) | ✅ | 로컬 E2E: 11회째 차단 확인 (HANDOFF_08) |

## 7. 알려진 배포 관련 항목 / 후속

- **Next 16 `middleware` → `proxy` 파일 규칙 deprecation**: 빌드 시 경고가 뜬다(동작에는 문제 없음). 인증 가드 파일이라 오픈 직전 변경은 리스크가 있어 보류했다. 안정화 후 `npx @next/codemod@canary middleware-to-proxy .`로 마이그레이션 권장.
- **rate limit 인메모리 한계**: 서버리스 단일 인스턴스 best-effort. 실트래픽 확인 후 Upstash 등 공유 저장소로 `hitRateLimit`만 교체(로직 재사용). (HANDOFF_08)
- **Supabase/Vercel 무료 티어 전환 계획**: [OPERATIONS.md](./OPERATIONS.md) 4절.
