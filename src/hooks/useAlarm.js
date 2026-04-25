import { useState, useEffect, useRef, useCallback } from 'react'
import { TONE_CONFIGS, TONE_DURATION, VOICE_CHARACTERS, VOICE_TEXTS } from '../data/oguData'
import { supabase } from '../lib/supabase'

// 진동 세기별 패턴
export const VIBRATION_PATTERNS = {
  weak:   [80,  60,  80],
  medium: [250, 120, 250],
  strong: [400, 150, 400, 150, 600],
}

export function useAlarm({
  oguTone = '유쾌',
  oguRepeat = 2,
  voiceChar = 'girl',
  voiceEnabled = false,
  alarmMode = 'both',   // 'sound' | 'vibrate' | 'both'
  alarmHours = {},
  immersionAlerts = { m30: true, m60: true },
  userId = null,
  volume = 1.0,                // ← 볼륨 (0.0~1.0)
  vibStrength = 'medium',      // ← 진동 세기 'weak' | 'medium' | 'strong'
} = {}) {
  const [alarmCount, setAlarmCount]         = useState(0)
  const [immersionSec, setImmersionSec]     = useState(0)
  const [showAlarmPopup, setShowAlarmPopup] = useState(false)
  const [alarmContent, setAlarmContent]     = useState(null)
  const [immersionPopup, setImmersionPopup] = useState(false)
  const [immersionLevel, setImmersionLevel] = useState(null)

  const lastHourRef        = useRef(-1)
  const immersionAlertedRef = useRef({ m30: false, m60: false })

  // 브라우저 알림 권한 요청
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // 몰입 시간 카운터 (1초마다 증가 — 이건 유지)
useEffect(() => {
  const id = setInterval(() => {
    setImmersionSec(prev => prev + 1)
  }, 1000)
  return () => clearInterval(id)
}, [])

// 59분 알람 스케줄링 (setTimeout 체인 방식)
useEffect(() => {
  let timeoutId = null

  const scheduleNext59 = () => {
    const now = new Date()
    const next = new Date(now)

    // 다음 59분 시각 계산
    if (now.getMinutes() < 59) {
      next.setMinutes(59, 0, 0)
    } else {
      next.setHours(next.getHours() + 1)
      next.setMinutes(59, 0, 0)
    }

    const msUntilNext = next.getTime() - now.getTime()

    timeoutId = setTimeout(() => {
      const h = new Date().getHours()
      // 활성 시간대 + 중복 방지 체크 (기존 로직 유지)
      if (alarmHours[h] && lastHourRef.current !== h) {
        lastHourRef.current = h
        _fire(h)
      }
      scheduleNext59() // 다음 알람 재예약
    }, msUntilNext)
  }

  scheduleNext59()

  // 탭 복귀 시 재예약 (중요!)
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      if (timeoutId) clearTimeout(timeoutId)
      scheduleNext59()
    }
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    if (timeoutId) clearTimeout(timeoutId)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode, alarmHours])

  // 몰입 경고 체크
  useEffect(() => {
    const mins = immersionSec / 60
    if (immersionAlerts.m30 && mins >= 30 && !immersionAlertedRef.current.m30) {
      immersionAlertedRef.current.m30 = true
      setImmersionLevel('30분')
      setImmersionPopup(true)
      if (alarmMode !== 'vibrate') playOguSound('화남', 1, volume)
      if (alarmMode !== 'sound' && navigator.vibrate) navigator.vibrate(VIBRATION_PATTERNS[vibStrength])
    }
    if (immersionAlerts.m60 && mins >= 60 && !immersionAlertedRef.current.m60) {
      immersionAlertedRef.current.m60 = true
      setImmersionLevel('1시간')
      setImmersionPopup(true)
      if (alarmMode !== 'vibrate') playOguSound('화남', 2, volume)
      if (alarmMode !== 'sound' && navigator.vibrate) navigator.vibrate(VIBRATION_PATTERNS[vibStrength])
    }
  }, [immersionSec])

  const _fire = useCallback((hour = new Date().getHours()) => {
    // 소리
    if (alarmMode !== 'vibrate') playOguSound(oguTone, oguRepeat, volume)
    // 진동
    if (alarmMode !== 'sound' && navigator.vibrate) {
      const pat = VIBRATION_PATTERNS[vibStrength]
      navigator.vibrate(pat)
    }
    // 음성
    if (voiceEnabled) speakTime(voiceChar, hour, oguRepeat)
    // 브라우저 알림
    sendNotification(hour)

    setAlarmCount(c => c + 1)
    setImmersionSec(0)
    immersionAlertedRef.current = { m30: false, m60: false }
    setShowAlarmPopup(true)
    setAlarmContent(buildContent())
  }, [oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode, volume, vibStrength])

  const fireAlarm = useCallback((hour) => _fire(hour ?? new Date().getHours()), [_fire])

  const resetImmersion = useCallback(() => {
    setImmersionSec(0)
    immersionAlertedRef.current = { m30: false, m60: false }
    setImmersionPopup(false)
  }, [])

  // ── 체크인 저장 ──
  const saveCheckin = useCallback(async (activityType) => {
    if (!userId) return
    const { error } = await supabase
      .from('notification_log')
      .insert({
        user_id:       userId,
        alarm_hour:    new Date().getHours(),
        activity_type: activityType,
        created_at:    new Date().toISOString(),
      })
    if (error) console.error('체크인 저장 실패:', error)
  }, [userId])

  return {
    alarmCount,
    immersionSec,
    immersionMinutes: Math.floor(immersionSec / 60),
    showAlarmPopup,
    alarmContent,
    closeAlarmPopup: () => { setShowAlarmPopup(false); setAlarmContent(null) },
    immersionPopup,
    immersionLevel,
    closeImmersionPopup: () => setImmersionPopup(false),
    resetImmersion,
    fireAlarm,
    saveCheckin,
  }
}

