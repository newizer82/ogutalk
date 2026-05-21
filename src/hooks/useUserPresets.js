// 사용자 정의 "빠른 추가" 프리셋 (localStorage 기반)
// - 직접 추가 폼의 "빠른 추가에 저장" 체크박스 → saveUserPreset
// - 빠른 추가 섹션의 ✎ 편집 → updateUserPreset
// - 빠른 추가 섹션의 ✕ 삭제 → deleteUserPreset
//
// 마이그레이션: 옛 항목에 category 필드가 없으면 DEFAULT_CATEGORY('life')로 채움
//             (DEVELOPMENT_GUIDE.md 시행착오 #7 — 설정 마이그레이션 패턴)
import { useState, useCallback } from 'react'
import { CATEGORY_KEYS, DEFAULT_CATEGORY, FREQ_OPTIONS, DEFAULT_FREQ } from '../data/quickAddPresets'

const KEY = 'ogu_user_presets'

// ── 게이트 (Step 5: 유료화 자리만 만들기) ────────────────────────
// TODO(premium): RevenueCat 연동 후 isPremium 연동 + 무료 사용자 N개 제한
export const FREE_PRESET_LIMIT = Infinity   // 결제 붙으면 3 등으로 변경
export function canCustomizePresets(/* isPremium */) {
  // 지금은 전원 무료·무제한. 결제 연동 시 isPremium 인자로 분기.
  return true
}

// 옛 freq('주1회'/'주2회')는 '주말'로 환산. 그 외 유효성 검사 후 기본값 보정.
function migrateFreq(freq) {
  if (freq === '주1회' || freq === '주2회') return '주말'
  return FREQ_OPTIONS.includes(freq) ? freq : DEFAULT_FREQ
}

// ── 저장된 데이터 로드 + 마이그레이션 ────────────────────────────
function load() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    // category/freq 필드 없으면 기본값 채움 + 유효하지 않으면 기본값으로 교정
    return list.map(p => ({
      ...p,
      category: CATEGORY_KEYS.includes(p.category) ? p.category : DEFAULT_CATEGORY,
      freq:     migrateFreq(p.freq),
    }))
  } catch { return [] }
}

function save(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {}
}

export function useUserPresets() {
  const [userPresets, setUserPresets] = useState(load)

  const saveUserPreset = useCallback((preset) => {
    const newP = {
      ...preset,
      id: `up_${Date.now()}`,
      category: CATEGORY_KEYS.includes(preset.category) ? preset.category : DEFAULT_CATEGORY,
      freq:     migrateFreq(preset.freq),
    }
    setUserPresets(prev => {
      const next = [...prev, newP]
      save(next)
      return next
    })
  }, [])

  const updateUserPreset = useCallback((id, updates) => {
    setUserPresets(prev => {
      const next = prev.map(p => {
        if (p.id !== id) return p
        const nextCategory = updates.category ?? p.category
        const nextFreq     = updates.freq     ?? p.freq
        return {
          ...p, ...updates,
          category: CATEGORY_KEYS.includes(nextCategory) ? nextCategory : DEFAULT_CATEGORY,
          freq:     migrateFreq(nextFreq),
        }
      })
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

  return { userPresets, saveUserPreset, updateUserPreset, deleteUserPreset }
}
