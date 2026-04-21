import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('처리 중...')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')
    const errorDescription = params.get('error_description')

    if (error) {
      setStatus(`로그인 실패: ${errorDescription || error}`)
      setTimeout(() => { window.location.replace('/') }, 2000)
      return
    }

    if (code) {
      supabase.auth.exchangeCodeForSession(code)
        .then(({ error: err }) => {
          if (err) {
            setStatus('세션 처리 실패. 다시 시도해주세요.')
            setTimeout(() => { window.location.replace('/') }, 2000)
          } else {
            setStatus('로그인 성공! 이동 중...')
            window.location.replace('/')
          }
        })
    } else {
      // implicit flow: hash fragment — Supabase handles automatically
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          window.location.replace('/')
        } else {
          setStatus('세션을 찾을 수 없어요.')
          setTimeout(() => { window.location.replace('/') }, 2000)
        }
      })
    }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⏱️</div>
      <div style={{
        fontSize: 22, fontWeight: 800, marginBottom: 8,
        background: 'linear-gradient(135deg, #818cf8, #a78bfa, #c084fc)',
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
      }}>오구톡</div>
      <div style={{ color: '#94a3b8', fontSize: 14, marginTop: 8 }}>{status}</div>
    </div>
  )
}
