import { useState } from 'react'
import { CATEGORIES, GROUPS, groupOf, labelOf } from '../../data/appCategories'
import { minutesOf, formatMinutes } from '../../lib/alarmContext'

// 점수를 매기려면 근거를 보여줘야 한다 — "무엇이 생산으로 잡혔나" 에 답하는 화면.
// 레코드에는 앱 이름이 없으므로(사용시간 원본을 저장하지 않는다는 제약),
// 오늘 기록을 분류별로 펼쳐 보여주고, 앱별 수정값은 따로 관리한다.
const OVERRIDE_KEY = 'ogu_app_category'

function loadOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDE_KEY) || '{}') } catch { return {} }
}
function saveOverrides(map) {
  try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(map)) } catch {}
}

export default function ScoreBasisModal({ checkins = [], now = Date.now(), onClose }) {
  const [overrides, setOverrides] = useState(loadOverrides)

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
          background: '#0f172a', border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: '20px 20px 14px 14px', padding: 20,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 900, color: '#f1f5f9', marginBottom: 4 }}>
          오늘 무엇이 잡혔나
        </div>
        <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
          오구 지수는 아래 기록으로 계산했어요. 자동 기록 1칸은 30분입니다.
        </div>

        {rows.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 13, padding: '18px 0' }}>
            오늘 기록이 아직 없어요.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {rows.map(r => (
              <div key={r.type} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: 4, flexShrink: 0,
                  background: GROUPS[r.group]?.color ?? '#64748b',
                }} />
                <span style={{ flex: 1, color: '#e2e8f0', fontSize: 14, fontWeight: 600 }}>
                  {labelOf(r.type)}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{labelOf(r.group)}</span>
                <span style={{
                  color: '#cbd5e1', fontSize: 13, fontWeight: 700, minWidth: 60,
                  textAlign: 'right', fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatMinutes(r.min)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 내가 고친 앱 분류 — 지금까지는 알람 팝업에서만 고칠 수 있었다 */}
        <div style={{ marginTop: 22, fontSize: 14, fontWeight: 800, color: '#f1f5f9', marginBottom: 6 }}>
          내가 고친 앱 분류
        </div>
        {overrideList.length === 0 ? (
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
            아직 없어요. 알람 팝업에서 "다르게 기록"을 누르면 그 앱이 여기에 쌓입니다.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {overrideList.map(([pkg, cat]) => (
              <div key={pkg} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10, background: 'rgba(255,255,255,0.04)',
              }}>
                <span style={{
                  flex: 1, minWidth: 0, color: '#94a3b8', fontSize: 12,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {pkg}
                </span>
                <select
                  value={cat}
                  onChange={e => changeOverride(pkg, e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8,
                    padding: '5px 6px', fontSize: 12,
                  }}
                >
                  {/* 알람 팝업은 그룹 ID(consume 등)를 저장한다 → 그룹도 선택지에 있어야
                      저장된 값이 그대로 보인다. 세부만 넣으면 건드리지 않은 앱이
                      목록의 첫 항목으로 바뀐 것처럼 보인다. */}
                  <optgroup label="그룹" style={{ background: '#0f172a' }}>
                    {Object.entries(GROUPS).map(([id, g]) => (
                      <option key={id} value={id} style={{ background: '#0f172a' }}>{g.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="세부" style={{ background: '#0f172a' }}>
                    {Object.entries(CATEGORIES).map(([id, c]) => (
                      <option key={id} value={id} style={{ background: '#0f172a' }}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
                <button
                  onClick={() => removeOverride(pkg)}
                  style={{
                    border: 'none', background: 'transparent', color: '#64748b',
                    fontSize: 12, cursor: 'pointer', padding: '4px 2px',
                  }}
                >
                  되돌리기
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 20, padding: '12px', borderRadius: 12, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
            color: '#cbd5e1', fontSize: 14, fontWeight: 700,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  )
}
