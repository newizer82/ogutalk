// ── 기기 간 동기화 (설정 + 오구 지수 기록) ──────────────────────
// 할일·목표·체크인·커스텀 알람은 이미 각자 테이블로 동기화된다.
// 남아 있던 localStorage 전용 두 가지를 서버에 둔다:
//   ogu_settings  — 알람 시간대·알림 방식·시간 안내·지수 목표 (사용자가 고른 값)
//   ogu_day_log   — 날짜별 오구 지수 (앱이 관찰한 기록)
//
// 비로그인은 지금까지와 똑같이 로컬만 쓴다. 서버가 안 되면 조용히 로컬로 돌아간다 —
// 동기화 실패가 알람을 막아서는 안 된다.
import { supabase } from './supabase'

const TABLE = 'user_sync'

/** 서버에 저장된 것 — 없으면 null (아직 한 번도 안 올린 사용자) */
export async function pullSync(userId) {
  if (!userId) return null
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('settings, day_log')
      .eq('user_id', userId)
      .maybeSingle()
    if (error) {
      console.warn('[동기화] 불러오기 실패:', error.message)
      return null
    }
    return data ? { settings: data.settings ?? null, dayLog: data.day_log ?? {} } : null
  } catch (e) {
    console.warn('[동기화] 불러오기 예외:', e)
    return null
  }
}

/** 통째로 올린다 (설정은 통째로 읽고 쓰는 값이라 부분 갱신할 이유가 없다) */
export async function pushSync(userId, { settings, dayLog }) {
  if (!userId) return false
  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert({ user_id: userId, settings, day_log: dayLog }, { onConflict: 'user_id' })
    if (error) {
      console.warn('[동기화] 저장 실패:', error.message)
      return false
    }
    return true
  } catch (e) {
    console.warn('[동기화] 저장 예외:', e)
    return false
  }
}
