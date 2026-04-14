import { useState, useEffect, useRef, useCallback } from 'react'

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
          fireAlarm()
        }
      }
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const fireAlarm = useCallback(() => {
    playOguSound()
    sendNotification()
    setAlarmCount(c => c + 1)
    setImmersionMinutes(0)
    startTimeRef.current = Date.now()
    setShowPopup(true)
  }, [])

  function playOguSound() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()

      function playNote(freq, startTime, duration) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, startTime)
        gain.gain.setValueAtTime(0.4, startTime)
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration)
      }

      const t = ctx.currentTime
      playNote(523.25, t,       0.2)  // C5
      playNote(659.25, t + 0.25, 0.25) // E5
    } catch (e) {
      console.warn('오디오 재생 실패:', e)
    }
  }

  function sendNotification() {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏱️ 오구톡', {
        body: '벌써 59분이 지났어요! 잠깐 쉬어가세요.',
        icon: '/icon-192.png',
      })
    }
  }

  return {
    alarmCount,
    immersionMinutes,
    showPopup,
    closePopup: () => setShowPopup(false),
    fireAlarm, // 테스트용
  }
}
