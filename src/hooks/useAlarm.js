import { useState, useEffect, useRef, useCallback } from 'react'
import { loadAlarmSoundSettings } from './useAlarmSoundSettings'

export function useAlarm() {
  const [alarmCount, setAlarmCount] = useState(0)
  const [immersionMinutes, setImmersionMinutes] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const lastFiredRef = useRef(null)
  const startTimeRef = useRef(Date.now())

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 몰입 시간 카운터 (1분마다 +1)
  useEffect(() => {
    const id = setInterval(() => {
      setImmersionMinutes(Math.floor((Date.now() - startTimeRef.current) / 60000))
    }, 60000)
    return () => clearInterval(id)
  }, [])

  // 59분 알람 체크 (매초)
  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date()
      if (now.getMinutes() === 59 && now.getSeconds() === 0) {
        const key = `${now.getHours()}-${now.getDate()}`
        if (lastFiredRef.current !== key) {
          lastFiredRef.current = key
          fireAlarm(now.getHours())
        }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const fireAlarm = useCallback((hour = new Date().getHours()) => {
    const { soundDuration, repeatCount, announceHour } = loadAlarmSoundSettings()

    // 1. 오구 사운드 재생
    playOguSound(soundDuration, repeatCount)

    // 2. 사운드 완료 후 "다음 시" 음성 알림
    //    예) 1:59 → 사운드 끝난 뒤 "2시" 안내
    if (announceHour) {
      const nextHour = (hour + 1) % 24
      const delay = soundDuration * 1000 + 100  // 사운드 길이 + 여유 100ms
      setTimeout(() => announceHourVoice(nextHour), delay)
    }

    sendNotification(hour)
    setAlarmCount(c => c + 1)
    setImmersionMinutes(0)
    startTimeRef.current = Date.now()
    setShowPopup(true)
  }, [])

  return {
    alarmCount,
    immersionMinutes,
    showPopup,
    closePopup: () => setShowPopup(false),
    fireAlarm,
  }
}

// ─── 오구 사운드 ───────────────────────────────────────────────
function playOguSound(totalDuration = 3, repeatCount = 2) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const duration = Math.min(Math.max(totalDuration, 1), 10)
    const count    = Math.min(Math.max(repeatCount, 1), 5)

    // 반복 간격 계산
    const interval = duration / count

    for (let i = 0; i < count; i++) {
      const base = ctx.currentTime + i * interval

      // 오 — 낮은 음 (C5)
      playNote(ctx, 523.25, base,        interval * 0.30, 0.45)
      // 구 — 높은 음 (E5)
      playNote(ctx, 659.25, base + interval * 0.35, interval * 0.28, 0.40)
    }
  } catch (e) {
    console.warn('오디오 재생 실패:', e)
  }
}

function playNote(ctx, freq, startTime, duration, gain = 0.4) {
  const osc  = ctx.createOscillator()
  const gainNode = ctx.createGain()
  osc.connect(gainNode)
  gainNode.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, startTime)
  gainNode.gain.setValueAtTime(gain, startTime)
  gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration + 0.01)
}

// ─── 시간 음성 알림 (Web Speech API) ──────────────────────────
function announceHourVoice(hour) {
  if (!('speechSynthesis' in window)) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(`${hour}시`)
    utter.lang  = 'ko-KR'
    utter.rate  = 0.85
    utter.pitch = 1.1
    utter.volume = 1.0
    window.speechSynthesis.speak(utter)
  } catch (e) {
    console.warn('음성 알림 실패:', e)
  }
}

// ─── 브라우저 푸시 알림 ────────────────────────────────────────
function sendNotification(hour) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏱️ ${hour}시 오구!`, {
      body: `벌써 ${hour}시 59분이에요! 잠깐 쉬어가세요.`,
      icon: '/icon-192.png',
    })
  }
}
