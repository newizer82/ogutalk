// 카카오 JavaScript SDK 동적 로드 + 공유
// SDK는 첫 공유 시점에만 로드 (초기 번들 절약)
// .env.local: VITE_KAKAO_JAVASCRIPT_KEY=<카카오 Developers → 앱 설정 → JavaScript 키>

const SDK_URL = 'https://developers.kakao.com/sdk/js/kakao.min.js'
const WEB_LINK     = 'https://ogutalk.vercel.app'
import { INSTALL_LINK, SHARE_TITLE, SHARE_CARD_DESC, SHARE_BUTTON } from './shareCopy'

async function loadKakao() {
  if (typeof window === 'undefined') throw new Error('브라우저 전용')
  if (window.Kakao?.isInitialized?.()) return window.Kakao

  if (!window.Kakao) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.src = SDK_URL
      s.async = true
      s.onload = resolve
      s.onerror = () => reject(new Error('SDK 로드 실패'))
      document.head.appendChild(s)
    })
  }

  const key = import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY
  if (!key) throw new Error('VITE_KAKAO_JAVASCRIPT_KEY 미설정 (.env.local 확인)')
  window.Kakao.init(key)
  return window.Kakao
}

export async function shareToKakao(progress = 0) {
  try {
    const Kakao = await loadKakao()
    Kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title:       SHARE_TITLE,
        description: SHARE_CARD_DESC,
        imageUrl:    `${WEB_LINK}/icon-512.png?v=1.3.1`,  // 이미지 호스팅
        link: { mobileWebUrl: INSTALL_LINK, webUrl: INSTALL_LINK },  // 카드 클릭 → Play Store
      },
      buttons: [{
        title: SHARE_BUTTON,
        link:  { mobileWebUrl: INSTALL_LINK, webUrl: INSTALL_LINK },
      }],
    })
  } catch (e) {
    alert('카카오 공유 실패: ' + (e?.message || e))
  }
}