// ── 내부 헬퍼 ──────────────────────────────────────────────────

function buildContent() {
  const QUOTES = [
    { text: '시간은 금이다.',             author: '벤자민 프랭클린' },
    { text: '시작이 반이다.',             author: '아리스토텔레스' },
    { text: '천 리 길도 한 걸음부터.',    author: '노자' },
    { text: '오늘 할 일을 내일로 미루지 마라.', author: '벤자민 프랭클린' },
    { text: '실패는 성공의 어머니다.',     author: '토마스 에디슨' },
  ]
  const TIPS = [
    { title: '복리의 마법', content: '매년 7% 수익이면 약 10년 후 원금이 2배.', category: '투자기초' },
    { title: '72의 법칙',  content: '72 ÷ 수익률(%) = 원금이 2배 되는 기간(년)', category: '투자기초' },
    { title: 'ETF란?',     content: '주식처럼 거래되는 분산투자 펀드.', category: '투자기초' },
  ]
  return {
    quote: QUOTES[Math.floor(Math.random() * QUOTES.length)],
    tip:   TIPS[Math.floor(Math.random() * TIPS.length)],
  }
}

export function playOguSound(tone = '유쾌', repeat = 1, volume = 1.0) {
  try {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)()
    const baseTime = ctx.currentTime
    const interval = TONE_DURATION[tone] || 0.9
    const notes    = TONE_CONFIGS[tone] || TONE_CONFIGS['유쾌']
    const vol      = Math.max(0.01, Math.min(1.0, volume))  // 0.01~1.0 클램프

    for (let r = 0; r < Math.max(1, repeat); r++) {
      const offset = r * interval
      notes.forEach(({ freq, start, dur, type, gain: g }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = type
        const t = baseTime + offset + start
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(g * vol, t)          // ← 볼륨 배율 적용
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.05)
      })
    }
  } catch (_) {}
}

export function speakTime(voiceId, alarmHour, repeat = 1) {
  if (!window.speechSynthesis) return
  const vc       = VOICE_CHARACTERS.find(v => v.id === voiceId) || VOICE_CHARACTERS[0]
  const nextHour = (alarmHour + 1) % 24
  const txt      = (VOICE_TEXTS[voiceId] || VOICE_TEXTS.boy)(nextHour, repeat)
  const utt      = new SpeechSynthesisUtterance(txt)
  utt.lang  = 'ko-KR'
  utt.rate  = vc.rate
  utt.pitch = vc.pitch
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(utt)
}

function sendNotification(hour) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`⏱️ ${hour}시 오구!`, {
      body: `벌써 ${hour}시 59분이에요! 잠깐 쉬어가세요.`,
      icon: '/icon-192.png',
    })
  }
}
