// ── 음성 인식 훅 (Web Speech API, 한국어) ──────────────────────
// 사용법:
//   const { isListening, isSupported, start, stop } = useVoiceInput({ onResult })
//
// onResult(transcript: string) — 인식 결과 전달
// parseAlarmTime(text)         — "오후 3시 30분" → { hour: 15, minute: 30 }

import { useState, useRef, useCallback } from 'react'

export function useVoiceInput({ onResult, lang = 'ko-KR' } = {}) {
  const [isListening, setIsListening] = useState(false)
  const [error, setError]             = useState(null)
  const recRef = useRef(null)

  const isSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition)

  const start = useCallback(() => {
    if (!isSupported) {
      setError('이 기기에서는 음성 인식을 지원하지 않아요.')
      return
    }
    setError(null)

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = lang
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.continuous = false

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript
      onResult?.(text)
      setIsListening(false)
    }
    rec.onerror = (e) => {
      const msg =
        e.error === 'not-allowed' ? '마이크 권한이 없어요. 설정에서 허용해주세요.' :
        e.error === 'no-speech'   ? '말소리를 감지하지 못했어요. 다시 시도해주세요.' :
        e.error === 'network'     ? '네트워크 오류가 발생했어요.' :
        '음성 인식 오류: ' + e.error
      setError(msg)
      setIsListening(false)
    }
    rec.onend = () => setIsListening(false)

    rec.start()
    recRef.current = rec
    setIsListening(true)
  }, [isSupported, lang, onResult])

  const stop = useCallback(() => {
    recRef.current?.stop()
    setIsListening(false)
  }, [])

  return { isListening, isSupported, error, start, stop }
}

// ── 음성 텍스트에서 시간 파싱 ──────────────────────────────────
// 지원 패턴:
//   "오전 9시 30분"    → { hour: 9,  minute: 30 }
//   "오후 3시"         → { hour: 15, minute: 0  }
//   "저녁 8시 15분"    → { hour: 20, minute: 15 }
//   "12시 45분"        → { hour: 12, minute: 45 }
//   "새벽 2시"         → { hour: 2,  minute: 0  }
export function parseAlarmTime(text) {
  if (!text) return null

  const t = text.trim()

  // 오전/오후/시간대 판별
  const isPm =
    /오후|저녁|밤/.test(t)   ? true  :
    /오전|아침|새벽/.test(t) ? false :
    null   // 명시 없음 — 숫자로만 판단

  const hourMatch = t.match(/(\d+)\s*시/)
  const minMatch  = t.match(/(\d+)\s*분/)

  if (!hourMatch) return null

  let hour   = parseInt(hourMatch[1], 10)
  const minute = minMatch ? Math.min(59, parseInt(minMatch[1], 10)) : 0

  // 오전/오후 보정
  if (isPm === true  && hour < 12) hour += 12
  if (isPm === false && hour === 12) hour = 0

  // 범위 클램프
  hour = Math.max(0, Math.min(23, hour))

  return { hour, minute }
}

// ── 음성 텍스트 정제 (할일 제목용) ────────────────────────────
// "~ 추가해줘", "~ 할일로 저장해" 등 불필요한 말 제거
export function cleanTodoTitle(text) {
  return text
    .replace(/추가해\s*(줘|주세요|줘요)?/g, '')
    .replace(/할일(로|을|이야|로\s*저장)/g, '')
    .replace(/알람(으로|을|이야)?/g, '')
    .replace(/저장해\s*(줘|주세요)?/g, '')
    .replace(/등록해\s*(줘|주세요)?/g, '')
    .trim()
    || text.trim()  // 제거 후 빈 문자열이면 원본 반환
}
