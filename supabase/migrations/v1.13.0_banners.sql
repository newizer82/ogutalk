-- ============================================
-- v1.13.0 홈 배너 테이블
-- Supabase SQL Editor 에서 실행하세요.
--
-- 앱에는 기본 배너가 내장돼 있어, 이 테이블이 없어도 홈은 정상 동작합니다.
-- 테이블을 만들면 앱 업데이트 없이 공지·이벤트·업데이트 소식을 올릴 수 있습니다.
-- ============================================

CREATE TABLE IF NOT EXISTS public.banners (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'notice',   -- notice | news | event | tip
  emoji      TEXT,
  text       TEXT NOT NULL,
  link_url   TEXT,                             -- 바깥 링크 (없으면 탭 이동용 action 사용)
  action     JSONB,                            -- {"tab":"report"} 또는 {"url":"https://..."}
  sort       INT  NOT NULL DEFAULT 100,
  active     BOOLEAN NOT NULL DEFAULT true,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,                      -- 지나면 앱에서 자동으로 사라집니다
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 누구나 읽을 수 있어야 합니다 (비로그인 사용자도 홈에서 봅니다). 쓰기는 막습니다.
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners are readable by everyone" ON public.banners;
CREATE POLICY "banners are readable by everyone"
  ON public.banners FOR SELECT
  USING (true);

-- ── 예시 데이터 ────────────────────────────────────────────────
-- 그대로 실행하면 아래 3건이 들어갑니다. 날짜는 바꿔서 쓰세요.
INSERT INTO public.banners (id, kind, emoji, text, action, sort, starts_at, ends_at) VALUES
  ('review-2026-10', 'event', '🎁',
   '한 줄 후기 남기고 커피 기프티콘 받기',
   '{"url":"https://ogutalk.vercel.app/feedback"}'::jsonb,
   5, now(), now() + interval '30 days'),

  ('update-2026-10', 'notice', '✨',
   '10월 업데이트 — 오늘의 미션, 오구 지수 5:9',
   '{"tab":"report"}'::jsonb,
   40, now(), now() + interval '30 days'),

  ('news-leak', 'news', '📰',
   '하루 2시간, 어디로 샐까 — 3분 정리',
   '{"url":"https://ogutalk.vercel.app/news/leak"}'::jsonb,
   50, now(), now() + interval '60 days')
ON CONFLICT (id) DO NOTHING;

-- 확인
SELECT id, kind, text, starts_at, ends_at FROM public.banners ORDER BY sort;
