import { useState, useEffect, useMemo } from 'react'
import { CATEGORIES, GROUPS, groupOf, labelOf, colorOf, categoryForApp } from '../../data/appCategories'
import { loadUnmapped, summarize } from '../../lib/unmapped'
import { updateCheckinCategory } from '../../lib/checkinStore'
import { getUsage } from '../../lib/usageStats'
import { minutesOf, formatMinutes } from '../../lib/alarmContext'

// 점수를 매기려면 근거를 보여줘야 한다 — "오늘 시간이 어디로 갔나" 에 답하는 화면.
// v1.10.1: 알람 팝업의 "다르게 기록" 을 없앤 대신, 잘못 잡힌 앱을 여기서 고친다.
// 레코드에는 앱 이름이 없으므로(사용시간 원본을 저장하지 않는다는 제약),
// 오늘 기록을 분류별로 펼쳐 보여주고, 앱별 수정값은 따로 관리한다.
const OVERRIDE_KEY = 'ogu_app_category'

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} }
}
function saveOverrides(map) {
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map)) } catch {}
}

export default function ScoreBasisModal({ checkins = [], now = Date.now(), userId = null, onClose }) {
  const [overrides, setOverrides] = useState(loadOverrides)
  const [apps, setApps] = useState([])
  // 분류 못 해 버려진 시간 — 분류표를 늘릴지 판단할 근거 (기기 안에만 쌓인다)
  const unmapped = useMemo(() => summarize(loadUnmapped()), [overrides])

  // 오늘 기록된 시간대 — "유튜브로 강의를 들었다" 같은 건 앱 분류로 못 푼다.
  // 앱은 그대로 두고 그 시간대 하나만 고치는 길이 있어야 한다.
  const todaySlots = useMemo(() => {
    const start = new Date(now); start.setHours(0, 0, 0, 0)
    return checkins
      .filter(c => {
        const t = new Date(c.created_at).getTime()
        return !Number.isNaN(t) && t >= start.getTime() && t <= now
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }, [checkins, now])

  const fixSlot = (createdAt, category) => {
    updateCheckinCategory([createdAt], category, userId)   // ogu:checkin 이벤트로 목록이 새로 읽힌다
  }

  // 오늘 많이 쓴 앱 — 분류를 고칠 대상이다 (네이티브·권한 없으면 빈 배열)
  useEffect(() => {
    let alive = true
    const dayStart = new Date(); dayStart.setHours(0, 0, 0, 0)
    getUsage(dayStart.getTime(), Date.now(), 12)
      .then(list => { if (alive) setApps(list) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const start = new Date(now); start.setHours(0, 0, 0, 0)
  const byType = {}
  for (const c of checkins) {
    const t = new Date(c.created_at).getTime()
    if (Number.isNaN(t) || t < start.getTime() || t > now) continue
    byType[c.activity_type] = (byType[c.activity_type] ?? 0) + minutesOf(c)
  }
  const rows = Object.entries(byType)
    .map(([type, min]) => ({ type, min, group: groupOf(type) }))
    .sort((a, b) => b.min - a.min)

  const removeOverride = (pkg) => {
    const next = { ...overrides }
    delete next[pkg]
    saveOverrides(next)
    setOverrides(next)
  }
  const changeOverride = (pkg, category) => {
    const next = { ...overrides, [pkg]: category }
    saveOverrides(next)
    setOverrides(next)
  }

  const overrideList = Object.entries(overrides)

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 900, padding: 16,
        background: 'rgba(2,6,23,0.8)', display: 'flex', alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420, maxHeight: '82vh', overflowY: 'auto',
          background: '#FFFFFF', border: '1px solid rgba(255,107,44,0.22)',
          borderRadius: '20px 20px 14px 14px', padding: 20,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 900, color: '#111111', marginBottom: 4 }}>
          오늘 무엇이 잡혔나
        </div>
        <div style={{ color: '#9A9AA0', fontSize: 12, marginBottom: 16 }}>
          오구 지수는 아래 기록으로 계산했어요. 자동 기록 1칸은 30분입니다.
        </div>

        {rows.length === 0 ? (
          <div style={{ color: '#9A9AA0', fontSize: 13, padding: '18px 0' }}>
            오늘 기록이 아직 없어요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <div key={r.type} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(0,0,0,0.025)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                  background: GROUPS[r.group]?.color ?? '#9A9AA0',
                }} />
                <span style={{ flex: 1, color: '#111111', fontSize: 14, fontWeight: 600 }}>
                  {labelOf(r.type)}
                </span>
                <span style={{ color: '#8E8E93', fontSize: 12 }}>{labelOf(r.group)}</span>
                <span style={{
                  color: '#3A3A3E', fontSize: 13, fontWeight: 700, minWidth: 60,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMinutes(r.min)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 오늘 기록된 시간대 — 그 시간만 고친다 (앱 분류는 건드리지 않는다) */}
        {todaySlots.length > 0 && (
          <>
            <div style={{ marginTop: 22, fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 2 }}>
              오늘 기록된 시간대
            </div>
            <div style={{ color: '#9A9AA0', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
              유튜브로 강의를 봤다면 그 시간만 학습으로 바꾸세요.
              앱 분류는 그대로 둡니다.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 260, overflowY: 'auto' }}>
              {todaySlots.map(c => {
                const d = new Date(c.created_at)
                const hhmm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
                return (
                  <div key={c.created_at} style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
                    borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF',
                  }}>
                    <span style={{
                      fontSize: 11.5, color: '#8E8E93', flexShrink: 0, minWidth: 38,
                      fontVariantNumeric: 'tabular-nums',
                    }}>{hhmm}</span>
                    <span style={{
                      width: 6, height: 6, borderRadius: 3, flexShrink: 0,
                      background: colorOf(c.activity_type) || '#C7C7CC',
                    }} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#3A3A3E',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {labelOf(c.activity_type)}
                    </span>
                    <select
                      value=""
                      onChange={e => { if (e.target.value) fixSlot(c.created_at, e.target.value) }}
                      style={{
                        border: '1px solid #ECECEF', borderRadius: 8, padding: '4px 6px',
                        fontSize: 11.5, color: '#D9531B', background: '#FFFFFF', flexShrink: 0,
                      }}
                    >
                      <option value="">바꾸기</option>
                      {Object.entries(CATEGORIES).map(([id, cat]) => (
                        <option key={id} value={id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* 오늘 많이 쓴 앱 — 여기서 분류를 고치면 다음부터 그 앱에 자동 적용된다 */}
        {apps.length > 0 && (
          <>
            <div style={{ marginTop: 22, fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 2 }}>
              오늘 많이 쓴 앱
            </div>
            <div style={{ color: '#9A9AA0', fontSize: 12, marginBottom: 8 }}>
              분류가 틀렸다면 바꿔주세요. 다음부터 그 앱에 자동으로 적용돼요.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {apps.map(a => {
                const cat = categoryForApp(a.pkg, overrides, a.category)
                return (
                  <div key={a.pkg} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.025)',
                  }}>
                    <span style={{
                      flex: 1, minWidth: 0, color: '#111111', fontSize: 13, fontWeight: 600,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {a.label}
                    </span>
                    <span style={{ color: '#9A9AA0', fontSize: 11, flexShrink: 0 }}>
                      {Math.round(a.seconds / 60)}분
                    </span>
                    <select
                      value={cat ?? ''}
                      onChange={e => changeOverride(a.pkg, e.target.value)}
                      style={{
                        background: 'rgba(0,0,0,0.035)', color: cat ? '#111111' : '#C2521C',
                        border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                        padding: '5px 6px', fontSize: 12, maxWidth: 130,
                      }}
                    >
                      {!cat && <option value="" style={{ background: '#FFFFFF' }}>미분류</option>}
                      <optgroup label="그룹" style={{ background: '#FFFFFF' }}>
                        {Object.entries(GROUPS).map(([id, g]) => (
                          <option key={id} value={id} style={{ background: '#FFFFFF' }}>{g.label}</option>
                        ))}
                      </optgroup>
                      <optgroup label="세부" style={{ background: '#FFFFFF' }}>
                        {Object.entries(CATEGORIES).map(([id, c]) => (
                          <option key={id} value={id} style={{ background: '#FFFFFF' }}>{c.label}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {/* 내가 고친 앱 분류 — 지금까지는 알람 팝업에서만 고칠 수 있었다 */}
        <div style={{ marginTop: 22, fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 6 }}>
          내가 고친 앱 분류
        </div>
        {overrideList.length === 0 ? (
          <div style={{ color: '#9A9AA0', fontSize: 12, lineHeight: 1.6 }}>
            아직 없어요. 위에서 앱 분류를 바꾸면 여기에 쌓입니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overrideList.map(([pkg, cat]) => (
              <div key={pkg} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10, background: 'rgba(0,0,0,0.025)',
              }}>
                <span style={{
                  flex: 1, minWidth: 0, color: '#8E8E93', fontSize: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pkg}
                </span>
                <select
                  value={cat}
                  onChange={e => changeOverride(pkg, e.target.value)}
                  style={{
                    background: 'rgba(0,0,0,0.035)', color: '#111111',
                    border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8,
                    padding: '5px 6px', fontSize: 12,
                  }}
                >
                  {/* 알람 팝업은 그룹 ID(consume 등)를 저장한다 → 그룹도 선택지에 있어야
                      저장된 값이 그대로 보인다. 세부만 넣으면 건드리지 않은 앱이
                      목록의 첫 항목으로 바뀐 것처럼 보인다. */}
                  <optgroup label="그룹" style={{ background: '#FFFFFF' }}>
                    {Object.entries(GROUPS).map(([id, g]) => (
                      <option key={id} value={id} style={{ background: '#FFFFFF' }}>{g.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="세부" style={{ background: '#FFFFFF' }}>
                    {Object.entries(CATEGORIES).map(([id, c]) => (
                      <option key={id} value={id} style={{ background: '#FFFFFF' }}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
                <button
                  onClick={() => removeOverride(pkg)}
                  style={{
                    border: 'none', background: 'transparent', color: '#9A9AA0',
                    fontSize: 12, cursor: 'pointer', padding: '4px 2px',
                  }}
                >
                  되돌리기
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 분류 안 된 앱 — 이 시간은 점수에 아예 안 들어간다. 크기를 보여줘야 고칠 마음이 생긴다 */}
        {unmapped.apps.length > 0 && (
          <>
            <div style={{ marginTop: 22, fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 2 }}>
              분류 안 된 앱 {unmapped.apps.length}개
            </div>
            <div style={{ color: '#9A9AA0', fontSize: 12, marginBottom: 8, lineHeight: 1.5 }}>
              최근 {unmapped.dayCount}일 동안 <b style={{ color: '#D23B2E' }}>하루 평균 {unmapped.perDayMin}분</b>이
              점수에 들어가지 못했어요. 분류를 정해주면 다음부터 기록돼요.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {unmapped.apps.slice(0, 8).map(a => (
                <div key={a.pkg} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                  borderRadius: 10, background: '#FAFAFB', border: '1px solid #ECECEF',
                }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#3A3A3E',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.label}
                  </span>
                  <span style={{ fontSize: 11.5, color: '#9A9AA0', flexShrink: 0 }}>{a.min}분</span>
                  <select
                    value=""
                    onChange={e => { if (e.target.value) changeOverride(a.pkg, e.target.value) }}
                    style={{
                      border: '1px solid #ECECEF', borderRadius: 8, padding: '5px 6px',
                      fontSize: 11.5, color: '#D9531B', background: '#FFFFFF', flexShrink: 0,
                    }}
                  >
                    <option value="">분류 정하기</option>
                    {Object.entries(GROUPS).map(([id, g]) => (
                      <option key={id} value={id}>{g.label}</option>
                    ))}
                    {Object.entries(CATEGORIES).map(([id, c]) => (
                      <option key={id} value={id}>· {c.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.08)', background: 'rgba(0,0,0,0.035)',
            color: '#3A3A3E', fontSize: 14, fontWeight: 700,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
