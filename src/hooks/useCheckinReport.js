import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// 최근 30일 notification_log 를 가져와서 집계
export function useCheckinReport(userId) {
  const [checkins, setCheckins] = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (userId) {
      // 로그인: Supabase에서 최근 30일 가져오기
      setLoading(true)
      const since = new Date()
      since.setDate(since.getDate() - 30)
      supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setCheckins(data)
          setLoading(false)
        })
    } else {
      // 비로그인: localStorage에서 읽기
      try {
        const raw  = localStorage.getItem('ogu_local_checkins')
        const list = raw ? JSON.parse(raw) : []
        setCheckins(list)
      } catch {
        setCheckins([])
      }
    }
  }, [userId])

  // ── 집계 ──
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const weekAgo  = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7)

  const todayCheckins = checkins.filter(c => c.created_at?.slice(0, 10) === todayStr)
  const weekCheckins  = checkins.filter(c => new Date(c.created_at) >= weekAgo)

  // 활동별 횟수 (30일)
  const activityCount = checkins.reduce((acc, c) => {
    acc[c.activity_type] = (acc[c.activity_type] || 0) + 1
    return acc
  }, {})

  // 시간대별 횟수 (30일)
  const hourCount = checkins.reduce((acc, c) => {
    const h = c.alarm_hour ?? new Date(c.created_at).getHours()
    acc[h] = (acc[h] || 0) + 1
    return acc
  }, {})

  return {
    checkins,        // 전체 (최근 30일)
    todayCheckins,
    weekCheckins,
    activityCount,
    hourCount,
    loading,
  }
}
