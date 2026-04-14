import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useKeywords(userId) {
  const [keywords, setKeywords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetchKeywords()
  }, [userId])

  async function fetchKeywords() {
    setLoading(true)
    const { data, error } = await supabase
      .from('tracked_keywords')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('키워드 로딩 실패:', error)
    } else {
      setKeywords(data)
    }
    setLoading(false)
  }

  async function addKeyword(keyword) {
    const trimmed = keyword.trim()
    if (!trimmed) return
    if (keywords.some(k => k.keyword === trimmed)) return
    const { data, error } = await supabase
      .from('tracked_keywords')
      .insert({ user_id: userId, keyword: trimmed })
      .select()
      .single()
    if (error) {
      console.error('키워드 추가 실패:', error)
      return
    }
    setKeywords(prev => [...prev, data])
  }

  async function deleteKeyword(id) {
    const { error } = await supabase
      .from('tracked_keywords')
      .delete()
      .eq('id', id)
    if (error) {
      console.error('키워드 삭제 실패:', error)
      return
    }
    setKeywords(prev => prev.filter(k => k.id !== id))
  }

  return { keywords, loading, addKeyword, deleteKeyword }
}
