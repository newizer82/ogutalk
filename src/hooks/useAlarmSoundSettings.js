import { useState } from 'react'

const STORAGE_KEY = 'ogu_sound_settings'
const DEFAULTS = {
  soundDuration: 3,    // 총 알림음 길이 (1~10초)
  repeatCount: 2,      // 반복 횟수 (1~5회)
  announceHour: true,  // "X시" 음성 알림 여부
}

export function useAlarmSoundSettings() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
    } catch {
      return DEFAULTS
    }
  })

  function updateSettings(updates) {
    const next = { ...settings, ...updates }
    setSettings(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  return { settings, updateSettings }
}

// useAlarm.js에서 직접 읽을 수 있도록 별도 export
export function loadAlarmSoundSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...DEFAULTS, ...JSON.parse(saved) } : DEFAULTS
  } catch {
    return DEFAULTS
  }
}
