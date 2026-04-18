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
    const today = new Date()
    const start_date = today.toISOString().split('T')[0]

    // period에 따라 end_date 자동 계산
    const end = new Date(today)
    if (period === 'yearly')       end.setFullYear(end.getFullYear() + 1)
    else if (period === 'monthly') end.setMonth(end.getMonth() + 1)
    else if (period === 'weekly')  end.setDate(end.getDate() + 7)
    else                           end.setDate(end.getDate() + 1) // daily
    const end_date = end.toISOString().split('T')[0]

    const payload = { user_id: userId, title, period, progress: 0, start_date, end_date }
    if (parentGoalId) payload.parent_goal_id = parentGoalId
    const { error } = await supabase
      .from('goals')
      .insert(payload)
    if (error) {
      console.error('목표 추가 실패:', error)
      return false
    }
    await fetchGoals()
    return true
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
    await fetchGoals()
  }

  return { goals, loading, addGoal, updateProgress, deleteGoal, refresh: fetchGoals }
}
