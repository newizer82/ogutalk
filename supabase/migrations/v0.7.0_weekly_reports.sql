-- ============================================
-- v0.7.0 주간 리포트 테이블
-- Supabase SQL Editor에서 실행하세요.
-- ============================================

-- 주간 리포트 테이블 생성
CREATE TABLE IF NOT EXISTS weekly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- 통계 데이터
  todos_completed INTEGER DEFAULT 0,
  todos_total INTEGER DEFAULT 0,
  completion_rate NUMERIC DEFAULT 0,

  -- 활동 시간 (분 단위, JSONB)
  activity_minutes JSONB DEFAULT '{}',

  -- 목표 진행률 스냅샷
  goals_progress JSONB DEFAULT '[]',

  -- Claude API 생성 콘텐츠
  highlights TEXT,
  suggestions TEXT,
  story TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),

  -- 동일 주차 중복 방지
  UNIQUE(user_id, year, week_number)
);

-- RLS 활성화
ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- 본인 리포트만 조회
CREATE POLICY "Users can view own reports"
ON weekly_reports FOR SELECT
USING (auth.uid() = user_id);

-- 본인 리포트만 생성
CREATE POLICY "Users can insert own reports"
ON weekly_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 본인 리포트만 수정 (upsert용)
CREATE POLICY "Users can update own reports"
ON weekly_reports FOR UPDATE
USING (auth.uid() = user_id);

-- 조회 성능 인덱스
CREATE INDEX IF NOT EXISTS idx_reports_user_week
ON weekly_reports(user_id, year, week_number DESC);

-- ============================================
-- 검증 쿼리 (위 실행 후 따로 실행)
-- ============================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name = 'weekly_reports';
