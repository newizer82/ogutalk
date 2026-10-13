-- 약속·일정 (v1.19.0) — Supabase SQL Editor 에서 실행
--
-- 달력에서 날짜를 누르면 둘 중 하나를 넣는다.
--   약속(appointment) 하루 + 시각(시 단위) + 장소.  분 단위는 쓰지 않는다
--   일정(plan)        여러 날에 걸침 — 2~6일 / 주간 / 월간
-- 둘 다 todos 에 둔다. 할일·약속·일정이 각각 다른 테이블이면 달력이 셋을 합쳐 읽어야 한다.

ALTER TABLE todos
  ADD COLUMN IF NOT EXISTS due_hour SMALLINT DEFAULT NULL,  -- 0~23, NULL = 종일
  ADD COLUMN IF NOT EXISTS end_date DATE     DEFAULT NULL,  -- NULL = 하루짜리
  ADD COLUMN IF NOT EXISTS place    TEXT     DEFAULT NULL;

-- todo_type 은 기존 'weekly' | 'task' 에 'appointment' | 'plan' 이 늘어난다.
-- 값 제약을 걸지 않는 이유: 옛 레코드가 먼저 들어와 있고, 분류가 또 늘 수 있다.

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'todos'
  AND column_name IN ('todo_type', 'due_date', 'due_hour', 'end_date', 'place');
