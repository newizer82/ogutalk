// ────────────────────────────────────────────────────────────
// Capacitor 브릿지
// 동적 import → 패키지 미설치 시에도 웹 빌드 정상 동작
// IS_NATIVE = true  : Android/iOS 앱
// IS_NATIVE = false : 브라우저 (기존 Web API 사용)
// ────────────────────────────────────────────────────────────

// 다중 신호로 네이티브 검출 — 단일 함수 호출이 실패하는 케이스 방어
export const IS_NATIVE = (() => {
  try {
    if (typeof window === 'undefined') return false
    const cap = window.Capacitor
    if (!cap) return false
    // 1) 표준: isNativePlatform()
    try { if (cap.isNativePlatform?.()) return true } catch {}
    // 2) platform 속성
    const plat = cap.platform || cap.getPlatform?.()
    if (plat === 'android' || plat === 'ios') return true
    // 3) Capacitor 객체가 존재하면 일단 native 환경으로 간주
    return !!cap
  } catch {
    return false
  }
})()

// 진단용 — 화면에 표시 가능
export const CAPACITOR_DIAG = (() => {
  try {
    if (typeof window === 'undefined') return 'no-window'
    const cap = window.Capacitor
    if (!cap) return 'no-Capacitor-object'
    const plat = (() => { try { return cap.getPlatform?.() } catch { return cap.platform } })()
    const isNat = (() => { try { return cap.isNativePlatform?.() } catch { return null } })()
    return `platform=${plat ?? 'undef'},isNative=${isNat}`
  } catch (e) {
    return 'error:' + (e?.message || e)
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

// ── 포그라운드 알람 콜백 핸들러 ────────────────────────────────
// useAlarm.js 에서 등록 → 항상 활성 (탭 이동과 무관)
let _oguAlarmHandler    = null
let _customAlarmHandler = null
export function setOguAlarmHandler(fn)    { _oguAlarmHandler    = fn }
export function setCustomAlarmHandler(fn) { _customAlarmHandler = fn }

// ── 포그라운드 / 백그라운드 알림 리스너 설정 ─────────────────
let _listenerSetup = false
async function _setupNotifListeners() {
  if (_listenerSetup) return
  _listenerSetup = true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 앱이 포그라운드일 때 알림 수신
    // 시스템 배너는 그대로 두고 인앱 핸들러만 추가 호출 (웹 오디오 실패해도 시스템 사운드는 울림)
    await LocalNotifications.addListener('localNotificationReceived', async (notif) => {
      if (notif.id < 1000) {
        // 오구 알람: 인앱 팝업 + Web Audio 보조
        const targetHour = notif.extra?.targetHour ?? ((notif.id - 1) % 24)
        if (_oguAlarmHandler) _oguAlarmHandler(targetHour)
      } else {
        // 커스텀 알람: Web Audio 보조
        if (_customAlarmHandler) _customAlarmHandler(notif.id)
      }
    })

    // 백그라운드 알람 → 유저가 알림을 탭해서 앱 열 때
    await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      const notif = action.notification
      if (!notif) return
      if (notif.id < 1000) {
        const targetHour = notif.extra?.targetHour ?? ((notif.id - 1) % 24)
        if (_oguAlarmHandler) _oguAlarmHandler(targetHour)
      } else {
        if (_customAlarmHandler) _customAlarmHandler(notif.id)
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
  if (!IS_NATIVE) return { ok: false, reason: 'not-native' }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 권한 확인 — 거부 상태면 아무리 스케줄해도 안 울림
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions()
      if (req.display !== 'granted') {
        console.warn('[Capacitor] 알림 권한 거부됨')
        return { ok: false, reason: 'permission-denied' }
      }
    }

    const { notifications: pending } = await LocalNotifications.getPending()
    const oguPending = pending.filter(n => n.id < 1000)
    if (oguPending.length > 0) {
      await LocalNotifications.cancel({ notifications: oguPending })
    }

    await clearDeliveredOguNotifs()

    const toSchedule = []
    const now = new Date()

    // alarmHours[targetHour]=true → fireHour:59 울림 (fireHour = targetHour-1)
    // 예: alarmHours[7]=true → 6:59에 알람 "곧 7시!"
    // ID: day * 24 + targetHour + 1 (range 1~168, < 1000 → 커스텀과 충돌 방지)
    // 7일치만 등록 (Android AlarmManager 제한 회피, 12시간마다 재등록됨)
    for (let day = 0; day < 7; day++) {
      for (let targetHour = 0; targetHour < 24; targetHour++) {
        if (!alarmHours[targetHour]) continue

        const fireHour = (targetHour - 1 + 24) % 24
        const at = new Date(now)
        // targetHour=0 (자정 알람)은 fireHour=23 → 전날에 울림
        if (targetHour === 0) {
          at.setDate(at.getDate() + day - 1)
        } else {
          at.setDate(at.getDate() + day)
        }
        at.setHours(fireHour, 59, 0, 0)
        if (at <= now) continue

        toSchedule.push({
          id:        day * 24 + targetHour + 1,
          title:     '⏱️ 오구!',
          body:      `곧 ${targetHour}시입니다! 잠깐 쉬어가세요.`,
          channelId: 'ogu-hourly-v2',
          schedule:  { at, allowWhileIdle: true },
          extra:     { targetHour, scheduledAt: at.toISOString() },
        })
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule })
      console.log(`[Capacitor] ${toSchedule.length}개 알람 등록 완료`)
    }
    return { ok: true, scheduled: toSchedule.length }
  } catch (e) {
    console.warn('[Capacitor] 알람 등록 실패:', e)
    return { ok: false, reason: 'exception', error: String(e?.message || e) }
  }
}

// ── 네이티브 진동 (Haptics) ────────────────────────────────────
// Android WebView에서 navigator.vibrate()는 차단되므로
// @capacitor/haptics를 대신 사용한다.
export async function triggerHaptics(strength = 'medium') {
  if (!IS_NATIVE) {
    // 웹: navigator.vibrate 그대로 사용
    const patterns = { weak: [80,60,80], medium: [250,120,250], strong: [400,150,400,150,600] }
    if (navigator.vibrate) navigator.vibrate(patterns[strength] || patterns.medium)
    return
  }
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    if (strength === 'strong') {
      await Haptics.impact({ style: ImpactStyle.Heavy })
      await new Promise(r => setTimeout(r, 150))
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } else if (strength === 'weak') {
      await Haptics.impact({ style: ImpactStyle.Light })
    } else {
      await Haptics.impact({ style: ImpactStyle.Medium })
      await new Promise(r => setTimeout(r, 120))
      await Haptics.impact({ style: ImpactStyle.Medium })
    }
  } catch (e) {
    console.warn('[Haptics] 진동 실패:', e)
  }
}

