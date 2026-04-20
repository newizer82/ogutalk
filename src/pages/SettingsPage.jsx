import GlassCard from '../components/common/GlassCard'
import Toggle from '../components/common/Toggle'
import { OGU_TONES, VOICE_CHARACTERS } from '../data/oguData'
import { gradients, S } from '../styles/theme'

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
  voiceChar, setVoiceChar, voiceEnabled, setVoiceEnabled,
  alarmMode, setAlarmMode, alarmHours, setAlarmHours,
  immersionAlerts, setImmersionAlerts,
  immersionSec, onResetImmersion, onTestAlarm,
  todos = [], goals = {}, userKeywords = [],
  onLoginOpen, onSignOut,
  playSound, speakTimePreview,
}) {
  const immMins = Math.floor(immersionSec / 60)
  const immSecs = Math.floor(immersionSec % 60)

  const fireSignal = (tone, repeat) => {
    if (alarmMode !== 'vibrate') playSound(tone, repeat)
    if (alarmMode !== 'sound' && navigator.vibrate) {
      const pat = []; for (let i = 0; i < repeat; i++) { pat.push(250, 120) }; pat.push(400)
      navigator.vibrate(pat)
    }
  }

  // 백업 내보내기
  const exportBackup = () => {
    const data = JSON.stringify({ version: 3, exportedAt: new Date().toISOString(), todos, goals, userKeywords, alarmHours, oguTone, oguRepeat, voiceChar, voiceEnabled, alarmMode, immersionAlerts }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    const d    = new Date(); a.download = `ogutalk-backup-${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}.json`
    a.click(); URL.revokeObjectURL(url)
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
            <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>{isPremium ? '✨ 프리미엄 플랜' : '🔓 무료 플랜'}</div>
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

      {!isPremium && (
        <GlassCard style={{ marginBottom: 16, background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ color: '#e2e8f0', fontWeight: 700, marginBottom: 4 }}>✨ 프리미엄 업그레이드</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>할일·목표·키워드·다양한 오구 목소리 잠금 해제</div>
          <button style={{ ...S.primaryBtn, fontSize: 13, padding: '10px 20px', width: 'auto' }} onClick={() => setIsPremium(true)}>
            월 2,900원으로 시작
          </button>
        </GlassCard>
      )}

      {/* ── 알람 출력 방식 ── */}
      <SettingSection title="🔔 알람 출력 방식">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
          {[
            { id: 'sound',   emoji: '🔊', label: '알람음만',  desc: '소리로만' },
            { id: 'vibrate', emoji: '📳', label: '진동만',    desc: '무음 진동' },
            { id: 'both',    emoji: '🔔', label: '소리+진동', desc: '모두 사용' },
          ].map(m => (
            <button key={m.id} onClick={() => setAlarmMode(m.id)} style={{
              padding: '10px 4px', borderRadius: 14, textAlign: 'center', cursor: 'pointer',
              border: `1px solid ${alarmMode === m.id ? '#818cf8' : 'rgba(255,255,255,0.08)'}`,
              background: alarmMode === m.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              color: alarmMode === m.id ? '#818cf8' : '#94a3b8',
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{m.emoji}</div>
              <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
              <div style={{ fontSize: 9, opacity: 0.55, marginTop: 2 }}>{m.desc}</div>
            </button>
          ))}
        </div>
        <SettingRow label="알람 소리" icon="🔊">
          <Toggle on={alarmMode !== 'vibrate'} onToggle={() => setAlarmMode(alarmMode === 'vibrate' ? 'both' : 'vibrate')} />
        </SettingRow>
        <SettingRow label="진동" icon="📳">
          <Toggle on={alarmMode !== 'sound'} onToggle={() => setAlarmMode(alarmMode === 'sound' ? 'both' : 'sound')} />
        </SettingRow>
      </SettingSection>

      {/* ── 몰입 시간 경고 ── */}
      <SettingSection title="⏱️ 몰입 시간 경고 알람">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
          스마트폰을 일정 시간 이상 사용하면 경고 알람이 울립니다.<br />
          오구 알람이 울리면 몰입 시간이 자동으로 초기화됩니다.
        </div>
        <SettingRow label="30분 경고" icon="🟡">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: immersionAlerts.m30 ? '#f59e0b' : '#475569', fontSize: 11, fontWeight: 700 }}>30분</span>
            <Toggle on={immersionAlerts.m30} color="#f59e0b"
              onToggle={() => setImmersionAlerts({ ...immersionAlerts, m30: !immersionAlerts.m30 })} />
          </div>
        </SettingRow>
        <SettingRow label="1시간 경고" icon="🔴">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: immersionAlerts.m60 ? '#ef4444' : '#475569', fontSize: 11, fontWeight: 700 }}>60분</span>
            <Toggle on={immersionAlerts.m60} color="#ef4444"
              onToggle={() => setImmersionAlerts({ ...immersionAlerts, m60: !immersionAlerts.m60 })} />
          </div>
        </SettingRow>
        {/* 현재 몰입 시간 */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginTop: 12, padding: '10px 14px', borderRadius: 12,
          background: immMins >= 60 ? 'rgba(239,68,68,0.08)' : immMins >= 30 ? 'rgba(245,158,11,0.08)' : 'rgba(52,211,153,0.06)',
          border: `1px solid ${immMins >= 60 ? 'rgba(239,68,68,0.2)' : immMins >= 30 ? 'rgba(245,158,11,0.2)' : 'rgba(52,211,153,0.15)'}`,
        }}>
          <div>
            <div style={{ color: '#94a3b8', fontSize: 10 }}>현재 몰입 시간</div>
            <div style={{ color: immMins >= 60 ? '#ef4444' : immMins >= 30 ? '#f59e0b' : '#34d399', fontSize: 24, fontWeight: 900, marginTop: 2 }}>
              {pad(immMins)}:{pad(immSecs)}
            </div>
          </div>
          <button style={{ padding: '8px 14px', borderRadius: 10, border: 'none', background: 'rgba(99,102,241,0.2)', color: '#818cf8', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            onClick={onResetImmersion}>🔄 리셋</button>
        </div>
      </SettingSection>

      {/* ── 오구 사운드 톤 ── */}
      <SettingSection title="🎵 오구 사운드 톤">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {Object.entries(OGU_TONES).map(([key, t]) => (
            <button key={key} onClick={() => { setOguTone(key); fireSignal(key, oguRepeat) }} style={{
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
        <SettingRow label="오구 반복 횟수" icon="🔁">
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2, 3].map(n => (
              <button key={n} onClick={() => { setOguRepeat(n); fireSignal(oguTone, n) }} style={{
                width: 36, height: 36, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                border: `1px solid ${oguRepeat === n ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                background: oguRepeat === n ? 'rgba(99,102,241,0.25)' : 'transparent',
                color: oguRepeat === n ? '#818cf8' : '#64748b',
              }}>{n}회</button>
            ))}
          </div>
        </SettingRow>
      </SettingSection>

      {/* ── 시간 안내 목소리 ── */}
      <SettingSection title={
        <span>🗣️ 시간 안내 목소리 {!isPremium && <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 6, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: 'white', marginLeft: 6 }}>PRO</span>}</span>
      }>
        <SettingRow label="음성 안내 사용" icon="💬">
          <Toggle on={voiceEnabled} onToggle={() => setVoiceEnabled(!voiceEnabled)} />
        </SettingRow>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
          {VOICE_CHARACTERS.map(vc => {
            const locked   = vc.premium && !isPremium
            const selected = voiceChar === vc.id
            return (
              <button key={vc.id} onClick={() => { if (locked) return; setVoiceChar(vc.id); if (voiceEnabled) speakTimePreview() }} style={{
                padding: '10px 8px', borderRadius: 12, textAlign: 'center', position: 'relative',
                border: `1px solid ${selected ? '#818cf8' : 'rgba(255,255,255,0.08)'}`,
                background: selected ? 'rgba(99,102,241,0.2)' : locked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                color: locked ? '#475569' : selected ? '#818cf8' : '#94a3b8',
                cursor: locked ? 'not-allowed' : 'pointer', opacity: locked ? 0.6 : 1,
              }}>
                <div style={{ fontSize: 22, marginBottom: 2 }}>{vc.emoji}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{vc.name}</div>
                {locked && <div style={{ position: 'absolute', top: 4, right: 4, fontSize: 9 }}>🔒</div>}
              </button>
            )
          })}
        </div>
        {isPremium && (
          <button style={{ ...S.ghostBtn, width: '100%', marginTop: 10, color: '#818cf8' }} onClick={speakTimePreview}>
            ▶ 목소리 미리듣기
          </button>
        )}
      </SettingSection>

      {/* ── 알람 시간 설정 ── */}
      <SettingSection title="⏰ 알람 시간 설정">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12 }}>선택한 시간의 59분에 알람이 울립니다</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 5 }}>
          {Array.from({ length: 24 }, (_, i) => i).map(h => (
            <button key={h} onClick={() => setAlarmHours({ ...alarmHours, [h]: !alarmHours[h] })} style={{
              padding: '7px 2px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${alarmHours[h] ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
              background: alarmHours[h] ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
              color: alarmHours[h] ? '#818cf8' : '#64748b',
            }}>{pad(h)}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button style={S.ghostBtn} onClick={() => { const h = {}; for (let i = 7; i <= 22; i++) h[i] = true; setAlarmHours(h) }}>주간</button>
          <button style={S.ghostBtn} onClick={() => { const h = {}; for (let i = 0; i < 24; i++) h[i] = true; setAlarmHours(h) }}>전체</button>
          <button style={S.ghostBtn} onClick={() => setAlarmHours({})}>초기화</button>
        </div>
      </SettingSection>

      {/* ── 알람 테스트 ── */}
      <SettingSection title="🔔 알람 테스트">
        <button style={S.primaryBtn} onClick={onTestAlarm}>오구 테스트 재생</button>
        <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 8 }}>버튼을 누르면 알람 팝업이 즉시 실행됩니다</div>
      </SettingSection>

      {/* ── 기능 활성화 (프리미엄) ── */}
      {isPremium && (
        <SettingSection title="🛠️ 기능 활성화">
          {[
            { key: 'todos',          icon: '✅', label: '할일 관리' },
            { key: 'goals',          icon: '🎯', label: '목표 관리' },
            { key: 'keywords',       icon: '📈', label: '키워드 & 주식' },
            { key: 'scheduleAlerts', icon: '🕐', label: '스케줄 알림 (준비중)' },
          ].map(f => (
            <SettingRow key={f.key} label={f.label} icon={f.icon}>
              <Toggle on={premiumFeatures[f.key]} onToggle={() => setPremiumFeatures({ ...premiumFeatures, [f.key]: !premiumFeatures[f.key] })} />
            </SettingRow>
          ))}
        </SettingSection>
      )}

      {/* ── 데이터 백업 & 복원 ── */}
      <SettingSection title="💾 데이터 백업 & 복원">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 14, lineHeight: 1.6 }}>
          설정·할일·목표·키워드를 JSON 파일로 저장하고,<br />다른 기기에서 복원해 동일한 환경을 만들 수 있습니다.
        </div>
        <button style={{ ...S.primaryBtn, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={exportBackup}>
          📤 백업 내보내기 (JSON 다운로드)
        </button>
        <label style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(99,102,241,0.08)', boxSizing: 'border-box' }}>
          📥 백업 불러오기 (복원)
          <input type="file" accept=".json" style={{ display: 'none' }} />
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
          {[
            { label: '할일',    value: `${todos.length}개`,                              icon: '✅' },
            { label: '목표',    value: `${Object.values(goals).flat().length}개`,        icon: '🎯' },
            { label: '키워드',  value: `${userKeywords.length}개`,                       icon: '📌' },
            { label: '알람',    value: `${Object.values(alarmHours).filter(Boolean).length}시간대`, icon: '⏰' },
          ].map(item => (
            <div key={item.label} style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#475569', fontSize: 10 }}>{item.icon} {item.label}</div>
              <div style={{ color: '#818cf8', fontSize: 14, fontWeight: 800, marginTop: 2 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </SettingSection>

      {isLoggedIn && (
        <button style={{ ...S.ghostBtn, width: '100%', marginTop: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
          onClick={onSignOut}>로그아웃</button>
      )}
    </div>
  )
}
