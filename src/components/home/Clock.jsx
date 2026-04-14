import { useState, useEffect } from 'react'
import { theme } from '../../styles/theme'

const styles = {
  wrapper: {
    textAlign: 'center',
    padding: '20px 0 16px',
  },
  time: {
    fontSize: 52,
    fontWeight: 800,
    color: '#e2e8f0',
    letterSpacing: -2,
    lineHeight: 1,
    fontVariantNumeric: 'tabular-nums',
  },
  date: {
    fontSize: 14,
    color: theme.text.muted,
    marginTop: 6,
  },
  nextAlarm: {
    marginTop: 8,
    fontSize: 13,
    color: theme.accent.secondary,
    fontWeight: 600,
  },
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function Clock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 (${DAYS[now.getDay()]})`

  // 다음 xx:59 까지 남은 초
  const secsUntil59 = now.getMinutes() === 59
    ? (60 - now.getSeconds()) + 59 * 60  // 다음 시간 59분
    : (59 - now.getMinutes()) * 60 - now.getSeconds()
  const nextHour = now.getMinutes() >= 59 ? (now.getHours() + 1) % 24 : now.getHours()
  const nextAlarmStr = `${String(nextHour).padStart(2, '0')}:59`

  const mLeft = Math.floor(secsUntil59 / 60)
  const sLeft = secsUntil59 % 60
  const countdown = mLeft > 0
    ? `${mLeft}분 ${sLeft}초 후`
    : `${sLeft}초 후`

  return (
    <div style={styles.wrapper}>
      <div style={styles.time}>{hh}:{mm}:{ss}</div>
      <div style={styles.date}>{dateStr}</div>
      <div style={styles.nextAlarm}>
        다음 오구: {nextAlarmStr} ({countdown})
      </div>
    </div>
  )
}
