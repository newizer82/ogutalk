const pad = n => String(n).padStart(2, '0')

const MSGS = {
  '30분': {
    emoji: '😮', title: '스마트폰 30분 경과!',
    sub: '잠깐 눈을 쉬고 스트레칭해보세요',
    color: '#f59e0b',
    grad: 'linear-gradient(135deg,rgba(245,158,11,0.25),rgba(251,191,36,0.1))',
  },
  '1시간': {
    emoji: '😱', title: '스마트폰 1시간 경과!',
    sub: '장시간 사용은 눈과 목에 무리를 줘요',
    color: '#ef4444',
    grad: 'linear-gradient(135deg,rgba(239,68,68,0.25),rgba(248,113,113,0.1))',
  },
}

export default function ImmersionPopup({ level, immersionSec, onReset, onDismiss }) {
  const info = MSGS[level] || MSGS['30분']
  const mins = Math.floor(immersionSec / 60)
  const secs = Math.floor(immersionSec % 60)

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: info.grad, backdropFilter: 'blur(20px)',
    }}>
      <div style={{ textAlign: 'center', padding: '0 32px', maxWidth: 360, width: '100%' }}>
        <div style={{ fontSize: 72, marginBottom: 16, animation: 'pulse 1s infinite' }}>
          {info.emoji}
        </div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#f1f5f9', marginBottom: 8 }}>
          {info.title}
        </div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6, lineHeight: 1.6 }}>
          {info.sub}
        </div>
        <div style={{ color: info.color, fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
          {pad(mins)}:{pad(secs)}
        </div>
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 32 }}>현재 몰입 시간</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            style={{
              width: '100%', padding: '14px 20px', border: 'none', borderRadius: 16,
              background: `linear-gradient(135deg,${info.color},${info.color}cc)`,
              color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}
            onClick={onReset}
          >
            🔄 몰입 시간 리셋
          </button>
          <button
            style={{
              padding: '8px 14px', borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}
            onClick={onDismiss}
          >
            계속 사용하기
          </button>
        </div>
      </div>
    </div>
  )
}
