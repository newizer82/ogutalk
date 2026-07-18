-- v1.3.0: FCM 토큰 저장 + 사용자별 알람 재등록 push 대상
-- 클라이언트가 initFirebasePush()에서 upsert. Edge Function이 매일 select.

create table if not exists public.fcm_tokens (
  token       text primary key,
  user_id     uuid references auth.users(id) on delete cascade,
  platform    text not null default 'android',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists fcm_tokens_user_id_idx on public.fcm_tokens(user_id);

alter table public.fcm_tokens enable row level security;

-- 사용자는 자신의 토큰만 CRUD
drop policy if exists "fcm_tokens_own" on public.fcm_tokens;
create policy "fcm_tokens_own" on public.fcm_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================
-- 매일 새벽 3시(KST=UTC 18:00) 알람 재등록 트리거
-- ============================================
-- 사전조건: v0.8.0_pg_cron_push.sql 에서 app.settings.anon_key 이미 설정됨.
--            안 됐다면 아래 두 줄 먼저 실행:
--   ALTER DATABASE postgres SET "app.settings.anon_key" = '<Supabase anon key>';

-- 기존 스케줄 제거 (재실행 안전)
select cron.unschedule('ogutalk-reschedule-daily')
where exists (select 1 from cron.job where jobname = 'ogutalk-reschedule-daily');

-- 새 스케줄 등록
select cron.schedule(
  'ogutalk-reschedule-daily',
  '0 18 * * *',   -- UTC 18:00 = KST 03:00
  $$
  select net.http_post(
    url     := 'https://vmfjvgbadsucgxvuchmj.supabase.co/functions/v1/reschedule-alarms',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body    := jsonb_build_object('trigger', 'cron')
  ) as request_id;
  $$
);
