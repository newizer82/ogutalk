import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useGoals(userId) {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchGoals()
  }, [userId])

  async function fetchGoals() {
    setLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('목표 로딩 실패:', error)
    } else {
      setGoals(data)
    }
    setLoading(false)
  }

  async function addGoal({ title, period, parentGoalId = null }) {
    const { data, error } = await supabase
      .from('goals')
      .insert({ user_id: userId, title, period, parent_goal_id: parentGoalId, progress: 0 })
      .select()
      .single()
    if (error) {
      console.error('목표 추가 실패:', error)
      return
    }
    setGoals(prev => [...prev, data])
  }

  async function updateProgress(id, progress) {
    const value = Math.min(100, Math.max(0, progress))
    const { error } = await supabase
      .from('goals')
      .update({ progress: value })
      .eq('id', id)
    if (error) {
      console.error('진행률 업데이트 실패:', error)
      return
    }
    setGoals(prev => prev.map(g => g.id === id ? { ...g, progress: value } : g))
  }

  async function deleteGoal(id) {
    const { error } = await supabase
      .from('goals')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('목표 삭제 실패:', error)
      return
    }
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  return { goals, loading, addGoal, updateProgress, deleteGoal }
}
