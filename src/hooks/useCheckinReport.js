import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// 최근 30일 notification_log 를 가져와서 집계
export function useCheckinReport(userId) {
  const [checkins, setCheckins] = useState([])
  const [loading,  setLoading]  = useState(false)

  // 데이터 로드를 별도 함수로 추출 (이벤트 리스너에서도 재호출 가능)
  const reload = useCallback(() => {
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

  // 마운트 + userId 변경 시 로드
  useEffect(() => { reload() }, [reload])

  // 새 체크인 발생 시 실시간 갱신 (saveCheckin에서 CustomEvent 발사)
  // - detail이 있으면 state에 직접 append (즉시 반영, Supabase 비동기 race 회피)
  // - 없으면 fallback으로 reload()
  useEffect(() => {
    const handler = (e) => {
      if (e.detail) {
        setCheckins(prev => [e.detail, ...prev])
      } else {
        reload()
      }
    }
    window.addEventListener('ogu:checkin', handler)
    return () => window.removeEventListener('ogu:checkin', handler)
  }, [reload])

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
