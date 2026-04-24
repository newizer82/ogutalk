-- ============================================
-- v0.8.0 pg_cron 매시 59분 푸시 스케줄
-- Supabase SQL Editor에서 실행하세요.
-- ============================================

-- ① ANON KEY 저장 (Dashboard → Settings → API → anon key 복사)
-- 아래 [ANON_KEY] 를 실제 키로 교체 후 실행
ALTER DATABASE postgres
SET "app.settings.anon_key" = '[ANON_KEY_여기에_붙여넣기]';

-- ② 기존 스케줄 제거 (중복 방지)
SELECT cron.unschedule('ogutalk-hourly-push')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'ogutalk-hourly-push'
);

-- ③ 매시 59분 자동 푸시 등록
SELECT cron.schedule(
  'ogutalk-hourly-push',
  '59 * * * *',
  $$
  SELECT net.http_post(
    url     := 'https://vmfjvgbadsucgxvuchmj.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.anon_key', true)
    ),
    body    := jsonb_build_object('trigger', 'cron')
  ) AS request_id;
  $$
);

-- ④ 등록 확인
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'ogutalk-hourly-push';

-- ============================================
-- 실행 로그 확인 (나중에 별도 실행)
-- ============================================
-- SELECT runid, start_time, end_time, status, return_message
-- FROM cron.job_run_details
-- WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname = 'ogutalk-hourly-push')
-- ORDER BY start_time DESC
-- LIMIT 10;
