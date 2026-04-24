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

    if (!error) setReports(data || [])
  }, [userId])

  const generateReport = useCallback(async () => {
    if (!userId) return null
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.functions.invoke(
        'generate-weekly-report',
        { body: { user_id: userId } }
      )
      if (error) throw error
      await fetchReports()
      return data?.report ?? null
    } catch (err) {
      const msg = err?.message || '리포트 생성에 실패했어요. 잠시 후 다시 시도해 주세요.'
      console.error('리포트 생성 실패:', err)
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [userId, fetchReports])

  return { reports, loading, error, generateReport, refresh: fetchReports }
}
