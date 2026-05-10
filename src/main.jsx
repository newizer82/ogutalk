import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AuthCallbackPage from './pages/AuthCallbackPage.jsx'

// ── 환경별 Service Worker 처리 ───────────────────────────────
// 네이티브(Capacitor): SW 등록 금지 + 기존 SW/캐시 모두 정리 (APK 업데이트 시 옛 chunk 서빙 방지)
// 웹: 정상 SW 등록 (PWA 백그라운드 알림용)
const IS_NATIVE = (() => {
  try { return !!window.Capacitor?.isNativePlatform?.() } catch { return false }
})()

if (IS_NATIVE) {
  // 옛 SW + 캐시 강제 정리
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then(regs => Promise.all(regs.map(r => r.unregister())))
      .catch(() => {})
  }
  if (typeof caches !== 'undefined' && caches.keys) {
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .catch(() => {})
  }
} else if ('serviceWorker' in navigator) {
  // 웹: 정상 SW 등록
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw-custom.js', { scope: '/' }).catch(() => {})
  })
}

// SW 강제 새로고침 명령 수신 (모든 환경)
if ('serviceWorker' in navigator) {
  let _reloaded = false
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'SW_FORCE_RELOAD' && !_reloaded) {
      _reloaded = true
      window.location.reload()
    }
  })
}

const isAuthCallback = window.location.pathname === '/auth/callback'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isAuthCallback ? <AuthCallbackPage /> : <App />}
  </StrictMode>,
)
