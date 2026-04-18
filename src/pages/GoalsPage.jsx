import { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import { useTodos } from '../hooks/useTodos'
import GoalCard from '../components/goals/GoalCard'
import GoalForm from '../components/goals/GoalForm'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { theme, gradients } from '../styles/theme'

const PERIODS = [
  { id: 'yearly',  label: '연간' },
  { id: 'monthly', label: '월간' },
  { id: 'weekly',  label: '주간' },
  { id: 'daily',   label: '일간' },
]

const styles = {
  tabRow: {
    display: 'flex',
    gap: 8,
    padding: '16px 16px 12px',
  },
  tab: (active) => ({
    flex: 1,
    padding: '8px 0',
    borderRadius: 10,
    border: 'none',
    background: active ? gradients.button : theme.bg.secondary,
    color: active ? '#fff' : theme.text.muted,
    fontSize: 13,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  content: {
    padding: '0 16px',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: theme.text.muted,
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 1,
  },
  unlinkedCard: {
    background: theme.bg.secondary,
    borderRadius: 14,
    padding: '10px 14px',
    marginBottom: 8,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  check: (done) => ({
    width: 16,
    height: 16,
    borderRadius: '50%',
    flexShrink: 0,
    background: done ? theme.status.success : 'transparent',
    border: done ? 'none' : `2px solid ${theme.text.muted}`,
    cursor: 'pointer',
  }),
  unlinkedText: (done) => ({
    fontSize: 13,
    color: done ? theme.text.muted : theme.text.primary,
    textDecoration: done ? 'line-through' : 'none',
  }),
}

export default function GoalsPage({ userId }) {
  const [period, setPeriod] = useState('monthly')
  const { goals, loading, addGoal, deleteGoal, refresh: refreshGoals } = useGoals(userId)
  const { todos, toggleTodo } = useTodos(userId)

  const filtered = goals.filter(g => g.period === period)
  const unlinkedTodos = todos.filter(t => !t.goal_id)

  async function handleToggleTodo(id, completed) {
    await toggleTodo(id, completed)
    // 할일 토글 후 목표 추진율이 Supabase에 업데이트됐으므로 goals 재조회
    await refreshGoals()
  }

  return (
    <div style={{ paddingBottom: 16 }}>
      <div style={styles.tabRow}>
        {PERIODS.map(p => (
          <button
            key={p.id}
            style={styles.tab(period === p.id)}
            onClick={() => setPeriod(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            <GoalForm period={period} onAdd={addGoal} />

            {filtered.length === 0 ? (
              <p style={{ color: theme.text.muted, fontSize: 14, textAlign: 'center', padding: '16px 0' }}>
                아직 목표가 없어요. 추가해보세요!
              </p>
            ) : (
              filtered.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  todos={todos}
                  onDelete={deleteGoal}
                  onToggleTodo={handleToggleTodo}
                />
              ))
            )}

            {/* 미분류 할일 섹션 */}
            {unlinkedTodos.length > 0 && (
              <>
                <p style={styles.sectionLabel}>🗂️ 미분류 할일</p>
                {unlinkedTodos.map(todo => (
                  <div
                    key={todo.id}
                    style={styles.unlinkedCard}
                    onClick={() => toggleTodo(todo.id, !todo.completed)}
                  >
                    <div style={styles.check(todo.completed)} />
                    <span style={styles.unlinkedText(todo.completed)}>{todo.title}</span>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
