-- Module 1: 초기 스키마 (members, memberships, attendances)
-- 참고: docs/TECH_SPEC.md 4절 (DB 설계), 8.5절 (RLS & 권한 최소화)

-- pgcrypto: gen_random_uuid() 사용을 위해 필요 (Supabase는 기본 활성화되어 있으나 명시적으로 보장)
create extension if not exists pgcrypto;

-- ============================================================
-- 1. members
-- ============================================================
create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  birth_date date,
  gender text,
  memo text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.members is '회원 기본 정보';

create index if not exists idx_members_name on public.members (name);
create index if not exists idx_members_phone on public.members (phone);

-- ============================================================
-- 2. memberships (회원권: 기간제 period / 횟수제 count)
-- ============================================================
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  type text not null check (type in ('period', 'count')),
  start_date date not null,
  end_date date,
  total_count int,
  remaining_count int,
  created_at timestamptz not null default now(),
  -- 기간제는 end_date 필수
  constraint memberships_period_requires_end_date check (
    type <> 'period' or end_date is not null
  ),
  -- 횟수제는 total_count(양수) 필수
  constraint memberships_count_requires_total check (
    type <> 'count' or (total_count is not null and total_count > 0)
  ),
  -- 종료일은 시작일 이후여야 함 (TASK_BREAKDOWN.md FINAL_QA 2.2-6 대비)
  constraint memberships_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  -- 잔여 횟수는 음수 불가
  constraint memberships_remaining_count_non_negative check (
    remaining_count is null or remaining_count >= 0
  )
);

comment on table public.memberships is '회원권 (기간제/횟수제)';

create index if not exists idx_memberships_member_id on public.memberships (member_id);

-- ============================================================
-- 3. attendances (출석 이력)
-- ============================================================
create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  membership_id uuid references public.memberships(id) on delete set null,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references auth.users(id) on delete set null
);

comment on table public.attendances is '출석 체크 이력';

create index if not exists idx_attendances_member_id on public.attendances (member_id);
create index if not exists idx_attendances_checked_in_at on public.attendances (checked_in_at);

-- ============================================================
-- 4. Row Level Security
-- 정책: 로그인한 직원(authenticated)만 CRUD 가능. 비로그인(anon)은 전면 차단.
-- 주: 아래 정책들은 0002_tighten_rls_policies.sql 에서 교체되었다.
--     (동작은 동일하나 Security Advisor의 "RLS Policy Always True" 경고 제거)
-- ============================================================
alter table public.members enable row level security;
alter table public.memberships enable row level security;
alter table public.attendances enable row level security;

create policy "authenticated_full_access_members"
  on public.members
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_memberships"
  on public.memberships
  for all
  to authenticated
  using (true)
  with check (true);

create policy "authenticated_full_access_attendances"
  on public.attendances
  for all
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- 5. 권한 부여 (Data API 프로젝트 생성 시 "Automatically expose new tables"를
--    꺼두었으므로, authenticated 역할에만 명시적으로 권한을 부여한다.
--    anon 역할에는 어떤 권한도 부여하지 않는다 — 비로그인 접근을 테이블
--    권한 레벨에서도 이중으로 차단한다.)
-- ============================================================
grant usage on schema public to authenticated;

grant select, insert, update, delete on public.members to authenticated;
grant select, insert, update, delete on public.memberships to authenticated;
grant select, insert, update, delete on public.attendances to authenticated;
