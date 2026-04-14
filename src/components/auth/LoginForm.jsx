import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { theme, gradients } from '../../styles/theme'

const styles = {
  container: {
    width: '100%',
    maxWidth: 380,
    padding: '0 24px',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: theme.text.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    background: theme.bg.elevated,
    border: '1px solid #475569',
    borderRadius: 12,
    color: theme.text.primary,
    fontSize: 15,
    marginBottom: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '13px',
    background: gradients.button,
    border: 'none',
    borderRadius: 12,
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
  },
  error: {
    color: theme.status.error,
    fontSize: 13,
    marginBottom: 10,
    textAlign: 'center',
  },
  toggle: {
    marginTop: 18,
    textAlign: 'center',
    color: theme.text.muted,
    fontSize: 14,
  },
  toggleLink: {
    color: theme.accent.secondary,
    cursor: 'pointer',
    fontWeight: 600,
    marginLeft: 4,
  },
}

export default function LoginForm({ onToggle }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } catch (err) {
      setError('이메일 또는 비밀번호가 올바르지 않아요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <p style={styles.title}>로그인</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={styles.error}>{error}</p>}
        <input
          style={styles.input}
          type="email"
          placeholder="이메일"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <div style={styles.toggle}>
        계정이 없으신가요?
        <span style={styles.toggleLink} onClick={onToggle}>회원가입</span>
      </div>
    </div>
  )
}
