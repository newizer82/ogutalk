// ── 체크인 저장소 (로컬 + Supabase) ──────────────────────────────
// 수동 체크인(알람 팝업)과 자동 체크인(소급 기록)이 공유한다.
// 시각을 인자로 받는 것이 핵심 — 소급 기록은 슬롯 시각으로 저장해야 한다.
import { supabase } from './supabase'
import { buildCheckinEntry } from './checkinEntry'

export { buildCheckinEntry }

const LOCAL_KEY   = 'ogu_local_checkins'
const KEEP_DAYS   = 30

export function loadLocalCheckins() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeLocalCheckins(list) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)) } catch {}
}

export async function saveCheckin(activityType, userId = null, atMs = Date.now()) {
  const entry = buildCheckinEntry(activityType, atMs)

  // 항상 로컬 저장 (비로그인 fallback + 오프라인 대비)
  try {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - KEEP_DAYS)
    const trimmed = loadLocalCheckins().filter(c => new Date(c.created_at) >= cutoff)
    trimmed.unshift(entry)
    writeLocalCheckins(trimmed)
    // 리포트/홈이 즉시 반영되도록 새 엔트리를 실어 발사
    window.dispatchEvent(new CustomEvent('ogu:checkin', { detail: entry }))
  } catch {}

  if (!userId) return

  // notification_log 의 NOT NULL 컬럼(notification_type/title/body)을 함께 채움
  const { error } = await supabase.from('notification_log').insert({
    user_id:           userId,
    notification_type: 'checkin',
    title:             '오구 체크인',
    body:              `이번 시간 활동: ${activityType}`,
    ...entry,
  })
  if (error) {
    console.error('[체크인] Supabase 저장 실패:', error)
    window.dispatchEvent(new CustomEvent('ogu:checkin-error', {
      detail: { message: error.message, code: error.code },
    }))
  }
}

/** 이미 저장된 체크인들의 카테고리를 바꾼다 (사용자 수정 학습) */
export async function updateCheckinCategory(createdAtList, newCategory, userId = null) {
  if (!createdAtList?.length) return
  const targets = new Set(createdAtList)

  try {
    const list = loadLocalCheckins().map(c =>
      targets.has(c.created_at) ? { ...c, activity_type: newCategory } : c)
    writeLocalCheckins(list)
  } catch {}

  if (userId) {
    const { error } = await supabase
      .from('notification_log')
      .update({ activity_type: newCategory, body: `이번 시간 활동: ${newCategory}` })
      .eq('user_id', userId)
      .eq('notification_type', 'checkin')
      .in('created_at', createdAtList)
    if (error) console.error('[체크인] 카테고리 수정 실패:', error)
  }

  // detail 없이 발사 → 구독자가 전체 reload
  window.dispatchEvent(new CustomEvent('ogu:checkin'))
}
