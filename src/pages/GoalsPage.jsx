import { useState } from 'react'
import { useGoals } from '../hooks/useGoals'
import GoalList from '../components/goals/GoalList'
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
}

export default function GoalsPage({ userId }) {
  const [period, setPeriod] = useState('monthly')
  const { goals, loading, addGoal, updateProgress, deleteGoal } = useGoals(userId)

  return (
    <div style={{ paddingBottom: 8 }}>
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
        {loading
          ? <LoadingSpinner />
          : (
            <GoalList
              goals={goals}
              period={period}
              onAdd={addGoal}
              onUpdateProgress={updateProgress}
              onDelete={deleteGoal}
            />
          )
        }
      </div>
    </div>
  )
}
