// ── 체크인 엔트리 생성 (순수 — node에서 직접 검증 가능) ──────────
// 저장 시각을 인자로 받는 것이 핵심: 소급 기록은 "지금"이 아니라 슬롯 시각으로 저장한다.

/** 저장할 엔트리 1건을 만든다 */
export function buildCheckinEntry(activityType, atMs) {
  const d = new Date(atMs)
  return {
    activity_type: activityType,
    alarm_hour:    d.getHours(),
    created_at:    d.toISOString(),
  }
}
