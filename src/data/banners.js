// ── 기본 배너 (앱에 내장) ───────────────────────────────────────
// 서버(Supabase banners 테이블)에서 받아오지 못하면 이 목록을 쓴다.
// 오프라인·첫 실행·테이블 미생성 어느 경우에도 홈이 비지 않게 하기 위함.
//
// 규칙 (BannerKinds 시안과 같다)
//  - 한 번에 최대 4장, 이벤트는 동시에 한 장만
//  - 기간이 지나면 자동으로 사라진다 (ends 없으면 상시)
//  - 받아온 광고는 넣지 않는다. 우리가 만든 것(앱 소식)과 우리가 운영하는 서비스만.
//    돈 받고 남의 상품을 올리기 시작하면 알람 앱의 홈이 광고판이 되고, "지금 하나만" 이 가려진다.
export const BANNER_KINDS = {
  notice: { label: '공지',    tagBg: '#EEF1FB', tagText: '#3B5BC4', iconBg: '#F4F4F7' },
  news:   { label: '카드뉴스', tagBg: '#E6F4EE', tagText: '#1E7A58', iconBg: '#F0F7F4' },
  event:  { label: '이벤트',  tagBg: '#FF6B2C', tagText: '#FFFFFF', iconBg: '#FFE4D2' },
  tip:    { label: '사용법',  tagBg: '#FFF0E8', tagText: '#C2521C', iconBg: '#FFF0E8' },
  // 우리가 운영하는 다른 서비스. 공지·이벤트에 섞으면 셋 다 흐려진다
  store:  { label: '서비스',  tagBg: '#E8F4F2', tagText: '#13796B', iconBg: '#EFF8F6' },
}

/** action: { tab } 앱 안으로, { url } 바깥으로 */
// sort 가 작을수록 앞. 앞에서 4장만 뜨므로 뒤쪽은 대기 상태가 된다.
// 기간 한정(ends_at)이 끝나면 자동으로 빠지고 뒤에 있던 것이 올라온다.
export const DEFAULT_BANNERS = [
  {
    id: 'damda-2026',
    kind: 'event',
    emoji: '🎪',
    text: '담다 페스티벌 11월 7일에 열려요',
    action: { url: 'https://www.instagram.com/p/DeLY9z9ksJ_/' },
    // 행사 당일까지 — 하루가 끝날 때 사라진다 (지난 행사가 홈에 남는 게 제일 나쁘다)
    ends_at: '2026-11-07T23:59:59+09:00',
    sort: 1,
  },
  {
    id: 'ai-bridge',
    kind: 'tip',
    emoji: '🤖',
    text: '알람 때 AI에게 물어볼 질문을 드려요',
    action: { tab: 'settings' },
    sort: 5,
  },
  {
    id: 'wincleany',
    kind: 'store',
    emoji: '✨',
    text: '외부창·창틀·방충망 청소, 윈클리니',
    action: { url: 'https://smartstore.naver.com/wincleany' },
    sort: 15,
  },
  {
    id: 'auto-record',
    kind: 'tip',
    emoji: '⏱️',
    // 기능 설명("자동으로 재드려요")이 아니라 그 기능이 주는 것을 말한다.
    // 알람이 오구 지수로 쌓인다 — 이 앱이 하는 일 전체가 한 줄이다
    text: '59분 알람이 쌓여 오구 지수가 돼요',
    action: { tab: 'settings' },
    sort: 20,
  },
  {
    id: 'stamps',
    kind: 'tip',
    emoji: '🏅',
    text: '오늘의 체크 4개를 채워보세요',
    action: { tab: 'reports' },
    sort: 30,
  },
  {
    id: 'mission',
    kind: 'tip',
    emoji: '🎯',
    text: '5분이면 끝나는 오늘의 추천 미션 3개',
    action: { tab: 'todos' },
    sort: 40,
  },
]
