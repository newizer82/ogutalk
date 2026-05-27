// 비밀번호 재설정 페이지 (이메일 링크에서 진입)
// URL 예: https://ogutalk.vercel.app/reset-password#access_token=...&type=recovery
// Supabase 가 자동으로 access_token 을 감지해 임시 세션 만들어줌 →
// updatePassword() 호출로 새 비번 저장 가능
import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { gradients, S } from '../styles/theme'

export default function ResetPasswordPage() {
  const { updatePassword } = useAuth()
  const [pw,       setPw]       = useState('')
  const [pw2,      setPw2]      = useState('')
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  // URL에 token 이 있는지만 잠깐 확인 (Supabase가 hash 파싱은 자동 처리)
  useEffect(() => {
    if (!window.location.hash.includes('access_token')) {
      setError('재설정 링크가 유효하지 않거나 만료됐습니다. 메일을 다시 받아주세요.')
    }
  }, [])

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    setError('')
    if (pw.length < 6)      { setError('비밀번호는 6자 이상이어야 합니다.'); return }
    if (pw !== pw2)         { setError('비밀번호가 일치하지 않습니다.');    return }
    setLoading(true)
    try {
      await updatePassword(pw)
      setSuccess(true)
    } catch (err) {
      setError(err.message || '비밀번호 재설정 실패. 링크가 만료됐을 수 있어요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: gradients.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      fontFamily: "'Segoe UI', -apple-system, 'Apple SD Gothic Neo', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(30,41,59,0.9)', borderRadius: 24, padding: 28,
        border: '1px solid rgba(99,102,241,0.3)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <div style={{
            fontSize: 22, fontWeight: 800,
            background: gradients.logo,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>비밀번호 재설정</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 6 }}>
            새 비밀번호를 입력해주세요
          </div>
        </div>

        {success ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ color: '#34d399', fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              비밀번호가 변경됐습니다
            </div>
            <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 20, lineHeight: 1.6 }}>
              오구톡 앱으로 돌아가서<br />새 비밀번호로 로그인해주세요.
            </div>
            <a href="/" style={{
              display: 'inline-block', padding: '10px 24px', borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white', fontWeight: 700, textDecoration: 'none', fontSize: 13,
            }}>
              오구톡으로 가기
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <input
              type="password" placeholder="새 비밀번호 (6자 이상)"
              value={pw} onChange={e => setPw(e.target.value)}
              style={S.input} autoFocus
            />
            <input
              type="password" placeholder="새 비밀번호 확인"
              value={pw2} onChange={e => setPw2(e.target.value)}
              style={{ ...S.input, marginTop: 8 }}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 10 }}>{error}</div>
            )}
            <button
              type="submit" disabled={loading}
              style={{ ...S.primaryBtn, marginTop: 16, opacity: loading ? 0.6 : 1 }}
            >
              {loading ? '변경 중...' : '비밀번호 변경하기'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
