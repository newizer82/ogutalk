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
// 버퍼: 콜드 스타트 시 알림 이벤트가 핸들러 등록보다 먼저 도착하면
//       이벤트를 잃지 않도록 보관했다가 핸들러 등록 시 즉시 flush
let _oguAlarmHandler    = null
let _customAlarmHandler = null
let _pendingOguAlarm    = null   // { targetHour, isTest }
let _pendingCustomAlarm = null   // notifId

export function setOguAlarmHandler(fn) {
  _oguAlarmHandler = fn
  if (fn && _pendingOguAlarm) {
    const p = _pendingOguAlarm
    _pendingOguAlarm = null
    fn(p)
  }
}
export function setCustomAlarmHandler(fn) {
  _customAlarmHandler = fn
  if (fn && _pendingCustomAlarm != null) {
    const id = _pendingCustomAlarm
    _pendingCustomAlarm = null
    fn(id)
  }
}

// 알림 → 핸들러 디스패치 (핸들러 없으면 버퍼에 보관)
function _dispatchOgu(notif) {
  const payload = {
    targetHour: notif.extra?.targetHour ?? ((notif.id - 1) % 24),
    isTest:     !!notif.extra?.isTest,
  }
  if (_oguAlarmHandler) _oguAlarmHandler(payload)
  else _pendingOguAlarm = payload
}
function _dispatchCustom(notifId) {
  if (_customAlarmHandler) _customAlarmHandler(notifId)
  else _pendingCustomAlarm = notifId
}

// ── 포그라운드 / 백그라운드 알림 리스너 설정 ─────────────────
let _listenerSetup = false
async function _setupNotifListeners() {
  if (_listenerSetup) return
  _listenerSetup = true
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')

    // 앱이 포그라운드일 때 알림 수신 → 인앱 팝업
    await LocalNotifications.addListener('localNotificationReceived', async (notif) => {
      if (notif.id < 1000) _dispatchOgu(notif)
      else                 _dispatchCustom(notif.id)
    })

    // 백그라운드 알람 → 유저가 알림을 탭해서 앱 열 때
    await LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      const notif = action.notification
      if (!notif) return
      if (notif.id < 1000) _dispatchOgu(notif)
      else                 _dispatchCustom(notif.id)
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

// ── 채널 ID 선택 헬퍼 (스케줄링·테스트가 같은 함수를 거치도록 — 분기 분산 방지) ─
// alarmMode='vibrate' → 진동 전용 채널 / 그 외 → 사운드+진동 채널
function oguChannelFor(alarmMode) {
  return alarmMode === 'vibrate' ? 'ogu-hourly-vib-v1' : 'ogu-hourly-v4'
}
function customChannelFor(customAlarmMode) {
  return customAlarmMode === 'vibrate' ? 'ogu-custom-vib-v1' : 'ogu-custom-v3'
}

// ── 알람 스케줄 등록 (alarmHours 변경 시 호출) ───────────────
export async function scheduleOguAlarms(alarmHours = {}, alarmMode = 'both') {
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
          // alarmMode='vibrate' 면 진동 전용 채널 사용 (사운드 없음) — 헬퍼로 통일
          channelId: oguChannelFor(alarmMode),
          schedule:  { at, allowWhileIdle: true },
          extra:     { targetHour, scheduledAt: at.toISOString() },
        })
      }
    }

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule })
      const first = toSchedule[0]
      console.log(`[Capacitor] 오구 알람 ${toSchedule.length}개 등록 완료. 첫 번째: ${new Date(first.schedule.at).toLocaleString('ko-KR')} [id:${first.id}]`)
    } else {
      console.warn(`[Capacitor] 오구 알람 등록 0개! alarmHours 비어있음? 활성 시간: ${Object.entries(alarmHours).filter(([_, v]) => v).map(([k]) => k).join(',') || '(없음)'}`)
    }
    return { ok: true, scheduled: toSchedule.length }
  } catch (e) {
    console.warn('[Capacitor] 알람 등록 실패:', e)
    return { ok: false, reason: 'exception', error: String(e?.message || e) }
  }
}

