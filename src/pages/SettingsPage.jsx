import { useState } from 'react'
import GlassCard from '../components/common/GlassCard'
import Toggle from '../components/common/Toggle'
import { OGU_TONES } from '../data/oguData'
import { gradients, S } from '../styles/theme'
import { IS_NATIVE } from '../lib/capacitor'
import { useCustomAlarms } from '../hooks/useCustomAlarms'

// 프리셋 알람 템플릿
const PRESETS = [
  { icon: '📈', title: '경제 뉴스 브리핑',  message: '오늘의 경제 뉴스를 확인하세요!', hour: 8,  minute: 0  },
  { icon: '🧘', title: '온몸 스트레칭',      message: '10분 스트레칭으로 몸을 깨워요!', hour: 10, minute: 0  },
  { icon: '🍱', title: '점심 시간',          message: '맛있는 점심 드세요!',             hour: 12, minute: 0  },
  { icon: '☕', title: '오후 집중 리셋',      message: '잠깐 쉬고 다시 시작해요!',       hour: 15, minute: 0  },
  { icon: '📝', title: '하루 마무리 정리',   message: '오늘 하루를 되돌아봐요.',         hour: 22, minute: 0  },
]

const ICON_OPTIONS = ['🔔','📈','🧘','🍱','☕','📝','💊','💧','🏃','📖','🎯','💡','🌙','⚡','🎵']

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
  alarmMode, setAlarmMode,
  volume = 0.8, setVolume,
  vibStrength = 'medium', setVibStrength,
  alarmHours = {}, setAlarmHours,
  immersionAlerts, setImmersionAlerts,
  immersionSec, onResetImmersion, onTestAlarm,
  onLoginOpen, onSignOut,
  playSound,
  userId = null,
}) {
  const immMins = Math.floor(immersionSec / 60)
  const immSecs = Math.floor(immersionSec % 60)

  // 커스텀 알람
  const { alarms: customAlarms, addAlarm, toggleAlarm, deleteAlarm } = useCustomAlarms()
  const [showAddForm, setShowAddForm] = useState(false)
  const [formIcon,    setFormIcon]    = useState('🔔')
  const [formTitle,   setFormTitle]   = useState('')
  const [formHour,    setFormHour]    = useState('08')
  const [formMinute,  setFormMinute]  = useState('00')
  const [formMessage, setFormMessage] = useState('')
  const [showIconPicker, setShowIconPicker] = useState(false)

  const resetForm = () => {
    setFormIcon('🔔'); setFormTitle(''); setFormHour('08')
    setFormMinute('00'); setFormMessage(''); setShowIconPicker(false)
  }

  const handleAddPreset = (preset) => {
    addAlarm({ ...preset, repeatType: 'daily' })
  }

  const handleAddCustom = () => {
    if (!formTitle.trim()) return
    addAlarm({
      icon: formIcon,
      title: formTitle.trim(),
      message: formMessage.trim(),
      hour: Number(formHour),
      minute: Number(formMinute),
      repeatType: 'daily',
    })
    resetForm()
    setShowAddForm(false)
  }

  const fireSignal = (tone, repeat) => {
    if (alarmMode !== 'vibrate') playSound(tone, repeat, volume)
    if (alarmMode !== 'sound' && navigator.vibrate) {
      const pats = { weak: [80,60,80], medium: [250,120,250], strong: [400,150,400,150,600] }
      navigator.vibrate(pats[vibStrength] || pats.medium)
    }
  }

  // 백업 내보내기 (알람 설정만)
  const exportBackup = () => {
    const data = JSON.stringify({ version: 4, exportedAt: new Date().toISOString(), alarmHours, oguTone, oguRepeat, alarmMode, immersionAlerts }, null, 2)
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

        {/* 볼륨 슬라이더 */}
        {alarmMode !== 'vibrate' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ color: '#e2e8f0', fontSize: 13 }}>🔊 소리 크기</span>
              <span style={{ color: '#818cf8', fontSize: 13, fontWeight: 700 }}>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="1" step="0.05"
              value={volume}
              onChange={e => setVolume(parseFloat(e.target.value))}
              onMouseUp={() => playSound(oguTone, 1, volume)}
              onTouchEnd={() => playSound(oguTone, 1, volume)}
              style={{ width: '100%', accentColor: '#6366f1', height: 4, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: 10, marginTop: 4 }}>
              <span>🔇 작게</span><span>🔊 크게</span>
            </div>
          </div>
        )}

        {/* 진동 세기 */}
        {alarmMode !== 'sound' && (
          <div style={{ marginTop: 14 }}>
            <div style={{ color: '#e2e8f0', fontSize: 13, marginBottom: 8 }}>📳 진동 세기</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { id: 'weak',   label: '약하게', desc: '짧고 부드럽게' },
                { id: 'medium', label: '보통',   desc: '기본 진동' },
                { id: 'strong', label: '강하게', desc: '길고 강하게' },
              ].map(v => (
                <button key={v.id} onClick={() => {
                  setVibStrength(v.id)
                  if (navigator.vibrate) {
                    const pats = { weak: [80,60,80], medium: [250,120,250], strong: [400,150,400,150,600] }
                    navigator.vibrate(pats[v.id])
                  }
                }} style={{
                  padding: '10px 4px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                  border: `1px solid ${vibStrength === v.id ? '#818cf8' : 'rgba(255,255,255,0.08)'}`,
                  background: vibStrength === v.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  color: vibStrength === v.id ? '#818cf8' : '#94a3b8',
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{v.label}</div>
                  <div style={{ fontSize: 9, opacity: 0.6, marginTop: 2 }}>{v.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}
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

      {/* ── 백그라운드 알람 안내 ── */}
      <SettingSection title="📱 백그라운드 알람">
        <div style={{ color: '#64748b', fontSize: 11, lineHeight: 1.7 }}>
          앱을 닫아도 아래 설정한 시간의 59분에 알람이 울립니다.<br />
          기기 알림 설정에서 오구톡 알림이 허용되어 있는지 확인하세요.
        </div>
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10,
          background: IS_NATIVE ? 'rgba(52,211,153,0.08)' : 'rgba(99,102,241,0.08)',
          border: `1px solid ${IS_NATIVE ? 'rgba(52,211,153,0.2)' : 'rgba(99,102,241,0.2)'}`,
        }}>
          <span style={{ color: IS_NATIVE ? '#34d399' : '#818cf8', fontSize: 12, fontWeight: 700 }}>
            {IS_NATIVE ? '🟢 Capacitor 로컬 알림 활성' : '🌐 브라우저 알림 모드 (앱 설치 시 백그라운드 알림 지원)'}
          </span>
        </div>
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

      {/* ── 커스텀 알람 ── */}
      <SettingSection title="➕ 커스텀 알람 설정">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
          원하는 시간에 알람을 추가하세요. 매일 반복됩니다.
        </div>

        {/* 프리셋 버튼 */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>⚡ 빠른 추가</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map((p, i) => {
              const already = customAlarms.some(a => a.title === p.title)
              return (
                <button key={i}
                  disabled={already}
                  onClick={() => handleAddPreset(p)}
                  style={{
                    padding: '6px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600,
                    cursor: already ? 'default' : 'pointer',
                    border: `1px solid ${already ? 'rgba(52,211,153,0.3)' : 'rgba(99,102,241,0.3)'}`,
                    background: already ? 'rgba(52,211,153,0.08)' : 'rgba(99,102,241,0.1)',
                    color: already ? '#34d399' : '#818cf8',
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                  {p.icon} {p.title.length > 8 ? p.title.slice(0, 8) + '…' : p.title}
                  {already && ' ✓'}
                </button>
              )
            })}
          </div>
        </div>

        {/* 등록된 커스텀 알람 목록 */}
        {customAlarms.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📋 등록된 알람 ({customAlarms.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {customAlarms.map(alarm => (
                <div key={alarm.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 12,
                  background: alarm.isEnabled ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${alarm.isEnabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
                }}>
                  <span style={{ fontSize: 18 }}>{alarm.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: alarm.isEnabled ? '#e2e8f0' : '#64748b', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {alarm.title}
                    </div>
                    <div style={{ color: '#64748b', fontSize: 10, marginTop: 1 }}>
                      {pad(alarm.hour)}:{pad(alarm.minute)} · 매일
                    </div>
                  </div>
                  <Toggle on={alarm.isEnabled} onToggle={() => toggleAlarm(alarm.id)} />
                  <button onClick={() => deleteAlarm(alarm.id)} style={{
                    width: 28, height: 28, borderRadius: 8, border: 'none',
                    background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                    fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 직접 추가 폼 */}
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} style={{
            width: '100%', padding: '11px', borderRadius: 12,
            border: '1px dashed rgba(99,102,241,0.35)', background: 'transparent',
            color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ 직접 추가하기</button>
        ) : (
          <div style={{ padding: 14, borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔔 새 알람 추가</div>

            {/* 아이콘 선택 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>아이콘</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setShowIconPicker(!showIconPicker)} style={{
                  width: 42, height: 42, borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)',
                  background: 'rgba(99,102,241,0.1)', fontSize: 22, cursor: 'pointer',
                }}>{formIcon}</button>
                {showIconPicker && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {ICON_OPTIONS.map(ic => (
                      <button key={ic} onClick={() => { setFormIcon(ic); setShowIconPicker(false) }} style={{
                        width: 32, height: 32, borderRadius: 8, border: `1px solid ${formIcon === ic ? '#818cf8' : 'rgba(255,255,255,0.1)'}`,
                        background: formIcon === ic ? 'rgba(99,102,241,0.2)' : 'transparent',
                        fontSize: 16, cursor: 'pointer',
                      }}>{ic}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 제목 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>알람 제목 *</div>
              <input
                type="text" placeholder="예: 물 마시기" maxLength={20}
                value={formTitle} onChange={e => setFormTitle(e.target.value)}
                style={{ ...S.input, marginTop: 0 }}
              />
            </div>

            {/* 시간 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>시간</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select value={formHour} onChange={e => setFormHour(e.target.value)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontWeight: 700,
                }}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2,'0')}>{pad(i)}시</option>
                  ))}
                </select>
                <select value={formMinute} onChange={e => setFormMinute(e.target.value)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontWeight: 700,
                }}>
                  {['00','05','10','15','20','25','30','35','40','45','50','55'].map(m => (
                    <option key={m} value={m}>{m}분</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 메시지 (선택) */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>메시지 (선택)</div>
              <input
                type="text" placeholder="알람 메시지를 입력하세요" maxLength={40}
                value={formMessage} onChange={e => setFormMessage(e.target.value)}
                style={{ ...S.input, marginTop: 0 }}
              />
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAddForm(false); resetForm() }} style={{ ...S.ghostBtn, flex: 1 }}>취소</button>
              <button
                onClick={handleAddCustom}
                disabled={!formTitle.trim()}
                style={{ ...S.primaryBtn, flex: 1, opacity: formTitle.trim() ? 1 : 0.4 }}
              >추가</button>
            </div>
          </div>
        )}
      </SettingSection>

      {/* ── 알람 테스트 ── */}
      <SettingSection title="🔔 알람 테스트">
        <button style={S.primaryBtn} onClick={onTestAlarm}>오구 테스트 재생</button>
        <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 8 }}>버튼을 누르면 알람 팝업이 즉시 실행됩니다</div>
      </SettingSection>

      {/* ── 데이터 백업 & 복원 ── */}
      <SettingSection title="💾 설정 백업 & 복원">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 14, lineHeight: 1.6 }}>
          알람 설정을 JSON 파일로 저장하고,<br />다른 기기에서 복원해 동일한 환경을 만들 수 있습니다.
        </div>
        <button style={{ ...S.primaryBtn, marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={exportBackup}>
          📤 백업 내보내기 (JSON 다운로드)
        </button>
        <label style={{ width: '100%', padding: '13px', borderRadius: 14, border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(99,102,241,0.08)', boxSizing: 'border-box' }}>
          📥 백업 불러오기 (복원)
          <input type="file" accept=".json" style={{ display: 'none' }} />
        </label>
      </SettingSection>

      {isLoggedIn && (
        <button style={{ ...S.ghostBtn, width: '100%', marginTop: 8, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}
          onClick={onSignOut}>로그아웃</button>
      )}
    </div>
  )
}
