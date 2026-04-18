import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const DEFAULT_HOURS = Array.from({ length: 17 }, (_, i) => i + 7) // 7~23시

export function useAlarmSettings(userId) {
  const [settings, setSettings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    init()
  }, [userId])

  async function fetchSettings() {
    const { data, error } = await supabase
      .from('alarm_settings')
      .select('*')
      .eq('user_id', userId)
      .order('trigger_hour', { ascending: true })
    if (error) {
      console.error('알람 설정 로딩 실패:', error)
      return null
    }
    return data
  }

  async function init() {
    setLoading(true)
    const data = await fetchSettings()
    if (data && data.length > 0) {
      setSettings(data)
    } else {
      await createDefaultSettings()
    }
    setLoading(false)
  }

  async function createDefaultSettings() {
    const rows = DEFAULT_HOURS.map(trigger_hour => ({
      user_id: userId,
      alarm_type: 'hourly',
      trigger_hour,
      trigger_minute: 59,
      is_enabled: true,
      repeat_days: [],
      content_types: [],
    }))
    await supabase.from('alarm_settings').insert(rows)
    const data = await fetchSettings()
    setSettings(data ?? [])
  }

  async function toggleHour(id, is_enabled) {
    const { error } = await supabase
      .from('alarm_settings')
      .update({ is_enabled: !is_enabled })
      .eq('id', id)
    if (error) {
      console.error('알람 설정 업데이트 실패:', error)
      return
    }
    setSettings(prev =>
      prev.map(s => s.id === id ? { ...s, is_enabled: !is_enabled } : s)
    )
  }

  return { settings, loading, toggleHour }
}
