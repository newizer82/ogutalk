// 하루를 4 시간대로 분류 — 알람 목록 그룹핑 / HomePage 타임라인 재사용
//
// 사용:
//   const groups = groupAlarmsByTimeSegment(customAlarms)
//   for (const seg of TIME_SEGMENTS) {
//     const list = groups[seg.key]
//     if (list.length === 0) continue
//     // render seg.label + list
//   }

// 시각(0~23) → 4구간 키
export function getTimeSegment(hour) {
  if (hour >= 5  && hour < 9)  return 'morning'   // 🌅 아침
  if (hour >= 9  && hour < 12) return 'am'        // 🌞 오전
  if (hour >= 12 && hour < 18) return 'pm'        // ☀️ 오후
  return 'evening'                                 // 🌙 저녁·밤 (18~23, 00~04)
}

// 화면 렌더 순서 + 라벨 + 색상 (다크 테마 톤)
export const TIME_SEGMENTS = [
  { key: 'morning', label: '🌅 아침',    range: '05–08시', color: '#fb923c' },
  { key: 'am',      label: '🌞 오전',    range: '09–11시', color: '#fbbf24' },
  { key: 'pm',      label: '☀️ 오후',   range: '12–17시', color: '#6366f1' },
  { key: 'evening', label: '🌙 저녁·밤', range: '18–04시', color: '#8b5cf6' },
]

// 알람 배열을 4구간으로 그룹핑 + 각 그룹 내부는 시간 오름차순 정렬
export function groupAlarmsByTimeSegment(alarms = []) {
  const groups = { morning: [], am: [], pm: [], evening: [] }
  for (const a of alarms) {
    const key = getTimeSegment(a.hour ?? 0)
    groups[key].push(a)
  }
  for (const key of Object.keys(groups)) {
    groups[key].sort((x, y) =>
      (x.hour - y.hour) || ((x.minute ?? 0) - (y.minute ?? 0))
    )
  }
  return groups
}
