import { useState, useEffect, useCallback } from 'react'
import Toggle from '../common/Toggle'
import { IS_NATIVE } from '../../lib/capacitor'
import { hasUsageAccess, openUsageSettings } from '../../lib/usageStats'

export default function AutoCheckinSection({ enabled, onChange }) {
  const [granted, setGranted] = useState(false)
  const [notice,  setNotice]  = useState(false)   // 고지 화면 표시 여부

  const refresh = useCallback(async () => {
    setGranted(await hasUsageAccess())
  }, [])

  // 시스템 설정에서 돌아왔을 때 권한 상태 재확인
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
    setNotice(true)          // 켤 때는 고지 먼저
  }

  const handleAgree = async () => {
    setNotice(false)
    onChange(true)
    if (!granted) await openUsageSettings()
  }

  return (
    <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>
        ⏱️ 자동 활동 기록
      </div>

      <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        앱 사용시간을 읽어 30분마다 활동을 자동으로 기록합니다.<br />
        <span style={{ color: '#475569' }}>켜두면 알람에서 따로 선택하지 않아도 리포트가 채워집니다.</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0' }}>
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>자동 기록 사용</span>
        {/* Toggle 의 props 는 on / onToggle 이다 (checked / onChange 아님) */}
        <Toggle on={enabled} onToggle={() => handleToggle(!enabled)} />
      </div>

      {enabled && !granted && (
        <button
          onClick={openUsageSettings}
          style={{
            width: '100%', marginTop: 10, padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
            color: '#f59e0b', fontSize: 12, fontWeight: 700,
          }}
        >
          ⚠️ 사용정보 접근 권한이 필요합니다 — 설정 열기
        </button>
      )}
      {enabled && granted && (
        <div style={{ color: '#34d399', fontSize: 12, marginTop: 8 }}>✓ 자동 기록 중</div>
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
              오구톡이 앱 사용시간을 읽습니다
            </div>
            <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 18 }}>
              매시간 무엇을 했는지 자동으로 기록해 리포트를 채우기 위해 사용합니다.<br /><br />
              이 정보는 <b style={{ color: '#818cf8' }}>기기 안에서만 처리되며 서버로 전송되지 않습니다.</b>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setNotice(false)}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#94a3b8', fontSize: 13, fontWeight: 700 }}
              >취소</button>
              <button
                onClick={handleAgree}
                style={{ flex: 1, padding: '12px', borderRadius: 12, cursor: 'pointer', border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', fontSize: 13, fontWeight: 800 }}
              >허용하고 계속</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
