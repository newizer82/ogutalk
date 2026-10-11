import { useState, useEffect, useCallback } from 'react'
import Toggle from '../common/Toggle'
import { IS_NATIVE } from '../../lib/capacitor'
import { hasCalendarPermission, requestCalendarPermission, getCalendars } from '../../lib/calendar'
import { logEvent } from '../../lib/firebase'

// 자동 활동 기록과 같은 규칙을 지킨다: 기본 꺼짐, 권한 요청 전 사전 고지(Play 정책),
// 모달이 뜬 직후 300ms 는 버튼을 잠근다(토글 탭의 합성 클릭이 동의로 새는 것 방지).
export default function CalendarSection({ enabled, onChange, calendarIds = [], onCalendarIdsChange }) {
  const [granted, setGranted] = useState(false)
  const [notice,  setNotice]  = useState(false)
  const [armed,   setArmed]   = useState(false)
  const [cals,    setCals]    = useState([])

  useEffect(() => {
    if (!notice) { setArmed(false); return }
    const t = setTimeout(() => setArmed(true), 300)
    return () => clearTimeout(t)
  }, [notice])

  const refresh = useCallback(async () => {
    const ok = await hasCalendarPermission()
    setGranted(ok)
    setCals(ok ? await getCalendars() : [])
  }, [])

  // 고른 게 없으면 전체를 본다 — 계정이 여럿이면 같은 일정이 여러 번 뜬다
  const picked = new Set(calendarIds)
  const isOn = id => picked.size === 0 || picked.has(id)
  const toggleCal = (id) => {
    // 처음 손대는 순간 "전체"를 실제 목록으로 펼쳐 둔다 (하나만 끄려던 건데 하나만 켜지면 당황한다)
    const base = picked.size === 0 ? new Set(cals.map(c => c.id)) : new Set(picked)
    if (base.has(id)) base.delete(id)
    else base.add(id)
    // 전부 끄면 아무 일정도 안 보인다 → 마지막 하나는 끄지 못하게 한다
    if (base.size === 0) return
    onCalendarIdsChange?.(base.size === cals.length ? [] : [...base])
  }

  useEffect(() => {
    if (!IS_NATIVE) return
    refresh()
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  if (!IS_NATIVE) return null

  const handleToggle = (v) => {
    if (!v) { onChange(false); return }
    setNotice(true)
  }

  const handleAgree = async () => {
    if (!armed) return
    setNotice(false)
    const ok = await requestCalendarPermission()
    setGranted(ok)
    onChange(ok)
    if (ok) logEvent('calendar_connected')
  }

  return (
    <div style={{ marginBottom: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 20, padding: 16, border: '1px solid rgba(0,0,0,0.035)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A3E', marginBottom: 12 }}>
        📅 캘린더 연동
      </div>

      <div style={{ color: '#9A9AA0', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        휴대폰 캘린더의 일정을 읽어 알람에 함께 보여줍니다.<br />
        <span style={{ color: '#B0B0B6' }}>"15:00 강남 미팅"처럼 다음 일정을 1시간 전에 알려줘요.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#111111', fontSize: 13 }}>캘린더 사용</span>
        <Toggle on={enabled} onToggle={() => handleToggle(!enabled)} />
      </div>

      {enabled && !granted && (
        <button
          onClick={async () => { const ok = await requestCalendarPermission(); setGranted(ok); if (!ok) onChange(false) }}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(242,153,74,0.4)', background: 'rgba(242,153,74,0.12)',
            color: '#B4740F', fontSize: 12, fontWeight: 700,
          }}
        >
          ⚠️ 캘린더 권한이 필요합니다 — 다시 요청
        </button>
      )}
      {enabled && granted && (
        <div style={{ color: '#1E7A58', fontSize: 12, marginTop: 8 }}>✓ 일정을 함께 보여주는 중</div>
      )}

      {/* ── 볼 캘린더 고르기 — 계정이 여럿이면 같은 일정이 중복돼 들어온다 ── */}
      {enabled && granted && cals.length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #ECECEF' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: '#111111', marginBottom: 2 }}>
            볼 캘린더
          </div>
          <div style={{ fontSize: 11, color: '#9A9AA0', marginBottom: 10, lineHeight: 1.5 }}>
            {picked.size === 0
              ? `전체 ${cals.length}개를 보고 있어요. 필요한 것만 남기면 중복이 줄어요.`
              : `${picked.size}개 선택됨`}
          </div>
          {cals.map(c => (
            <label
              key={c.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isOn(c.id)}
                onChange={() => toggleCal(c.id)}
                style={{ width: 18, height: 18, accentColor: '#FF6B2C', flexShrink: 0 }}
              />
              <span style={{
                width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                background: c.color ? `#${(c.color >>> 0 & 0xFFFFFF).toString(16).padStart(6, '0')}` : '#C7C7CC',
              }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: 'block', fontSize: 13, color: isOn(c.id) ? '#111111' : '#B0B0B6',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.name || '(이름 없음)'}
                </span>
                <span style={{
                  display: 'block', fontSize: 11, color: '#9A9AA0', marginTop: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {c.account}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {/* ── 사전 고지 (Play 정책: 권한 요청 전 명시적 동의) ── */}
      {notice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, padding: 24,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 340, background: '#FFFFFF', borderRadius: 20, padding: 22,
            border: '1px solid rgba(255,107,44,0.22)',
          }}>
            <div style={{ color: '#111111', fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
              오구톡이 캘린더 일정을 읽습니다
            </div>
            <div style={{ color: '#3A3A3E', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              알람이 울릴 때 다음 일정을 함께 보여주기 위해 사용합니다.
              일정은 읽기만 하고 추가·수정하지 않습니다.<br /><br />
              일정 내용은 <b style={{ color: '#D9531B' }}>기기 안에서만 쓰이며 서버로 전송되지 않습니다.</b>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNotice(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(0,0,0,0.08)', background: 'transparent', color: '#8E8E93', fontSize: 13, fontWeight: 700 }}
              >취소</button>
              <button
                onClick={handleAgree}
                disabled={!armed}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none', color: 'white', fontSize: 13, fontWeight: 800,
                  cursor: armed ? 'pointer' : 'default',
                  background: armed ? 'linear-gradient(135deg, #FF6B2C, #E8762C)' : 'rgba(0,0,0,0.08)',
                  opacity: armed ? 1 : 0.5,
                }}
              >허용하고 계속</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
