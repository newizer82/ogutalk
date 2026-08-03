-- v1.5.0: 빠른 메모 (로그인 사용자 전용, 최대 9개)
-- 클라이언트가 10번째 insert 전에 가장 오래된 것 삭제

create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  text       text not null,
  created_at timestamptz not null default now()
);

create index if not exists notes_user_created_idx
  on public.notes(user_id, created_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_own" on public.notes;
create policy "notes_own" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
