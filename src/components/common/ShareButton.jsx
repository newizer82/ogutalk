import { shareToKakao } from '../../lib/kakao'
import { IS_NATIVE } from '../../lib/capacitor'

const INSTALL_LINK = 'https://play.google.com/store/apps/details?id=com.ogutalk.app'

// 네이티브: Capacitor Share (안드로이드 공유 시트) → 카톡·인스타·메시지 등 선택 가능
// 웹: 카카오 JavaScript SDK (예쁜 카카오 카드)
async function share(progress) {
  if (IS_NATIVE) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({
        title:       '매시 59분 오구 알람 앱',
        text:        `나는 오늘 목표 ${progress}% 달성! 같이 써봐요 🕐`,
        url:         INSTALL_LINK,
        dialogTitle: '오구톡 공유',
      })
    } catch (e) {
      // 사용자가 공유 취소한 경우 등 — 무시
      if (!String(e?.message || e).toLowerCase().includes('canceled')) {
        console.warn('[share] 실패:', e)
      }
    }
  } else {
    await shareToKakao(progress)
  }
}

export default function ShareButton({ progress = 0 }) {
  return (
    <button
      onClick={() => share(progress)}
      style={{
        width: '100%', padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
        border: 'none', background: '#FEE500', color: '#3A1D1D',
        fontSize: 13, fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      }}
    >
      <span style={{ fontSize: 16 }}>💬</span>
      <span>오구톡 카카오 친구에게 공유하기</span>
    </button>
  )
}
