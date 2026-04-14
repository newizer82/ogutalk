import { theme, gradients } from '../../styles/theme'

const quotes = [
  '지금 이 순간도 소중한 시간입니다.',
  '휴식은 낭비가 아니라 재충전입니다.',
  '작은 쉼이 더 큰 집중을 만듭니다.',
  '시간을 의식하는 것이 삶을 바꿉니다.',
  '지금 당신은 잘 하고 있어요.',
]

const overlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  zIndex: 1000,
  maxWidth: 420,
  left: '50%',
  transform: 'translateX(-50%)',
  animation: 'fadeIn 0.2s ease',
}

const sheet = {
  width: '100%',
  background: theme.bg.secondary,
  borderRadius: '24px 24px 0 0',
  padding: '28px 24px 40px',
  animation: 'slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
}

const styles = {
  badge: {
    textAlign: 'center',
    fontSize: 52,
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 800,
    background: gradients.logo,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 13,
    marginBottom: 24,
  },
  quoteBox: {
    background: theme.bg.elevated,
    borderRadius: 14,
    padding: '16px 18px',
    marginBottom: 12,
  },
  quoteLabel: {
    fontSize: 11,
    color: theme.accent.secondary,
    fontWeight: 600,
    marginBottom: 6,
  },
  quoteText: {
    fontSize: 15,
    color: theme.text.primary,
    lineHeight: 1.6,
  },
  todoBox: {
    background: theme.bg.elevated,
    borderRadius: 14,
    padding: '14px 18px',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoLabel: {
    fontSize: 14,
    color: theme.text.secondary,
  },
  todoBadge: (n) => ({
    fontSize: 20,
    fontWeight: 800,
    color: n > 0 ? theme.status.warning : theme.status.success,
  }),
  closeBtn: {
    width: '100%',
    padding: '14px',
    background: gradients.button,
    border: 'none',
    borderRadius: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
}

export default function AlarmPopup({ pendingTodos = 0, onClose }) {
  const now = new Date()
  const quote = quotes[now.getMinutes() % quotes.length]
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={styles.badge}>⏱️</div>
        <p style={styles.title}>오구!</p>
        <p style={styles.subtitle}>{timeStr} — 벌써 59분이 지났어요</p>

        <div style={styles.quoteBox}>
          <p style={styles.quoteLabel}>💬 오늘의 한마디</p>
          <p style={styles.quoteText}>{quote}</p>
        </div>

        <div style={styles.todoBox}>
          <span style={styles.todoLabel}>남은 할일</span>
          <span style={styles.todoBadge(pendingTodos)}>
            {pendingTodos > 0 ? `${pendingTodos}개` : '모두 완료!'}
          </span>
        </div>

        <button style={styles.closeBtn} onClick={onClose}>
          확인했어요
        </button>
      </div>
    </div>
  )
}
