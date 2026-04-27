// 커스텀 알람 훅 — localStorage 기반 CRUD + Capacitor 자동 스케줄
import { useState, useEffect, useCallback } from 'react'
import { IS_NATIVE, scheduleCustomAlarms } from '../lib/capacitor'

const STORAGE_KEY = 'ogu_custom_alarms'
let _nextNumId = 1

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    // _nextNumId 동기화
    arr.forEach(a => { if (a._numId >= _nextNumId) _nextNumId = a._numId + 1 })
    return arr
  } catch { return [] }
}

function save(alarms) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms)) } catch {}
}

export function useCustomAlarms() {
  const [alarms, setAlarms] = useState(load)

  // 알람 변경 시 Capacitor 재스케줄
  useEffect(() => {
    if (IS_NATIVE) scheduleCustomAlarms(alarms)
  }, [alarms])

  const persist = useCallback((updater) => {
    setAlarms(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      save(next)   // 실제 배열을 저장 (함수가 아닌)
      return next
    })
  }, [])

  // 알람 추가
  const addAlarm = useCallback(({ icon = '🔔', title, message = '', hour, minute, repeatType = 'daily' }) => {
    const newAlarm = {
      id:         `ca_${Date.now()}`,
      _numId:     _nextNumId++,
      icon, title, message,
      hour:       Number(hour),
      minute:     Number(minute),
      repeatType,
      isEnabled:  true,
      createdAt:  new Date().toISOString(),
    }
    persist(prev => [...prev, newAlarm])
    return newAlarm
  }, [persist])

  // 토글
  const toggleAlarm = useCallback((id) => {
    persist(prev => prev.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a))
  }, [persist])

  // 수정
  const updateAlarm = useCallback((id, patch) => {
    persist(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a))
  }, [persist])

  // 삭제
  const deleteAlarm = useCallback((id) => {
    persist(prev => prev.filter(a => a.id !== id))
  }, [persist])

  return { alarms, addAlarm, toggleAlarm, updateAlarm, deleteAlarm }
}
