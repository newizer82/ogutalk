import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useWeeklyReport(userId) {
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  useEffect(() => {
    if (userId) fetchReports()
  }, [userId])

  const fetchReports = useCallback(async () => {
    if (!userId) return
    const { data, error } = await supabase
      .from('weekly_reports')
      .select('*')
      .eq('user_id', userId)
      .order('year',        { ascending: false })
      .order('week_number', { ascending: false })
      .limit(10)

    if (error) {
      console.error('리포트 목록 로딩 실패:', error)
      if (error.message?.includes('weekly_reports')) {
        setError('weekly_reports 테이블이 없습니다. Supabase SQL Editor에서 v0.7.0_weekly_reports.sql을 실행해주세요.')
      }
      return
    }
    setReports(data || [])
  }, [userId])

  const generateReport = useCallback(async () => {
    if (!userId) {
      setError('로그인이 필요합니다.')
      return null
    }
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-weekly-report',
        { body: { user_id: userId } }
      )
      if (error) throw error
      // Edge Function 자체에서 error 필드 반환하는 경우
      if (data?.error) throw new Error(data.error)
      await fetchReports()
      return data?.report ?? null
    } catch (err) {
      const raw = err?.message || ''
      // 테이블 미생성 오류 감지
      const msg = raw.includes('weekly_reports')
        ? 'weekly_reports 테이블이 없습니다. Supabase SQL Editor에서 v0.7.0_weekly_reports.sql을 실행해주세요.'
        : raw.includes('Failed to fetch') || raw.includes('NetworkError')
          ? '서버 연결 실패. 인터넷 연결을 확인해주세요.'
          : raw || '리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'
      console.error('리포트 생성 실패:', err)
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, fetchReports])

  return { reports, loading, error, generateReport, refresh: fetchReports }
}
