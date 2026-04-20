export const theme = {
  bg: {
    primary:   '#080f1e',
    secondary: '#0d1526',
    elevated:  '#141d2e',
    card:      'rgba(255,255,255,0.05)',
  },
  accent: {
    primary:   '#6366f1',
    secondary: '#818cf8',
    purple:    '#8b5cf6',
  },
  text: {
    primary:   '#e2e8f0',
    secondary: '#94a3b8',
    muted:     '#64748b',
    dim:       '#475569',
  },
  status: {
    success: '#34d399',
    warning: '#f59e0b',
    error:   '#ef4444',
  },
  border: {
    subtle:  'rgba(255,255,255,0.06)',
    normal:  'rgba(255,255,255,0.08)',
    accent:  'rgba(99,102,241,0.3)',
  },
}

export const gradients = {
  bg:     'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 60%), linear-gradient(180deg, #080f1e 0%, #0d1526 50%, #111827 100%)',
  logo:   'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
  button: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  purple: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  gold:   'linear-gradient(135deg, #f59e0b, #f97316)',
}

// 공통 스타일 토큰
export const S = {
  primaryBtn: {
    width: '100%', padding: '14px 20px', border: 'none', borderRadius: 16,
    background: gradients.button, color: 'white', fontSize: 15, fontWeight: 700,
    cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
  },
  loginBtn: {
    padding: '6px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
    border: '1px solid rgba(99,102,241,0.4)', background: 'rgba(99,102,241,0.12)',
    color: '#818cf8', cursor: 'pointer',
  },
  accentSmallBtn: {
    padding: '8px 18px', borderRadius: 10, border: 'none',
    background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
  },
  ghostBtn: {
    padding: '8px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
    color: '#94a3b8', fontSize: 12, cursor: 'pointer',
  },
  tinyBtn: {
    padding: '5px 12px', borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
    color: '#94a3b8', fontSize: 11, cursor: 'pointer',
  },
  input: {
    width: '100%', padding: '12px 14px', borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)',
    color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  },
  modalBg: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 200, backdropFilter: 'blur(4px)',
  },
  modalBox: {
    width: '100%', maxWidth: 420,
    background: 'linear-gradient(180deg,#141d2e,#0d1526)',
    borderRadius: '24px 24px 0 0', padding: '28px 24px 40px',
    border: '1px solid rgba(255,255,255,0.08)', borderBottom: 'none',
    boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
  },
}
