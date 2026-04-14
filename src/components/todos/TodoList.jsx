import { theme } from '../../styles/theme'
import TodoItem from './TodoItem'
import TodoForm from './TodoForm'
import LoadingSpinner from '../common/LoadingSpinner'
import EmptyState from '../common/EmptyState'

const styles = {
  wrapper: { padding: '0 16px' },
  header: {
    fontSize: 17,
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: 14,
  },
}

export default function TodoList({ todos, loading, onAdd, onToggle, onDelete }) {
  return (
    <div style={styles.wrapper}>
      <p style={styles.header}>오늘의 할일</p>
      <TodoForm onAdd={onAdd} />
      {loading
        ? <LoadingSpinner />
        : todos.length === 0
          ? <EmptyState icon="✅" title="할일이 없어요" description="위에 할일을 추가해보세요!" />
          : todos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={onToggle}
                onDelete={onDelete}
              />
            ))
      }
    </div>
  )
}
