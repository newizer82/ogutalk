// 커스텀 알람 훅
// - 로그인 시  : Supabase custom_alarms 테이블 기준 (localStorage는 캐시)
// - 비로그인 시: localStorage 전용
// - 로그인 직후 로컬에 데이터가 있고 서버가 비어있으면 자동 마이그레이션
import { useState, useEffect, useCallback } from 'react'
import { IS_NATIVE, scheduleCustomAlarms } from '../lib/capacitor'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'ogu_custom_alarms'

// ── localStorage helpers ──────────────────────────────────────
function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveLocal(alarms) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms)) } catch {}
}

// ── DB ↔ 로컬 변환 ────────────────────────────────────────────
function fromDB(row) {
  return {
    id:         row.id,
    icon:       row.icon        || '🔔',
    title:      row.title,
    message:    row.message     || '',
    hour:       row.hour,
    minute:     row.minute,
    tone:       row.tone        || '딩동',
    repeat:     row.repeat      || 1,
    repeatType: row.repeat_type || '매일',   // 매일/평일/주말 (요일 필터)
    isEnabled:  row.is_enabled  ?? true,
    createdAt:  row.created_at,
  }
}

function toDB(alarm, userId) {
  return {
    user_id:     userId,
    icon:        alarm.icon        || '🔔',
    title:       alarm.title,
    message:     alarm.message     || '',
    hour:        Number(alarm.hour),
    minute:      Number(alarm.minute),
    tone:        alarm.tone        || '딩동',
    repeat:      alarm.repeat      || 1,
    repeat_type: alarm.repeatType  || '매일',
    is_enabled:  alarm.isEnabled   ?? true,
  }
}

// ── 훅 ───────────────────────────────────────────────────────
// customAlarmMode: 'both' | 'vibrate' — 글로벌 알림 방식 (변경 시 재스케줄됨)
export function useCustomAlarms(userId = null, customAlarmMode = 'both') {
  const [alarms, setAlarms] = useState(loadLocal)

  // 알람 목록 또는 글로벌 모드 변경 시 Capacitor 재스케줄
  useEffect(() => {
    if (IS_NATIVE) scheduleCustomAlarms(alarms, customAlarmMode)
  }, [alarms, customAlarmMode])

  // userId 변경 시 Supabase 동기화
  useEffect(() => {
    if (!userId) {
      // 비로그인: localStorage 그대로
      setAlarms(loadLocal())
      return
    }

    const sync = async () => {
      const { data, error } = await supabase
        .from('custom_alarms')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('[커스텀 알람] 로딩 실패:', error)
        return
      }

      const dbAlarms = data.map(fromDB)

      if (dbAlarms.length === 0) {
        // 서버가 비어있으면 로컬 → 서버 마이그레이션
        const local = loadLocal()
        if (local.length > 0) {
          const { data: inserted, error: insErr } = await supabase
            .from('custom_alarms')
            .insert(local.map(a => toDB(a, userId)))
            .select()
          if (!insErr && inserted) {
            const migrated = inserted.map(fromDB)
            setAlarms(migrated)
            saveLocal(migrated)
            return
          }
        }
      }

      setAlarms(dbAlarms)
      saveLocal(dbAlarms)
    }

    sync()
  }, [userId])

  // ── CRUD ────────────────────────────────────────────────────

  const addAlarm = useCallback(async ({
    icon = '🔔', title, message = '',
    hour, minute, repeatType = '매일', tone = '딩동', repeat = 1,
  }) => {
    const base = {
      icon, title, message, tone,
      repeat:    Math.max(1, Math.min(5, Number(repeat))),
      hour:      Number(hour),
      minute:    Number(minute),
      repeatType,
      isEnabled: true,
    }

    if (userId) {
      const { data, error } = await supabase
        .from('custom_alarms')
        .insert(toDB(base, userId))
        .select()
        .single()
      if (error) { console.error('[커스텀 알람] 추가 실패:', error); return }
      const newAlarm = fromDB(data)
      setAlarms(prev => { const next = [...prev, newAlarm]; saveLocal(next); return next })
      return newAlarm
    } else {
      const newAlarm = { ...base, id: `ca_${Date.now()}`, createdAt: new Date().toISOString() }
      setAlarms(prev => { const next = [...prev, newAlarm]; saveLocal(next); return next })
      return newAlarm
    }
  }, [userId])

  const toggleAlarm = useCallback((id) => {
    let newEnabled
    setAlarms(prev => {
      const next = prev.map(a => {
        if (a.id !== id) return a
        newEnabled = !a.isEnabled
        return { ...a, isEnabled: !a.isEnabled }
      })
      saveLocal(next)
      return next
    })
    if (userId) {
      // newEnabled는 setAlarms 콜백에서 동기적으로 설정됨
      setTimeout(() => {
        if (newEnabled !== undefined) {
          supabase.from('custom_alarms')
            .update({ is_enabled: newEnabled })
            .eq('id', id)
            .eq('user_id', userId)
            .then(({ error }) => { if (error) console.error('[커스텀 알람] 토글 실패:', error) })
        }
      }, 0)
    }
  }, [userId])

  const updateAlarm = useCallback((id, patch) => {
    setAlarms(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...patch } : a)
      saveLocal(next)
      return next
    })
    if (userId) {
      const dbPatch = {}
      if (patch.isEnabled  !== undefined) dbPatch.is_enabled  = patch.isEnabled
      if (patch.repeatType !== undefined) dbPatch.repeat_type = patch.repeatType
      ;['icon','title','message','hour','minute','tone','repeat'].forEach(k => {
        if (patch[k] !== undefined) dbPatch[k] = patch[k]
      })
      supabase.from('custom_alarms')
        .update(dbPatch)
        .eq('id', id)
        .eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('[커스텀 알람] 수정 실패:', error) })
    }
  }, [userId])

  const deleteAlarm = useCallback((id) => {
    setAlarms(prev => { const next = prev.filter(a => a.id !== id); saveLocal(next); return next })
    if (userId) {
      supabase.from('custom_alarms')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
        .then(({ error }) => { if (error) console.error('[커스텀 알람] 삭제 실패:', error) })
    }
  }, [userId])

  return { alarms, addAlarm, toggleAlarm, updateAlarm, deleteAlarm }
}
