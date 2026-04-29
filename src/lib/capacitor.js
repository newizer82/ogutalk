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

// ── 알림 채널 생성 (MainActivity.java 가 USAGE_ALARM 채널을 선점 생성)
// JS 에서는 채널 재생성 없이 권한 요청만 수행
export async function createOguChannel() {
  if (!IS_NATIVE) return
  try {
    // MainActivity.java 에서 이미 USAGE_ALARM 채널을 생성했으므로
    // JS 에서는 채널을 덮어쓰지 않는다 (덮어쓰면 USAGE_NOTIFICATION 으로 degraded)
    // 알림 수신 리스너만 등록
    await _setupNotifListeners()
  } catch (e) {
    console.warn('[Capacitor] 채널 초기화 실패:', e)
  }
}

// ── 포그라운드 알림 리스너 설정 ─────────────────────────────
// 앱이 열려 있을 때 오구 알림이 수신되면 헤드업 배너를 즉시 제거
// (앱 내 AlarmPopup 이 대신 표시되므로 중복 방지)
let _listenerSetup = false
async function _setupNotifListeners() {
  if (_listenerSetup) return
  _listenerSetup = true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.addListener('localNotificationReceived', async (notif) => {
      if (notif.id < 1000) {
        try {
          await LocalNotifications.removeDeliveredNotifications({
            notifications: [{ id: notif.id, title: notif.title || '', body: notif.body || '' }],
          })
        } catch (_) {}
      }
    })
  } catch (e) {
    console.warn('[Capacitor] 알림 리스너 등록 실패:', e)
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

// ── 전달된 오구 알림 제거 (앱 복귀 시 쌓인 알림 정리) ────────
export async function clearDeliveredOguNotifs() {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const { notifications: delivered } = await LocalNotifications.getDeliveredNotifications()
    const oguOnes = delivered.filter(n => n.id >= 1 && n.id < 1000)
    if (oguOnes.length > 0) {
      await LocalNotifications.removeDeliveredNotifications({ notifications: oguOnes })
    }
  } catch (e) {
    console.warn('[Capacitor] 전달 알림 정리 실패:', e)
  }
}

// ── 알람 스케줄 등록 (alarmHours 변경 시 호출) ───────────────
export async function scheduleOguAlarms(alarmHours = {}) {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    const { notifications: pending } = await LocalNotifications.getPending()
    const oguPending = pending.filter(n => n.id < 1000)
    if (oguPending.length > 0) {
      await LocalNotifications.cancel({ notifications: oguPending })
    }

    await clearDeliveredOguNotifs()

    const toSchedule = []
    const now = new Date()

    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        if (!alarmHours[hour]) continue

        const at = new Date(now)
        at.setDate(at.getDate() + day)
        at.setHours(hour, 59, 0, 0)
        if (at <= now) continue

        toSchedule.push({
          id:        (day * 100 + hour) + 1,
          title:     '⏱️ 오구!',
          body:      `${hour}시 59분 — 지금 뭐 하고 있나요?`,
          channelId: 'ogu-alarm',
          schedule:  { at, allowWhileIdle: true },
          extra:     { hour, scheduledAt: at.toISOString() },
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
    await clearDeliveredOguNotifs()
  } catch (e) {
    console.warn('[Capacitor] 알람 취소 실패:', e)
  }
}

// ── 커스텀 알람 스케줄 등록 ───────────────────────────────────
export async function scheduleCustomAlarms(customAlarms = []) {
  if (!IS_NATIVE) return
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

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
        if (at <= now) continue

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
