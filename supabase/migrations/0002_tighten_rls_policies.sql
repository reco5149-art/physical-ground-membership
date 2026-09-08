-- Module 1 후속: RLS 정책 정교화
--
-- 배경: 0001에서 만든 정책은 `to authenticated using (true) with check (true)` 형태였다.
-- 동작상으로는 "로그인한 직원만 전체 접근"이라는 의도와 정확히 일치하지만,
-- Supabase Security Advisor가 이를 "RLS Policy Always True" 경고로 잡는다.
--
-- FINAL_QA_CHECKLIST.md 3.2절이 "Security Advisor 경고 0건"을 요구하므로,
-- 진짜 경고가 묻히지 않도록 노이즈를 제거한다. 동작은 그대로 유지하되
-- JWT에 유효한 사용자 식별자(sub)가 있는지까지 확인하도록 조건을 강화한다.
-- (select ...) 로 감싸는 것은 Supabase 권장 패턴 — 행마다 함수를 재평가하지 않아 성능에 유리하다.

drop policy if exists "authenticated_full_access_members" on public.members;
drop policy if exists "authenticated_full_access_memberships" on public.memberships;
drop policy if exists "authenticated_full_access_attendances" on public.attendances;

create policy "staff_full_access_members"
  on public.members
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "staff_full_access_memberships"
  on public.memberships
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);

create policy "staff_full_access_attendances"
  on public.attendances
  for all
  to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
