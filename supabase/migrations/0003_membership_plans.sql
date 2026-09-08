-- Module 5: 실제 운영 요금제 반영
--
-- 배경: 피지컬그라운드의 실제 요금제는 "기간 + 주간 이용 횟수 + 가격" 조합이다.
--   1개월 주3회 190,000 / 1개월 주5회 210,000 / 3개월 주3회 530,000 / 3개월 주5회 590,000
-- 0001 스키마에는 가격과 주간 횟수를 담을 곳이 없어 컬럼을 추가한다.
--
-- plan_name/price를 스냅샷으로 저장하는 이유: 나중에 요금이 인상되어도
-- 과거에 판매된 회원권 기록은 당시 이름/가격 그대로 남아야 하기 때문이다.
-- 참고: docs/TECH_SPEC.md 4.2 / 4.3절

alter table public.memberships
  add column if not exists plan_code text,
  add column if not exists plan_name text,
  add column if not exists price int,
  add column if not exists sessions_per_week int;

comment on column public.memberships.plan_code is '요금제 코드 (M1_W3, M1_W5, M3_W3, M3_W5)';
comment on column public.memberships.plan_name is '판매 시점 요금제 이름 스냅샷';
comment on column public.memberships.price is '판매 시점 가격(원) 스냅샷';
comment on column public.memberships.sessions_per_week is '주간 이용 횟수 (3 또는 5)';

-- 가격은 음수일 수 없다
alter table public.memberships
  drop constraint if exists memberships_price_non_negative;
alter table public.memberships
  add constraint memberships_price_non_negative
  check (price is null or price >= 0);

-- 주간 횟수는 1~7 사이
alter table public.memberships
  drop constraint if exists memberships_sessions_per_week_range;
alter table public.memberships
  add constraint memberships_sessions_per_week_range
  check (sessions_per_week is null or (sessions_per_week between 1 and 7));

-- 회원별 회원권 조회는 "종료일이 가장 늦은 것"을 대표로 쓰므로 정렬용 인덱스를 둔다
create index if not exists idx_memberships_member_end_date
  on public.memberships (member_id, end_date desc);
