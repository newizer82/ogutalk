import GlassCard from '../components/common/GlassCard'
import Toggle from '../components/common/Toggle'
import { OGU_TONES } from '../data/oguData'
import { gradients, S } from '../styles/theme'
import { IS_NATIVE, scheduleTestNotification, diagnoseOguAlarm, openUrl } from '../lib/capacitor'
import { supabase } from '../lib/supabase'

const pad = n => String(n).padStart(2, '0')

function SettingSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function SettingRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <span style={{ color: '#e2e8f0', fontSize: 13 }}>{label}</span>
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage({
  isLoggedIn, displayEmail, isPremium, setIsPremium,
  premiumFeatures, setPremiumFeatures,
  oguTone, setOguTone, oguRepeat, setOguRepeat,
  alarmMode, setAlarmMode,
  volume = 0.8, setVolume,
  vibStrength = 'medium', setVibStrength,
  alarmHours = {}, setAlarmHours,
  onLoginOpen, onSignOut,
  playSound,
  userId = null,
}) {
  const fireSignal = (tone, repeat) => {
    if (alarmMode !== 'vibrate') playSound(tone, repeat, volume)
    if (alarmMode !== 'sound' && navigator.vibrate) {
      const pats = { weak: [80,60,80], medium: [250,120,250], strong: [400,150,400,150,600] }
      navigator.vibrate(pats[vibStrength] || pats.medium)
    }
  }

  return (
    <div>
      {/* ── 프로필 카드 ── */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: isLoggedIn ? 0 : 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 26, background: gradients.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700, flexShrink: 0 }}>
            {isLoggedIn && displayEmail ? displayEmail[0].toUpperCase() : '🐾'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{isLoggedIn ? displayEmail : '비로그인 사용자'}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{isLoggedIn ? '✨ 로그인 회원 — 전체 기능 사용 중' : '🔓 비로그인 — 기본 기능만 사용 가능'}</div>
          </div>
          {!isLoggedIn && <button style={S.loginBtn} onClick={onLoginOpen}>로그인</button>}
        </div>

        {/* 카카오 로그인 버튼 */}
        {!isLoggedIn && (
          <button
            style={{ width: '100%', marginTop: 10, padding: '12px', borderRadius: 14, border: 'none', background: '#FEE500', color: '#3A1D1D', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onClick={onLoginOpen}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M9 1C4.582 1 1 3.79 1 7.237c0 2.178 1.454 4.092 3.644 5.201l-.928 3.455c-.083.308.266.55.533.37L8.47 13.48A9.17 9.17 0 009 13.474c4.418 0 8-2.79 8-6.237C17 3.789 13.418 1 9 1z" fill="#3A1D1D"/>
            </svg>
            카카오로 시작하기
          </button>
        )}
      </GlassCard>

      {/* 프리미엄 배너 — 추후 활성화 예정 */}

      {/* ── 오구톡 알람 시간 ── */}
      <SettingSection title="⏱️ 오구톡 알람 시간 (매 정각 1분 전)">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
          선택한 시간 직전(×시 59분)에 알람이 울립니다.<br />
          <span style={{ color: '#475569' }}>예: 7 선택 → 6:59에 "곧 7시!" 알림</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5, marginBottom: 10 }}>
          {Array.from({ length: 24 }, (_, i) => i).map(h => (
            <button key={h}
              onClick={() => setAlarmHours({ ...alarmHours, [h]: !alarmHours[h] })}
              style={{
                padding: '7px 2px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${alarmHours[h] ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                background: alarmHours[h] ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                color: alarmHours[h] ? '#818cf8' : '#64748b',
              }}
            >{pad(h)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={S.ghostBtn} onClick={() => { const h = {}; for (let i=7;i<=22;i++) h[i]=true; setAlarmHours(h) }}>주간</button>
          <button style={S.ghostBtn} onClick={() => { const h = {}; for (let i=0;i<24;i++) h[i]=true; setAlarmHours(h) }}>전체</button>
          <button style={S.ghostBtn} onClick={() => setAlarmHours({})}>초기화</button>
          <span style={{ color: '#64748b', fontSize: 11, alignSelf: 'center', marginLeft: 4 }}>
            {Object.values(alarmHours).filter(Boolean).length}개 활성
          </span>
        </div>
      </SettingSection>

      {/* ── 모바일 알람 사운드 톤 ── */}
      {IS_NATIVE && (
        <SettingSection title="📱 모바일 알람 사운드 톤">
          <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
            앱(Android) 백그라운드 알람 시 재생되는 mp3 사운드입니다. 카드를 눌러 미리 들어보세요.
          </div>
          <button
            onClick={() => { const a = new Audio('/sounds/ogu.mp3'); a.play().catch(() => {}) }}
            style={{
              padding: '14px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
              border: '2px solid rgba(192,132,252,0.5)',
              background: 'rgba(192,132,252,0.12)',
              color: '#c084fc', width: '100%',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>📳</div>
            <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>오구 오구~~</div>
            <div style={{ fontSize: 11, opacity: 0.7 }}>▶ 눌러서 앱 알람음 재생</div>
          </button>
        </SettingSection>
      )}

      {/* ── 웹용 오구 사운드 톤 (웹에서만 표시 — 폰은 mp3 고정) ── */}
      {!IS_NATIVE && (
        <SettingSection title="🎵 웹용 오구 사운드 톤">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {Object.entries(OGU_TONES).map(([key, t]) => (
              <button key={key} onClick={() => { setOguTone(key); fireSignal(key, 1) }} style={{
                padding: '10px 12px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${oguTone === key ? t.color : 'rgba(255,255,255,0.08)'}`,
                background: oguTone === key ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                color: oguTone === key ? t.color : '#94a3b8',
              }}>
                <div style={{ fontSize: 18, marginBottom: 2 }}>{t.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </SettingSection>
      )}

      {/* ── 백그라운드 알람 안내 ── */}
      <SettingSection title="📱 백그라운드 알람">
        <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.7 }}>
          앱을 닫아도 설정한 시간의 59분에 알람이 울립니다.<br />
          기기 알림 설정에서 오구톡 알림이 허용되어 있는지 확인하세요.
        </div>
        {IS_NATIVE && (
          <>
            <button
              onClick={() => scheduleTestNotification()}
              style={{
                marginTop: 10, width: '100%', padding: '10px', borderRadius: 12,
                border: '1px solid rgba(99,102,241,0.3)', cursor: 'pointer',
                background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                fontSize: 12, fontWeight: 700,
              }}
            >
              🧪 30초 뒤 테스트 알림 받기
            </button>
            <button
              onClick={async () => {
                const d = await diagnoseOguAlarm()
                const enabledHours = Object.entries(alarmHours).filter(([_, v]) => v).map(([k]) => k).join(', ') || '(없음!)'
                alert(
                  `🔍 오구 알람 진단\n\n` +
                  `알림 권한: ${d.permission}\n` +
                  `활성 시간대: ${enabledHours}\n\n` +
                  `대기중 오구 알람: ${d.totalOguPending}개\n` +
                  `대기중 커스텀 알람: ${d.customCount}개\n\n` +
                  `다음 3개 오구 알람:\n${(d.next3 || []).join('\n') || '(없음 — 등록 실패)'}\n\n` +
                  (d.error ? `❌ 에러: ${d.error}` : '')
                )
              }}
              style={{
                marginTop: 8, width: '100%', padding: '10px', borderRadius: 12,
                border: '1px solid rgba(251,146,60,0.3)', cursor: 'pointer',
                background: 'rgba(251,146,60,0.1)', color: '#fb923c',
                fontSize: 12, fontWeight: 700,
              }}
            >
              🔍 오구 알람 진단 (대기중 알람 확인)
            </button>
            <button
              onClick={async () => {
                // 로컬 체크인 분석
                let localCount = 0, localToday = 0, localRecent = []
                try {
                  const raw = localStorage.getItem('ogu_local_checkins')
                  const list = raw ? JSON.parse(raw) : []
                  localCount = list.length
                  const todayStr = new Date().toISOString().slice(0, 10)
                  localToday = list.filter(c => c.created_at?.slice(0, 10) === todayStr).length
                  localRecent = list.slice(0, 3).map(c => {
                    const dt = new Date(c.created_at)
                    return `   ${pad(dt.getMonth()+1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())} - ${c.activity_type}`
                  })
                } catch (e) {
                  localRecent = [`   ❌ 로컬 읽기 실패: ${e.message}`]
                }

                // Supabase 분석
                let supaResult = '(비로그인 — Supabase 미사용)'
                let supaRecent = []
                let insertResult = ''
                if (userId) {
                  const since = new Date(); since.setDate(since.getDate() - 30)
                  const { data, error } = await supabase
                    .from('notification_log')
                    .select('*')
                    .eq('user_id', userId)
                    .gte('created_at', since.toISOString())
                    .order('created_at', { ascending: false })
                  if (error) {
                    supaResult = `❌ SELECT 에러:\n   ${error.message}\n   코드: ${error.code || '?'}`
                  } else {
                    const todayStr = new Date().toISOString().slice(0, 10)
                    const today = (data || []).filter(c => c.created_at?.slice(0, 10) === todayStr).length
                    supaResult = `✓ Supabase 30일: ${data?.length || 0}개 (오늘 ${today}개)`
                    supaRecent = (data || []).slice(0, 3).map(c => {
                      const dt = new Date(c.created_at)
                      return `   ${pad(dt.getMonth()+1)}/${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())} - ${c.activity_type}`
                    })
                  }

                  // INSERT 실제 테스트 — 정확한 실패 원인 확인
                  const testRow = {
                    user_id:           userId,
                    notification_type: 'checkin',
                    title:             '오구 체크인',
                    body:              '진단 테스트',
                    activity_type:     'study',
                    alarm_hour:        new Date().getHours(),
                    created_at:        new Date().toISOString(),
                  }
                  const { data: insData, error: insErr } = await supabase
                    .from('notification_log')
                    .insert(testRow)
                    .select()
                  if (insErr) {
                    insertResult = `❌ INSERT 실패:\n   ${insErr.message}\n   코드: ${insErr.code || '?'}`
                  } else {
                    insertResult = '✓ INSERT 성공! (테스트 행 정리됨)'
                    // 테스트 행 정리 (best effort)
                    if (insData?.[0]?.id) {
                      await supabase.from('notification_log').delete().eq('id', insData[0].id)
                    }
                  }
                }

                alert(
                  `💾 체크인 저장 진단\n\n` +
                  `로그인: ${userId ? userId.slice(0,8) + '...' : '비로그인'}\n` +
                  `현재시각: ${new Date().toLocaleString('ko-KR')}\n\n` +
                  `📱 로컬(localStorage) 30일: ${localCount}개 (오늘 ${localToday}개)\n` +
                  (localRecent.length ? `   최근 3개:\n${localRecent.join('\n')}\n` : '') +
                  `\n☁️ ${supaResult}\n` +
                  (supaRecent.length ? `   최근 3개:\n${supaRecent.join('\n')}\n` : '') +
                  (insertResult ? `\n🧪 INSERT 테스트:\n${insertResult}\n` : '') +
                  `\n💡 진단:\n` +
                  (userId
                    ? (insertResult.startsWith('❌')
                        ? '⚠️ INSERT 실패 — 위 에러 메시지를 그대로 알려주세요.\n   (RLS 정책 또는 컬럼 제약조건 문제)'
                        : '✓ 저장 정상. 리포트가 비어보이면 리포트 탭 재진입.')
                    : '비로그인은 로컬만 사용. 로컬에 있으면 리포트에 나옴.')
                )
              }}
              style={{
                marginTop: 8, width: '100%', padding: '10px', borderRadius: 12,
                border: '1px solid rgba(52,211,153,0.3)', cursor: 'pointer',
                background: 'rgba(52,211,153,0.1)', color: '#34d399',
                fontSize: 12, fontWeight: 700,
              }}
            >
              💾 체크인 저장 진단 (로컬/Supabase 비교)
            </button>
          </>
        )}
        <div style={{ marginTop: 10, marginBottom: 12, padding: '8px 12px', borderRadius: 10,
          background: IS_NATIVE ? 'rgba(52,211,153,0.08)' : 'rgba(99,102,241,0.08)',
          border: `1px solid ${IS_NATIVE ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)'}`,
        }}>
          <span style={{ color: IS_NATIVE ? '#34d399' : '#818cf8', fontSize: 12, fontWeight: 700 }}>
            {IS_NATIVE ? '🟢 Capacitor 로컬 알림 활성' : '🌐 브라우저 알림 모드 (앱 설치 시 백그라운드 알림 지원)'}
          </span>
        </div>

      </SettingSection>

      {/* ── 약관·정보 ── */}
      <SettingSection title="ℹ️ 약관 및 정보">
        <button
          onClick={() => openUrl('https://ogutalk.vercel.app/privacy.html')}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
            color: '#94a3b8', fontSize: 13, textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>🔒 개인정보 처리방침</span>
          <span style={{ color: '#475569' }}>›</span>
        </button>
        <div style={{ color: '#475569', fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          오구톡 v0.6 · 주식회사 지성엔테크
        </div>
      </SettingSection>

      {isLoggedIn && (
        <button style={{ ...S.ghostBtn, width: '100%', marginTop: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
          onClick={onSignOut}>로그아웃</button>
      )}
    </div>
  )
}
