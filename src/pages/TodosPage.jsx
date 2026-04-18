import { useTodos } from '../hooks/useTodos'
import { useGoals } from '../hooks/useGoals'
import TodoList from '../components/todos/TodoList'

export default function TodosPage({ userId }) {
  const { todos, loading, addTodo, toggleTodo, deleteTodo } = useTodos(userId)
  const { goals } = useGoals(userId)

  return (
    <div style={{ padding: '20px 0' }}>
      <TodoList
        todos={todos}
        loading={loading}
        onAdd={addTodo}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
        goals={goals}
      />
    </div>
  )
}
