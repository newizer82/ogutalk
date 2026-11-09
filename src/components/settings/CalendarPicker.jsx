import { useState } from 'react'
import { groupCalendars, isCalendarOn, nextCalendarIds } from '../../lib/calendarPick'

const box = { width: 18, height: 18, accentColor: '#FF6B2C', flexShrink: 0 }
const colorOf = c => (c.color ? `#${(c.color >>> 0 & 0xFFFFFF).toString(16).padStart(6, '0')}` : '#C7C7CC')

// 계정이 여럿이면 캘린더가 수십 줄이 된다 → 평소엔 한 줄로 접고, 펼쳐도 계정 단위로 묶는다.
// 대부분은 "이 계정은 안 본다" 로 끝나므로 계정째 끄는 체크박스가 먼저 보인다.
export default function CalendarPicker({ cals, calendarIds = [], onChange }) {
  const [open, setOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState(() => new Set())

  const groups = groupCalendars(cals)
  const onCount = calendarIds.length === 0 ? cals.length : calendarIds.length

  const apply = (ids, on) => {
    const next = nextCalendarIds(cals, calendarIds, ids, on)
    if (next) onChange?.(next)
  }
  const toggleGroup = key => setOpenGroups(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next
  })

  return (
    <div style={{ marginTop: 14, paddingTop: 4, borderTop: '1px solid #ECECEF' }}>
      <button
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', width: '100%', padding: '10px 0', gap: 8,
          border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 12.5, fontWeight: 800, color: '#111111' }}>볼 캘린더</span>
        <span style={{ flex: 1, fontSize: 12, color: '#8E8E93', textAlign: 'right' }}>
          {calendarIds.length === 0 ? `전체 ${cals.length}개` : `${onCount}/${cals.length}개`}
        </span>
        <span style={{ fontSize: 12, color: '#9A9AA0' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <>
          <div style={{ fontSize: 11, color: '#9A9AA0', marginBottom: 6, lineHeight: 1.5 }}>
            같은 일정이 여러 번 보이면 안 쓰는 계정을 꺼 주세요.
          </div>
          {groups.map(g => {
            const ids = g.items.map(c => c.id)
            const on = ids.filter(id => isCalendarOn(calendarIds, id)).length
            const single = groups.length === 1      // 계정이 하나면 접을 이유가 없다
            const expanded = single || openGroups.has(g.key)
            return (
              <div key={g.key} style={{ borderTop: '1px solid #F2F2F4' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 42 }}>
                  <input
                    type="checkbox"
                    aria-label={`${g.label} 전체`}
                    checked={on === ids.length}
                    ref={el => { if (el) el.indeterminate = on > 0 && on < ids.length }}
                    onChange={() => apply(ids, on < ids.length)}
                    style={box}
                  />
                  <button
                    onClick={() => toggleGroup(g.key)}
                    disabled={single}
                    aria-expanded={expanded}
                    style={{
                      display: 'flex', alignItems: 'center', flex: 1, minWidth: 0, gap: 8, padding: '10px 0',
                      border: 'none', background: 'transparent', textAlign: 'left',
                      cursor: single ? 'default' : 'pointer',
                    }}
                  >
                    <span style={{
                      flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: on ? '#111111' : '#B0B0B6',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {g.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#9A9AA0', fontVariantNumeric: 'tabular-nums' }}>
                      {on}/{ids.length}
                    </span>
                    {!single && <span style={{ fontSize: 11, color: '#9A9AA0' }}>{expanded ? '▲' : '▼'}</span>}
                  </button>
                </div>
                {expanded && g.items.map(c => {
                  const itemOn = isCalendarOn(calendarIds, c.id)
                  return (
                    <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0 7px 12px', cursor: 'pointer' }}>
                      <input type="checkbox" checked={itemOn} onChange={() => apply([c.id], !itemOn)} style={box} />
                      <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, background: colorOf(c) }} />
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 13, color: itemOn ? '#111111' : '#B0B0B6',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {c.name || '(이름 없음)'}
                      </span>
                    </label>
                  )
                })}
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
