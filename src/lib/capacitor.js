// ────────────────────────────────────────────────────────────
// Capacitor 브릿지
// 동적 import → 패키지 미설치 시에도 웹 빌드 정상 동작
// IS_NATIVE = true  : Android/iOS 앱
// IS_NATIVE = false : 브라우저 (기존 Web API 사용)
// ────────────────────────────────────────────────────────────

export const IS_NATIVE = (() => {
  try {
    return window?.Capacitor?.isNativePlatform?.() ?? false
  } catch {
    return false
  }
})()

// ── 알림 채널 생성 (Android 8+ 필수) ─────────────────────────
export async function createOguChannel() {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.createChannel({
      id:          'ogu-alarm',
      name:        '오구 알람',
      description: '매시 59분 오구톡 알람',
      importance:  5,            // IMPORTANCE_HIGH
      vibration:   true,
      sound:       'ogu',        // res/raw/ogu.wav (확장자 제외)
    })
  } catch (e) {
    console.warn('[Capacitor] 채널 생성 실패:', e)
  }
}

// ── 알림 권한 요청 ────────────────────────────────────────────
export async function requestLocalNotifPermission() {
  if (!IS_NATIVE) return true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { display } = await LocalNotifications.requestPermissions()
    return display === 'granted'
  } catch (e) {
    console.warn('[Capacitor] 권한 요청 실패:', e)
    return false
  }
}

// ── 알람 스케줄 등록 (alarmHours 변경 시 호출) ───────────────
// alarmHours: { 7: true, 8: true, ... }  (0~23)
// 향후 7일치 :59 알람을 한 번에 기기에 등록
export async function scheduleOguAlarms(alarmHours = {}) {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 기존 등록 알람 전체 취소
    const { notifications: pending } = await LocalNotifications.getPending()
    if (pending.length > 0) {
      await LocalNotifications.cancel({ notifications: pending })
    }

    const toSchedule = []
    const now = new Date()

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (!alarmHours[hour]) continue

        const at = new Date(now)
        at.setDate(at.getDate() + day)
        at.setHours(hour, 59, 0, 0)
        if (at <= now) continue      // 과거 시각은 스킵

        toSchedule.push({
          id:        (day * 100 + hour) + 1,   // id > 0 필수
          title:     '⏱️ 오구!',
          body:      `${hour}시 59분 — 지금 뭐 하고 있나요?`,
          channelId: 'ogu-alarm',
          schedule:  { at, allowWhileIdle: true },
          extra:     { hour },
        })
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule })
      console.log(`[Capacitor] ${toSchedule.length}개 알람 등록 완료`)
    }
  } catch (e) {
    console.warn('[Capacitor] 알람 등록 실패:', e)
  }
}

// ── 알람 전체 취소 ────────────────────────────────────────────
export async function cancelOguAlarms() {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { notifications: pending } = await LocalNotifications.getPending()
    if (pending.length > 0) {
      await LocalNotifications.cancel({ notifications: pending })
    }
  } catch (e) {
    console.warn('[Capacitor] 알람 취소 실패:', e)
  }
}

// ── 커스텀 알람 스케줄 등록 ───────────────────────────────────
// customAlarms: [{ _numId, hour, minute, repeatType, isEnabled, title, message, icon }]
// ID 범위: 1000 + (_numId * 7 + day) — 오구 알람(1~700)과 충돌 없음
export async function scheduleCustomAlarms(customAlarms = []) {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 기존 커스텀 알람(ID 1000+) 취소
    const { notifications: pending } = await LocalNotifications.getPending()
    const customPending = pending.filter(n => n.id >= 1000)
    if (customPending.length > 0) {
      await LocalNotifications.cancel({ notifications: customPending })
    }

    const enabled = customAlarms.filter(a => a.isEnabled)
    if (enabled.length === 0) return

    const toSchedule = []
    const now = new Date()

    for (const alarm of enabled) {
      for (let day = 0; day < 7; day++) {
        const at = new Date(now)
        at.setDate(at.getDate() + day)
        at.setHours(alarm.hour, alarm.minute, 0, 0)
        if (at <= now) continue   // 과거 스킵

        toSchedule.push({
          id:        1000 + alarm._numId * 7 + day,
          title:     `${alarm.icon || '🔔'} ${alarm.title}`,
          body:      alarm.message || `${alarm.hour}시 ${String(alarm.minute).padStart(2, '0')}분 알람`,
          channelId: 'ogu-alarm',
          schedule:  { at, allowWhileIdle: true },
        })
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule })
      console.log(`[Capacitor] 커스텀 알람 ${toSchedule.length}개 등록 완료`)
    }
  } catch (e) {
    console.warn('[Capacitor] 커스텀 알람 등록 실패:', e)
  }
}
