// 사용자 정의 "빠른 추가" 프리셋 (localStorage 기반)
// - 직접 추가 폼의 "빠른 추가에 저장" 체크박스 → saveUserPreset
// - 빠른 추가 섹션의 ⭐ 내 빠른 추가 카드의 ✕ → deleteUserPreset
import { useState, useCallback } from 'react'

const KEY = 'ogu_user_presets'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function useUserPresets() {
  const [userPresets, setUserPresets] = useState(load)

  const saveUserPreset = useCallback((preset) => {
    const newP = { ...preset, id: `up_${Date.now()}` }
    setUserPresets(prev => {
      const next = [...prev, newP]
      save(next)
      return next
    })
  }, [])

  const deleteUserPreset = useCallback((id) => {
    setUserPresets(prev => {
      const next = prev.filter(p => p.id !== id)
      save(next)
      return next
    })
  }, [])

  return { userPresets, saveUserPreset, deleteUserPreset }
}
