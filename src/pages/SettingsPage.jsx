import { useState, useEffect } from 'react'
import GlassCard from '../components/common/GlassCard'
import Toggle from '../components/common/Toggle'
import ShareButton from '../components/common/ShareButton'
import { OGU_TONES } from '../data/oguData'
import { gradients, S } from '../styles/theme'
import { IS_NATIVE, scheduleTestNotification, diagnoseOguAlarm, openUrl } from '../lib/capacitor'
import { supabase } from '../lib/supabase'
import AutoCheckinSection from '../components/settings/AutoCheckinSection'
import CalendarSection from '../components/settings/CalendarSection'
import ScoreGoalSection from '../components/settings/ScoreGoalSection'

const pad = n => String(n).padStart(2, '0')

function SettingSection({ title, children }) {
  return (
    <div style={{ marginBottom: 14, background: 'rgba(0,0,0,0.02)', borderRadius: 20, padding: 16, border: '1px solid rgba(0,0,0,0.035)' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#3A3A3E', marginBottom: 12 }}>{title}</div>
      {children}
    </div>
  )
}

function SettingRow({ icon, label, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.025)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
        <span style={{ color: '#111111', fontSize: 13 }}>{label}</span>
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
  todoPct = 0,
  autoCheckin = false, setAutoCheckin,
  calendarSync = false, setCalendarSync,
  lifeStage = null, setLifeStage,
  produceTarget = 120, setProduceTarget,
  consumeLimit = 120, setConsumeLimit,
  onTabChange,
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
            <div style={{ color: '#111111', fontWeight: 700, fontSize: 15 }}>{isLoggedIn ? displayEmail : '비로그인 사용자'}</div>
            <div style={{ color: '#9A9AA0', fontSize: 12, marginTop: 2 }}>{isLoggedIn ? '✨ 로그인 회원 — 탭하면 계정 메뉴' : '🔓 비로그인 — 기본 기능만 사용 가능'}</div>
          </div>
          {!isLoggedIn && <button style={S.loginBtn} onClick={(e) => { e.stopPropagation(); onLoginOpen() }}>로그인</button>}
          {isLoggedIn && (
            <span style={{ color: '#B0B0B6', fontSize: 16, transition: 'transform 0.15s', transform: profileMenuOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
              ▼
            </span>
          )}
        </div>

        {/* 로그인 사용자 — 펼침 메뉴 */}
        {isLoggedIn && profileMenuOpen && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.035)' }}>
            <button
              onClick={onSignOut}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)',
                color: '#D23B2E', fontSize: 13, fontWeight: 700,
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

      {/* 알람 설정은 알람 탭으로 옮겼다 (v1.14.0) — 알람에 관한 것은 한 곳에서 */}
      <button
        onClick={() => onTabChange?.('alarms')}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
          border: '1px solid #ECECEF', borderRadius: 20, padding: '14px 16px',
          background: '#FFFFFF', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 17 }}>⏰</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#111111' }}>알람 설정</span>
          <span style={{ display: 'block', fontSize: 12, color: '#9A9AA0', marginTop: 2 }}>
            시간대 · 알림음 · 진동 · 커스텀 알람
          </span>
        </span>
        <span style={{ fontSize: 16, color: '#C7C7CC' }}>›</span>
      </button>


      <div style={{ fontSize: 12, fontWeight: 800, color: '#9A9AA0', margin: '18px 4px 8px' }}>
        기록과 연동 <span style={{ fontWeight: 600, color: '#B0B0B6' }}>· 안드로이드 전용</span>
      </div>
      <AutoCheckinSection enabled={autoCheckin} onChange={setAutoCheckin} />

      <CalendarSection enabled={calendarSync} onChange={setCalendarSync} />

      <div style={{ fontSize: 12, fontWeight: 800, color: '#9A9AA0', margin: '18px 4px 8px' }}>
        오구 지수
      </div>

      <ScoreGoalSection
        produceTarget={produceTarget} setProduceTarget={setProduceTarget}
        consumeLimit={consumeLimit} setConsumeLimit={setConsumeLimit}
        lifeStage={lifeStage} setLifeStage={setLifeStage}
      />


      <div style={{ fontSize: 12, fontWeight: 800, color: '#9A9AA0', margin: '18px 4px 8px' }}>
        공유
      </div>
      {/* ── 카카오 공유 ── */}
      <div style={{ marginBottom: 14 }}>
        <ShareButton progress={todoPct} />
      </div>


      <div style={{ fontSize: 12, fontWeight: 800, color: '#9A9AA0', margin: '18px 4px 8px' }}>
        정보
      </div>
      {/* ── 약관·정보 (제일 마지막에 배치) ── */}
      <SettingSection title="ℹ️ 약관 및 정보">
        <button
          onClick={() => openUrl('https://ogutalk.vercel.app/privacy.html')}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
            border: '1px solid rgba(0,0,0,0.05)', background: 'rgba(0,0,0,0.02)',
            color: '#8E8E93', fontSize: 13, textAlign: 'left',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span>🔒 개인정보 처리방침</span>
          <span style={{ color: '#B0B0B6' }}>›</span>
        </button>
        <div style={{ color: '#B0B0B6', fontSize: 10, marginTop: 8, lineHeight: 1.6 }}>
          오구톡 v{__APP_VERSION__} · 주식회사 지성엔테크
        </div>
      </SettingSection>
      {/* ── 위험 영역 (접기 — 클릭하면 계정 삭제 버튼 노출) ── */}
      {isLoggedIn && (
        <div style={{
          marginTop: 16, padding: 14, borderRadius: 14,
          background: 'rgba(239,68,68,0.05)',
          border: '1px solid rgba(210,59,46,0.16)',
        }}>
          <div
            onClick={() => setDangerOpen(v => !v)}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              cursor: 'pointer', userSelect: 'none',
            }}
          >
            <div style={{ color: '#D23B2E', fontSize: 13, fontWeight: 700 }}>⚠️ 위험 영역</div>
            <span style={{
              color: '#D23B2E', fontSize: 14,
              transition: 'transform 0.15s',
              transform: dangerOpen ? 'rotate(180deg)' : 'rotate(0)',
            }}>▼</span>
          </div>

          {dangerOpen && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(210,59,46,0.16)' }}>
              <div style={{ color: '#8E8E93', fontSize: 11, lineHeight: 1.6, marginBottom: 12 }}>
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
                  background: 'rgba(210,59,46,0.07)',
                  color: '#D23B2E', fontSize: 13, fontWeight: 700,
                }}
              >
                🗑 계정 삭제
              </button>
            </div>
          )}
        </div>
      )}

    </div>
  )
}
