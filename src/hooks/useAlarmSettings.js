import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useAlarmSettings(userId) {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchSettings()
  }, [userId])

  async function fetchSettings() {
    setLoading(true)
    const { data, error } = await supabase
      .from('alarm_settings')
      .select('*')
      .eq('user_id', userId)
      .order('hour', { ascending: true })
    if (error) {
      console.error('알람 설정 로딩 실패:', error)
    } else {
      setSettings(data)
    }
    setLoading(false)
  }

  async function toggleHour(id, enabled) {
    const { error } = await supabase
      .from('alarm_settings')
      .update({ enabled: !enabled })
      .eq('id', id)
    if (error) {
      console.error('알람 설정 업데이트 실패:', error)
      return
    }
    setSettings(prev => prev.map(s => s.id === id ? { ...s, enabled: !enabled } : s))
  }

  return { settings, loading, toggleHour }
}
