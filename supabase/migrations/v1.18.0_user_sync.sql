-- 기기 간 동기화 (v1.18.0)
-- 폰에서 바꾼 설정이 PC 에서도 보이고, 오구 지수 기록이 양쪽에 같이 남게 한다.
--
-- 왜 새 테이블인가: user_preferences 는 대시보드에서 만들어져 마이그레이션에 정의가 없고
-- 코드에서 한 번도 쓰이지 않는다. 스키마가 불확실한 테이블에 얹지 않는다.
--
-- 왜 jsonb 한 칸인가: 설정은 통째로 읽고 통째로 쓴다. 칸을 나누면 설정이 늘 때마다
-- 마이그레이션이 따라붙는다 (localStorage 의 ogu_settings 와 모양을 같게 둔다).

create table if not exists public.user_sync (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  settings   jsonb,
  day_log    jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync enable row level security;

-- 내 행만 읽고 쓴다
drop policy if exists "user_sync own row" on public.user_sync;
create policy "user_sync own row" on public.user_sync
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_user_sync_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists set_user_sync_updated_at on public.user_sync;
create trigger set_user_sync_updated_at
  before update on public.user_sync
  for each row execute function public.set_user_sync_updated_at();
