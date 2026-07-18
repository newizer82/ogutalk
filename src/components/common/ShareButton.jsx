import { shareToKakao } from '../../lib/kakao'

export default function ShareButton({ progress = 0 }) {
  return (
    <button
      onClick={() => shareToKakao(progress)}
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
