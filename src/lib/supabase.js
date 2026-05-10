import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ .env.local에 Supabase 설정이 없습니다!')
}

// 네이티브(Capacitor) 감지 — supabase.js 단독 검사 (capacitor.js 의존 회피)
const IS_NATIVE_CTX = (() => {
  try { return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.() }
  catch { return false }
})()

// 네이티브: implicit flow (PKCE verifier가 WebView 라이프사이클에서 휘발되는 문제 회피)
//   딥링크 URL은 OS가 우리 앱에만 전달하므로 토큰 노출 위험 없음
// 웹: PKCE (Supabase 권장)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType:           IS_NATIVE_CTX ? 'implicit' : 'pkce',
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: !IS_NATIVE_CTX, // 네이티브는 딥링크 핸들러가 직접 처리
    storage:            (typeof window !== 'undefined') ? window.localStorage : undefined,
  },
})