// ── 약속·일정 수정 (순수 로직) ──────────────────────────────────
// 날짜는 'YYYY-MM-DD' 문자열 그대로 다룬다 — new Date() 로 돌리면 UTC 로 읽혀 하루가 밀린다.

const day = v => String(v ?? '').slice(0, 10)

export function draftOf(t) {
  return {
    title:    t.title || t.text || '',
    due_date: day(t.due_date),
    end_date: day(t.end_date),
    due_hour: t.due_hour ?? null,
    place:    t.place || '',
  }
}

/** 저장할 수 없으면 이유, 괜찮으면 null */
export function editError(t, d) {
  if (!d.title.trim()) return '내용을 입력해 주세요'
  if ((t.todo_type === 'appointment' || t.end_date) && !d.due_date) return '날짜를 골라 주세요'
  if (d.end_date && d.end_date < d.due_date) return '끝나는 날이 시작보다 빨라요'
  return null
}

/** 바뀐 칸만 담는다. 하루짜리로 줄어든 기간은 end_date 를 비운다 (달력이 띠로 그리지 않게) */
export function editPatch(t, d) {
  const before = draftOf(t)
  const after = {
    ...d,
    title: d.title.trim(),
    place: d.place.trim(),
    end_date: d.end_date === d.due_date ? '' : d.end_date,
  }
  const patch = {}
  if (after.title !== before.title) patch.title = after.title
  if (after.due_date !== before.due_date) patch.due_date = after.due_date || null
  if (after.end_date !== before.end_date) patch.end_date = after.end_date || null
  if (t.todo_type === 'appointment') {
    if (after.due_hour !== before.due_hour) patch.due_hour = after.due_hour
    if (after.place !== before.place) patch.place = after.place || null
  }
  return patch
}
