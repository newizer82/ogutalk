-- ============================================
-- v0.9.0 todos 테이블 todo_type + due_date 컬럼 추가
-- Supabase SQL Editor에서 실행하세요.
-- ============================================

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS todo_type TEXT DEFAULT 'weekly',  -- 'weekly' | 'task'
  ADD COLUMN IF NOT EXISTS due_date  DATE DEFAULT NULL;

-- 기존 할일은 모두 주간 할일로 처리
UPDATE todos SET todo_type = 'weekly' WHERE todo_type IS NULL;

-- 확인
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'todos'
  AND column_name IN ('todo_type', 'due_date');
