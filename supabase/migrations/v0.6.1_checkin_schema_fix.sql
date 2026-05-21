-- v0.6.1 notification_log 스키마 보정
-- 증상: column notification_log.created_at does not exist (42703)
-- 원인: 테이블에 우리 코드가 INSERT하는 컬럼들이 일부 누락
-- 실행: Supabase Dashboard → SQL Editor 에 통째로 붙여넣고 RUN

-- 1) 누락 컬럼 추가 (IF NOT EXISTS — 이미 있으면 무시)
ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS activity_type TEXT,
  ADD COLUMN IF NOT EXISTS alarm_hour    INTEGER,
  ADD COLUMN IF NOT EXISTS created_at    TIMESTAMPTZ DEFAULT NOW();

-- 2) RLS 활성화 (이미 켜져 있으면 무시됨)
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- 3) RLS 정책: 본인 데이터만 조회/삽입 가능
DROP POLICY IF EXISTS "Users can view own notification_log" ON notification_log;
CREATE POLICY "Users can view own notification_log"
  ON notification_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own notification_log" ON notification_log;
CREATE POLICY "Users can insert own notification_log"
  ON notification_log FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4) 효율적 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_notification_log_user_created
  ON notification_log (user_id, created_at DESC);

-- 5) 컬럼 코멘트 (가독성)
COMMENT ON COLUMN notification_log.user_id       IS '체크인한 사용자';
COMMENT ON COLUMN notification_log.activity_type IS '체크인 활동 유형: goal_work | study | sns | rest';
COMMENT ON COLUMN notification_log.alarm_hour    IS '알람이 울린 시각 (0~23, 로컬 시간 기준)';
COMMENT ON COLUMN notification_log.created_at    IS '체크인 저장 시각 (UTC)';
