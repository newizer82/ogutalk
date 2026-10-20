import { useState, useEffect, useCallback } from 'react'
import { detectAiApps, setAiApp } from '../../lib/aiApps'
import { loadSettings } from '../../lib/settings'
import { logEvent } from '../../lib/firebase'

// 오구 브리지 — 매시 59분에 "지금 AI에 물어볼 것" 한 장을 건넨다.
// 권한도 토글도 없다. 끌 이유가 없는 기능에 스위치를 달면 설정만 길어진다.
// 여기서 하는 일은 둘뿐: 뭐가 감지됐는지 보여주고, 자동 선택을 뒤집게 해준다.
export default function AiBridgeSection() {
  const [apps, setApps] = useState([])
  const [picked, setPicked] = useState(() => loadSettings().aiApp ?? null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setApps(await detectAiApps())
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
    // 설정 화면을 열어둔 채 AI 앱을 깔고 돌아오는 경우가 있다
    const onVis = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [refresh])

  const choose = (pkg) => {
    setPicked(pkg)
    setAiApp(pkg)
    logEvent('ai_app_pick', { pkg: pkg ?? 'auto' })
  }

  // 자동일 때 실제로 쓰이는 앱 — "자동"만 적어두면 뭐가 열릴지 모른다
  const autoLabel = apps[0]?.label ?? null

  const chip = (on) => ({
    padding: '7px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 12.5, fontWeight: 800,
    border: `1px solid ${on ? '#FF6B2C' : '#ECECEF'}`,
    background: on ? 'rgba(255,107,44,0.12)' : '#FFFFFF',
    color: on ? '#D9531B' : '#8E8E93',
  })

  return (
    <section style={{
      marginBottom: 14, padding: 16, borderRadius: 20,
      background: '#FFFFFF', border: '1px solid #ECECEF',
    }}>
      <div style={{ fontSize: 14, fontWeight: 800, color: '#111111', marginBottom: 4 }}>
        🤖 AI로 보내기
      </div>
      <div style={{ fontSize: 12, color: '#8E8E93', lineHeight: 1.55, marginBottom: 12 }}>
        알람이 울릴 때 "지금 물어볼 것" 을 한 장 꺼내 드려요.
        누르면 폰에 깔린 AI 앱이 질문과 함께 열립니다.
        오구톡은 답을 만들지 않고, 보낸 내용을 서버에 남기지도 않아요.
      </div>

      {loading ? (
        <div style={{ fontSize: 12.5, color: '#9A9AA0' }}>설치된 AI 앱을 찾는 중…</div>
      ) : apps.length === 0 ? (
        <div style={{
          fontSize: 12.5, color: '#8E8E93', lineHeight: 1.6,
          padding: '10px 12px', borderRadius: 12, background: '#FAFAFB', border: '1px solid #ECECEF',
        }}>
          AI 앱을 못 찾았어요. 그래도 괜찮아요 — 버튼을 누르면 질문이 복사되니
          쓰시는 AI에 붙여넣기만 하면 됩니다.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <button onClick={() => choose(null)} style={chip(!picked)}>
              자동{autoLabel ? ` · ${autoLabel}` : ''}
            </button>
            {apps.map(a => (
              <button key={a.pkg} onClick={() => choose(a.pkg)} style={chip(picked === a.pkg)}>
                {a.label}
              </button>
            ))}
          </div>
          {/* 프리필이 안 되는 앱이 있다 — 미리 말해두면 "왜 비어 있지" 가 안 생긴다 */}
          {picked && apps.find(a => a.pkg === picked && a.canSend === false) && (
            <div style={{ fontSize: 11.5, color: '#B4740F', marginTop: 9, lineHeight: 1.5 }}>
              이 앱은 질문이 자동으로 입력되지 않아요. 앱이 열리면 길게 눌러 붙여넣으세요
              (질문은 미리 복사해 둡니다).
            </div>
          )}
        </>
      )}
    </section>
  )
}
