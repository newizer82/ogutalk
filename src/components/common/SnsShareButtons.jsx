// SNS 공유 두 버튼 (링크 + 인스타 홍보 이미지)
// 카카오 공유(ShareButton) 아래에 배치
import { shareApp, sharePromoImage } from '../../lib/promoShare'
import { theme } from '../../styles/theme'

export default function SnsShareButtons() {
  const btnBase = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(255,255,255,0.04)',
    color: theme.text.primary,
    fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <button onClick={shareApp} style={btnBase}>
        <span style={{ fontSize: 14 }}>📤</span>
        <span>다른 앱으로 공유</span>
      </button>
      <button onClick={sharePromoImage} style={btnBase}>
        <span style={{ fontSize: 14 }}>📷</span>
        <span>인스타 홍보 이미지</span>
      </button>
    </div>
  )
}
