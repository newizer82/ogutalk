import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNaverNews() {
  const [news, setNews]               = useState([])
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState(null)
  const [currentQuery, setCurrentQuery] = useState(null)

  const fetchNews = useCallback(async (query) => {
    if (!query?.trim()) return
    setLoading(true)
    setError(null)
    setCurrentQuery(query)
    setNews([])

    try {
      const { data, error: fnError } = await supabase.functions.invoke('naver-news', {
        body: { query: query.trim(), display: 10 },
      })
      if (fnError) {
        // FunctionsHttpError인 경우 응답 바디에서 실제 에러 추출
        let detail = fnError.message
        try {
          const body = await fnError.context?.json?.()
          if (body?.error) detail = body.error
          if (body?.detail) detail += ` (${body.detail})`
        } catch {}
        throw new Error(detail)
      }
      setNews(data?.items ?? [])
    } catch (err) {
      setError(err.message || '뉴스를 불러오지 못했어요.')
    } finally {
      setLoading(false)
    }
  }, [])

  const clearNews = useCallback(() => {
    setNews([])
    setCurrentQuery(null)
    setError(null)
  }, [])

  return { news, loading, error, currentQuery, fetchNews, clearNews }
}
