# Handoff: Module 00 - 프로젝트 초기 셋업

## 완료 상태
- [x] 구현 완료

## 무엇을 했는가
- `docs/` 폴더에 있던 PRD.md, TECH_SPEC.md, TASK_BREAKDOWN.md, FINAL_QA_CHECKLIST.md를 먼저 커밋.
- 프로젝트 루트에 `npx create-next-app@latest`로 Next.js 앱 스캐폴딩 (TypeScript, Tailwind CSS, ESLint, App Router, `src/` 디렉터리 미사용, import alias `@/*`).
- 생성된 파일: `app/`, `public/`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `package.json` 등 Next.js 표준 구조. TECH_SPEC.md 6절의 폴더 구조(`lib/`, `middleware.ts`, `supabase/`)는 아직 만들지 않음 — Module 2, 1에서 각각 생성 예정.
- `.gitignore`에 `.claude/` 추가 (로컬 개발 서버 설정 파일, 저장소에는 불필요).
- GitHub 저장소 생성: `reco5149-art/physical-ground-membership` (**비공개**, 회원 개인정보를 다루는 앱이므로 private로 결정).
- 로컬 저장소를 SSH 원격(`git@github.com:reco5149-art/physical-ground-membership.git`)으로 연결, `main` 브랜치로 푸시.
- Vercel 프로젝트 연동: GitHub App(Vercel)을 이 저장소 하나에만 접근하도록 최소 권한으로 설치 → Vercel에서 Import → Deploy.

## 테스트 결과
- 로컬: `npm run dev` (포트 3210, `.claude/launch.json`에 `physical-ground-dev`로 등록)로 기본 Next.js 페이지 정상 렌더링 확인, 콘솔 에러 없음.
- 배포: `https://physical-ground-membership.vercel.app` 접속 시 동일한 기본 페이지 정상 렌더링 확인 (Status: Ready).
- `main` 브랜치 푸시 → Vercel 자동 배포까지는 이번 초기 Import 배포로 1회만 확인, 이후 커밋에서도 자동 배포되는지는 Module 1~2 작업 커밋 때 재확인 필요.

## 다음 모듈 시작 시 필요한 정보
- Next.js 프로젝트가 리포지토리 루트에 있음 (별도 `src/` 없음, `app/` 라우터 사용).
- Supabase 프로젝트는 아직 생성되지 않음 — Module 1에서 새로 생성.
- Vercel 환경변수는 아직 하나도 등록하지 않음. Module 2에서 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 로컬 `.env.local`과 Vercel 프로젝트 설정 양쪽에 등록해야 함.
- Vercel GitHub App은 이 저장소 하나에만 설치되어 있음 (권한 최소화 상태 유지할 것).
- 알려진 이슈: 이 PC의 Windows 컴퓨터 이름(COMPUTERNAME)이 한글이라 Vercel CLI(`vercel login`, `vercel deploy` 등)가 내부 헤더 인코딩 오류로 즉시 크래시함. 따라서 이후 모듈에서도 Vercel 관련 작업은 CLI 대신 **웹 대시보드(브라우저)** 로 진행해야 함.

## 다음 모듈
- Module 1 - Supabase 프로젝트 & DB 스키마: [TASK_BREAKDOWN.md](../TASK_BREAKDOWN.md#module-1--supabase-프로젝트--db-스키마)
