import { useAlarmSoundSettings } from '../../hooks/useAlarmSoundSettings'
import { theme, gradients } from '../../styles/theme'

const styles = {
  section: {
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: '16px',
    marginBottom: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
    marginBottom: 16,
  },
  row: {
    marginBottom: 16,
  },
  label: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    color: theme.text.primary,
  },
  valueText: {
    fontSize: 14,
    fontWeight: 700,
    color: theme.accent.secondary,
    minWidth: 36,
    textAlign: 'right',
  },
  slider: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    appearance: 'none',
    background: theme.bg.elevated,
    outline: 'none',
    cursor: 'pointer',
  },
  countRow: {
    display: 'flex',
    gap: 8,
  },
  countBtn: (active) => ({
    flex: 1,
    padding: '10px 0',
    borderRadius: 10,
    border: 'none',
    background: active ? gradients.button : theme.bg.elevated,
    color: active ? '#fff' : theme.text.muted,
    fontSize: 14,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    transition: 'all 0.15s',
  }),
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontSize: 14,
    color: theme.text.primary,
  },
  toggleSub: {
    fontSize: 11,
    color: theme.text.muted,
    marginTop: 2,
  },
  toggle: (on) => ({
    width: 44,
    height: 26,
    borderRadius: 13,
    background: on ? theme.accent.primary : theme.bg.elevated,
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  knob: (on) => ({
    position: 'absolute',
    top: 3,
    left: on ? 21 : 3,
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
  }),
  divider: {
    height: 1,
    background: theme.bg.elevated,
    margin: '12px 0',
  },
}

export default function AlarmSoundSettings() {
  const { settings, updateSettings } = useAlarmSoundSettings()

  return (
    <div style={styles.section}>
      <p style={styles.title}>🔊 알람 사운드 설정</p>

      {/* 알림음 길이 슬라이더 */}
      <div style={styles.row}>
        <div style={styles.label}>
          <span style={styles.labelText}>알림음 길이</span>
          <span style={styles.valueText}>{settings.soundDuration}초</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={settings.soundDuration}
          onChange={e => updateSettings({ soundDuration: Number(e.target.value) })}
          style={styles.slider}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: theme.text.muted }}>1초</span>
          <span style={{ fontSize: 10, color: theme.text.muted }}>10초</span>
        </div>
      </div>

      <div style={styles.divider} />

      {/* 반복 횟수 */}
      <div style={styles.row}>
        <div style={styles.label}>
          <span style={styles.labelText}>반복 횟수</span>
          <span style={styles.valueText}>{settings.repeatCount}회</span>
        </div>
        <div style={styles.countRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              style={styles.countBtn(settings.repeatCount === n)}
              onClick={() => updateSettings({ repeatCount: n })}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.divider} />

      {/* 시간 음성 알림 토글 */}
      <div style={styles.toggleRow}>
        <div>
          <div style={styles.toggleLabel}>시간 음성 알림</div>
          <div style={styles.toggleSub}>
            {settings.announceHour
              ? `알람 시 "X시"를 음성으로 알려줍니다`
              : '음성 알림 꺼짐'}
          </div>
        </div>
        <button
          style={styles.toggle(settings.announceHour)}
          onClick={() => updateSettings({ announceHour: !settings.announceHour })}
        >
          <div style={styles.knob(settings.announceHour)} />
        </button>
      </div>
    </div>
  )
}
