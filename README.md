# 피지컬그라운드 회원관리

헬스장(피지컬그라운드) 직원용 **회원·회원권·출석 관리** 웹앱입니다.

## 🔗 배포 주소 (Live)

**https://physical-ground-membership.vercel.app**

> 직원 전용 도구라 로그인해야 사용할 수 있습니다. (로그인 전에는 로그인 화면만 보입니다.)

## 주요 기능

- **회원 관리**: 등록 / 검색 / 상세 / 수정 (소프트 삭제)
- **회원권**: 4종 요금제(1·3개월 × 주3·5회) 등록, 상태 자동 계산(정상 / 만료임박 / 만료)
- **출석 체크**: 회원 검색 후 체크인, 당일 중복·주간 횟수 초과 경고(차단은 하지 않음)
- **대시보드**: 오늘 출석 수, 유효 회원권 보유 수, 만료임박 / 만료 / 회원권 없음 목록
- **인증/보안**: Supabase Auth(이메일/비밀번호), 전 테이블 RLS, 로그인/가입 rate limit

## 기술 스택

- **Next.js (App Router) · TypeScript · Tailwind CSS**
- **Supabase** (PostgreSQL · Auth · Row Level Security)
- **Vercel** 자동 배포 (`main` 푸시 시)

## 로컬 실행

```bash
npm install
cp .env.example .env.local   # Supabase URL / anon key 입력 (대시보드 → Settings → API)
npm run dev                  # http://localhost:3000
```

품질 게이트:

```bash
npm test         # 단위 테스트 (타입체크 포함)
npm run lint     # ESLint
npm run build    # 프로덕션 빌드
```

## 문서

프로젝트 기획·설계·운영 문서는 [`docs/`](./docs)에 있습니다.

- [PRD.md](./docs/PRD.md) — 제품 요구사항
- [TECH_SPEC.md](./docs/TECH_SPEC.md) — 기술 명세
- [TASK_BREAKDOWN.md](./docs/TASK_BREAKDOWN.md) — 모듈별 작업 진행 현황
- [DEPLOYMENT.md](./docs/DEPLOYMENT.md) — 배포 / Go-Live 런북
- [OPERATIONS.md](./docs/OPERATIONS.md) — 운영(백업·모니터링·개인정보)
- [FINAL_QA_CHECKLIST.md](./docs/FINAL_QA_CHECKLIST.md) — 오픈 전 최종 QA
