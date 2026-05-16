import { useState, useEffect } from 'react'
import Toggle from '../components/common/Toggle'
import { ALARM_TONES } from '../data/oguData'
import { PRESET_CATEGORIES } from '../data/quickAddPresets'
import { IS_NATIVE } from '../lib/capacitor'
import { S } from '../styles/theme'
import { playAlarmTone, unlockAudio } from '../hooks/useAlarm'
import { useUserPresets } from '../hooks/useUserPresets'

const pad = n => String(n).padStart(2, '0')

// 시간대에 따라 아이콘 자동 결정
const autoIcon = (hour) => {
  if (hour >= 5  && hour < 9)  return '🌅'
  if (hour >= 9  && hour < 12) return '☀️'
  if (hour >= 12 && hour < 14) return '🍱'
  if (hour >= 14 && hour < 18) return '☕'
  if (hour >= 18 && hour < 22) return '🌆'
  return '🌙'
}

// mp3 또는 웹 오디오 재생
const playTone = (tone, volume) => {
  if (tone === 'mobile-mp3') {
    new Audio('/sounds/ogu_custom.mp3').play().catch(() => {})
  } else {
    unlockAudio()
    playAlarmTone(tone, volume)
  }
}

function Section({ title, children }) {
  return (
    <div style={{
      marginBottom: 14,
      background: 'rgba(255,255,255,0.03)',
      borderRadius: 20, padding: 16,
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

// 알람음 선택 — 모바일(mp3)과 웹(ALARM_TONES) 구분
function TonePicker({ value, onChange, volume = 0.8 }) {
  return (
    <div>
      <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 10 }}>알람음 (탭하면 미리 들어요)</div>

      {/* 모바일용 */}
      <div style={{ color: '#fb923c', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>📱 모바일 알람음 (mp3)</div>
      <button
        onClick={() => { onChange('mobile-mp3'); new Audio('/sounds/ogu_custom.mp3').play().catch(() => {}) }}
        style={{
          width: '100%', padding: '9px 12px', borderRadius: 12, marginBottom: 12,
          border: `1px solid ${value === 'mobile-mp3' ? '#fb923c' : 'rgba(255,255,255,0.08)'}`,
          background: value === 'mobile-mp3' ? 'rgba(251,146,60,0.15)' : 'rgba(255,255,255,0.03)',
          color: value === 'mobile-mp3' ? '#fb923c' : '#94a3b8',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 20 }}>📳</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>오구 커스텀음</div>
          <div style={{ fontSize: 9, opacity: 0.65, marginTop: 1 }}>앱 설치 시 mp3 파일로 재생</div>
        </div>
      </button>

      {/* 웹용 */}
      <div style={{ color: '#818cf8', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>🌐 웹 알람음</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
        {Object.entries(ALARM_TONES).map(([key, t]) => {
          const active = value === key
          return (
            <button key={key}
              onClick={() => { onChange(key); playTone(key, volume) }}
              style={{
                padding: '9px 10px', borderRadius: 12,
                border: `1px solid ${active ? t.color : 'rgba(255,255,255,0.08)'}`,
                background: active ? `${t.color}22` : 'rgba(255,255,255,0.03)',
                color: active ? t.color : '#94a3b8',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
              }}
            >
              <span style={{ fontSize: 18 }}>{t.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>{t.label}</div>
                <div style={{ fontSize: 9, opacity: 0.65, marginTop: 1 }}>{t.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AlarmsPage({
  alarmMode    = 'both',
  vibStrength  = 'medium',
  volume       = 0.8,
  customAlarms = [],
  onAddAlarm,
  onToggleAlarm,
  onDeleteAlarm,
}) {
  const addAlarm    = onAddAlarm
  const toggleAlarm = onToggleAlarm
  const deleteAlarm = onDeleteAlarm

  const [showAddForm, setShowAddForm] = useState(false)
  const [formTitle,   setFormTitle]   = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formHour,    setFormHour]    = useState('08')
  const [formMinute,  setFormMinute]  = useState('00')
  const [formTone,    setFormTone]    = useState(IS_NATIVE ? 'mobile-mp3' : '딩동')
  const [saveAsPreset, setSaveAsPreset] = useState(false)

  // 빠른 추가 시간 편집 모달 상태
  const [quickEdit,       setQuickEdit]       = useState(null)
  const [quickEditHour,   setQuickEditHour]   = useState('00')
  const [quickEditMinute, setQuickEditMinute] = useState('00')

  // 사용자 정의 프리셋 (localStorage)
  const { userPresets, saveUserPreset, deleteUserPreset } = useUserPresets()

  // 빠른 추가 카드 탭 시 디폴트 시·분 채우기
  useEffect(() => {
    if (quickEdit) {
      setQuickEditHour(pad(quickEdit.hour))
      setQuickEditMinute(pad(quickEdit.minute))
    }
  }, [quickEdit])

  const resetForm = () => {
    setFormTitle(''); setFormMessage('')
    setFormHour('08'); setFormMinute('00')
    setFormTone(IS_NATIVE ? 'mobile-mp3' : '딩동')
    setSaveAsPreset(false)
  }

  // 빠른 추가 모달에서 "추가" 누름 → 실제 알람 등록
  const confirmQuickAdd = () => {
    const hour   = Number(quickEditHour)
    const minute = Number(quickEditMinute)
    addAlarm({
      icon:       quickEdit.icon,
      title:      quickEdit.title,
      message:    quickEdit.message,
      hour, minute,
      repeatType: 'daily',
      tone:       IS_NATIVE ? 'mobile-mp3' : '딩동',
      repeat:     1,
    })
    setQuickEdit(null)
  }

  const handleAddCustom = () => {
    if (!formTitle.trim()) return
    const hour   = Number(formHour)
    const minute = Number(formMinute)
    addAlarm({
      icon: autoIcon(hour),
      title: formTitle.trim(),
      message: formMessage.trim(),
      hour, minute,
      repeatType: 'daily',
      tone: formTone,
      repeat: 1,
    })
    // 체크박스 켜져있으면 빠른 추가에도 저장
    if (saveAsPreset) {
      saveUserPreset({
        icon:    autoIcon(hour),
        title:   formTitle.trim(),
        message: formMessage.trim(),
        hour, minute,
      })
    }
    resetForm()
    setShowAddForm(false)
  }

  return (
    <div>
      <div style={{
        marginBottom: 14, padding: '10px 14px', borderRadius: 12,
        background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)',
        color: '#94a3b8', fontSize: 11, lineHeight: 1.6,
      }}>
        💡 매시 59분 오구톡 알람 설정은 <b style={{ color: '#818cf8' }}>설정 탭</b>에서 변경할 수 있어요.
      </div>

      <Section title="➕ 커스텀 알람">
        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 14, lineHeight: 1.6 }}>
          원하는 시간에 매일 반복 알람을 추가하세요.
        </div>

        {/* ── 등록된 알람 목록 ── */}
        {customAlarms.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
              📋 등록된 알람 ({customAlarms.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {customAlarms.map(alarm => {
                const isMp3 = alarm.tone === 'mobile-mp3'
                const toneInfo = isMp3 ? { emoji: '📳', label: '커스텀음', color: '#fb923c' } : (ALARM_TONES[alarm.tone] || ALARM_TONES['딩동'])
                const repeatCount = alarm.repeat || 1
                return (
                  <div key={alarm.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', borderRadius: 14,
                    background: alarm.isEnabled ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${alarm.isEnabled ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <span style={{ fontSize: 20 }}>{alarm.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: alarm.isEnabled ? '#e2e8f0' : '#64748b', fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {alarm.title}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2, display: 'flex', gap: 6, alignItems: 'center' }}>
                        <span>{pad(alarm.hour)}:{pad(alarm.minute)}</span>
                        <span>·</span>
                        <button onClick={() => playTone(alarm.tone || '딩동', volume)} style={{
                          padding: 0, border: 'none', background: 'transparent',
                          color: toneInfo.color, fontSize: 10, cursor: 'pointer',
                        }}>
                          {toneInfo.emoji} {toneInfo.label} ▶
                        </button>
                        {repeatCount > 1 && (
                          <span style={{ color: '#475569' }}>× {repeatCount}</span>
                        )}
                      </div>
                    </div>
                    <Toggle on={alarm.isEnabled} onToggle={() => toggleAlarm(alarm.id)} />
                    <button onClick={() => deleteAlarm(alarm.id)} style={{
                      width: 28, height: 28, borderRadius: 8, border: 'none',
                      background: 'rgba(239,68,68,0.1)', color: '#ef4444',
                      fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 직접 추가하기 ── */}
        {!showAddForm ? (
          <button onClick={() => setShowAddForm(true)} style={{
            width: '100%', padding: '11px', borderRadius: 12, marginBottom: 14,
            border: '1px dashed rgba(99,102,241,0.35)', background: 'transparent',
            color: '#818cf8', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>+ 직접 추가하기</button>
        ) : (
          <div style={{ padding: 14, borderRadius: 14, marginBottom: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>🔔 새 알람 추가</div>

            {/* 알람 제목 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>알람 제목 *</div>
              <input type="text" placeholder="예: 물 마시기" maxLength={20}
                value={formTitle} onChange={e => setFormTitle(e.target.value)}
                style={{ ...S.input, marginTop: 0 }}
              />
            </div>

            {/* 메시지 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>메시지 (선택)</div>
              <input type="text" placeholder="알람 메시지를 입력하세요" maxLength={40}
                value={formMessage} onChange={e => setFormMessage(e.target.value)}
                style={{ ...S.input, marginTop: 0 }}
              />
            </div>

            {/* 시간 */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>시간</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={formHour} onChange={e => setFormHour(e.target.value)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontWeight: 700,
                }}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={pad(i)}>{pad(i)}시</option>
                  ))}
                </select>
                <select value={formMinute} onChange={e => setFormMinute(e.target.value)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, fontWeight: 700,
                }}>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={pad(i * 5)}>{pad(i * 5)}분</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 알람음 — 폰에서는 mp3 고정이라 선택 UI 숨김 */}
            {!IS_NATIVE && (
              <div style={{ marginBottom: 14 }}>
                <TonePicker value={formTone} onChange={setFormTone} volume={volume} />
              </div>
            )}
            {IS_NATIVE && (
              <div style={{
                marginBottom: 14, padding: '10px 12px', borderRadius: 10,
                background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)',
                color: '#fb923c', fontSize: 11,
              }}>
                📳 알람음: <b>오구 커스텀음</b> (mp3 자동 적용)
              </div>
            )}

            {/* 빠른 추가에도 저장 옵션 */}
            <label style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)',
              color: '#94a3b8', fontSize: 12, cursor: 'pointer',
            }}>
              <input type="checkbox" checked={saveAsPreset}
                onChange={e => setSaveAsPreset(e.target.checked)}
                style={{ accentColor: '#fbbf24', width: 16, height: 16 }} />
              <span>⭐ 이 알람을 <b style={{ color: '#fbbf24' }}>빠른 추가에도 저장</b></span>
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowAddForm(false); resetForm() }} style={{ ...S.ghostBtn, flex: 1 }}>취소</button>
              <button onClick={handleAddCustom} disabled={!formTitle.trim()}
                style={{ ...S.primaryBtn, flex: 1, opacity: formTitle.trim() ? 1 : 0.4 }}>추가</button>
            </div>
          </div>
        )}

        {/* ── 빠른 추가 (카테고리별) ── */}
        <div>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, marginBottom: 10 }}>⚡ 빠른 추가</div>

          {PRESET_CATEGORIES.map(cat => (
            <div key={cat.key} style={{ marginBottom: 14 }}>
              <div style={{ color: cat.color, fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{cat.label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {cat.items.map((p, i) => (
                  <PresetCard key={i} preset={p} color={cat.color}
                    onClick={() => setQuickEdit(p)} />
                ))}
              </div>
            </div>
          ))}

          {/* 사용자 정의 프리셋 */}
          {userPresets.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#fbbf24', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>⭐ 내 빠른 추가</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {userPresets.map(p => (
                  <PresetCard key={p.id} preset={p} color="#fbbf24"
                    onClick={() => setQuickEdit(p)}
                    onDelete={() => deleteUserPreset(p.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* ── 빠른 추가 시간 편집 모달 (바텀시트) ── */}
      {quickEdit && (
        <div onClick={() => setQuickEdit(null)} style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.65)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width: '100%', maxWidth: 420,
            background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '24px 24px 0 0',
            padding: '24px 22px 28px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 40, height: 4, borderRadius: 2,
              background: 'rgba(255,255,255,0.15)',
              margin: '0 auto 18px',
            }} />
            <div style={{ fontSize: 18, fontWeight: 800, color: '#e2e8f0', marginBottom: 4, textAlign: 'center' }}>
              {quickEdit.icon} {quickEdit.title}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20, textAlign: 'center' }}>
              {quickEdit.message}
            </div>
            <div style={{ color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>알람 시간</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <select value={quickEditHour} onChange={e => setQuickEditHour(e.target.value)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1e293b', color: '#e2e8f0', fontSize: 16, fontWeight: 700,
              }}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={pad(i)}>{pad(i)}시</option>
                ))}
              </select>
              <select value={quickEditMinute} onChange={e => setQuickEditMinute(e.target.value)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#1e293b', color: '#e2e8f0', fontSize: 16, fontWeight: 700,
              }}>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={pad(i * 5)}>{pad(i * 5)}분</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setQuickEdit(null)} style={{ ...S.ghostBtn, flex: 1 }}>취소</button>
              <button onClick={confirmQuickAdd} style={{ ...S.primaryBtn, flex: 1 }}>추가</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── 빠른 추가 카드 컴포넌트 ─────────────────────────────────────
function PresetCard({ preset, color, onClick, onDelete }) {
  return (
    <button onClick={onClick} style={{
      padding: '10px 12px', borderRadius: 12, textAlign: 'left',
      border: `1px solid ${color}55`,
      background: `${color}12`,
      color: '#e2e8f0', cursor: 'pointer', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{ fontSize: 12, fontWeight: 700 }}>
        {preset.icon} {preset.title.length > 8 ? preset.title.slice(0, 8) + '…' : preset.title}
      </span>
      <span style={{ fontSize: 10, color, fontWeight: 600 }}>
        🕐 {pad(preset.hour)}:{pad(preset.minute)}
      </span>
      {onDelete && (
        <span onClick={(e) => { e.stopPropagation(); onDelete() }}
          style={{
            position: 'absolute', top: 4, right: 6,
            width: 18, height: 18, borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, color: '#94a3b8',
            background: 'rgba(0,0,0,0.3)',
          }}>✕</span>
      )}
    </button>
  )
}