// ── 오디오 포커스 요청 (다른 앱 일시정지) ─────────────────────
// 알람 발동 시 YouTube/음악 앱을 강제로 일시정지시키기 위함
// AudioFocusPlugin (Android) 사용. duration ms 후 자동 release
let _audioFocusPlugin = null
export async function requestAudioFocus(duration = 6000) {
  if (!IS_NATIVE) return { granted: false, reason: 'not-native' }
  try {
    if (!_audioFocusPlugin) {
      const { registerPlugin } = await import('@capacitor/core')
      _audioFocusPlugin = registerPlugin('AudioFocus')
    }
    const result = await _audioFocusPlugin.request({ duration })
    return result
  } catch (e) {
    console.warn('[AudioFocus] 요청 실패:', e)
    return { granted: false, error: String(e?.message || e) }
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

// ── 외부 URL 열기 ──────────────────────────────────────────────
// 네이티브: Capacitor Browser (인앱 브라우저) / 웹: 새 탭
export async function openUrl(url) {
  if (!url) return
  // 스킴 없으면 https 보정
  const safeUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    if (IS_NATIVE) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: safeUrl })
    } else {
      window.open(safeUrl, '_blank', 'noopener,noreferrer')
    }
  } catch (e) {
    console.warn('[openUrl] 실패:', e)
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

// ── 오구 알람 진단 (대기중 알람 정보 반환) ─────────────────────
// 어떤 알람이 언제 등록되어 있는지 정확히 보여주는 진단용
export async function diagnoseOguAlarm() {
  if (!IS_NATIVE) return { native: false }
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    const perm = await LocalNotifications.checkPermissions()
    const { notifications: pending } = await LocalNotifications.getPending()
    const oguPending = pending
      .filter(n => n.id < 1000 && n.id !== 999)
      .sort((a, b) => {
        const aT = new Date(a.schedule?.at || 0).getTime()
        const bT = new Date(b.schedule?.at || 0).getTime()
        return aT - bT
      })
    const next3 = oguPending.slice(0, 3).map(n => {
      const at = new Date(n.schedule?.at || 0)
      return `${at.toLocaleString('ko-KR')} [id:${n.id}]`
    })
    const customCount = pending.filter(n => n.id >= 1000).length
    return {
      native:          true,
      permission:      perm.display,
      totalOguPending: oguPending.length,
      customCount,
      next3,
    }
  } catch (e) {
    return { native: true, error: String(e?.message || e) }
  }
}

// ── 30초 뒤 테스트 알람 ──────────────────────────────────────
// 스케줄링이 정상 작동하는지 즉시 확인용
export async function scheduleTestNotification(alarmMode = 'both') {
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

    const at = new Date(Date.now() + 30_000)
    const channelId = oguChannelFor(alarmMode)   // 실제 알람과 같은 헬퍼 사용
    await LocalNotifications.schedule({
      notifications: [{
        id:        999,                // 오구 영역(< 1000) 마지막 ID
        title:     '🧪 오구 채널 테스트',
        body:      '오구 알람 채널이 정상 작동합니다!',
        channelId,                     // alarmMode 'vibrate' → 진동 전용 채널
        schedule:  { at, allowWhileIdle: true },
        extra:     { isTest: true },   // 중복방지(dedup) 우회용 — 핸들러에서 항상 팝업
      }],
    })

    const pending = await LocalNotifications.getPending()
    alert(
      `✅ 테스트 알람 등록 완료\n\n` +
      `예정 시각: ${at.toLocaleTimeString('ko-KR')}\n` +
      `모드: ${alarmMode === 'vibrate' ? '진동만' : '알림음+진동'}\n` +
      `대기중 알람: ${pending.notifications.length}개\n\n` +
      `30초 뒤에 알림이 울리는지 확인해주세요.\n` +
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

// ── 요일 필터: 알람의 freq(repeatType)에 해당 날짜가 맞는지 ──────
// '평일' = 월~금 / '주말' = 토·일 / 그 외('매일'·'daily'·미지정) = 모든 요일
function _dayMatchesFreq(date, freq) {
  const dow = date.getDay()   // 0=일 … 6=토
  if (freq === '평일') return dow >= 1 && dow <= 5
  if (freq === '주말') return dow === 0 || dow === 6
  return true
}

// ── 커스텀 알람 스케줄 등록 ───────────────────────────────────
// customAlarmMode: 'both' | 'vibrate' — 글로벌 모드 (모든 커스텀 알람에 적용)
//   'vibrate' → 무조건 진동 채널 (사용자가 설정 탭에서 진동만 선택)
//   'both'    → 개별 alarm.tone === 'vibrate-only' 일 때만 진동 채널
export async function scheduleCustomAlarms(customAlarms = [], customAlarmMode = 'both') {
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
        // freq(repeatType) 요일 필터 — 평일/주말 알람은 해당 요일에만 등록
        if (!_dayMatchesFreq(at, alarm.repeatType)) continue

        // 글로벌 모드 우선 — 'vibrate' 면 모든 알람이 진동 채널
        // 'both' 일 때만 개별 alarm.tone === 'vibrate-only' 를 존중
        const effectiveMode = customAlarmMode === 'vibrate'
          ? 'vibrate'
          : (alarm.tone === 'vibrate-only' ? 'vibrate' : 'both')
        toSchedule.push({
          id:        1000 + alarmIdx * 7 + day,   // alarmIdx 로 NaN 방지
          title:     `${alarm.icon || '🔔'} ${alarm.title}`,
          body:      alarm.message || `${alarm.hour}시 ${String(alarm.minute).padStart(2, '0')}분 알람`,
          channelId: customChannelFor(effectiveMode),
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
