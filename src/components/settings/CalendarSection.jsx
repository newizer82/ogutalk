import { useState, useEffect, useCallback } from 'react'
import Toggle from '../common/Toggle'
import { IS_NATIVE } from '../../lib/capacitor'
import { hasCalendarPermission, requestCalendarPermission } from '../../lib/calendar'
import { logEvent } from '../../lib/firebase'

// 자동 활동 기록과 같은 규칙을 지킨다: 기본 꺼짐, 권한 요청 전 사전 고지(Play 정책),
// 모달이 뜬 직후 300ms 는 버튼을 잠근다(토글 탭의 합성 클릭이 동의로 새는 것 방지).
export default function CalendarSection({ enabled, onChange }) {
  const [granted, setGranted] = useState(false)
  const [notice,  setNotice]  = useState(false)
  const [armed,   setArmed]   = useState(false)

  useEffect(() => {
    if (!notice) { setArmed(false); return }
    const t = setTimeout(() => setArmed(true), 300)
    return () => clearTimeout(t)
  }, [notice])

  const refresh = useCallback(async () => setGranted(await hasCalendarPermission()), [])

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
    <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
        📅 캘린더 연동
      </div>

      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        휴대폰 캘린더의 일정을 읽어 알람에 함께 보여줍니다.<br />
        <span style={{ color: '#475569' }}>"15:00 강남 미팅"처럼 다음 일정을 1시간 전에 알려줘요.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>캘린더 사용</span>
        <Toggle on={enabled} onToggle={() => handleToggle(!enabled)} />
      </div>

      {enabled && !granted && (
        <button
          onClick={async () => { const ok = await requestCalendarPermission(); setGranted(ok); if (!ok) onChange(false) }}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b', fontSize: 12, fontWeight: 700,
          }}
        >
          ⚠️ 캘린더 권한이 필요합니다 — 다시 요청
        </button>
      )}
      {enabled && granted && (
        <div style={{ color: '#34d399', fontSize: 12, marginTop: 8 }}>✓ 일정을 함께 보여주는 중</div>
      )}

      {/* ── 사전 고지 (Play 정책: 권한 요청 전 명시적 동의) ── */}
      {notice && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000, padding: 24,
          background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%', maxWidth: 340, background: '#1e293b', borderRadius: 20, padding: 22,
            border: '1px solid rgba(99,102,241,0.3)',
          }}>
            <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 800, marginBottom: 12 }}>
              오구톡이 캘린더 일정을 읽습니다
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              알람이 울릴 때 다음 일정을 함께 보여주기 위해 사용합니다.
              일정은 읽기만 하고 추가·수정하지 않습니다.<br /><br />
              일정 내용은 <b style={{ color: '#818cf8' }}>기기 안에서만 쓰이며 서버로 전송되지 않습니다.</b>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNotice(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}
              >취소</button>
              <button
                onClick={handleAgree}
                disabled={!armed}
                style={{
                  flex: 1, padding: '12px', borderRadius: 12, border: 'none', color: 'white', fontSize: 13, fontWeight: 800,
                  cursor: armed ? 'pointer' : 'default',
                  background: armed ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.12)',
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