// ── 진단: 권한/대기중 알람 상태 확인 ─────────────────────────
export async function diagnoseNotifications() {
  if (!IS_NATIVE) return { native: false }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm     = await LocalNotifications.checkPermissions()
    const pending  = await LocalNotifications.getPending()
    const oguCount    = pending.notifications.filter(n => n.id < 1000).length
    const customCount = pending.notifications.filter(n => n.id >= 1000).length
    return {
      native:       true,
      permission:   perm.display,
      totalPending: pending.notifications.length,
      oguCount,
      customCount,
    }
  } catch (e) {
    return { native: true, error: String(e?.message || e) }
  }
}

// ── 1분 뒤 테스트 알람 ───────────────────────────────────────
// 스케줄링이 정상 작동하는지 즉시 확인용
export async function scheduleTestNotification() {
  if (!IS_NATIVE) {
    alert('네이티브 환경에서만 동작 (브라우저에서는 즉시 알림 사용)')
    return
  }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 권한 확인
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions()
      if (req.display !== 'granted') {
        alert('알림 권한이 거부되어 있습니다.\n시스템 설정 → 앱 → 오구톡 → 알림에서 허용해주세요.')
        return
      }
    }

    const at = new Date(Date.now() + 60_000)
    await LocalNotifications.schedule({
      notifications: [{
        id:        999,                // 오구 영역(< 1000) 마지막 ID
        title:     '🧪 오구 채널 테스트',
        body:      '오구 알람 채널이 정상 작동합니다!',
        channelId: 'ogu-hourly-v2',
        schedule:  { at, allowWhileIdle: true },
      }],
    })

    const pending = await LocalNotifications.getPending()
    alert(
      `✅ 테스트 알람 등록 완료\n\n` +
      `예정 시각: ${at.toLocaleTimeString('ko-KR')}\n` +
      `대기중 알람: ${pending.notifications.length}개\n\n` +
      `1분 뒤에 알림이 울리는지 확인해주세요.\n` +
      `(앱을 닫아도 OK)`
    )
  } catch (e) {
    alert('❌ 테스트 알람 등록 실패:\n' + (e?.message || e))
    console.error('[Capacitor] 테스트 알람 실패:', e)
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
  if (!IS_NATIVE) return { ok: false, reason: 'not-native' }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 권한 체크 — 거부 상태면 아무리 등록해도 안 울림
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') {
      const req = await LocalNotifications.requestPermissions()
      if (req.display !== 'granted') {
        console.warn('[Capacitor] 커스텀 알람: 알림 권한 거부됨')
        return { ok: false, reason: 'permission-denied' }
      }
    }

    const { notifications: pending } = await LocalNotifications.getPending()
    const customPending = pending.filter(n => n.id >= 1000)
    if (customPending.length > 0) {
      await LocalNotifications.cancel({ notifications: customPending })
    }

    const enabled = customAlarms.filter(a => a.isEnabled)
    if (enabled.length === 0) return { ok: true, scheduled: 0 }

    const toSchedule = []
    const now = new Date()

    enabled.forEach((alarm, alarmIdx) => {
      for (let day = 0; day < 7; day++) {
        const at = new Date(now)
        at.setDate(at.getDate() + day)
        at.setHours(alarm.hour, alarm.minute, 0, 0)
        if (at <= now) continue

        toSchedule.push({
          id:        1000 + alarmIdx * 7 + day,   // alarmIdx 로 NaN 방지
          title:     `${alarm.icon || '🔔'} ${alarm.title}`,
          body:      alarm.message || `${alarm.hour}시 ${String(alarm.minute).padStart(2, '0')}분 알람`,
          channelId: 'ogu-custom-v2',
          schedule:  { at, allowWhileIdle: true },
        })
      }
    })

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule })
      console.log(`[Capacitor] 커스텀 알람 ${toSchedule.length}개 등록 완료`)
    }
    return { ok: true, scheduled: toSchedule.length }
  } catch (e) {
    console.warn('[Capacitor] 커스텀 알람 등록 실패:', e)
    return { ok: false, reason: 'exception', error: String(e?.message || e) }
  }
}
