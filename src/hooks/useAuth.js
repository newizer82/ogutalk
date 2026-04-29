import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { IS_NATIVE } from '../lib/capacitor'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── 네이티브 카카오 딥링크 콜백 처리 ──────────────────────────
  // 카카오 OAuth 완료 후 com.ogutalk.app://login-callback?code=... 로 앱이 열릴 때
  useEffect(() => {
    if (!IS_NATIVE) return
    const capApp = window.Capacitor?.Plugins?.App
    if (!capApp) return

    let handle = null
    capApp.addListener('appUrlOpen', async ({ url }) => {
      if (!url || !url.includes('login-callback')) return
      try {
        // PKCE: code 파라미터 교환
        const urlObj = new URL(url)
        const code = urlObj.searchParams.get('code')
        if (code) {
          await supabase.auth.exchangeCodeForSession(code)
        }
        // implicit flow: access_token 직접 처리
        const hash = url.includes('#') ? url.split('#')[1] : ''
        if (hash.includes('access_token')) {
          const params = new URLSearchParams(hash)
          const accessToken  = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          }
        }
      } catch (e) {
        console.error('[OAuth] 딥링크 처리 실패:', e)
      }
    }).then(h => { handle = h })

    return () => { handle?.remove?.() }
  }, [])

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signInWithKakao() {
    if (IS_NATIVE) {
      // 네이티브: OAuth URL을 시스템 브라우저(Chrome)에서 열기
      // → WebView가 이탈하지 않고, Chrome이 딥링크를 앱으로 돌려줌
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: 'com.ogutalk.app://login-callback',
          skipBrowserRedirect: true,   // WebView 이탈 방지
        },
      })
      if (error) throw error
      if (data?.url) {
        // 시스템 브라우저에서 열기 (_system = Chrome 등 외부 브라우저)
        window.open(data.url, '_system')
      }
      return data
    } else {
      // 웹: 일반 OAuth 리다이렉트
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin + '/auth/callback' },
      })
      if (error) throw error
      return data
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return { user, loading, signUp, signIn, signInWithKakao, signOut }
}
