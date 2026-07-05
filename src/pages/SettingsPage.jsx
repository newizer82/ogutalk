import { useState, useEffect } from 'react'
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
  onLoginOpen, onSignOut, onDeleteAccount,
  playSound,
  userId = null,
}) {
  // 프로필 카드 클릭 시 로그아웃 메뉴 토글
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  // 위험 영역 클릭 시 계정 삭제 버튼 노출 토글
  const [dangerOpen, setDangerOpen] = useState(false)

  // ── 안드로이드 뒤로가기 — 페이지 오버레이 닫기 ──────────────────
  // 우선순위: 위험 영역 펼침 → 프로필 메뉴 펼침
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.handled) return
      if (dangerOpen)      { setDangerOpen(false); e.detail.handled = true; return }
      if (profileMenuOpen) { setProfileMenuOpen(false); e.detail.handled = true; return }
    }
    window.addEventListener('ogu:backRequest', handler)
    return () => window.removeEventListener('ogu:backRequest', handler)
  }, [dangerOpen, profileMenuOpen])
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
        <div
          onClick={() => isLoggedIn && setProfileMenuOpen(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: isLoggedIn ? 'pointer' : 'default',
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 26, background: gradients.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, color: 'white', fontWeight: 700, flexShrink: 0 }}>
            {isLoggedIn && displayEmail ? displayEmail[0].toUpperCase() : '🐾'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 15 }}>{isLoggedIn ? displayEmail : '비로그인 사용자'}</div>
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{isLoggedIn ? '✨ 로그인 회원 — 탭하면 계정 메뉴' : '🔓 비로그인 — 기본 기능만 사용 가능'}</div>
          </div>
          {!isLoggedIn && <button style={S.loginBtn} onClick={(e) => { e.stopPropagation(); onLoginOpen() }}>로그인</button>}
          {isLoggedIn && (
            <span style={{ color: '#475569', fontSize: 16, transition: 'transform 0.15s', transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▼
            </span>
          )}
        </div>

        {/* 로그인 사용자 — 펼침 메뉴 */}
        {isLoggedIn && profileMenuOpen && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={onSignOut}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#ef4444', fontSize: 13, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <span>🚪</span> 로그아웃
            </button>
          </div>
        )}

        {/* 카카오 로그인 버튼 — 비로그인 시만 */}
        {!isLoggedIn && (
          <button
            style={{ width: '100%', marginTop: 12, padding: '12px', borderRadius: 14, border: 'none', background: '#FEE500', color: '#3A1D1D', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
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

      {/* ── 오구 알림 방식 (사운드+진동 / 진동만) ── */}
      <SettingSection title="🔔 오구 알림 방식">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 10, lineHeight: 1.6 }}>
          오구 알람이 울릴 때 사운드 재생 여부를 선택합니다.<br />
          <span style={{ color: '#475569' }}>진동만 선택 시 백그라운드에서도 무음으로 진동만 울립니다.</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { key: 'both',    icon: '🔔', label: '오구 알림음 + 진동' },
            { key: 'vibrate', icon: '📳', label: '진동만' },
          ].map(opt => {
            const active = alarmMode === opt.key
            return (
              <button key={opt.key} onClick={() => setAlarmMode(opt.key)} style={{
                padding: '12px 10px', borderRadius: 12, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${active ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                background: active ? 'rgba(99,102,241,0.18)' : 'rgba(255,255,255,0.03)',
                color: active ? '#818cf8' : '#94a3b8',
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{opt.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{opt.label}</div>
              </button>
            )
          })}
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
              padding: '12px 14px', borderRadius: 12, cursor: 'pointer',
              border: '2px solid rgba(192,132,252,0.5)',
              background: 'rgba(192,132,252,0.12)',
              color: '#c084fc', width: '100%',
              display: 'flex', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>📳</span>
            <span style={{ fontSize: 14, fontWeight: 800, flex: 1, textAlign: 'left' }}>오구 오구~~</span>
            <span style={{ fontSize: 11, opacity: 0.7, flexShrink: 0 }}>▶ 미리듣기</span>
          </button>

          {/* 볼륨 조절 안내 — Android 정책상 앱이 알람 볼륨을 직접 조절할 수 없음 */}
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 10,
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
            color: '#94a3b8', fontSize: 11, lineHeight: 1.6,
          }}>
            🔊 <b style={{ color: '#cbd5e1' }}>알람 음량 조절</b><br />
            Android 정책상 앱 내에서 음량을 직접 조절할 수 없어요.<br />
            <span style={{ color: '#64748b' }}>
              폰 <b>설정 → 소리 및 진동 → 볼륨 → 알림 볼륨</b> 슬라이더에서 조절하세요.
              또는 알람이 울릴 때 <b>볼륨 다운 키</b>를 눌러 즉시 낮출 수 있어요.
            </span>
          </div>
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
        {IS_NATIVE && import.meta.env.DEV && (
          <>
            <button
              onClick={() => scheduleTestNotification(alarmMode)}
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

      {/* ── 안정적 사용 가이드 ── */}
      <SettingSection title="📲 안정적인 알람을 위한 권한 안내">
        <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.7, marginBottom: 10 }}>
          오구톡 알람이 정확한 시각에 울리려면 아래 권한이 필요합니다.<br />
          <span style={{ color: '#475569' }}>휴대폰 설정 → 앱 → 오구톡 에서 확인하세요.</span>
        </div>

        {[
          {
            icon: '🔔', title: '알림 허용',
            desc: '알람을 화면에 표시하기 위해 필수입니다. (설정 → 앱 → 오구톡 → 알림 → 허용)',
          },
          {
            icon: '🔋', title: '배터리 최적화 제외',
            desc: '잠자기 모드에서도 알람이 정확히 울리도록 합니다. (설정 → 배터리 → 오구톡 → 최적화 안 함)',
          },
          {
            icon: '🪟', title: '다른 앱 위에 표시 (오버레이)',
            desc: '다른 앱 사용 중에도 알람 팝업을 띄울 수 있습니다. (설정 → 앱 → 오구톡 → 다른 앱 위에 표시 → 허용)',
          },
          {
            icon: '🌙', title: '방해 금지 우회',
            desc: '방해 금지 모드에서도 알람이 울릴 수 있도록 합니다. (설정 → 알림 → 방해 금지 → 예외 → 오구톡)',
          },
          {
            icon: '⏰', title: '알람 및 리마인더 (Android 12+)',
            desc: '정확한 시각 알람을 위해 필요합니다. (설정 → 앱 → 특수 액세스 → 알람 및 리마인더 → 오구톡 허용)',
          },
        ].map(p => (
          <div key={p.title} style={{
            display: 'flex', gap: 10, alignItems: 'flex-start',
            padding: '10px 12px', marginBottom: 6, borderRadius: 10,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: 18, lineHeight: 1.2 }}>{p.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{p.title}</div>
              <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.6 }}>{p.desc}</div>
            </div>
          </div>
        ))}

        <div style={{ color: '#475569', fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          💡 일부 항목은 기기/제조사(Samsung, Xiaomi 등)에 따라 메뉴 위치가 다를 수 있습니다.
        </div>
      </SettingSection>

      {/* ── 위험 영역 (접기 — 클릭하면 계정 삭제 버튼 노출) ── */}
      {isLoggedIn && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 14,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <div
            onClick={() => setDangerOpen(v => !v)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ color: '#ef4444', fontSize: 13, fontWeight: 700 }}>⚠️ 위험 영역</div>
            <span style={{
              color: '#ef4444', fontSize: 14,
              transition: 'transform 0.15s',
              transform: dangerOpen ? 'rotate(180deg)' : 'rotate(0)',
            }}>▼</span>
          </div>

          {dangerOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(239,68,68,0.2)' }}>
              <div style={{ color: '#94a3b8', fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>
                계정을 삭제하면 모든 할일·목표·체크인·알람 데이터가 <b style={{ color: '#fca5a5' }}>영구 삭제</b>되며 복구할 수 없습니다.
              </div>
              <button
                onClick={async () => {
                  const ok1 = window.confirm(
                    '정말로 계정을 삭제하시겠어요?\n\n' +
                    '모든 데이터가 영구 삭제되며 되돌릴 수 없습니다.'
                  )
                  if (!ok1) return
                  const ok2 = window.confirm(
                    '한 번 더 확인 — 계정 삭제를 진행할까요?\n\n' +
                    '이 작업은 즉시 처리되며 취소할 수 없습니다.'
                  )
                  if (!ok2) return
                  try {
                    await onDeleteAccount?.()
                    alert('계정이 삭제됐습니다. 이용해 주셔서 감사합니다.')
                  } catch (e) {
                    alert('삭제 실패: ' + (e?.message || e))
                  }
                }}
                style={{
                  width: '100%', padding: '11px', borderRadius: 10, cursor: 'pointer',
                  border: '1px solid rgba(239,68,68,0.4)',
                  background: 'rgba(239,68,68,0.1)',
                  color: '#ef4444', fontSize: 13, fontWeight: 700,
                }}
              >
                🗑 계정 삭제
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── 약관·정보 (제일 마지막에 배치) ── */}
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
          오구톡 v1.2.1 · 주식회사 지성엔테크
        </div>
      </SettingSection>
    </div>
  )
}
