import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useTodos(userId) {
  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchTodos()
  }, [userId])

  async function fetchTodos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('할일 로딩 실패:', error)
    } else {
      setTodos(data)
    }
    setLoading(false)
  }

  // 할일과 연결된 목표의 추진율을 자동 계산 후 Supabase 업데이트
  async function syncGoalProgress(goalId) {
    if (!goalId) return
    const { data } = await supabase
      .from('todos')
      .select('completed')
      .eq('goal_id', goalId)
    if (!data) return
    const total = data.length
    const done = data.filter(t => t.completed).length
    const progress = total === 0 ? 0 : Math.round((done / total) * 100)
    await supabase.from('goals').update({ progress }).eq('id', goalId)
  }

  async function addTodo(title, todoType = 'weekly', dueDate = null) {
    const payload = {
      user_id:   userId,
      title,
      completed: false,
      todo_type: todoType,
      due_date:  dueDate || null,
    }
    const { error } = await supabase
      .from('todos')
      .insert(payload)
    if (error) {
      console.error('할일 추가 실패:', JSON.stringify(error))
      return false
    }
    await fetchTodos()
    return true
  }

  async function toggleTodo(id, completed) {
    const todo = todos.find(t => t.id === id)
    const { error } = await supabase
      .from('todos')
      .update({ completed })
      .eq('id', id)
    if (error) {
      console.error('할일 토글 실패:', error)
      return
    }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed } : t))
    if (todo?.goal_id) await syncGoalProgress(todo.goal_id)
  }

  async function deleteTodo(id) {
    const todo = todos.find(t => t.id === id)
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('할일 삭제 실패:', error)
      return
    }
    await fetchTodos()
    if (todo?.goal_id) await syncGoalProgress(todo.goal_id)
  }

  return { todos, loading, addTodo, toggleTodo, deleteTodo, refresh: fetchTodos }
}
