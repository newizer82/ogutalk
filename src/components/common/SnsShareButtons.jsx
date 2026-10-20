// 링크 공유 — 카카오 공유(ShareButton) 아래에 배치.
// 인스타 홍보 이미지 버튼은 리포트의 점수 카드로 옮겼다 (v1.21.0).
// 홈 맨 아래에 맥락 없이 떠 있으면 "뭘 공유하라는 건지" 를 알 수 없다.
import { shareApp } from '../../lib/promoShare'
import { theme } from '../../styles/theme'

export default function SnsShareButtons() {
  const btnBase = {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.05)',
    background: 'rgba(0,0,0,0.025)',
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
    </div>
  )
}
