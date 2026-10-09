// ── 오구톡 디자인 토큰 (v1.12.0 화이트) ────────────────────────
// 흰 바탕 + 오렌지 하나. 카드는 면을 채우지 않고 1px 테두리로만 나눈다.
// 알람 팝업만 예외로 어두운 배경을 유지한다 — 밤 10시 알람에 화면이 번쩍하면 안 된다.
export const theme = {
  bg: {
    primary:   '#FFFFFF',
    secondary: '#FFFFFF',
    elevated:  '#F7F7F8',
    card:      '#FFFFFF',
  },
  accent: {
    primary:   '#FF6B2C',   // 면·테두리용
    secondary: '#D9531B',   // 흰 바탕 위 글자용 (연한 오렌지는 글자로 못 쓴다)
    purple:    '#E8762C',
  },
  text: {
    primary:   '#111111',
    secondary: '#8E8E93',
    muted:     '#9A9AA0',
    dim:       '#B0B0B6',
  },
  status: {
    success: '#1E7A58',
    warning: '#B4740F',
    error:   '#D23B2E',
  },
  border: {
    subtle:  '#F0F0F3',
    normal:  '#ECECEF',
    accent:  'rgba(255,107,44,0.22)',
  },
  // 알람 팝업 전용 (다크 유지)
  night: {
    scrim:  'rgba(26,18,12,0.92)',
    card:   '#FFFCF8',
    ink:    '#16130F',
    sub:    '#8B8378',
  },
}

export const gradients = {
  bg:     '#FFFFFF',
  logo:   'linear-gradient(135deg, #FF6B2C, #E8762C)',
  button: 'linear-gradient(135deg, #FF6B2C, #E8762C)',
  purple: 'linear-gradient(135deg, #FF6B2C, #E8762C)',
  gold:   'linear-gradient(135deg, #F2994A, #E8762C)',
}

// 공통 스타일 토큰
export const S = {
  primaryBtn: {
    width: '100%', padding: '14px 20px', border: 'none', borderRadius: 16,
    background: gradients.button, color: 'white', fontSize: 15, fontWeight: 800,
    cursor: 'pointer', boxShadow: '0 6px 18px rgba(255,107,44,0.25)',
  },
  loginBtn: {
    padding: '6px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
    border: '1px solid rgba(255,107,44,0.35)', background: 'rgba(255,107,44,0.08)',
    color: '#D9531B', cursor: 'pointer',
  },
  accentSmallBtn: {
    padding: '8px 18px', borderRadius: 10, border: 'none',
    background: 'rgba(255,107,44,0.1)', color: '#D9531B', fontSize: 12,
    fontWeight: 800, cursor: 'pointer',
  },
  ghostBtn: {
    padding: '8px 14px', borderRadius: 10,
    border: '1px solid #ECECEF', background: 'transparent',
    color: '#8E8E93', fontSize: 12, cursor: 'pointer',
  },
  card: {
    background: '#FFFFFF', border: '1px solid #ECECEF',
    borderRadius: 22, padding: 18,
  },
  tinyBtn: {
    padding: '5px 12px', borderRadius: 8,
    border: '1px solid #ECECEF', background: 'transparent',
    color: '#8E8E93', fontSize: 11, cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: '1px solid #E2E2E6', background: '#FFFFFF',
    color: '#111111', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  modalBg: {
    position: 'fixed', inset: 0, background: 'rgba(17,17,17,0.4)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  modalBox: {
    width: '100%', maxWidth: 420,
    background: '#FFFFFF',
    borderRadius: '24px 24px 0 0', padding: '28px 24px 40px',
    border: '1px solid #ECECEF', borderBottom: 'none',
    boxShadow: '0 -20px 60px rgba(17,17,17,0.18)',
  },
}
