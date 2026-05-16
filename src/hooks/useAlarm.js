import { useState, useEffect, useRef, useCallback } from 'react'
import { TONE_CONFIGS, TONE_DURATION, ALARM_TONE_CONFIGS } from '../data/oguData'
import { supabase } from '../lib/supabase'
import {
  IS_NATIVE,
  createOguChannel,
  requestLocalNotifPermission,
  scheduleOguAlarms,
  clearDeliveredOguNotifs,
  triggerHaptics,
  setOguAlarmHandler,
  setCustomAlarmHandler,
  requestAudioFocus,
} from '../lib/capacitor'

// 진동 세기별 패턴
export const VIBRATION_PATTERNS = {
  weak:   [80,  60,  80],
  medium: [250, 120, 250],
  strong: [400, 150, 400, 150, 600],
}

export function useAlarm({
  oguTone = '오구',
  oguRepeat = 2,
  alarmMode = 'both',
  alarmHours = {},
  userId = null,
  volume = 1.0,
  vibStrength = 'medium',
} = {}) {
  const [alarmCount, setAlarmCount]         = useState(0)
  const [showAlarmPopup, setShowAlarmPopup] = useState(false)
  const [alarmContent, setAlarmContent]     = useState(null)

  const lastHourRef = useRef(-1)

  // ── 앱 시작 시 초기화 ────────────────────────────────────────
  useEffect(() => {
    if (IS_NATIVE) {
      createOguChannel().then(() => requestLocalNotifPermission()).catch(() => {})
    } else {
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    }
  }, [])

  // ── 네이티브 알람 스케줄 등록 (마운트 시 + alarmHours 변경 시) ──
  useEffect(() => {
    if (IS_NATIVE) {
      scheduleOguAlarms(alarmHours).catch(() => {})
    }
  }, [alarmHours])

  // ── 네이티브: 12시간마다 자동 재등록 (30일치 소진 방지) ────────
  useEffect(() => {
    if (!IS_NATIVE) return
    const id = setInterval(() => scheduleOguAlarms(alarmHours).catch(() => {}), 12 * 3_600_000)
    return () => clearInterval(id)
  }, [alarmHours])

  // ── 웹: Service Worker에 alarmHours 동기화 ─────────────────────
  useEffect(() => {
    if (IS_NATIVE || !('serviceWorker' in navigator)) return
    navigator.serviceWorker.ready
      .then(reg => reg.active?.postMessage({ type: 'OGU_SYNC_HOURS', alarmHours }))
      .catch(() => {})
  }, [alarmHours])

  // ── 웹: SW가 백그라운드에서 발사한 알람 수신 ────────────────────
  useEffect(() => {
    if (IS_NATIVE || !('serviceWorker' in navigator)) return
    const handler = (event) => {
      if (event.data?.type === 'OGU_ALARM_FIRED') {
        const h = event.data.hour
        if (lastHourRef.current !== h) {
          lastHourRef.current = h
          _fire(h)
        }
      }
    }
    navigator.serviceWorker.addEventListener('message', handler)
    return () => navigator.serviceWorker.removeEventListener('message', handler)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 메인 스레드 알람 (정확한 :59:00 타이머 방식) ──────────────
  useEffect(() => {
    let timerId = null

    const checkAlarm = () => {
      const now = new Date()
      const m = now.getMinutes()
      const s = now.getSeconds()
      const h = now.getHours()
      if (m === 59 && s < 30) {
        const targetHour = (h + 1) % 24
        if (alarmHours[targetHour] && lastHourRef.current !== h) {
          lastHourRef.current = h
          // 네이티브: 시스템 알림이 사운드 담당 → 팝업만 / 웹: 풀 효과
          _fire(targetHour, { silent: IS_NATIVE })
        }
      }
    }

    // 다음 :59:00까지 정확한 지연 계산
    const scheduleNext = () => {
      if (timerId) clearTimeout(timerId)
      const now   = new Date()
      const m     = now.getMinutes()
      const s     = now.getSeconds()
      const ms    = now.getMilliseconds()
      let delay
      if (m < 59) {
        // 이번 시간의 :59:00 까지
        delay = (59 - m) * 60_000 - s * 1000 - ms + 100
      } else {
        // :59분 지났으면 다음 시간의 :59:00 까지 (~60분)
        delay = (60 - m) * 60_000 + 59 * 60_000 - s * 1000 - ms + 100
      }
      timerId = setTimeout(() => {
        checkAlarm()
        scheduleNext()
      }, Math.max(delay, 100))
    }

    // 마운트 즉시 체크 (앱 복귀 직후 놓친 알람 방지)
    checkAlarm()
    scheduleNext()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAlarm()
        scheduleNext() // 복귀 후 타이머 재보정
        if (IS_NATIVE) clearDeliveredOguNotifs()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timerId) clearTimeout(timerId)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [oguTone, oguRepeat, alarmMode, alarmHours, volume, vibStrength]) // eslint-disable-line react-hooks/exhaustive-deps

  // silent=true: 시스템 알림이 이미 사운드/진동 처리 → 팝업만 표시
  const _fire = useCallback((hour = new Date().getHours(), opts = {}) => {
    const { silent = false } = opts
    if (!silent && alarmMode !== 'vibrate') {
      if (IS_NATIVE) {
        // 테스트 버튼 등 JS 자체 사운드 재생 시에도 다른 앱 일시정지
        requestAudioFocus(4000)
        playMp3Repeat('/sounds/ogu.mp3', volume, 1)
      } else {
        unlockAudio()
        playOguSound(oguTone, 1, volume)
      }
    }
    if (!silent && alarmMode !== 'sound') {
      triggerHaptics(vibStrength)
    }
    sendNotification(hour)
    setAlarmCount(c => c + 1)
    setShowAlarmPopup(true)
    setAlarmContent(buildContent())
  }, [oguTone, oguRepeat, alarmMode, volume, vibStrength])

  const fireAlarm = useCallback((hour) => _fire(hour ?? new Date().getHours()), [_fire])

  // ── 네이티브: 오구 알람 수신 핸들러 (포그라운드 + 알림 탭) ──────
  // localNotificationReceived / localNotificationActionPerformed → 인앱 팝업 + 사운드
  useEffect(() => {
    if (!IS_NATIVE) return
    setOguAlarmHandler((targetHour) => {
      // 알람 발동: 다른 앱(YouTube 등) 강제 일시정지 (6초간)
      requestAudioFocus(6000)
      // JS 타이머와 중복 방지: fireHour = targetHour - 1
      const fireHour = (targetHour - 1 + 24) % 24
      if (lastHourRef.current !== fireHour) {
        lastHourRef.current = fireHour
        // 시스템 알림이 이미 사운드/진동 처리 → 팝업만
        _fire(targetHour, { silent: true })
      }
    })
    return () => setOguAlarmHandler(null)
  }, [_fire])

  // ── 네이티브: 커스텀 알람 수신 핸들러 (항상 활성) ──────────────
  // localStorage에서 직접 읽어 최신 tone/repeat 반영
  useEffect(() => {
    if (!IS_NATIVE) return
    setCustomAlarmHandler(() => {
      // 알람 발동: 다른 앱(YouTube 등) 강제 일시정지 (6초간)
      requestAudioFocus(6000)
      // 시스템 알림 채널이 ogu_custom.mp3 재생 → JS 추가 재생 안 함 (이중 사운드 방지)
    })
    return () => setCustomAlarmHandler(null)
  }, [volume])

  const saveCheckin = useCallback(async (activityType) => {
    const entry = {
      activity_type: activityType,
      alarm_hour:    new Date().getHours(),
      created_at:    new Date().toISOString(),
    }

    // 항상 로컬 저장 (비로그인 fallback + 오프라인 대비)
    try {
      const raw  = localStorage.getItem('ogu_local_checkins')
      const list = raw ? JSON.parse(raw) : []
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
      const trimmed = list.filter(c => new Date(c.created_at) >= cutoff)
      trimmed.unshift(entry)
      localStorage.setItem('ogu_local_checkins', JSON.stringify(trimmed))
      // 새 체크인 entry를 detail에 실어 발사 — 리포트/홈이 즉시 반영 (Supabase 비동기 대기 불필요)
      window.dispatchEvent(new CustomEvent('ogu:checkin', { detail: entry }))
    } catch {}

    // 로그인 시 Supabase에도 저장
    if (!userId) return
    const { error } = await supabase
      .from('notification_log')
      .insert({ user_id: userId, ...entry })
    if (error) {
      console.error('[체크인] Supabase 저장 실패:', error)
      // 사용자가 인지하도록 이벤트 발사 (UI에서 토스트 등으로 표시 가능)
      window.dispatchEvent(new CustomEvent('ogu:checkin-error', {
        detail: { message: error.message, code: error.code },
      }))
    } else {
      console.log('[체크인] Supabase 저장 성공:', entry)
    }
  }, [userId])

  return {
    alarmCount,
    showAlarmPopup,
    alarmContent,
    closeAlarmPopup: () => { setShowAlarmPopup(false); setAlarmContent(null) },
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

// ── mp3 반복 재생 (네이티브용) ─────────────────────────────────
// 한 번 끝날 때마다 currentTime 리셋 후 다시 재생 → 잘림/겹침 없이 N회
export function playMp3Repeat(src, volume = 1.0, repeat = 1) {
  try {
    const audio = new Audio(src)
    audio.volume = Math.max(0.01, Math.min(1.0, volume))
    const target = Math.max(1, Math.min(5, repeat))
    let count = 0
    audio.onended = () => {
      count++
      if (count < target) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
    }
    audio.play().catch(() => {})
  } catch (_) {}
}

let _audioCtx = null

export function unlockAudio() {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (_audioCtx.state === 'suspended') _audioCtx.resume()
  } catch (_) {}
}

export function playOguSound(tone = '유쾌', repeat = 1, volume = 1.0) {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = _audioCtx
    const playNotes = () => {
      const baseTime = ctx.currentTime
      const interval = TONE_DURATION[tone] || 0.9
      const notes    = TONE_CONFIGS[tone] || TONE_CONFIGS['유쾌']
      const vol      = Math.max(0.01, Math.min(1.0, volume))
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
          gain.gain.setValueAtTime(g * vol, t)
          gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
          osc.start(t)
          osc.stop(t + dur + 0.05)
        })
      }
    }
    if (ctx.state === 'suspended') {
      ctx.resume().then(playNotes).catch(() => {})
    } else {
      playNotes()
    }
  } catch (_) {}
}

// 커스텀 알람음 재생 (AlarmsPage 미리듣기용)
export function playAlarmTone(tone = '딩동', volume = 1.0) {
  try {
    if (!_audioCtx) {
      _audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    const ctx = _audioCtx
    const notes = ALARM_TONE_CONFIGS[tone] || ALARM_TONE_CONFIGS['딩동']
    const vol   = Math.max(0.01, Math.min(1.0, volume))

    const playNotes = () => {
      const base = ctx.currentTime
      notes.forEach(({ freq, start, dur, type, gain: g }) => {
        const osc  = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = type
        const t = base + start
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(g * vol, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur)
        osc.start(t)
        osc.stop(t + dur + 0.05)
      })
    }

    if (ctx.state === 'suspended') {
      ctx.resume().then(playNotes).catch(() => {})
    } else {
      playNotes()
    }
  } catch (_) {}
}

function sendNotification(targetHour) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`⏱️ 곧 ${targetHour}시!`, {
        body: `잠깐, 곧 ${targetHour}시가 됩니다. 잠깐 쉬어가세요.`,
        icon: '/icon-192.png',
      })
    }
  } catch (_) {}
}
