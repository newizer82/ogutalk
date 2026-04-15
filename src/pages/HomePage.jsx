import Clock from '../components/home/Clock'
import StatusCards from '../components/home/StatusCards'
import { useEconomicTips } from '../hooks/useEconomicTips'
import { theme } from '../styles/theme'

const styles = {
  section: {
    margin: '16px 16px 0',
    padding: 16,
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
  summaryRow: {
    display: 'flex',
    gap: 10,
    margin: '16px 16px 0',
  },
  summaryCard: {
    flex: 1,
    padding: '14px 16px',
    background: theme.bg.secondary,
    borderRadius: 16,
  },
  summaryLabel: {
    fontSize: 11,
    color: theme.text.muted,
    marginBottom: 6,
    fontWeight: 600,
  },
  summaryCount: {
    fontSize: 26,
    fontWeight: 800,
    color: theme.text.primary,
    lineHeight: 1,
  },
  summaryUnit: {
    fontSize: 12,
    color: theme.text.secondary,
    marginTop: 4,
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 0',
    borderBottom: `1px solid ${theme.bg.elevated}`,
  },
  todoCheck: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    flexShrink: 0,
  },
  todoText: (done) => ({
    fontSize: 13,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }),
  goalItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 0',
    borderBottom: `1px solid ${theme.bg.elevated}`,
  },
  goalText: {
    fontSize: 13,
    color: theme.text.primary,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  goalProgress: {
    fontSize: 12,
    color: theme.accent.secondary,
    marginLeft: 8,
    flexShrink: 0,
  },
  emptyText: {
    fontSize: 13,
    color: theme.text.muted,
    textAlign: 'center',
    padding: '10px 0',
  },
}

export default function HomePage({
  pendingTodos = 0,
  alarmCount = 0,
  immersionMinutes = 0,
  todos = [],
  todayGoals = [],
}) {
  const { current, nextTip } = useEconomicTips()

  const recentTodos = todos.slice(0, 4)
  const completedTodos = todos.filter(t => t.completed).length
  const totalTodos = todos.length

  const completedGoals = todayGoals.filter(g => (g.progress ?? 0) >= 100).length
  const totalGoals = todayGoals.length

  return (
    <div style={{ paddingBottom: 8 }}>
      <Clock />
      <StatusCards
        alarmCount={alarmCount}
        immersionMinutes={immersionMinutes}
        pendingTodos={pendingTodos}
      />

      {/* 오늘 요약 카드 */}
      <div style={styles.summaryRow}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>✅ 오늘 할일</div>
          <div style={styles.summaryCount}>
            {completedTodos}
            <span style={{ fontSize: 16, color: theme.text.muted, fontWeight: 400 }}>
              /{totalTodos}
            </span>
          </div>
          <div style={styles.summaryUnit}>완료</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryLabel}>🎯 오늘 목표</div>
          <div style={styles.summaryCount}>
            {completedGoals}
            <span style={{ fontSize: 16, color: theme.text.muted, fontWeight: 400 }}>
              /{totalGoals}
            </span>
          </div>
          <div style={styles.summaryUnit}>달성</div>
        </div>
      </div>

      {/* 할일 미리보기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>📋 할일 목록</span>
        </div>
        {recentTodos.length === 0 ? (
          <p style={styles.emptyText}>할일이 없어요. 할일 탭에서 추가해보세요!</p>
        ) : (
          recentTodos.map(todo => (
            <div key={todo.id} style={styles.todoItem}>
              <div style={{
                ...styles.todoCheck,
                background: todo.completed ? theme.status.success : theme.bg.elevated,
                border: todo.completed ? 'none' : `1px solid ${theme.text.muted}`,
              }} />
              <span style={styles.todoText(todo.completed)}>{todo.title}</span>
            </div>
          ))
        )}
        {todos.length > 4 && (
          <p style={{ ...styles.emptyText, paddingBottom: 0 }}>
            외 {todos.length - 4}개 더...
          </p>
        )}
      </div>

      {/* 오늘 목표 미리보기 */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>🎯 오늘 목표</span>
        </div>
        {todayGoals.length === 0 ? (
          <p style={styles.emptyText}>오늘 목표가 없어요. 목표 탭에서 추가해보세요!</p>
        ) : (
          todayGoals.slice(0, 4).map(goal => (
            <div key={goal.id} style={styles.goalItem}>
              <span style={styles.goalText}>{goal.title}</span>
              <span style={styles.goalProgress}>{goal.progress ?? 0}%</span>
            </div>
          ))
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
