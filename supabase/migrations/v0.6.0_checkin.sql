-- v0.6.0 체크인 마이그레이션
-- Supabase SQL Editor에서 실행하세요.

-- notification_log 테이블에 activity_type 컬럼 추가
ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS activity_type TEXT;

COMMENT ON COLUMN notification_log.activity_type IS
'체크인 활동 유형: goal_work | study | sns | rest';
