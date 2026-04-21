import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { TRENDING_DATA } from '../data/oguData'

export function useTrendingData() {
  const [data, setData]           = useState(TRENDING_DATA) // mock 즉시 표시
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [isLive, setIsLive]       = useState(false)

  useEffect(() => { fetchTrending() }, [])

  async function fetchTrending() {
    setLoading(true)
    setError(null)
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('naver-datalab')
      if (fnError) {
        let msg = fnError.message
        try {
          const body = await fnError.context?.json?.()
          if (body?.error) msg = body.error
        } catch {}
        throw new Error(msg)
      }
      if (result?.weekly && result?.monthly) {
        setData({ weekly: result.weekly, monthly: result.monthly })
        setUpdatedAt(result.updatedAt)
        setIsLive(true)
      }
    } catch (err) {
      setError(err.message)
      // mock 데이터 유지
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, updatedAt, isLive, refetch: fetchTrending }
}
