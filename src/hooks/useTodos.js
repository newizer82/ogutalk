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

  async function addTodo(title) {
    const { data, error } = await supabase
      .from('todos')
      .insert({ user_id: userId, title, completed: false })
      .select()
      .single()
    if (error) {
      console.error('할일 추가 실패:', error)
      return
    }
    setTodos(prev => [data, ...prev])
  }

  async function toggleTodo(id, completed) {
    const { error } = await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id)
    if (error) {
      console.error('할일 업데이트 실패:', error)
      return
    }
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !completed } : t))
  }

  async function deleteTodo(id) {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('할일 삭제 실패:', error)
      return
    }
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  return { todos, loading, addTodo, toggleTodo, deleteTodo }
}
