import { useTodos } from '../hooks/useTodos'
import TodoList from '../components/todos/TodoList'

export default function TodosPage({ userId }) {
  const { todos, loading, addTodo, toggleTodo, deleteTodo } = useTodos(userId)

  return (
    <div style={{ padding: '20px 0' }}>
      <TodoList
        todos={todos}
        loading={loading}
        onAdd={addTodo}
        onToggle={toggleTodo}
        onDelete={deleteTodo}
      />
    </div>
  )
}
