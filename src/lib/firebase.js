// Firebase 통합 브릿지 — Push / Analytics / Crashlytics
// 웹에서는 no-op (Capacitor 네이티브 전용)
import { IS_NATIVE, scheduleOguAlarms } from './capacitor'
import { supabase } from './supabase'
import { loadSettings } from './settings'

// ── FCM 토큰 등록 + Supabase 저장 ─────────────────────────────
// 앱 시작 시 1회 호출. 토큰이 바뀌면 다시 저장.
export async function initFirebasePush(userId) {
  if (!IS_NATIVE) return
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // 권한 요청 (이미 승인됐으면 즉시 반환)
    const perm = await PushNotifications.checkPermissions()
    if (perm.receive !== 'granted') {
      const req = await PushNotifications.requestPermissions()
      if (req.receive !== 'granted') return
    }

    // 토큰 발급 리스너 등록 (반드시 register 전에)
    await PushNotifications.addListener('registration', async ({ value: token }) => {
      if (!userId || !token) return
      // upsert: 같은 토큰 재등록 시 무시, 새 토큰이면 저장
      await supabase.from('fcm_tokens').upsert(
        { user_id: userId, token, platform: 'android', updated_at: new Date().toISOString() },
        { onConflict: 'token' }
      )
    })

    // Push 수신 → 재등록 트리거인 경우 알람 재스케줄
    await PushNotifications.addListener('pushNotificationReceived', async (notif) => {
      if (notif.data?.type === 'reschedule') {
        const { alarmHours, alarmMode } = loadSettings()
        await scheduleOguAlarms(alarmHours, alarmMode)
      }
    })

    await PushNotifications.register()
  } catch (e) {
    console.warn('[firebase] push init 실패:', e)
  }
}

// ── Analytics: 이벤트 로그 ────────────────────────────────────
// 이름/파라미터는 Firebase 콘솔의 "이벤트" 탭에서 확인
export async function logEvent(name, params = {}) {
  if (!IS_NATIVE) return
  try {
    const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics')
    await FirebaseAnalytics.logEvent({ name, params })
  } catch (_) { /* 무시 — Analytics 실패는 UX에 영향 없음 */ }
}

// ── Analytics: 로그인 사용자 ID 세팅 ──────────────────────────
export async function setAnalyticsUser(userId) {
  if (!IS_NATIVE) return
  try {
    const { FirebaseAnalytics } = await import('@capacitor-firebase/analytics')
    await FirebaseAnalytics.setUserId({ userId: userId || '' })
  } catch (_) {}
}

// ── Crashlytics: 자동 크래시 수집 활성화 ──────────────────────
// 별도 코드 불필요 — 플러그인이 자동으로 미처리 예외 잡음
// 수동 로그가 필요할 때만 아래 함수 사용
export async function recordException(err, context = '') {
  if (!IS_NATIVE) return
  try {
    const { FirebaseCrashlytics } = await import('@capacitor-firebase/crashlytics')
    await FirebaseCrashlytics.recordException({
      message: `${context}: ${err?.message || err}`,
      stacktrace: err?.stack ? [err.stack] : undefined,
    })
  } catch (_) {}
}
