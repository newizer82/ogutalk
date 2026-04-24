import { useState, useEffect, useRef, useCallback } from 'react'
import { TONE_CONFIGS, TONE_DURATION, VOICE_CHARACTERS, VOICE_TEXTS } from '../data/oguData'

export function useAlarm({
  oguTone = '유쾌',
  oguRepeat = 2,
  voiceChar = 'girl',
  voiceEnabled = false,
  alarmMode = 'both',   // 'sound' | 'vibrate' | 'both'
  alarmHours = {},
  immersionAlerts = { m30: true, m60: true },
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

  // 매초 카운터: 몰입 시간 + 59분 알람 체크
  useEffect(() => {
    const id = setInterval(() => {
      setImmersionSec(prev => prev + 1)

      const now = new Date()
      const m = now.getMinutes(), h = now.getHours(), s = now.getSeconds()
      if (m === 59 && s === 0 && alarmHours[h] && lastHourRef.current !== h) {
        lastHourRef.current = h
        _fire(h)
      }
    }, 1000)
    return () => clearInterval(id)
  }, [oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode, alarmHours])

  // 몰입 경고 체크
  useEffect(() => {
    const mins = immersionSec / 60
    if (immersionAlerts.m30 && mins >= 30 && !immersionAlertedRef.current.m30) {
      immersionAlertedRef.current.m30 = true
      setImmersionLevel('30분')
      setImmersionPopup(true)
      if (alarmMode !== 'vibrate') playOguSound('화남', 1)
      if (alarmMode !== 'sound' && navigator.vibrate) navigator.vibrate([300, 150, 300])
    }
    if (immersionAlerts.m60 && mins >= 60 && !immersionAlertedRef.current.m60) {
      immersionAlertedRef.current.m60 = true
      setImmersionLevel('1시간')
      setImmersionPopup(true)
      if (alarmMode !== 'vibrate') playOguSound('화남', 2)
      if (alarmMode !== 'sound' && navigator.vibrate) navigator.vibrate([400, 150, 400, 150, 600])
    }
  }, [immersionSec])

  const _fire = useCallback((hour = new Date().getHours()) => {
    // 소리
    if (alarmMode !== 'vibrate') playOguSound(oguTone, oguRepeat)
    // 진동
    if (alarmMode !== 'sound' && navigator.vibrate) {
      const pat = []
      for (let i = 0; i < oguRepeat; i++) { pat.push(250, 120) }
      pat.push(400)
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
  }, [oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode])

  const fireAlarm = useCallback((hour) => _fire(hour ?? new Date().getHours()), [_fire])

  const resetImmersion = useCallback(() => {
    setImmersionSec(0)
    immersionAlertedRef.current = { m30: false, m60: false }
    setImmersionPopup(false)
  }, [])

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

export function playOguSound(tone = '유쾌', repeat = 1) {
  try {
    const ctx      = new (window.AudioContext || window.webkitAudioContext)()
    const baseTime = ctx.currentTime
    const interval = TONE_DURATION[tone] || 0.9
    const notes    = TONE_CONFIGS[tone] || TONE_CONFIGS['유쾌']

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
        gain.gain.setValueAtTime(g, t)
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
