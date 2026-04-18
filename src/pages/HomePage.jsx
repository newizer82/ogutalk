import Clock from '../components/home/Clock'
import StatusCards from '../components/home/StatusCards'
import { useEconomicTips } from '../hooks/useEconomicTips'
import { theme, gradients } from '../styles/theme'
import GoalProgress from '../components/goals/GoalProgress'

const styles = {
  momentumWrap: {
    margin: '16px 16px 0',
    padding: '20px',
    background: theme.bg.secondary,
    borderRadius: 20,
    textAlign: 'center',
  },
  momentumLabel: {
    fontSize: 12,
    color: theme.text.muted,
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 8,
  },
  momentumNumber: {
    fontSize: 56,
    fontWeight: 900,
    lineHeight: 1,
    background: gradients.logo,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  momentumUnit: {
    fontSize: 14,
    color: theme.text.secondary,
    marginTop: 6,
  },
  section: {
    margin: '14px 16px 0',
    padding: '14px 16px',
    background: theme.bg.secondary,
    borderRadius: 16,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
  },
  goalRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '6px 0',
    borderBottom: `1px solid ${theme.bg.elevated}`,
  },
  goalTitle: {
    fontSize: 13,
    color: theme.text.primary,
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  goalPct: {
    fontSize: 12,
    color: theme.accent.secondary,
    fontWeight: 700,
    flexShrink: 0,
    minWidth: 34,
    textAlign: 'right',
  },
  todoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '7px 0',
    borderBottom: `1px solid ${theme.bg.elevated}`,
  },
  dot: (done) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
    background: done ? theme.status.success : theme.accent.primary,
  }),
  todoText: (done) => ({
    fontSize: 13,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  emptyText: {
    fontSize: 13,
    color: theme.text.muted,
    textAlign: 'center',
    padding: '10px 0',
  },
  refreshBtn: {
    background: 'transparent',
    border: 'none',
    color: theme.accent.secondary,
    fontSize: 18,
    cursor: 'pointer',
    padding: 0,
    lineHeight: 1,
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: 6,
  },
  tipContent: {
    fontSize: 13,
    color: theme.text.secondary,
    lineHeight: 1.6,
  },
  tipCategory: {
    display: 'inline-block',
    marginTop: 8,
    padding: '3px 8px',
    background: theme.bg.elevated,
    borderRadius: 6,
    fontSize: 11,
    color: theme.accent.secondary,
  },
}

export default function HomePage({
  alarmCount = 0,
  immersionMinutes = 0,
  todos = [],
  goals = [],
}) {
  const { current, nextTip } = useEconomicTips()

  // 전체 추진력: 목표들의 평균 추진율
  const overallMomentum = goals.length === 0
    ? 0
    : Math.round(goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length)

  const pendingTodos = todos.filter(t => !t.completed)
  const previewTodos = pendingTodos.slice(0, 4)

  return (
    <div style={{ paddingBottom: 16 }}>
      <Clock />
      <StatusCards
        alarmCount={alarmCount}
        immersionMinutes={immersionMinutes}
        pendingTodos={pendingTodos.length}
      />

      {/* 전체 추진력 */}
      <div style={styles.momentumWrap}>
        <div style={styles.momentumLabel}>⚡ 전체 추진력</div>
        <div style={styles.momentumNumber}>{overallMomentum}</div>
        <div style={styles.momentumUnit}>
          {goals.length > 0 ? `목표 ${goals.length}개 평균 달성률 %` : '목표를 추가해보세요!'}
        </div>
      </div>

      {/* 목표별 추진율 카드 */}
      {goals.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionTitle}>🎯 목표 추진율</span>
          </div>
          {goals.slice(0, 5).map(goal => (
            <div key={goal.id} style={styles.goalRow}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={styles.goalTitle}>{goal.title}</span>
                  <span style={styles.goalPct}>{goal.progress ?? 0}%</span>
                </div>
                <GoalProgress progress={goal.progress ?? 0} height={4} />
              </div>
            </div>
          ))}
          {goals.length > 5 && (
            <p style={{ ...styles.emptyText, paddingBottom: 0 }}>외 {goals.length - 5}개 더...</p>
          )}
        </div>
      )}

      {/* 미완료 할일 미리보기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>📋 미완료 할일</span>
          <span style={{ fontSize: 12, color: theme.text.muted }}>{pendingTodos.length}개 남음</span>
        </div>
        {previewTodos.length === 0 ? (
          <p style={styles.emptyText}>
            {todos.length === 0 ? '할일 탭에서 추가해보세요!' : '모든 할일을 완료했어요! 🎉'}
          </p>
        ) : (
          previewTodos.map(todo => (
            <div key={todo.id} style={styles.todoRow}>
              <div style={styles.dot(todo.completed)} />
              <span style={styles.todoText(todo.completed)}>{todo.title}</span>
            </div>
          ))
        )}
        {pendingTodos.length > 4 && (
          <p style={{ ...styles.emptyText, paddingBottom: 0 }}>외 {pendingTodos.length - 4}개 더...</p>
        )}
      </div>

      {/* 경제 상식 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>💡 오늘의 경제 상식</span>
          <button style={styles.refreshBtn} onClick={nextTip} title="다음 상식">↻</button>
        </div>
        {current ? (
          <>
            <p style={styles.tipTitle}>{current.title}</p>
            <p style={styles.tipContent}>{current.content}</p>
            {current.category && <span style={styles.tipCategory}>{current.category}</span>}
          </>
        ) : (
          <p style={styles.tipContent}>경제 상식을 불러오는 중...</p>
        )}
      </div>
    </div>
  )
}
