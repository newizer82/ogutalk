// ── 공유 문구·링크 단일 출처 ───────────────────────────────────
// 공유 경로가 3곳(ShareButton / kakao / promoShare)이라 문구와 링크가 흩어져 있었다.
// 문구를 바꿀 때 한 군데만 고치도록 여기로 모은다.
//
// 원칙: 받는 사람은 이 앱을 모른다. "남의 달성률"이 아니라
//       "무슨 문제를 푸는 앱인지"로 시작해야 설치로 이어진다.
//       v1.13.2: 앱 안에서 쓰는 말(성장·힐링)과 같은 말로 맞춘다 — 설치 후에 말이 바뀌면 낯설다.

export const INSTALL_LINK = 'https://play.google.com/store/apps/details?id=com.ogutalk.app'

// 시스템 공유 시트 / 링크 복사용 본문
export const SHARE_TEXT =
  '오늘 내 시간은 어디에 있었을까?\n' +
  '매시 59분에 알려주고, 내 하루의 성장과 힐링을 자동으로 재주는 앱이에요 🌱'

// 공유 시트 제목 / 카카오 카드
export const SHARE_TITLE      = '내 하루의 성장과 힐링을 재주는 앱'
export const SHARE_CARD_DESC  = '매시 59분 알람 + 성장·힐링 자동 기록'
export const SHARE_BUTTON     = '오구톡 설치하기'
