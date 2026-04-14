import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { theme } from '../../styles/theme'

const CONTENT_OPTIONS = [
  { key: 'show_quote',        label: '💬 명언' },
  { key: 'show_economic_tip', label: '💡 경제 상식' },
  { key: 'show_todos',        label: '✅ 할일 현황' },
  { key: 'show_weather',      label: '🌤️ 날씨 (추후)' },
]

const styles = {
  section: {
    background: theme.bg.secondary,
    borderRadius: 16,
    padding: '16px',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: theme.text.muted,
    marginBottom: 14,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',
    borderBottom: '1px solid #1e293b',
  },
  label: {
    fontSize: 14,
    color: theme.text.primary,
  },
  toggle: (on) => ({
    width: 44,
    height: 24,
    borderRadius: 12,
    background: on ? theme.accent.primary : '#334155',
    position: 'relative',
    cursor: 'pointer',
    transition: 'background 0.2s',
    flexShrink: 0,
  }),
  knob: (on) => ({
    position: 'absolute',
    top: 3,
    left: on ? 23 : 3,
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: '#fff',
    transition: 'left 0.2s',
  }),
}

export default function ContentSettings({ userId }) {
  const [prefs, setPrefs] = useState({
    show_quote: true,
    show_economic_tip: true,
    show_todos: true,
    show_weather: false,
  })
  const [prefId, setPrefId] = useState(null)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) return
        setPrefId(data.id)
        setPrefs(prev => ({
          ...prev,
          show_quote:        data.show_quote        ?? true,
          show_economic_tip: data.show_economic_tip ?? true,
          show_todos:        data.show_todos        ?? true,
          show_weather:      data.show_weather      ?? false,
        }))
      })
  }, [userId])

  async function toggle(key) {
    const newVal = !prefs[key]
    setPrefs(prev => ({ ...prev, [key]: newVal }))
    if (!prefId) return
    await supabase
      .from('user_preferences')
      .update({ [key]: newVal })
      .eq('id', prefId)
  }

  return (
    <div style={styles.section}>
      <p style={styles.sectionTitle}>📋 알람 팝업 콘텐츠</p>
      {CONTENT_OPTIONS.map((opt, i) => (
        <div key={opt.key} style={{ ...styles.row, borderBottom: i < CONTENT_OPTIONS.length - 1 ? '1px solid #1e293b' : 'none' }}>
          <span style={styles.label}>{opt.label}</span>
          <div style={styles.toggle(prefs[opt.key])} onClick={() => toggle(opt.key)}>
            <div style={styles.knob(prefs[opt.key])} />
          </div>
        </div>
      ))}
    </div>
  )
}
