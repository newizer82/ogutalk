// ── 기본 배너 (앱에 내장) ───────────────────────────────────────
// 서버(Supabase banners 테이블)에서 받아오지 못하면 이 목록을 쓴다.
// 오프라인·첫 실행·테이블 미생성 어느 경우에도 홈이 비지 않게 하기 위함.
//
// 규칙 (BannerKinds 시안과 같다)
//  - 한 번에 최대 4장, 이벤트는 동시에 한 장만
//  - 기간이 지나면 자동으로 사라진다 (ends 없으면 상시)
//  - 외부 광고는 넣지 않는다. 이 자리는 오구톡 자체 소식 전용.
export const BANNER_KINDS = {
  notice: { label: '공지',    tagBg: '#EEF1FB', tagText: '#3B5BC4', iconBg: '#F4F4F7' },
  news:   { label: '카드뉴스', tagBg: '#E6F4EE', tagText: '#1E7A58', iconBg: '#F0F7F4' },
  event:  { label: '이벤트',  tagBg: '#FF6B2C', tagText: '#FFFFFF', iconBg: '#FFE4D2' },
  tip:    { label: '사용법',  tagBg: '#FFF0E8', tagText: '#C2521C', iconBg: '#FFF0E8' },
}

/** action: { tab } 앱 안으로, { url } 바깥으로 */
export const DEFAULT_BANNERS = [
  {
    id: 'auto-record',
    kind: 'tip',
    emoji: '📊',
    text: '내 하루의 성장과 힐링, 자동으로 재드려요',
    action: { tab: 'settings' },
    sort: 10,
  },
  {
    id: 'score',
    kind: 'tip',
    emoji: '📈',
    text: '오늘 하루를 100점으로 보여드려요',
    action: { tab: 'report' },
    sort: 20,
  },
  {
    id: 'mission',
    kind: 'tip',
    emoji: '🎯',
    text: '5분이면 끝나는 오늘의 미션 3개',
    action: { tab: 'todos' },
    sort: 30,
  },
]
