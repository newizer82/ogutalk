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

/**
 * 서버 기록과 로컬 기록을 합친다 (같은 시각이면 서버 것을 쓴다).
 * 리포트는 서버만, 알람 팝업은 로컬만 읽고 있어서 서버 저장이 한 번 실패하면
 * "팝업은 소비 1시간, 리포트는 0분"처럼 두 화면이 다른 말을 했다.
 * 시각 문자열 형식이 서로 달라(+00:00 / .000Z) 문자열이 아니라 ms 로 비교한다.
 */
export function mergeCheckins(serverRows = [], localRows = []) {
  const byTime = new Map()
  for (const r of localRows) {
    const t = new Date(r.created_at).getTime()
    if (!Number.isNaN(t)) byTime.set(t, r)
  }
  for (const r of serverRows) {
    const t = new Date(r.created_at).getTime()
    if (!Number.isNaN(t)) byTime.set(t, r)   // 서버 우선
  }
  return [...byTime.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, r]) => r)
}
