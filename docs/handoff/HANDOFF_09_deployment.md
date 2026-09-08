# Handoff: Module 09 - 배포 마무리 & 운영 준비

## 완료 상태
- [ ] 부분 완료 — **자동배포·코드·문서 준비는 완료**, **커스텀 도메인·SMTP·프로덕션 최종 QA는 운영자(사용자) 직접 수행 필요**

> Module 9는 커스텀 도메인 연결, 백업/모니터링, 개인정보 정책, 프로덕션 전체 플로우 QA가 목표다.
> 이 중 도메인 연결·SMTP·실사용 계정으로의 프로덕션 QA는 계정/비밀값/자격증명이 필요해 AI가 대신 못 한다.
> 대신 **자동배포로 기본 도메인 배포는 이미 살아 있고**, 운영자가 남은 작업을 끝낼 수 있도록 런북을 정리했다.

## 무엇을 했는가

| 경로 | 역할 |
|---|---|
| (git push) | `main`에 Module 7·8 커밋 푸시(`4547834..047b7da`) → Vercel 자동배포 트리거 |
| `docs/DEPLOYMENT.md` | **Go-Live 런북** — 현재 배포 상태, 환경변수, 운영자 대시보드 체크리스트, 프로덕션 QA 절차, 자동 점검 결과, 후속 항목 |
| `docs/TASK_BREAKDOWN.md` | 진행 상태표 Module 9 갱신 |

## 검증 (자동 점검으로 확인한 것)

| 항목 | 결과 |
|---|---|
| 프로덕션 접속 | ✅ `https://physical-ground-membership.vercel.app/login` 렌더링 |
| HTTPS | ✅ `location.protocol === 'https:'` |
| 빌드/타입체크/린트 | ✅ `npm run build` · `eslint` 통과 |
| 단위 테스트 | ✅ `npm test` 78개 |
| 의존성 취약점(High/Critical) | ✅ `npm audit` 0건 |
| 디버그/임시 라우트 | ✅ 라우트 인벤토리 정상(임시 dev 라우트는 Module 3에서 제거됨) |

## 운영자가 마무리해야 할 것 (프로덕션 Go-Live)

세부는 [DEPLOYMENT.md](../DEPLOYMENT.md) 4·5절과 [HANDOFF_08](./HANDOFF_08_security.md) 운영자 체크리스트. 요약:

1. Vercel Deployments에서 최신 커밋(`047b7da`) **Ready** 확인.
2. Supabase: 이메일 확인 ON, **커스텀 SMTP + 실메일 해피패스 1회**(오픈 전 필수), 비밀번호 정책·유출 차단, CAPTCHA, Security Advisor 0건, Site URL/Redirect URLs(운영 도메인 + `/auth/confirm`).
3. Vercel: 커스텀 도메인 + HTTPS.
4. 프로덕션 도메인에서 [FINAL_QA_CHECKLIST.md](../FINAL_QA_CHECKLIST.md) 3개 영역 점검 후 Go/No-Go 사인오프.

## 알려진 이슈 / 후속

- **`middleware` → `proxy` deprecation(Next 16)**: 경고만 뜨고 동작엔 문제 없음. 인증 가드라 오픈 직전 변경은 보류. 안정화 후 코드모드로 마이그레이션 권장.
- **rate limit 인메모리 한계**: 서버리스 best-effort. 실트래픽 후 Upstash로 스토어 교체(로직 재사용).
- **테스트 인프라**: `npm test`는 `scripts/register.mjs`(별칭 로더)를 `--import`로 로드한다(Module 7 도입). `scripts/` 두 파일 유지 필요.

## 다음 단계
- 개별 모듈(0~9) 구현은 이로써 마무리. 실제 오픈 전 **[FINAL_QA_CHECKLIST.md](../FINAL_QA_CHECKLIST.md)** 를 프로덕션에서 수행하고 사인오프한다.
