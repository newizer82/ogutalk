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
  success: {
    color: theme.status.success,
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

export default function SignupForm({ onToggle }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않아요.')
      return
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 해요.')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      setSuccess('가입 완료! 이메일을 확인해주세요.')
    } catch (err) {
      setError('회원가입에 실패했어요. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <p style={styles.title}>회원가입</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={styles.error}>{error}</p>}
        {success && <p style={styles.success}>{success}</p>}
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
          placeholder="비밀번호 (6자 이상)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        <input
          style={styles.input}
          type="password"
          placeholder="비밀번호 확인"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          required
        />
        <button style={styles.button} type="submit" disabled={loading}>
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
      <div style={styles.toggle}>
        이미 계정이 있으신가요?
        <span style={styles.toggleLink} onClick={onToggle}>로그인</span>
      </div>
    </div>
  )
}
