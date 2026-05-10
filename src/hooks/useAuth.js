import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { IS_NATIVE } from '../lib/capacitor'

// ── 모듈 레벨 싱글톤 ─────────────────────────────────────────
// useAuth() 가 여러 컴포넌트에서 호출되어도 딥링크 리스너는 1번만 등록
let _deepLinkInitialized = false
const _processedUrls = new Set()

async function _initDeepLinkOnce() {
  if (_deepLinkInitialized) return
  _deepLinkInitialized = true
  if (!IS_NATIVE) return

  const handleDeepLink = async (url) => {
    if (!url || !url.includes('login-callback')) return
    if (_processedUrls.has(url)) return
    _processedUrls.add(url)

    // Custom Tab 자동 닫기
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.close()
    } catch (_) {}

    try {
      // URL 파싱 — 커스텀 스킴은 new URL()이 일부 OS에서 실패할 수 있으므로 수동 파싱 백업
      let searchPart = ''
      let hashPart = ''
      try {
        const u = new URL(url)
        searchPart = u.search.startsWith('?') ? u.search.slice(1) : u.search
        hashPart   = u.hash.startsWith('#') ? u.hash.slice(1) : u.hash
      } catch {
        const qIdx = url.indexOf('?')
        const hIdx = url.indexOf('#')
        if (qIdx >= 0) searchPart = url.slice(qIdx + 1, hIdx >= 0 ? hIdx : undefined)
        if (hIdx >= 0) hashPart   = url.slice(hIdx + 1)
      }

      const search = new URLSearchParams(searchPart)
      const hash   = new URLSearchParams(hashPart)

      // OAuth provider 에러 우선 검사
      const errParam = search.get('error') || search.get('error_description') || hash.get('error') || hash.get('error_description')
      if (errParam) {
        console.error('[OAuth] 카카오 로그인 실패:', errParam)
        return
      }

      // implicit flow: access_token 우선
      const accessToken  = hash.get('access_token')  || search.get('access_token')
      const refreshToken = hash.get('refresh_token') || search.get('refresh_token')
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        if (error) console.error('[OAuth] 세션 설정 실패:', error.message)
        return
      }

      // PKCE 백업 (혹시 code 가 올 경우)
      const code = search.get('code') || hash.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) console.error('[OAuth] 세션 교환 실패:', error.message)
        return
      }

      console.error('[OAuth] 딥링크에 인증 정보 없음', { searchPart, hashPart })
    } catch (e) {
      console.error('[OAuth] 처리 오류:', e)
    }
  }

  try {
    const { App } = await import('@capacitor/app')
    // 1) 런타임 딥링크
    App.addListener('appUrlOpen', ({ url }) => handleDeepLink(url))
    // 2) 콜드 스타트 딥링크
    const result = await App.getLaunchUrl()
    if (result?.url) handleDeepLink(result.url)
  } catch (e) {
    console.error('[OAuth] @capacitor/app 로드 실패:', e)
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 모듈 레벨 싱글톤이라 몇 번 호출해도 안전
    _initDeepLinkOnce()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: 'com.ogutalk.app://login-callback',
          skipBrowserRedirect: true,
        },
      })
      if (error) throw error
      if (!data?.url) return data
      try {
        const { Browser } = await import('@capacitor/browser')
        await Browser.open({ url: data.url })
      } catch (e) {
        console.error('[OAuth] Browser 플러그인 실패, window.open fallback:', e)
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
