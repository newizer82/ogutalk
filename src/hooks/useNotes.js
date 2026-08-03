// 빠른 메모 훅 — 로그인 사용자 전용, 최대 9개
// 10번째 추가 시 가장 오래된 것 자동 삭제 (Supabase에서)
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export const NOTES_MAX = 9

export function useNotes(userId = null) {
  const [notes, setNotes] = useState([])

  // 로그인 시 로딩
  useEffect(() => {
    if (!userId) { setNotes([]); return }
    (async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(NOTES_MAX)
      if (error) { console.warn('[notes] 로딩 실패:', error); return }
      setNotes(data || [])
    })()
  }, [userId])

  const addNote = useCallback(async (text) => {
    if (!userId || !text?.trim()) return
    const trimmed = text.trim().slice(0, 200)

    // 9개 이상이면 가장 오래된 것 삭제 (auto-prune)
    if (notes.length >= NOTES_MAX) {
      const oldest = notes[notes.length - 1]
      await supabase.from('notes').delete().eq('id', oldest.id).eq('user_id', userId)
    }

    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: userId, text: trimmed })
      .select('id, text, created_at')
      .single()
    if (error) { console.warn('[notes] 추가 실패:', error); return }

    setNotes(prev => [data, ...prev].slice(0, NOTES_MAX))
  }, [userId, notes])

  const deleteNote = useCallback(async (id) => {
    if (!userId) return
    setNotes(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase
      .from('notes').delete().eq('id', id).eq('user_id', userId)
    if (error) console.warn('[notes] 삭제 실패:', error)
  }, [userId])

  return { notes, addNote, deleteNote }
}
